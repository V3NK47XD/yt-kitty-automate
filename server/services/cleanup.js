/**
 * Cleanup Service
 * Port of purge_all_videos() — removes all intermediate files.
 */
const fs = require('fs');
const path = require('path');
const glob = require('path');

const BASE_DIR = path.join(__dirname, '..');

/**
 * Delete all intermediate video files and working directories.
 */
function purgeAllVideos() {
    const cleaned = [];

    // 1. Any leftover combined_*.mp4
    const files = fs.readdirSync(BASE_DIR);
    for (const f of files) {
        if (f.startsWith('combined_') && f.endsWith('.mp4')) {
            try {
                fs.unlinkSync(path.join(BASE_DIR, f));
                cleaned.push(f);
            } catch (e) { /* ignore */ }
        }
    }

    // 2. Any leftover output_*.mp4
    for (const f of files) {
        if (f.startsWith('output_') && f.endsWith('.mp4')) {
            try {
                fs.unlinkSync(path.join(BASE_DIR, f));
                cleaned.push(f);
            } catch (e) { /* ignore */ }
        }
    }

    // 3. reels_downloads directory
    const reelsDir = path.join(BASE_DIR, 'reels_downloads');
    if (fs.existsSync(reelsDir)) {
        fs.rmSync(reelsDir, { recursive: true, force: true });
        fs.mkdirSync(reelsDir, { recursive: true });
        cleaned.push('reels_downloads/');
    }

    // 4. buffer directory
    const bufferDir = path.join(BASE_DIR, 'buffer');
    if (fs.existsSync(bufferDir)) {
        fs.rmSync(bufferDir, { recursive: true, force: true });
        fs.mkdirSync(bufferDir, { recursive: true });
        cleaned.push('buffer/');
    }

    if (cleaned.length > 0) {
        console.log(`🧹 Cleanup complete. Removed: ${cleaned.join(', ')}`);
    } else {
        console.log('🧹 Cleanup: nothing to remove.');
    }

    return cleaned;
}

module.exports = { purgeAllVideos };
