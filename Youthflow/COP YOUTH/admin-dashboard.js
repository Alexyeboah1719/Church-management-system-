// Admin Dashboard functionality - Simplified for Frontend Only
document.addEventListener('DOMContentLoaded', function() {
    initializeDashboard();
});

// Listen for localStorage changes (when members update their profiles)
window.addEventListener('storage', function(e) {
    if (e.key === 'members') {
        console.log('Member data updated, refreshing dashboard...');
        loadAdminStats();
        loadPendingApprovals();
    } else if (e.key === 'events') {
        console.log('Events data updated, refreshing attendance dropdown...');
        loadEventsForAttendance();
        loadAdminStats(); // Also refresh stats since event count might change
    }
});

// Also listen for visibility changes to refresh when user returns to tab
document.addEventListener('visibilitychange', function() {
    if (!document.hidden) {
        console.log('Page became visible, refreshing dashboard...');
        loadAdminStats();
        loadPendingApprovals();
        loadEventsForAttendance(); // Also refresh attendance dropdown
    }
});

function initializeDashboard() {
    // Check if admin is logged in
    checkAdminAuth();
    
    // Load dashboard statistics and pending approvals
    loadAdminStats();
    loadPendingApprovals();
    
    // Load events for attendance dropdown
    loadEventsForAttendance();
    
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

// Setup admin event listeners
function setupAdminEventListeners() {
    // Sidebar toggle
    const menuToggle = document.getElementById('menuToggle');
    const sidebarToggle = document.getElementById('sidebarToggle');
    if (menuToggle) menuToggle.addEventListener('click', toggleSidebar);
    if (sidebarToggle) sidebarToggle.addEventListener('click', toggleSidebar);
    
    // Logout
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function() {
            localStorage.removeItem('currentUser');
            window.location.href = 'auth.html?admin=true';
        });
    }
    
    // Attendance modal
    const attendanceEvent = document.getElementById('attendanceEvent');
    const saveAttendance = document.getElementById('saveAttendance');
    
    if (attendanceEvent) {
        attendanceEvent.addEventListener('change', loadMembersForAttendance);
    }
    
    if (saveAttendance) {
        saveAttendance.addEventListener('click', saveAttendanceData);
    }
    
    // Reports modal
    const reportType = document.getElementById('reportType');
    const generateReport = document.getElementById('generateReport');
    
    if (reportType) {
        reportType.addEventListener('change', handleReportTypeChange);
    }
    
    if (generateReport) {
        generateReport.addEventListener('click', generatePDFReport);
    }
    
    // Load events for attendance report when modal opens
    const reportsModal = document.getElementById('reportsModal');
    if (reportsModal) {
        reportsModal.addEventListener('show.bs.modal', function() {
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
        
        // Check if required elements exist
        const totalMembersElement = document.getElementById('totalMembers');
        const pendingApprovalsElement = document.getElementById('pendingApprovals');
        const upcomingEventsElement = document.getElementById('upcomingEventsCount');
        const unreadMessagesElement = document.getElementById('unreadMessages');
        
        if (!totalMembersElement || !pendingApprovalsElement || !upcomingEventsElement || !unreadMessagesElement) {
            console.warn('Some dashboard stat elements not found, skipping stats loading');
            return;
        }
        
        // Show loading indicators
        const loadingHTML = '<i class="fas fa-spinner fa-spin"></i>';
        totalMembersElement.innerHTML = loadingHTML;
        pendingApprovalsElement.innerHTML = loadingHTML;
        upcomingEventsElement.innerHTML = loadingHTML;
        unreadMessagesElement.innerHTML = loadingHTML;
        
        // Get members from localStorage
        let members = [];
        try {
            console.log('Fetching members from localStorage...');
            members = JSON.parse(localStorage.getItem('members') || '[]');
            
            const approvedMembers = members.filter(m => m.status === 'approved');
            const pendingMembers = members.filter(m => m.status === 'pending');
            const rejectedMembers = members.filter(m => m.status === 'rejected');
            
            totalMembersElement.textContent = approvedMembers.length;
            pendingApprovalsElement.textContent = pendingMembers.length;
            
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
        } catch (error) {
            console.error('❌ Failed to load members:', error);
            totalMembersElement.textContent = '0';
            pendingApprovalsElement.textContent = '0';
        }
        
        // Get events from localStorage
        let events = [];
        try {
            console.log('Fetching events from localStorage...');
            events = JSON.parse(localStorage.getItem('events') || '[]');
            
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            
            const upcomingEvents = events.filter(event => {
                const eventDate = new Date(event.event_date || event.date);
                return eventDate >= today;
            });
            
            upcomingEventsElement.textContent = upcomingEvents.length;
            
            console.log('✅ Events loaded:', {
                total: events.length,
                upcoming: upcomingEvents.length
            });
        } catch (error) {
            console.error('❌ Failed to load events:', error);
            upcomingEventsElement.textContent = '0';
        }
        
        // Get messages from localStorage
        try {
            console.log('Fetching messages from localStorage...');
            const messages = JSON.parse(localStorage.getItem('messages') || '[]');
            const unreadMessages = messages.filter(m => !m.read && !m.is_admin);
            
            unreadMessagesElement.textContent = unreadMessages.length;
            
            // Update sidebar badge if exists
            const unreadMessagesCount = document.getElementById('unreadMessagesCount');
            if (unreadMessagesCount) {
                unreadMessagesCount.textContent = unreadMessages.length;
            }
            
            console.log('✅ Messages loaded:', {
                total: messages.length,
                unread: unreadMessages.length
            });
        } catch (error) {
            console.error('❌ Failed to load messages:', error);
            unreadMessagesElement.textContent = '0';
        }
        
        console.log('✅ Dashboard stats loading complete');
    } catch (error) {
        console.error('❌ Critical error loading admin stats:', error);
    }
}

// Load pending member approvals only
async function loadPendingApprovals() {
    try {
        const members = JSON.parse(localStorage.getItem('members') || '[]');
        const pendingMembers = members.filter(m => m.status === 'pending'); // Show only pending members
        
        const approvalsList = document.getElementById('pendingApprovalsList');
        const pendingCount = document.getElementById('pendingCount');
        
        // Update pending count
        pendingCount.textContent = pendingMembers.length;
        
        if (pendingMembers.length === 0) {
            approvalsList.innerHTML = `
                <div class="text-center py-4">
                    <i class="fas fa-check-circle fa-3x text-success mb-3 d-block"></i>
                    <p class="text-muted mb-2">No pending member approvals</p>
                    <p class="text-muted small">All members have been processed!</p>
                    <a href="Admin-Register.html" class="btn btn-primary btn-sm mt-2">
                        <i class="fas fa-users me-2"></i>View All Members
                    </a>
                </div>
            `;
            return;
        }
        
        approvalsList.innerHTML = pendingMembers.map(member => `
            <div class="member-approval-item border-bottom pb-3 mb-3">
                <div class="d-flex justify-content-between align-items-start">
                    <div>
                        <h6 class="mb-1">
                            <strong>${member.name}</strong>
                            <span class="badge bg-warning ms-2">Pending Approval</span>
                        </h6>
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
                        ${member.occupation ? `
                        <p class="mb-1 text-muted small">
                            <i class="fas fa-briefcase me-1"></i>${member.occupation}
                        </p>
                        ` : ''}
                        ${member.baptized ? `
                        <p class="mb-1 text-muted small">
                            <i class="fas fa-cross me-1"></i>Baptized: ${member.baptized === 'yes' ? 'Yes' : 'No'}
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
        
        // Add link to view all approved members
        if (pendingMembers.length > 0) {
            const approvedCount = members.filter(m => m.status === 'approved').length;
            approvalsList.innerHTML += `
                <div class="text-center mt-4">
                    <a href="Admin-Register.html" class="btn btn-outline-primary">
                        <i class="fas fa-users me-2"></i>View All Approved Members (${approvedCount})
                    </a>
                </div>
            `;
        }
    } catch (error) {
        console.error('Error loading pending approvals:', error);
    }
}

// Approve member
function approveMember(memberId) {
    try {
        const members = JSON.parse(localStorage.getItem('members') || '[]');
        const memberIndex = members.findIndex(m => m.id === memberId);
        
        if (memberIndex === -1) {
            alert('Member not found');
            return;
        }
        
        // Update member status to approved
        members[memberIndex].status = 'approved';
        members[memberIndex].approved_date = new Date().toISOString();
        
        // Save to localStorage
        localStorage.setItem('members', JSON.stringify(members));
        
        // Refresh the pending approvals list
        loadPendingApprovals();
        
        alert('Member approved successfully!');
    } catch (error) {
        console.error('Error approving member:', error);
        alert('Error approving member. Please try again.');
    }
}

// Reject member
function rejectMember(memberId) {
    if (confirm('Are you sure you want to reject this member? This action cannot be undone.')) {
        try {
            const members = JSON.parse(localStorage.getItem('members') || '[]');
            const memberIndex = members.findIndex(m => m.id === memberId);
            
            if (memberIndex === -1) {
                alert('Member not found');
                return;
            }
            
            // Update member status to rejected
            members[memberIndex].status = 'rejected';
            members[memberIndex].rejected_date = new Date().toISOString();
            
            // Save to localStorage
            localStorage.setItem('members', JSON.stringify(members));
            
            // Refresh the pending approvals list
            loadPendingApprovals();
            
            alert('Member rejected successfully!');
        } catch (error) {
            console.error('Error rejecting member:', error);
            alert('Error rejecting member. Please try again.');
        }
    }
}

// Deactivate member
function deactivateMember(memberId) {
    if (confirm('Are you sure you want to deactivate this member?')) {
        try {
            const members = JSON.parse(localStorage.getItem('members') || '[]');
            const memberIndex = members.findIndex(m => m.id === memberId);
            
            if (memberIndex === -1) {
                alert('Member not found');
                return;
            }
            
            // Update member active status
            members[memberIndex].active = false;
            members[memberIndex].deactivated_date = new Date().toISOString();
            
            // Save to localStorage
            localStorage.setItem('members', JSON.stringify(members));
            
            // Refresh the pending approvals list
            loadPendingApprovals();
            
            alert('Member deactivated successfully!');
        } catch (error) {
            console.error('Error deactivating member:', error);
            alert('Error deactivating member. Please try again.');
        }
    }
}

// Helper function to format date
function formatDate(dateString) {
    const options = { year: 'numeric', month: 'short', day: 'numeric' };
    return new Date(dateString).toLocaleDateString(undefined, options);
}

// Helper function to calculate age
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

// Load events for attendance dropdown
function loadEventsForAttendance() {
    try {
        const attendanceEvent = document.getElementById('attendanceEvent');
        if (!attendanceEvent) return;
        
        const events = JSON.parse(localStorage.getItem('events') || '[]');
        const today = new Date().toISOString().split('T')[0];
        
        // Filter for today's events and upcoming events
        const availableEvents = events.filter(event => {
            const eventDate = event.event_date || event.date;
            return eventDate >= today; // Show today's and future events
        }).sort((a, b) => new Date(a.event_date || a.date) - new Date(b.event_date || b.date));
        
        attendanceEvent.innerHTML = '<option value="">Choose an event...</option>' +
            availableEvents.map(event => 
                `<option value="${event.id}">${event.title} - ${formatDate(event.event_date || event.date)}</option>`
            ).join('');
    } catch (error) {
        console.error('Error loading events for attendance:', error);
    }
}

// Refresh dashboard function (called when events are updated)
function refreshDashboard() {
    loadAdminStats();
    loadPendingApprovals();
    loadEventsForAttendance(); // Refresh attendance dropdown
}

// Attendance functionality
function loadMembersForAttendance() {
    try {
        const attendanceEvent = document.getElementById('attendanceEvent');
        const membersAttendanceList = document.getElementById('membersAttendanceList');
        
        if (!attendanceEvent || !membersAttendanceList) return;
        
        const selectedEvent = attendanceEvent.value;
        if (!selectedEvent) {
            membersAttendanceList.innerHTML = '<p class="text-muted">Please select an event first</p>';
            return;
        }
        
        const members = JSON.parse(localStorage.getItem('members') || '[]');
        const approvedMembers = members.filter(m => m.status === 'approved' && m.active);
        
        membersAttendanceList.innerHTML = approvedMembers.map(member => `
            <div class="form-check mb-2">
                <input class="form-check-input attendance-checkbox" type="checkbox" value="${member.id}" id="member_${member.id}">
                <label class="form-check-label" for="member_${member.id}">
                    ${member.name} (${member.email})
                </label>
            </div>
        `).join('');
        
        // Add event listeners to checkboxes
        document.querySelectorAll('.attendance-checkbox').forEach(checkbox => {
            checkbox.addEventListener('change', updateAttendanceSummary);
        });
        
        updateAttendanceSummary();
    } catch (error) {
        console.error('Error loading members for attendance:', error);
    }
}

function updateAttendanceSummary() {
    try {
        const checkboxes = document.querySelectorAll('#membersAttendanceList input[type="checkbox"]:checked');
        const totalCheckboxes = document.querySelectorAll('#membersAttendanceList input[type="checkbox"]');
        
        const presentCount = checkboxes.length;
        const totalCount = totalCheckboxes.length;
        const absentCount = totalCount - presentCount;
        
        document.getElementById('presentCount').textContent = presentCount;
        document.getElementById('absentCount').textContent = absentCount;
        
        // Update present and absent lists
        const presentMembersList = document.getElementById('presentMembersList');
        const absentMembersList = document.getElementById('absentMembersList');
        
        if (presentCount > 0) {
            const presentNames = Array.from(checkboxes).map(cb => {
                const label = document.querySelector(`label[for="${cb.id}"]`);
                return label ? label.textContent.trim() : '';
            }).filter(name => name);
            
            presentMembersList.innerHTML = presentNames.map(name => 
                `<div class="small">${name}</div>`
            ).join('');
        } else {
            presentMembersList.innerHTML = '<p class="text-muted small">No members marked present yet</p>';
        }
        
        // Enable/disable SMS button for absent members
        const sendAbsentSMS = document.getElementById('sendAbsentSMS');
        if (sendAbsentSMS) {
            sendAbsentSMS.disabled = absentCount === 0;
        }
    } catch (error) {
        console.error('Error updating attendance summary:', error);
    }
}

function saveAttendanceData() {
    try {
        const attendanceEvent = document.getElementById('attendanceEvent');
        const selectedEvent = attendanceEvent.value;
        
        if (!selectedEvent) {
            alert('Please select an event first');
            return;
        }
        
        const checkboxes = document.querySelectorAll('#membersAttendanceList input[type="checkbox"]:checked');
        const attendanceData = {
            event_id: selectedEvent,
            date: new Date().toISOString().split('T')[0],
            present_members: Array.from(checkboxes).map(cb => cb.value),
            created_at: new Date().toISOString()
        };
        
        // Save to localStorage
        let attendance = JSON.parse(localStorage.getItem('attendance') || '[]');
        attendance.push(attendanceData);
        localStorage.setItem('attendance', JSON.stringify(attendance));
        
        alert('Attendance saved successfully!');
        
        // Close modal
        const modal = bootstrap.Modal.getInstance(document.getElementById('attendanceModal'));
        modal.hide();
    } catch (error) {
        console.error('Error saving attendance:', error);
        alert('Failed to save attendance. Please try again.');
    }
}

// Reports functionality
function handleReportTypeChange() {
    try {
        const reportType = document.getElementById('reportType').value;
        const memberFilters = document.getElementById('memberFilters');
        const eventFilters = document.getElementById('eventFilters');
        const attendanceFilters = document.getElementById('attendanceFilters');
        
        // Hide all filters first
        if (memberFilters) memberFilters.classList.add('d-none');
        if (eventFilters) eventFilters.classList.add('d-none');
        if (attendanceFilters) attendanceFilters.classList.add('d-none');
        
        // Show relevant filters based on report type
        switch(reportType) {
            case 'members':
                if (memberFilters) memberFilters.classList.remove('d-none');
                break;
            case 'events':
                if (eventFilters) eventFilters.classList.remove('d-none');
                break;
            case 'attendance':
                if (attendanceFilters) attendanceFilters.classList.remove('d-none');
                break;
            case 'comprehensive':
                if (memberFilters) memberFilters.classList.remove('d-none');
                if (eventFilters) eventFilters.classList.remove('d-none');
                if (attendanceFilters) attendanceFilters.classList.remove('d-none');
                break;
        }
    } catch (error) {
        console.error('Error handling report type change:', error);
    }
}

function generatePDFReport() {
    try {
        const reportType = document.getElementById('reportType').value;
        
        if (!reportType) {
            alert('Please select a report type');
            return;
        }
        
        const startDate = document.getElementById('reportStartDate').value;
        const endDate = document.getElementById('reportEndDate').value;
        
        // Show loading indicator
        const generateBtn = document.getElementById('generateReport');
        const originalText = generateBtn.innerHTML;
        generateBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Generating Report...';
        generateBtn.disabled = true;
        
        try {
            switch(reportType) {
                case 'members':
                    generateMembersReport(startDate, endDate);
                    break;
                case 'events':
                    generateEventsReport(startDate, endDate);
                    break;
                case 'attendance':
                    generateAttendanceReport(startDate, endDate);
                    break;
                case 'comprehensive':
                    generateComprehensiveReport(startDate, endDate);
                    break;
                default:
                    throw new Error('Invalid report type selected');
            }
            
            // Close modal after a short delay
            setTimeout(() => {
                const modal = bootstrap.Modal.getInstance(document.getElementById('reportsModal'));
                if (modal) modal.hide();
            }, 2000);
            
        } finally {
            // Restore button
            setTimeout(() => {
                generateBtn.innerHTML = originalText;
                generateBtn.disabled = false;
            }, 3000);
        }
        
    } catch (error) {
        console.error('Error generating report:', error);
        alert('❌ Failed to generate report: ' + error.message);
        
        // Restore button
        const generateBtn = document.getElementById('generateReport');
        generateBtn.innerHTML = '<i class="fas fa-file-pdf me-2"></i>Generate PDF Report';
        generateBtn.disabled = false;
    }
}

// Generate Members Report
function generateMembersReport(startDate, endDate) {
    const members = JSON.parse(localStorage.getItem('members') || '[]');
    const memberStatus = document.getElementById('memberStatus').value;
    const memberActive = document.getElementById('memberActive').value;
    const memberRole = document.getElementById('memberRole').value;
    
    // Apply filters
    let filteredMembers = members.filter(member => {
        let matchesStatus = memberStatus === 'all' || member.status === memberStatus;
        let matchesActive = memberActive === 'all' || member.active === (memberActive === 'true');
        let matchesRole = memberRole === 'all' || member.role === memberRole;
        let matchesDate = true;
        
        if (startDate || endDate) {
            const registrationDate = new Date(member.registrationDate);
            const start = startDate ? new Date(startDate) : new Date('1900-01-01');
            const end = endDate ? new Date(endDate) : new Date('2100-12-31');
            matchesDate = registrationDate >= start && registrationDate <= end;
        }
        
        return matchesStatus && matchesActive && matchesRole && matchesDate;
    });
    
    // Generate HTML content
    const htmlContent = generateMembersReportHTML(filteredMembers, startDate, endDate);
    
    // Create and download PDF
    createAndDownloadPDF(htmlContent, 'members-report.pdf');
}

// Generate Events Report
function generateEventsReport(startDate, endDate) {
    const events = JSON.parse(localStorage.getItem('events') || '[]');
    const eventType = document.getElementById('eventType').value;
    const eventPeriod = document.getElementById('eventPeriod').value;
    
    // Apply filters
    let filteredEvents = events.filter(event => {
        let matchesType = eventType === 'all' || event.event_type === eventType;
        let matchesDate = true;
        
        if (startDate || endDate) {
            const eventDate = new Date(event.event_date || event.date);
            const start = startDate ? new Date(startDate) : new Date('1900-01-01');
            const end = endDate ? new Date(endDate) : new Date('2100-12-31');
            matchesDate = eventDate >= start && eventDate <= end;
        }
        
        let matchesPeriod = true;
        const today = new Date().setHours(0, 0, 0, 0);
        const eventDate = new Date(event.event_date || event.date).setHours(0, 0, 0, 0);
        
        if (eventPeriod === 'upcoming') {
            matchesPeriod = eventDate >= today;
        } else if (eventPeriod === 'past') {
            matchesPeriod = eventDate < today;
        }
        
        return matchesType && matchesDate && matchesPeriod;
    });
    
    // Generate HTML content
    const htmlContent = generateEventsReportHTML(filteredEvents, startDate, endDate);
    
    // Create and download PDF
    createAndDownloadPDF(htmlContent, 'events-report.pdf');
}

// Generate Attendance Report
function generateAttendanceReport(startDate, endDate) {
    const attendance = JSON.parse(localStorage.getItem('attendance') || '[]');
    const events = JSON.parse(localStorage.getItem('events') || '[]');
    const members = JSON.parse(localStorage.getItem('members') || '[]');
    const attendanceEventSelect = document.getElementById('attendanceEventSelect').value;
    
    // Apply filters
    let filteredAttendance = attendance.filter(record => {
        let matchesDate = true;
        
        if (startDate || endDate) {
            const recordDate = new Date(record.date);
            const start = startDate ? new Date(startDate) : new Date('1900-01-01');
            const end = endDate ? new Date(endDate) : new Date('2100-12-31');
            matchesDate = recordDate >= start && recordDate <= end;
        }
        
        let matchesEvent = attendanceEventSelect === 'all' || record.event_id === attendanceEventSelect;
        
        return matchesDate && matchesEvent;
    });
    
    // Generate HTML content
    const htmlContent = generateAttendanceReportHTML(filteredAttendance, events, members, startDate, endDate);
    
    // Create and download PDF
    createAndDownloadPDF(htmlContent, 'attendance-report.pdf');
}

// Generate Comprehensive Report
function generateComprehensiveReport(startDate, endDate) {
    // Combine all reports
    const members = JSON.parse(localStorage.getItem('members') || '[]');
    const events = JSON.parse(localStorage.getItem('events') || '[]');
    const attendance = JSON.parse(localStorage.getItem('attendance') || '[]');
    const tasks = JSON.parse(localStorage.getItem('tasks') || '[]');
    
    // Apply date filters
    let dateFilteredMembers = members;
    let dateFilteredEvents = events;
    let dateFilteredAttendance = attendance;
    let dateFilteredTasks = tasks;
    
    if (startDate || endDate) {
        const start = startDate ? new Date(startDate) : new Date('1900-01-01');
        const end = endDate ? new Date(endDate) : new Date('2100-12-31');
        
        dateFilteredMembers = members.filter(m => new Date(m.registrationDate) >= start && new Date(m.registrationDate) <= end);
        dateFilteredEvents = events.filter(e => new Date(e.event_date || e.date) >= start && new Date(e.event_date || e.date) <= end);
        dateFilteredAttendance = attendance.filter(a => new Date(a.date) >= start && new Date(a.date) <= end);
        dateFilteredTasks = tasks.filter(t => new Date(t.assignedDate) >= start && new Date(t.assignedDate) <= end);
    }
    
    // Generate HTML content
    const htmlContent = generateComprehensiveReportHTML(
        dateFilteredMembers, 
        dateFilteredEvents, 
        dateFilteredAttendance, 
        dateFilteredTasks, 
        startDate, 
        endDate
    );
    
    // Create and download PDF
    createAndDownloadPDF(htmlContent, 'comprehensive-report.pdf');
}

// Create and download PDF using browser print functionality
function createAndDownloadPDF(htmlContent, filename) {
    try {
        // Method 1: Try direct download using Blob (most reliable)
        if (navigator.msSaveBlob || document.documentMode || /Edge/.test(navigator.userAgent)) {
            // For IE and Edge
            createBlobDownload(htmlContent, filename);
        } else if (/Chrome/.test(navigator.userAgent) && /Google Inc/.test(navigator.vendor)) {
            // For Chrome - use print method
            createPrintWindow(htmlContent, filename);
        } else if (/Firefox/.test(navigator.userAgent)) {
            // For Firefox - use print method
            createPrintWindow(htmlContent, filename);
        } else if (/Safari/.test(navigator.userAgent) && !/Chrome/.test(navigator.userAgent)) {
            // For Safari - use print method
            createPrintWindow(htmlContent, filename);
        } else {
            // Default to print method
            createPrintWindow(htmlContent, filename);
        }
        
    } catch (error) {
        console.error('Error generating PDF:', error);
        // Fallback: try to open in new window
        try {
            const fallbackWindow = window.open('', '_blank');
            if (fallbackWindow) {
                fallbackWindow.document.write(`
                    <!DOCTYPE html>
                    <html>
                    <head>
                        <title>${filename}</title>
                        <style>
                            body { font-family: Arial, sans-serif; margin: 20px; line-height: 1.6; }
                            table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
                            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                            th { background-color: #001e3c; color: white; }
                            .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #001e3c; padding-bottom: 10px; }
                        </style>
                    </head>
                    <body>
                        ${htmlContent}
                        <div style="margin-top: 40px; text-align: center; font-size: 12px; color: #666;">
                            <p>Generated on ${new Date().toLocaleDateString()} by Church Youth Management System</p>
                        </div>
                    </body>
                    </html>
                `);
                fallbackWindow.document.close();
                alert('Report opened in new window. Use your browser\'s print function to save as PDF.');
            }
        } catch (fallbackError) {
            alert('❌ Unable to generate PDF. Please try a different browser or contact support.\n\nError: ' + error.message);
        }
    }
}

// Fallback method using Blob for direct download
function createBlobDownload(htmlContent, filename) {
    try {
        const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        
        const link = document.createElement('a');
        link.href = url;
        link.download = filename.replace('.pdf', '.html');
        link.style.display = 'none';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        URL.revokeObjectURL(url);
        
        alert('Report saved as HTML file. You can convert it to PDF using your browser\'s print function.');
    } catch (error) {
        console.error('Blob download failed:', error);
        throw error;
    }
}

// Print window method (most reliable)
function createPrintWindow(htmlContent, filename) {
    // Create a new window for printing
    const printWindow = window.open('', '_blank', 'width=800,height=600,scrollbars=yes,resizable=yes');
    
    if (!printWindow) {
        alert('Please allow pop-ups for this website to generate PDF reports.\n\nYou can usually allow pop-ups in your browser settings or by clicking the popup blocker icon in your address bar.');
        return;
    }
    
    // Enhanced HTML content with better styling
    const fullHTML = `
        <!DOCTYPE html>
        <html>
        <head>
            <title>${filename}</title>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <style>
                @page {
                    size: A4;
                    margin: 2cm;
                    @top-center {
                        content: "Church of Pentecost Youth Ministry";
                        font-size: 10pt;
                        color: #666;
                    }
                    @bottom-center {
                        content: "Page " counter(page);
                        font-size: 10pt;
                        color: #666;
                    }
                }
                
                * {
                    box-sizing: border-box;
                }
                
                body { 
                    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                    margin: 0;
                    padding: 20px;
                    line-height: 1.6;
                    color: #333;
                    background: white;
                }
                
                .header { 
                    text-align: center; 
                    margin-bottom: 40px; 
                    border-bottom: 3px solid #001e3c; 
                    padding-bottom: 20px;
                    page-break-after: avoid;
                }
                
                .header h1 {
                    margin: 0;
                    font-size: 24pt;
                    color: #001e3c;
                    font-weight: bold;
                }
                
                .header h2 {
                    margin: 10px 0 0 0;
                    font-size: 18pt;
                    color: #444;
                    font-weight: normal;
                }
                
                .header p {
                    margin: 5px 0 0 0;
                    font-size: 14pt;
                    color: #666;
                }
                
                .section { 
                    margin-bottom: 40px;
                    page-break-inside: avoid;
                }
                
                .section h2 { 
                    color: #001e3c; 
                    border-bottom: 2px solid #001e3c; 
                    padding-bottom: 10px;
                    margin-bottom: 20px;
                    font-size: 16pt;
                    font-weight: bold;
                }
                
                .section h3 {
                    color: #333;
                    margin-bottom: 15px;
                    font-size: 14pt;
                    font-weight: bold;
                }
                
                table { 
                    width: 100%; 
                    border-collapse: collapse; 
                    margin-bottom: 20px;
                    font-size: 12pt;
                    page-break-inside: avoid;
                }
                
                th, td { 
                    border: 1px solid #ddd; 
                    padding: 12px 8px; 
                    text-align: left; 
                    vertical-align: top;
                }
                
                th { 
                    background-color: #001e3c; 
                    color: white;
                    font-weight: bold;
                    font-size: 12pt;
                }
                
                tr:nth-child(even) {
                    background-color: #f9f9f9;
                }
                
                tr:hover {
                    background-color: #f5f5f5;
                }
                
                .summary { 
                    background-color: #f8f9fa; 
                    padding: 20px; 
                    border-radius: 8px;
                    margin: 20px 0;
                    border-left: 4px solid #001e3c;
                    page-break-inside: avoid;
                }
                
                .summary p {
                    margin: 8px 0;
                    font-size: 13pt;
                }
                
                .summary strong {
                    color: #001e3c;
                }
                
                .badge {
                    display: inline-block;
                    padding: 4px 8px;
                    border-radius: 4px;
                    font-size: 10pt;
                    font-weight: bold;
                    text-transform: uppercase;
                }
                
                .badge-approved {
                    background-color: #28a745;
                    color: white;
                }
                
                .badge-pending {
                    background-color: #ffc107;
                    color: #212529;
                }
                
                .badge-success {
                    background-color: #28a745;
                    color: white;
                }
                
                .badge-danger {
                    background-color: #dc3545;
                    color: white;
                }
                
                .footer { 
                    margin-top: 50px;
                    text-align: center; 
                    font-size: 10pt; 
                    color: #666;
                    border-top: 1px solid #ddd;
                    padding-top: 20px;
                    page-break-inside: avoid;
                }
                
                .no-print { 
                    display: none; 
                }
                
                @media print {
                    body { 
                        margin: 0;
                        padding: 0;
                        font-size: 11pt;
                    }
                    
                    .header {
                        margin-bottom: 30px;
                    }
                    
                    .section {
                        margin-bottom: 30px;
                    }
                    
                    table {
                        font-size: 10pt;
                    }
                    
                    th, td {
                        padding: 8px 6px;
                    }
                    
                    .summary {
                        margin: 15px 0;
                        padding: 15px;
                    }
                }
                
                @media screen and (max-width: 600px) {
                    table {
                        font-size: 10pt;
                    }
                    
                    th, td {
                        padding: 8px 4px;
                    }
                }
                
                .print-instructions {
                    position: fixed;
                    top: 10px;
                    right: 10px;
                    background: #007bff;
                    color: white;
                    padding: 10px 15px;
                    border-radius: 5px;
                    font-size: 12px;
                    z-index: 1000;
                    box-shadow: 0 2px 10px rgba(0,0,0,0.2);
                }
            </style>
        </head>
        <body>
            <div class="print-instructions">
                💾 <strong>Save as PDF:</strong> Print → Save as PDF
            </div>
            ${htmlContent}
            <div class="footer">
                <p><strong>Generated on:</strong> ${new Date().toLocaleDateString('en-US', { 
                    weekday: 'long', 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                })} at ${new Date().toLocaleTimeString('en-US', { 
                    hour: '2-digit', 
                    minute: '2-digit' 
                })}</p>
                <p><strong>Generated by:</strong> Church Youth Management System</p>
                <p><strong>User:</strong> ${JSON.parse(localStorage.getItem('currentUser'))?.name || 'Admin'}</p>
            </div>
        </body>
        </html>
    `;
    
    // Write the HTML content
    printWindow.document.write(fullHTML);
    printWindow.document.close();
    
    // Wait for content to load then trigger print
    setTimeout(() => {
        printWindow.focus();
        
        // Show comprehensive instructions
        setTimeout(() => {
            alert('📄 PDF Report Generated Successfully!\n\n📋 To save as PDF:\n\n🔹 Chrome/Edge: Print → Destination → Save as PDF\n🔹 Firefox: Print → PDF → Save\n🔹 Safari: Print → PDF → Save\n🔹 Or use Ctrl+P (Cmd+P) → Save as PDF\n\n📁 The report will be saved as: ' + filename + '\n\n✨ The print window has helpful instructions at the top-right corner.');
        }, 1500);
        
        printWindow.print();
        
        // Auto-close after 15 seconds
        setTimeout(() => {
            if (!printWindow.closed) {
                printWindow.close();
            }
        }, 15000);
    }, 1000);
}

// HTML Templates for Reports
function generateMembersReportHTML(members, startDate, endDate) {
    const totalMembers = members.length;
    const approvedMembers = members.filter(m => m.status === 'approved').length;
    const activeMembers = members.filter(m => m.active).length;
    
    return `
        <div class="header">
            <h1>Church of Pentecost Youth Ministry</h1>
            <h2>Members Report</h2>
            <p>${startDate && endDate ? `Period: ${formatDate(startDate)} to ${formatDate(endDate)}` : 'All Time'}</p>
        </div>
        
        <div class="section">
            <div class="summary">
                <h3>Summary</h3>
                <p><strong>Total Members:</strong> ${totalMembers}</p>
                <p><strong>Approved Members:</strong> ${approvedMembers}</p>
                <p><strong>Active Members:</strong> ${activeMembers}</p>
                <p><strong>Approval Rate:</strong> ${totalMembers > 0 ? Math.round((approvedMembers / totalMembers) * 100) : 0}%</p>
            </div>
        </div>
        
        <div class="section">
            <h2>Members Details</h2>
            <table>
                <thead>
                    <tr>
                        <th>Name</th>
                        <th>Email</th>
                        <th>Phone</th>
                        <th>Role</th>
                        <th>Status</th>
                        <th>Active</th>
                        <th>Registration Date</th>
                    </tr>
                </thead>
                <tbody>
                    ${members.map(member => `
                        <tr>
                            <td>${member.name}</td>
                            <td>${member.email}</td>
                            <td>${member.phone || 'N/A'}</td>
                            <td>${member.role || 'N/A'}</td>
                            <td><span class="badge badge-${member.status}">${member.status}</span></td>
                            <td>${member.active ? 'Yes' : 'No'}</td>
                            <td>${formatDate(member.registrationDate)}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `;
}

function generateEventsReportHTML(events, startDate, endDate) {
    const totalEvents = events.length;
    const upcomingEvents = events.filter(e => new Date(e.event_date || e.date) >= new Date()).length;
    const pastEvents = events.filter(e => new Date(e.event_date || e.date) < new Date()).length;
    
    return `
        <div class="header">
            <h1>Church of Pentecost Youth Ministry</h1>
            <h2>Events Report</h2>
            <p>${startDate && endDate ? `Period: ${formatDate(startDate)} to ${formatDate(endDate)}` : 'All Time'}</p>
        </div>
        
        <div class="section">
            <div class="summary">
                <h3>Summary</h3>
                <p><strong>Total Events:</strong> ${totalEvents}</p>
                <p><strong>Upcoming Events:</strong> ${upcomingEvents}</p>
                <p><strong>Past Events:</strong> ${pastEvents}</p>
            </div>
        </div>
        
        <div class="section">
            <h2>Events Details</h2>
            <table>
                <thead>
                    <tr>
                        <th>Title</th>
                        <th>Date</th>
                        <th>Time</th>
                        <th>Venue</th>
                        <th>Type</th>
                        <th>Created By</th>
                    </tr>
                </thead>
                <tbody>
                    ${events.map(event => `
                        <tr>
                            <td>${event.title}</td>
                            <td>${formatDate(event.event_date || event.date)}</td>
                            <td>${formatTime(event.event_time || event.time)}</td>
                            <td>${event.venue}</td>
                            <td>${getEventTypeLabel(event.event_type || event.type)}</td>
                            <td>${event.created_by || 'N/A'}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `;
}

function generateAttendanceReportHTML(attendance, events, members, startDate, endDate) {
    const totalRecords = attendance.length;
    const totalEvents = events.length;
    
    // Calculate attendance statistics
    const eventAttendanceMap = {};
    attendance.forEach(record => {
        if (!eventAttendanceMap[record.event_id]) {
            eventAttendanceMap[record.event_id] = [];
        }
        eventAttendanceMap[record.event_id].push(record);
    });
    
    return `
        <div class="header">
            <h1>Church of Pentecost Youth Ministry</h1>
            <h2>Attendance Report</h2>
            <p>${startDate && endDate ? `Period: ${formatDate(startDate)} to ${formatDate(endDate)}` : 'All Time'}</p>
        </div>
        
        <div class="section">
            <div class="summary">
                <h3>Summary</h3>
                <p><strong>Total Attendance Records:</strong> ${totalRecords}</p>
                <p><strong>Events with Attendance:</strong> ${Object.keys(eventAttendanceMap).length}</p>
                <p><strong>Total Members:</strong> ${members.filter(m => m.status === 'approved' && m.active).length}</p>
            </div>
        </div>
        
        <div class="section">
            <h2>Attendance Details</h2>
            ${attendance.map(record => {
                const event = events.find(e => e.id === record.event_id);
                const member = members.find(m => m.id === record.member_id);
                return `
                    <div style="margin-bottom: 20px; padding: 10px; border: 1px solid #ddd; border-radius: 5px;">
                        <h4>${event ? event.title : 'Unknown Event'}</h4>
                        <p><strong>Date:</strong> ${formatDate(record.date)}</p>
                        <p><strong>Member:</strong> ${member ? member.name : 'Unknown Member'}</p>
                        <p><strong>Status:</strong> <span class="badge badge-success">Present</span></p>
                    </div>
                `;
            }).join('')}
        </div>
    `;
}

function generateComprehensiveReportHTML(members, events, attendance, tasks, startDate, endDate) {
    return `
        <div class="header">
            <h1>Church of Pentecost Youth Ministry</h1>
            <h2>Comprehensive Report</h2>
            <p>${startDate && endDate ? `Period: ${formatDate(startDate)} to ${formatDate(endDate)}` : 'All Time'}</p>
        </div>
        
        <div class="section">
            <h2>Executive Summary</h2>
            <div class="summary">
                <h3>Overview</h3>
                <p><strong>Total Members:</strong> ${members.length}</p>
                <p><strong>Total Events:</strong> ${events.length}</p>
                <p><strong>Total Attendance Records:</strong> ${attendance.length}</p>
                <p><strong>Total Tasks Assigned:</strong> ${tasks.length}</p>
                
                <h3>Member Statistics</h3>
                <p><strong>Approved Members:</strong> ${members.filter(m => m.status === 'approved').length}</p>
                <p><strong>Active Members:</strong> ${members.filter(m => m.active).length}</p>
                
                <h3>Event Statistics</h3>
                <p><strong>Upcoming Events:</strong> ${events.filter(e => new Date(e.event_date || e.date) >= new Date()).length}</p>
                <p><strong>Past Events:</strong> ${events.filter(e => new Date(e.event_date || e.date) < new Date()).length}</p>
                
                <h3>Task Statistics</h3>
                <p><strong>Completed Tasks:</strong> ${tasks.filter(t => t.status === 'completed').length}</p>
                <p><strong>Pending Tasks:</strong> ${tasks.filter(t => t.status === 'pending').length}</p>
                <p><strong>In-Progress Tasks:</strong> ${tasks.filter(t => t.status === 'in-progress').length}</p>
            </div>
        </div>
        
        ${generateMembersReportHTML(members, startDate, endDate)}
        ${generateEventsReportHTML(events, startDate, endDate)}
        ${generateAttendanceReportHTML(attendance, events, members, startDate, endDate)}
    `;
}

function loadEventsForAttendanceReport() {
    try {
        const attendanceEventSelect = document.getElementById('attendanceEventSelect');
        if (!attendanceEventSelect) return;
        
        const events = JSON.parse(localStorage.getItem('events') || '[]');
        
        attendanceEventSelect.innerHTML = '<option value="all">All Events</option>' +
            events.map(event => 
                `<option value="${event.id}">${event.title || event.name} - ${formatDate(event.date || event.event_date)}</option>`
            ).join('');
    } catch (error) {
        console.error('Error loading events for attendance report:', error);
    }
}

// Helper functions for attendance
function selectAllMembers() {
    const checkboxes = document.querySelectorAll('#membersAttendanceList input[type="checkbox"]');
    checkboxes.forEach(cb => cb.checked = true);
    updateAttendanceSummary();
}

function deselectAllMembers() {
    const checkboxes = document.querySelectorAll('#membersAttendanceList input[type="checkbox"]');
    checkboxes.forEach(cb => cb.checked = false);
    updateAttendanceSummary();
}

function sendSMSToAbsentMembers() {
    try {
        alert('SMS functionality would be implemented here to send messages to absent members.');
    } catch (error) {
        console.error('Error sending SMS:', error);
    }
}
