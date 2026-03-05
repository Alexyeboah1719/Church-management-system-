// Admin Members Management functionality
document.addEventListener('DOMContentLoaded', function() {
    // Wait for Supabase to be ready
    if (window.supabaseReady) {
        initializeRegister();
    } else {
        window.addEventListener('supabaseReady', initializeRegister);
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
        window.location.href = 'index.html?admin=true';
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
        const membersResult = await window.supabaseDB.getMembers();
        const members = membersResult.success ? membersResult.data : [];
        
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
                <td colspan="10" class="text-center text-muted py-4">
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
            <td>${member.dateOfBirth ? formatDate(member.dateOfBirth) : 'N/A'}</td>
            <td>${member.dateOfBirth ? calculateAge(member.dateOfBirth) + ' years' : 'N/A'}</td>
            <td>${formatDate(member.dateJoined)}</td>
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
                <td colspan="8" class="text-center text-muted py-4">
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
            <td>${formatDate(member.dateJoined)}</td>
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
    const name = document.getElementById('memberName').value.trim();
    const email = document.getElementById('memberEmail').value.trim().toLowerCase();
    const phone = document.getElementById('memberPhone').value.trim();
    const roles = Array.from(document.getElementById('memberRoles').selectedOptions).map(option => option.value);
    const status = document.getElementById('memberStatus').value;
    
    if (!name || !email || !phone) {
        alert('Please fill in all required fields');
        return;
    }
    
    try {
        // Check if email already exists
        const memberResult = await window.supabaseDB.getMemberByEmail(email);
        
        if (memberResult.success && memberResult.data) {
            alert('A member with this email already exists!');
            return;
        }
        
        // Create new member
        const newMember = {
            id: Date.now().toString(),
            name: name,
            email: email,
            phone: phone,
            password: 'Default123!', // Default password
            status: 'approved',
            date_joined: new Date().toISOString().split('T')[0],
            roles: roles,
            active: status === 'active'
        };
        
        const result = await window.supabaseDB.createMember(newMember);
        
        if (result.success) {
            // Close modal and reset form
            const modal = bootstrap.Modal.getInstance(document.getElementById('addMemberModal'));
            modal.hide();
            document.getElementById('addMemberForm').reset();
            
            // Reload data
            loadMembersData();
            
            // Record activity
            await recordAdminActivity(`Added new member: ${name}`);
            
            alert('Member added successfully!');
        } else {
            alert('Failed to add member: ' + result.error);
        }
    } catch (error) {
        console.error('Error adding member:', error);
        alert('Failed to add member. Please try again.');
    }
}

// Edit member
async function editMember(memberId) {
    try {
        const membersResult = await window.supabaseDB.getMembers();
        const members = membersResult.success ? membersResult.data : [];
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
    const memberId = document.getElementById('editMemberId').value;
    const name = document.getElementById('editMemberName').value.trim();
    const email = document.getElementById('editMemberEmail').value.trim().toLowerCase();
    const phone = document.getElementById('editMemberPhone').value.trim();
    const roles = Array.from(document.getElementById('editMemberRoles').selectedOptions).map(option => option.value);
    const status = document.getElementById('editMemberStatus').value;
    
    if (!name || !email || !phone) {
        alert('Please fill in all required fields');
        return;
    }
    
    try {
        // Update member
        const updates = {
            name: name,
            email: email,
            phone: phone,
            roles: roles,
            active: status === 'active'
        };
        
        const result = await window.supabaseDB.updateMember(memberId, updates);
        
        if (result.success) {
            // Close modal
            const modal = bootstrap.Modal.getInstance(document.getElementById('editMemberModal'));
            modal.hide();
            
            // Reload data
            loadMembersData();
            
            // Record activity
            await recordAdminActivity(`Updated member: ${name}`);
            
            alert('Member updated successfully!');
        } else {
            alert('Failed to update member: ' + result.error);
        }
    } catch (error) {
        console.error('Error updating member:', error);
        alert('Failed to update member. Please try again.');
    }
}

// Approve member
async function approveMember(memberId) {
    try {
        const result = await window.supabaseDB.updateMember(memberId, { 
            status: 'approved',
            active: true 
        });
        
        if (result.success) {
            await recordAdminActivity(`Approved member: ${result.data.name}`);
            loadMembersData();
            alert('Member approved successfully!');
        } else {
            alert('Failed to approve member: ' + result.error);
        }
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
        // Get member name before deleting
        const membersResult = await window.supabaseDB.getMembers();
        const member = membersResult.data.find(m => m.id === memberId);
        const memberName = member ? member.name : 'Unknown';
        
        const result = await window.supabaseDB.deleteMember(memberId);
        
        if (result.success) {
            await recordAdminActivity(`Rejected member application: ${memberName}`);
            loadMembersData();
            alert('Member application rejected and removed.');
        } else {
            alert('Failed to reject member: ' + result.error);
        }
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
        const result = await window.supabaseDB.updateMember(memberId, {
            active: false,
            last_active: new Date().toISOString().split('T')[0]
        });
        
        if (result.success) {
            await recordAdminActivity(`Deactivated member: ${result.data.name}`);
            loadMembersData();
            alert('Member deactivated successfully!');
        } else {
            alert('Failed to deactivate member: ' + result.error);
        }
    } catch (error) {
        console.error('Error deactivating member:', error);
        alert('Failed to deactivate member. Please try again.');
    }
}

// Activate member
async function activateMember(memberId) {
    try {
        const result = await window.supabaseDB.updateMember(memberId, { active: true });
        
        if (result.success) {
            await recordAdminActivity(`Activated member: ${result.data.name}`);
            loadMembersData();
            alert('Member activated successfully!');
        } else {
            alert('Failed to activate member: ' + result.error);
        }
    } catch (error) {
        console.error('Error activating member:', error);
        alert('Failed to activate member. Please try again.');
    }
}

// Delete member
async function deleteMember(memberId) {
    if (!confirm('Are you sure you want to permanently delete this member? This action cannot be undone.')) {
        return;
    }
    
    try {
        // Get member name before deleting
        const membersResult = await window.supabaseDB.getMembers();
        const member = membersResult.data.find(m => m.id === memberId);
        const memberName = member ? member.name : 'Unknown';
        
        const result = await window.supabaseDB.deleteMember(memberId);
        
        if (result.success) {
            await recordAdminActivity(`Deleted member: ${memberName}`);
            loadMembersData();
            alert('Member deleted successfully!');
        } else {
            alert('Failed to delete member: ' + result.error);
        }
    } catch (error) {
        console.error('Error deleting member:', error);
        alert('Failed to delete member. Please try again.');
    }
}

// Record admin activity
async function recordAdminActivity(description) {
    try {
        await window.supabaseDB.logAdminActivity(description);
    } catch (error) {
        console.error('Error recording admin activity:', error);
    }
}

// Helper function to format date
function formatDate(dateString) {
    const options = { year: 'numeric', month: 'short', day: 'numeric' };
    return new Date(dateString).toLocaleDateString(undefined, options);
}

// Helper function to calculate age from date of birth
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