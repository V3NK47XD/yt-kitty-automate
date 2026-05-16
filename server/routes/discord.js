/**
 * Discord Bot Routes
 * Start/stop/status endpoints for the Discord automation bot.
 */
const express = require('express');
const router = express.Router();
const { startBot, stopBot, getStatus } = require('../services/discordBot');

/**
 * POST /api/discord/start
 * Body: { token, channelId, filebinKey? }
 */
router.post('/start', async (req, res) => {
    const { token, channelId, filebinKey } = req.body;
    const io = req.app.get('io');

    if (!token || !channelId) {
        return res.status(400).json({ error: 'token and channelId are required' });
    }

    try {
        await startBot({ token, channelId, filebinKey }, io);
        res.json({ success: true, status: getStatus() });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/**
 * POST /api/discord/stop
 */
router.post('/stop', async (req, res) => {
    try {
        await stopBot();
        res.json({ success: true, status: getStatus() });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/**
 * GET /api/discord/status
 */
router.get('/status', (req, res) => {
    res.json(getStatus());
});

module.exports = router;
