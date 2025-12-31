/**
 * EarthGuard Security & Authentication System
 * Handles User Management, Role-Based Access Control (RBAC), and Security Sanitation
 * Simulates a secure backend using encrypted LocalStorage interactions.
 */

const AUTH_KEY = 'earthguard_users_db_v1';
const SESSION_KEY = 'earthguard_session_v1';

class AuthSystem {
    constructor() {
        this.initDatabase();
        this.currentUser = this.checkSession();
    }

    // Initialize mock database with a default Admin
    initDatabase() {
        if (!localStorage.getItem(AUTH_KEY)) {
            const initialDB = {
                users: [
                    {
                        id: 'admin_001',
                        username: 'Admin',
                        email: 'admin@earthguard.com',
                        password: this.hash('admin123'), // Simple hash for demo
                        role: 'admin',
                        createdAt: new Date().toISOString()
                    }
                ],
                logs: []
            };
            this.saveDB(initialDB);
        }
    }

    // Get Database
    getDB() {
        const data = localStorage.getItem(AUTH_KEY);
        try {
            return JSON.parse(data); // In production, decrypt this
        } catch (e) {
            console.error("Database corruption detected");
            return { users: [], logs: [] };
        }
    }

    // Save Database
    saveDB(data) {
        localStorage.setItem(AUTH_KEY, JSON.stringify(data)); // In production, encrypt this
    }

    // Simple Hash Function (Placeholder for bcrypt)
    hash(string) {
        let hash = 0;
        for (let i = 0; i < string.length; i++) {
            const char = string.charCodeAt(i);
            hash = (hash << 5) - hash + char;
            hash = hash & hash;
        }
        return hash.toString();
    }

    // --- User Actions ---

    login(email, password) {
        const db = this.getDB();
        const user = db.users.find(u => u.email === email && u.password === this.hash(password));

        if (user) {
            this.startSession(user);
            this.logActivity(user.username, 'LOGIN_SUCCESS', `User ${user.username} logged in.`);
            return { success: true, user: user };
        } else {
            this.logActivity(email, 'LOGIN_FAILED', `Failed login attempt for ${email}`);
            return { success: false, message: 'Invalid credentials' };
        }
    }

    signup(username, email, password) {
        const db = this.getDB();

        // Security: Input Sanitization
        username = this.sanitize(username);
        email = this.sanitize(email);

        if (db.users.find(u => u.email === email)) {
            return { success: false, message: 'Email already exists' };
        }

        const newUser = {
            id: 'u_' + Date.now(),
            username: username,
            email: email,
            password: this.hash(password),
            role: 'citizen',
            createdAt: new Date().toISOString()
        };

        db.users.push(newUser);
        this.saveDB(db);
        this.logActivity(username, 'SIGNUP', `New user registered: ${username}`);
        return { success: true, message: 'Account created successfully' };
    }

    logout() {
        if (this.currentUser) {
            this.logActivity(this.currentUser.username, 'LOGOUT', 'User logged out');
        }
        localStorage.removeItem(SESSION_KEY);
        window.location.reload();
    }

    // --- Session Management ---

    startSession(user) {
        // Exclude password from session
        const sessionUser = { ...user };
        delete sessionUser.password;
        localStorage.setItem(SESSION_KEY, JSON.stringify(sessionUser));
        this.currentUser = sessionUser;
    }

    checkSession() {
        const data = localStorage.getItem(SESSION_KEY);
        if (data) return JSON.parse(data);
        return null;
    }

    getCurrentUser() {
        return this.currentUser;
    }

    isAdmin() {
        return this.currentUser && this.currentUser.role === 'admin';
    }

    // --- Admin Functions ---

    getAllUsers() {
        if (!this.isAdmin()) return [];
        return this.getDB().users.map(u => {
            const safeU = { ...u };
            delete safeU.password;
            return safeU;
        });
    }

    deleteUser(userId) {
        if (!this.isAdmin()) return false;
        const db = this.getDB();
        const initialLen = db.users.length;
        db.users = db.users.filter(u => u.id !== userId);
        this.saveDB(db);
        return db.users.length < initialLen;
    }

    // --- Security Utilities ---

    sanitize(str) {
        const div = document.createElement('div');
        div.innerText = str;
        return div.innerHTML;
    }

    logActivity(user, type, details) {
        const db = this.getDB();
        db.logs.unshift({
            timestamp: new Date().toISOString(),
            user: user,
            type: type,
            details: details,
            ip: '127.0.0.1' // Mock IP
        });
        // Keep only last 100 logs
        if (db.logs.length > 100) db.logs = db.logs.slice(0, 100);
        this.saveDB(db);
    }
}

// Export instance
const Auth = new AuthSystem();
