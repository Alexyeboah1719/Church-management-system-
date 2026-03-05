// Daily Verse functionality
document.addEventListener('DOMContentLoaded', function() {
    // Check if user is logged in
    checkAuth();
    
    // Initialize daily verse page
    initializeDailyVersePage();
    
    // Setup event listeners
    setupDailyVerseEventListeners();
});

// Check authentication
function checkAuth() {
    const currentUser = JSON.parse(localStorage.getItem('currentUser'));
    
    if (!currentUser || currentUser.type !== 'member') {
        window.location.href = 'auth.html';
        return;
    }
    
    // Display user name
    document.getElementById('userName').textContent = currentUser.name;
}

// Initialize daily verse page
function initializeDailyVersePage() {
    loadDailyVerse();
    loadVerseHistory();
}

// Setup event listeners
function setupDailyVerseEventListeners() {
    // Sidebar toggle
    document.getElementById('menuToggle').addEventListener('click', toggleSidebar);
    document.getElementById('sidebarToggle').addEventListener('click', toggleSidebar);
    
    // Logout
    document.getElementById('logoutBtn').addEventListener('click', function() {
        localStorage.removeItem('currentUser');
        window.location.href = 'index.html';
    });
    
    // Share verse
    document.getElementById('shareVerse').addEventListener('click', shareVerse);
    
    // Save verse
    document.getElementById('saveVerse').addEventListener('click', saveVerse);
}

// Toggle sidebar on mobile
function toggleSidebar() {
    const sidebar = document.querySelector('.sidebar');
    sidebar.classList.toggle('show');
    
    // Add backdrop when sidebar is open on mobile
    if (sidebar.classList.contains('show')) {
        const backdrop = document.createElement('div');
        backdrop.className = 'sidebar-backdrop';
        backdrop.addEventListener('click', toggleSidebar);
        document.body.appendChild(backdrop);
    } else {
        const backdrop = document.querySelector('.sidebar-backdrop');
        if (backdrop) {
            backdrop.remove();
        }
    }
}

// Load daily verse
function loadDailyVerse() {
    const dailyVerses = JSON.parse(localStorage.getItem('dailyVerses') || '[]');
    const today = new Date().toISOString().split('T')[0];
    
    // Check if there's a verse for today
    let todayVerse = dailyVerses.find(verse => verse.date === today);
    
    if (!todayVerse) {
        // If no verse for today, use a default verse or the most recent one
        todayVerse = getDefaultVerse();
    }
    
    displayDailyVerse(todayVerse);
}

// Get default verse (fallback)
function getDefaultVerse() {
    // Sample Bible verses
    const sampleVerses = [
        {
            text: "For I know the plans I have for you, declares the LORD, plans for welfare and not for evil, to give you a future and a hope.",
            reference: "Jeremiah 29:11",
            date: new Date().toISOString().split('T')[0]
        },
        {
            text: "I can do all things through him who strengthens me.",
            reference: "Philippians 4:13",
            date: new Date().toISOString().split('T')[0]
        },
        {
            text: "Trust in the LORD with all your heart, and do not lean on your own understanding.",
            reference: "Proverbs 3:5",
            date: new Date().toISOString().split('T')[0]
        },
        {
            text: "The LORD is my shepherd; I shall not want.",
            reference: "Psalm 23:1",
            date: new Date().toISOString().split('T')[0]
        },
        {
            text: "But seek first the kingdom of God and his righteousness, and all these things will be added to you.",
            reference: "Matthew 6:33",
            date: new Date().toISOString().split('T')[0]
        }
    ];
    
    // Return a random verse from the sample
    return sampleVerses[Math.floor(Math.random() * sampleVerses.length)];
}

// Display daily verse
function displayDailyVerse(verse) {
    document.getElementById('verseText').textContent = `"${verse.text}"`;
    document.getElementById('verseReference').textContent = `- ${verse.reference}`;
    document.getElementById('verseDate').textContent = formatDate(verse.date);
    
    // Store current verse for sharing/saving
    document.getElementById('shareVerse').dataset.verse = JSON.stringify(verse);
    document.getElementById('saveVerse').dataset.verse = JSON.stringify(verse);
}

// Load verse history
function loadVerseHistory() {
    const dailyVerses = JSON.parse(localStorage.getItem('dailyVerses') || '[]');
    const savedVerses = JSON.parse(localStorage.getItem('savedVerses') || '[]');
    
    // Combine daily verses and saved verses, sort by date
    const allVerses = [...dailyVerses, ...savedVerses]
        .sort((a, b) => new Date(b.date) - new Date(a.date))
        .slice(0, 10); // Show last 10 verses
    
    displayVerseHistory(allVerses);
}

// Display verse history
function displayVerseHistory(verses) {
    const historyContainer = document.getElementById('verseHistory');
    
    if (verses.length === 0) {
        historyContainer.innerHTML = `
            <div class="text-center py-4">
                <i class="fas fa-bible fa-2x text-muted mb-3"></i>
                <p class="text-muted">No verse history available</p>
            </div>
        `;
        return;
    }
    
    historyContainer.innerHTML = verses.map(verse => `
        <div class="verse-history-item">
            <div class="verse-history-text">"${verse.text}"</div>
            <div class="verse-history-reference">${verse.reference}</div>
            <div class="verse-history-date">${formatDate(verse.date)}</div>
        </div>
    `).join('');
}

// Share verse
function shareVerse() {
    const verse = JSON.parse(this.dataset.verse);
    const shareText = `"${verse.text}" - ${verse.reference}\n\nShared from Church of Pentecost Youth Ministry`;
    
    if (navigator.share) {
        // Use Web Share API if available
        navigator.share({
            title: 'Daily Bible Verse',
            text: shareText
        }).catch(err => {
            console.log('Error sharing:', err);
            fallbackShare(shareText);
        });
    } else {
        // Fallback for browsers that don't support Web Share API
        fallbackShare(shareText);
    }
}

// Fallback share method
function fallbackShare(shareText) {
    // Copy to clipboard
    navigator.clipboard.writeText(shareText).then(() => {
        alert('Verse copied to clipboard! You can now paste it anywhere.');
    }).catch(err => {
        // If clipboard fails, show the text for manual copy
        alert(`Share this verse:\n\n${shareText}`);
    });
}

// Save verse
function saveVerse() {
    const currentUser = JSON.parse(localStorage.getItem('currentUser'));
    const verse = JSON.parse(this.dataset.verse);
    
    // Add user ID to verse for personalization
    const savedVerse = {
        ...verse,
        id: Date.now().toString(),
        userId: currentUser.id,
        savedDate: new Date().toISOString()
    };
    
    // Get existing saved verses
    const savedVerses = JSON.parse(localStorage.getItem('savedVerses') || '[]');
    
    // Check if verse is already saved
    const alreadySaved = savedVerses.some(v => 
        v.text === verse.text && v.reference === verse.reference && v.userId === currentUser.id
    );
    
    if (alreadySaved) {
        alert('This verse is already in your saved verses!');
        return;
    }
    
    // Add to saved verses
    savedVerses.push(savedVerse);
    localStorage.setItem('savedVerses', JSON.stringify(savedVerses));
    
    // Update verse history
    loadVerseHistory();
    
    alert('Verse saved to your collection!');
}

// Helper function to format date
function formatDate(dateString) {
    const options = { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
    };
    return new Date(dateString).toLocaleDateString(undefined, options);
}