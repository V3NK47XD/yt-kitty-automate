/**
 * Combine Service — Robust port of combine.py
 * Concatenates 5 video clips into one 1080×1920 vertical video using ffmpeg.
 * Fixed: silent audio index calculation, proper concat filter construction.
 */
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const SERVER_ROOT = path.join(__dirname, '..');
const BUFFER_DIR = path.join(SERVER_ROOT, 'buffer');

const TARGET_W = 1080;
const TARGET_H = 1920;

/**
 * Probe a video file using ffprobe.
 */
function probeVideo(filePath) {
    return new Promise((resolve, reject) => {
        const args = [
            '-v', 'quiet',
            '-print_format', 'json',
            '-show_format',
            '-show_streams',
            filePath,
        ];

        const proc = spawn('ffprobe', args, { stdio: ['pipe', 'pipe', 'pipe'], windowsHide: true });
        let stdout = '';
        let stderr = '';
        proc.stdout.on('data', d => { stdout += d.toString(); });
        proc.stderr.on('data', d => { stderr += d.toString(); });
        proc.on('close', code => {
            if (code !== 0) {
                return reject(new Error(`ffprobe failed on ${path.basename(filePath)}: ${stderr.slice(-200)}`));
            }
            try {
                resolve(JSON.parse(stdout));
            } catch (e) {
                reject(new Error(`ffprobe JSON parse error: ${e.message}`));
            }
        });
        proc.on('error', reject);
    });
}

/**
 * Probe up to 5 clips in a buffer folder and return metadata.
 */
async function probeClips(bufferFolder, limit = 5) {
    if (!fs.existsSync(bufferFolder)) {
        throw new Error(`Buffer folder not found: ${bufferFolder}`);
    }

    const allFiles = fs.readdirSync(bufferFolder)
        .filter(f => /\.(mp4|mov|mkv|webm|avi)$/i.test(f))
        .sort();

    if (allFiles.length < limit) {
        throw new Error(
            `Need at least ${limit} clips, found ${allFiles.length} in ${bufferFolder}. ` +
            `Files: ${allFiles.join(', ')}`
        );
    }

    const clips = allFiles.slice(0, limit);
    const meta = [];

    for (const video of clips) {
        const filePath = path.join(bufferFolder, video);
        console.log(`Probing: ${video}`);
        const probe = await probeVideo(filePath);
        const duration = parseFloat(probe.format.duration);
        const hasAudio = probe.streams.some(s => s.codec_type === 'audio');

        if (isNaN(duration) || duration <= 0) {
            throw new Error(`Invalid duration for ${video}: ${probe.format.duration}`);
        }

        meta.push({ filePath, video, duration, hasAudio });
        console.log(`  ${video}: ${duration.toFixed(2)}s, audio: ${hasAudio}`);
    }

    return meta;
}

/**
 * Sort clip metadata to match a chosen ordering.
 * sortMode: filename | duration | provided
 */
function sortClips(meta, sortMode = 'filename') {
    const mode = String(sortMode || 'filename').toLowerCase();
    if (mode === 'duration') {
        return [...meta].sort((a, b) => a.duration - b.duration);
    }
    if (mode === 'filename') {
        return [...meta].sort((a, b) => a.video.localeCompare(b.video));
    }
    return [...meta];
}

/**
 * Combine 5 clips into one 1080×1920 video.
 * Exactly matches the Python combine.py logic with configurable sort order.
 *
 * @param {string} folderName - subfolder name inside buffer/ (e.g. "1")
 * @param {object} options
 * @param {Array}  options.clipMeta - optional pre-probed metadata (ordered or unordered)
 * @param {string} options.sortMode - filename | duration | provided
 * @param {boolean} options.cleanup - remove clips after combine
 * @returns {Promise<{names: string[], timestamps: number[], outputFile: string}>}
 */
async function combineBuffer(folderName, options = {}) {
    const { clipMeta, sortMode = 'filename', cleanup = true } = options;
    const bufferFolder = path.join(BUFFER_DIR, folderName);
    const outputFile = path.join(SERVER_ROOT, `combined_${folderName}.mp4`);

    let probes = clipMeta;
    if (!probes) {
        probes = await probeClips(bufferFolder, 5);
    }

    if (!Array.isArray(probes) || probes.length < (clipMeta ? probes.length : 5)) {
        throw new Error(`Need clips, found ${probes?.length || 0} in ${bufferFolder}.`);
    }

    const ordered = sortMode === 'provided' ? [...probes] : sortClips(probes, sortMode);
    console.log(`Found clips in ${bufferFolder}:`, ordered.map(p => p.video));

    const namesArray = [];
    const timestamps = [0];
    let totalTime = 0;

    for (const probe of ordered) {
        totalTime += probe.duration;
        timestamps.push(Math.round(totalTime));
        namesArray.push(probe.video);
    }

    return new Promise((resolve, reject) => {
        const useGpu = (process.env.NVIDIA_GPU || 'false').trim().toLowerCase() === 'true';
        const vcodec = useGpu ? 'h264_nvenc' : 'libx264';

        /**
         * Build the ffmpeg input list and filter_complex string.
         *
         * Strategy (mirrors Python combine.py):
         *  - Each real clip is input [0], [1], ... [N-1]
         *  - Clips missing audio get a lavfi anullsrc input APPENDED after all real clips
         *  - We track the next available input index as we go
         */
        const inputArgs = [];
        const filterParts = [];
        const concatParts = []; // e.g. "[v0][a0][v1][a1]..."

        // First: add all real clip inputs
        for (const probe of ordered) {
            inputArgs.push('-i', probe.filePath);
        }

        let extraInputIdx = ordered.length; // silent audio inputs start here

        for (let i = 0; i < ordered.length; i++) {
            const probe = ordered[i];

            // Normalize video: scale to fit 9:16, pad to 1080×1920
            filterParts.push(
                `[${i}:v]` +
                `scale='if(gt(iw/ih,9/16),${TARGET_W},-2)':'if(gt(iw/ih,9/16),-2,${TARGET_H})',` +
                `pad=${TARGET_W}:${TARGET_H}:(ow-iw)/2:(oh-ih)/2:black,` +
                `setsar=1` +
                `[v${i}]`
            );

            if (probe.hasAudio) {
                filterParts.push(
                    `[${i}:a]aformat=sample_fmts=fltp:sample_rates=44100:channel_layouts=stereo[a${i}]`
                );
            } else {
                // Append a silent audio source input for this clip
                inputArgs.push(
                    '-f', 'lavfi',
                    '-t', String(probe.duration),
                    '-i', `anullsrc=channel_layout=stereo:sample_rate=44100`
                );
                filterParts.push(
                    `[${extraInputIdx}:a]aformat=sample_fmts=fltp:sample_rates=44100:channel_layouts=stereo[a${i}]`
                );
                extraInputIdx++;
            }

            concatParts.push(`[v${i}][a${i}]`);
        }

        // Concat filter
        filterParts.push(`${concatParts.join('')}concat=n=${ordered.length}:v=1:a=1[outv][outa]`);
        const filterComplex = filterParts.join(';');

        const ffmpegArgs = [
            ...inputArgs,
            '-filter_complex', filterComplex,
            '-map', '[outv]',
            '-map', '[outa]',
            '-vcodec', vcodec,
            '-preset', 'fast',
            '-acodec', 'aac',
            '-b:a', '128k',
            '-pix_fmt', 'yuv420p',
            '-movflags', '+faststart',
            '-y',
            outputFile,
        ];

        console.log('\n🎬 Running ffmpeg concat...');
        console.log('Output:', outputFile);

        const proc = spawn('ffmpeg', ffmpegArgs, { stdio: ['pipe', 'pipe', 'pipe'], windowsHide: true });

        let stderr = '';
        proc.stderr.on('data', d => { stderr += d.toString(); });

        proc.on('close', code => {
            if (code !== 0) {
                const errSnippet = stderr.slice(-800);
                console.error('ffmpeg concat error:', errSnippet);
                return reject(new Error(`ffmpeg concat failed (exit ${code}):\n${errSnippet}`));
            }

            // Delete processed source clips and folder
            if (cleanup) {
                for (const video of namesArray) {
                    try { fs.unlinkSync(path.join(bufferFolder, video)); } catch { /* ignore */ }
                }
                try { fs.rmdirSync(bufferFolder); } catch { /* ignore */ }
            }

            console.log(`✅ Combined video: ${outputFile}`);
            resolve({ names: namesArray, timestamps, outputFile });
        });

        proc.on('error', err => reject(new Error(`ffmpeg spawn error: ${err.message}`)));
    });
}

/**
 * Combine 3 clips into one 1080×1920 video.
 * Convenience wrapper around combineBuffer for 3-clip ranking videos.
 */
async function combineBuffer3(folderName, options = {}) {
    const { clipMeta, sortMode = 'filename', cleanup = true } = options;
    const bufferFolder = path.join(BUFFER_DIR, folderName);
    const outputFile = path.join(SERVER_ROOT, `combined_${folderName}.mp4`);

    let probes = clipMeta;
    if (!probes) {
        probes = await probeClips(bufferFolder, 3);
    }

    if (!Array.isArray(probes) || probes.length < 3) {
        throw new Error(`Need at least 3 clips, found ${probes?.length || 0} in ${bufferFolder}.`);
    }

    const ordered = sortMode === 'provided' ? [...probes] : sortClips(probes, sortMode);
    console.log(`Found clips in ${bufferFolder}:`, ordered.map(p => p.video));

    const namesArray = [];
    const timestamps = [0];
    let totalTime = 0;

    for (const probe of ordered) {
        totalTime += probe.duration;
        timestamps.push(Math.round(totalTime));
        namesArray.push(probe.video);
    }

    return new Promise((resolve, reject) => {
        const useGpu = (process.env.NVIDIA_GPU || 'false').trim().toLowerCase() === 'true';
        const vcodec = useGpu ? 'h264_nvenc' : 'libx264';

        const inputArgs = [];
        const filterParts = [];
        const concatParts = [];

        for (const probe of ordered) {
            inputArgs.push('-i', probe.filePath);
        }

        let extraInputIdx = ordered.length;

        for (let i = 0; i < ordered.length; i++) {
            const probe = ordered[i];

            filterParts.push(
                `[${i}:v]` +
                `scale='if(gt(iw/ih,9/16),${TARGET_W},-2)':'if(gt(iw/ih,9/16),-2,${TARGET_H})',` +
                `pad=${TARGET_W}:${TARGET_H}:(ow-iw)/2:(oh-ih)/2:black,` +
                `setsar=1` +
                `[v${i}]`
            );

            if (probe.hasAudio) {
                filterParts.push(
                    `[${i}:a]aformat=sample_fmts=fltp:sample_rates=44100:channel_layouts=stereo[a${i}]`
                );
            } else {
                inputArgs.push(
                    '-f', 'lavfi',
                    '-t', String(probe.duration),
                    '-i', `anullsrc=channel_layout=stereo:sample_rate=44100`
                );
                filterParts.push(
                    `[${extraInputIdx}:a]aformat=sample_fmts=fltp:sample_rates=44100:channel_layouts=stereo[a${i}]`
                );
                extraInputIdx++;
            }

            concatParts.push(`[v${i}][a${i}]`);
        }

        filterParts.push(`${concatParts.join('')}concat=n=3:v=1:a=1[outv][outa]`);
        const filterComplex = filterParts.join(';');

        const ffmpegArgs = [
            ...inputArgs,
            '-filter_complex', filterComplex,
            '-map', '[outv]',
            '-map', '[outa]',
            '-vcodec', vcodec,
            '-preset', 'fast',
            '-acodec', 'aac',
            '-b:a', '128k',
            '-pix_fmt', 'yuv420p',
            '-movflags', '+faststart',
            '-y',
            outputFile,
        ];

        console.log('\n🎬 Running ffmpeg concat (3 clips)...');
        console.log('Output:', outputFile);

        const proc = spawn('ffmpeg', ffmpegArgs, { stdio: ['pipe', 'pipe', 'pipe'], windowsHide: true });

        let stderr = '';
        proc.stderr.on('data', d => { stderr += d.toString(); });

        proc.on('close', code => {
            if (code !== 0) {
                const errSnippet = stderr.slice(-800);
                console.error('ffmpeg concat error:', errSnippet);
                return reject(new Error(`ffmpeg concat failed (exit ${code}):\n${errSnippet}`));
            }

            if (cleanup) {
                for (const video of namesArray) {
                    try { fs.unlinkSync(path.join(bufferFolder, video)); } catch { /* ignore */ }
                }
                try { fs.rmdirSync(bufferFolder); } catch { /* ignore */ }
            }

            console.log(`✅ Combined video (3 clips): ${outputFile}`);
            resolve({ names: namesArray, timestamps, outputFile });
        });

        proc.on('error', err => reject(new Error(`ffmpeg spawn error: ${err.message}`)));
    });
}

module.exports = { combineBuffer, combineBuffer3, probeClips, sortClips };
