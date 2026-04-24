require('dotenv').config();
const express = require('express');
const axios = require('axios');
const session = require('express-session');
const bcrypt = require('bcrypt');
const db = require('./db');
const app = express();
const PORT = 3000;
const STEAM_API_KEY = process.env.STEAM_API_KEY || 'test-key-12345';

// Session configuration
app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false } // Set to true if using HTTPS
}));

app.use(express.static('public'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Middleware to check if user is logged in
const isLoggedIn = (req, res, next) => {
    if (req.session.userId) {
        next();
    } else {
        res.status(401).json({ error: 'Not logged in' });
    }
};

// Register Route
app.post('/auth/register', async (req, res) => {
    try {
        const { username, password, confirmPassword } = req.body;

        if (!username || !password) {
            return res.status(400).json({ error: 'Username and password are required' });
        }

        if (password !== confirmPassword) {
            return res.status(400).json({ error: 'Passwords do not match' });
        }

        if (password.length < 6) {
            return res.status(400).json({ error: 'Password must be at least 6 characters' });
        }

        // Hash password
        const passwordHash = await bcrypt.hash(password, 10);

        // Create user
        const user = db.createUser(username, passwordHash);

        // Set session
        req.session.userId = user.id;
        req.session.username = user.username;

        res.json({ success: true, username: user.username });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// Login Route
app.post('/auth/login', async (req, res) => {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({ error: 'Username and password are required' });
        }

        // Find user
        const user = db.getUserByUsername(username);
        if (!user) {
            return res.status(401).json({ error: 'Invalid username or password' });
        }

        // Compare password
        const isValid = await bcrypt.compare(password, user.password_hash);
        if (!isValid) {
            return res.status(401).json({ error: 'Invalid username or password' });
        }

        // Set session
        req.session.userId = user.id;
        req.session.username = user.username;

        res.json({ success: true, username: user.username });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Add Steam ID to account
app.post('/auth/add-steam', isLoggedIn, (req, res) => {
    try {
        const { steamid } = req.body;

        if (!steamid || steamid.trim() === '') {
            return res.status(400).json({ error: 'Steam ID is required' });
        }

        db.updateUserSteamId(req.session.userId, steamid.trim());
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Logout Route
app.get('/auth/logout', (req, res) => {
    req.session.destroy(() => {
        res.redirect('/');
    });
});

// Endpoint to get current user session
app.get('/api/session', (req, res) => {
    if (req.session.userId) {
        const user = db.getUserById(req.session.userId);
        res.json({
            isLoggedIn: true,
            username: user.username,
            steamId: user.steam_id
        });
    } else {
        res.json({ isLoggedIn: false });
    }
});

// Endpoint to get user's selected games and backlog
app.get('/api/user-games', isLoggedIn, (req, res) => {
    const games = db.getUserGames(req.session.userId);
    res.json(games);
});

// Endpoint to add game to playing list
app.post('/api/add-playing', isLoggedIn, (req, res) => {
    try {
        const { appid, name, playtime } = req.body;
        db.addPlayingGame(req.session.userId, appid, name, playtime || 0);
        const games = db.getUserGames(req.session.userId);
        res.json({ success: true, games });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Endpoint to remove game from playing list
app.post('/api/remove-playing', isLoggedIn, (req, res) => {
    try {
        const { appid } = req.body;
        db.removePlayingGame(req.session.userId, appid);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Endpoint to add game to backlog
app.post('/api/add-backlog', isLoggedIn, (req, res) => {
    try {
        const { appid, name } = req.body;
        db.addBacklogGame(req.session.userId, appid, name);
        const games = db.getUserGames(req.session.userId);
        res.json({ success: true, games });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Endpoint to remove game from backlog
app.post('/api/remove-backlog', isLoggedIn, (req, res) => {
    try {
        const { appid } = req.body;
        db.removeBacklogGame(req.session.userId, appid);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get user profile from Steam API
app.get("/api/user", isLoggedIn, async (req, res) => {
    try {
        const user = db.getUserById(req.session.userId);
        
        if (!user.steam_id) {
            return res.status(400).json({ error: 'Steam ID not connected to account' });
        }

        if (!STEAM_API_KEY || STEAM_API_KEY === 'test-key-12345') {
            return res.status(500).json({ error: 'STEAM_API_KEY not configured' });
        }
        
        const response = await axios.get(
            `http://api.steampowered.com/ISteamUser/GetPlayerSummaries/v2/`,
            {
                params: {
                    key: STEAM_API_KEY,
                    steamids: user.steam_id,
                    format: 'json'
                }
            }
        );
        
        const player = response.data.response.players[0];
        if (!player) {
            return res.status(404).json({ error: 'Player not found' });
        }
        
        res.json({
            username: player.personaname,
            avatar: player.avatarfull,
            profileUrl: player.profileurl
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get games from Steam API
app.get("/api/games", isLoggedIn, async (req, res) => {
    try {
        const user = db.getUserById(req.session.userId);
        
        if (!user.steam_id) {
            return res.status(400).json({ error: 'Steam ID not connected to account' });
        }

        if (!STEAM_API_KEY || STEAM_API_KEY === 'test-key-12345') {
            return res.status(500).json({ error: 'STEAM_API_KEY not configured' });
        }
        
        const response = await axios.get(
            `http://api.steampowered.com/IPlayerService/GetOwnedGames/v1/`,
            {
                params: {
                    key: STEAM_API_KEY,
                    steamid: user.steam_id,
                    include_appinfo: true,
                    format: 'json'
                }
            }
        );
        
        const games = response.data.response.games || [];
        res.json({ games });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get achievements from Steam API
app.get("/api/achievements", isLoggedIn, async (req, res) => {
    try {
        const user = db.getUserById(req.session.userId);
        const appID = req.query.appid;

        if (!user.steam_id) {
            return res.status(400).json({ error: 'Steam ID not connected to account' });
        }

        if (!appID) {
            return res.status(400).json({ error: 'appid is required' });
        }

        if (!STEAM_API_KEY || STEAM_API_KEY === 'test-key-12345') {
            return res.status(500).json({ error: 'STEAM_API_KEY not configured' });
        }

        const response = await axios.get(
            'http://api.steampowered.com/ISteamUserStats/GetPlayerAchievements/v1/',
            {
                params: {
                    key: STEAM_API_KEY,
                    steamid: user.steam_id,
                    appid: appID,
                    l: 'en'
                }
            }
        );

        const stats = response.data.playerstats;
        if (!stats || !stats.achievements) {
            return res.status(404).json({ error: 'Achievements not found or profile/game is private' });
        }

        const achievements = stats.achievements || [];
        const unlocked = achievements.filter(a => a.achieved === 1).length;
        const percentage = achievements.length > 0 ? Math.round((unlocked / achievements.length) * 100) : 0;

        res.json({
            gameName: stats.gameName,
            achievements: achievements,
            unlocked: unlocked,
            total: achievements.length,
            percentage: percentage
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});