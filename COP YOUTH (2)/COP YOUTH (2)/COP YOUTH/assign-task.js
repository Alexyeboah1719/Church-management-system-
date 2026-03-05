// Admin Task Assignment functionality
document.addEventListener('DOMContentLoaded', function() {
    // Check if admin is logged in
    checkAdminAuth();
    
    // Initialize task assignment
    initializeTaskAssignment();
    
    // Setup event listeners
    setupTaskEventListeners();
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

// Initialize task assignment
function initializeTaskAssignment() {
    loadMembersForAssignment();
    loadEventsForAssignment();
    loadTasksData();
}

// Setup event listeners
function setupTaskEventListeners() {
    // Sidebar toggle
    document.getElementById('menuToggle').addEventListener('click', toggleSidebar);
    document.getElementById('sidebarToggle').addEventListener('click', toggleSidebar);
    
    // Logout
    document.getElementById('logoutBtn').addEventListener('click', function() {
        localStorage.removeItem('currentUser');
        window.location.href = 'index.html?admin=true';
    });
    
    // Assign task
    document.getElementById('saveTask').addEventListener('click', assignNewTask);
    
    // Update task
    document.getElementById('updateTask').addEventListener('click', updateTask);
    
    // Progress slider
    document.getElementById('editTaskProgress').addEventListener('input', function() {
        document.getElementById('progressValue').textContent = this.value + '%';
    });
    
    // Status change
    document.getElementById('editTaskStatus').addEventListener('change', function() {
        const progressSection = document.getElementById('progressSection');
        if (this.value === 'in-progress') {
            progressSection.style.display = 'block';
        } else {
            progressSection.style.display = 'none';
            if (this.value === 'completed') {
                document.getElementById('editTaskProgress').value = 100;
                document.getElementById('progressValue').textContent = '100%';
            }
        }
    });
    
    // Tab change
    document.getElementById('tasksTabs').addEventListener('shown.bs.tab', function(event) {
        loadTasksData();
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

// Load members for task assignment
function loadMembersForAssignment() {
    const members = JSON.parse(localStorage.getItem('members') || '[]');
    const approvedMembers = members.filter(m => m.status === 'approved' && m.active);
    
    const assignedToSelect = document.getElementById('taskAssignedTo');
    const editAssignedToSelect = document.getElementById('editTaskAssignedTo');
    
    assignedToSelect.innerHTML = '<option value="">Select a member...</option>';
    editAssignedToSelect.innerHTML = '<option value="">Select a member...</option>';
    
    approvedMembers.forEach(member => {
        const option = `<option value="${member.id}">${member.name}</option>`;
        assignedToSelect.innerHTML += option;
        editAssignedToSelect.innerHTML += option;
    });
}

// Load events for task assignment
function loadEventsForAssignment() {
    const events = JSON.parse(localStorage.getItem('events') || '[]');
    const upcomingEvents = events.filter(event => new Date(event.date) >= new Date().setHours(0, 0, 0, 0));
    
    const eventSelect = document.getElementById('taskEvent');
    const editEventSelect = document.getElementById('editTaskEvent');
    
    eventSelect.innerHTML = '<option value="">No specific event</option>';
    editEventSelect.innerHTML = '<option value="">No specific event</option>';
    
    upcomingEvents.forEach(event => {
        const option = `<option value="${event.id}">${event.title} - ${formatDate(event.date)}</option>`;
        eventSelect.innerHTML += option;
        editEventSelect.innerHTML += option;
    });
}

// Load all tasks data
function loadTasksData() {
    const tasks = JSON.parse(localStorage.getItem('tasks') || '[]');
    const members = JSON.parse(localStorage.getItem('members') || '[]');
    const events = JSON.parse(localStorage.getItem('events') || '[]');
    
    // Calculate statistics
    const totalTasks = tasks.length;
    const pendingTasks = tasks.filter(t => t.status === 'pending').length;
    const progressTasks = tasks.filter(t => t.status === 'in-progress').length;
    const completedTasks = tasks.filter(t => t.status === 'completed').length;
    
    // Update statistics
    document.getElementById('totalTasks').textContent = totalTasks;
    document.getElementById('pendingTasks').textContent = pendingTasks;
    document.getElementById('progressTasks').textContent = progressTasks;
    document.getElementById('completedTasks').textContent = completedTasks;
    
    // Load task tables
    loadAllTasksTable(tasks, members, events);
    loadPendingTasksTable(tasks, members, events);
    loadProgressTasksTable(tasks, members, events);
    loadCompletedTasksTable(tasks, members, events);
}

// Load all tasks table
function loadAllTasksTable(tasks, members, events) {
    const tableBody = document.getElementById('allTasksBody');
    
    if (tasks.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="8" class="text-center text-muted py-4">
                    <i class="fas fa-tasks fa-3x mb-3 d-block"></i>
                    No tasks assigned yet
                </td>
            </tr>
        `;
        return;
    }
    
    // Sort by due date (soonest first)
    tasks.sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));
    
    tableBody.innerHTML = tasks.map(task => {
        const assignedMember = members.find(m => m.id === task.assignedTo);
        const event = events.find(e => e.id === task.eventId);
        const isOverdue = new Date(task.dueDate) < new Date().setHours(0, 0, 0, 0) && task.status !== 'completed';
        const isToday = task.dueDate === new Date().toISOString().split('T')[0];
        
        let dueDateClass = 'due-date future';
        if (isOverdue) dueDateClass = 'due-date overdue';
        else if (isToday) dueDateClass = 'due-date today';
        
        return `
            <tr class="task-row status-${task.status}">
                <td>
                    <strong>${task.title}</strong>
                    <br>
                    <small class="text-muted task-description">${task.description}</small>
                </td>
                <td>${assignedMember ? assignedMember.name : 'Unknown Member'}</td>
                <td>${event ? event.title : 'No event'}</td>
                <td class="${dueDateClass}">${formatDate(task.dueDate)}</td>
                <td>
                    <span class="badge badge-priority-${task.priority}">
                        ${task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}
                    </span>
                </td>
                <td>
                    <span class="badge badge-status-${task.status}">
                        ${task.status.charAt(0).toUpperCase() + task.status.slice(1)}
                    </span>
                </td>
                <td>
                    ${task.status === 'in-progress' ? `
                        <div class="task-progress">
                            <div class="task-progress-bar" style="width: ${task.progress || 0}%"></div>
                        </div>
                        <span class="progress-text">${task.progress || 0}%</span>
                    ` : task.status === 'completed' ? `
                        <div class="task-progress">
                            <div class="task-progress-bar" style="width: 100%"></div>
                        </div>
                        <span class="progress-text">100%</span>
                    ` : '—'}
                </td>
                <td>
                    <div class="btn-group btn-group-sm">
                        <button class="btn btn-outline-warning edit-task" data-task-id="${task.id}">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn btn-outline-danger delete-task" data-task-id="${task.id}">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
    
    // Add event listeners
    addTaskTableListeners();
}

// Load pending tasks table
function loadPendingTasksTable(tasks, members, events) {
    const tableBody = document.getElementById('pendingTasksBody');
    const pendingTasks = tasks.filter(t => t.status === 'pending');
    
    if (pendingTasks.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="6" class="text-center text-muted py-4">
                    <i class="fas fa-clock fa-3x mb-3 d-block"></i>
                    No pending tasks
                </td>
            </tr>
        `;
        return;
    }
    
    tableBody.innerHTML = pendingTasks.map(task => {
        const assignedMember = members.find(m => m.id === task.assignedTo);
        const event = events.find(e => e.id === task.eventId);
        const isOverdue = new Date(task.dueDate) < new Date().setHours(0, 0, 0, 0);
        const isToday = task.dueDate === new Date().toISOString().split('T')[0];
        
        let dueDateClass = 'due-date future';
        if (isOverdue) dueDateClass = 'due-date overdue';
        else if (isToday) dueDateClass = 'due-date today';
        
        return `
            <tr class="task-row status-pending">
                <td>
                    <strong>${task.title}</strong>
                    <br>
                    <small class="text-muted task-description">${task.description}</small>
                </td>
                <td>${assignedMember ? assignedMember.name : 'Unknown Member'}</td>
                <td>${event ? event.title : 'No event'}</td>
                <td class="${dueDateClass}">${formatDate(task.dueDate)}</td>
                <td>
                    <span class="badge badge-priority-${task.priority}">
                        ${task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}
                    </span>
                </td>
                <td>
                    <div class="btn-group btn-group-sm">
                        <button class="btn btn-outline-warning edit-task" data-task-id="${task.id}">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn btn-outline-danger delete-task" data-task-id="${task.id}">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
    
    // Add event listeners
    addTaskTableListeners();
}

// Load in-progress tasks table
function loadProgressTasksTable(tasks, members, events) {
    const tableBody = document.getElementById('progressTasksBody');
    const progressTasks = tasks.filter(t => t.status === 'in-progress');
    
    if (progressTasks.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="6" class="text-center text-muted py-4">
                    <i class="fas fa-spinner fa-3x mb-3 d-block"></i>
                    No tasks in progress
                </td>
            </tr>
        `;
        return;
    }
    
    tableBody.innerHTML = progressTasks.map(task => {
        const assignedMember = members.find(m => m.id === task.assignedTo);
        const event = events.find(e => e.id === task.eventId);
        const isOverdue = new Date(task.dueDate) < new Date().setHours(0, 0, 0, 0);
        const isToday = task.dueDate === new Date().toISOString().split('T')[0];
        
        let dueDateClass = 'due-date future';
        if (isOverdue) dueDateClass = 'due-date overdue';
        else if (isToday) dueDateClass = 'due-date today';
        
        return `
            <tr class="task-row status-in-progress">
                <td>
                    <strong>${task.title}</strong>
                    <br>
                    <small class="text-muted task-description">${task.description}</small>
                </td>
                <td>${assignedMember ? assignedMember.name : 'Unknown Member'}</td>
                <td>${event ? event.title : 'No event'}</td>
                <td class="${dueDateClass}">${formatDate(task.dueDate)}</td>
                <td>
                    <div class="task-progress">
                        <div class="task-progress-bar" style="width: ${task.progress || 0}%"></div>
                    </div>
                    <span class="progress-text">${task.progress || 0}%</span>
                </td>
                <td>
                    <div class="btn-group btn-group-sm">
                        <button class="btn btn-outline-warning edit-task" data-task-id="${task.id}">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn btn-outline-danger delete-task" data-task-id="${task.id}">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
    
    // Add event listeners
    addTaskTableListeners();
}

// Load completed tasks table
function loadCompletedTasksTable(tasks, members, events) {
    const tableBody = document.getElementById('completedTasksBody');
    const completedTasks = tasks.filter(t => t.status === 'completed');
    
    if (completedTasks.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="5" class="text-center text-muted py-4">
                    <i class="fas fa-check-circle fa-3x mb-3 d-block"></i>
                    No completed tasks
                </td>
            </tr>
        `;
        return;
    }
    
    tableBody.innerHTML = completedTasks.map(task => {
        const assignedMember = members.find(m => m.id === task.assignedTo);
        const event = events.find(e => e.id === task.eventId);
        
        return `
            <tr class="task-row status-completed">
                <td>
                    <strong>${task.title}</strong>
                    <br>
                    <small class="text-muted task-description">${task.description}</small>
                </td>
                <td>${assignedMember ? assignedMember.name : 'Unknown Member'}</td>
                <td>${event ? event.title : 'No event'}</td>
                <td>${formatDate(task.completedDate || task.dueDate)}</td>
                <td>
                    <div class="btn-group btn-group-sm">
                        <button class="btn btn-outline-warning edit-task" data-task-id="${task.id}">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn btn-outline-danger delete-task" data-task-id="${task.id}">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
    
    // Add event listeners
    addTaskTableListeners();
}

// Add event listeners to table buttons
function addTaskTableListeners() {
    // Edit task
    document.querySelectorAll('.edit-task').forEach(btn => {
        btn.addEventListener('click', function() {
            editTask(this.dataset.taskId);
        });
    });
    
    // Delete task
    document.querySelectorAll('.delete-task').forEach(btn => {
        btn.addEventListener('click', function() {
            deleteTask(this.dataset.taskId);
        });
    });
}

// Assign new task
function assignNewTask() {
    const title = document.getElementById('taskTitle').value.trim();
    const description = document.getElementById('taskDescription').value.trim();
    const assignedTo = document.getElementById('taskAssignedTo').value;
    const eventId = document.getElementById('taskEvent').value;
    const dueDate = document.getElementById('taskDueDate').value;
    const priority = document.getElementById('taskPriority').value;
    
    if (!title || !description || !assignedTo || !dueDate) {
        alert('Please fill in all required fields');
        return;
    }
    
    // Create new task
    const newTask = {
        id: Date.now().toString(),
        title: title,
        description: description,
        assignedTo: assignedTo,
        eventId: eventId || null,
        dueDate: dueDate,
        priority: priority,
        status: 'pending',
        assignedDate: new Date().toISOString().split('T')[0],
        createdBy: JSON.parse(localStorage.getItem('currentUser')).name
    };
    
    // Save task
    const tasks = JSON.parse(localStorage.getItem('tasks') || '[]');
    tasks.push(newTask);
    localStorage.setItem('tasks', JSON.stringify(tasks));
    
    // Close modal and reset form
    const modal = bootstrap.Modal.getInstance(document.getElementById('assignTaskModal'));
    modal.hide();
    document.getElementById('assignTaskForm').reset();
    
    // Reload data
    loadTasksData();
    
    // Record activity
    const members = JSON.parse(localStorage.getItem('members') || '[]');
    const assignedMember = members.find(m => m.id === assignedTo);
    recordAdminActivity(`Assigned task "${title}" to ${assignedMember ? assignedMember.name : 'member'}`);
    
    alert('Task assigned successfully!');
}

// Edit task
function editTask(taskId) {
    const tasks = JSON.parse(localStorage.getItem('tasks') || '[]');
    const task = tasks.find(t => t.id === taskId);
    
    if (!task) {
        alert('Task not found');
        return;
    }
    
    // Fill form with task data
    document.getElementById('editTaskId').value = task.id;
    document.getElementById('editTaskTitle').value = task.title;
    document.getElementById('editTaskDescription').value = task.description;
    document.getElementById('editTaskAssignedTo').value = task.assignedTo;
    document.getElementById('editTaskEvent').value = task.eventId || '';
    document.getElementById('editTaskDueDate').value = task.dueDate;
    document.getElementById('editTaskPriority').value = task.priority;
    document.getElementById('editTaskStatus').value = task.status;
    
    // Handle progress section
    const progressSection = document.getElementById('progressSection');
    if (task.status === 'in-progress') {
        progressSection.style.display = 'block';
        document.getElementById('editTaskProgress').value = task.progress || 0;
        document.getElementById('progressValue').textContent = (task.progress || 0) + '%';
    } else {
        progressSection.style.display = 'none';
    }
    
    // Show modal
    const modal = new bootstrap.Modal(document.getElementById('editTaskModal'));
    modal.show();
}

// Update task
function updateTask() {
    const taskId = document.getElementById('editTaskId').value;
    const title = document.getElementById('editTaskTitle').value.trim();
    const description = document.getElementById('editTaskDescription').value.trim();
    const assignedTo = document.getElementById('editTaskAssignedTo').value;
    const eventId = document.getElementById('editTaskEvent').value;
    const dueDate = document.getElementById('editTaskDueDate').value;
    const priority = document.getElementById('editTaskPriority').value;
    const status = document.getElementById('editTaskStatus').value;
    const progress = document.getElementById('editTaskProgress').value;
    
    if (!title || !description || !assignedTo || !dueDate) {
        alert('Please fill in all required fields');
        return;
    }
    
    const tasks = JSON.parse(localStorage.getItem('tasks') || '[]');
    const taskIndex = tasks.findIndex(t => t.id === taskId);
    
    if (taskIndex === -1) {
        alert('Task not found');
        return;
    }
    
    // Update task
    tasks[taskIndex].title = title;
    tasks[taskIndex].description = description;
    tasks[taskIndex].assignedTo = assignedTo;
    tasks[taskIndex].eventId = eventId || null;
    tasks[taskIndex].dueDate = dueDate;
    tasks[taskIndex].priority = priority;
    tasks[taskIndex].status = status;
    
    if (status === 'in-progress') {
        tasks[taskIndex].progress = parseInt(progress);
    } else if (status === 'completed') {
        tasks[taskIndex].progress = 100;
        tasks[taskIndex].completedDate = new Date().toISOString().split('T')[0];
    } else {
        tasks[taskIndex].progress = 0;
    }
    
    localStorage.setItem('tasks', JSON.stringify(tasks));
    
    // Close modal
    const modal = bootstrap.Modal.getInstance(document.getElementById('editTaskModal'));
    modal.hide();
    
    // Reload data
    loadTasksData();
    
    // Record activity
    recordAdminActivity(`Updated task: ${title}`);
    
    alert('Task updated successfully!');
}

// Delete task
function deleteTask(taskId) {
    if (!confirm('Are you sure you want to delete this task?')) {
        return;
    }
    
    const tasks = JSON.parse(localStorage.getItem('tasks') || '[]');
    const taskIndex = tasks.findIndex(t => t.id === taskId);
    
    if (taskIndex !== -1) {
        const taskTitle = tasks[taskIndex].title;
        
        // Remove task
        tasks.splice(taskIndex, 1);
        localStorage.setItem('tasks', JSON.stringify(tasks));
        
        // Record activity
        recordAdminActivity(`Deleted task: ${taskTitle}`);
        
        // Reload data
        loadTasksData();
        
        alert('Task deleted successfully!');
    }
}

// Helper function to format date
function formatDate(dateString) {
    const options = { year: 'numeric', month: 'short', day: 'numeric' };
    return new Date(dateString).toLocaleDateString(undefined, options);
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