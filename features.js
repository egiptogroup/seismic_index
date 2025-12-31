/**
 * Feature Control System
 * Handles: Login/Signup UI, 'I Felt It' Logic, Emergency Mode, and Impact Simulation
 */

// --- Authentication UI Logic ---

document.addEventListener('DOMContentLoaded', () => {
    checkUserSession();
});

function checkUserSession() {
    const user = Auth.checkSession();
    if (user) {
        document.getElementById('loginBtnNav').style.display = 'none';
        document.getElementById('userProfileDisplay').style.display = 'flex';
        document.getElementById('userNameDisplay').innerText = user.username;
        document.getElementById('navAvatar').innerText = user.username.charAt(0).toUpperCase();

        if (user.role === 'admin') {
            document.getElementById('adminLink').style.display = 'block';
        }
    } else {
        document.getElementById('loginBtnNav').style.display = 'block';
        document.getElementById('userProfileDisplay').style.display = 'none';
        // Reset Admin View
        document.getElementById('adminLink').style.display = 'none';
    }
}

function openLoginModal() {
    document.getElementById('authModal').classList.add('active');
    document.getElementById('authModal').style.visibility = 'visible';
    document.getElementById('authModal').style.opacity = '1';
    switchAuthMode('login');
}

function switchAuthMode(mode) {
    if (mode === 'signup') {
        document.getElementById('loginForm').style.display = 'none';
        document.getElementById('signupForm').style.display = 'block';
    } else {
        document.getElementById('loginForm').style.display = 'block';
        document.getElementById('signupForm').style.display = 'none';
    }
}

function handleLogin() {
    const email = document.getElementById('loginEmail').value;
    const pass = document.getElementById('loginPass').value;

    // Basic Validation
    if (!email || !pass) {
        alert("Please enter security credentials");
        return;
    }

    const res = Auth.login(email, pass);
    if (res.success) {
        document.getElementById('authModal').classList.remove('active');
        checkUserSession();
        window.Utils.showToast ? window.Utils.showToast("Access Granted") : alert("Access Granted");
    } else {
        alert(res.message);
    }
}

function handleSignup() {
    const name = document.getElementById('regName').value;
    const email = document.getElementById('regEmail').value;
    const pass = document.getElementById('regPass').value;

    if (!name || !email || !pass) {
        alert("All fields required for registration");
        return;
    }

    const res = Auth.signup(name, email, pass);
    if (res.success) {
        alert("Identity Verified. Please Login.");
        switchAuthMode('login');
    } else {
        alert(res.message);
    }
}

function toggleUserDropdown() {
    const dropdown = document.getElementById('userDropdown');
    dropdown.style.display = dropdown.style.display === 'none' ? 'block' : 'none';
}

// --- 'I Felt It' Report Logic ---

function reportQuake() {
    // 1. Geolocate User
    if (!navigator.geolocation) {
        alert("Geolocation not supported. Cannot verify report location.");
        return;
    }

    if (confirm("REPORT CONFIRMATION: Did you feel shaking just now? This will be logged permanently in the system.")) {
        navigator.geolocation.getCurrentPosition(pos => {
            const { latitude, longitude } = pos.coords;

            // In a real app, send to API. Here, mock it.
            console.log(`Report received from: ${latitude}, ${longitude}`);

            // Visual Feedback
            window.Utils.showToast ? window.Utils.showToast("Report Submitted. Analyzing Data...") : alert("Report Scanned.");

            // Update Admin Stats (Mock)
            updateAdminStats();

        }, err => {
            alert("Location access denied. Report failed.");
        });
    }
}

function updateAdminStats() {
    // Just a mock increment in local storage for the dashboard
    let reports = localStorage.getItem('mock_reports_count') || 0;
    reports = parseInt(reports) + 1;
    localStorage.setItem('mock_reports_count', reports);
}


// --- Emergency Mode Logic ---

let isEmergency = false;
function toggleEmergencyMode() {
    isEmergency = !isEmergency;
    const overlay = document.getElementById('emergencyOverlay');

    if (isEmergency) {
        overlay.style.display = 'flex';
        // Play Siren Logic (Mock)
        // new Audio('siren.mp3').play(); 
    } else {
        overlay.style.display = 'none';
    }
}
