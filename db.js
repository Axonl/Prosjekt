const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, 'gametrackerdb.db');
const db = new Database(dbPath);

// Enable foreign keys
db.pragma('foreign_keys = ON');

// Initialize database schema
function initializeDatabase() {
    // Users table
    db.exec(`
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            steam_id TEXT UNIQUE,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            IsAdmin INTEGER
        )   
    `);

    // Playing games table
    db.exec(`
        CREATE TABLE IF NOT EXISTS playing_games (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            appid INTEGER NOT NULL,
            name TEXT NOT NULL,
            playtime INTEGER DEFAULT 0,
            added_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
            UNIQUE(user_id, appid)
        )
    `);

    // Backlog games table
    db.exec(`
        CREATE TABLE IF NOT EXISTS backlog_games (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            appid INTEGER NOT NULL,
            name TEXT NOT NULL,
            added_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
            UNIQUE(user_id, appid)
        )
    `);

    console.log('Database initialized successfully');
}

initializeDatabase();

// User functions
function getUserById(userId) {
    const stmt = db.prepare('SELECT id, username, steam_id FROM users WHERE id = ?');
    return stmt.get(userId);
}

function getUserByUsername(username) {
    const stmt = db.prepare('SELECT id, username, password_hash, steam_id FROM users WHERE username = ?');
    return stmt.get(username);
}

function createUser(username, passwordHash, steamId = null) {
    const stmt = db.prepare('INSERT INTO users (username, password_hash, steam_id, IsAdmin) VALUES (?, ?, ?, ?)');
    try {
        const result = stmt.run(username, passwordHash, steamId, 0);
        return { id: result.lastInsertRowid, username, steamId, IsAdmin: false };
    } catch (error) {
        if (error.message.includes('UNIQUE constraint failed')) {
            throw new Error('Username already exists');
        }
        throw error;
    }
}

function updateUserSteamId(userId, steamId) {
    const stmt = db.prepare('UPDATE users SET steam_id = ? WHERE id = ?');
    stmt.run(steamId, userId);
}

// Playing games functions
function addPlayingGame(userId, appid, name, playtime = 0) {
    const stmt = db.prepare('INSERT OR IGNORE INTO playing_games (user_id, appid, name, playtime) VALUES (?, ?, ?, ?)');
    stmt.run(userId, appid, name, playtime);
}

function removePlayingGame(userId, appid) {
    const stmt = db.prepare('DELETE FROM playing_games WHERE user_id = ? AND appid = ?');
    stmt.run(userId, appid);
}

function getPlayingGames(userId) {
    const stmt = db.prepare('SELECT appid, name, playtime FROM playing_games WHERE user_id = ? ORDER BY added_at DESC');
    return stmt.all(userId);
}

// Backlog games functions
function addBacklogGame(userId, appid, name) {
    const stmt = db.prepare('INSERT OR IGNORE INTO backlog_games (user_id, appid, name) VALUES (?, ?, ?)');
    stmt.run(userId, appid, name);
}

function removeBacklogGame(userId, appid) {
    const stmt = db.prepare('DELETE FROM backlog_games WHERE user_id = ? AND appid = ?');
    stmt.run(userId, appid);
}

function getBacklogGames(userId) {
    const stmt = db.prepare('SELECT appid, name FROM backlog_games WHERE user_id = ? ORDER BY added_at DESC');
    return stmt.all(userId);
}

function getUserGames(userId) {
    const playing = getPlayingGames(userId);
    const backlog = getBacklogGames(userId);
    return { playing, backlog };
}

module.exports = {
    db,
    getUserById,
    getUserByUsername,
    createUser,
    updateUserSteamId,
    addPlayingGame,
    removePlayingGame,
    getPlayingGames,
    addBacklogGame,
    removeBacklogGame,
    getBacklogGames,
    getUserGames
};
