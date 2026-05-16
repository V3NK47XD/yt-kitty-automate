/**
 * Google OAuth Routes
 * Handles Google sign-in for YouTube upload authorization.
 */
const express = require('express');
const router = express.Router();
const { getAuthUrl, getTokensFromCode, getUserInfo, refreshAccessToken } = require('../services/youtubeUpload');

/**
 * GET /api/auth/google
 * Redirects user to Google OAuth consent screen.
 */
router.get('/google', (req, res) => {
    const url = getAuthUrl();
    res.json({ url });
});

/**
 * GET /api/auth/google/callback
 * Handles the OAuth callback, exchanges code for tokens.
 * Redirects back to the frontend with tokens as URL params.
 */
router.get('/google/callback', async (req, res) => {
    const { code } = req.query;

    if (!code) {
        return res.status(400).json({ error: 'Authorization code missing' });
    }

    try {
        const tokens = await getTokensFromCode(code);

        // Redirect back to frontend with tokens
        const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
        const tokenParam = encodeURIComponent(JSON.stringify(tokens));
        res.redirect(`${clientUrl}?tokens=${tokenParam}`);
    } catch (error) {
        console.error('OAuth error:', error);
        const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
        res.redirect(`${clientUrl}?error=${encodeURIComponent(error.message)}`);
    }
});

/**
 * GET /api/auth/me
 * Returns the authenticated user's profile info.
 * Accepts tokens via Authorization header (Bearer JSON) or query param.
 */
router.get('/me', async (req, res) => {
    try {
        let tokens;
        const authHeader = req.headers.authorization;
        if (authHeader && authHeader.startsWith('Bearer ')) {
            tokens = JSON.parse(authHeader.slice(7));
        } else if (req.query.tokens) {
            tokens = JSON.parse(decodeURIComponent(req.query.tokens));
        }

        if (!tokens) {
            return res.status(401).json({ error: 'No tokens provided' });
        }

        const user = await getUserInfo(tokens);
        res.json(user);
    } catch (error) {
        console.error('Auth /me error:', error.message);
        res.status(401).json({ error: 'Invalid or expired tokens' });
    }
});

/**
 * POST /api/auth/refresh
 * Accepts { refresh_token } and returns new credentials.
 */
router.post('/refresh', async (req, res) => {
    try {
        const { refresh_token } = req.body;
        if (!refresh_token) {
            return res.status(400).json({ error: 'refresh_token is required' });
        }

        const credentials = await refreshAccessToken(refresh_token);
        res.json(credentials);
    } catch (error) {
        console.error('Token refresh error:', error.message);
        res.status(401).json({ error: 'Could not refresh token' });
    }
});

module.exports = router;
