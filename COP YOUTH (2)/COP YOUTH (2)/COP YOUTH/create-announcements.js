// Admin Announcements Management functionality
document.addEventListener('DOMContentLoaded', function() {
    // Check if admin is logged in
    checkAdminAuth();
    
    // Initialize announcements management
    initializeAnnouncementsManagement();
    
    // Setup event listeners
    setupAnnouncementsEventListeners();
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

// Initialize announcements management
function initializeAnnouncementsManagement() {
    loadAnnouncementsData();
}

// Setup event listeners
function setupAnnouncementsEventListeners() {
    // Sidebar toggle
    document.getElementById('menuToggle').addEventListener('click', toggleSidebar);
    document.getElementById('sidebarToggle').addEventListener('click', toggleSidebar);
    
    // Logout
    document.getElementById('logoutBtn').addEventListener('click', function() {
        localStorage.removeItem('currentUser');
        window.location.href = 'index.html?admin=true';
    });
    
    // Add announcement
    document.getElementById('saveAnnouncement').addEventListener('click', addNewAnnouncement);
    
    // Update announcement
    document.getElementById('updateAnnouncement').addEventListener('click', updateAnnouncement);
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

// Load all announcements data
function loadAnnouncementsData() {
    const announcements = JSON.parse(localStorage.getItem('announcements') || '[]');
    const reactions = JSON.parse(localStorage.getItem('announcementReactions') || '[]');
    const comments = JSON.parse(localStorage.getItem('announcementComments') || '[]');
    
    // Calculate statistics
    const totalAnnouncements = announcements.length;
    const activeAnnouncements = announcements.filter(a => a.active).length;
    const importantAnnouncements = announcements.filter(a => a.priority === 'important').length;
    const urgentAnnouncements = announcements.filter(a => a.priority === 'urgent').length;
    
    // Update statistics
    document.getElementById('totalAnnouncements').textContent = totalAnnouncements;
    document.getElementById('activeAnnouncements').textContent = activeAnnouncements;
    document.getElementById('importantAnnouncements').textContent = importantAnnouncements;
    document.getElementById('urgentAnnouncements').textContent = urgentAnnouncements;
    
    // Load announcements table
    loadAnnouncementsTable(announcements, reactions, comments);
}

// Load announcements table
function loadAnnouncementsTable(announcements, reactions, comments) {
    const tableBody = document.getElementById('announcementsBody');
    
    if (announcements.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="8" class="text-center text-muted py-4">
                    <i class="fas fa-bullhorn fa-3x mb-3 d-block"></i>
                    No announcements created yet
                </td>
            </tr>
        `;
        return;
    }
    
    // Sort by date (most recent first)
    announcements.sort((a, b) => new Date(b.date) - new Date(a.date));
    
    tableBody.innerHTML = announcements.map(announcement => {
        const announcementReactions = reactions.filter(r => r.announcementId === announcement.id);
        const announcementComments = comments.filter(c => c.announcementId === announcement.id);
        
        const likeCount = announcementReactions.filter(r => r.reaction === 'like').length;
        const loveCount = announcementReactions.filter(r => r.reaction === 'love').length;
        
        return `
            <tr>
                <td>
                    <strong>${announcement.title}</strong>
                    ${announcement.venue ? `<br><small class="text-muted">${announcement.venue}</small>` : ''}
                </td>
                <td class="content-preview" title="${announcement.content}">
                    ${announcement.content}
                </td>
                <td>${formatDate(announcement.date)}</td>
                <td>
                    <span class="badge badge-priority-${announcement.priority}">
                        ${announcement.priority.charAt(0).toUpperCase() + announcement.priority.slice(1)}
                    </span>
                </td>
                <td>
                    <small class="reaction-count">
                        <i class="fas fa-thumbs-up text-primary"></i> ${likeCount}
                        <i class="fas fa-heart text-danger ms-2"></i> ${loveCount}
                    </small>
                </td>
                <td>
                    <small class="reaction-count">
                        <i class="fas fa-comments text-info"></i> ${announcementComments.length}
                    </small>
                </td>
                <td>
                    <span class="badge ${announcement.active ? 'badge-status-active' : 'badge-status-inactive'}">
                        ${announcement.active ? 'Active' : 'Inactive'}
                    </span>
                </td>
                <td>
                    <div class="btn-group btn-group-sm">
                        <button class="btn btn-outline-primary view-announcement" data-announcement-id="${announcement.id}">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button class="btn btn-outline-warning edit-announcement" data-announcement-id="${announcement.id}">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn btn-outline-danger delete-announcement" data-announcement-id="${announcement.id}">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
    
    // Add event listeners
    addAnnouncementTableListeners();
}

// Add event listeners to table buttons
function addAnnouncementTableListeners() {
    // View announcement
    document.querySelectorAll('.view-announcement').forEach(btn => {
        btn.addEventListener('click', function() {
            viewAnnouncementDetails(this.dataset.announcementId);
        });
    });
    
    // Edit announcement
    document.querySelectorAll('.edit-announcement').forEach(btn => {
        btn.addEventListener('click', function() {
            editAnnouncement(this.dataset.announcementId);
        });
    });
    
    // Delete announcement
    document.querySelectorAll('.delete-announcement').forEach(btn => {
        btn.addEventListener('click', function() {
            deleteAnnouncement(this.dataset.announcementId);
        });
    });
}

// Add new announcement
function addNewAnnouncement() {
    const title = document.getElementById('announcementTitle').value.trim();
    const content = document.getElementById('announcementContent').value.trim();
    const date = document.getElementById('announcementDate').value;
    const time = document.getElementById('announcementTime').value;
    const venue = document.getElementById('announcementVenue').value.trim();
    const priority = document.getElementById('announcementPriority').value;
    const active = document.getElementById('announcementActive').checked;
    
    if (!title || !content || !date) {
        alert('Please fill in all required fields');
        return;
    }
    
    // Create new announcement
    const newAnnouncement = {
        id: Date.now().toString(),
        title: title,
        content: content,
        date: date,
        time: time || '',
        venue: venue || '',
        priority: priority,
        active: active,
        created: new Date().toISOString(),
        createdBy: JSON.parse(localStorage.getItem('currentUser')).name
    };
    
    // Save announcement
    const announcements = JSON.parse(localStorage.getItem('announcements') || '[]');
    announcements.push(newAnnouncement);
    localStorage.setItem('announcements', JSON.stringify(announcements));
    
    // Close modal and reset form
    const modal = bootstrap.Modal.getInstance(document.getElementById('addAnnouncementModal'));
    modal.hide();
    document.getElementById('addAnnouncementForm').reset();
    
    // Reload data
    loadAnnouncementsData();
    
    // Record activity
    recordAdminActivity(`Created new announcement: ${title}`);
    
    alert('Announcement created successfully!');
}

// Edit announcement
function editAnnouncement(announcementId) {
    const announcements = JSON.parse(localStorage.getItem('announcements') || '[]');
    const announcement = announcements.find(a => a.id === announcementId);
    
    if (!announcement) {
        alert('Announcement not found');
        return;
    }
    
    // Fill form with announcement data
    document.getElementById('editAnnouncementId').value = announcement.id;
    document.getElementById('editAnnouncementTitle').value = announcement.title;
    document.getElementById('editAnnouncementContent').value = announcement.content;
    document.getElementById('editAnnouncementDate').value = announcement.date;
    document.getElementById('editAnnouncementTime').value = announcement.time || '';
    document.getElementById('editAnnouncementVenue').value = announcement.venue || '';
    document.getElementById('editAnnouncementPriority').value = announcement.priority;
    document.getElementById('editAnnouncementActive').checked = announcement.active;
    
    // Show modal
    const modal = new bootstrap.Modal(document.getElementById('editAnnouncementModal'));
    modal.show();
}

// Update announcement
function updateAnnouncement() {
    const announcementId = document.getElementById('editAnnouncementId').value;
    const title = document.getElementById('editAnnouncementTitle').value.trim();
    const content = document.getElementById('editAnnouncementContent').value.trim();
    const date = document.getElementById('editAnnouncementDate').value;
    const time = document.getElementById('editAnnouncementTime').value;
    const venue = document.getElementById('editAnnouncementVenue').value.trim();
    const priority = document.getElementById('editAnnouncementPriority').value;
    const active = document.getElementById('editAnnouncementActive').checked;
    
    if (!title || !content || !date) {
        alert('Please fill in all required fields');
        return;
    }
    
    const announcements = JSON.parse(localStorage.getItem('announcements') || '[]');
    const announcementIndex = announcements.findIndex(a => a.id === announcementId);
    
    if (announcementIndex === -1) {
        alert('Announcement not found');
        return;
    }
    
    // Update announcement
    announcements[announcementIndex].title = title;
    announcements[announcementIndex].content = content;
    announcements[announcementIndex].date = date;
    announcements[announcementIndex].time = time;
    announcements[announcementIndex].venue = venue;
    announcements[announcementIndex].priority = priority;
    announcements[announcementIndex].active = active;
    
    localStorage.setItem('announcements', JSON.stringify(announcements));
    
    // Close modal
    const modal = bootstrap.Modal.getInstance(document.getElementById('editAnnouncementModal'));
    modal.hide();
    
    // Reload data
    loadAnnouncementsData();
    
    // Record activity
    recordAdminActivity(`Updated announcement: ${title}`);
    
    alert('Announcement updated successfully!');
}

// View announcement details
function viewAnnouncementDetails(announcementId) {
    const announcements = JSON.parse(localStorage.getItem('announcements') || '[]');
    const announcement = announcements.find(a => a.id === announcementId);
    const reactions = JSON.parse(localStorage.getItem('announcementReactions') || '[]');
    const comments = JSON.parse(localStorage.getItem('announcementComments') || '[]');
    
    if (!announcement) {
        alert('Announcement not found');
        return;
    }
    
    const announcementReactions = reactions.filter(r => r.announcementId === announcementId);
    const announcementComments = comments.filter(c => c.announcementId === announcementId);
    
    const likeCount = announcementReactions.filter(r => r.reaction === 'like').length;
    const loveCount = announcementReactions.filter(r => r.reaction === 'love').length;
    
    // Update modal content
    document.getElementById('announcementDetailsContent').innerHTML = `
        <div class="row">
            <div class="col-md-8">
                <h4>${announcement.title}</h4>
                <p class="text-muted">Created by ${announcement.createdBy} on ${formatDateTime(announcement.created)}</p>
                
                <div class="mb-3">
                    <strong>Content:</strong>
                    <p class="mt-2">${announcement.content}</p>
                </div>
                
                <div class="row">
                    <div class="col-md-6">
                        <p><strong>Date:</strong> ${formatDate(announcement.date)}</p>
                        ${announcement.time ? `<p><strong>Time:</strong> ${announcement.time}</p>` : ''}
                        ${announcement.venue ? `<p><strong>Venue:</strong> ${announcement.venue}</p>` : ''}
                    </div>
                    <div class="col-md-6">
                        <p><strong>Priority:</strong> 
                            <span class="badge badge-priority-${announcement.priority}">
                                ${announcement.priority.charAt(0).toUpperCase() + announcement.priority.slice(1)}
                            </span>
                        </p>
                        <p><strong>Status:</strong> 
                            <span class="badge ${announcement.active ? 'badge-status-active' : 'badge-status-inactive'}">
                                ${announcement.active ? 'Active' : 'Inactive'}
                            </span>
                        </p>
                    </div>
                </div>
            </div>
            <div class="col-md-4">
                <h5>Engagement</h5>
                <div class="text-center">
                    <div class="row">
                        <div class="col-6">
                            <div class="p-3 border rounded">
                                <i class="fas fa-thumbs-up fa-2x text-primary mb-2"></i>
                                <div class="h5 mb-0">${likeCount}</div>
                                <small>Likes</small>
                            </div>
                        </div>
                        <div class="col-6">
                            <div class="p-3 border rounded">
                                <i class="fas fa-heart fa-2x text-danger mb-2"></i>
                                <div class="h5 mb-0">${loveCount}</div>
                                <small>Loves</small>
                            </div>
                        </div>
                    </div>
                    <div class="mt-3 p-3 border rounded">
                        <i class="fas fa-comments fa-2x text-info mb-2"></i>
                        <div class="h5 mb-0">${announcementComments.length}</div>
                        <small>Comments</small>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // Load comments
    loadAnnouncementComments(announcementComments);
    
    // Show modal
    const modal = new bootstrap.Modal(document.getElementById('viewAnnouncementModal'));
    modal.show();
}

// Load announcement comments
function loadAnnouncementComments(comments) {
    const commentsContainer = document.getElementById('announcementCommentsList');
    
    if (comments.length === 0) {
        commentsContainer.innerHTML = '<p class="text-muted">No comments yet.</p>';
        return;
    }
    
    // Sort by date (most recent first)
    comments.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    
    commentsContainer.innerHTML = comments.map(comment => `
        <div class="comment-item">
            <div class="comment-author">${comment.userName}</div>
            <div class="comment-text">${comment.text}</div>
            <div class="comment-date">${formatDateTime(comment.timestamp)}</div>
        </div>
    `).join('');
}

// Delete announcement
function deleteAnnouncement(announcementId) {
    if (!confirm('Are you sure you want to delete this announcement? This will also delete all reactions and comments for this announcement.')) {
        return;
    }
    
    const announcements = JSON.parse(localStorage.getItem('announcements') || '[]');
    const announcementIndex = announcements.findIndex(a => a.id === announcementId);
    
    if (announcementIndex !== -1) {
        const announcementTitle = announcements[announcementIndex].title;
        
        // Remove announcement
        announcements.splice(announcementIndex, 1);
        localStorage.setItem('announcements', JSON.stringify(announcements));
        
        // Remove reactions for this announcement
        const reactions = JSON.parse(localStorage.getItem('announcementReactions') || '[]');
        const filteredReactions = reactions.filter(r => r.announcementId !== announcementId);
        localStorage.setItem('announcementReactions', JSON.stringify(filteredReactions));
        
        // Remove comments for this announcement
        const comments = JSON.parse(localStorage.getItem('announcementComments') || '[]');
        const filteredComments = comments.filter(c => c.announcementId !== announcementId);
        localStorage.setItem('announcementComments', JSON.stringify(filteredComments));
        
        // Record activity
        recordAdminActivity(`Deleted announcement: ${announcementTitle}`);
        
        // Reload data
        loadAnnouncementsData();
        
        alert('Announcement deleted successfully!');
    }
}

// Helper function to format date
function formatDate(dateString) {
    const options = { year: 'numeric', month: 'short', day: 'numeric' };
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