        let allGames = [];
        let userGames = { playing: [], backlog: [] };

        // Initialize on page load
        document.addEventListener('DOMContentLoaded', () => {
            checkSession();
        });

        // Toggle between login and register forms
        function toggleAuthForms() {
            const loginContainer = document.getElementById('login-form-container');
            const registerContainer = document.getElementById('register-form-container');
            
            loginContainer.style.display = loginContainer.style.display === 'none' ? 'block' : 'none';
            registerContainer.style.display = registerContainer.style.display === 'none' ? 'block' : 'none';
            
            // Clear error messages
            document.getElementById('login-error').textContent = '';
            document.getElementById('register-error').textContent = '';
        }

        // Handle login
        async function handleLogin(event) {
            event.preventDefault();
            const username = document.getElementById('loginUsername').value.trim();
            const password = document.getElementById('loginPassword').value;
            const errorDiv = document.getElementById('login-error');

            errorDiv.textContent = '';

            try {
                const res = await fetch('/auth/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username, password })
                });

                const data = await res.json();

                if (res.ok) {
                    document.getElementById('loginUsername').value = '';
                    document.getElementById('loginPassword').value = '';
                    await checkSession();
                } else {
                    errorDiv.textContent = data.error || 'Login failed';
                }
            } catch (error) {
                errorDiv.textContent = 'Error: ' + error.message;
            }
        }

        // Handle register
        async function handleRegister(event) {
            event.preventDefault();
            const username = document.getElementById('regUsername').value.trim();
            const password = document.getElementById('regPassword').value;
            const confirmPassword = document.getElementById('regConfirmPassword').value;
            const errorDiv = document.getElementById('register-error');

            errorDiv.textContent = '';

            if (password !== confirmPassword) {
                errorDiv.textContent = 'Passwords do not match';
                return;
            }

            try {
                const res = await fetch('/auth/register', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username, password, confirmPassword })
                });

                const data = await res.json();

                if (res.ok) {
                    document.getElementById('regUsername').value = '';
                    document.getElementById('regPassword').value = '';
                    document.getElementById('regConfirmPassword').value = '';
                    await checkSession();
                } else {
                    errorDiv.textContent = data.error || 'Registration failed';
                }
            } catch (error) {
                errorDiv.textContent = 'Error: ' + error.message;
            }
        }

        // Check if user is logged in
        async function checkSession() {
            try {
                const res = await fetch('/api/session');
                const session = await res.json();

                if (session.isLoggedIn) {
                    document.getElementById('auth-section').style.display = 'none';
                    document.getElementById('app-section').style.display = 'block';
                    
                    document.getElementById('userName').textContent = session.username;
                    
                    // If Steam ID is connected, load games
                    if (session.steamId) {
                        loadUserProfile(session.steamId);
                        loadUserGames();
                        loadAllGames();
                    } else {
                        // Show prompt to add Steam ID
                        showSteamIdPrompt();
                    }
                } else {
                    document.getElementById('auth-section').style.display = 'block';
                    document.getElementById('app-section').style.display = 'none';
                }
            } catch (error) {
                console.error('Error checking session:', error);
            }
        }

        // Show prompt to add Steam ID
        function showSteamIdPrompt() {
            const gamesContainer = document.getElementById('gamesContainer');
            gamesContainer.innerHTML = `
                <div style="text-align: center; padding: 40px; background-color: rgb(35, 45, 57); border-radius: 8px; margin: 20px;">
                    <h3>Connect Your Steam Account</h3>
                    <p>To view your games, please connect your Steam ID</p>
                    <input type="text" id="steamIdInput" placeholder="Enter your Steam ID (e.g., 76561198000000000)" style="padding: 10px; width: 100%; max-width: 400px; margin: 15px 0;">
                    <p style="font-size: 12px; color: #888;">Find your Steam ID at <a href="https://steamcommunity.com/profiles" target="_blank" style="color: #1b6ec2;">steamcommunity.com/profiles</a></p>
                    <button onclick="connectSteamId()" class="login-btn" style="margin-top: 10px;">Connect Steam</button>
                </div>
            `;
        }

        // Connect Steam ID to account
        async function connectSteamId() {
            const steamId = document.getElementById('steamIdInput').value.trim();
            if (!steamId) {
                alert('Please enter a Steam ID');
                return;
            }

            try {
                const res = await fetch('/auth/add-steam', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ steamid: steamId })
                });

                if (res.ok) {
                    loadUserProfile(steamId);
                    loadUserGames();
                    loadAllGames();
                } else {
                    const data = await res.json();
                    alert('Error: ' + (data.error || 'Failed to connect Steam ID'));
                }
            } catch (error) {
                alert('Error: ' + error.message);
            }
        }

        // Load user profile
        async function loadUserProfile(steamID) {
            try {
                const res = await fetch('/api/user');
                const user = await res.json();
                if (res.ok) {
                    document.getElementById('userAvatar').src = user.avatar;
                }
            } catch (error) {
                console.error('Error loading profile:', error);
            }
        }

        // Load all games
        async function loadAllGames() {
            try {
                const res = await fetch('/api/games');
                const data = await res.json();
                
                if (res.ok && data.games) {
                    allGames = data.games.sort((a, b) => (b.playtime_forever || 0) - (a.playtime_forever || 0));
                    displayGames(allGames);
                    
                    // Calculate and display total playtime
                    const totalPlaytime = allGames.reduce((sum, game) => sum + (game.playtime_forever || 0), 0);
                    const formatted = totalPlaytime === 0 ? '0h' : formatPlaytime(totalPlaytime);
                    document.getElementById('totalPlaytime').textContent = `Total Playtime: ${formatted}`;
                }
            } catch (error) {
                console.error('Error loading games:', error);
                if (error.message.includes('401')) {
                    showSteamIdPrompt();
                }
            }
        }

        // Load user's selected games and backlog
        async function loadUserGames() {
            try {
                const res = await fetch('/api/user-games');
                const data = await res.json();
                
                if (res.ok) {
                    userGames = data;
                    displaySelectedGames();
                }
            } catch (error) {
                console.error('Error loading user games:', error);
            }
        }

        // Display all games in searchable grid
        function displayGames(games) {
            const container = document.getElementById('gamesContainer');
            container.innerHTML = games.map(game => {
                const playtime = game.playtime_forever || 0;
                const isPlaying = userGames.playing.some(g => g.appid === game.appid);
                const isBacklog = userGames.backlog.some(g => g.appid === game.appid);
                
                return `
                    <div class="game-item">
                        <img src="https://steamcdn-a.akamaihd.net/steam/apps/${game.appid}/library_600x900.jpg" 
                             alt="${game.name}" 
                             class="game-item-img"
                             onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%22100%22 height=%22150%22><rect fill=%22%23333%22 width=%22100%22 height=%22150%22/></svg>'"
                        >
                        <div class="game-item-info">
                            <h4>${game.name}</h4>
                            <p>${formatPlaytime(playtime)}</p>
                            <div class="game-item-buttons">
                                <button class="btn-small ${isPlaying ? 'active' : ''}" 
                                        onclick="togglePlaying(${game.appid}, '${game.name.replace(/'/g, "\\'")}', ${playtime})">
                                    ${isPlaying ? '✓ Playing' : 'Add to Playing'}
                                </button>
                                <button class="btn-small ${isBacklog ? 'active' : ''}" 
                                        onclick="toggleBacklog(${game.appid}, '${game.name.replace(/'/g, "\\'")}')">
                                    ${isBacklog ? '✓ Backlog' : 'Add to Backlog'}
                                </button>
                            </div>
                        </div>
                    </div>
                `;
            }).join('');
        }

        // Display selected games
        function displaySelectedGames() {
            // Display playing games
            const playingContainer = document.getElementById('playingGames');
            if (userGames.playing.length === 0) {
                playingContainer.innerHTML = '<p class="empty-state">No games selected. Add games from your library above.</p>';
            } else {
                playingContainer.innerHTML = userGames.playing.map(game => `
                    <div class="selected-game-card">
                        <img src="https://steamcdn-a.akamaihd.net/steam/apps/${game.appid}/library_600x900.jpg" 
                             alt="${game.name}"
                             class="selected-game-img"
                        >
                        <div class="selected-game-info">
                            <h4>${game.name}</h4>
                            <p>${formatPlaytime(game.playtime)}</p>
                            <button class="btn-remove" onclick="removePlaying(${game.appid})">Remove</button>
                            <button class="btn-achievements" onclick="loadAchievements(${game.appid}, '${game.name.replace(/'/g, "\\'")}')">View Achievements</button>
                        </div>
                    </div>
                `).join('');
            }

            // Display backlog games
            const backlogContainer = document.getElementById('backlogGames');
            if (userGames.backlog.length === 0) {
                backlogContainer.innerHTML = '<p class="empty-state">No games in backlog. Add games from your library above.</p>';
            } else {
                backlogContainer.innerHTML = userGames.backlog.map(game => `
                    <div class="selected-game-card">
                        <img src="https://steamcdn-a.akamaihd.net/steam/apps/${game.appid}/library_600x900.jpg" 
                             alt="${game.name}"
                             class="selected-game-img"
                        >
                        <div class="selected-game-info">
                            <h4>${game.name}</h4>
                            <button class="btn-remove" onclick="removeBacklog(${game.appid})">Remove</button>
                            <button class="btn-move" onclick="moveToPlaying(${game.appid}, '${game.name.replace(/'/g, "\\'")}')">Move to Playing</button>
                        </div>
                    </div>
                `).join('');
            }
        }

        // Toggle game in playing list
        async function togglePlaying(appid, name, playtime = 0) {
            const isPlaying = userGames.playing.some(g => g.appid === appid);
            
            if (isPlaying) {
                await removePlaying(appid);
            } else {
                try {
                    const res = await fetch('/api/add-playing', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ appid, name, playtime })
                    });

                    if (res.ok) {
                        const data = await res.json();
                        userGames = data.games;
                        displayGames(allGames);
                        displaySelectedGames();
                    }
                } catch (error) {
                    console.error('Error adding to playing:', error);
                }
            }
        }

        // Remove from playing
        async function removePlaying(appid) {
            try {
                const res = await fetch('/api/remove-playing', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ appid })
                });

                if (res.ok) {
                    userGames.playing = userGames.playing.filter(g => g.appid !== appid);
                    displayGames(allGames);
                    displaySelectedGames();
                }
            } catch (error) {
                console.error('Error removing from playing:', error);
            }
        }

        // Toggle game in backlog
        async function toggleBacklog(appid, name) {
            const isBacklog = userGames.backlog.some(g => g.appid === appid);
            
            if (isBacklog) {
                await removeBacklog(appid);
            } else {
                try {
                    const res = await fetch('/api/add-backlog', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ appid, name })
                    });

                    if (res.ok) {
                        const data = await res.json();
                        userGames = data.games;
                        displayGames(allGames);
                        displaySelectedGames();
                    }
                } catch (error) {
                    console.error('Error adding to backlog:', error);
                }
            }
        }

        // Remove from backlog
        async function removeBacklog(appid) {
            try {
                const res = await fetch('/api/remove-backlog', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ appid })
                });

                if (res.ok) {
                    userGames.backlog = userGames.backlog.filter(g => g.appid !== appid);
                    displayGames(allGames);
                    displaySelectedGames();
                }
            } catch (error) {
                console.error('Error removing from backlog:', error);
            }
        }

        // Move from backlog to playing
        async function moveToPlaying(appid, name) {
            const game = allGames.find(g => g.appid === appid);
            const playtime = game ? (game.playtime_forever || 0) : 0;
            await removeBacklog(appid);
            await togglePlaying(appid, name, playtime);
        }

        // Switch between tabs
        function switchTab(tab) {
            document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
            
            event.target.classList.add('active');
            document.getElementById(`${tab}-tab`).classList.add('active');
        }

        // Format playtime
        function formatPlaytime(minutes) {
            if (!minutes || minutes === 0) return 'Not played';
            if (minutes < 60) return `${minutes}m`;
            const hours = Math.floor(minutes / 60);
            const mins = minutes % 60;
            if (mins === 0) return `${hours}h`;
            return `${hours}h ${mins}m`;
        }

        // Load achievements
        async function loadAchievements(appid, gameName) {
            try {
                const res = await fetch(`/api/achievements?appid=${appid}`);
                const data = await res.json();

                if (!res.ok) {
                    alert(data.error || 'Failed to load achievements');
                    return;
                }

                const achievementsList = data.achievements.map(a => `
                    <div class="achievement ${a.achieved === 1 ? 'unlocked' : 'locked'}">
                        <span class="achievement-status">${a.achieved === 1 ? '✔' : '✖'}</span>
                        <span class="achievement-name">${a.name || a.apiname}</span>
                    </div>
                `).join('');

                const achievementsHtml = `
                    <div class="achievements-modal" onclick="this.style.display='none'">
                        <div class="achievements-content" onclick="event.stopPropagation()">
                            <button class="close-btn" onclick="this.closest('.achievements-modal').style.display='none'">✕</button>
                            <h3>${gameName}</h3>
                            <div class="achievement-stats">
                                <div class="achievement-progress">
                                    <div class="progress-bar">
                                        <div class="progress-fill" style="width: ${data.percentage}%"></div>
                                    </div>
                                    <div class="progress-text">${data.unlocked} / ${data.total} Achievements (${data.percentage}%)</div>
                                </div>
                            </div>
                            <div class="achievements-list">
                                ${achievementsList}
                            </div>
                        </div>
                    </div>
                `;

                const resultDiv = document.getElementById('result');
                const existingModal = resultDiv.querySelector('.achievements-modal');
                if (existingModal) {
                    existingModal.remove();
                }

                resultDiv.innerHTML += achievementsHtml;
                resultDiv.querySelector('.achievements-modal').style.display = 'flex';

            } catch (error) {
                alert('Error: ' + error.message);
            }
        }

        // Search games
        document.addEventListener('DOMContentLoaded', () => {
            const searchInput = document.getElementById('gameSearch');
            if (searchInput) {
                searchInput.addEventListener('input', (e) => {
                    const searchTerm = e.target.value.toLowerCase();
                    const filtered = allGames.filter(game => 
                        game.name.toLowerCase().includes(searchTerm)
                    );
                    displayGames(filtered);
                });
            }
        });