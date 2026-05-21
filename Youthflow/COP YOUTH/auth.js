// Initialize the authentication system
document.addEventListener('DOMContentLoaded', function() {
    initAuth();
});

function initAuth() {
    // Initialize default admin account if not exists
    initializeDefaultAdmin();
    
    // Check URL parameters to determine which form to show
    const urlParams = new URLSearchParams(window.location.search);
    const isSignup = urlParams.get('signup');
    const isAdmin = urlParams.get('admin');
    
    if (isSignup) {
        showMemberSignup();
    } else if (isAdmin) {
        showAdminLogin();
    }
    
    // Setup event listeners
    setupEventListeners();
}

// Initialize default admin account
async function initializeDefaultAdmin() {
    try {
        // Check if admin exists in localStorage
        const adminAccount = localStorage.getItem('adminAccount');
        if (!adminAccount) {
            // Create default admin account
            const defaultAdmin = {
                email: 'admin@youthflow.com',
                password: 'admin123',
                name: 'System Administrator',
                type: 'admin',
                created: new Date().toISOString()
            };
            localStorage.setItem('adminAccount', JSON.stringify(defaultAdmin));
            console.log('Default admin account created in localStorage');
        }
    } catch (error) {
        console.log('Admin account setup:', error);
    }
}

// Setup all event listeners
function setupEventListeners() {
    // Toggle between member and admin login
    document.getElementById('memberBtn').addEventListener('click', showMemberLogin);
    document.getElementById('adminBtn').addEventListener('click', showAdminLogin);
    
    // Toggle between login and signup for members
    document.getElementById('showSignup').addEventListener('click', showMemberSignup);
    document.getElementById('showLogin').addEventListener('click', showMemberLogin);
    
    // Forgot password flow
    document.getElementById('forgotPasswordLink').addEventListener('click', showForgotPassword);
    document.getElementById('backToLogin').addEventListener('click', showMemberLogin);
    
    // Password visibility toggles
    document.querySelectorAll('.toggle-password').forEach(item => {
        item.addEventListener('click', function() {
            const passwordInput = this.parentNode.querySelector('input');
            const icon = this.querySelector('i');
            
            if (passwordInput.type === 'password') {
                passwordInput.type = 'text';
                icon.classList.remove('fa-eye');
                icon.classList.add('fa-eye-slash');
            } else {
                passwordInput.type = 'password';
                icon.classList.remove('fa-eye-slash');
                icon.classList.add('fa-eye');
            }
        });
    });
    
    // Form submissions
    document.getElementById('memberLogin').addEventListener('submit', handleMemberLogin);
    document.getElementById('memberSignup').addEventListener('submit', handleMemberSignup);
    document.getElementById('adminLogin').addEventListener('submit', handleAdminLogin);
    document.getElementById('forgotPassword').addEventListener('submit', handleForgotPassword);
    document.getElementById('verifyOtp').addEventListener('submit', handleOtpVerification);
}

// Show member login form
function showMemberLogin() {
    document.getElementById('memberBtn').classList.add('active');
    document.getElementById('adminBtn').classList.remove('active');
    
    document.getElementById('memberLoginForm').classList.remove('d-none');
    document.getElementById('memberSignupForm').classList.add('d-none');
    document.getElementById('adminLoginForm').classList.add('d-none');
    document.getElementById('forgotPasswordForm').classList.add('d-none');
    document.getElementById('otpForm').classList.add('d-none');
}

// Show member signup form
function showMemberSignup() {
    document.getElementById('memberBtn').classList.add('active');
    document.getElementById('adminBtn').classList.remove('active');
    
    document.getElementById('memberLoginForm').classList.add('d-none');
    document.getElementById('memberSignupForm').classList.remove('d-none');
    document.getElementById('adminLoginForm').classList.add('d-none');
    document.getElementById('forgotPasswordForm').classList.add('d-none');
    document.getElementById('otpForm').classList.add('d-none');
}

// Show admin login form
function showAdminLogin() {
    document.getElementById('memberBtn').classList.remove('active');
    document.getElementById('adminBtn').classList.add('active');
    
    document.getElementById('memberLoginForm').classList.add('d-none');
    document.getElementById('memberSignupForm').classList.add('d-none');
    document.getElementById('adminLoginForm').classList.remove('d-none');
    document.getElementById('forgotPasswordForm').classList.add('d-none');
    document.getElementById('otpForm').classList.add('d-none');
}

// Show forgot password form
function showForgotPassword() {
    document.getElementById('memberLoginForm').classList.add('d-none');
    document.getElementById('forgotPasswordForm').classList.remove('d-none');
}

// Show OTP verification form
function showOtpForm() {
    document.getElementById('forgotPasswordForm').classList.add('d-none');
    document.getElementById('otpForm').classList.remove('d-none');
}

// Handle member login
async function handleMemberLogin(e) {
    e.preventDefault();
    
    const email = document.getElementById('memberEmail').value.toLowerCase().trim();
    const password = document.getElementById('memberPassword').value;
    
    // Show loading state
    const submitBtn = e.target.querySelector('button[type="submit"]');
    const originalText = submitBtn.innerHTML;
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Logging in...';
    
    try {
        // Authenticate with localStorage
        const members = JSON.parse(localStorage.getItem('members') || '[]');
        const member = members.find(m => m.email === email && m.password === password && m.status === 'approved');
        
        if (member) {
            // Store current user session
            localStorage.setItem('currentUser', JSON.stringify({
                id: member.id,
                name: member.name,
                email: member.email,
                phone: member.phone,
                type: 'member'
            }));
            
            // Redirect to member dashboard
            window.location.href = 'member-dashboard.html';
        } else {
            alert('Invalid credentials or account not approved. Please check your email and password or contact admin.');
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalText;
        }
    } catch (error) {
        console.error('Login error:', error);
        alert('An error occurred during login. Please try again.');
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalText;
    }
}

// Handle member signup
async function handleMemberSignup(e) {
    e.preventDefault();
    
    const name = document.getElementById('signupName').value.trim();
    const email = document.getElementById('signupEmail').value.toLowerCase().trim();
    const phone = document.getElementById('signupPhone').value.trim();
    const dateOfBirth = document.getElementById('signupDateOfBirth').value;
    const location = document.getElementById('signupLocation').value.trim();
    const occupation = document.getElementById('signupOccupation').value.trim();
    const baptized = document.querySelector('input[name="signupBaptized"]:checked')?.value || '';
    const password = document.getElementById('signupPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    
    // Validate passwords match
    if (password !== confirmPassword) {
        alert('Passwords do not match!');
        return;
    }
    
    // Show loading state
    const submitBtn = e.target.querySelector('button[type="submit"]');
    const originalText = submitBtn.innerHTML;
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Creating account...';
    
    try {
        // Check if email already exists in localStorage
        const members = JSON.parse(localStorage.getItem('members') || '[]');
        const existingMember = members.find(m => m.email === email);
        
        if (existingMember) {
            alert('An account with this email already exists!');
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalText;
            return;
        }
        
        // Create new member
        const newMember = {
            id: Date.now().toString(),
            name,
            email,
            phone,
            date_of_birth: dateOfBirth,
            location,
            occupation,
            baptized,
            password,
            status: 'pending',
            date_joined: new Date().toISOString().split('T')[0],
            roles: [],
            active: true
        };
        
        // Save to localStorage
        members.push(newMember);
        localStorage.setItem('members', JSON.stringify(members));
        
        alert('Account created successfully! Please wait for admin approval.');
        showMemberLogin();
    } catch (error) {
        console.error('Signup error:', error);
        alert('An error occurred during signup. Please try again.');
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalText;
    }
}

// Handle admin login
async function handleAdminLogin(e) {
    e.preventDefault();
    
    const email = document.getElementById('adminEmail').value.toLowerCase().trim();
    const password = document.getElementById('adminPassword').value;
    
    // Show loading state
    const submitBtn = e.target.querySelector('button[type="submit"]');
    const originalText = submitBtn.innerHTML;
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Logging in...';
    
    try {
        console.log('Attempting admin login with email:', email);
        
        // Get admin account from localStorage
        const adminAccount = JSON.parse(localStorage.getItem('adminAccount') || '{}');
        
        if (adminAccount.email === email && adminAccount.password === password) {
            console.log('Admin login successful');
            
            // Store current admin session
            localStorage.setItem('currentUser', JSON.stringify({
                id: 'admin',
                name: adminAccount.name,
                email: adminAccount.email,
                type: 'admin'
            }));
            
            console.log('Redirecting to admin dashboard...');
            // Redirect to admin dashboard
            window.location.href = 'admin-dashboard.html';
        } else {
            console.error('Login failed: Invalid credentials');
            alert('Invalid admin credentials!');
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalText;
        }
    } catch (error) {
        console.error('Admin login error:', error);
        alert('An error occurred during login: ' + error.message);
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalText;
    }
}

// Handle forgot password
async function handleForgotPassword(e) {
    e.preventDefault();
    
    const email = document.getElementById('resetEmail').value.toLowerCase().trim();
    
    // Show loading state
    const submitBtn = e.target.querySelector('button[type="submit"]');
    const originalText = submitBtn.innerHTML;
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Checking...';
    
    try {
        // Check if email exists in localStorage
        const members = JSON.parse(localStorage.getItem('members') || '[]');
        const member = members.find(m => m.email === email);
        
        if (member) {
            // Check if member has a phone number
            if (!member.phone) {
                alert('No phone number registered for this account. Please contact admin for password reset.');
                submitBtn.disabled = false;
                submitBtn.innerHTML = originalText;
                return;
            }
            
            // Generate 6-digit OTP
            const otp = Math.floor(100000 + Math.random() * 900000).toString();
            
            // Store OTP data
            localStorage.setItem('resetOtp', JSON.stringify({
                email: email,
                otp: otp,
                timestamp: Date.now()
            }));
            
            // Update button to show sending SMS
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Sending OTP via SMS...';
            
            // Simulate SMS sending (demo mode)
            const smsMessage = `Your COP Youth password reset OTP is: ${otp}. Valid for 10 minutes. Do not share this code with anyone.`;
            
            // Show OTP form with demo message
            showOtpForm();
            alert(`DEMO MODE: OTP would be sent to ${member.phone}\n\nYour OTP: ${otp}\n\n(Note: SMS functionality has been removed - this is frontend only)`);
        } else {
            alert('No account found with this email address!');
        }
        
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalText;
    } catch (error) {
        console.error('Forgot password error:', error);
        alert('An error occurred. Please try again.');
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalText;
    }
}

// Handle OTP verification and password reset
async function handleOtpVerification(e) {
    e.preventDefault();
    
    const otpCode = document.getElementById('otpCode').value;
    const newPassword = document.getElementById('newPassword').value;
    
    // Get stored OTP data
    const resetData = JSON.parse(localStorage.getItem('resetOtp'));
    
    if (!resetData) {
        alert('OTP session expired. Please try again.');
        showForgotPassword();
        return;
    }
    
    // Check if OTP is valid (within 10 minutes)
    if (Date.now() - resetData.timestamp > 10 * 60 * 1000) {
        alert('OTP has expired. Please request a new one.');
        localStorage.removeItem('resetOtp');
        showForgotPassword();
        return;
    }
    
    // Verify OTP
    if (resetData.otp === otpCode) {
        // Show loading state
        const submitBtn = e.target.querySelector('button[type="submit"]');
        const originalText = submitBtn.innerHTML;
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Resetting password...';
        
        try {
            // Get member from localStorage
            const members = JSON.parse(localStorage.getItem('members') || '[]');
            const memberIndex = members.findIndex(m => m.email === resetData.email);
            
            if (memberIndex !== -1) {
                // Update password in localStorage
                members[memberIndex].password = newPassword;
                localStorage.setItem('members', JSON.stringify(members));
                
                localStorage.removeItem('resetOtp');
                alert('Password reset successfully! You can now login with your new password.');
                showMemberLogin();
            } else {
                alert('Error finding account. Please try again.');
                submitBtn.disabled = false;
                submitBtn.innerHTML = originalText;
            }
        } catch (error) {
            console.error('Password reset error:', error);
            alert('An error occurred. Please try again.');
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalText;
        }
    } else {
        alert('Invalid OTP code!');
    }
}
