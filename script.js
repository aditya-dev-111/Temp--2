/**
 * AuraVibe - Premium Mood Playlist Generator Core Engine
 * Architecture: Clean Modular Object-Oriented Vanilla Functional Programming
 */

document.addEventListener('DOMContentLoaded', () => {
    AuraApp.init();
});

const AuraApp = {
    // 1. Mood mapping configurations for optimizing engine outputs via cross-referencing genres
    moodMap: {
        happy: ["pop", "dance", "upbeat feel good"],
        sad: ["acoustic session", "indie folk", "melancholic"],
        energetic: ["workout electronic", "edm synth", "stadium rock"],
        romantic: ["r&b soul", "love ballads", "romantic acoustics"],
        focused: ["lofi study", "ambient instrumental", "classical modern"],
        relaxed: ["chill chillout", "downtempo", "ambient lofi"],
        angry: ["alternative rock", "heavy metal", "hardcore grunge"],
        motivated: ["synthwave", "arena power rock", "hype anthems"],
        party: ["dance club", "house electronic", "hip hop radio"],
        chill: ["deep house lounge", "indie lounge", "smooth lofi"]
    },

    // Max capacity constraints
    MAX_RECENT_SEARCHES: 5,

    // 2. Initial Setup References
    init() {
        this.cacheDOM();
        this.bindEvents();
        this.renderRecentSearches();
    },

    cacheDOM() {
        this.moodForm = document.getElementById('mood-form');
        this.moodInput = document.getElementById('mood-input');
        this.inputError = document.getElementById('input-error');
        this.recentSearchesBox = document.getElementById('recent-searches-box');
        this.recentTagsList = document.getElementById('recent-tags-list');
        this.retryBtn = document.getElementById('retry-btn');
        this.songsGrid = document.getElementById('songs-grid');
        
        // App states DOM references
        this.states = {
            empty: document.getElementById('state-empty'),
            loading: document.getElementById('state-loading'),
            error: document.getElementById('state-error'),
            results: document.getElementById('state-results')
        };

        this.vibeTitle = document.getElementById('playlist-vibe-title');
        this.vibeCount = document.getElementById('playlist-vibe-count');
    },

    bindEvents() {
        this.moodForm.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleSubmission();
        });

        this.retryBtn.addEventListener('click', () => {
            this.handleSubmission();
        });

        // Event delegation for dynamically rendered search history badges
        this.recentTagsList.addEventListener('click', (e) => {
            if (e.target.classList.contains('mood-tag')) {
                this.moodInput.value = e.target.textContent;
                this.handleSubmission();
            }
        });
    },

    // 3. Application State Architecture Machine
    switchState(targetState) {
        Object.keys(this.states).forEach(state => {
            if (state === targetState) {
                this.states[state].removeAttribute('hidden');
            } else {
                this.states[state].setAttribute('hidden', 'true');
            }
        });
    },

    // 4. Input Processing & Validation Logic Engine
    handleSubmission() {
        const rawInput = this.moodInput.value.trim();
        this.inputError.textContent = ''; // Clear previous runtime warnings

        if (!rawInput) {
            this.inputError.textContent = 'Please enter or click a mood vibe before generating.';
            this.moodInput.focus();
            return;
        }

        this.saveRecentSearch(rawInput);
        this.generatePlaylist(rawInput);
    },

    // 5. Asynchronous Data Acquisition Layer
    async generatePlaylist(moodQuery) {
        this.switchState('loading');
        
        // Fluid smooth viewport realignment to top of results window
        document.getElementById('results-container').scrollIntoView({ behavior: 'smooth', block: 'nearest' });

        // Translate basic input tokens into programmatic audio queries
        const refinedSearchTerms = this.constructSearchQuery(moodQuery);
        
        // iTunes API Discovery configuration rules
        const cleanQuery = encodeURIComponent(refinedSearchTerms);
        const endpoint = `https://itunes.apple.com/search?term=${cleanQuery}&media=music&entity=song&limit=12`;

        try {
            const response = await fetch(endpoint);
            
            if (!response.ok) {
                throw new Error(`Network unexpected response status: ${response.status}`);
            }

            const data = await response.json();

            if (!data.results || data.results.length === 0) {
                this.showError('No exact aura tracks found matching that vibe. Try trying another adjective!');
                return;
            }

            this.renderPlaylist(moodQuery, data.results);

        } catch (error) {
            console.error('Core Engine Fetch Error:', error);
            this.showError('We had trouble reaching the audio database streams. Check your internet connection.');
        }
    },

    // 6. Semantic Helper Logic Strategy
    constructSearchQuery(input) {
        const normalized = input.toLowerCase().trim();
        
        // Direct internal dictionary optimization mapping matches
        if (this.moodMap[normalized]) {
            const index = Math.floor(Math.random() * this.moodMap[normalized].length);
            return this.moodMap[normalized][index];
        }

        // Adaptive Fallback Logic: If unknown mood word, inject text properties into queries directly
        return normalized;
    },

    showError(customMessage) {
        document.getElementById('error-text-content').textContent = customMessage;
        this.switchState('error');
    },

    // 7. Dynamic DOM Rendering Construction Interface
    renderPlaylist(moodTitle, tracks) {
        this.songsGrid.innerHTML = '';
        
        this.vibeTitle.textContent = `Your ${moodTitle} Aura`;
        this.vibeCount.textContent = `Synthesized ${tracks.length} elite audio tracks`;

        tracks.forEach(track => {
            // Enhance image resolution properties from native API lower scale options
            const highResArtwork = track.artworkUrl100.replace('100x100bb.jpg', '400x400bb.jpg');
            
            const cardElement = document.createElement('article');
            cardElement.className = 'song-card glass-card';
            cardElement.innerHTML = `
                <div class="artwork-wrapper">
                    <img src="${highResArtwork}" alt="${track.collectionName || 'Album'} Artwork" class="album-artwork" loading="lazy">
                    ${track.previewUrl ? `
                    <div class="play-overlay">
                        <button class="preview-btn" aria-label="Listen to preview of ${track.trackName}" data-preview="${track.previewUrl}">
                            <svg class="play-icon" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                        </button>
                    </div>` : ''}
                </div>
                <div class="song-details">
                    <h3 class="song-title" title="${track.trackName}">${track.trackName}</h3>
                    <p class="artist-name" title="${track.artistName}">${track.artistName}</p>
                    <div class="card-footer-meta">
                        <span class="genre-tag" title="${track.primaryGenreName}">${track.primaryGenreName}</span>
                        <a href="${track.trackViewUrl}" target="_blank" rel="noopener noreferrer" class="external-link" aria-label="View track details on Apple Music">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14L21 3"/></svg>
                        </a>
                    </div>
                </div>
            `;

            this.songsGrid.appendChild(cardElement);
        });

        this.setupAudioPreviewControllers();
        this.switchState('results');
    },

    // 8. Global HTML5 Audio Context Singleton Controller Management
    setupAudioPreviewControllers() {
        const previewButtons = this.songsGrid.querySelectorAll('.preview-btn');
        
        previewButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const btnClicked = e.currentTarget;
                const audioUrl = btnClicked.getAttribute('data-preview');

                // If currently playing the clicked track, toggle pause
                if (this.currentAudio && this.currentAudio.src === audioUrl) {
                    if (!this.currentAudio.paused) {
                        this.currentAudio.pause();
                        this.togglePlayIconState(btnClicked, false);
                    } else {
                        this.currentAudio.play();
                        this.togglePlayIconState(btnClicked, true);
                    }
                    return;
                }

                // If another track is playing, halt operations and reset icon layouts
                if (this.currentAudio) {
                    this.currentAudio.pause();
                    const activeBtn = this.songsGrid.querySelector('.preview-btn.playing');
                    if (activeBtn) this.togglePlayIconState(activeBtn, false);
                }

                // Initialize standard native HTML5 global operational runtime systems
                this.currentAudio = new Audio(audioUrl);
                this.currentAudio.play();
                this.togglePlayIconState(btnClicked, true);

                // Revert interface parameters upon regular media streaming termination cycle
                this.currentAudio.addEventListener('ended', () => {
                    this.togglePlayIconState(btnClicked, false);
                    this.currentAudio = null;
                });
            });
        });
    },

    togglePlayIconState(button, isPlaying) {
        if (isPlaying) {
            button.classList.add('playing');
            button.innerHTML = `<svg class="play-icon" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>`;
            button.setAttribute('aria-label', 'Pause audio preview');
        } else {
            button.classList.remove('playing');
            button.innerHTML = `<svg class="play-icon" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>`;
            button.setAttribute('aria-label', 'Listen to preview');
        }
    },

    // 9. Browser Storage Infrastructure Layer
    saveRecentSearch(mood) {
        let history = this.getRecentSearchesFromStorage();
        
        // Deduplicate entry tracking strings 
        history = history.filter(item => item.toLowerCase() !== mood.toLowerCase());
        history.unshift(mood); // Place fresh criteria directly up top

        if (history.length > this.MAX_RECENT_SEARCHES) {
            history.pop();
        }

        localStorage.setItem('auravibe_history', JSON.stringify(history));
        this.renderRecentSearches();
    },

    getRecentSearchesFromStorage() {
        const stored = localStorage.getItem('auravibe_history');
        return stored ? JSON.parse(stored) : [];
    },

    renderRecentSearches() {
        const history = this.getRecentSearchesFromStorage();
        
        if (history.length === 0) {
            this.recentSearchesBox.setAttribute('hidden', 'true');
            return;
        }

        this.recentSearchesBox.removeAttribute('hidden');
        this.recentTagsList.innerHTML = '';
        
        history.forEach(mood => {
            const tag = document.createElement('button');
            tag.type = 'button';
            tag.className = 'mood-tag';
            tag.textContent = mood;
            this.recentTagsList.appendChild(tag);
        });
    }
};

