// Announcements functionality
document.addEventListener('DOMContentLoaded', function() {
    // Wait for Supabase to be ready
    if (window.supabaseReady) {
        initAnnouncements();
    } else {
        window.addEventListener('supabaseReady', initAnnouncements);
    }
});

function initAnnouncements() {
    // Check if user is logged in
    checkAuth();
    
    // Initialize announcements page
    initializeAnnouncementsPage();
    
    // Setup event listeners
    setupAnnouncementsEventListeners();
}

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

// Initialize announcements page
function initializeAnnouncementsPage() {
    loadAnnouncements();
}

// Setup event listeners
function setupAnnouncementsEventListeners() {
    // Sidebar toggle
    document.getElementById('menuToggle').addEventListener('click', toggleSidebar);
    document.getElementById('sidebarToggle').addEventListener('click', toggleSidebar);
    
    // Logout
    document.getElementById('logoutBtn').addEventListener('click', function() {
        localStorage.removeItem('currentUser');
        window.location.href = 'index.html';
    });
    
    // Comment form
    document.getElementById('announcementCommentForm').addEventListener('submit', handleAnnouncementCommentSubmit);
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

// Load announcements
async function loadAnnouncements() {
    try {
        const announcementsResult = await window.supabaseDB.getAnnouncements();
        const announcements = announcementsResult.success ? announcementsResult.data : [];
        const sortedAnnouncements = announcements.sort((a, b) => new Date(b.date || b.created_at) - new Date(a.date || a.created_at));
        
        displayAnnouncements(sortedAnnouncements);
    } catch (error) {
        console.error('Error loading announcements:', error);
    }
}

// Display announcements
function displayAnnouncements(announcements) {
    const container = document.getElementById('announcementsContainer');
    
    if (announcements.length === 0) {
        container.innerHTML = `
            <div class="text-center py-5">
                <i class="fas fa-bullhorn fa-3x text-muted mb-3"></i>
                <h4 class="text-muted">No Announcements</h4>
                <p class="text-muted">Check back later for updates.</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = announcements.map(announcement => {
        const announcementDate = new Date(announcement.date);
        const isRecent = (Date.now() - announcementDate.getTime()) < (7 * 24 * 60 * 60 * 1000);
        
        let cardClass = 'announcement-card';
        if (announcement.priority === 'important') cardClass += ' important';
        if (announcement.priority === 'urgent') cardClass += ' urgent';
        
        // Get reactions for this announcement
        const reactions = JSON.parse(localStorage.getItem('announcementReactions') || '[]');
        const announcementReactions = reactions.filter(r => r.announcementId === announcement.id);
        
        // Get comments for this announcement
        const comments = JSON.parse(localStorage.getItem('announcementComments') || '[]');
        const announcementComments = comments.filter(c => c.announcementId === announcement.id);
        
        return `
            <div class="card ${cardClass}">
                <div class="card-body">
                    <div class="row">
                        <div class="col-md-2 col-lg-1">
                            <div class="announcement-date">
                                <span class="day">${announcementDate.getDate()}</span>
                                <span class="month">${announcementDate.toLocaleString('default', { month: 'short' })}</span>
                            </div>
                        </div>
                        <div class="col-md-10 col-lg-11">
                            <div class="d-flex justify-content-between align-items-start mb-2">
                                <h5 class="card-title mb-0">${announcement.title}</h5>
                                ${isRecent ? '<span class="badge bg-success">New</span>' : ''}
                            </div>
                            <p class="card-text">${announcement.content}</p>
                            
                            ${announcement.venue || announcement.time ? `
                                <div class="announcement-meta mb-3">
                                    ${announcement.venue ? `
                                        <span class="text-muted small me-3">
                                            <i class="fas fa-map-marker-alt me-1"></i>${announcement.venue}
                                        </span>
                                    ` : ''}
                                    ${announcement.time ? `
                                        <span class="text-muted small">
                                            <i class="fas fa-clock me-1"></i>${announcement.time}
                                        </span>
                                    ` : ''}
                                </div>
                            ` : ''}
                            
                            <div class="d-flex justify-content-between align-items-center">
                                <div class="reactions">
                                    <button class="btn btn-sm reaction-btn like-btn ${getUserAnnouncementReaction(announcement.id, 'like') ? 'active' : ''}" 
                                            data-announcement-id="${announcement.id}" data-reaction="like">
                                        <i class="fas fa-thumbs-up me-1"></i>
                                        <span class="like-count">${announcementReactions.filter(r => r.reaction === 'like').length}</span>
                                    </button>
                                    <button class="btn btn-sm reaction-btn love-btn ${getUserAnnouncementReaction(announcement.id, 'love') ? 'active' : ''}" 
                                            data-announcement-id="${announcement.id}" data-reaction="love">
                                        <i class="fas fa-heart me-1"></i>
                                        <span class="love-count">${announcementReactions.filter(r => r.reaction === 'love').length}</span>
                                    </button>
                                </div>
                                <div>
                                    <button class="btn btn-outline-primary btn-sm view-announcement" 
                                            data-announcement-id="${announcement.id}" 
                                            data-bs-toggle="modal" 
                                            data-bs-target="#announcementModal">
                                        <i class="fas fa-comments me-1"></i>
                                        Comments (${announcementComments.length})
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }).join('');
    
    // Add event listeners to reaction buttons
    document.querySelectorAll('.like-btn, .love-btn').forEach(button => {
        button.addEventListener('click', handleAnnouncementReaction);
    });
    
    // Add event listeners to view announcement buttons
    document.querySelectorAll('.view-announcement').forEach(button => {
        button.addEventListener('click', function() {
            showAnnouncementDetails(this.dataset.announcementId);
        });
    });
}

// Handle reaction to announcement
function handleAnnouncementReaction(event) {
    event.preventDefault();
    
    const currentUser = JSON.parse(localStorage.getItem('currentUser'));
    const announcementId = this.dataset.announcementId;
    const reactionType = this.dataset.reaction;
    
    // Get existing reactions
    const reactions = JSON.parse(localStorage.getItem('announcementReactions') || '[]');
    
    // Remove any existing reaction from this user for this announcement
    const filteredReactions = reactions.filter(r => 
        !(r.announcementId === announcementId && r.userId === currentUser.id)
    );
    
    // Add new reaction
    filteredReactions.push({
        id: Date.now().toString(),
        announcementId: announcementId,
        userId: currentUser.id,
        userName: currentUser.name,
        reaction: reactionType,
        timestamp: new Date().toISOString()
    });
    
    localStorage.setItem('announcementReactions', JSON.stringify(filteredReactions));
    
    // Reload announcements to update reaction counts
    loadAnnouncements();
}

// Check if user has reacted to an announcement
function getUserAnnouncementReaction(announcementId, reactionType) {
    const currentUser = JSON.parse(localStorage.getItem('currentUser'));
    const reactions = JSON.parse(localStorage.getItem('announcementReactions') || '[]');
    
    return reactions.some(r => 
        r.announcementId === announcementId && 
        r.userId === currentUser.id && 
        r.reaction === reactionType
    );
}

// Show announcement details in modal
function showAnnouncementDetails(announcementId) {
    const announcements = JSON.parse(localStorage.getItem('announcements') || '[]');
    const announcement = announcements.find(a => a.id === announcementId);
    
    if (!announcement) {
        alert('Announcement not found');
        return;
    }
    
    const announcementDate = new Date(announcement.date);
    
    // Update modal title
    document.getElementById('announcementModalTitle').textContent = announcement.title;
    
    // Update announcement details
    document.getElementById('announcementDetails').innerHTML = `
        <div class="row mb-3">
            <div class="col-md-6">
                <p><strong>Date:</strong> ${formatDate(announcement.date)}</p>
                ${announcement.time ? `<p><strong>Time:</strong> ${announcement.time}</p>` : ''}
                ${announcement.venue ? `<p><strong>Venue:</strong> ${announcement.venue}</p>` : ''}
            </div>
            <div class="col-md-6">
                ${announcement.priority ? `
                    <p><strong>Priority:</strong> 
                        <span class="badge ${
                            announcement.priority === 'urgent' ? 'bg-danger' : 
                            announcement.priority === 'important' ? 'bg-warning' : 'bg-secondary'
                        }">
                            ${announcement.priority.charAt(0).toUpperCase() + announcement.priority.slice(1)}
                        </span>
                    </p>
                ` : ''}
            </div>
        </div>
        <div class="row">
            <div class="col-12">
                <h6>Content</h6>
                <p>${announcement.content}</p>
            </div>
        </div>
    `;
    
    // Set announcement ID for comments
    document.getElementById('commentAnnouncementId').value = announcementId;
    
    // Load comments for this announcement
    loadAnnouncementComments(announcementId);
}

// Load comments for an announcement
function loadAnnouncementComments(announcementId) {
    const comments = JSON.parse(localStorage.getItem('announcementComments') || '[]');
    const announcementComments = comments
        .filter(c => c.announcementId === announcementId)
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    
    const commentsContainer = document.getElementById('announcementComments');
    
    if (announcementComments.length === 0) {
        commentsContainer.innerHTML = '<p class="text-muted">No comments yet. Be the first to comment!</p>';
        return;
    }
    
    commentsContainer.innerHTML = announcementComments.map(comment => `
        <div class="comment">
            <div class="comment-author">${comment.userName}</div>
            <div class="comment-text">${comment.text}</div>
            <div class="comment-date">${formatDateTime(comment.timestamp)}</div>
        </div>
    `).join('');
}

// Handle announcement comment submission
function handleAnnouncementCommentSubmit(e) {
    e.preventDefault();
    
    const currentUser = JSON.parse(localStorage.getItem('currentUser'));
    const announcementId = document.getElementById('commentAnnouncementId').value;
    const commentText = document.getElementById('announcementCommentText').value.trim();
    
    if (!commentText) {
        alert('Please enter a comment');
        return;
    }
    
    // Get existing comments
    const comments = JSON.parse(localStorage.getItem('announcementComments') || '[]');
    
    // Add new comment
    comments.push({
        id: Date.now().toString(),
        announcementId: announcementId,
        userId: currentUser.id,
        userName: currentUser.name,
        text: commentText,
        timestamp: new Date().toISOString()
    });
    
    localStorage.setItem('announcementComments', JSON.stringify(comments));
    
    // Clear comment form
    document.getElementById('announcementCommentText').value = '';
    
    // Reload comments
    loadAnnouncementComments(announcementId);
    
    // Update announcement list to show new comment count
    loadAnnouncements();
}

// Helper function to format date
function formatDate(dateString) {
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    return new Date(dateString).toLocaleDateString(undefined, options);
}

// Helper function to format date and time
function formatDateTime(dateTimeString) {
    const options = { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    };
    return new Date(dateTimeString).toLocaleDateString(undefined, options);
}