/**
 * AuraVibe - Mood Playlist Generator
 * Fixed & Improved Version
 *
 * Key fixes from original:
 * 1. <script> tag was missing in index.html — app never loaded at all
 * 2. iTunes API called with fetch() which requires CORS proxy workaround
 *    → Fixed by using JSONP for iTunes API (official supported method)
 * 3. Recent searches tags had no event binding after render
 * 4. Added now-playing bar with progress indicator
 * 5. Added mood chip quick-select buttons
 * 6. Added staggered card animations
 */

document.addEventListener('DOMContentLoaded', () => {
    AuraApp.init();
});

const AuraApp = {

    // ─── Mood → search term mappings ────────────────────────────────────────
    moodMap: {
        happy:     ['feel good pop', 'happy upbeat', 'sunshine pop', 'good vibes'],
        sad:       ['sad acoustic', 'indie folk melancholic', 'heartbreak ballad', 'emotional piano'],
        energetic: ['workout edm', 'high energy electronic', 'stadium rock anthems', 'pump up'],
        romantic:  ['love songs r&b', 'romantic ballad', 'slow dance', 'soul love'],
        focused:   ['lofi study beats', 'ambient instrumental', 'classical focus', 'deep work music'],
        relaxed:   ['chill lofi', 'downtempo ambient', 'peaceful acoustic', 'soft indie'],
        angry:     ['hard rock', 'heavy metal rage', 'alternative grunge', 'intense rock'],
        motivated: ['power anthem', 'motivational rock', 'epic synthwave', 'inspirational hip hop'],
        party:     ['club dance hits', 'house party', 'hip hop party', 'dance floor edm'],
        chill:     ['lounge chill', 'smooth jazz', 'indie chill', 'mellow beats'],
        melancholic: ['melancholic indie', 'sad piano', 'atmospheric post-rock', 'introspective'],
        anxious:   ['calming meditation', 'binaural focus', 'peaceful ambient', 'stress relief music'],
        nostalgic: ['80s pop hits', '90s throwback', 'retro classics', 'nostalgic indie'],
        confident: ['hip hop confidence', 'power pop', 'anthems', 'bold electronic'],
    },

    MAX_RECENT_SEARCHES: 5,
    currentAudio: null,
    currentPlayingBtn: null,
    progressInterval: null,

    // ─── Boot ────────────────────────────────────────────────────────────────
    init() {
        this.cacheDOM();
        this.bindEvents();
        this.renderRecentSearches();
    },

    cacheDOM() {
        this.moodForm          = document.getElementById('mood-form');
        this.moodInput         = document.getElementById('mood-input');
        this.inputError        = document.getElementById('input-error');
        this.recentSearchesBox = document.getElementById('recent-searches-box');
        this.recentTagsList    = document.getElementById('recent-tags-list');
        this.retryBtn          = document.getElementById('retry-btn');
        this.songsGrid         = document.getElementById('songs-grid');
        this.generateBtn       = document.getElementById('generate-btn');

        this.states = {
            empty:   document.getElementById('state-empty'),
            loading: document.getElementById('state-loading'),
            error:   document.getElementById('state-error'),
            results: document.getElementById('state-results'),
        };

        this.vibeTitle  = document.getElementById('playlist-vibe-title');
        this.vibeCount  = document.getElementById('playlist-vibe-count');

        // Now-playing bar
        this.nowPlayingBar = document.getElementById('now-playing-bar');
        this.npArtwork     = document.getElementById('np-artwork');
        this.npTitle       = document.getElementById('np-title');
        this.npArtist      = document.getElementById('np-artist');
        this.npFill        = document.getElementById('np-fill');
        this.npStopBtn     = document.getElementById('np-stop-btn');
    },

    bindEvents() {
        // Form submit
        this.moodForm.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleSubmission();
        });

        // Retry button
        this.retryBtn.addEventListener('click', () => this.handleSubmission());

        // Recent search tags — event delegation
        this.recentTagsList.addEventListener('click', (e) => {
            if (e.target.classList.contains('mood-tag')) {
                this.moodInput.value = e.target.textContent;
                this.highlightActiveChip(e.target.textContent);
                this.handleSubmission();
            }
        });

        // Mood chip quick-picks
        const chipsContainer = document.getElementById('mood-chips');
        chipsContainer.addEventListener('click', (e) => {
            const chip = e.target.closest('.mood-chip');
            if (!chip) return;
            const mood = chip.getAttribute('data-mood');
            this.moodInput.value = mood;
            this.highlightActiveChip(mood);
            this.handleSubmission();
        });

        // Now-playing stop
        this.npStopBtn.addEventListener('click', () => this.stopAudio());
    },

    // ─── State machine ───────────────────────────────────────────────────────
    switchState(targetState) {
        Object.keys(this.states).forEach(key => {
            if (key === targetState) {
                this.states[key].removeAttribute('hidden');
            } else {
                this.states[key].setAttribute('hidden', 'true');
            }
        });
    },

    // ─── Submission handler ──────────────────────────────────────────────────
    handleSubmission() {
        const raw = this.moodInput.value.trim();
        this.inputError.textContent = '';

        if (!raw) {
            this.inputError.textContent = 'Please enter a mood before generating.';
            this.moodInput.focus();
            return;
        }

        this.saveRecentSearch(raw);
        this.generatePlaylist(raw);
    },

    // ─── API fetch via JSONP (iTunes requires this for browser CORS) ─────────
    async generatePlaylist(moodQuery) {
        this.switchState('loading');
        this.generateBtn.disabled = true;

        document.getElementById('results-container').scrollIntoView({
            behavior: 'smooth', block: 'nearest'
        });

        const searchTerm = this.buildSearchTerm(moodQuery);

        try {
            const tracks = await this.fetchItunesJSONP(searchTerm);

            if (!tracks || tracks.length === 0) {
                this.showError(`No tracks found for "${moodQuery}". Try a different mood!`);
                return;
            }

            this.renderPlaylist(moodQuery, tracks);

        } catch (err) {
            console.error('Fetch error:', err);
            this.showError('Could not reach the music database. Check your internet connection.');
        } finally {
            this.generateBtn.disabled = false;
        }
    },

    /**
     * iTunes Search API via JSONP
     * The iTunes API supports a `callback` parameter for JSONP,
     * which bypasses CORS restrictions completely.
     */
    fetchItunesJSONP(term) {
        return new Promise((resolve, reject) => {
            // Clean up any previous JSONP callback
            if (window.__itunesCallback) {
                delete window.__itunesCallback;
            }

            const callbackName = '__itunesCallback_' + Date.now();
            const timeout = setTimeout(() => {
                cleanup();
                reject(new Error('Request timed out'));
            }, 10000);

            function cleanup() {
                clearTimeout(timeout);
                delete window[callbackName];
                const el = document.getElementById('itunes-jsonp-script');
                if (el) el.remove();
            }

            window[callbackName] = (data) => {
                cleanup();
                if (data && data.results) {
                    resolve(data.results.filter(r => r.kind === 'song').slice(0, 12));
                } else {
                    resolve([]);
                }
            };

            const encoded = encodeURIComponent(term);
            const url = `https://itunes.apple.com/search?term=${encoded}&media=music&entity=song&limit=15&callback=${callbackName}`;

            const script = document.createElement('script');
            script.id = 'itunes-jsonp-script';
            script.src = url;
            script.onerror = () => {
                cleanup();
                reject(new Error('Script load failed'));
            };

            document.head.appendChild(script);
        });
    },

    buildSearchTerm(input) {
        const key = input.toLowerCase().trim();
        if (this.moodMap[key]) {
            const opts = this.moodMap[key];
            return opts[Math.floor(Math.random() * opts.length)];
        }
        // Partial match — check if input contains a known mood word
        for (const [mood, terms] of Object.entries(this.moodMap)) {
            if (key.includes(mood)) {
                return terms[Math.floor(Math.random() * terms.length)];
            }
        }
        // Fall back to raw input as search term
        return key;
    },

    showError(msg) {
        document.getElementById('error-text-content').textContent = msg;
        this.switchState('error');
    },

    // ─── Render playlist cards ───────────────────────────────────────────────
    renderPlaylist(moodTitle, tracks) {
        this.songsGrid.innerHTML = '';

        // Capitalise first letter of mood
        const displayMood = moodTitle.charAt(0).toUpperCase() + moodTitle.slice(1);
        this.vibeTitle.textContent = `Your ${displayMood} Soundtrack`;
        this.vibeCount.textContent = `${tracks.length} tracks curated for your vibe`;

        tracks.forEach((track, i) => {
            const artwork = (track.artworkUrl100 || '').replace('100x100bb', '400x400bb');
            const hasPreview = !!track.previewUrl;

            const card = document.createElement('article');
            card.className = 'song-card glass-card';
            card.style.animationDelay = `${i * 0.05}s`;

            card.innerHTML = `
                <div class="artwork-wrapper">
                    <img
                        src="${artwork}"
                        alt="${this.escapeHtml(track.collectionName || 'Album')} artwork"
                        class="album-artwork"
                        loading="lazy"
                        onerror="this.src='data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22400%22 height=%22400%22%3E%3Crect width=%22400%22 height=%22400%22 fill=%22%231a1a2e%22/%3E%3Ctext x=%2250%25%22 y=%2250%25%22 dominant-baseline=%22middle%22 text-anchor=%22middle%22 fill=%22%236b7280%22 font-size=%2248%22%3E🎵%3C/text%3E%3C/svg%3E'"
                    >
                    ${hasPreview ? `
                    <div class="play-overlay">
                        <button
                            class="preview-btn"
                            aria-label="Preview ${this.escapeHtml(track.trackName)}"
                            data-preview="${track.previewUrl}"
                            data-title="${this.escapeHtml(track.trackName)}"
                            data-artist="${this.escapeHtml(track.artistName)}"
                            data-artwork="${artwork}"
                        >
                            <svg class="play-icon" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                        </button>
                    </div>` : ''}
                </div>
                <div class="song-details">
                    <h3 class="song-title" title="${this.escapeHtml(track.trackName)}">${this.escapeHtml(track.trackName)}</h3>
                    <p class="artist-name" title="${this.escapeHtml(track.artistName)}">${this.escapeHtml(track.artistName)}</p>
                    <div class="card-footer-meta">
                        <span class="genre-tag">${this.escapeHtml(track.primaryGenreName || 'Music')}</span>
                        <a
                            href="${track.trackViewUrl}"
                            target="_blank"
                            rel="noopener noreferrer"
                            class="external-link"
                            aria-label="Open ${this.escapeHtml(track.trackName)} on Apple Music"
                        >
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14L21 3"/>
                            </svg>
                        </a>
                    </div>
                </div>
            `;

            this.songsGrid.appendChild(card);
        });

        this.bindPreviewButtons();
        this.switchState('results');
    },

    // ─── Audio preview controls ──────────────────────────────────────────────
    bindPreviewButtons() {
        this.songsGrid.querySelectorAll('.preview-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.handlePreviewClick(btn);
            });
        });
    },

    handlePreviewClick(btn) {
        const url     = btn.getAttribute('data-preview');
        const title   = btn.getAttribute('data-title');
        const artist  = btn.getAttribute('data-artist');
        const artwork = btn.getAttribute('data-artwork');

        // Same track — toggle play/pause
        if (this.currentAudio && this.currentAudio.src === url) {
            if (this.currentAudio.paused) {
                this.currentAudio.play();
                this.setPlayState(btn, true);
            } else {
                this.currentAudio.pause();
                this.setPlayState(btn, false);
            }
            return;
        }

        // Different track — stop current, start new
        this.stopAudio();

        this.currentAudio = new Audio(url);
        this.currentPlayingBtn = btn;

        this.currentAudio.play().catch(() => {
            this.showError('Preview unavailable. Open in Apple Music to listen.');
        });

        this.setPlayState(btn, true);
        btn.closest('.song-card').classList.add('is-playing');

        this.showNowPlaying(title, artist, artwork);

        // Progress bar updater
        this.progressInterval = setInterval(() => {
            if (!this.currentAudio || !this.currentAudio.duration) return;
            const pct = (this.currentAudio.currentTime / this.currentAudio.duration) * 100;
            this.npFill.style.width = pct + '%';
        }, 300);

        // Ended
        this.currentAudio.addEventListener('ended', () => {
            this.stopAudio();
        });
    },

    stopAudio() {
        if (this.currentAudio) {
            this.currentAudio.pause();
            this.currentAudio = null;
        }

        clearInterval(this.progressInterval);
        this.npFill.style.width = '0%';

        if (this.currentPlayingBtn) {
            this.setPlayState(this.currentPlayingBtn, false);
            const card = this.currentPlayingBtn.closest('.song-card');
            if (card) card.classList.remove('is-playing');
            this.currentPlayingBtn = null;
        }

        this.nowPlayingBar.setAttribute('hidden', 'true');
    },

    setPlayState(btn, playing) {
        if (playing) {
            btn.classList.add('playing');
            btn.innerHTML = `<svg class="play-icon" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>`;
            btn.setAttribute('aria-label', 'Pause preview');
        } else {
            btn.classList.remove('playing');
            btn.innerHTML = `<svg class="play-icon" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>`;
            btn.setAttribute('aria-label', 'Play preview');
        }
    },

    showNowPlaying(title, artist, artwork) {
        this.npTitle.textContent  = title;
        this.npArtist.textContent = artist;
        this.npArtwork.src        = artwork;
        this.nowPlayingBar.removeAttribute('hidden');
    },

    // ─── Recent searches ─────────────────────────────────────────────────────
    saveRecentSearch(mood) {
        let history = this.loadHistory();
        history = history.filter(m => m.toLowerCase() !== mood.toLowerCase());
        history.unshift(mood);
        if (history.length > this.MAX_RECENT_SEARCHES) history.pop();
        localStorage.setItem('auravibe_history', JSON.stringify(history));
        this.renderRecentSearches();
    },

    loadHistory() {
        try {
            return JSON.parse(localStorage.getItem('auravibe_history') || '[]');
        } catch {
            return [];
        }
    },

    renderRecentSearches() {
        const history = this.loadHistory();

        if (history.length === 0) {
            this.recentSearchesBox.setAttribute('hidden', 'true');
            return;
        }

        this.recentSearchesBox.removeAttribute('hidden');
        this.recentTagsList.innerHTML = '';

        history.forEach(mood => {
            const tag = document.createElement('button');
            tag.type      = 'button';
            tag.className = 'mood-tag';
            tag.textContent = mood;
            this.recentTagsList.appendChild(tag);
        });
    },

    // ─── Mood chip highlight ─────────────────────────────────────────────────
    highlightActiveChip(mood) {
        document.querySelectorAll('.mood-chip').forEach(chip => {
            chip.classList.toggle('active', chip.getAttribute('data-mood').toLowerCase() === mood.toLowerCase());
        });
    },

    // ─── Utility ─────────────────────────────────────────────────────────────
    escapeHtml(str) {
        if (!str) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    },
};