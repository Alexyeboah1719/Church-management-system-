// Profile functionality
document.addEventListener('DOMContentLoaded', function() {
    // Wait for Supabase to be ready
    if (window.supabaseReady) {
        initProfile();
    } else {
        window.addEventListener('supabaseReady', initProfile);
    }
});

function initProfile() {
    // Check if user is logged in
    checkAuth();
    
    // Initialize profile page
    initializeProfilePage();
    
    // Setup event listeners
    setupProfileEventListeners();
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

// Initialize profile page
function initializeProfilePage() {
    loadProfileData();
    loadAttendanceHistory();
    loadProfileTasks();
}

// Setup event listeners
function setupProfileEventListeners() {
    // Sidebar toggle
    document.getElementById('menuToggle').addEventListener('click', toggleSidebar);
    document.getElementById('sidebarToggle').addEventListener('click', toggleSidebar);
    
    // Logout
    document.getElementById('logoutBtn').addEventListener('click', function() {
        localStorage.removeItem('currentUser');
        window.location.href = 'index.html';
    });
    
    // Save profile changes
    document.getElementById('saveProfileBtn').addEventListener('click', saveProfileChanges);
    
    // When edit modal opens, populate with current data
    const editModal = document.getElementById('editProfileModal');
    editModal.addEventListener('show.bs.modal', populateEditForm);
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
async function loadProfileData() {
    const currentUser = JSON.parse(localStorage.getItem('currentUser'));
    
    try {
        const membersResult = await window.supabaseDB.getMembers();
        const members = membersResult.success ? membersResult.data : [];
        const member = members.find(m => m.id === currentUser.id);
        
        if (!member) {
            alert('Member profile not found');
            return;
        }
        
        // Update profile information
        document.getElementById('profileName').textContent = member.name;
        document.getElementById('profileEmail').textContent = member.email;
        document.getElementById('profilePhone').textContent = member.phone;
        document.getElementById('profileLocation').textContent = member.location || 'Not specified';
        document.getElementById('profileDateOfBirth').textContent = member.date_of_birth || member.dateOfBirth ? formatDate(member.date_of_birth || member.dateOfBirth) : 'Not specified';
        document.getElementById('profileDateJoined').textContent = formatDate(member.date_joined || member.dateJoined || member.created_at);
        document.getElementById('profileStatus').textContent = member.active ? 'Active' : 'Inactive';
        document.getElementById('profileStatus').className = `badge ${member.active ? 'badge-active' : 'badge-inactive'}`;
        
        // Load roles
        loadProfileRoles(member.roles || []);
        
        // Calculate attendance statistics
        await calculateAttendanceStats(currentUser.id);
    } catch (error) {
        console.error('Error loading profile data:', error);
    }
}

// Load profile roles
function loadProfileRoles(roles) {
    const rolesContainer = document.getElementById('profileRoles');
    
    if (!roles || roles.length === 0) {
        rolesContainer.innerHTML = `
            <p class="text-muted">No roles assigned yet.</p>
        `;
        return;
    }
    
    rolesContainer.innerHTML = roles.map(role => `
        <span class="badge bg-warning text-dark role-badge">
            <i class="fas fa-user-tag me-1"></i>${role}
        </span>
    `).join('');
}

// Calculate attendance statistics
async function calculateAttendanceStats(memberId) {
    try {
        const eventsResult = await window.supabaseDB.getEvents();
        const events = eventsResult.success ? eventsResult.data : [];
        
        const attendanceResult = await window.supabaseDB.getAttendance();
        const attendance = attendanceResult.success ? attendanceResult.data : [];
        
        // Get past events
        const pastEvents = events.filter(event => new Date(event.event_date || event.date) < new Date().setHours(0, 0, 0, 0));
        const totalEvents = pastEvents.length;
        
        // Get attended events
        const attendedEvents = attendance.filter(a => a.member_id === memberId);
        const eventsAttended = attendedEvents.length;
        
        // Calculate percentage
        const attendancePercentage = totalEvents > 0 ? Math.round((eventsAttended / totalEvents) * 100) : 0;
        
        // Update UI
        document.getElementById('attendancePercentage').textContent = `${attendancePercentage}%`;
        document.getElementById('eventsAttended').textContent = eventsAttended;
        document.getElementById('totalEvents').textContent = totalEvents;
        
        // Update progress bar (if exists)
        const progressBar = document.querySelector('.progress-bar');
        if (progressBar) {
            progressBar.style.width = `${attendancePercentage}%`;
        }
    } catch (error) {
        console.error('Error calculating attendance stats:', error);
    }
}

// Load attendance history
async function loadAttendanceHistory() {
    const currentUser = JSON.parse(localStorage.getItem('currentUser'));
    
    try {
        const eventsResult = await window.supabaseDB.getEvents();
        const events = eventsResult.success ? eventsResult.data : [];
        
        const attendanceResult = await window.supabaseDB.getAttendance();
        const attendance = attendanceResult.success ? attendanceResult.data : [];
        
        // Get user's attendance records
        const userAttendance = attendance.filter(a => a.member_id === currentUser.id);
        
        // Create attendance history with event details
        const attendanceHistory = userAttendance.map(record => {
            const event = events.find(e => e.id === record.event_id);
            return {
                event: event ? event.title : 'Unknown Event',
                date: event ? (event.event_date || event.date) : (record.attendance_date || record.date),
                venue: event ? event.venue : 'Unknown Venue',
                status: 'Present'
            };
        }).sort((a, b) => new Date(b.date) - new Date(a.date));
        
        displayAttendanceHistory(attendanceHistory);
    } catch (error) {
        console.error('Error loading attendance history:', error);
    }
}

// Display attendance history
function displayAttendanceHistory(history) {
    const historyContainer = document.getElementById('attendanceHistory');
    
    if (history.length === 0) {
        historyContainer.innerHTML = `
            <tr>
                <td colspan="4" class="text-center text-muted py-3">
                    <i class="fas fa-calendar-times fa-2x mb-2 d-block"></i>
                    No attendance records found
                </td>
            </tr>
        `;
        return;
    }
    
    historyContainer.innerHTML = history.map(record => `
        <tr>
            <td>${record.event}</td>
            <td>${formatDate(record.date)}</td>
            <td>${record.venue}</td>
            <td>
                <span class="badge badge-present">${record.status}</span>
            </td>
        </tr>
    `).join('');
}

// Load profile tasks
async function loadProfileTasks() {
    const currentUser = JSON.parse(localStorage.getItem('currentUser'));
    
    try {
        const tasksResult = await window.supabaseDB.getTasks();
        const tasks = tasksResult.success ? tasksResult.data : [];
        
        // Get user's recent tasks (limit to 5)
        const userTasks = tasks
            .filter(task => task.assigned_to === currentUser.id)
            .sort((a, b) => new Date(b.assigned_date || b.assignedDate || b.created_at) - new Date(a.assigned_date || a.assignedDate || a.created_at))
            .slice(0, 5);
        
        displayProfileTasks(userTasks);
    } catch (error) {
        console.error('Error loading profile tasks:', error);
    }
}

// Display profile tasks
function displayProfileTasks(tasks) {
    const tasksContainer = document.getElementById('profileTasks');
    
    if (tasks.length === 0) {
        tasksContainer.innerHTML = `
            <p class="text-muted">No tasks assigned yet.</p>
        `;
        return;
    }
    
    tasksContainer.innerHTML = tasks.map(task => {
        const taskDueDate = new Date(task.due_date || task.dueDate);
        const isOverdue = taskDueDate < new Date().setHours(0, 0, 0, 0) && task.status !== 'completed';
        
        return `
            <div class="task-item">
                <div class="task-title">${task.title}</div>
                <div class="task-meta">
                    <span class="me-3">
                        <i class="fas fa-flag me-1"></i>
                        <span class="badge ${getStatusBadgeClass(task.status)}">
                            ${task.status.charAt(0).toUpperCase() + task.status.slice(1)}
                        </span>
                    </span>
                    <span class="${isOverdue ? 'text-danger' : 'text-muted'}">
                        <i class="fas fa-clock me-1"></i>
                        Due: ${formatDate(task.due_date || task.dueDate)}
                    </span>
                </div>
                ${task.status === 'in-progress' && task.progress ? `
                    <div class="mt-2">
                        <div class="progress">
                            <div class="progress-bar" style="width: ${task.progress}%"></div>
                        </div>
                        <small class="text-muted">${task.progress}% complete</small>
                    </div>
                ` : ''}
            </div>
        `;
    }).join('');
}

// Helper function to get status badge class
function getStatusBadgeClass(status) {
    switch (status) {
        case 'pending': return 'bg-warning';
        case 'in-progress': return 'bg-info';
        case 'completed': return 'bg-success';
        default: return 'bg-secondary';
    }
}

// Helper function to format date
function formatDate(dateString) {
    const options = { year: 'numeric', month: 'short', day: 'numeric' };
    return new Date(dateString).toLocaleDateString(undefined, options);
}

// Populate edit form with current member data
async function populateEditForm() {
    const currentUser = JSON.parse(localStorage.getItem('currentUser'));
    
    try {
        const membersResult = await window.supabaseDB.getMembers();
        const members = membersResult.success ? membersResult.data : [];
        const member = members.find(m => m.id === currentUser.id);
        
        if (!member) {
            alert('Member profile not found');
            return;
        }
        
        // Populate form fields
        document.getElementById('editName').value = member.name;
        document.getElementById('editEmail').value = member.email;
        document.getElementById('editPhone').value = member.phone;
        document.getElementById('editLocation').value = member.location || '';
        document.getElementById('editDateOfBirth').value = member.date_of_birth || member.dateOfBirth || '';
    } catch (error) {
        console.error('Error populating edit form:', error);
    }
}

// Save profile changes
async function saveProfileChanges() {
    const currentUser = JSON.parse(localStorage.getItem('currentUser'));
    
    // Get form values
    const name = document.getElementById('editName').value.trim();
    const email = document.getElementById('editEmail').value.trim().toLowerCase();
    const phone = document.getElementById('editPhone').value.trim();
    const location = document.getElementById('editLocation').value.trim();
    const dateOfBirth = document.getElementById('editDateOfBirth').value;
    
    // Validate required fields
    if (!name || !email || !phone || !location || !dateOfBirth) {
        alert('Please fill in all required fields');
        return;
    }
    
    try {
        // Update member data in Supabase
        const updates = {
            name: name,
            email: email,
            phone: phone,
            location: location,
            date_of_birth: dateOfBirth
        };
        
        const result = await window.supabaseDB.updateMember(currentUser.id, updates);
        
        if (result.success) {
            // Update current user session
            currentUser.name = name;
            currentUser.email = email;
            currentUser.phone = phone;
            localStorage.setItem('currentUser', JSON.stringify(currentUser));
            
            // Close modal
            const modal = bootstrap.Modal.getInstance(document.getElementById('editProfileModal'));
            modal.hide();
            
            // Reload profile data
            await loadProfileData();
            
            // Update username in header
            document.getElementById('userName').textContent = name;
            
            alert('Profile updated successfully!');
        } else {
            alert('Error updating profile: ' + result.error);
        }
    } catch (error) {
        console.error('Error saving profile changes:', error);
        alert('An error occurred while updating profile. Please try again.');
    }
}