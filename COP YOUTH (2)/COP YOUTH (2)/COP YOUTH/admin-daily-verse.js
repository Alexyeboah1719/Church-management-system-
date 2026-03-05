// Admin Daily Verse Management functionality
document.addEventListener('DOMContentLoaded', function() {
    // Check if admin is logged in
    checkAdminAuth();
    
    // Initialize daily verse management
    initializeDailyVerseManagement();
    
    // Setup event listeners
    setupVerseEventListeners();
});

// Check admin authentication
function checkAdminAuth() {
    const currentUser = JSON.parse(localStorage.getItem('currentUser'));
    
    if (!currentUser || currentUser.type !== 'admin') {
        window.location.href = 'auth.html?admin=true';
        return;
    }
    
    // Display admin name
    document.getElementById('adminName').textContent = currentUser.name;
}

// Initialize daily verse management
function initializeDailyVerseManagement() {
    // Set today's date as default in the form
    document.getElementById('verseDate').value = new Date().toISOString().split('T')[0];
    
    loadVersesData();
}

// Setup event listeners
function setupVerseEventListeners() {
    // Sidebar toggle
    document.getElementById('menuToggle').addEventListener('click', toggleSidebar);
    document.getElementById('sidebarToggle').addEventListener('click', toggleSidebar);
    
    // Logout
    document.getElementById('logoutBtn').addEventListener('click', function() {
        localStorage.removeItem('currentUser');
        window.location.href = 'index.html?admin=true';
    });
    
    // Upload verse
    document.getElementById('saveVerse').addEventListener('click', uploadNewVerse);
    
    // Update verse
    document.getElementById('updateVerse').addEventListener('click', updateVerse);
    
    // Filter buttons
    document.getElementById('filterAll').addEventListener('click', function() {
        setActiveFilter('all');
        filterVerses('all');
    });
    
    document.getElementById('filterThisWeek').addEventListener('click', function() {
        setActiveFilter('thisWeek');
        filterVerses('thisWeek');
    });
    
    document.getElementById('filterThisMonth').addEventListener('click', function() {
        setActiveFilter('thisMonth');
        filterVerses('thisMonth');
    });
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

// Set active filter button
function setActiveFilter(filterType) {
    // Remove active class from all buttons
    document.querySelectorAll('#filterAll, #filterThisWeek, #filterThisMonth').forEach(btn => {
        btn.classList.remove('active');
    });
    
    // Add active class to clicked button
    document.getElementById(`filter${filterType.charAt(0).toUpperCase() + filterType.slice(1)}`).classList.add('active');
}

// Load all verses data
function loadVersesData() {
    const dailyVerses = JSON.parse(localStorage.getItem('dailyVerses') || '[]');
    const savedVerses = JSON.parse(localStorage.getItem('savedVerses') || '[]');
    
    // Calculate statistics
    const totalVerses = dailyVerses.length;
    const savedCount = savedVerses.length;
    
    const today = new Date();
    const thisMonth = today.getMonth();
    const thisYear = today.getFullYear();
    
    const monthVerses = dailyVerses.filter(verse => {
        const verseDate = new Date(verse.date);
        return verseDate.getMonth() === thisMonth && verseDate.getFullYear() === thisYear;
    }).length;
    
    const upcomingVerses = dailyVerses.filter(verse => new Date(verse.date) > today).length;
    
    // Update statistics
    document.getElementById('totalVerses').textContent = totalVerses;
    document.getElementById('savedVerses').textContent = savedCount;
    document.getElementById('monthVerses').textContent = monthVerses;
    document.getElementById('upcomingVerses').textContent = upcomingVerses;
    
    // Load today's verse preview
    loadTodayVersePreview(dailyVerses);
    
    // Load verses table
    loadVersesTable(dailyVerses, savedVerses);
}

// Load today's verse preview
function loadTodayVersePreview(verses) {
    const today = new Date().toISOString().split('T')[0];
    const todayVerse = verses.find(verse => verse.date === today);
    
    const previewContainer = document.getElementById('todayVersePreview');
    
    if (todayVerse) {
        previewContainer.innerHTML = `
            <p class="lead">"${todayVerse.text}"</p>
            <h5 class="text-muted">- ${todayVerse.reference}</h5>
            <div class="mt-3">
                <span class="badge category-${todayVerse.category || 'encouragement'}">
                    ${getCategoryLabel(todayVerse.category)}
                </span>
            </div>
        `;
    } else {
        previewContainer.innerHTML = `
            <p class="lead">No verse set for today</p>
            <h5 class="text-muted">- Upload a verse to feature it</h5>
            <div class="mt-3">
                <button class="btn btn-warning btn-sm" data-bs-toggle="modal" data-bs-target="#uploadVerseModal">
                    <i class="fas fa-upload me-1"></i> Upload Today's Verse
                </button>
            </div>
        `;
    }
}

// Load verses table
function loadVersesTable(verses, savedVerses) {
    const tableBody = document.getElementById('versesBody');
    
    if (verses.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="6" class="text-center text-muted py-4">
                    <div class="empty-verses">
                        <i class="fas fa-bible"></i>
                        <h4>No Verses Uploaded</h4>
                        <p>Start by uploading your first daily verse to inspire the church community.</p>
                        <button class="btn btn-primary mt-3" data-bs-toggle="modal" data-bs-target="#uploadVerseModal">
                            <i class="fas fa-upload me-1"></i> Upload First Verse
                        </button>
                    </div>
                </td>
            </tr>
        `;
        return;
    }
    
    // Sort by date (most recent first)
    verses.sort((a, b) => new Date(b.date) - new Date(a.date));
    
    tableBody.innerHTML = verses.map(verse => {
        const today = new Date().toISOString().split('T')[0];
        const verseDate = new Date(verse.date);
        const isToday = verse.date === today;
        const isFuture = verseDate > new Date();
        const isPast = verseDate < new Date().setHours(0, 0, 0, 0);
        
        let statusBadge = '';
        if (isToday) {
            statusBadge = '<span class="badge badge-status-active">Today</span>';
        } else if (isFuture) {
            statusBadge = '<span class="badge badge-status-upcoming">Upcoming</span>';
        } else {
            statusBadge = '<span class="badge badge-status-past">Past</span>';
        }
        
        // Count how many times this verse was saved
        const saveCount = savedVerses.filter(sv => 
            sv.text === verse.text && sv.reference === verse.reference
        ).length;
        
        let dateClass = 'verse-date past';
        if (isToday) dateClass = 'verse-date today';
        else if (isFuture) dateClass = 'verse-date future';
        
        return `
            <tr class="verse-row category-${verse.category || 'encouragement'}">
                <td>
                    <div class="verse-text" title="${verse.text}">
                        "${verse.text}"
                    </div>
                </td>
                <td>
                    <strong>${verse.reference}</strong>
                    <br>
                    <span class="badge category-${verse.category || 'encouragement'}">
                        ${getCategoryLabel(verse.category)}
                    </span>
                </td>
                <td class="${dateClass}">${formatDate(verse.date)}</td>
                <td>
                    <span class="saved-count">${saveCount}</span>
                    <small class="text-muted"> saves</small>
                </td>
                <td>${statusBadge}</td>
                <td>
                    <div class="btn-group btn-group-sm">
                        <button class="btn btn-outline-primary edit-verse" data-verse-id="${verse.id}">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn btn-outline-danger delete-verse" data-verse-id="${verse.id}">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
    
    // Add event listeners
    addVerseTableListeners();
}

// Add event listeners to table buttons
function addVerseTableListeners() {
    // Edit verse
    document.querySelectorAll('.edit-verse').forEach(btn => {
        btn.addEventListener('click', function() {
            editVerse(this.dataset.verseId);
        });
    });
    
    // Delete verse
    document.querySelectorAll('.delete-verse').forEach(btn => {
        btn.addEventListener('click', function() {
            deleteVerse(this.dataset.verseId);
        });
    });
}

// Filter verses
function filterVerses(filterType) {
    const dailyVerses = JSON.parse(localStorage.getItem('dailyVerses') || '[]');
    const savedVerses = JSON.parse(localStorage.getItem('savedVerses') || '[]');
    
    let filteredVerses = dailyVerses;
    
    const today = new Date();
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay());
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    
    switch (filterType) {
        case 'thisWeek':
            filteredVerses = dailyVerses.filter(verse => {
                const verseDate = new Date(verse.date);
                return verseDate >= startOfWeek && verseDate <= today;
            });
            break;
        case 'thisMonth':
            filteredVerses = dailyVerses.filter(verse => {
                const verseDate = new Date(verse.date);
                return verseDate >= startOfMonth && verseDate <= today;
            });
            break;
        // 'all' shows all verses
    }
    
    loadFilteredVersesTable(filteredVerses, savedVerses);
}

// Load filtered verses table
function loadFilteredVersesTable(verses, savedVerses) {
    const tableBody = document.getElementById('versesBody');
    
    if (verses.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="6" class="text-center text-muted py-4">
                    <div class="empty-verses">
                        <i class="fas fa-search"></i>
                        <h4>No Verses Found</h4>
                        <p>No verses match the current filter criteria.</p>
                    </div>
                </td>
            </tr>
        `;
        return;
    }
    
    // Sort by date (most recent first)
    verses.sort((a, b) => new Date(b.date) - new Date(a.date));
    
    tableBody.innerHTML = verses.map(verse => {
        const today = new Date().toISOString().split('T')[0];
        const verseDate = new Date(verse.date);
        const isToday = verse.date === today;
        const isFuture = verseDate > new Date();
        const isPast = verseDate < new Date().setHours(0, 0, 0, 0);
        
        let statusBadge = '';
        if (isToday) {
            statusBadge = '<span class="badge badge-status-active">Today</span>';
        } else if (isFuture) {
            statusBadge = '<span class="badge badge-status-upcoming">Upcoming</span>';
        } else {
            statusBadge = '<span class="badge badge-status-past">Past</span>';
        }
        
        // Count how many times this verse was saved
        const saveCount = savedVerses.filter(sv => 
            sv.text === verse.text && sv.reference === verse.reference
        ).length;
        
        let dateClass = 'verse-date past';
        if (isToday) dateClass = 'verse-date today';
        else if (isFuture) dateClass = 'verse-date future';
        
        return `
            <tr class="verse-row category-${verse.category || 'encouragement'}">
                <td>
                    <div class="verse-text" title="${verse.text}">
                        "${verse.text}"
                    </div>
                </td>
                <td>
                    <strong>${verse.reference}</strong>
                    <br>
                    <span class="badge category-${verse.category || 'encouragement'}">
                        ${getCategoryLabel(verse.category)}
                    </span>
                </td>
                <td class="${dateClass}">${formatDate(verse.date)}</td>
                <td>
                    <span class="saved-count">${saveCount}</span>
                    <small class="text-muted"> saves</small>
                </td>
                <td>${statusBadge}</td>
                <td>
                    <div class="btn-group btn-group-sm">
                        <button class="btn btn-outline-primary edit-verse" data-verse-id="${verse.id}">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn btn-outline-danger delete-verse" data-verse-id="${verse.id}">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
    
    // Add event listeners
    addVerseTableListeners();
}

// Upload new verse
function uploadNewVerse() {
    const text = document.getElementById('verseText').value.trim();
    const reference = document.getElementById('verseReference').value.trim();
    const date = document.getElementById('verseDate').value;
    const category = document.getElementById('verseCategory').value;
    const featured = document.getElementById('verseFeatured').checked;
    
    if (!text || !reference || !date) {
        alert('Please fill in all required fields');
        return;
    }
    
    // Create new verse
    const newVerse = {
        id: Date.now().toString(),
        text: text,
        reference: reference,
        date: date,
        category: category,
        featured: featured,
        created: new Date().toISOString(),
        createdBy: JSON.parse(localStorage.getItem('currentUser')).name
    };
    
    // Save verse
    const dailyVerses = JSON.parse(localStorage.getItem('dailyVerses') || '[]');
    dailyVerses.push(newVerse);
    localStorage.setItem('dailyVerses', JSON.stringify(dailyVerses));
    
    // Close modal and reset form
    const modal = bootstrap.Modal.getInstance(document.getElementById('uploadVerseModal'));
    modal.hide();
    document.getElementById('uploadVerseForm').reset();
    
    // Set today's date as default
    document.getElementById('verseDate').value = new Date().toISOString().split('T')[0];
    
    // Reload data
    loadVersesData();
    
    // Record activity
    recordAdminActivity(`Uploaded daily verse: ${reference}`);
    
    alert('Daily verse uploaded successfully!');
}

// Edit verse
function editVerse(verseId) {
    const dailyVerses = JSON.parse(localStorage.getItem('dailyVerses') || '[]');
    const verse = dailyVerses.find(v => v.id === verseId);
    
    if (!verse) {
        alert('Verse not found');
        return;
    }
    
    // Fill form with verse data
    document.getElementById('editVerseId').value = verse.id;
    document.getElementById('editVerseText').value = verse.text;
    document.getElementById('editVerseReference').value = verse.reference;
    document.getElementById('editVerseDate').value = verse.date;
    document.getElementById('editVerseCategory').value = verse.category || 'encouragement';
    
    // Show modal
    const modal = new bootstrap.Modal(document.getElementById('editVerseModal'));
    modal.show();
}

// Update verse
function updateVerse() {
    const verseId = document.getElementById('editVerseId').value;
    const text = document.getElementById('editVerseText').value.trim();
    const reference = document.getElementById('editVerseReference').value.trim();
    const date = document.getElementById('editVerseDate').value;
    const category = document.getElementById('editVerseCategory').value;
    
    if (!text || !reference || !date) {
        alert('Please fill in all required fields');
        return;
    }
    
    const dailyVerses = JSON.parse(localStorage.getItem('dailyVerses') || '[]');
    const verseIndex = dailyVerses.findIndex(v => v.id === verseId);
    
    if (verseIndex === -1) {
        alert('Verse not found');
        return;
    }
    
    // Update verse
    dailyVerses[verseIndex].text = text;
    dailyVerses[verseIndex].reference = reference;
    dailyVerses[verseIndex].date = date;
    dailyVerses[verseIndex].category = category;
    
    localStorage.setItem('dailyVerses', JSON.stringify(dailyVerses));
    
    // Close modal
    const modal = bootstrap.Modal.getInstance(document.getElementById('editVerseModal'));
    modal.hide();
    
    // Reload data
    loadVersesData();
    
    // Record activity
    recordAdminActivity(`Updated daily verse: ${reference}`);
    
    alert('Daily verse updated successfully!');
}

// Delete verse
function deleteVerse(verseId) {
    if (!confirm('Are you sure you want to delete this verse? This action cannot be undone.')) {
        return;
    }
    
    const dailyVerses = JSON.parse(localStorage.getItem('dailyVerses') || '[]');
    const verseIndex = dailyVerses.findIndex(v => v.id === verseId);
    
    if (verseIndex !== -1) {
        const verseReference = dailyVerses[verseIndex].reference;
        
        // Remove verse
        dailyVerses.splice(verseIndex, 1);
        localStorage.setItem('dailyVerses', JSON.stringify(dailyVerses));
        
        // Record activity
        recordAdminActivity(`Deleted daily verse: ${verseReference}`);
        
        // Reload data
        loadVersesData();
        
        alert('Verse deleted successfully!');
    }
}

// Helper function to get category label
function getCategoryLabel(category) {
    const categoryLabels = {
        'encouragement': 'Encouragement',
        'faith': 'Faith',
        'hope': 'Hope',
        'love': 'Love',
        'peace': 'Peace',
        'strength': 'Strength',
        'wisdom': 'Wisdom'
    };
    
    return categoryLabels[category] || 'Encouragement';
}

// Helper function to format date
function formatDate(dateString) {
    const options = { year: 'numeric', month: 'short', day: 'numeric' };
    return new Date(dateString).toLocaleDateString(undefined, options);
}

// Record admin activity
function recordAdminActivity(description) {
    const activities = JSON.parse(localStorage.getItem('adminActivities') || '[]');
    
    activities.push({
        id: Date.now().toString(),
        description: description,
        timestamp: new Date().toISOString()
    });
    
    localStorage.setItem('adminActivities', JSON.stringify(activities));
}