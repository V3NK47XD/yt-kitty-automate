const { spawnSync } = require('child_process');

function checkCommand(cmd, args) {
    const result = spawnSync(cmd, args, {
        windowsHide: true,
        timeout: 10000,
        encoding: 'utf8',
    });

    if (result.error) {
        return { ok: false, reason: result.error.message };
    }

    if (result.status !== 0) {
        const stderr = (result.stderr || '').trim();
        return { ok: false, reason: stderr || `exit ${result.status}` };
    }

    return { ok: true };
}

function runStartupChecks() {
    const errors = [];

    const ffmpeg = checkCommand('ffmpeg', ['-version']);
    if (!ffmpeg.ok) {
        errors.push(`ffmpeg not available in PATH (${ffmpeg.reason})`);
    }

    const ffprobe = checkCommand('ffprobe', ['-version']);
    if (!ffprobe.ok) {
        errors.push(`ffprobe not available in PATH (${ffprobe.reason})`);
    }

    return {
        ok: errors.length === 0,
        errors,
    };
}

module.exports = { runStartupChecks };
