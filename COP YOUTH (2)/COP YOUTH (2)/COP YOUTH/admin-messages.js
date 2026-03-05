// Admin Messages Management functionality
document.addEventListener('DOMContentLoaded', function() {
    // Check if admin is logged in
    checkAdminAuth();
    
    // Initialize messages management
    initializeMessagesManagement();
    
    // Setup event listeners
    setupMessagesEventListeners();
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

// Initialize messages management
function initializeMessagesManagement() {
    loadMessagesData();
}

// Setup event listeners
function setupMessagesEventListeners() {
    // Sidebar toggle
    document.getElementById('menuToggle').addEventListener('click', toggleSidebar);
    document.getElementById('sidebarToggle').addEventListener('click', toggleSidebar);
    
    // Logout
    document.getElementById('logoutBtn').addEventListener('click', function() {
        localStorage.removeItem('currentUser');
        window.location.href = 'index.html?admin=true';
    });
    
    // Filter buttons
    document.getElementById('filterAllMessages').addEventListener('click', function() {
        setActiveMessageFilter('all');
        loadConversations('all');
    });
    
    document.getElementById('filterUnreadMessages').addEventListener('click', function() {
        setActiveMessageFilter('unread');
        loadConversations('unread');
    });
    
    // Send message
    document.getElementById('sendMessageForm').addEventListener('submit', sendMessage);
    
    // Mark as read
    document.getElementById('markAsRead').addEventListener('click', markConversationAsRead);
    
    // Delete conversation
    document.getElementById('deleteConversation').addEventListener('click', deleteConversation);
    
    // Broadcast message
    document.getElementById('sendBroadcast').addEventListener('click', sendBroadcastMessage);
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

// Set active message filter
function setActiveMessageFilter(filterType) {
    // Remove active class from all buttons
    document.querySelectorAll('#filterAllMessages, #filterUnreadMessages').forEach(btn => {
        btn.classList.remove('active');
    });
    
    // Add active class to clicked button
    document.getElementById(`filter${filterType.charAt(0).toUpperCase() + filterType.slice(1)}Messages`).classList.add('active');
}

// Load all messages data
function loadMessagesData() {
    const messages = JSON.parse(localStorage.getItem('messages') || '[]');
    const members = JSON.parse(localStorage.getItem('members') || '[]');
    
    // Calculate statistics
    const totalMessages = messages.length;
    const unreadMessages = messages.filter(m => !m.read && !m.isAdmin).length;
    const repliedMessages = messages.filter(m => m.isAdmin).length;
    
    const today = new Date().toISOString().split('T')[0];
    const todayMessages = messages.filter(m => m.timestamp.split('T')[0] === today).length;
    
    // Update statistics
    document.getElementById('totalMessages').textContent = totalMessages;
    document.getElementById('unreadMessages').textContent = unreadMessages;
    document.getElementById('repliedMessages').textContent = repliedMessages;
    document.getElementById('todayMessages').textContent = todayMessages;
    
    // Update sidebar badge
    document.getElementById('unreadMessagesCount').textContent = unreadMessages;
    
    // Load conversations
    loadConversations('all');
}

// Load conversations
function loadConversations(filterType) {
    const messages = JSON.parse(localStorage.getItem('messages') || '[]');
    const members = JSON.parse(localStorage.getItem('members') || '[]');
    
    // Get unique conversations (group by sender)
    const conversations = {};
    
    messages.forEach(message => {
        if (!message.isAdmin) { // Only show member-initiated conversations
            const senderId = message.senderId;
            
            if (!conversations[senderId]) {
                const sender = members.find(m => m.id === senderId);
                conversations[senderId] = {
                    senderId: senderId,
                    senderName: sender ? sender.name : 'Unknown Member',
                    messages: [],
                    lastMessage: null,
                    unread: false
                };
            }
            
            conversations[senderId].messages.push(message);
            
            // Update last message
            if (!conversations[senderId].lastMessage || 
                new Date(message.timestamp) > new Date(conversations[senderId].lastMessage.timestamp)) {
                conversations[senderId].lastMessage = message;
            }
            
            // Check if there are unread messages
            if (!message.read) {
                conversations[senderId].unread = true;
            }
        }
    });
    
    let filteredConversations = Object.values(conversations);
    
    // Apply filter
    if (filterType === 'unread') {
        filteredConversations = filteredConversations.filter(conv => conv.unread);
    }
    
    displayConversations(filteredConversations);
}

// Display conversations
function displayConversations(conversations) {
    const conversationsList = document.getElementById('conversationsList');
    
    if (conversations.length === 0) {
        conversationsList.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-envelope-open"></i>
                <h5>No Conversations</h5>
                <p>${document.getElementById('filterUnreadMessages').classList.contains('active') ? 
                    'No unread messages' : 'No messages from members yet'}</p>
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
            <div class="${conversationClass}" data-sender-id="${conversation.senderId}">
                <div class="conversation-subject">${lastMessage.subject || 'General Inquiry'}</div>
                <div class="conversation-member">From: ${conversation.senderName}</div>
                <div class="conversation-preview">${preview}</div>
                <div class="conversation-meta">
                    <span>${formatDateTime(lastMessage.timestamp)}</span>
                    ${conversation.unread ? '<span class="badge bg-danger">New</span>' : ''}
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
            loadConversation(this.dataset.senderId);
        });
    });
    
    // Auto-select first conversation if none selected
    if (conversations.length > 0 && !document.querySelector('.conversation-item.active')) {
        const firstConversation = document.querySelector('.conversation-item');
        if (firstConversation) {
            firstConversation.click();
        }
    }
}

// Load conversation messages
function loadConversation(senderId) {
    const messages = JSON.parse(localStorage.getItem('messages') || '[]');
    const members = JSON.parse(localStorage.getItem('members') || '[]');
    
    // Filter messages for this conversation
    const conversationMessages = messages.filter(message => 
        message.senderId === senderId || message.receiverId === senderId
    ).sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    
    const sender = members.find(m => m.id === senderId);
    
    // Mark messages as read
    conversationMessages.forEach(message => {
        if (message.receiverId === 'admin' && !message.read) {
            message.read = true;
        }
    });
    
    // Save updated messages
    localStorage.setItem('messages', JSON.stringify(messages));
    
    // Update conversation list to remove unread indicator
    const conversationItem = document.querySelector(`[data-sender-id="${senderId}"]`);
    if (conversationItem) {
        conversationItem.classList.remove('unread');
        conversationItem.querySelector('.badge').remove();
    }
    
    displayConversation(conversationMessages, sender);
    
    // Show conversation actions
    document.getElementById('conversationActions').style.display = 'flex';
}

// Display conversation messages
function displayConversation(messages, sender) {
    const messageThread = document.getElementById('messageThread');
    const conversationTitle = document.getElementById('conversationTitle');
    const messageInput = document.getElementById('messageInput');
    
    // Update conversation title
    conversationTitle.textContent = `Conversation with ${sender ? sender.name : 'Member'}`;
    
    // Show message input
    messageInput.style.display = 'block';
    
    // Store current sender ID for sending messages
    document.getElementById('sendMessageForm').dataset.senderId = sender.id;
    
    if (messages.length === 0) {
        messageThread.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-comments"></i>
                <h5>No Messages</h5>
                <p>Start the conversation with ${sender.name}</p>
            </div>
        `;
        return;
    }
    
    // Group messages by date
    const messagesByDate = {};
    messages.forEach(message => {
        const date = message.timestamp.split('T')[0];
        if (!messagesByDate[date]) {
            messagesByDate[date] = [];
        }
        messagesByDate[date].push(message);
    });
    
    let threadHTML = '';
    
    Object.keys(messagesByDate).sort().forEach(date => {
        // Add date separator
        threadHTML += `
            <div class="date-separator">
                <span>${formatDate(date)}</span>
            </div>
        `;
        
        // Add messages for this date
        messagesByDate[date].forEach(message => {
            const isSent = message.isAdmin;
            const messageClass = `message ${isSent ? 'sent' : 'received'}`;
            const senderName = isSent ? 'You' : (sender ? sender.name : 'Member');
            
            threadHTML += `
                <div class="${messageClass}">
                    <div class="message-header">
                        <span class="message-sender">${senderName}</span>
                        <span class="message-status ${message.read ? 'read' : 'unread'}">
                            ${isSent ? (message.read ? '✓ Read' : '✓ Delivered') : ''}
                        </span>
                    </div>
                    <div class="message-content">${message.content}</div>
                    <div class="message-time">${formatTime(message.timestamp)}</div>
                </div>
            `;
        });
    });
    
    messageThread.innerHTML = threadHTML;
    
    // Scroll to bottom of message thread
    messageThread.scrollTop = messageThread.scrollHeight;
    
    // Reload statistics to update unread count
    loadMessagesData();
}

// Send message
function sendMessage(e) {
    e.preventDefault();
    
    const senderId = this.dataset.senderId;
    const content = document.getElementById('messageText').value.trim();
    
    if (!content) {
        alert('Please enter a message');
        return;
    }
    
    const currentUser = JSON.parse(localStorage.getItem('currentUser'));
    const members = JSON.parse(localStorage.getItem('members') || '[]');
    const sender = members.find(m => m.id === senderId);
    
    // Create new message
    const newMessage = {
        id: Date.now().toString(),
        senderId: 'admin',
        senderName: currentUser.name,
        receiverId: senderId,
        receiverName: sender ? sender.name : 'Member',
        subject: 'Reply from Admin',
        content: content,
        timestamp: new Date().toISOString(),
        read: false,
        isAdmin: true
    };
    
    // Save message
    const messages = JSON.parse(localStorage.getItem('messages') || '[]');
    messages.push(newMessage);
    localStorage.setItem('messages', JSON.stringify(messages));
    
    // Clear input
    document.getElementById('messageText').value = '';
    
    // Reload conversation
    loadConversation(senderId);
    
    // Record activity
    recordAdminActivity(`Replied to message from ${sender ? sender.name : 'member'}`);
}

// Mark conversation as read
function markConversationAsRead() {
    const activeConversation = document.querySelector('.conversation-item.active');
    if (!activeConversation) return;
    
    const senderId = activeConversation.dataset.senderId;
    const messages = JSON.parse(localStorage.getItem('messages') || '[]');
    
    // Mark all messages from this sender as read
    messages.forEach(message => {
        if (message.senderId === senderId && !message.isAdmin && !message.read) {
            message.read = true;
        }
    });
    
    localStorage.setItem('messages', JSON.stringify(messages));
    
    // Update UI
    activeConversation.classList.remove('unread');
    if (activeConversation.querySelector('.badge')) {
        activeConversation.querySelector('.badge').remove();
    }
    
    // Reload statistics
    loadMessagesData();
    
    alert('Conversation marked as read');
}

// Delete conversation
function deleteConversation() {
    const activeConversation = document.querySelector('.conversation-item.active');
    if (!activeConversation) return;
    
    const senderId = activeConversation.dataset.senderId;
    const senderName = activeConversation.querySelector('.conversation-member').textContent.replace('From: ', '');
    
    if (!confirm(`Are you sure you want to delete the conversation with ${senderName}? This action cannot be undone.`)) {
        return;
    }
    
    const messages = JSON.parse(localStorage.getItem('messages') || '[]');
    
    // Remove all messages from this conversation
    const filteredMessages = messages.filter(message => 
        message.senderId !== senderId && message.receiverId !== senderId
    );
    
    localStorage.setItem('messages', JSON.stringify(filteredMessages));
    
    // Clear conversation view
    document.getElementById('messageThread').innerHTML = `
        <div class="empty-state">
            <i class="fas fa-comments"></i>
            <h5>Select a Conversation</h5>
            <p>Choose a conversation from the list to view messages</p>
        </div>
    `;
    document.getElementById('conversationTitle').textContent = 'Select a conversation';
    document.getElementById('messageInput').style.display = 'none';
    document.getElementById('conversationActions').style.display = 'none';
    
    // Remove conversation from list
    activeConversation.remove();
    
    // Record activity
    recordAdminActivity(`Deleted conversation with ${senderName}`);
    
    // Reload statistics
    loadMessagesData();
    
    alert('Conversation deleted successfully!');
}

// Send broadcast message
function sendBroadcastMessage() {
    const subject = document.getElementById('broadcastSubject').value.trim();
    const content = document.getElementById('broadcastMessage').value.trim();
    const broadcastTo = document.querySelector('input[name="broadcastTo"]:checked').value;
    
    if (!subject || !content) {
        alert('Please fill in all required fields');
        return;
    }
    
    const currentUser = JSON.parse(localStorage.getItem('currentUser'));
    const members = JSON.parse(localStorage.getItem('members') || '[]');
    const messages = JSON.parse(localStorage.getItem('messages') || '[]');
    
    // Filter members based on selection
    let targetMembers = members.filter(m => m.status === 'approved');
    if (broadcastTo === 'active') {
        targetMembers = targetMembers.filter(m => m.active);
    }
    
    let broadcastCount = 0;
    
    // Create broadcast messages for each member
    targetMembers.forEach(member => {
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
    
    // Record activity
    recordAdminActivity(`Sent broadcast message to ${broadcastCount} members: ${subject}`);
    
    alert(`Broadcast message sent successfully to ${broadcastCount} members!`);
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

// Helper function to format time only
function formatTime(dateTimeString) {
    const options = { 
        hour: '2-digit',
        minute: '2-digit'
    };
    return new Date(dateTimeString).toLocaleTimeString(undefined, options);
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