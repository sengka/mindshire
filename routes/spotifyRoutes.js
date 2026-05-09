const express = require("express");
const router = express.Router();

// Spotify OAuth configurations (to be set in .env)
const SPOTIFY_CLIENT_ID = process.env.SPOTIFY_CLIENT_ID || "PASTE_YOUR_CLIENT_ID_HERE";
const SPOTIFY_CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET || "PASTE_YOUR_CLIENT_SECRET_HERE";
const REDIRECT_URI = process.env.SPOTIFY_REDIRECT_URI || "http://127.0.0.1:3000/spotify/callback";

router.get("/login", (req, res) => {
    const scope = "playlist-read-private playlist-read-collaborative";
    const state = Math.random().toString(36).substring(7);
    
    // Store the room URL user was in so we can redirect back to it
    const referer = req.get('Referrer') || "/study-room/community";
    req.session.spotifyReturnUrl = referer;
    
    const authUrl = `https://accounts.spotify.com/authorize?response_type=code&client_id=${SPOTIFY_CLIENT_ID}&scope=${encodeURIComponent(scope)}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&state=${state}`;
    
    res.redirect(authUrl);
});

router.get("/callback", async (req, res) => {
    const code = req.query.code || null;
    const error = req.query.error || null;

    if (error) {
        return res.status(400).send(`Spotify login failed: ${error}`);
    }

    try {
        const params = new URLSearchParams({
            code: code,
            redirect_uri: REDIRECT_URI,
            grant_type: 'authorization_code'
        });

        const credentials = Buffer.from(`${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`).toString('base64');

        // Using native Node.js fetch (Node 18+)
        const response = await fetch("https://accounts.spotify.com/api/token", {
            method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
                "Authorization": `Basic ${credentials}`
            },
            body: params.toString()
        });

        const data = await response.json();

        if (data.error) {
            throw new Error(data.error_description || data.error);
        }

        // Save tokens in session
        req.session.spotifyToken = data.access_token;
        req.session.spotifyRefreshToken = data.refresh_token;

        // Redirect back to the room they came from
        const returnUrl = req.session.spotifyReturnUrl || "/study-room/community";
        res.redirect(returnUrl);

    } catch (err) {
        console.error("Spotify Auth Error:", err);
        res.status(500).send("Giriş sırasında bir hata oluştu. Client ID ve Secret kontrol edin.");
    }
});

router.get("/playlists", async (req, res) => {
    if (!req.session.spotifyToken) {
        return res.status(401).json({ success: false, message: "Spotify not connected" });
    }

    try {
        const response = await fetch("https://api.spotify.com/v1/me/playlists?limit=20", {
            headers: {
                "Authorization": `Bearer ${req.session.spotifyToken}`
            }
        });

        if (response.status === 401) {
            req.session.spotifyToken = null;
            return res.status(401).json({ success: false, message: "Spotify token expired" });
        }

        const data = await response.json();
        
        if (!data.items) {
             return res.json({ success: true, playlists: [] });
        }
        
        const playlists = data.items.map(item => ({
            id: item.id,
            name: item.name,
            uri: item.uri,
            imageUrl: item.images && item.images.length > 0 ? item.images[0].url : null
        }));

        res.json({ success: true, playlists });

    } catch (err) {
        console.error("Spotify Playlists Error:", err);
        res.status(500).json({ success: false, message: "Could not fetch playlists" });
    }
});

router.get("/status", (req, res) => {
    if (req.session.spotifyToken) {
        res.json({ connected: true });
    } else {
        res.json({ connected: false });
    }
});

router.get("/logout", (req, res) => {
    req.session.spotifyToken = null;
    req.session.spotifyRefreshToken = null;
    const referer = req.get('Referrer') || "/study-room/community";
    res.redirect(referer);
});

module.exports = router;
