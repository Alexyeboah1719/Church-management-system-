// Initialize the authentication system
document.addEventListener('DOMContentLoaded', function() {
    // Wait for Supabase to be ready
    if (window.supabaseReady) {
        initAuth();
    } else {
        window.addEventListener('supabaseReady', initAuth);
    }
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
        const result = await window.supabaseDB.getAdminAccount();
        if (!result.success) {
            console.log('Admin account already exists in database');
        }
    } catch (error) {
        console.log('Admin account check:', error);
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
        // Authenticate with Supabase
        const result = await window.supabaseDB.authenticateMember(email, password);
        
        if (result.success) {
            const member = result.data;
            
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
            alert(result.error || 'Invalid credentials or account not approved. Please check your email and password or contact admin.');
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
        // Check if email already exists
        const existingMember = await window.supabaseDB.getMemberByEmail(email);
        
        if (existingMember.success && existingMember.data) {
            alert('An account with this email already exists!');
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalText;
            return;
        }
        
        // Create new member
        const newMember = {
            name,
            email,
            phone,
            date_of_birth: dateOfBirth,
            location,
            password,
            status: 'pending',
            date_joined: new Date().toISOString().split('T')[0],
            roles: [],
            active: true
        };
        
        const result = await window.supabaseDB.createMember(newMember);
        
        if (result.success) {
            alert('Account created successfully! Please wait for admin approval.');
            showMemberLogin();
        } else {
            alert('Error creating account: ' + result.error);
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalText;
        }
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
        
        // Check if supabaseDB exists
        if (!window.supabaseDB) {
            alert('Database not initialized. Please refresh the page.');
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalText;
            return;
        }
        
        // Authenticate with Supabase
        const result = await window.supabaseDB.authenticateAdmin(email, password);
        console.log('Admin login result:', result);
        
        if (result.success) {
            const admin = result.data;
            console.log('Admin data:', admin);
            
            // Store current admin session
            localStorage.setItem('currentUser', JSON.stringify({
                id: 'admin',
                name: admin.name,
                email: admin.email,
                type: 'admin'
            }));
            
            console.log('Redirecting to admin dashboard...');
            // Redirect to admin dashboard
            window.location.href = 'admin-dashboard.html';
        } else {
            console.error('Login failed:', result.error);
            alert('Invalid admin credentials! Error: ' + (result.error || 'Unknown error'));
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
        // Check if email exists in Supabase
        const result = await window.supabaseDB.getMemberByEmail(email);
        
        if (result.success && result.data) {
            const member = result.data;
            
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
            
            // Send OTP via SMS
            const smsMessage = `Your COP Youth password reset OTP is: ${otp}. Valid for 10 minutes. Do not share this code with anyone.`;
            
            const smsResult = await window.sendSMS(member.phone, smsMessage);
            
            if (smsResult.success) {
                // Show OTP form
                showOtpForm();
                
                if (smsResult.demo) {
                    // Demo mode - show OTP in alert
                    alert(`DEMO MODE: OTP sent to ${member.phone}\n\nYour OTP: ${otp}\n\n(In production, OTP is sent via SMS without showing it here)`);
                } else {
                    // Production mode - OTP sent via SMS
                    alert(`OTP sent to ${member.phone} via SMS. Please check your phone and enter the code. Valid for 10 minutes.`);
                }
            } else {
                // SMS sending failed
                alert(`Failed to send OTP via SMS: ${smsResult.error}\n\nPlease contact admin for assistance.`);
                submitBtn.disabled = false;
                submitBtn.innerHTML = originalText;
                return;
            }
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
            // Get member from Supabase
            const memberResult = await window.supabaseDB.getMemberByEmail(resetData.email);
            
            if (memberResult.success && memberResult.data) {
                // Update password in Supabase
                const updateResult = await window.supabaseDB.updateMember(memberResult.data.id, {
                    password: newPassword
                });
                
                if (updateResult.success) {
                    localStorage.removeItem('resetOtp');
                    alert('Password reset successfully! You can now login with your new password.');
                    showMemberLogin();
                } else {
                    alert('Error updating password: ' + updateResult.error);
                    submitBtn.disabled = false;
                    submitBtn.innerHTML = originalText;
                }
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
