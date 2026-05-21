// Events functionality
document.addEventListener('DOMContentLoaded', function() {
    initEvents();
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
        window.location.href = 'index.html'
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

    // Purchase ticket listeners
    document.getElementById('confirmPurchase').addEventListener('click', handlePurchaseConfirm);
    document.getElementById('printTickets').addEventListener('click', handlePrintTickets);
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
        const events = JSON.parse(localStorage.getItem('events') || '[]');
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
        const events = JSON.parse(localStorage.getItem('events') || '[]');
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
        const events = JSON.parse(localStorage.getItem('events') || '[]');
        const event = events.find(e => e.id === eventId);
        
        if (!event) {
            alert('Event not found');
            return;
        }
        
        const eventDate = new Date(event.event_date || event.date);
        const isPast = eventDate < new Date().setHours(0, 0, 0, 0);
        
        // Update modal title
        document.getElementById('eventModalTitle').textContent = event.title;
        
        // Build ticket tiers display
        let ticketTiersHtml = '';
        if (event.tickets) {
            const purchasedTickets = JSON.parse(localStorage.getItem('purchasedTickets') || '[]');
            const eventPurchases = purchasedTickets.filter(t => t.eventId === event.id);

            const tiers = [
                { key: 'regular', label: 'Regular' },
                { key: 'vip', label: 'VIP' },
                { key: 'vvip', label: 'VVIP' }
            ];

            tiers.forEach(tier => {
                const tierData = event.tickets[tier.key];
                if (tierData && tierData.total > 0) {
                    const sold = eventPurchases.filter(t => t.tier === tier.key).length;
                    const available = Math.max(0, tierData.total - sold);
                    ticketTiersHtml += `
                        <div class="col-md-4 mb-3">
                            <div class="card text-center ${available === 0 ? 'border-danger' : 'border-success'}">
                                <div class="card-body">
                                    <h6 class="card-title">${tier.label}</h6>
                                    <h4 class="text-primary">GHS ${tierData.price.toFixed(2)}</h4>
                                    <p class="mb-0 ${available === 0 ? 'text-danger' : 'text-success'}">
                                        ${available === 0 ? 'Sold Out' : available + ' tickets available'}
                                    </p>
                                </div>
                            </div>
                        </div>
                    `;
                }
            });
        }

        // Update event details - only show ticket tier prices and availability
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
            ${ticketTiersHtml ? `
                <hr>
                <h6>Tickets</h6>
                <div class="row">${ticketTiersHtml}</div>
                ${!isPast ? `
                    <div class="text-center mt-2">
                        <button class="btn btn-success btn-lg" id="buyTicketsBtn" data-event-id="${event.id}">
                            <i class="fas fa-ticket-alt me-2"></i>Buy Tickets
                        </button>
                    </div>
                ` : ''}
            ` : ''}
        `;

        // Attach buy tickets listener
        const buyBtn = document.getElementById('buyTicketsBtn');
        if (buyBtn) {
            buyBtn.addEventListener('click', function() {
                openPurchaseModal(this.dataset.eventId);
            });
        }
        
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

// Generate a unique ticket ID
function generateTicketId() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let id = 'TKT-';
    for (let i = 0; i < 8; i++) {
        id += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    id += '-' + Date.now().toString(36).toUpperCase();
    return id;
}

// Open purchase modal for an event
function openPurchaseModal(eventId) {
    const events = JSON.parse(localStorage.getItem('events') || '[]');
    const event = events.find(e => e.id === eventId);
    if (!event || !event.tickets) return;

    document.getElementById('purchaseEventId').value = eventId;

    const purchasedTickets = JSON.parse(localStorage.getItem('purchasedTickets') || '[]');
    const eventPurchases = purchasedTickets.filter(t => t.eventId === eventId);

    const tiers = [
        { key: 'regular', label: 'Regular' },
        { key: 'vip', label: 'VIP' },
        { key: 'vvip', label: 'VVIP' }
    ];

    let selectionHtml = '<h6>' + event.title + '</h6><p class="text-muted">Select the number of tickets per tier</p>';
    selectionHtml += '<table class="table"><thead><tr><th>Tier</th><th>Price</th><th>Available</th><th>Quantity</th></tr></thead><tbody>';

    tiers.forEach(tier => {
        const tierData = event.tickets[tier.key];
        if (tierData && tierData.total > 0) {
            const sold = eventPurchases.filter(t => t.tier === tier.key).length;
            const available = Math.max(0, tierData.total - sold);
            selectionHtml += `
                <tr>
                    <td><strong>${tier.label}</strong></td>
                    <td>GHS ${tierData.price.toFixed(2)}</td>
                    <td>${available}</td>
                    <td>
                        <input type="number" class="form-control ticket-qty" 
                               data-tier="${tier.key}" data-price="${tierData.price}" 
                               min="0" max="${available}" value="0" 
                               ${available === 0 ? 'disabled' : ''}>
                    </td>
                </tr>
            `;
        }
    });

    selectionHtml += '</tbody></table>';
    selectionHtml += '<p class="text-info small"><i class="fas fa-info-circle me-1"></i>A 10% booking fee applies per ticket.</p>';

    document.getElementById('ticketSelectionArea').innerHTML = selectionHtml;
    document.getElementById('purchaseSummary').classList.add('d-none');

    // Attach quantity change listeners to update summary
    document.querySelectorAll('.ticket-qty').forEach(input => {
        input.addEventListener('input', updatePurchaseSummary);
    });

    // Close event details modal and open purchase modal
    const eventModal = bootstrap.Modal.getInstance(document.getElementById('eventModal'));
    if (eventModal) eventModal.hide();

    setTimeout(() => {
        const purchaseModal = new bootstrap.Modal(document.getElementById('purchaseModal'));
        purchaseModal.show();
    }, 300);
}

// Update purchase summary with booking fee
function updatePurchaseSummary() {
    const qtyInputs = document.querySelectorAll('.ticket-qty');
    let summaryHtml = '<table class="table table-sm"><thead><tr><th>Tier</th><th>Qty</th><th>Unit Price</th><th>Booking Fee (10%)</th><th>Subtotal</th></tr></thead><tbody>';
    let grandTotal = 0;
    let totalTickets = 0;

    qtyInputs.forEach(input => {
        const qty = parseInt(input.value) || 0;
        if (qty > 0) {
            const price = parseFloat(input.dataset.price);
            const tier = input.dataset.tier;
            const bookingFeePerTicket = price * 0.10;
            const subtotal = qty * (price + bookingFeePerTicket);
            grandTotal += subtotal;
            totalTickets += qty;

            summaryHtml += `
                <tr>
                    <td>${tier.toUpperCase()}</td>
                    <td>${qty}</td>
                    <td>GHS ${price.toFixed(2)}</td>
                    <td>GHS ${bookingFeePerTicket.toFixed(2)}</td>
                    <td>GHS ${subtotal.toFixed(2)}</td>
                </tr>
            `;
        }
    });

    summaryHtml += '</tbody></table>';

    if (totalTickets > 0) {
        summaryHtml += `<h5 class="text-end">Total: GHS ${grandTotal.toFixed(2)}</h5>`;
        summaryHtml += `<p class="text-muted text-end small">${totalTickets} ticket(s) including 10% booking fee per ticket</p>`;
        document.getElementById('summaryDetails').innerHTML = summaryHtml;
        document.getElementById('purchaseSummary').classList.remove('d-none');
    } else {
        document.getElementById('purchaseSummary').classList.add('d-none');
    }
}

// Handle purchase confirmation
function handlePurchaseConfirm() {
    const eventId = document.getElementById('purchaseEventId').value;
    const currentUser = JSON.parse(localStorage.getItem('currentUser'));
    if (!currentUser) {
        alert('You must be logged in to purchase tickets');
        return;
    }

    const events = JSON.parse(localStorage.getItem('events') || '[]');
    const event = events.find(e => e.id === eventId);
    if (!event) {
        alert('Event not found');
        return;
    }

    const qtyInputs = document.querySelectorAll('.ticket-qty');
    const purchasedTickets = JSON.parse(localStorage.getItem('purchasedTickets') || '[]');
    const eventPurchases = purchasedTickets.filter(t => t.eventId === eventId);
    const newTickets = [];

    let hasSelection = false;

    qtyInputs.forEach(input => {
        const qty = parseInt(input.value) || 0;
        if (qty > 0) {
            hasSelection = true;
            const tier = input.dataset.tier;
            const price = parseFloat(input.dataset.price);
            const bookingFee = price * 0.10;

            // Check availability
            const tierData = event.tickets[tier];
            const sold = eventPurchases.filter(t => t.tier === tier).length;
            const available = tierData.total - sold;

            if (qty > available) {
                alert('Not enough ' + tier.toUpperCase() + ' tickets available. Only ' + available + ' left.');
                return;
            }

            // Generate individual tickets with unique IDs and QR codes
            for (let i = 0; i < qty; i++) {
                const ticketId = generateTicketId();
                newTickets.push({
                    ticketId: ticketId,
                    eventId: eventId,
                    eventTitle: event.title,
                    eventDate: event.event_date || event.date,
                    eventTime: event.event_time || event.time,
                    eventVenue: event.venue,
                    tier: tier,
                    price: price,
                    bookingFee: bookingFee,
                    totalPrice: price + bookingFee,
                    buyerId: currentUser.id,
                    buyerName: currentUser.name,
                    purchaseDate: new Date().toISOString()
                });
            }
        }
    });

    if (!hasSelection) {
        alert('Please select at least one ticket');
        return;
    }

    if (newTickets.length === 0) return;

    // Save purchased tickets
    purchasedTickets.push(...newTickets);
    localStorage.setItem('purchasedTickets', JSON.stringify(purchasedTickets));

    // Close purchase modal
    const purchaseModal = bootstrap.Modal.getInstance(document.getElementById('purchaseModal'));
    if (purchaseModal) purchaseModal.hide();

    // Show confirmation with QR codes
    setTimeout(() => {
        showTicketConfirmation(newTickets);
    }, 300);
}

// Show ticket confirmation with unique QR codes
function showTicketConfirmation(tickets) {
    let ticketsHtml = '';

    tickets.forEach((ticket, index) => {
        ticketsHtml += `
            <div class="card mb-3">
                <div class="card-body">
                    <div class="row align-items-center">
                        <div class="col-md-8">
                            <h6 class="mb-1">${ticket.eventTitle}</h6>
                            <p class="mb-1"><strong>Ticket ID:</strong> <code>${ticket.ticketId}</code></p>
                            <p class="mb-1"><strong>Tier:</strong> ${ticket.tier.toUpperCase()}</p>
                            <p class="mb-1"><strong>Date:</strong> ${formatDate(ticket.eventDate)}</p>
                            <p class="mb-1"><strong>Time:</strong> ${ticket.eventTime}</p>
                            <p class="mb-1"><strong>Venue:</strong> ${ticket.eventVenue}</p>
                            <p class="mb-1"><strong>Price:</strong> GHS ${ticket.price.toFixed(2)}</p>
                            <p class="mb-1"><strong>Booking Fee (10%):</strong> GHS ${ticket.bookingFee.toFixed(2)}</p>
                            <p class="mb-0"><strong>Total:</strong> GHS ${ticket.totalPrice.toFixed(2)}</p>
                        </div>
                        <div class="col-md-4 text-center">
                            <div id="qrcode-${index}" class="qr-code-container mb-2"></div>
                            <small class="text-muted">${ticket.ticketId}</small>
                        </div>
                    </div>
                </div>
            </div>
        `;
    });

    document.getElementById('ticketsList').innerHTML = ticketsHtml;

    const confirmModal = new bootstrap.Modal(document.getElementById('ticketConfirmationModal'));
    confirmModal.show();

    // Generate QR codes after modal is shown
    setTimeout(() => {
        tickets.forEach((ticket, index) => {
            const qrContainer = document.getElementById('qrcode-' + index);
            if (qrContainer) {
                qrContainer.innerHTML = '';
                new QRCode(qrContainer, {
                    text: JSON.stringify({
                        ticketId: ticket.ticketId,
                        event: ticket.eventTitle,
                        tier: ticket.tier,
                        date: ticket.eventDate,
                        buyer: ticket.buyerName
                    }),
                    width: 128,
                    height: 128,
                    colorDark: '#000000',
                    colorLight: '#ffffff',
                    correctLevel: QRCode.CorrectLevel.M
                });
            }
        });
    }, 500);
}

// Handle print tickets
function handlePrintTickets() {
    const ticketsList = document.getElementById('ticketsList');
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Event Tickets</title>
            <style>
                body { font-family: Arial, sans-serif; margin: 20px; }
                .ticket { border: 2px dashed #333; padding: 20px; margin-bottom: 20px; page-break-inside: avoid; }
                .ticket-header { text-align: center; margin-bottom: 15px; }
                .ticket-details { display: flex; justify-content: space-between; }
                .ticket-info { flex: 1; }
                .ticket-qr { text-align: center; }
                .ticket-id { font-family: monospace; font-size: 14px; text-align: center; margin-top: 5px; }
                code { background: #f0f0f0; padding: 2px 6px; border-radius: 3px; }
            </style>
        </head>
        <body>
            ${ticketsList.innerHTML}
        </body>
        </html>
    `);
    printWindow.document.close();
    setTimeout(() => {
        printWindow.print();
    }, 1000);
}