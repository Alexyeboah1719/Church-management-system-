// Messages functionality
document.addEventListener('DOMContentLoaded', function() {
    // Check if user is logged in
    checkAuth();
    
    // Initialize messages page
    initializeMessagesPage();
    
    // Setup event listeners
    setupMessagesEventListeners();
});

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

// Initialize messages page
function initializeMessagesPage() {
    loadConversations();
}

// Setup event listeners
function setupMessagesEventListeners() {
    // Sidebar toggle
    document.getElementById('menuToggle').addEventListener('click', toggleSidebar);
    document.getElementById('sidebarToggle').addEventListener('click', toggleSidebar);
    
    // Logout
    document.getElementById('logoutBtn').addEventListener('click', function() {
        localStorage.removeItem('currentUser');
        window.location.href = 'index.html';
    });
    
    // New message form
    document.getElementById('sendNewMessage').addEventListener('click', sendNewMessage);
    document.getElementById('sendMessageForm').addEventListener('submit', sendMessage);
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

// Load conversations for current user
function loadConversations() {
    const currentUser = JSON.parse(localStorage.getItem('currentUser'));
    const messages = JSON.parse(localStorage.getItem('messages') || '[]');
    
    // Get unique conversations (group by subject)
    const conversations = {};
    
    messages.forEach(message => {
        if (message.senderId === currentUser.id || message.receiverId === currentUser.id) {
            const conversationKey = message.subject || 'General Inquiry';
            
            if (!conversations[conversationKey]) {
                conversations[conversationKey] = {
                    subject: conversationKey,
                    messages: [],
                    lastMessage: null,
                    unread: false
                };
            }
            
            conversations[conversationKey].messages.push(message);
            
            // Update last message
            if (!conversations[conversationKey].lastMessage || 
                new Date(message.timestamp) > new Date(conversations[conversationKey].lastMessage.timestamp)) {
                conversations[conversationKey].lastMessage = message;
            }
            
            // Check if there are unread messages
            if (message.receiverId === currentUser.id && !message.read) {
                conversations[conversationKey].unread = true;
            }
        }
    });
    
    displayConversations(Object.values(conversations));
}

// Display conversations
function displayConversations(conversations) {
    const conversationsList = document.getElementById('conversationsList');
    
    if (conversations.length === 0) {
        conversationsList.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-envelope-open"></i>
                <h5>No Messages</h5>
                <p>Start a conversation with the admin</p>
            </div>
        `;
        return;
    }
    
    // Sort conversations by last message date (newest first)
    conversations.sort((a, b) => new Date(b.lastMessage.timestamp) - new Date(a.lastMessage.timestamp));
    
    conversationsList.innerHTML = conversations.map(conversation => {
        const lastMessage = conversation.lastMessage;
        const preview = lastMessage.content.length > 50 ? 
            lastMessage.content.substring(0, 50) + '...' : lastMessage.content;
        
        const conversationClass = `conversation-item ${conversation.unread ? 'unread' : ''}`;
        
        return `
            <div class="${conversationClass}" data-subject="${conversation.subject}">
                <div class="conversation-subject">${conversation.subject}</div>
                <div class="conversation-preview">${preview}</div>
                <div class="conversation-meta">
                    ${formatDateTime(lastMessage.timestamp)}
                </div>
            </div>
        `;
    }).join('');
    
    // Add event listeners to conversation items
    document.querySelectorAll('.conversation-item').forEach(item => {
        item.addEventListener('click', function() {
            // Remove active class from all items
            document.querySelectorAll('.conversation-item').forEach(i => {
                i.classList.remove('active');
            });
            
            // Add active class to clicked item
            this.classList.add('active');
            
            // Load conversation
            loadConversation(this.dataset.subject);
        });
    });
    
    // Auto-select first conversation
    if (conversations.length > 0) {
        const firstConversation = document.querySelector('.conversation-item');
        if (firstConversation) {
            firstConversation.click();
        }
    }
}

// Load conversation messages
function loadConversation(subject) {
    const currentUser = JSON.parse(localStorage.getItem('currentUser'));
    const messages = JSON.parse(localStorage.getItem('messages') || '[]');
    
    // Filter messages for this conversation
    const conversationMessages = messages.filter(message => 
        (message.senderId === currentUser.id || message.receiverId === currentUser.id) &&
        (message.subject === subject || (!message.subject && subject === 'General Inquiry'))
    ).sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    
    // Mark messages as read
    conversationMessages.forEach(message => {
        if (message.receiverId === currentUser.id && !message.read) {
            message.read = true;
        }
    });
    
    // Save updated messages
    localStorage.setItem('messages', JSON.stringify(messages));
    
    displayConversation(conversationMessages, subject);
}

// Display conversation messages
function displayConversation(messages, subject) {
    const messageThread = document.getElementById('messageThread');
    const conversationTitle = document.getElementById('conversationTitle');
    const messageInput = document.getElementById('messageInput');
    
    // Update conversation title
    conversationTitle.textContent = subject;
    
    // Show message input
    messageInput.classList.remove('d-none');
    
    if (messages.length === 0) {
        messageThread.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-comments"></i>
                <h5>No Messages</h5>
                <p>Start the conversation</p>
            </div>
        `;
        return;
    }
    
    messageThread.innerHTML = messages.map(message => {
        const isSent = message.senderId === JSON.parse(localStorage.getItem('currentUser')).id;
        const messageClass = `message ${isSent ? 'sent' : 'received'}`;
        
        return `
            <div class="${messageClass}">
                <div class="message-header">
                    ${isSent ? 'You' : 'Admin'}
                </div>
                <div class="message-content">${message.content}</div>
                <div class="message-time">${formatTime(message.timestamp)}</div>
            </div>
        `;
    }).join('');
    
    // Scroll to bottom of message thread
    messageThread.scrollTop = messageThread.scrollHeight;
    
    // Set current subject for sending new messages
    document.getElementById('sendMessageForm').dataset.subject = subject;
}

// Send new message (from modal)
function sendNewMessage() {
    const subject = document.getElementById('messageSubject').value.trim();
    const content = document.getElementById('messageContent').value.trim();
    
    if (!subject || !content) {
        alert('Please fill in both subject and message');
        return;
    }
    
    const currentUser = JSON.parse(localStorage.getItem('currentUser'));
    
    // Create new message
    const newMessage = {
        id: Date.now().toString(),
        senderId: currentUser.id,
        senderName: currentUser.name,
        receiverId: 'admin',
        receiverName: 'System Administrator',
        subject: subject,
        content: content,
        timestamp: new Date().toISOString(),
        read: false,
        isAdmin: false
    };
    
    // Save message
    const messages = JSON.parse(localStorage.getItem('messages') || '[]');
    messages.push(newMessage);
    localStorage.setItem('messages', JSON.stringify(messages));
    
    // Close modal
    const modal = bootstrap.Modal.getInstance(document.getElementById('newMessageModal'));
    modal.hide();
    
    // Reset form
    document.getElementById('newMessageForm').reset();
    
    // Reload conversations
    loadConversations();
    
    // Load the new conversation
    setTimeout(() => {
        const newConversation = document.querySelector(`[data-subject="${subject}"]`);
        if (newConversation) {
            newConversation.click();
        }
    }, 100);
    
    alert('Message sent successfully!');
}

// Send message (from conversation)
function sendMessage(e) {
    e.preventDefault();
    
    const subject = this.dataset.subject;
    const content = document.getElementById('messageText').value.trim();
    
    if (!content) {
        alert('Please enter a message');
        return;
    }
    
    const currentUser = JSON.parse(localStorage.getItem('currentUser'));
    
    // Create new message
    const newMessage = {
        id: Date.now().toString(),
        senderId: currentUser.id,
        senderName: currentUser.name,
        receiverId: 'admin',
        receiverName: 'System Administrator',
        subject: subject,
        content: content,
        timestamp: new Date().toISOString(),
        read: false,
        isAdmin: false
    };
    
    // Save message
    const messages = JSON.parse(localStorage.getItem('messages') || '[]');
    messages.push(newMessage);
    localStorage.setItem('messages', JSON.stringify(messages));
    
    // Clear input
    document.getElementById('messageText').value = '';
    
    // Reload conversation
    loadConversation(subject);
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

// Helper function to format time only
function formatTime(dateTimeString) {
    const options = { 
        hour: '2-digit',
        minute: '2-digit'
    };
    return new Date(dateTimeString).toLocaleTimeString(undefined, options);
}