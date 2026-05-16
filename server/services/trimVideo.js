const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

function probeDuration(filePath) {
    return new Promise((resolve, reject) => {
        const args = [
            '-v', 'error',
            '-show_entries', 'format=duration',
            '-of', 'default=noprint_wrappers=1:nokey=1',
            filePath,
        ];

        const proc = spawn('ffprobe', args, { stdio: ['pipe', 'pipe', 'pipe'], windowsHide: true });
        let stdout = '';
        let stderr = '';

        proc.stdout.on('data', d => { stdout += d.toString(); });
        proc.stderr.on('data', d => { stderr += d.toString(); });

        proc.on('close', code => {
            if (code !== 0) {
                return reject(new Error(`ffprobe failed: ${stderr.slice(-200)}`));
            }
            const duration = parseFloat(String(stdout).trim());
            if (isNaN(duration) || duration <= 0) {
                return reject(new Error(`Invalid duration from ffprobe: ${stdout}`));
            }
            resolve(duration);
        });

        proc.on('error', err => reject(new Error(`ffprobe spawn error: ${err.message}`)));
    });
}

function trimVideoInPlace(filePath, maxSeconds) {
    return new Promise(async (resolve, reject) => {
        try {
            const max = Number(maxSeconds);
            if (!Number.isFinite(max) || max <= 0) {
                return resolve(filePath);
            }

            const duration = await probeDuration(filePath);
            if (duration <= max) {
                return resolve(filePath);
            }

            const dir = path.dirname(filePath);
            const base = path.basename(filePath, path.extname(filePath));
            const tempFile = path.join(dir, `${base}.trimmed.mp4`);

            const args = [
                '-i', filePath,
                '-t', String(max),
                '-c', 'copy',
                '-y',
                tempFile,
            ];

            const proc = spawn('ffmpeg', args, { stdio: ['pipe', 'pipe', 'pipe'], windowsHide: true });
            let stderr = '';
            proc.stderr.on('data', d => { stderr += d.toString(); });

            proc.on('close', code => {
                if (code !== 0) {
                    return reject(new Error(`ffmpeg trim failed (exit ${code}): ${stderr.slice(-300)}`));
                }

                try {
                    try { fs.unlinkSync(filePath); } catch { /* ignore */ }
                    fs.renameSync(tempFile, filePath);
                } catch (err) {
                    return reject(new Error(`Trim replace failed: ${err.message}`));
                }

                resolve(filePath);
            });

            proc.on('error', err => reject(new Error(`ffmpeg spawn error: ${err.message}`)));
        } catch (err) {
            reject(err);
        }
    });
}

module.exports = { trimVideoInPlace };
