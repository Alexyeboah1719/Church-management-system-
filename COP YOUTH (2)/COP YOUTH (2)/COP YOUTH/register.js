// Members Register functionality
document.addEventListener('DOMContentLoaded', function() {
    // Check if user is logged in
    checkAuth();
    
    // Initialize members register
    initializeMembersRegister();
    
    // Setup event listeners
    setupRegisterEventListeners();
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

// Initialize members register
function initializeMembersRegister() {
    loadMembersTable();
}

// Setup event listeners
function setupRegisterEventListeners() {
    // Sidebar toggle
    document.getElementById('menuToggle').addEventListener('click', toggleSidebar);
    document.getElementById('sidebarToggle').addEventListener('click', toggleSidebar);
    
    // Logout
    document.getElementById('logoutBtn').addEventListener('click', function() {
        localStorage.removeItem('currentUser');
        window.location.href = 'index.html';
    });
    
    // Search and filter
    document.getElementById('searchButton').addEventListener('click', filterMembers);
    document.getElementById('searchMembers').addEventListener('input', filterMembers);
    document.getElementById('statusFilter').addEventListener('change', filterMembers);
    document.getElementById('roleFilter').addEventListener('change', filterMembers);
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

// Load members table
function loadMembersTable() {
    const members = JSON.parse(localStorage.getItem('members') || '[]');
    const approvedMembers = members.filter(m => m.status === 'approved');
    
    const tableBody = document.getElementById('membersTableBody');
    
    if (approvedMembers.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="6" class="text-center text-muted py-4">
                    <i class="fas fa-users fa-3x mb-3 d-block"></i>
                    No members found
                </td>
            </tr>
        `;
        return;
    }
    
    tableBody.innerHTML = approvedMembers.map(member => `
        <tr>
            <td>
                <strong>${member.name}</strong>
                ${member.id === JSON.parse(localStorage.getItem('currentUser')).id ? 
                    '<span class="badge bg-primary ms-1">You</span>' : ''}
            </td>
            <td>${member.email}</td>
            <td>${member.phone}</td>
            <td>${formatDate(member.dateJoined)}</td>
            <td>
                <span class="badge ${member.active ? 'badge-active' : 'badge-inactive'}">
                    ${member.active ? 'Active' : 'Inactive'}
                </span>
            </td>
            <td>
                ${member.roles && member.roles.length > 0 ? 
                    member.roles.map(role => 
                        `<span class="badge bg-warning text-dark role-badge">${role}</span>`
                    ).join('') : 
                    '<span class="text-muted">No roles</span>'
                }
            </td>
        </tr>
    `).join('');
}

// Filter members based on search and filters
function filterMembers() {
    const searchTerm = document.getElementById('searchMembers').value.toLowerCase();
    const statusFilter = document.getElementById('statusFilter').value;
    const roleFilter = document.getElementById('roleFilter').value;
    
    const members = JSON.parse(localStorage.getItem('members') || '[]');
    const approvedMembers = members.filter(m => m.status === 'approved');
    
    let filteredMembers = approvedMembers.filter(member => {
        // Search filter
        const matchesSearch = member.name.toLowerCase().includes(searchTerm) ||
                            member.email.toLowerCase().includes(searchTerm) ||
                            member.phone.includes(searchTerm);
        
        // Status filter
        const matchesStatus = statusFilter === 'all' || 
                            (statusFilter === 'active' && member.active) ||
                            (statusFilter === 'inactive' && !member.active);
        
        // Role filter
        const matchesRole = roleFilter === 'all' ||
                           (member.roles && member.roles.includes(roleFilter));
        
        return matchesSearch && matchesStatus && matchesRole;
    });
    
    const tableBody = document.getElementById('membersTableBody');
    
    if (filteredMembers.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="6" class="text-center text-muted py-4">
                    No members match your search criteria
                </td>
            </tr>
        `;
        return;
    }
    
    tableBody.innerHTML = filteredMembers.map(member => `
        <tr>
            <td>
                <strong>${member.name}</strong>
                ${member.id === JSON.parse(localStorage.getItem('currentUser')).id ? 
                    '<span class="badge bg-primary ms-1">You</span>' : ''}
            </td>
            <td>${member.email}</td>
            <td>${member.phone}</td>
            <td>${formatDate(member.dateJoined)}</td>
            <td>
                <span class="badge ${member.active ? 'badge-active' : 'badge-inactive'}">
                    ${member.active ? 'Active' : 'Inactive'}
                </span>
            </td>
            <td>
                ${member.roles && member.roles.length > 0 ? 
                    member.roles.map(role => 
                        `<span class="badge bg-warning text-dark role-badge">${role}</span>`
                    ).join('') : 
                    '<span class="text-muted">No roles</span>'
                }
            </td>
        </tr>
    `).join('');
}

// Helper function to format date
function formatDate(dateString) {
    const options = { year: 'numeric', month: 'short', day: 'numeric' };
    return new Date(dateString).toLocaleDateString(undefined, options);
}