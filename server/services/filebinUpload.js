const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');

function randomToken(length = 10) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

async function uploadToFilebin(filePath, options = {}) {
    const key = String(process.env.FILEBIN_KEY || '').trim();
    if (!key) {
        throw new Error('FILEBIN_KEY is not set in server/.env');
    }

    const fileName = path.basename(filePath);
    const token = randomToken(10);
    const combined = (key + token).slice(0, 16);
    const safeName = encodeURIComponent(fileName);
    const url = `https://filebin.net/${combined}/${safeName}`;

    const stream = fs.createReadStream(filePath);
    const stats = fs.statSync(filePath);

    const res = await fetch(url, {
        method: 'POST',
        headers: { 
            'Content-Length': stats.size 
        },
        body: stream,
    });

    if (!res.ok) {
        const errText = await res.text();
        throw new Error(`Filebin upload failed (status ${res.status}): ${errText.slice(0, 200)}`);
    }

    if (options.deleteAfter) {
        try { fs.unlinkSync(filePath); } catch { /* ignore */ }
    }

    return url;
}

module.exports = { uploadToFilebin };
