// Admin Events Management functionality
document.addEventListener('DOMContentLoaded', function() {
    // Wait for Supabase to be ready
    if (window.supabaseReady) {
        initializeEvents();
    } else {
        window.addEventListener('supabaseReady', initializeEvents);
    }
});

function initializeEvents() {
    // Check if admin is logged in
    checkAdminAuth();
    
    // Initialize events management
    initializeEventsManagement();
    
    // Setup event listeners
    setupEventsEventListeners();
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

// Initialize events management
function initializeEventsManagement() {
    loadEventsData();
}

// Setup event listeners
function setupEventsEventListeners() {
    // Sidebar toggle
    document.getElementById('menuToggle').addEventListener('click', toggleSidebar);
    document.getElementById('sidebarToggle').addEventListener('click', toggleSidebar);
    
    // Logout
    document.getElementById('logoutBtn').addEventListener('click', function() {
        localStorage.removeItem('currentUser');
        window.location.href = 'index.html?admin=true';
    });
    
    // Add event
    document.getElementById('saveEvent').addEventListener('click', addNewEvent);
    
    // Update event
    document.getElementById('updateEvent').addEventListener('click', updateEvent);
    
    // Print attendance
    document.getElementById('printAttendance').addEventListener('click', printAttendanceSheet);
    
    // Tab change
    document.getElementById('eventsTabs').addEventListener('shown.bs.tab', function(event) {
        // Refresh data when tab changes
        loadEventsData();
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

// Load all events data
async function loadEventsData() {
    try {
        const eventsResult = await window.supabaseDB.getEvents();
        const events = eventsResult.success ? eventsResult.data : [];
        
        const attendanceResult = await window.supabaseDB.getAttendance();
        const attendance = attendanceResult.success ? attendanceResult.data : [];
        
        const membersResult = await window.supabaseDB.getMembers();
        const members = membersResult.success ? membersResult.data : [];
        const approvedMembers = members.filter(m => m.status === 'approved' && m.active);
        
        const now = new Date().setHours(0, 0, 0, 0);
        const today = new Date().toISOString().split('T')[0];
        
        // Categorize events
        const upcomingEvents = events.filter(event => new Date(event.event_date || event.date) >= now);
        const pastEvents = events.filter(event => new Date(event.event_date || event.date) < now);
        const todayEvents = events.filter(event => (event.event_date || event.date) === today);
        
        // Update statistics
        document.getElementById('totalEvents').textContent = events.length;
        document.getElementById('upcomingEvents').textContent = upcomingEvents.length;
        document.getElementById('pastEvents').textContent = pastEvents.length;
        document.getElementById('todayEvents').textContent = todayEvents.length;
        
        // Load tables
        loadUpcomingEvents(upcomingEvents, attendance, approvedMembers.length);
        loadPastEvents(pastEvents, attendance, approvedMembers.length);
        loadAllEvents(events, attendance, approvedMembers.length);
    } catch (error) {
        console.error('Error loading events data:', error);
    }
}

// Load upcoming events table
function loadUpcomingEvents(events, attendance, totalMembers) {
    const tableBody = document.getElementById('upcomingEventsBody');
    
    if (events.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="6" class="text-center text-muted py-4">
                    <i class="fas fa-calendar-plus fa-3x mb-3 d-block"></i>
                    No upcoming events
                </td>
            </tr>
        `;
        return;
    }
    
    // Sort by date (soonest first)
    events.sort((a, b) => new Date(a.date) - new Date(b.date));
    
    tableBody.innerHTML = events.map(event => {
        const eventAttendance = attendance.filter(a => a.event_id === event.id);
        const attendanceCount = eventAttendance.length;
        const attendancePercentage = totalMembers > 0 ? Math.round((attendanceCount / totalMembers) * 100) : 0;
        
        return `
            <tr>
                <td>
                    <strong>${event.title}</strong>
                    <br>
                    <small class="text-muted">${event.description || 'No description'}</small>
                </td>
                <td>${formatDate(event.event_date || event.date)}</td>
                <td>${event.event_time || event.time}</td>
                <td>${event.venue}</td>
                <td>
                    <div class="d-flex align-items-center">
                        <div class="attendance-progress me-2">
                            <div class="attendance-progress-bar" style="width: ${attendancePercentage}%"></div>
                        </div>
                        <small>${attendanceCount}/${totalMembers}</small>
                    </div>
                </td>
                <td>
                    <div class="btn-group btn-group-sm">
                        <button class="btn btn-outline-primary view-event" data-event-id="${event.id}">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button class="btn btn-outline-warning edit-event" data-event-id="${event.id}">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn btn-outline-danger delete-event" data-event-id="${event.id}">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
    
    // Add event listeners
    addEventTableListeners();
}

// Load past events table
function loadPastEvents(events, attendance, totalMembers) {
    const tableBody = document.getElementById('pastEventsBody');
    
    if (events.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="6" class="text-center text-muted py-4">
                    <i class="fas fa-calendar-check fa-3x mb-3 d-block"></i>
                    No past events
                </td>
            </tr>
        `;
        return;
    }
    
    // Sort by date (most recent first)
    events.sort((a, b) => new Date(b.date) - new Date(a.date));
    
    tableBody.innerHTML = events.map(event => {
        const eventAttendance = attendance.filter(a => a.event_id === event.id);
        const attendanceCount = eventAttendance.length;
        const attendancePercentage = totalMembers > 0 ? Math.round((attendanceCount / totalMembers) * 100) : 0;
        
        return `
            <tr>
                <td>
                    <strong>${event.title}</strong>
                    <br>
                    <small class="text-muted">${event.description || 'No description'}</small>
                </td>
                <td>${formatDate(event.event_date || event.date)}</td>
                <td>${formatTime(event.event_time || event.time)}</td>
                <td>${event.venue}</td>
                <td>
                    <div class="d-flex align-items-center">
                        <div class="attendance-progress me-2">
                            <div class="attendance-progress-bar" style="width: ${attendancePercentage}%"></div>
                        </div>
                        <small>${attendanceCount}/${totalMembers}</small>
                    </div>
                </td>
                <td>
                    <div class="btn-group btn-group-sm">
                        <button class="btn btn-outline-primary view-event" data-event-id="${event.id}">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button class="btn btn-outline-info attendance-report" data-event-id="${event.id}">
                            <i class="fas fa-clipboard-list"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
    
    // Add event listeners
    addEventTableListeners();
}

// Load all events table
function loadAllEvents(events, attendance, totalMembers) {
    const tableBody = document.getElementById('allEventsBody');
    
    if (events.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="7" class="text-center text-muted py-4">
                    <i class="fas fa-calendar fa-3x mb-3 d-block"></i>
                    No events created yet
                </td>
            </tr>
        `;
        return;
    }
    
    // Sort by date (most recent first)
    events.sort((a, b) => new Date(b.date) - new Date(a.date));
    
    tableBody.innerHTML = events.map(event => {
        const eventDate = new Date(event.event_date || event.date);
        const isPast = eventDate < new Date().setHours(0, 0, 0, 0);
        const isToday = (event.event_date || event.date) === new Date().toISOString().split('T')[0];
        
        const eventAttendance = attendance.filter(a => a.event_id === event.id);
        const attendanceCount = eventAttendance.length;
        const attendancePercentage = totalMembers > 0 ? Math.round((attendanceCount / totalMembers) * 100) : 0;
        
        let statusBadge = '';
        if (isToday) {
            statusBadge = '<span class="badge badge-today">Today</span>';
        } else if (isPast) {
            statusBadge = '<span class="badge badge-past">Past</span>';
        } else {
            statusBadge = '<span class="badge badge-upcoming">Upcoming</span>';
        }
        
        return `
            <tr>
                <td>
                    <strong>${event.title}</strong>
                    <br>
                    <small class="text-muted">${event.description || 'No description'}</small>
                    <br>
                    <span class="event-type-badge type-${event.event_type || event.type || 'special-event'}">
                        ${getEventTypeLabel(event.event_type || event.type)}
                    </span>
                </td>
                <td>${formatDate(event.date)}</td>
                <td>${formatTime(event.time)}</td>
                <td>${event.venue}</td>
                <td>${statusBadge}</td>
                <td>
                    <div class="d-flex align-items-center">
                        <div class="attendance-progress me-2">
                            <div class="attendance-progress-bar" style="width: ${attendancePercentage}%"></div>
                        </div>
                        <small>${attendanceCount}/${totalMembers}</small>
                    </div>
                </td>
                <td>
                    <div class="btn-group btn-group-sm">
                        <button class="btn btn-outline-primary view-event" data-event-id="${event.id}">
                            <i class="fas fa-eye"></i>
                        </button>
                        ${!isPast ? `
                            <button class="btn btn-outline-warning edit-event" data-event-id="${event.id}">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="btn btn-outline-danger delete-event" data-event-id="${event.id}">
                                <i class="fas fa-trash"></i>
                            </button>
                        ` : `
                            <button class="btn btn-outline-info attendance-report" data-event-id="${event.id}">
                                <i class="fas fa-clipboard-list"></i>
                            </button>
                        `}
                    </div>
                </td>
            </tr>
        `;
    }).join('');
    
    // Add event listeners
    addEventTableListeners();
}

// Add event listeners to table buttons
function addEventTableListeners() {
    // View event
    document.querySelectorAll('.view-event').forEach(btn => {
        btn.addEventListener('click', function() {
            viewEventDetails(this.dataset.eventId);
        });
    });
    
    // Edit event
    document.querySelectorAll('.edit-event').forEach(btn => {
        btn.addEventListener('click', function() {
            editEvent(this.dataset.eventId);
        });
    });
    
    // Delete event
    document.querySelectorAll('.delete-event').forEach(btn => {
        btn.addEventListener('click', function() {
            deleteEvent(this.dataset.eventId);
        });
    });
    
    // Attendance report
    document.querySelectorAll('.attendance-report').forEach(btn => {
        btn.addEventListener('click', function() {
            generateAttendanceReport(this.dataset.eventId);
        });
    });
}

// Add new event
async function addNewEvent() {
    const title = document.getElementById('eventTitle').value.trim();
    const description = document.getElementById('eventDescription').value.trim();
    const date = document.getElementById('eventDate').value;
    const time = document.getElementById('eventTime').value;
    const venue = document.getElementById('eventVenue').value.trim();
    const type = document.getElementById('eventType').value;
    
    if (!title || !date || !time || !venue) {
        alert('Please fill in all required fields');
        return;
    }
    
    try {
        // Create new event (don't include id - Supabase will auto-generate UUID)
        const newEvent = {
            title: title,
            description: description,
            event_date: date,
            event_time: time,
            venue: venue,
            event_type: type,
            created_by: JSON.parse(localStorage.getItem('currentUser')).name
        };
        
        const result = await window.supabaseDB.createEvent(newEvent);
        
        if (result.success) {
            // Close modal and reset form
            const modal = bootstrap.Modal.getInstance(document.getElementById('addEventModal'));
            modal.hide();
            document.getElementById('addEventForm').reset();
            
            // Reload data
            loadEventsData();
            
            // Record activity
            await recordAdminActivity(`Created new event: ${title}`);
            
            alert('Event created successfully!');
        } else {
            alert('Failed to create event: ' + result.error);
        }
    } catch (error) {
        console.error('Error creating event:', error);
        alert('Failed to create event. Please try again.');
    }
}

// Edit event
async function editEvent(eventId) {
    try {
        const eventsResult = await window.supabaseDB.getEvents();
        const events = eventsResult.success ? eventsResult.data : [];
        const event = events.find(e => e.id === eventId);
        
        if (!event) {
            alert('Event not found');
            return;
        }
        
        // Fill form with event data
        document.getElementById('editEventId').value = event.id;
        document.getElementById('editEventTitle').value = event.title;
        document.getElementById('editEventDescription').value = event.description || '';
        document.getElementById('editEventDate').value = event.event_date || event.date;
        document.getElementById('editEventTime').value = event.event_time || event.time;
        document.getElementById('editEventVenue').value = event.venue;
        document.getElementById('editEventType').value = event.event_type || event.type || 'special-event';
        
        // Show modal
        const modal = new bootstrap.Modal(document.getElementById('editEventModal'));
        modal.show();
    } catch (error) {
        console.error('Error editing event:', error);
        alert('Failed to load event data. Please try again.');
    }
}

// Update event
async function updateEvent() {
    const eventId = document.getElementById('editEventId').value;
    const title = document.getElementById('editEventTitle').value.trim();
    const description = document.getElementById('editEventDescription').value.trim();
    const date = document.getElementById('editEventDate').value;
    const time = document.getElementById('editEventTime').value;
    const venue = document.getElementById('editEventVenue').value.trim();
    const type = document.getElementById('editEventType').value;
    
    if (!title || !date || !time || !venue) {
        alert('Please fill in all required fields');
        return;
    }
    
    try {
        const updates = {
            title: title,
            description: description,
            event_date: date,
            event_time: time,
            venue: venue,
            event_type: type
        };
        
        const result = await window.supabaseDB.updateEvent(eventId, updates);
        
        if (result.success) {
            // Close modal
            const modal = bootstrap.Modal.getInstance(document.getElementById('editEventModal'));
            modal.hide();
            
            // Reload data
            loadEventsData();
            
            // Record activity
            await recordAdminActivity(`Updated event: ${title}`);
            
            alert('Event updated successfully!');
        } else {
            alert('Failed to update event: ' + result.error);
        }
    } catch (error) {
        console.error('Error updating event:', error);
        alert('Failed to update event. Please try again.');
    }
}

// View event details
async function viewEventDetails(eventId) {
    try {
        const eventsResult = await window.supabaseDB.getEvents();
        const events = eventsResult.success ? eventsResult.data : [];
        const event = events.find(e => e.id === eventId);
        
        const attendanceResult = await window.supabaseDB.getAttendance();
        const attendance = attendanceResult.success ? attendanceResult.data : [];
        
        const membersResult = await window.supabaseDB.getMembers();
        const members = membersResult.success ? membersResult.data : [];
        
        if (!event) {
            alert('Event not found');
            return;
        }
        
        const eventAttendance = attendance.filter(a => a.event_id === eventId);
        const totalMembers = members.filter(m => m.status === 'approved' && m.active).length;
        const attendancePercentage = totalMembers > 0 ? Math.round((eventAttendance.length / totalMembers) * 100) : 0;
        
        // Get members who attended
        const attendedMembers = eventAttendance.map(att => {
            const member = members.find(m => m.id === att.member_id);
            return member ? member.name : 'Unknown Member';
        });
        
        // Update modal content
        document.getElementById('eventDetailsContent').innerHTML = `
            <div class="row">
                <div class="col-md-6">
                    <h5>Event Information</h5>
                    <p><strong>Title:</strong> ${event.title}</p>
                    <p><strong>Date:</strong> ${formatDate(event.event_date || event.date)}</p>
                    <p><strong>Time:</strong> ${event.event_time || event.time}</p>
                    <p><strong>Venue:</strong> ${event.venue}</p>
                    <p><strong>Type:</strong> ${getEventTypeLabel(event.event_type || event.type)}</p>
                    ${event.description ? `<p><strong>Description:</strong> ${event.description}</p>` : ''}
                </div>
                <div class="col-md-6">
                    <h5>Attendance Summary</h5>
                    <p><strong>Total Attendance:</strong> ${eventAttendance.length}/${totalMembers}</p>
                    <p><strong>Attendance Rate:</strong> ${attendancePercentage}%</p>
                    
                    <h6 class="mt-3">Members Present:</h6>
                    <div style="max-height: 200px; overflow-y: auto;">
                        ${attendedMembers.length > 0 ? 
                            attendedMembers.map(name => `<div class="border-bottom py-1">${name}</div>`).join('') :
                            '<p class="text-muted">No attendance recorded</p>'
                        }
                    </div>
                </div>
            </div>
        `;
        
        // Store event ID for printing
        document.getElementById('printAttendance').dataset.eventId = eventId;
        
        // Show modal
        const modal = new bootstrap.Modal(document.getElementById('eventDetailsModal'));
        modal.show();
    } catch (error) {
        console.error('Error viewing event details:', error);
        alert('Failed to load event details. Please try again.');
    }
}

// Delete event
async function deleteEvent(eventId) {
    if (!confirm('Are you sure you want to delete this event? This will also delete all attendance records for this event.')) {
        return;
    }
    
    try {
        // Get event title before deleting
        const eventsResult = await window.supabaseDB.getEvents();
        const event = eventsResult.data.find(e => e.id === eventId);
        const eventTitle = event ? event.title : 'Unknown';
        
        const result = await window.supabaseDB.deleteEvent(eventId);
        
        if (result.success) {
            // Record activity
            await recordAdminActivity(`Deleted event: ${eventTitle}`);
            
            // Reload data
            loadEventsData();
            
            alert('Event deleted successfully!');
        } else {
            alert('Failed to delete event: ' + result.error);
        }
    } catch (error) {
        console.error('Error deleting event:', error);
        alert('Failed to delete event. Please try again.');
    }
}

// Generate attendance report
function generateAttendanceReport(eventId) {
    // This would generate a detailed PDF report
    // For now, we'll just show the event details
    viewEventDetails(eventId);
}

// Print attendance sheet
function printAttendanceSheet() {
    const eventId = this.dataset.eventId;
    const events = JSON.parse(localStorage.getItem('events') || '[]');
    const event = events.find(e => e.id === eventId);
    const attendance = JSON.parse(localStorage.getItem('attendance') || '[]');
    const members = JSON.parse(localStorage.getItem('members') || '[]');
    
    if (!event) {
        alert('Event not found');
        return;
    }
    
    const eventAttendance = attendance.filter(a => a.eventId === eventId);
    const approvedMembers = members.filter(m => m.status === 'approved' && m.active);
    
    // Create printable content
    const printContent = `
        <!DOCTYPE html>
        <html>
        <head>
            <title>Attendance Sheet - ${event.title}</title>
            <style>
                body { font-family: Arial, sans-serif; margin: 20px; }
                .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #001e3c; padding-bottom: 10px; }
                .event-info { margin-bottom: 20px; }
                .attendance-table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                .attendance-table th, .attendance-table td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                .attendance-table th { background-color: #001e3c; color: white; }
                .present { background-color: #d4edda; }
                .absent { background-color: #f8d7da; }
                .summary { margin-top: 30px; padding: 15px; background-color: #f8f9fa; border-radius: 5px; }
            </style>
        </head>
        <body>
            <div class="header">
                <h1>Church of Pentecost Youth Ministry</h1>
                <h2>Attendance Sheet</h2>
            </div>
            
            <div class="event-info">
                <h3>${event.title}</h3>
                <p><strong>Date:</strong> ${formatDate(event.date)}</p>
                <p><strong>Time:</strong> ${event.time}</p>
                <p><strong>Venue:</strong> ${event.venue}</p>
            </div>
            
            <table class="attendance-table">
                <thead>
                    <tr>
                        <th>#</th>
                        <th>Member Name</th>
                        <th>Status</th>
                        <th>Signature</th>
                    </tr>
                </thead>
                <tbody>
                    ${approvedMembers.map((member, index) => {
                        const isPresent = eventAttendance.some(a => a.memberId === member.id);
                        return `
                            <tr class="${isPresent ? 'present' : 'absent'}">
                                <td>${index + 1}</td>
                                <td>${member.name}</td>
                                <td>${isPresent ? 'Present' : 'Absent'}</td>
                                <td style="height: 30px;"></td>
                            </tr>
                        `;
                    }).join('')}
                </tbody>
            </table>
            
            <div class="summary">
                <p><strong>Total Members:</strong> ${approvedMembers.length}</p>
                <p><strong>Present:</strong> ${eventAttendance.length}</p>
                <p><strong>Absent:</strong> ${approvedMembers.length - eventAttendance.length}</p>
                <p><strong>Attendance Rate:</strong> ${Math.round((eventAttendance.length / approvedMembers.length) * 100)}%</p>
            </div>
            
            <div style="margin-top: 40px; text-align: center; font-size: 0.9em; color: #666;">
                <p>Generated on ${new Date().toLocaleDateString()} by Church Youth Management System</p>
            </div>
        </body>
        </html>
    `;
    
    // Open print window
    const printWindow = window.open('', '_blank');
    printWindow.document.write(printContent);
    printWindow.document.close();
    printWindow.focus();
    
    // Wait for content to load then print
    setTimeout(() => {
        printWindow.print();
        // printWindow.close(); // Uncomment to auto-close after printing
    }, 500);
}

// Helper function to get event type label
function getEventTypeLabel(type) {
    const typeLabels = {
        'sunday-service': 'Sunday Service',
        'youth-meeting': 'Youth Meeting',
        'bible-study': 'Bible Study',
        'prayer-meeting': 'Prayer Meeting',
        'special-event': 'Special Event',
        'outreach': 'Outreach'
    };
    
    return typeLabels[type] || 'Special Event';
}

// Helper function to format date
function formatDate(dateString) {
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    return new Date(dateString).toLocaleDateString(undefined, options);
}

// Helper function to format time in 12-hour format with AM/PM
function formatTime(timeString) {
    if (!timeString) return 'N/A';
    
    // Parse the time string (HH:MM format)
    const [hours, minutes] = timeString.split(':');
    let hour = parseInt(hours);
    const minute = minutes;
    
    // Determine AM or PM
    const period = hour >= 12 ? 'PM' : 'AM';
    
    // Convert to 12-hour format
    if (hour === 0) {
        hour = 12; // Midnight
    } else if (hour > 12) {
        hour = hour - 12;
    }
    
    return `${hour}:${minute} ${period}`;
}

// Record admin activity
async function recordAdminActivity(description) {
    try {
        await window.supabaseDB.logAdminActivity(description);
    } catch (error) {
        console.error('Error recording admin activity:', error);
    }
}