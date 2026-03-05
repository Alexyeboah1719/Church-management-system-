// Admin Dashboard functionality
document.addEventListener('DOMContentLoaded', function () {
    // Wait for Supabase to be ready
    if (window.supabaseReady) {
        initializeDashboard();
    } else {
        window.addEventListener('supabaseReady', initializeDashboard);
    }
});

// Auto-refresh when page becomes visible
document.addEventListener('visibilitychange', function () {
    if (!document.hidden) {
        console.log('Page became visible, refreshing dashboard...');
        if (window.supabaseReady) {
            loadAdminStats();
            loadPendingApprovals();
            loadRecentActivities();
        }
    }
});

// Also refresh when window gains focus
window.addEventListener('focus', function () {
    console.log('Window gained focus, refreshing dashboard...');
    if (window.supabaseReady) {
        loadAdminStats();
    }
});

function initializeDashboard() {
    // Check if admin is logged in
    checkAdminAuth();

    // Initialize dashboard
    initializeAdminDashboard();

    // Setup event listeners
    setupAdminEventListeners();
}

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

// Initialize admin dashboard data
function initializeAdminDashboard() {
    loadAdminStats();
    loadPendingApprovals();
    loadRecentActivities();
    loadAllCredentials();
    initializeAttendanceModal();
}

// Setup admin event listeners
function setupAdminEventListeners() {
    // Sidebar toggle
    document.getElementById('menuToggle').addEventListener('click', toggleSidebar);
    document.getElementById('sidebarToggle').addEventListener('click', toggleSidebar);

    // Logout
    document.getElementById('logoutBtn').addEventListener('click', function () {
        localStorage.removeItem('currentUser');
        window.location.href = 'auth.html?admin=true';
    });

    // Attendance modal
    document.getElementById('attendanceEvent').addEventListener('change', loadMembersForAttendance);
    document.getElementById('saveAttendance').addEventListener('click', saveAttendance);

    // Reports modal
    document.getElementById('reportType').addEventListener('change', handleReportTypeChange);
    document.getElementById('generateReport').addEventListener('click', generatePDFReport);

    // Load events for attendance report when modal opens
    const reportsModal = document.getElementById('reportsModal');
    if (reportsModal) {
        reportsModal.addEventListener('show.bs.modal', function () {
            loadEventsForAttendanceReport();
        });
    }
}

// Toggle sidebar on mobile
function toggleSidebar() {
    const sidebar = document.querySelector('.sidebar');
    sidebar.classList.toggle('show');

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

// Load admin dashboard statistics
async function loadAdminStats() {
    try {
        console.log('📊 Loading admin stats...');

        // Show loading indicators
        const loadingHTML = '<i class="fas fa-spinner fa-spin"></i>';
        document.getElementById('totalMembers').innerHTML = loadingHTML;
        document.getElementById('pendingApprovals').innerHTML = loadingHTML;
        document.getElementById('upcomingEventsCount').innerHTML = loadingHTML;
        document.getElementById('unreadMessages').innerHTML = loadingHTML;

        // Get members with error handling
        let members = [];
        try {
            console.log('Fetching members...');
            const membersResult = await window.supabaseDB.getMembers();
            console.log('Members result:', membersResult);

            if (membersResult.success) {
                members = membersResult.data || [];
                const approvedMembers = members.filter(m => m.status === 'approved');
                const pendingMembers = members.filter(m => m.status === 'pending');
                const rejectedMembers = members.filter(m => m.status === 'rejected');

                document.getElementById('totalMembers').textContent = approvedMembers.length;
                document.getElementById('pendingApprovals').textContent = pendingMembers.length;
                document.getElementById('pendingCount').textContent = pendingMembers.length;

                // Update summary if elements exist
                const summaryRegistered = document.getElementById('summaryRegistered');
                const summaryActive = document.getElementById('summaryActive');
                const summaryPending = document.getElementById('summaryPending');
                const summaryRejected = document.getElementById('summaryRejected');

                if (summaryRegistered) summaryRegistered.textContent = members.length;
                if (summaryActive) summaryActive.textContent = approvedMembers.length;
                if (summaryPending) summaryPending.textContent = pendingMembers.length;
                if (summaryRejected) summaryRejected.textContent = rejectedMembers.length;

                console.log('✅ Members loaded:', {
                    total: members.length,
                    approved: approvedMembers.length,
                    pending: pendingMembers.length
                });
            } else {
                throw new Error(membersResult.error);
            }
        } catch (error) {
            console.error('❌ Failed to load members:', error);
            document.getElementById('totalMembers').textContent = '0';
            document.getElementById('pendingApprovals').textContent = '0';
            document.getElementById('pendingCount').textContent = '0';
        }

        // Get events with error handling
        let events = [];
        try {
            console.log('Fetching events...');
            const eventsResult = await window.supabaseDB.getEvents();
            console.log('Events result:', eventsResult);

            if (eventsResult.success) {
                events = eventsResult.data || [];
                const today = new Date();
                today.setHours(0, 0, 0, 0);

                const upcomingEvents = events.filter(event => {
                    const eventDate = new Date(event.event_date || event.date);
                    return eventDate >= today;
                });

                document.getElementById('upcomingEventsCount').textContent = upcomingEvents.length;

                console.log('✅ Events loaded:', {
                    total: events.length,
                    upcoming: upcomingEvents.length
                });
            } else {
                throw new Error(eventsResult.error);
            }
        } catch (error) {
            console.error('❌ Failed to load events:', error);
            document.getElementById('upcomingEventsCount').textContent = '0';
        }

        // Get messages with error handling
        try {
            console.log('Fetching messages...');
            const messagesResult = await window.supabaseDB.getMessages();
            console.log('Messages result:', messagesResult);

            if (messagesResult.success) {
                const messages = messagesResult.data || [];
                const unreadMessages = messages.filter(m => !m.read && !m.is_admin);

                document.getElementById('unreadMessages').textContent = unreadMessages.length;
                document.getElementById('unreadMessagesCount').textContent = unreadMessages.length;

                console.log('✅ Messages loaded:', {
                    total: messages.length,
                    unread: unreadMessages.length
                });
            } else {
                throw new Error(messagesResult.error);
            }
        } catch (error) {
            console.error('❌ Failed to load messages:', error);
            document.getElementById('unreadMessages').textContent = '0';
            document.getElementById('unreadMessagesCount').textContent = '0';
        }

        console.log('✅ Dashboard stats loading complete');
    } catch (error) {
        console.error('❌ Critical error loading admin stats:', error);
    }
}

// Load pending member approvals
async function loadPendingApprovals() {
    try {
        const membersResult = await window.supabaseDB.getMembers();
        const members = membersResult.success ? membersResult.data : [];
        const pendingMembers = members.filter(m => m.status === 'pending');

        const approvalsList = document.getElementById('pendingApprovalsList');

        if (pendingMembers.length === 0) {
            approvalsList.innerHTML = '<p class="text-muted">No pending approvals</p>';
            return;
        }

        approvalsList.innerHTML = pendingMembers.map(member => `
            <div class="member-approval-item border-bottom pb-3 mb-3">
                <div class="d-flex justify-content-between align-items-start">
                    <div>
                        <h6 class="mb-1"><strong>${member.name}</strong></h6>
                        <p class="mb-1 text-muted small">
                            <i class="fas fa-envelope me-1"></i>${member.email}
                        </p>
                        <p class="mb-1 text-muted small">
                            <i class="fas fa-phone me-1"></i>${member.phone || 'No phone'}
                        </p>
                        ${member.location ? `
                        <p class="mb-1 text-muted small">
                            <i class="fas fa-map-marker-alt me-1"></i>${member.location}
                        </p>
                        ` : ''}
                        ${member.date_of_birth ? `
                        <p class="mb-1 text-muted small">
                            <i class="fas fa-birthday-cake me-1"></i>${formatDate(member.date_of_birth)} (Age: ${calculateAge(member.date_of_birth)})
                        </p>
                        ` : ''}
                        <p class="mb-0 text-muted small">
                            <i class="fas fa-calendar me-1"></i>Registered: ${formatDate(member.date_joined || member.created_at)}
                        </p>
                    </div>
                    <div class="btn-group">
                        <button class="btn btn-sm btn-success" onclick="approveMember('${member.id}')">
                            <i class="fas fa-check"></i> Approve
                        </button>
                        <button class="btn btn-sm btn-danger" onclick="rejectMember('${member.id}')">
                            <i class="fas fa-times"></i> Reject
                        </button>
                    </div>
                </div>
            </div>
        `).join('');
    } catch (error) {
        console.error('Error loading pending approvals:', error);
    }
}

// Load recent activities
async function loadRecentActivities() {
    try {
        const activitiesResult = await window.supabaseDB.getAdminActivities();
        const activities = activitiesResult.success ? activitiesResult.data : [];
        const recentActivities = activities.slice(0, 5);

        const activitiesList = document.getElementById('recentActivitiesList');

        if (recentActivities.length === 0) {
            activitiesList.innerHTML = '<p class="text-muted">No recent activities</p>';
            return;
        }

        activitiesList.innerHTML = recentActivities.map(activity => `
            <div class="mb-3 pb-2 border-bottom">
                <p class="mb-1">${activity.description}</p>
                <p class="mb-0 text-muted small">
                    <i class="fas fa-clock me-1"></i>${formatDateTime(activity.created_at || activity.timestamp)}</p>
            </div>
        `).join('');
    } catch (error) {
        console.error('Error loading recent activities:', error);
    }
}

// Initialize attendance modal
async function initializeAttendanceModal() {
    try {
        const eventSelect = document.getElementById('attendanceEvent');
        if (!eventSelect) {
            console.warn('Attendance event select element not found');
            return;
        }

        const eventsResult = await window.supabaseDB.getEvents();
        const events = eventsResult.success ? eventsResult.data : [];
        const upcomingEvents = events.filter(event =>
            new Date(event.event_date || event.date) >= new Date().setHours(0, 0, 0, 0)
        );

        eventSelect.innerHTML = '<option value="">Choose an event...</option>' +
            upcomingEvents.map(event => `
                <option value="${event.id}">${event.title} - ${formatDate(event.event_date || event.date)}</option>
            `).join('');
    } catch (error) {
        console.error('Error initializing attendance modal:', error);
    }
}

// Load members for attendance marking with enhanced UI
async function loadMembersForAttendance() {
    const eventId = document.getElementById('attendanceEvent')?.value;
    const membersList = document.getElementById('membersAttendanceList');

    if (!membersList) {
        console.warn('Members attendance list element not found');
        return;
    }

    if (!eventId) {
        membersList.innerHTML = '<p class="text-muted">Please select an event first</p>';
        updateAttendanceSummary();
        return;
    }

    try {
        const membersResult = await window.supabaseDB.getMembers();
        const members = membersResult.success ? membersResult.data : [];
        const approvedMembers = members.filter(m => m.status === 'approved' && m.active);

        // CACHE MEMBERS DATA FOR SMS FUNCTION
        window.cachedMembersData = approvedMembers;
        console.log('✅ Cached members data for SMS:', approvedMembers.length);

        // Get existing attendance for this event
        const attendanceResult = await window.supabaseDB.getAttendance();
        const attendance = attendanceResult.success ? attendanceResult.data : [];
        const eventAttendance = attendance.filter(a => a.event_id === eventId);

        const membersList = document.getElementById('membersAttendanceList');

        if (approvedMembers.length === 0) {
            membersList.innerHTML = '<p class="text-muted">No approved members found</p>';
            updateAttendanceSummary();
            return;
        }

        membersList.innerHTML = approvedMembers.map(member => {
            const isPresent = eventAttendance.some(a => a.member_id === member.id);
            return `
                <div class="form-check mb-2 p-2 border rounded">
                    <input class="form-check-input attendance-checkbox" type="checkbox" 
                           id="member-${member.id}" value="${member.id}" 
                           data-member-name="${member.name}"
                           data-member-phone="${member.phone || ''}"
                           data-member-email="${member.email || ''}"
                           ${isPresent ? 'checked' : ''}
                           onchange="updateAttendanceSummary()">
                    <label class="form-check-label w-100" for="member-${member.id}">
                        <strong>${member.name}</strong>
                        <br><small class="text-muted">${member.email} | ${member.phone || 'No phone'}</small>
                    </label>
                </div>
            `;
        }).join('');

        updateAttendanceSummary();
    } catch (error) {
        console.error('Error loading members for attendance:', error);
    }
}

// Update attendance summary in real-time
function updateAttendanceSummary() {
    const checkboxes = document.querySelectorAll('.attendance-checkbox');
    const totalMembers = checkboxes.length;
    const presentMembers = Array.from(checkboxes).filter(cb => cb.checked);
    const absentMembers = Array.from(checkboxes).filter(cb => !cb.checked);

    document.getElementById('presentCount').textContent = presentMembers.length;
    document.getElementById('absentCount').textContent = absentMembers.length;

    // Enable/disable SMS button based on absent members
    const sendSMSBtn = document.getElementById('sendAbsentSMS');
    if (sendSMSBtn) {
        sendSMSBtn.disabled = absentMembers.length === 0;
    }

    const summaryDiv = document.getElementById('attendanceSummary');
    if (totalMembers === 0) {
        summaryDiv.innerHTML = '<p class="text-muted">No members to track</p>';
    } else {
        const attendanceRate = totalMembers > 0 ? ((presentMembers.length / totalMembers) * 100).toFixed(1) : 0;
        summaryDiv.innerHTML = `
            <div class="row text-center">
                <div class="col-4">
                    <h3 class="text-primary">${totalMembers}</h3>
                    <small class="text-muted">Total</small>
                </div>
                <div class="col-4">
                    <h3 class="text-success">${presentMembers.length}</h3>
                    <small class="text-muted">Present</small>
                </div>
                <div class="col-4">
                    <h3 class="text-danger">${absentMembers.length}</h3>
                    <small class="text-muted">Absent</small>
                </div>
            </div>
            <div class="mt-3">
                <div class="progress" style="height: 25px;">
                    <div class="progress-bar bg-success" role="progressbar" 
                         style="width: ${attendanceRate}%" 
                         aria-valuenow="${attendanceRate}" aria-valuemin="0" aria-valuemax="100">
                        ${attendanceRate}%
                    </div>
                </div>
                <p class="text-center mt-2 mb-0">
                    <strong>Attendance Rate: ${attendanceRate}%</strong>
                </p>
            </div>
        `;
    }

    const presentList = document.getElementById('presentMembersList');
    if (presentMembers.length === 0) {
        presentList.innerHTML = '<p class="text-muted small mb-0">No members marked present yet</p>';
    } else {
        presentList.innerHTML = presentMembers.map(cb => `
            <div class="badge bg-success me-1 mb-1">${cb.dataset.memberName}</div>
        `).join('');
    }

    const absentList = document.getElementById('absentMembersList');
    if (absentMembers.length === 0) {
        absentList.innerHTML = '<p class="text-muted small mb-0">All members are present!</p>';
    } else {
        absentList.innerHTML = absentMembers.map(cb => `
            <div class="badge bg-danger me-1 mb-1">${cb.dataset.memberName}</div>
        `).join('');
    }
}

// Select all members
function selectAllMembers() {
    document.querySelectorAll('.attendance-checkbox').forEach(checkbox => {
        checkbox.checked = true;
    });
    updateAttendanceSummary();
}

// Deselect all members
function deselectAllMembers() {
    document.querySelectorAll('.attendance-checkbox').forEach(checkbox => {
        checkbox.checked = false;
    });
    updateAttendanceSummary();
}

// Save attendance
async function saveAttendance() {
    const eventId = document.getElementById('attendanceEvent').value;
    if (!eventId) {
        alert('Please select an event');
        return;
    }

    try {
        const eventsResult = await window.supabaseDB.getEvents();
        const events = eventsResult.success ? eventsResult.data : [];
        const event = events.find(e => e.id === eventId);

        if (!event) {
            alert('Selected event not found');
            return;
        }

        const checkedMembers = Array.from(document.querySelectorAll('#membersAttendanceList input:checked'))
            .map(checkbox => checkbox.value);

        const membersResult = await window.supabaseDB.getMembers();
        const members = membersResult.success ? membersResult.data : [];
        const approvedMembers = members.filter(m => m.status === 'approved' && m.active);
        const absentMembers = approvedMembers.filter(m => !checkedMembers.includes(m.id));

        // Mark attendance in Supabase
        await window.supabaseDB.markAttendance(eventId, checkedMembers);

        // Create detailed activity message
        const presentNames = checkedMembers.map(id => {
            const member = members.find(m => m.id === id);
            return member ? member.name : 'Unknown';
        }).join(', ');

        const absentNames = absentMembers.map(m => m.name).join(', ');

        await recordAdminActivity(
            `Attendance for "${event.title}": ${checkedMembers.length} present (${presentNames}), ` +
            `${absentMembers.length} absent${absentNames ? ' (' + absentNames + ')' : ''}`
        );

        alert(`Attendance saved!\n\nPresent: ${checkedMembers.length}\nAbsent: ${absentMembers.length}`);

        // Close modal
        const modal = bootstrap.Modal.getInstance(document.getElementById('attendanceModal'));
        modal.hide();

        // Reload dashboard
        loadRecentActivities();
    } catch (error) {
        console.error('Error saving attendance:', error);
        alert('Failed to save attendance. Please try again.');
    }
}

// Approve member
async function approveMember(memberId) {
    try {
        const result = await window.supabaseDB.updateMember(memberId, { status: 'approved' });

        if (result.success) {
            await recordAdminActivity(`Approved member: ${result.data.name}`);
            initializeAdminDashboard();
            alert('Member approved successfully!');
        } else {
            alert('Failed to approve member: ' + result.error);
        }
    } catch (error) {
        console.error('Error approving member:', error);
        alert('Failed to approve member. Please try again.');
    }
}

// Reject member
async function rejectMember(memberId) {
    if (!confirm('Are you sure you want to reject this member?')) {
        return;
    }

    try {
        // Get member name before deleting
        const membersResult = await window.supabaseDB.getMembers();
        const member = membersResult.data.find(m => m.id === memberId);
        const memberName = member ? member.name : 'Unknown';

        const result = await window.supabaseDB.deleteMember(memberId);

        if (result.success) {
            await recordAdminActivity(`Rejected member: ${memberName}`);
            initializeAdminDashboard();
            alert('Member rejected and removed from the system.');
        } else {
            alert('Failed to reject member: ' + result.error);
        }
    } catch (error) {
        console.error('Error rejecting member:', error);
        alert('Failed to reject member. Please try again.');
    }
}

// Record admin activity
async function recordAdminActivity(description) {
    try {
        await window.supabaseDB.logAdminActivity(description);
    } catch (error) {
        console.error('Error recording admin activity:', error);
    }
}

// Load all user credentials
async function loadAllCredentials() {
    const tableBody = document.getElementById('credentialsTableBody');

    if (!tableBody) return;

    try {
        const membersResult = await window.supabaseDB.getMembers();
        const members = membersResult.success ? membersResult.data : [];

        const adminResult = await window.supabaseDB.getAdminAccount();
        const adminAccount = adminResult.success ? adminResult.data : null;

        let html = '';

        if (adminAccount) {
            html += `
                <tr class="table-danger">
                    <td><strong>${adminAccount.name}</strong></td>
                    <td>${adminAccount.email}</td>
                    <td>
                        <span class="password-hidden" id="admin-pwd">••••••••</span>
                        <button class="btn btn-sm btn-outline-secondary ms-2" onclick="togglePassword('admin-pwd', '${adminAccount.password}')">
                            <i class="fas fa-eye"></i>
                        </button>
                    </td>
                    <td>N/A</td>
                    <td><span class="badge bg-danger">Active</span></td>
                    <td><span class="badge bg-dark">Admin</span></td>
                    <td>
                        <button class="btn btn-sm btn-primary" onclick="copyToClipboard('${adminAccount.email}', '${adminAccount.password}')">
                            <i class="fas fa-copy"></i> Copy
                        </button>
                    </td>
                </tr>
            `;
        }

        members.forEach((member, index) => {
            const statusClass = member.status === 'approved' ? 'success' :
                member.status === 'pending' ? 'warning' : 'secondary';
            const statusText = member.status.charAt(0).toUpperCase() + member.status.slice(1);

            html += `
                <tr>
                    <td>${member.name}</td>
                    <td>${member.email}</td>
                    <td>
                        <span class="password-hidden" id="pwd-${index}">••••••••</span>
                        <button class="btn btn-sm btn-outline-secondary ms-2" onclick="togglePassword('pwd-${index}', '${member.password}')">
                            <i class="fas fa-eye"></i>
                        </button>
                    </td>
                    <td>${member.phone || 'N/A'}</td>
                    <td><span class="badge bg-${statusClass}">${statusText}</span></td>
                    <td><span class="badge bg-primary">Member</span></td>
                    <td>
                        <button class="btn btn-sm btn-primary" onclick="copyToClipboard('${member.email}', '${member.password}')">
                            <i class="fas fa-copy"></i> Copy
                        </button>
                    </td>
                </tr>
            `;
        });

        if (members.length === 0) {
            html += `
                <tr>
                    <td colspan="7" class="text-center text-muted py-4">
                        Only admin account exists. No members registered yet.
                    </td>
                </tr>
            `;
        }

        tableBody.innerHTML = html;
    } catch (error) {
        console.error('Error loading credentials:', error);
    }
}

// Toggle password visibility
function togglePassword(elementId, password) {
    const element = document.getElementById(elementId);
    const button = element.nextElementSibling;
    const icon = button.querySelector('i');

    if (element.textContent === '••••••••') {
        element.textContent = password;
        icon.classList.remove('fa-eye');
        icon.classList.add('fa-eye-slash');
    } else {
        element.textContent = '••••••••';
        icon.classList.remove('fa-eye-slash');
        icon.classList.add('fa-eye');
    }
}

// Copy credentials to clipboard
function copyToClipboard(email, password) {
    const text = `Email: ${email}\nPassword: ${password}`;

    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();

    try {
        document.execCommand('copy');
        alert('Credentials copied to clipboard!');
    } catch (err) {
        alert('Failed to copy credentials');
    }

    document.body.removeChild(textarea);
}

// Export all credentials to CSV
function exportCredentials() {
    const members = JSON.parse(localStorage.getItem('members') || '[]');
    const adminAccount = JSON.parse(localStorage.getItem('adminAccount'));

    let csv = 'Name,Email,Password,Phone,Status,Type\n';
    csv += `"${adminAccount.name}","${adminAccount.email}","${adminAccount.password}","N/A","Active","Admin"\n`;

    members.forEach(member => {
        csv += `"${member.name}","${member.email}","${member.password}","${member.phone || 'N/A'}","${member.status}","Member"\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `user-credentials-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);

    alert('Credentials exported successfully!');
}

// Helper functions
function formatDate(dateString) {
    const options = { year: 'numeric', month: 'short', day: 'numeric' };
    return new Date(dateString).toLocaleDateString(undefined, options);
}

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

function calculateAge(dateOfBirth) {
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();

    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--;
    }

    return age;
}

// Refresh dashboard manually
function refreshDashboard() {
    console.log('Manually refreshing dashboard...');
    const refreshBtn = document.querySelector('button[onclick="refreshDashboard()"]');
    if (refreshBtn) {
        const icon = refreshBtn.querySelector('i');
        icon.classList.add('fa-spin');
    }

    initializeAdminDashboard();

    setTimeout(() => {
        if (refreshBtn) {
            const icon = refreshBtn.querySelector('i');
            icon.classList.remove('fa-spin');
        }
        alert('Dashboard refreshed!');
    }, 1000);
}

// Report functions
function handleReportTypeChange() {
    const reportType = document.getElementById('reportType').value;

    // Show/hide relevant filter sections
    const memberFilters = document.getElementById('memberFilters');
    const eventFilters = document.getElementById('eventFilters');
    const attendanceFilters = document.getElementById('attendanceFilters');

    // Hide all filters first
    if (memberFilters) memberFilters.classList.add('d-none');
    if (eventFilters) eventFilters.classList.add('d-none');
    if (attendanceFilters) attendanceFilters.classList.add('d-none');

    // Show relevant filters
    if (reportType === 'members' && memberFilters) {
        memberFilters.classList.remove('d-none');
    } else if (reportType === 'events' && eventFilters) {
        eventFilters.classList.remove('d-none');
    } else if (reportType === 'attendance' && attendanceFilters) {
        attendanceFilters.classList.remove('d-none');
    }
}

async function generatePDFReport() {
    const reportType = document.getElementById('reportType').value;

    if (!reportType) {
        alert('Please select a report type');
        return;
    }

    // Show loading state
    const generateBtn = document.getElementById('generateReport');
    const originalText = generateBtn.innerHTML;
    generateBtn.disabled = true;
    generateBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Generating PDF...';

    try {
        let success = false;

        switch (reportType) {
            case 'members':
                success = await generateMembersReportWithFilters();
                break;
            case 'events':
                success = await generateEventsReportWithFilters();
                break;
            case 'attendance':
                success = await generateAttendanceReportWithFilters();
                break;
            case 'comprehensive':
                success = await generateComprehensiveReportWithFilters();
                break;
            default:
                alert('Invalid report type selected');
        }

        if (success) {
            // Close modal
            const modal = bootstrap.Modal.getInstance(document.getElementById('reportsModal'));
            modal.hide();

            alert('Report generated successfully!');
        }
    } catch (error) {
        console.error('Error generating report:', error);
        alert('Error generating report. Please try again.');
    } finally {
        generateBtn.disabled = false;
        generateBtn.innerHTML = originalText;
    }
}

async function generateMembersReportWithFilters() {
    const filters = {
        status: document.getElementById('memberStatus')?.value || 'all',
        active: document.getElementById('memberActive')?.value || 'all',
        role: document.getElementById('memberRole')?.value || 'all',
        startDate: document.getElementById('reportStartDate')?.value || '',
        endDate: document.getElementById('reportEndDate')?.value || ''
    };

    return await window.reportGenerator.generateMembersReport(filters);
}

async function generateEventsReportWithFilters() {
    const filters = {
        type: document.getElementById('eventType')?.value || 'all',
        period: document.getElementById('eventPeriod')?.value || 'all',
        startDate: document.getElementById('reportStartDate')?.value || '',
        endDate: document.getElementById('reportEndDate')?.value || ''
    };

    return await window.reportGenerator.generateEventsReport(filters);
}

async function generateAttendanceReportWithFilters() {
    const filters = {
        eventId: document.getElementById('attendanceEventSelect')?.value || 'all',
        startDate: document.getElementById('reportStartDate')?.value || '',
        endDate: document.getElementById('reportEndDate')?.value || ''
    };

    return await window.reportGenerator.generateAttendanceReport(filters);
}

async function generateComprehensiveReportWithFilters() {
    const filters = {
        startDate: document.getElementById('reportStartDate')?.value || '',
        endDate: document.getElementById('reportEndDate')?.value || ''
    };

    return await window.reportGenerator.generateComprehensiveReport(filters);
}

// Load events for attendance report filter
async function loadEventsForAttendanceReport() {
    try {
        const eventsResult = await window.supabaseDB.getEvents();
        const events = eventsResult.success ? eventsResult.data : [];

        const eventSelect = document.getElementById('attendanceEventSelect');
        if (eventSelect) {
            eventSelect.innerHTML = '<option value="all">All Events (Summary)</option>' +
                events.map(event => `
                    <option value="${event.id}">${event.title} - ${formatDate(event.event_date || event.date)}</option>
                `).join('');
        }
    } catch (error) {
        console.error('Error loading events for report:', error);
    }
}


// Send SMS to absent members
async function sendSMSToAbsentMembers() {
    try {
        console.log('=== SMS TO ABSENT MEMBERS ===');

        const eventSelect = document.getElementById('attendanceEvent');
        if (!eventSelect) {
            alert('Event selector not found');
            return;
        }

        const eventId = eventSelect.value;
        if (!eventId) {
            alert('Please select an event first');
            return;
        }

        // Get event details from dropdown
        const selectedOption = eventSelect.options[eventSelect.selectedIndex];
        const eventText = selectedOption.text;
        const eventTitle = eventText.includes(' - ') ? eventText.split(' - ')[0] : eventText;
        const eventDateStr = eventText.includes(' - ') ? eventText.split(' - ')[1] : formatDate(new Date());

        const event = {
            id: eventId,
            title: eventTitle,
            event_date: eventDateStr
        };

        console.log('Event:', event);

        // Get absent members directly from checkboxes (NO DATABASE FETCH)
        const checkboxes = document.querySelectorAll('.attendance-checkbox');
        console.log('Total checkboxes:', checkboxes.length);

        if (checkboxes.length === 0) {
            alert('No members loaded. Please select an event first.');
            return;
        }

        const absentCheckboxes = Array.from(checkboxes).filter(cb => !cb.checked);
        console.log('Absent checkboxes:', absentCheckboxes.length);

        if (absentCheckboxes.length === 0) {
            alert('No absent members. Everyone is present!');
            return;
        }

        // Build absent members list from checkbox data attributes
        const absentMembers = absentCheckboxes.map(cb => ({
            id: cb.value,
            name: cb.dataset.memberName,
            phone: cb.dataset.memberPhone,
            email: cb.dataset.memberEmail
        })).filter(m => m.phone && m.phone.trim() !== ''); // Only members with phone numbers

        console.log('Absent members with phones:', absentMembers);

        if (absentMembers.length === 0) {
            alert('No absent members have phone numbers registered.');
            return;
        }

        // Populate SMS modal
        document.getElementById('smsEventName').textContent = event.title;
        document.getElementById('smsAbsentCount').textContent = absentMembers.length;
        const recipientCount = document.getElementById('smsRecipientCount');
        if (recipientCount) recipientCount.textContent = absentMembers.length;

        // List absent members
        document.getElementById('smsAbsentMembersList').innerHTML = absentMembers.map(member => `
            <div class="d-flex justify-content-between align-items-center mb-2 p-2 border-bottom">
                <div>
                    <strong>${member.name}</strong>
                    <br><small class="text-muted">${member.phone}</small>
                </div>
                <i class="fas fa-mobile-alt text-danger"></i>
            </div>
        `).join('');

        // Set default SMS message
        const defaultMessage = `Hi {name}, we missed you at ${event.title} on ${event.event_date}. We hope everything is okay. Could you please let us know why you were unable to attend? - COP Youth Ministry`;
        document.getElementById('smsMessage').value = defaultMessage;
        updateSMSCharCount();

        // Store data for sending
        window.absentMembersData = {
            event: event,
            members: absentMembers
        };

        console.log('✅ Opening SMS modal');

        // Show SMS modal
        const smsModal = new bootstrap.Modal(document.getElementById('absentSMSModal'));
        smsModal.show();
    } catch (error) {
        console.error('Error preparing SMS:', error);
        alert('Error preparing SMS: ' + error.message);
    }
}

// Update SMS character count
function updateSMSCharCount() {
    const message = document.getElementById('smsMessage').value;
    document.getElementById('smsCharCount').textContent = message.length;
}

// Update SMS preview
function updateSMSPreview() {
    updateSMSCharCount();

    const message = document.getElementById('smsMessage').value;
    const previewDiv = document.getElementById('smsPreview');

    if (!message) {
        previewDiv.textContent = 'Enter a message to see preview...';
        return;
    }

    // Get first absent member name for preview
    let exampleName = 'Member Name';
    if (window.absentMembersData && window.absentMembersData.members.length > 0) {
        exampleName = window.absentMembersData.members[0].name;
    }

    // Replace {name} with example name
    const previewMessage = message.replace(/{name}/g, exampleName);
    previewDiv.textContent = previewMessage;
}

// Reset SMS message to default
function resetSMSMessage() {
    if (!window.absentMembersData) {
        alert('No event data available');
        return;
    }

    const { event } = window.absentMembersData;
    const defaultMessage = `Hi {name}, we missed you at ${event.title} on ${event.event_date}. We hope everything is okay. Could you please let us know why you were unable to attend? - COP Youth Ministry`;

    document.getElementById('smsMessage').value = defaultMessage;
    updateSMSPreview();
}

// Add event listener for SMS message textarea
document.addEventListener('DOMContentLoaded', function () {
    const smsTextarea = document.getElementById('smsMessage');
    if (smsTextarea) {
        smsTextarea.addEventListener('input', updateSMSCharCount);
    }
});

// Confirm and send SMS
async function confirmSendSMS() {
    if (!window.absentMembersData) {
        alert('No absent members data found');
        return;
    }

    const message = document.getElementById('smsMessage').value.trim();
    if (!message) {
        alert('Please enter an SMS message');
        return;
    }

    if (message.length > 160) {
        alert('SMS message is too long. Please keep it under 160 characters.');
        return;
    }

    const { event, members } = window.absentMembersData;

    if (!confirm(`Send SMS to ${members.length} absent members?`)) {
        return;
    }

    // Check SMS configuration
    const smsConfig = window.checkSMSConfiguration();
    if (!smsConfig.configured) {
        const useDemo = confirm(
            '⚠️ SMS Provider Not Configured\n\n' +
            smsConfig.message + '\n\n' +
            'Would you like to continue in DEMO MODE?\n' +
            '(Messages will be logged but not actually sent)\n\n' +
            'To enable real SMS:\n' +
            '1. Open sms-provider.js\n' +
            '2. Add your API credentials\n' +
            '3. See SMS_INTEGRATION_GUIDE.md for details'
        );

        if (!useDemo) {
            return;
        }
    }

    // Show loading
    const sendBtn = document.querySelector('#absentSMSModal .btn-danger');
    const originalText = sendBtn.innerHTML;
    sendBtn.disabled = true;
    sendBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Sending SMS...';

    const smsLogs = JSON.parse(localStorage.getItem('smsLogs') || '[]');
    const timestamp = new Date().toISOString();
    let successCount = 0;
    let failCount = 0;
    const results = [];

    // Send SMS to each member
    for (const member of members) {
        const personalizedMessage = message.replace('{name}', member.name);

        let result;
        if (smsConfig.configured && window.sendSMS) {
            // ACTUAL SMS SENDING
            result = await window.sendSMS(member.phone, personalizedMessage);
        } else {
            // DEMO MODE - Simulate sending
            result = {
                success: true,
                demo: true,
                messageId: 'DEMO-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9)
            };
        }

        // Log SMS to Supabase
        await window.supabaseDB.logSMS({
            recipient: member.name,
            phone: member.phone,
            message: personalizedMessage,
            event: event.title,
            event_id: event.id,
            type: 'absence_inquiry',
            status: result.success ? (result.demo ? 'demo' : 'sent') : 'failed',
            error: result.error || null,
            message_id: result.messageId || null,
            cost: result.cost || null,
            provider: result.provider || 'demo'
        });

        results.push({
            name: member.name,
            phone: member.phone,
            success: result.success,
            error: result.error
        });

        if (result.success) {
            successCount++;
        } else {
            failCount++;
        }

        // Small delay between messages
        await new Promise(resolve => setTimeout(resolve, 100));
    }

    // Record activity
    const memberNames = members.map(m => m.name).join(', ');
    recordAdminActivity(
        `Sent absence inquiry SMS to ${successCount}/${members.length} members for "${event.title}": ${memberNames}`
    );

    // Reset button
    sendBtn.disabled = false;
    sendBtn.innerHTML = originalText;

    // Show detailed result
    let resultMessage = `📊 SMS Sending Complete!\n\n`;
    resultMessage += `✅ Successful: ${successCount}\n`;
    resultMessage += `❌ Failed: ${failCount}\n`;
    resultMessage += `📱 Total: ${members.length}\n\n`;

    if (!smsConfig.configured) {
        resultMessage += `⚠️ DEMO MODE - Messages were logged but not actually sent.\n\n`;
        resultMessage += `To enable real SMS:\n`;
        resultMessage += `1. Open sms-provider.js\n`;
        resultMessage += `2. Add your API credentials\n`;
        resultMessage += `3. See SMS_INTEGRATION_GUIDE.md\n`;
    } else {
        resultMessage += `Provider: ${smsConfig.provider}\n`;
        if (failCount > 0) {
            resultMessage += `\nFailed Recipients:\n`;
            results.filter(r => !r.success).forEach(r => {
                resultMessage += `- ${r.name} (${r.phone}): ${r.error}\n`;
            });
        }
    }

    alert(resultMessage);

    // Close modal
    const smsModal = bootstrap.Modal.getInstance(document.getElementById('absentSMSModal'));
    smsModal.hide();

    // Clear data
    window.absentMembersData = null;

    // Reload activities
    loadRecentActivities();
}

// View SMS logs (optional - can be added to admin dashboard)
function viewSMSLogs() {
    const smsLogs = JSON.parse(localStorage.getItem('smsLogs') || '[]');

    if (smsLogs.length === 0) {
        alert('No SMS logs found');
        return;
    }

    console.log('SMS Logs:', smsLogs);
    // You can create a modal or page to display SMS logs
}
