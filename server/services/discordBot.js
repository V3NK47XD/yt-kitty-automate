/**
 * Discord Bot Service
 * Monitors a Discord channel for YouTube/Instagram links,
 * downloads the video, uploads to Filebin, and replies with the URL.
 *
 * Ported from: yt-kitty-automate/functions/discord_bot.py
 */
const { Client, GatewayIntentBits } = require('discord.js');
const { downloadInstagramReel, getNextBufferFolder } = require('./reelDownload');
const { uploadToFilebin } = require('./filebinUpload');
const path = require('path');
const fs = require('fs');

const INSTAGRAM_PATTERN = /https?:\/\/(www\.)?instagram\.com\/(reels|reel|p)\/[A-Za-z0-9_-]+\/?/;
const YOUTUBE_PATTERN = /https?:\/\/(www\.)?(youtube\.com\/(shorts|watch\?v=)|youtu\.be\/)[A-Za-z0-9_-]+\/?/;

const POLL_INTERVAL = 10_000; // 10 seconds between each history check

let botInstance = null;
let pollTimer = null;
let botConfig = null;
let statusLog = [];

function addLog(msg) {
    const entry = { time: new Date().toISOString(), message: msg };
    statusLog.unshift(entry);
    if (statusLog.length > 50) statusLog.length = 50;
    console.log(`[discord-bot] ${msg}`);
}

function getStatus() {
    return {
        running: botInstance !== null && botInstance.isReady(),
        logs: statusLog.slice(0, 20),
    };
}

/**
 * Start the Discord bot with given config.
 */
async function startBot(config, io) {
    if (botInstance) {
        throw new Error('Bot is already running. Stop it first.');
    }

    const { token, channelId, filebinKey } = config;
    if (!token || !channelId) {
        throw new Error('Discord token and channel ID are required.');
    }

    botConfig = { token, channelId, filebinKey };
    statusLog = [];
    addLog('🤖 Starting Discord bot...');

    const client = new Client({
        intents: [
            GatewayIntentBits.Guilds,
            GatewayIntentBits.GuildMessages,
            GatewayIntentBits.MessageContent,
        ],
    });

    client.once('ready', () => {
        addLog(`✅ Bot logged in as ${client.user.tag}`);
        if (io) io.emit('discord:status', getStatus());

        // Start polling the channel for links
        pollTimer = setInterval(() => pollHistory(client, io), POLL_INTERVAL);
    });

    client.on('error', err => {
        addLog(`❌ Bot error: ${err.message}`);
    });

    try {
        await client.login(token);
        botInstance = client;
    } catch (err) {
        botInstance = null;
        addLog(`❌ Login failed: ${err.message}`);
        throw new Error(`Discord login failed: ${err.message}`);
    }
}

/**
 * Stop the Discord bot.
 */
async function stopBot() {
    if (pollTimer) {
        clearInterval(pollTimer);
        pollTimer = null;
    }

    if (botInstance) {
        try {
            botInstance.destroy();
        } catch { /* ignore */ }
        botInstance = null;
    }

    addLog('🛑 Bot stopped.');
}

/**
 * Poll channel history for unprocessed links.
 * Mirrors the Python poll_history logic:
 * - Read messages until hitting "Flagged"
 * - Process each link found
 * - Post "Flagged" to mark as done
 */
async function pollHistory(client, io) {
    try {
        const channel = await client.channels.fetch(botConfig.channelId);
        if (!channel) {
            addLog(`⚠️ Could not find channel ${botConfig.channelId}`);
            return;
        }

        // Collect messages until we hit "Flagged"
        const messagesToProcess = [];
        const messages = await channel.messages.fetch({ limit: 100 });

        // Messages come newest→oldest, find "Flagged" and take everything before it
        const sortedMsgs = [...messages.values()];
        for (const msg of sortedMsgs) {
            if (msg.content.trim().toLowerCase() === 'flagged') break;
            if (msg.author.bot) continue;
            messagesToProcess.push(msg);
        }

        // Reverse so we process oldest first
        messagesToProcess.reverse();

        if (messagesToProcess.length === 0) return;

        let processedAny = false;

        for (const msg of messagesToProcess) {
            const igMatch = msg.content.match(INSTAGRAM_PATTERN);
            const ytMatch = msg.content.match(YOUTUBE_PATTERN);
            const linkUrl = igMatch ? igMatch[0] : (ytMatch ? ytMatch[0] : null);

            if (!linkUrl) continue;

            const platform = igMatch ? 'Instagram' : 'YouTube';
            addLog(`📥 Downloading ${platform} video...`);
            if (io) io.emit('discord:status', getStatus());

            try {
                await channel.send(`📥 Downloading ${platform} video...`);

                // Download to a temp buffer folder
                const bufferFolder = getNextBufferFolder();

                await downloadInstagramReel(linkUrl, bufferFolder);
                addLog(`✅ Downloaded from ${platform}`);

                // Find the downloaded file
                const files = fs.readdirSync(bufferFolder).filter(f => /\.(mp4|mkv|webm|mov|avi)$/i.test(f));
                if (files.length === 0) {
                    await channel.send('❌ No video file found after download.');
                    addLog('❌ No video file found after download.');
                    continue;
                }

                const videoFile = path.join(bufferFolder, files[0]);

                // Upload to Filebin
                addLog('🔗 Uploading to Filebin...');
                if (io) io.emit('discord:status', getStatus());

                // Temporarily set FILEBIN_KEY if provided
                const origKey = process.env.FILEBIN_KEY;
                if (botConfig.filebinKey) {
                    process.env.FILEBIN_KEY = botConfig.filebinKey;
                }

                const url = await uploadToFilebin(videoFile, { deleteAfter: false });

                if (botConfig.filebinKey) {
                    process.env.FILEBIN_KEY = origKey;
                }

                await channel.send(`✅ Ready! Filebin: ${url}`);
                addLog(`✅ Uploaded to Filebin: ${url}`);
                processedAny = true;

                // Clean up buffer folder
                try {
                    for (const f of fs.readdirSync(bufferFolder)) {
                        try { fs.unlinkSync(path.join(bufferFolder, f)); } catch { /* ignore */ }
                    }
                    fs.rmdirSync(bufferFolder);
                } catch { /* ignore */ }

            } catch (err) {
                await channel.send(`❌ Error: ${err.message}`).catch(() => {});
                addLog(`❌ Error processing link: ${err.message}`);
            }
        }

        // Mark as processed
        if (processedAny) {
            await channel.send('Flagged');
        }

        if (io) io.emit('discord:status', getStatus());

    } catch (err) {
        addLog(`❌ Poll error: ${err.message}`);
    }
}

module.exports = { startBot, stopBot, getStatus };
