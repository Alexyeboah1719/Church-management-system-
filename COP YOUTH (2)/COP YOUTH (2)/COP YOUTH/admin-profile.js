// Admin Profile functionality
document.addEventListener('DOMContentLoaded', function() {
    // Check if admin is logged in
    checkAdminAuth();
    
    // Initialize admin profile
    initializeAdminProfile();
    
    // Setup event listeners
    setupProfileEventListeners();
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

// Initialize admin profile
function initializeAdminProfile() {
    loadProfileData();
    loadSystemStatistics();
    loadRecentActivity();
}

// Setup event listeners
function setupProfileEventListeners() {
    // Sidebar toggle
    document.getElementById('menuToggle').addEventListener('click', toggleSidebar);
    document.getElementById('sidebarToggle').addEventListener('click', toggleSidebar);
    
    // Logout
    document.getElementById('logoutBtn').addEventListener('click', function() {
        localStorage.removeItem('currentUser');
        window.location.href = 'index.html?admin=true';
    });
    
    // Refresh activity
    document.getElementById('refreshActivity').addEventListener('click', loadRecentActivity);
    
    // Update profile
    document.getElementById('updateProfile').addEventListener('click', updateAdminProfile);
    
    // Change password
    document.getElementById('updatePassword').addEventListener('click', changeAdminPassword);
    
    // Send broadcast
    document.getElementById('sendBroadcast').addEventListener('click', sendBroadcastFromProfile);
    
    // Password strength indicator
    document.getElementById('newPassword').addEventListener('input', checkPasswordStrength);
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

// Load profile data
function loadProfileData() {
    const currentUser = JSON.parse(localStorage.getItem('currentUser'));
    const adminAccount = JSON.parse(localStorage.getItem('adminAccount'));
    
    // Update profile information
    document.getElementById('profileName').textContent = currentUser.name;
    document.getElementById('profileEmail').textContent = currentUser.email;
    
    // Fill edit form with current data
    document.getElementById('editName').value = currentUser.name;
    document.getElementById('editEmail').value = currentUser.email;
    document.getElementById('editPhone').value = adminAccount.phone || '';
}

// Load system statistics
function loadSystemStatistics() {
    const members = JSON.parse(localStorage.getItem('members') || '[]');
    const events = JSON.parse(localStorage.getItem('events') || '[]');
    const tasks = JSON.parse(localStorage.getItem('tasks') || '[]');
    const messages = JSON.parse(localStorage.getItem('messages') || '[]');
    
    // Calculate statistics
    const totalMembers = members.filter(m => m.status === 'approved').length;
    const upcomingEvents = events.filter(event => new Date(event.date) >= new Date().setHours(0, 0, 0, 0)).length;
    const activeTasks = tasks.filter(task => task.status === 'pending' || task.status === 'in-progress').length;
    const unreadMessages = messages.filter(m => !m.read && !m.isAdmin).length;
    
    // Update statistics
    document.getElementById('statMembers').textContent = totalMembers;
    document.getElementById('statEvents').textContent = upcomingEvents;
    document.getElementById('statTasks').textContent = activeTasks;
    document.getElementById('statMessages').textContent = unreadMessages;
}

// Load recent activity
function loadRecentActivity() {
    const activities = JSON.parse(localStorage.getItem('adminActivities') || '[]');
    const activityTimeline = document.getElementById('activityTimeline');
    
    if (activities.length === 0) {
        activityTimeline.innerHTML = `
            <div class="empty-activity">
                <i class="fas fa-history"></i>
                <h5>No Activity Yet</h5>
                <p>Your admin activities will appear here</p>
            </div>
        `;
        return;
    }
    
    // Get recent activities (last 10)
    const recentActivities = activities
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
        .slice(0, 10);
    
    activityTimeline.innerHTML = recentActivities.map(activity => `
        <div class="activity-item">
            <div class="activity-content">${activity.description}</div>
            <div class="activity-time">${formatDateTime(activity.timestamp)}</div>
        </div>
    `).join('');
}

// Update admin profile
function updateAdminProfile() {
    const name = document.getElementById('editName').value.trim();
    const email = document.getElementById('editEmail').value.trim().toLowerCase();
    const phone = document.getElementById('editPhone').value.trim();
    
    if (!name || !email) {
        alert('Please fill in all required fields');
        return;
    }
    
    // Update admin account
    const adminAccount = JSON.parse(localStorage.getItem('adminAccount'));
    adminAccount.name = name;
    adminAccount.email = email;
    adminAccount.phone = phone;
    localStorage.setItem('adminAccount', JSON.stringify(adminAccount));
    
    // Update current user session
    const currentUser = JSON.parse(localStorage.getItem('currentUser'));
    currentUser.name = name;
    currentUser.email = email;
    localStorage.setItem('currentUser', JSON.stringify(currentUser));
    
    // Close modal
    const modal = bootstrap.Modal.getInstance(document.getElementById('editProfileModal'));
    modal.hide();
    
    // Reload profile data
    loadProfileData();
    
    // Update displayed name
    document.getElementById('adminName').textContent = name;
    
    // Record activity
    recordAdminActivity('Updated admin profile information');
    
    alert('Profile updated successfully!');
}

// Change admin password
function changeAdminPassword() {
    const currentPassword = document.getElementById('currentPassword').value;
    const newPassword = document.getElementById('newPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    
    if (!currentPassword || !newPassword || !confirmPassword) {
        alert('Please fill in all password fields');
        return;
    }
    
    if (newPassword.length < 8) {
        alert('New password must be at least 8 characters long');
        return;
    }
    
    if (newPassword !== confirmPassword) {
        alert('New passwords do not match');
        return;
    }
    
    const adminAccount = JSON.parse(localStorage.getItem('adminAccount'));
    
    // Verify current password
    if (currentPassword !== adminAccount.password) {
        alert('Current password is incorrect');
        return;
    }
    
    // Update password
    adminAccount.password = newPassword;
    localStorage.setItem('adminAccount', JSON.stringify(adminAccount));
    
    // Close modal and reset form
    const modal = bootstrap.Modal.getInstance(document.getElementById('changePasswordModal'));
    modal.hide();
    document.getElementById('changePasswordForm').reset();
    
    // Reset password strength indicator
    document.getElementById('newPassword').dispatchEvent(new Event('input'));
    
    // Record activity
    recordAdminActivity('Changed admin password');
    
    alert('Password changed successfully!');
}

// Check password strength
function checkPasswordStrength() {
    const password = document.getElementById('newPassword').value;
    const strengthBar = document.querySelector('.password-strength-bar');
    const strengthContainer = document.querySelector('.password-strength');
    
    if (!strengthBar) return;
    
    let strength = 0;
    
    // Length check
    if (password.length >= 8) strength += 1;
    
    // Contains lowercase
    if (/[a-z]/.test(password)) strength += 1;
    
    // Contains uppercase
    if (/[A-Z]/.test(password)) strength += 1;
    
    // Contains numbers
    if (/[0-9]/.test(password)) strength += 1;
    
    // Contains special characters
    if (/[^A-Za-z0-9]/.test(password)) strength += 1;
    
    // Update strength indicator
    strengthContainer.className = 'password-strength';
    if (password.length > 0) {
        if (strength <= 2) {
            strengthContainer.classList.add('weak');
        } else if (strength <= 4) {
            strengthContainer.classList.add('medium');
        } else {
            strengthContainer.classList.add('strong');
        }
    }
}

// Send broadcast from profile
function sendBroadcastFromProfile() {
    const subject = document.getElementById('broadcastSubject').value.trim();
    const content = document.getElementById('broadcastMessage').value.trim();
    
    if (!subject || !content) {
        alert('Please fill in all required fields');
        return;
    }
    
    const currentUser = JSON.parse(localStorage.getItem('currentUser'));
    const members = JSON.parse(localStorage.getItem('members') || '[]');
    const messages = JSON.parse(localStorage.getItem('messages') || '[]');
    
    // Get all approved members (including absent/inactive ones)
    const activeMembers = members.filter(m => m.status === 'approved');
    
    let broadcastCount = 0;
    
    // Create broadcast messages for each member
    activeMembers.forEach(member => {
        const broadcastMessage = {
            id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
            senderId: 'admin',
            senderName: currentUser.name,
            receiverId: member.id,
            receiverName: member.name,
            subject: subject,
            content: content,
            timestamp: new Date().toISOString(),
            read: false,
            isAdmin: true,
            isBroadcast: true
        };
        
        messages.push(broadcastMessage);
        broadcastCount++;
    });
    
    localStorage.setItem('messages', JSON.stringify(messages));
    
    // Close modal and reset form
    const modal = bootstrap.Modal.getInstance(document.getElementById('broadcastModal'));
    modal.hide();
    document.getElementById('broadcastForm').reset();
    
    // Update system statistics
    loadSystemStatistics();
    
    // Record activity
    recordAdminActivity(`Sent broadcast message to ${broadcastCount} members: ${subject}`);
    
    alert(`Broadcast message sent successfully to ${broadcastCount} members!`);
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
    
    // Refresh activity timeline
    loadRecentActivity();
}