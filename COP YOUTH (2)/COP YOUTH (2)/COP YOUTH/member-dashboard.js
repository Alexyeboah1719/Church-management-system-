// Member Dashboard functionality
document.addEventListener('DOMContentLoaded', function() {
    // Wait for Supabase to be ready
    if (window.supabaseReady) {
        initMemberDashboard();
    } else {
        window.addEventListener('supabaseReady', initMemberDashboard);
    }
});

function initMemberDashboard() {
    // Check if user is logged in
    checkAuth();
    
    // Initialize dashboard
    initializeDashboard();
    
    // Setup event listeners
    setupDashboardEventListeners();
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

// Initialize dashboard data
function initializeDashboard() {
    loadDashboardStats();
    loadUpcomingEvents();
    loadRecentAnnouncements();
    loadMyTasks();
}

// Setup event listeners
function setupDashboardEventListeners() {
    // Sidebar toggle
    document.getElementById('menuToggle').addEventListener('click', toggleSidebar);
    document.getElementById('sidebarToggle').addEventListener('click', toggleSidebar);
    
    // Logout
    document.getElementById('logoutBtn').addEventListener('click', function() {
        localStorage.removeItem('currentUser');
        window.location.href = 'index.html';
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

// Load dashboard statistics
async function loadDashboardStats() {
    const currentUser = JSON.parse(localStorage.getItem('currentUser'));
    
    try {
        // Count upcoming events
        const eventsResult = await window.supabaseDB.getEvents();
        const events = eventsResult.success ? eventsResult.data : [];
        const upcomingEvents = events.filter(event => 
            new Date(event.event_date || event.date) >= new Date().setHours(0, 0, 0, 0)
        );
        document.getElementById('eventsCount').textContent = upcomingEvents.length;
        
        // Count user's tasks
        const tasksResult = await window.supabaseDB.getTasks();
        const tasks = tasksResult.success ? tasksResult.data : [];
        const userTasks = tasks.filter(task => 
            task.assigned_to === currentUser.id && task.status !== 'completed'
        );
        document.getElementById('tasksCount').textContent = userTasks.length;
        
        // Calculate attendance percentage
        const attendanceResult = await window.supabaseDB.getAttendance();
        const attendance = attendanceResult.success ? attendanceResult.data : [];
        const userAttendance = attendance.filter(a => 
            a.member_id === currentUser.id
        );
        
        const totalEvents = events.filter(event => 
            new Date(event.event_date || event.date) < new Date().setHours(0, 0, 0, 0)
        ).length;
        
        const attendedEvents = userAttendance.length;
        const attendancePercentage = totalEvents > 0 ? 
            Math.round((attendedEvents / totalEvents) * 100) : 0;
        
        document.getElementById('attendancePercentage').textContent = `${attendancePercentage}%`;
        
        // Count announcements
        const announcementsResult = await window.supabaseDB.getAnnouncements();
        const announcements = announcementsResult.success ? announcementsResult.data : [];
        const recentAnnouncements = announcements.filter(announcement => 
            new Date(announcement.date || announcement.created_at) >= new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
        );
        document.getElementById('announcementsCount').textContent = recentAnnouncements.length;
    } catch (error) {
        console.error('Error loading dashboard stats:', error);
    }
}

// Load upcoming events
async function loadUpcomingEvents() {
    try {
        const eventsResult = await window.supabaseDB.getEvents();
        const events = eventsResult.success ? eventsResult.data : [];
        const upcomingEvents = events
            .filter(event => new Date(event.event_date || event.date) >= new Date().setHours(0, 0, 0, 0))
            .slice(0, 5);
        
        const eventsList = document.getElementById('upcomingEventsList');
        
        if (upcomingEvents.length === 0) {
            eventsList.innerHTML = '<p class="text-muted">No upcoming events</p>';
            return;
        }
        
        eventsList.innerHTML = upcomingEvents.map(event => `
            <div class="mb-3 pb-2 border-bottom">
                <h6 class="mb-1">${event.title}</h6>
                <p class="mb-1 text-muted small">
                    <i class="fas fa-calendar me-1"></i>${formatDate(event.event_date || event.date)}
                    <i class="fas fa-clock ms-2 me-1"></i>${event.event_time || event.time}
                </p>
                <p class="mb-0 text-muted small">
                    <i class="fas fa-map-marker-alt me-1"></i>${event.venue}
                </p>
            </div>
        `).join('');
    } catch (error) {
        console.error('Error loading upcoming events:', error);
    }
}

// Load recent announcements
async function loadRecentAnnouncements() {
    try {
        const announcementsResult = await window.supabaseDB.getAnnouncements();
        const announcements = announcementsResult.success ? announcementsResult.data : [];
        const recentAnnouncements = announcements
            .sort((a, b) => new Date(b.date || b.created_at) - new Date(a.date || a.created_at))
            .slice(0, 5);
        
        const announcementsList = document.getElementById('recentAnnouncementsList');
        
        if (recentAnnouncements.length === 0) {
            announcementsList.innerHTML = '<p class="text-muted">No announcements</p>';
            return;
        }
        
        announcementsList.innerHTML = recentAnnouncements.map(announcement => `
            <div class="mb-3 pb-2 border-bottom">
                <h6 class="mb-1">${announcement.title}</h6>
                <p class="mb-1 small">${announcement.content.substring(0, 100)}...</p>
                <p class="mb-0 text-muted small">
                    <i class="fas fa-calendar me-1"></i>${formatDate(announcement.date || announcement.created_at)}
                </p>
            </div>
        `).join('');
    } catch (error) {
        console.error('Error loading recent announcements:', error);
    }
}

// Load user's tasks
async function loadMyTasks() {
    const currentUser = JSON.parse(localStorage.getItem('currentUser'));
    
    try {
        const tasksResult = await window.supabaseDB.getTasks();
        const tasks = tasksResult.success ? tasksResult.data : [];
        const userTasks = tasks
            .filter(task => task.assigned_to === currentUser.id)
            .slice(0, 5);
        
        const tasksList = document.getElementById('myTasksList');
        
        if (userTasks.length === 0) {
            tasksList.innerHTML = '<p class="text-muted">No tasks assigned</p>';
            return;
        }
        
        tasksList.innerHTML = userTasks.map(task => `
            <div class="mb-3 pb-2 border-bottom">
                <div class="d-flex justify-content-between align-items-start">
                    <div>
                        <h6 class="mb-1">${task.title}</h6>
                        <p class="mb-1 text-muted small">${task.description}</p>
                        <p class="mb-0 text-muted small">
                            <i class="fas fa-calendar me-1"></i>${formatDate(task.due_date || task.dueDate)}
                        </p>
                    </div>
                    <span class="badge ${getTaskStatusBadge(task.status)}">${task.status}</span>
                </div>
            </div>
        `).join('');
    } catch (error) {
        console.error('Error loading tasks:', error);
    }
}

// Helper function to format date
function formatDate(dateString) {
    const options = { year: 'numeric', month: 'short', day: 'numeric' };
    return new Date(dateString).toLocaleDateString(undefined, options);
}

// Helper function to get task status badge class
function getTaskStatusBadge(status) {
    switch (status) {
        case 'pending': return 'bg-warning';
        case 'in-progress': return 'bg-info';
        case 'completed': return 'bg-success';
        default: return 'bg-secondary';
    }
}