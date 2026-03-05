// Events functionality
document.addEventListener('DOMContentLoaded', function() {
    // Wait for Supabase to be ready
    if (window.supabaseReady) {
        initEvents();
    } else {
        window.addEventListener('supabaseReady', initEvents);
    }
});

function initEvents() {
    // Check if user is logged in
    checkAuth();
    
    // Initialize events page
    initializeEventsPage();
    
    // Setup event listeners
    setupEventsEventListeners();
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

// Initialize events page
function initializeEventsPage() {
    loadEvents();
}

// Setup event listeners
function setupEventsEventListeners() {
    // Sidebar toggle
    document.getElementById('menuToggle').addEventListener('click', toggleSidebar);
    document.getElementById('sidebarToggle').addEventListener('click', toggleSidebar);
    
    // Logout
    document.getElementById('logoutBtn').addEventListener('click', function() {
        localStorage.removeItem('currentUser');
        window.location.href = 'index.html';
    });
    
    // Filter buttons
    document.querySelectorAll('[data-filter]').forEach(button => {
        button.addEventListener('click', function() {
            // Update active button
            document.querySelectorAll('[data-filter]').forEach(btn => {
                btn.classList.remove('active');
            });
            this.classList.add('active');
            
            // Filter events
            filterEvents(this.dataset.filter);
        });
    });
    
    // Search events
    document.getElementById('searchEvents').addEventListener('input', function() {
        filterEventsBySearch(this.value);
    });
    
    // Comment form
    document.getElementById('commentForm').addEventListener('submit', handleCommentSubmit);
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

// Load events
async function loadEvents() {
    try {
        const eventsResult = await window.supabaseDB.getEvents();
        const events = eventsResult.success ? eventsResult.data : [];
        const sortedEvents = events.sort((a, b) => new Date(a.event_date || a.date) - new Date(b.event_date || b.date));
        
        displayEvents(sortedEvents);
    } catch (error) {
        console.error('Error loading events:', error);
    }
}

// Display events
function displayEvents(events) {
    const eventsList = document.getElementById('eventsList');
    
    if (events.length === 0) {
        eventsList.innerHTML = `
            <div class="col-12 text-center py-5">
                <i class="fas fa-calendar-times fa-3x text-muted mb-3"></i>
                <h4 class="text-muted">No events found</h4>
                <p class="text-muted">Check back later for upcoming events.</p>
            </div>
        `;
        return;
    }
    
    eventsList.innerHTML = events.map(event => {
        const eventDate = new Date(event.event_date || event.date);
        const isPast = eventDate < new Date().setHours(0, 0, 0, 0);
        const cardClass = isPast ? 'past' : 'upcoming';
        
        // Get reactions for this event
        const reactions = JSON.parse(localStorage.getItem('eventReactions') || '[]');
        const eventReactions = reactions.filter(r => r.eventId === event.id);
        
        // Get comments for this event
        const comments = JSON.parse(localStorage.getItem('eventComments') || '[]');
        const eventComments = comments.filter(c => c.eventId === event.id);
        
        return `
            <div class="col-md-6 col-lg-4 mb-4">
                <div class="card event-card ${cardClass} h-100">
                    <div class="card-body">
                        <div class="d-flex justify-content-between align-items-start mb-3">
                            <div class="event-date">
                                <span class="day">${eventDate.getDate()}</span>
                                <span class="month">${eventDate.toLocaleString('default', { month: 'short' })}</span>
                            </div>
                            <span class="badge ${isPast ? 'bg-secondary' : 'bg-success'}">
                                ${isPast ? 'Past' : 'Upcoming'}
                            </span>
                        </div>
                        <h5 class="card-title">${event.title}</h5>
                        <p class="card-text">${event.description}</p>
                        <div class="event-meta mb-3">
                            <p class="mb-1 small text-muted">
                                <i class="fas fa-clock me-1"></i>${event.event_time || event.time}
                            </p>
                            <p class="mb-0 small text-muted">
                                <i class="fas fa-map-marker-alt me-1"></i>${event.venue}
                            </p>
                        </div>
                        <div class="d-flex justify-content-between align-items-center">
                            <div class="reactions">
                                <button class="btn btn-sm reaction-btn like-btn ${getUserReaction(event.id, 'like') ? 'active' : ''}" 
                                        data-event-id="${event.id}" data-reaction="like">
                                    <i class="fas fa-thumbs-up me-1"></i>
                                    <span class="like-count">${eventReactions.filter(r => r.reaction === 'like').length}</span>
                                </button>
                                <button class="btn btn-sm reaction-btn love-btn ${getUserReaction(event.id, 'love') ? 'active' : ''}" 
                                        data-event-id="${event.id}" data-reaction="love">
                                    <i class="fas fa-heart me-1"></i>
                                    <span class="love-count">${eventReactions.filter(r => r.reaction === 'love').length}</span>
                                </button>
                            </div>
                            <button class="btn btn-outline-primary btn-sm view-event" 
                                    data-event-id="${event.id}" 
                                    data-bs-toggle="modal" 
                                    data-bs-target="#eventModal">
                                View Details
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }).join('');
    
    // Add event listeners to reaction buttons
    document.querySelectorAll('.like-btn, .love-btn').forEach(button => {
        button.addEventListener('click', handleReaction);
    });
    
    // Add event listeners to view event buttons
    document.querySelectorAll('.view-event').forEach(button => {
        button.addEventListener('click', function() {
            showEventDetails(this.dataset.eventId);
        });
    });
}

// Filter events by type
async function filterEvents(filterType) {
    try {
        const eventsResult = await window.supabaseDB.getEvents();
        const events = eventsResult.success ? eventsResult.data : [];
        let filteredEvents = events;
        
        const now = new Date().setHours(0, 0, 0, 0);
        
        switch (filterType) {
            case 'upcoming':
                filteredEvents = events.filter(event => new Date(event.event_date || event.date) >= now);
                break;
            case 'past':
                filteredEvents = events.filter(event => new Date(event.event_date || event.date) < now);
                break;
            // 'all' shows all events
        }
        
        displayEvents(filteredEvents);
    } catch (error) {
        console.error('Error filtering events:', error);
    }
}

// Filter events by search term
function filterEventsBySearch(searchTerm) {
    const events = JSON.parse(localStorage.getItem('events') || '[]');
    const filteredEvents = events.filter(event => 
        event.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        event.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        event.venue.toLowerCase().includes(searchTerm.toLowerCase())
    );
    
    displayEvents(filteredEvents);
}

// Handle reaction to event
function handleReaction(event) {
    event.preventDefault();
    
    const currentUser = JSON.parse(localStorage.getItem('currentUser'));
    const eventId = this.dataset.eventId;
    const reactionType = this.dataset.reaction;
    
    // Get existing reactions
    const reactions = JSON.parse(localStorage.getItem('eventReactions') || '[]');
    
    // Remove any existing reaction from this user for this event
    const filteredReactions = reactions.filter(r => 
        !(r.eventId === eventId && r.userId === currentUser.id)
    );
    
    // Add new reaction
    filteredReactions.push({
        id: Date.now().toString(),
        eventId: eventId,
        userId: currentUser.id,
        userName: currentUser.name,
        reaction: reactionType,
        timestamp: new Date().toISOString()
    });
    
    localStorage.setItem('eventReactions', JSON.stringify(filteredReactions));
    
    // Reload events to update reaction counts
    loadEvents();
}

// Check if user has reacted to an event
function getUserReaction(eventId, reactionType) {
    const currentUser = JSON.parse(localStorage.getItem('currentUser'));
    const reactions = JSON.parse(localStorage.getItem('eventReactions') || '[]');
    
    return reactions.some(r => 
        r.eventId === eventId && 
        r.userId === currentUser.id && 
        r.reaction === reactionType
    );
}

// Show event details in modal
async function showEventDetails(eventId) {
    try {
        const eventsResult = await window.supabaseDB.getEvents();
        const events = eventsResult.success ? eventsResult.data : [];
        const event = events.find(e => e.id === eventId);
        
        if (!event) {
            alert('Event not found');
            return;
        }
        
        const eventDate = new Date(event.event_date || event.date);
        const isPast = eventDate < new Date().setHours(0, 0, 0, 0);
        
        // Update modal title
        document.getElementById('eventModalTitle').textContent = event.title;
        
        // Update event details
        document.getElementById('eventDetails').innerHTML = `
            <div class="row">
                <div class="col-md-6">
                    <p><strong>Date:</strong> ${formatDate(event.event_date || event.date)}</p>
                    <p><strong>Time:</strong> ${event.event_time || event.time}</p>
                    <p><strong>Venue:</strong> ${event.venue}</p>
                </div>
                <div class="col-md-6">
                    <p><strong>Status:</strong> 
                        <span class="badge ${isPast ? 'bg-secondary' : 'bg-success'}">
                            ${isPast ? 'Past Event' : 'Upcoming Event'}
                        </span>
                    </p>
                </div>
            </div>
            <div class="row mt-3">
                <div class="col-12">
                    <h6>Description</h6>
                    <p>${event.description}</p>
                </div>
            </div>
        `;
        
        // Set event ID for comments
        document.getElementById('commentEventId').value = eventId;
        
        // Load comments for this event
        loadEventComments(eventId);
    } catch (error) {
        console.error('Error showing event details:', error);
    }
}

// Load comments for an event
function loadEventComments(eventId) {
    const comments = JSON.parse(localStorage.getItem('eventComments') || '[]');
    const eventComments = comments
        .filter(c => c.eventId === eventId)
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    
    const commentsContainer = document.getElementById('eventComments');
    
    if (eventComments.length === 0) {
        commentsContainer.innerHTML = '<p class="text-muted">No comments yet. Be the first to comment!</p>';
        return;
    }
    
    commentsContainer.innerHTML = eventComments.map(comment => `
        <div class="comment">
            <div class="comment-author">${comment.userName}</div>
            <div class="comment-text">${comment.text}</div>
            <div class="comment-date">${formatDateTime(comment.timestamp)}</div>
        </div>
    `).join('');
}

// Handle comment submission
function handleCommentSubmit(e) {
    e.preventDefault();
    
    const currentUser = JSON.parse(localStorage.getItem('currentUser'));
    const eventId = document.getElementById('commentEventId').value;
    const commentText = document.getElementById('commentText').value.trim();
    
    if (!commentText) {
        alert('Please enter a comment');
        return;
    }
    
    // Get existing comments
    const comments = JSON.parse(localStorage.getItem('eventComments') || '[]');
    
    // Add new comment
    comments.push({
        id: Date.now().toString(),
        eventId: eventId,
        userId: currentUser.id,
        userName: currentUser.name,
        text: commentText,
        timestamp: new Date().toISOString()
    });
    
    localStorage.setItem('eventComments', JSON.stringify(comments));
    
    // Clear comment form
    document.getElementById('commentText').value = '';
    
    // Reload comments
    loadEventComments(eventId);
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