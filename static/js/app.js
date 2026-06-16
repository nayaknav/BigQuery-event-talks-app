// Global State
let releaseNotes = [];
let activeFilter = 'all';
let searchKeyword = '';

// DOM Elements
const elements = {
    themeToggleBtn: document.getElementById('themeToggleBtn'),
    refreshBtn: document.getElementById('refreshBtn'),
    connectionStatus: document.getElementById('connectionStatus'),
    statusLabel: document.getElementById('statusLabel'),
    searchInput: document.getElementById('searchInput'),
    clearSearchBtn: document.getElementById('clearSearchBtn'),
    filterPills: document.getElementById('filterPills'),
    resultsCount: document.getElementById('resultsCount'),
    lastUpdatedTime: document.getElementById('lastUpdatedTime'),
    feedShimmer: document.getElementById('feedShimmer'),
    emptyState: document.getElementById('emptyState'),
    errorState: document.getElementById('errorState'),
    errorDescription: document.getElementById('errorDescription'),
    retryBtn: document.getElementById('retryBtn'),
    resetFiltersBtn: document.getElementById('resetFiltersBtn'),
    timelineContainer: document.getElementById('timelineContainer'),
    
    // Modal
    tweetModal: document.getElementById('tweetModal'),
    closeTweetModal: document.getElementById('closeTweetModal'),
    tweetTextarea: document.getElementById('tweetTextarea'),
    tweetPreviewCategory: document.getElementById('tweetPreviewCategory'),
    tweetPreviewDate: document.getElementById('tweetPreviewDate'),
    tweetPreviewText: document.getElementById('tweetPreviewText'),
    tweetPreviewUrl: document.getElementById('tweetPreviewUrl'),
    charProgressRing: document.getElementById('charProgressRing'),
    tweetCharCount: document.getElementById('tweetCharCount'),
    postTweetBtn: document.getElementById('postTweetBtn'),
    
    // Toast
    toastContainer: document.getElementById('toastContainer')
};

// SVG Icons Constants
const icons = {
    tweet: `<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"></path>
            </svg>`,
    copy: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
            </svg>`,
    link: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14L21 3"></path>
            </svg>`
};

// Initialize Application
document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    fetchData();
    setupEventListeners();
});

// --- Theme Management ---
function initTheme() {
    const savedTheme = localStorage.getItem('theme') || 'dark';
    document.documentElement.setAttribute('data-theme', savedTheme);
}

function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    showToast(`Switched to ${newTheme === 'dark' ? 'Dark' : 'Light'} Mode`, 'info');
}

// --- Data Fetching ---
async function fetchData(forceRefresh = false) {
    showLoadingState();
    
    let url = '/api/releases';
    if (forceRefresh) {
        url += '?refresh=true';
    }
    
    try {
        const response = await fetch(url);
        const result = await response.json();
        
        if (result.status === 'success') {
            releaseNotes = result.data;
            updateStatusIndicator(result.source, result.last_updated);
            renderTimeline();
            
            if (forceRefresh) {
                showToast('Release notes successfully refreshed!', 'success');
            }
        } else {
            showErrorState(result.message || 'An error occurred while loading release notes.');
        }
    } catch (error) {
        console.error('Fetch error:', error);
        showErrorState('Could not connect to the server. Please verify Flask is running.');
    }
}

function showLoadingState() {
    elements.feedShimmer.classList.remove('hidden');
    elements.timelineContainer.classList.add('hidden');
    elements.emptyState.classList.add('hidden');
    elements.errorState.classList.add('hidden');
    
    elements.refreshBtn.classList.add('loading');
    elements.refreshBtn.disabled = true;
    
    elements.connectionStatus.className = 'status-badge';
    elements.statusLabel.textContent = 'Updating...';
}

function updateStatusIndicator(source, lastUpdated) {
    elements.refreshBtn.classList.remove('loading');
    elements.refreshBtn.disabled = false;
    
    // Status color
    elements.connectionStatus.className = 'status-badge';
    if (source === 'live') {
        elements.connectionStatus.classList.add('live');
        elements.statusLabel.textContent = 'Connected • Live';
    } else if (source === 'cache') {
        elements.connectionStatus.classList.add('cached');
        elements.statusLabel.textContent = 'Connected • Cached';
    } else {
        elements.connectionStatus.classList.add('error');
        elements.statusLabel.textContent = 'Fallback Cache';
    }
    
    // Last Updated Time
    if (lastUpdated) {
        const date = new Date(lastUpdated);
        const localTime = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        elements.lastUpdatedTime.textContent = `Last loaded: ${localTime}`;
    } else {
        elements.lastUpdatedTime.textContent = 'Last loaded: Unknown';
    }
}

function showErrorState(message) {
    elements.feedShimmer.classList.add('hidden');
    elements.timelineContainer.classList.add('hidden');
    elements.emptyState.classList.add('hidden');
    
    elements.errorState.classList.remove('hidden');
    elements.errorDescription.textContent = message;
    
    elements.refreshBtn.classList.remove('loading');
    elements.refreshBtn.disabled = false;
    
    elements.connectionStatus.className = 'status-badge error';
    elements.statusLabel.textContent = 'Offline';
    showToast(message, 'error');
}

// --- Filtering & Rendering ---
function renderTimeline() {
    elements.feedShimmer.classList.add('hidden');
    elements.errorState.classList.add('hidden');
    
    // Filter and search notes
    const filteredEntries = [];
    let matchCount = 0;
    
    releaseNotes.forEach(entry => {
        // Filter updates inside the entry
        const matchedUpdates = entry.updates.filter(update => {
            // Check Category Filter
            const categoryMatch = activeFilter === 'all' || 
                update.category.toLowerCase() === activeFilter.toLowerCase();
                
            // Check Search Keyword Match
            let searchMatch = true;
            if (searchKeyword.trim() !== '') {
                const keyword = searchKeyword.toLowerCase();
                const descText = update.description_text.toLowerCase();
                const catText = update.category.toLowerCase();
                const dateText = entry.date.toLowerCase();
                
                searchMatch = descText.includes(keyword) || 
                    catText.includes(keyword) || 
                    dateText.includes(keyword);
            }
            
            return categoryMatch && searchMatch;
        });
        
        if (matchedUpdates.length > 0) {
            filteredEntries.push({
                ...entry,
                updates: matchedUpdates
            });
            matchCount += matchedUpdates.length;
        }
    });
    
    // Update Results count
    elements.resultsCount.textContent = `Showing ${matchCount} update${matchCount === 1 ? '' : 's'}`;
    
    if (matchCount === 0) {
        elements.timelineContainer.classList.add('hidden');
        elements.emptyState.classList.remove('hidden');
        return;
    }
    
    elements.emptyState.classList.add('hidden');
    elements.timelineContainer.classList.remove('hidden');
    elements.timelineContainer.innerHTML = '';
    
    // Generate HTML for each entry
    filteredEntries.forEach((entry, entryIndex) => {
        const entryEl = document.createElement('div');
        entryEl.className = 'timeline-entry';
        // Add subtle animation delay for each timeline entry
        entryEl.style.animationDelay = `${entryIndex * 0.08}s`;
        
        // Timeline header
        let updatesHtml = '';
        entry.updates.forEach((update, updateIndex) => {
            // Clean/get accent colors based on category
            const categoryLower = update.category.toLowerCase();
            let accentColor = 'var(--primary)';
            let borderColor = 'var(--border-hover)';
            let glowColor = 'rgba(66, 133, 244, 0.1)';
            
            if (categoryLower === 'feature') {
                accentColor = 'var(--color-feature)';
                borderColor = 'var(--color-feature-border)';
                glowColor = 'rgba(16, 185, 129, 0.08)';
            } else if (categoryLower === 'issue') {
                accentColor = 'var(--color-issue)';
                borderColor = 'var(--color-issue-border)';
                glowColor = 'rgba(239, 68, 68, 0.08)';
            } else if (categoryLower === 'deprecation') {
                accentColor = 'var(--color-deprecation)';
                borderColor = 'var(--color-deprecation-border)';
                glowColor = 'rgba(245, 158, 11, 0.08)';
            } else if (categoryLower === 'notice') {
                accentColor = 'var(--color-notice)';
                borderColor = 'var(--color-notice-border)';
                glowColor = 'rgba(59, 130, 246, 0.08)';
            }
            
            // Highlight text if search keyword is set
            let bodyHtml = update.description_html;
            if (searchKeyword.trim() !== '') {
                bodyHtml = highlightKeyword(bodyHtml, searchKeyword);
            }
            
            updatesHtml += `
                <div class="update-card" style="--card-accent-color: ${accentColor}; --card-border-color: ${borderColor}; --card-glow-color: ${glowColor}">
                    <div class="card-header">
                        <span class="category-badge ${categoryLower}">${update.category}</span>
                        <a href="${entry.link}" target="_blank" rel="noopener noreferrer" class="card-date-link" title="Open official release notes">
                            ${entry.date} ${icons.link}
                        </a>
                    </div>
                    <div class="card-body">
                        ${bodyHtml}
                    </div>
                    <div class="card-footer">
                        <button class="card-action-btn btn-copy" data-text="${escapeHtml(update.description_text)}" title="Copy text to clipboard">
                            ${icons.copy}
                            <span>Copy Text</span>
                        </button>
                        <button class="card-action-btn btn-tweet-action" 
                                data-category="${escapeHtml(update.category)}" 
                                data-date="${escapeHtml(entry.date)}" 
                                data-text="${escapeHtml(update.description_text)}" 
                                data-link="${escapeHtml(entry.link)}"
                                title="Tweet about this update">
                            ${icons.tweet}
                            <span>Tweet Update</span>
                        </button>
                    </div>
                </div>
            `;
        });
        
        entryEl.innerHTML = `
            <div class="timeline-dot"></div>
            <h2 class="timeline-date-header">${entry.date}</h2>
            <div class="updates-grid">
                ${updatesHtml}
            </div>
        `;
        
        elements.timelineContainer.appendChild(entryEl);
    });
    
    // Attach event listeners to the newly rendered buttons
    attachCardActionListeners();
}

// Highlight matching search words in text
function highlightKeyword(html, keyword) {
    if (!html) return '';
    // Prevent highlighting inside HTML tags
    // A simple regex approach that avoids replacing within tag attributes:
    // Splitting text by tags, replacing in text nodes, joining back.
    const parts = html.split(/(<[^>]+>)/g);
    const regex = new RegExp(`(${escapeRegExp(keyword)})`, 'gi');
    
    const processed = parts.map(part => {
        if (part.startsWith('<') && part.endsWith('>')) {
            return part; // Skip tags
        }
        return part.replace(regex, '<span class="highlight">$1</span>');
    });
    
    return processed.join('');
}

// --- Tweet Composer Modal ---
function openTweetComposer(category, date, descriptionText, linkUrl) {
    elements.tweetPreviewCategory.textContent = category;
    elements.tweetPreviewCategory.className = `tweet-preview-badge ${category.toLowerCase()}`;
    elements.tweetPreviewDate.textContent = date;
    elements.tweetPreviewText.textContent = descriptionText;
    elements.tweetPreviewUrl.textContent = linkUrl ? new URL(linkUrl).hostname : 'cloud.google.com';
    
    // Generate pre-populated tweet text
    // E.g., BigQuery Update [June 15, 2026] - [Feature]: DescriptionText... (link)
    const prefix = `BigQuery Update [${date}] - [${category}]:\n`;
    const suffix = `\n\nRead more: ${linkUrl}`;
    
    // Calculate space left for description
    const totalMax = 280;
    const reservedLength = prefix.length + suffix.length;
    const availableLength = totalMax - reservedLength;
    
    let descriptionPart = descriptionText;
    if (descriptionPart.length > availableLength) {
        descriptionPart = descriptionPart.substring(0, availableLength - 3) + '...';
    }
    
    const initialTweet = `${prefix}${descriptionPart}${suffix}`;
    elements.tweetTextarea.value = initialTweet;
    
    updateCharCounter();
    
    // Show Modal
    elements.tweetModal.classList.add('active');
    elements.tweetTextarea.focus();
}

function closeTweetComposer() {
    elements.tweetModal.classList.remove('active');
}

function updateCharCounter() {
    const text = elements.tweetTextarea.value;
    const len = text.length;
    const limit = 280;
    const remaining = limit - len;
    
    elements.tweetCharCount.textContent = remaining;
    
    // Circular Progress Ring calculation
    const radius = 12;
    const circumference = 2 * Math.PI * radius; // ~75.39
    const percentage = Math.min(len / limit, 1);
    const offset = circumference - (percentage * circumference);
    
    elements.charProgressRing.style.strokeDashoffset = offset;
    
    // Coloring
    if (remaining < 0) {
        elements.tweetCharCount.classList.add('error');
        elements.charProgressRing.className.baseVal = 'char-progress-ring-fg error';
        elements.postTweetBtn.disabled = true;
    } else if (remaining <= 20) {
        elements.tweetCharCount.classList.remove('error');
        elements.charProgressRing.className.baseVal = 'char-progress-ring-fg warn';
        elements.postTweetBtn.disabled = false;
    } else {
        elements.tweetCharCount.classList.remove('error');
        elements.charProgressRing.className.baseVal = 'char-progress-ring-fg';
        elements.postTweetBtn.disabled = false;
    }
}

function postTweet() {
    const text = elements.tweetTextarea.value;
    if (text.length > 280) {
        showToast('Tweet text exceeds 280 characters limit!', 'error');
        return;
    }
    
    // Open X Intent
    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank', 'width=550,height=420');
    closeTweetComposer();
    showToast('Redirected to X / Twitter share dialog!', 'success');
}

// --- Toast Notifications ---
function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    let icon = '';
    if (type === 'success') {
        icon = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--color-feature)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                    <polyline points="20 6 9 17 4 12"></polyline>
                </svg>`;
    } else if (type === 'error') {
        icon = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--color-issue)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                    <circle cx="12" cy="12" r="10"></circle>
                    <line x1="12" y1="8" x2="12" y2="12"></line>
                    <line x1="12" y1="16" x2="12.01" y2="16"></line>
                </svg>`;
    } else {
        icon = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                    <circle cx="12" cy="12" r="10"></circle>
                    <line x1="12" y1="16" x2="12" y2="12"></line>
                    <line x1="12" y1="8" x2="12.01" y2="8"></line>
                </svg>`;
    }
    
    toast.innerHTML = `
        <div style="display: flex; align-items: center; gap: 0.75rem;">
            ${icon}
            <span>${message}</span>
        </div>
        <button class="toast-close">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
        </button>
    `;
    
    elements.toastContainer.appendChild(toast);
    
    // Auto-remove after 4 seconds
    const removeTimeout = setTimeout(() => {
        toast.style.animation = 'fade-out 0.3s ease forwards';
        toast.addEventListener('animationend', () => toast.remove());
    }, 4000);
    
    // Close button click
    toast.querySelector('.toast-close').addEventListener('click', () => {
        clearTimeout(removeTimeout);
        toast.remove();
    });
}

// --- Event Listeners Setup ---
function setupEventListeners() {
    // Theme Toggle
    elements.themeToggleBtn.addEventListener('click', toggleTheme);
    
    // Refresh Button
    elements.refreshBtn.addEventListener('click', () => fetchData(true));
    
    // Search Box Input
    elements.searchInput.addEventListener('input', (e) => {
        searchKeyword = e.target.value;
        if (searchKeyword.length > 0) {
            elements.clearSearchBtn.classList.remove('hidden');
        } else {
            elements.clearSearchBtn.classList.add('hidden');
        }
        renderTimeline();
    });
    
    // Clear Search Button
    elements.clearSearchBtn.addEventListener('click', () => {
        elements.searchInput.value = '';
        searchKeyword = '';
        elements.clearSearchBtn.classList.add('hidden');
        renderTimeline();
    });
    
    // Category Pills Filter clicks
    elements.filterPills.addEventListener('click', (e) => {
        const pill = e.target.closest('.filter-pill');
        if (!pill) return;
        
        // Remove active class from all pills
        elements.filterPills.querySelectorAll('.filter-pill').forEach(btn => {
            btn.classList.remove('active');
        });
        
        // Add active class
        pill.classList.add('active');
        activeFilter = pill.dataset.filter;
        renderTimeline();
    });
    
    // Reset Filters Button (inside Empty State)
    elements.resetFiltersBtn.addEventListener('click', resetAllFilters);
    
    // Retry Button (inside Error State)
    elements.retryBtn.addEventListener('click', () => fetchData(true));
    
    // Modal Events
    elements.closeTweetModal.addEventListener('click', closeTweetComposer);
    
    // Close modal on click outside modal card
    elements.tweetModal.addEventListener('click', (e) => {
        if (e.target === elements.tweetModal) {
            closeTweetComposer();
        }
    });
    
    // Character limit tracking inside modal textarea
    elements.tweetTextarea.addEventListener('input', updateCharCounter);
    
    // Post Tweet Button Action
    elements.postTweetBtn.addEventListener('click', postTweet);
}

function attachCardActionListeners() {
    // Copy Text buttons
    document.querySelectorAll('.btn-copy').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const text = btn.dataset.text;
            navigator.clipboard.writeText(text)
                .then(() => {
                    showToast('Copied update text to clipboard!', 'success');
                })
                .catch(err => {
                    console.error('Copy failed:', err);
                    showToast('Failed to copy text. Please copy manually.', 'error');
                });
        });
    });
    
    // Tweet Action buttons
    document.querySelectorAll('.btn-tweet-action').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const category = btn.dataset.category;
            const date = btn.dataset.date;
            const text = btn.dataset.text;
            const link = btn.dataset.link;
            openTweetComposer(category, date, text, link);
        });
    });
}

function resetAllFilters() {
    // Reset Search
    elements.searchInput.value = '';
    searchKeyword = '';
    elements.clearSearchBtn.classList.add('hidden');
    
    // Reset Pills
    elements.filterPills.querySelectorAll('.filter-pill').forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.filter === 'all') {
            btn.classList.add('active');
        }
    });
    activeFilter = 'all';
    
    renderTimeline();
}

// --- Utilities ---
function escapeHtml(unsafe) {
    if (!unsafe) return '';
    return unsafe
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function escapeRegExp(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // $& means the whole matched string
}
