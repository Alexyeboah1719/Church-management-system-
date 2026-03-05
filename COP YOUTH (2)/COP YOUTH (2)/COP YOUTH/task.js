// Tasks functionality
document.addEventListener('DOMContentLoaded', function() {
    // Check if user is logged in
    checkAuth();
    
    // Initialize tasks page
    initializeTasksPage();
    
    // Setup event listeners
    setupTasksEventListeners();
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

// Initialize tasks page
function initializeTasksPage() {
    loadTasks();
    updateTaskStatistics();
}

// Setup event listeners
function setupTasksEventListeners() {
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
            
            // Filter tasks
            filterTasks(this.dataset.filter);
        });
    });
    
    // Search tasks
    document.getElementById('searchTasks').addEventListener('input', function() {
        filterTasksBySearch(this.value);
    });
    
    // Update task status
    document.getElementById('updateTaskStatus').addEventListener('click', updateTaskStatus);
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

// Load tasks for current user
function loadTasks() {
    const currentUser = JSON.parse(localStorage.getItem('currentUser'));
    const tasks = JSON.parse(localStorage.getItem('tasks') || '[]');
    const userTasks = tasks.filter(task => task.assignedTo === currentUser.id);
    
    // Sort by due date (soonest first)
    const sortedTasks = userTasks.sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));
    
    displayTasks(sortedTasks);
}

// Display tasks
function displayTasks(tasks) {
    const tasksList = document.getElementById('tasksList');
    
    if (tasks.length === 0) {
        tasksList.innerHTML = `
            <div class="text-center py-5">
                <i class="fas fa-tasks fa-3x text-muted mb-3"></i>
                <h4 class="text-muted">No Tasks Assigned</h4>
                <p class="text-muted">You don't have any tasks assigned at the moment.</p>
            </div>
        `;
        return;
    }
    
    tasksList.innerHTML = tasks.map(task => {
        const taskDueDate = new Date(task.dueDate);
        const isOverdue = taskDueDate < new Date().setHours(0, 0, 0, 0) && task.status !== 'completed';
        const taskClass = `task-item ${task.status} ${isOverdue ? 'overdue' : ''}`;
        
        // Get event details if associated with an event
        const events = JSON.parse(localStorage.getItem('events') || '[]');
        const event = events.find(e => e.id === task.eventId);
        
        return `
            <div class="${taskClass}" data-task-id="${task.id}">
                <div class="d-flex justify-content-between align-items-start mb-2">
                    <div>
                        <h5 class="mb-1">${task.title}</h5>
                        ${task.priority ? `
                            <span class="task-priority priority-${task.priority}">
                                ${task.priority.charAt(0).toUpperCase() + task.priority.slice(1)} Priority
                            </span>
                        ` : ''}
                    </div>
                    <div>
                        <span class="badge status-badge ${getStatusBadgeClass(task.status)}">
                            ${task.status.charAt(0).toUpperCase() + task.status.slice(1)}
                        </span>
                    </div>
                </div>
                
                <p class="mb-2">${task.description}</p>
                
                ${event ? `
                    <p class="mb-2 small text-muted">
                        <i class="fas fa-calendar me-1"></i>For: ${event.title}
                    </p>
                ` : ''}
                
                <div class="d-flex justify-content-between align-items-center">
                    <div class="task-due-date ${isOverdue ? 'overdue' : ''}">
                        <i class="fas fa-clock me-1"></i>
                        Due: ${formatDate(task.dueDate)}
                        ${isOverdue ? ' (Overdue)' : ''}
                    </div>
                    <button class="btn btn-outline-primary btn-sm view-task" 
                            data-task-id="${task.id}" 
                            data-bs-toggle="modal" 
                            data-bs-target="#taskModal">
                        View Details
                    </button>
                </div>
                
                ${task.status === 'in-progress' ? `
                    <div class="mt-2">
                        <div class="d-flex justify-content-between align-items-center mb-1">
                            <small>Progress</small>
                            <small>${task.progress || 0}%</small>
                        </div>
                        <div class="task-progress">
                            <div class="task-progress-bar" style="width: ${task.progress || 0}%"></div>
                        </div>
                    </div>
                ` : ''}
            </div>
        `;
    }).join('');
    
    // Add event listeners to view task buttons
    document.querySelectorAll('.view-task').forEach(button => {
        button.addEventListener('click', function() {
            showTaskDetails(this.dataset.taskId);
        });
    });
}

// Filter tasks by status
function filterTasks(filterType) {
    const currentUser = JSON.parse(localStorage.getItem('currentUser'));
    const tasks = JSON.parse(localStorage.getItem('tasks') || '[]');
    let userTasks = tasks.filter(task => task.assignedTo === currentUser.id);
    
    if (filterType !== 'all') {
        userTasks = userTasks.filter(task => task.status === filterType);
    }
    
    displayTasks(userTasks);
}

// Filter tasks by search term
function filterTasksBySearch(searchTerm) {
    const currentUser = JSON.parse(localStorage.getItem('currentUser'));
    const tasks = JSON.parse(localStorage.getItem('tasks') || '[]');
    let userTasks = tasks.filter(task => task.assignedTo === currentUser.id);
    
    if (searchTerm) {
        userTasks = userTasks.filter(task => 
            task.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
            task.description.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }
    
    displayTasks(userTasks);
}

// Update task statistics
function updateTaskStatistics() {
    const currentUser = JSON.parse(localStorage.getItem('currentUser'));
    const tasks = JSON.parse(localStorage.getItem('tasks') || '[]');
    const userTasks = tasks.filter(task => task.assignedTo === currentUser.id);
    
    const totalTasks = userTasks.length;
    const pendingTasks = userTasks.filter(task => task.status === 'pending').length;
    const progressTasks = userTasks.filter(task => task.status === 'in-progress').length;
    const completedTasks = userTasks.filter(task => task.status === 'completed').length;
    
    document.getElementById('totalTasksCount').textContent = totalTasks;
    document.getElementById('pendingTasksCount').textContent = pendingTasks;
    document.getElementById('progressTasksCount').textContent = progressTasks;
    document.getElementById('completedTasksCount').textContent = completedTasks;
}

// Show task details in modal
function showTaskDetails(taskId) {
    const tasks = JSON.parse(localStorage.getItem('tasks') || '[]');
    const task = tasks.find(t => t.id === taskId);
    
    if (!task) {
        alert('Task not found');
        return;
    }
    
    // Get event details if associated with an event
    const events = JSON.parse(localStorage.getItem('events') || '[]');
    const event = events.find(e => e.id === task.eventId);
    
    // Get assigned member details
    const members = JSON.parse(localStorage.getItem('members') || '[]');
    const assignedMember = members.find(m => m.id === task.assignedTo);
    
    // Update modal title
    document.getElementById('taskModalTitle').textContent = task.title;
    
    // Update task details
    document.getElementById('taskDetails').innerHTML = `
        <div class="mb-3">
            <strong>Description:</strong>
            <p>${task.description}</p>
        </div>
        
        <div class="row mb-3">
            <div class="col-md-6">
                <p><strong>Status:</strong> 
                    <span class="badge ${getStatusBadgeClass(task.status)}">
                        ${task.status.charAt(0).toUpperCase() + task.status.slice(1)}
                    </span>
                </p>
            </div>
            <div class="col-md-6">
                <p><strong>Priority:</strong> 
                    <span class="badge ${getPriorityBadgeClass(task.priority)}">
                        ${task.priority ? task.priority.charAt(0).toUpperCase() + task.priority.slice(1) : 'Normal'}
                    </span>
                </p>
            </div>
        </div>
        
        <div class="row mb-3">
            <div class="col-md-6">
                <p><strong>Due Date:</strong> ${formatDate(task.dueDate)}</p>
            </div>
            <div class="col-md-6">
                <p><strong>Assigned Date:</strong> ${formatDate(task.assignedDate)}</p>
            </div>
        </div>
        
        ${event ? `
            <div class="mb-3">
                <p><strong>Related Event:</strong> ${event.title}</p>
                <p class="small text-muted mb-0">
                    <i class="fas fa-calendar me-1"></i>${formatDate(event.date)}
                    <i class="fas fa-clock ms-2 me-1"></i>${event.time}
                    <i class="fas fa-map-marker-alt ms-2 me-1"></i>${event.venue}
                </p>
            </div>
        ` : ''}
        
        ${assignedMember ? `
            <div class="mb-3">
                <p><strong>Assigned To:</strong> ${assignedMember.name}</p>
            </div>
        ` : ''}
        
        ${task.status === 'in-progress' ? `
            <div class="mb-3">
                <label for="taskProgress" class="form-label">Progress: ${task.progress || 0}%</label>
                <input type="range" class="form-range" id="taskProgress" min="0" max="100" value="${task.progress || 0}">
            </div>
        ` : ''}
        
        <div class="mb-3">
            <label for="taskStatus" class="form-label">Update Status:</label>
            <select class="form-select" id="taskStatus">
                <option value="pending" ${task.status === 'pending' ? 'selected' : ''}>Pending</option>
                <option value="in-progress" ${task.status === 'in-progress' ? 'selected' : ''}>In Progress</option>
                <option value="completed" ${task.status === 'completed' ? 'selected' : ''}>Completed</option>
            </select>
        </div>
    `;
    
    // Store current task ID for updating
    document.getElementById('updateTaskStatus').dataset.taskId = taskId;
}

// Update task status
function updateTaskStatus() {
    const taskId = this.dataset.taskId;
    const newStatus = document.getElementById('taskStatus').value;
    const progress = document.getElementById('taskProgress') ? document.getElementById('taskProgress').value : 0;
    
    const tasks = JSON.parse(localStorage.getItem('tasks') || '[]');
    const taskIndex = tasks.findIndex(t => t.id === taskId);
    
    if (taskIndex !== -1) {
        tasks[taskIndex].status = newStatus;
        
        if (newStatus === 'in-progress') {
            tasks[taskIndex].progress = parseInt(progress);
        } else if (newStatus === 'completed') {
            tasks[taskIndex].progress = 100;
        }
        
        localStorage.setItem('tasks', JSON.stringify(tasks));
        
        // Close modal
        const modal = bootstrap.Modal.getInstance(document.getElementById('taskModal'));
        modal.hide();
        
        // Reload tasks
        loadTasks();
        updateTaskStatistics();
        
        alert('Task status updated successfully!');
    }
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

// Helper function to get priority badge class
function getPriorityBadgeClass(priority) {
    switch (priority) {
        case 'high': return 'bg-danger';
        case 'medium': return 'bg-warning';
        case 'low': return 'bg-success';
        default: return 'bg-secondary';
    }
}

// Helper function to format date
function formatDate(dateString) {
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    return new Date(dateString).toLocaleDateString(undefined, options);
}