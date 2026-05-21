// Admin Members Management functionality
document.addEventListener('DOMContentLoaded', function() {
    initializeRegister();
});

// Listen for localStorage changes (when members update their profiles)
window.addEventListener('storage', function(e) {
    if (e.key === 'members') {
        console.log('Member data updated, refreshing members management...');
        loadMembersData();
    }
});

// Also listen for visibility changes to refresh when user returns to tab
document.addEventListener('visibilitychange', function() {
    if (!document.hidden) {
        console.log('Page became visible, refreshing members management...');
        loadMembersData();
    }
});

function initializeRegister() {
    // Check if admin is logged in
    checkAdminAuth();
    
    // Initialize members management
    initializeMembersManagement();
    
    // Setup event listeners
    setupMembersEventListeners();
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

// Initialize members management
function initializeMembersManagement() {
    loadMembersData();
}

// Setup event listeners
function setupMembersEventListeners() {
    // Sidebar toggle
    document.getElementById('menuToggle').addEventListener('click', toggleSidebar);
    document.getElementById('sidebarToggle').addEventListener('click', toggleSidebar);
    
    // Logout
    document.getElementById('logoutBtn').addEventListener('click', function() {
        localStorage.removeItem('currentUser');
        window.location.href = 'auth.html?admin=true';
    });
    
    // Add member
    document.getElementById('saveMember').addEventListener('click', addNewMember);
    
    // Update member
    document.getElementById('updateMember').addEventListener('click', updateMember);
    
    // Tab change
    document.getElementById('membersTabs').addEventListener('shown.bs.tab', function(event) {
        // Refresh data when tab changes
        loadMembersData();
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

// Load all members data
async function loadMembersData() {
    try {
        const members = JSON.parse(localStorage.getItem('members') || '[]');
        
        // Count members by status
        const approvedMembers = members.filter(m => m.status === 'approved' && m.active);
        const pendingMembers = members.filter(m => m.status === 'pending');
        const inactiveMembers = members.filter(m => m.status === 'approved' && !m.active);
        
        // Update counts
        document.getElementById('approvedCount').textContent = approvedMembers.length;
        document.getElementById('pendingCount').textContent = pendingMembers.length;
        document.getElementById('inactiveCount').textContent = inactiveMembers.length;
        
        // Load tables
        loadApprovedMembers(approvedMembers);
        loadPendingMembers(pendingMembers);
        loadInactiveMembers(inactiveMembers);
    } catch (error) {
        console.error('Error loading members data:', error);
    }
}

// Load approved members table
function loadApprovedMembers(members) {
    const tableBody = document.getElementById('approvedMembersBody');
    
    if (members.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="12" class="text-center text-muted py-4">
                    <i class="fas fa-users fa-3x mb-3 d-block"></i>
                    No approved members found
                </td>
            </tr>
        `;
        return;
    }
    
    tableBody.innerHTML = members.map(member => `
        <tr>
            <td>
                <strong>${member.name}</strong>
            </td>
            <td>${member.email}</td>
            <td>${member.phone}</td>
            <td>${member.location || 'N/A'}</td>
            <td>${member.occupation || 'N/A'}</td>
            <td>
                ${member.baptized ? 
                    `<span class="badge ${member.baptized === 'yes' ? 'bg-success' : 'bg-secondary'}">
                        ${member.baptized === 'yes' ? 'Yes' : 'No'}
                    </span>` : 
                    '<span class="text-muted">N/A</span>'
                }
            </td>
            <td>${member.date_of_birth || member.dateOfBirth ? formatDate(member.date_of_birth || member.dateOfBirth) : 'N/A'}</td>
            <td>${member.date_of_birth || member.dateOfBirth ? calculateAge(member.date_of_birth || member.dateOfBirth) + ' years' : 'N/A'}</td>
            <td>${formatDate(member.date_joined || member.dateJoined || member.created_at)}</td>
            <td>
                ${member.roles && member.roles.length > 0 ? 
                    member.roles.map(role => 
                        `<span class="badge bg-warning text-dark role-badge">${role}</span>`
                    ).join('') : 
                    '<span class="text-muted">No roles</span>'
                }
            </td>
            <td>
                <span class="badge badge-active">Active</span>
            </td>
            <td>
                <div class="btn-group btn-group-sm">
                    <button class="btn btn-outline-primary edit-member" data-member-id="${member.id}">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-outline-warning deactivate-member" data-member-id="${member.id}">
                        <i class="fas fa-user-slash"></i>
                    </button>
                    <button class="btn btn-outline-danger delete-member" data-member-id="${member.id}">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </td>
        </tr>
    `).join('');
    
    // Add event listeners
    document.querySelectorAll('.edit-member').forEach(btn => {
        btn.addEventListener('click', function() {
            editMember(this.dataset.memberId);
        });
    });
    
    document.querySelectorAll('.deactivate-member').forEach(btn => {
        btn.addEventListener('click', function() {
            deactivateMember(this.dataset.memberId);
        });
    });
    
    document.querySelectorAll('.delete-member').forEach(btn => {
        btn.addEventListener('click', function() {
            deleteMember(this.dataset.memberId);
        });
    });
}

// Load pending members table
function loadPendingMembers(members) {
    const tableBody = document.getElementById('pendingMembersBody');
    
    if (members.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="6" class="text-center text-muted py-4">
                    <i class="fas fa-user-clock fa-3x mb-3 d-block"></i>
                    No pending approvals
                </td>
            </tr>
        `;
        return;
    }
    
    tableBody.innerHTML = members.map(member => `
        <tr>
            <td>
                <strong>${member.name}</strong>
            </td>
            <td>${member.email}</td>
            <td>${member.phone}</td>
            <td>${member.location || 'N/A'}</td>
            <td>${formatDate(member.date_joined || member.dateJoined || member.created_at)}</td>
            <td>
                <div class="btn-group btn-group-sm">
                    <button class="btn btn-outline-success approve-member" data-member-id="${member.id}">
                        <i class="fas fa-check"></i> Approve
                    </button>
                    <button class="btn btn-outline-danger reject-member" data-member-id="${member.id}">
                        <i class="fas fa-times"></i> Reject
                    </button>
                </div>
            </td>
        </tr>
    `).join('');
    
    // Add event listeners
    document.querySelectorAll('.approve-member').forEach(btn => {
        btn.addEventListener('click', function() {
            approveMember(this.dataset.memberId);
        });
    });
    
    document.querySelectorAll('.reject-member').forEach(btn => {
        btn.addEventListener('click', function() {
            rejectMember(this.dataset.memberId);
        });
    });
}

// Load inactive members table
function loadInactiveMembers(members) {
    const tableBody = document.getElementById('inactiveMembersBody');
    
    if (members.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="9" class="text-center text-muted py-4">
                    <i class="fas fa-user-times fa-3x mb-3 d-block"></i>
                    No inactive members
                </td>
            </tr>
        `;
        return;
    }
    
    tableBody.innerHTML = members.map(member => `
        <tr>
            <td>
                <strong>${member.name}</strong>
            </td>
            <td>${member.email}</td>
            <td>${member.phone}</td>
            <td>${member.location || 'N/A'}</td>
            <td>${member.dateOfBirth || member.date_of_birth ? formatDate(member.date_of_birth || member.dateOfBirth) : 'N/A'}</td>
            <td>${member.dateOfBirth || member.date_of_birth ? calculateAge(member.date_of_birth || member.dateOfBirth) + ' years' : 'N/A'}</td>
            <td>${formatDate(member.date_joined || member.dateJoined || member.created_at)}</td>
            <td>${formatDate(member.last_active || member.lastActive || member.date_joined || member.created_at)}</td>
            <td>
                <div class="btn-group btn-group-sm">
                    <button class="btn btn-outline-success activate-member" data-member-id="${member.id}">
                        <i class="fas fa-user-check"></i> Activate
                    </button>
                    <button class="btn btn-outline-danger delete-member" data-member-id="${member.id}">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </td>
        </tr>
    `).join('');
    
    // Add event listeners
    document.querySelectorAll('.activate-member').forEach(btn => {
        btn.addEventListener('click', function() {
            activateMember(this.dataset.memberId);
        });
    });
    
    document.querySelectorAll('.delete-member').forEach(btn => {
        btn.addEventListener('click', function() {
            deleteMember(this.dataset.memberId);
        });
    });
}

// Add new member
async function addNewMember() {
    try {
        const nameElement = document.getElementById('memberName');
        const emailElement = document.getElementById('memberEmail');
        const phoneElement = document.getElementById('memberPhone');
        const rolesElement = document.getElementById('memberRoles');
        const statusElement = document.getElementById('memberStatus');
        
        if (!nameElement || !emailElement || !phoneElement || !rolesElement || !statusElement) {
            console.error('Required form elements not found');
            return;
        }
        
        const name = nameElement.value.trim();
        const email = emailElement.value.trim().toLowerCase();
        const phone = phoneElement.value.trim();
        const roles = Array.from(rolesElement.selectedOptions).map(option => option.value);
        const status = statusElement.value;
        
        if (!name || !email || !phone) {
            alert('Please fill in all required fields');
            return;
        }
        
        const members = JSON.parse(localStorage.getItem('members') || '[]');
        
        // Check if email already exists
        const member = members.find(m => m.email === email);
        
        if (member) {
            alert('A member with this email already exists!');
            return;
        }
        
        // Create new member
        const newMember = {
            id: Date.now().toString(),
            name: name,
            email: email,
            phone: phone,
            password: 'Default123!',
            status: 'approved',
            date_joined: new Date().toISOString().split('T')[0],
            roles: roles,
            active: status === 'active'
        };
        
        members.push(newMember);
        localStorage.setItem('members', JSON.stringify(members));
        
        // Close modal and reset form
        const modalElement = document.getElementById('addMemberModal');
        const formElement = document.getElementById('addMemberForm');
        
        if (modalElement && formElement) {
            const modal = bootstrap.Modal.getInstance(modalElement);
            if (modal) modal.hide();
            formElement.reset();
        }
        
        // Reload data
        loadMembersData();
        
        alert('Member added successfully!');
    } catch (error) {
        console.error('Error adding member:', error);
        alert('Failed to add member. Please try again.');
    }
}

// Edit member
async function editMember(memberId) {
    try {
        const members = JSON.parse(localStorage.getItem('members') || '[]');
        
        const member = members.find(m => m.id === memberId);
        
        if (!member) {
            alert('Member not found');
            return;
        }
        
        // Fill form with member data
        document.getElementById('editMemberId').value = member.id;
        document.getElementById('editMemberName').value = member.name;
        document.getElementById('editMemberEmail').value = member.email;
        document.getElementById('editMemberPhone').value = member.phone;
        document.getElementById('editMemberStatus').value = member.active ? 'active' : 'inactive';
        
        // Select roles
        const rolesSelect = document.getElementById('editMemberRoles');
        Array.from(rolesSelect.options).forEach(option => {
            option.selected = member.roles && member.roles.includes(option.value);
        });
        
        // Show modal
        const modal = new bootstrap.Modal(document.getElementById('editMemberModal'));
        modal.show();
    } catch (error) {
        console.error('Error editing member:', error);
        alert('Failed to load member data. Please try again.');
    }
}

// Update member
async function updateMember() {
    try {
        const memberIdElement = document.getElementById('editMemberId');
        const nameElement = document.getElementById('editMemberName');
        const emailElement = document.getElementById('editMemberEmail');
        const phoneElement = document.getElementById('editMemberPhone');
        const rolesElement = document.getElementById('editMemberRoles');
        const statusElement = document.getElementById('editMemberStatus');
        
        if (!memberIdElement || !nameElement || !emailElement || !phoneElement || !rolesElement || !statusElement) {
            console.error('Required edit form elements not found');
            return;
        }
        
        const memberId = memberIdElement.value;
        const name = nameElement.value.trim();
        const email = emailElement.value.trim().toLowerCase();
        const phone = phoneElement.value.trim();
        const roles = Array.from(rolesElement.selectedOptions).map(option => option.value);
        const status = statusElement.value;
        
        if (!name || !email || !phone) {
            alert('Please fill in all required fields');
            return;
        }
        
        const members = JSON.parse(localStorage.getItem('members') || '[]');
        const memberIndex = members.findIndex(m => m.id === memberId);
        
        if (memberIndex === -1) {
            alert('Member not found');
            return;
        }
        
        // Update member data
        members[memberIndex] = {
            ...members[memberIndex],
            name: name,
            email: email,
            phone: phone,
            roles: roles,
            active: status === 'active'
        };
        
        localStorage.setItem('members', JSON.stringify(members));
        
        // Close modal
        const modalElement = document.getElementById('editMemberModal');
        if (modalElement) {
            const modal = bootstrap.Modal.getInstance(modalElement);
            if (modal) modal.hide();
        }
        
        // Reload data
        loadMembersData();
        
        alert('Member updated successfully!');
    } catch (error) {
        console.error('Error updating member:', error);
        alert('Failed to update member. Please try again.');
    }
}

// Approve member
async function approveMember(memberId) {
    try {
        const members = JSON.parse(localStorage.getItem('members') || '[]');
        const memberIndex = members.findIndex(m => m.id === memberId);
        
        if (memberIndex === -1) {
            alert('Member not found');
            return;
        }
        
        // Update member status
        members[memberIndex].status = 'approved';
        members[memberIndex].active = true;
        members[memberIndex].approved_date = new Date().toISOString();
        
        localStorage.setItem('members', JSON.stringify(members));
        loadMembersData();
        alert('Member approved successfully!');
    } catch (error) {
        console.error('Error approving member:', error);
        alert('Failed to approve member. Please try again.');
    }
}

// Reject member
async function rejectMember(memberId) {
    if (!confirm('Are you sure you want to reject this member? This action cannot be undone.')) {
        return;
    }
    
    try {
        const members = JSON.parse(localStorage.getItem('members') || '[]');
        const memberIndex = members.findIndex(m => m.id === memberId);
        
        if (memberIndex === -1) {
            alert('Member not found');
            return;
        }
        
        // Update member status
        members[memberIndex].status = 'rejected';
        members[memberIndex].rejected_date = new Date().toISOString();
        
        localStorage.setItem('members', JSON.stringify(members));
        loadMembersData();
        alert('Member rejected successfully!');
    } catch (error) {
        console.error('Error rejecting member:', error);
        alert('Failed to reject member. Please try again.');
    }
}

// Deactivate member
async function deactivateMember(memberId) {
    if (!confirm('Are you sure you want to deactivate this member?')) {
        return;
    }
    
    try {
        const members = JSON.parse(localStorage.getItem('members') || '[]');
        const memberIndex = members.findIndex(m => m.id === memberId);
        
        if (memberIndex === -1) {
            alert('Member not found');
            return;
        }
        
        // Update member status
        members[memberIndex].active = false;
        members[memberIndex].last_active = new Date().toISOString();
        
        localStorage.setItem('members', JSON.stringify(members));
        loadMembersData();
        alert('Member deactivated successfully!');
    } catch (error) {
        console.error('Error deactivating member:', error);
        alert('Failed to deactivate member. Please try again.');
    }
}

// Activate member
async function activateMember(memberId) {
    try {
        const members = JSON.parse(localStorage.getItem('members') || '[]');
        const memberIndex = members.findIndex(m => m.id === memberId);
        
        if (memberIndex === -1) {
            alert('Member not found');
            return;
        }
        
        // Update member status
        members[memberIndex].active = true;
        
        localStorage.setItem('members', JSON.stringify(members));
        loadMembersData();
        alert('Member activated successfully!');
    } catch (error) {
        console.error('Error activating member:', error);
        alert('Failed to activate member. Please try again.');
    }
}

// Delete member
async function deleteMember(memberId) {
    if (!confirm('Are you sure you want to delete this member? This action cannot be undone.')) {
        return;
    }
    
    try {
        const members = JSON.parse(localStorage.getItem('members') || '[]');
        const filteredMembers = members.filter(m => m.id !== memberId);
        
        localStorage.setItem('members', JSON.stringify(filteredMembers));
        loadMembersData();
        alert('Member deleted successfully!');
    } catch (error) {
        console.error('Error deleting member:', error);
        alert('Failed to delete member. Please try again.');
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

// Refresh members data function
function refreshMembersData() {
    loadMembersData();
}
