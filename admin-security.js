// Advanced Security System for Admin Panel
class AdminSecurity {
  constructor() {
    this.sessionTimeout = 30 * 60 * 1000; // 30 minutes
    this.maxLoginAttempts = 3;
    this.lockoutDuration = 15 * 60 * 1000; // 15 minutes
    this.sessionKey = 'adminSession';
    this.attemptsKey = 'loginAttempts';
    this.lockoutKey = 'lockoutTime';
    this.csrfToken = this.generateCSRFToken();
    
    this.initSecurity();
  }

  initSecurity() {
    // Check for existing session
    this.checkSession();
    
    // Set up session monitoring
    this.startSessionMonitoring();
    
    // Set up security event listeners
    this.setupSecurityListeners();
    
    // Initialize CSRF protection
    this.initCSRFProtection();
  }

  generateCSRFToken() {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
  }

  hashPassword(password, salt) {
    // Simple but effective client-side hashing
    const combined = password + salt + 'METHODS_ADMIN_2025';
    let hash = 0;
    for (let i = 0; i < combined.length; i++) {
      const char = combined.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(16);
  }

  validateCredentials(username, password) {
    // Secure credential validation
    const validUsers = {
      'admin': {
        passwordHash: this.hashPassword('Methods@2025!Admin', 'methods_salt'),
        salt: 'methods_salt',
        role: 'admin'
      },
      'manager': {
        passwordHash: this.hashPassword('Manager@Methods2025', 'manager_salt'),
        salt: 'manager_salt',
        role: 'manager'
      }
    };

    const user = validUsers[username.toLowerCase()];
    if (!user) return false;

    const inputHash = this.hashPassword(password, user.salt);
    return inputHash === user.passwordHash;
  }

  checkLoginAttempts() {
    const attempts = parseInt(localStorage.getItem(this.attemptsKey) || '0');
    const lockoutTime = parseInt(localStorage.getItem(this.lockoutKey) || '0');
    
    if (lockoutTime > Date.now()) {
      const remainingTime = Math.ceil((lockoutTime - Date.now()) / 1000 / 60);
      throw new Error(`Account locked. Try again in ${remainingTime} minutes.`);
    }

    if (attempts >= this.maxLoginAttempts) {
      localStorage.setItem(this.lockoutKey, (Date.now() + this.lockoutDuration).toString());
      localStorage.setItem(this.attemptsKey, '0');
      throw new Error('Too many failed attempts. Account locked for 15 minutes.');
    }

    return attempts;
  }

  recordLoginAttempt(success) {
    if (success) {
      localStorage.removeItem(this.attemptsKey);
      localStorage.removeItem(this.lockoutKey);
    } else {
      const attempts = parseInt(localStorage.getItem(this.attemptsKey) || '0') + 1;
      localStorage.setItem(this.attemptsKey, attempts.toString());
    }
  }

  createSession(username) {
    const sessionData = {
      username: username,
      loginTime: Date.now(),
      lastActivity: Date.now(),
      csrfToken: this.csrfToken,
      sessionId: this.generateSessionId()
    };

    // Encrypt session data
    const encryptedSession = this.encryptData(JSON.stringify(sessionData));
    localStorage.setItem(this.sessionKey, encryptedSession);
    
    return sessionData;
  }

  generateSessionId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  encryptData(data) {
    // Simple XOR encryption for client-side storage
    const key = 'METHODS_SECURE_KEY_2025';
    let encrypted = '';
    for (let i = 0; i < data.length; i++) {
      encrypted += String.fromCharCode(data.charCodeAt(i) ^ key.charCodeAt(i % key.length));
    }
    return btoa(encrypted);
  }

  decryptData(encryptedData) {
    try {
      const data = atob(encryptedData);
      const key = 'METHODS_SECURE_KEY_2025';
      let decrypted = '';
      for (let i = 0; i < data.length; i++) {
        decrypted += String.fromCharCode(data.charCodeAt(i) ^ key.charCodeAt(i % key.length));
      }
      return decrypted;
    } catch (error) {
      return null;
    }
  }

  checkSession() {
    const encryptedSession = localStorage.getItem(this.sessionKey);
    if (!encryptedSession) return false;

    const sessionData = this.decryptData(encryptedSession);
    if (!sessionData) {
      this.logout();
      return false;
    }

    try {
      const session = JSON.parse(sessionData);
      const now = Date.now();

      // Check session timeout
      if (now - session.lastActivity > this.sessionTimeout) {
        this.logout();
        return false;
      }

      // Update last activity
      session.lastActivity = now;
      const updatedSession = this.encryptData(JSON.stringify(session));
      localStorage.setItem(this.sessionKey, updatedSession);

      return session;
    } catch (error) {
      this.logout();
      return false;
    }
  }

  updateActivity() {
    const session = this.checkSession();
    if (session) {
      session.lastActivity = Date.now();
      const updatedSession = this.encryptData(JSON.stringify(session));
      localStorage.setItem(this.sessionKey, updatedSession);
    }
  }

  startSessionMonitoring() {
    // Update activity on user interaction
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
    events.forEach(event => {
      document.addEventListener(event, () => this.updateActivity(), true);
    });

    // Check session every minute
    setInterval(() => {
      if (!this.checkSession()) {
        this.showSessionExpiredMessage();
      }
    }, 60000);
  }

  setupSecurityListeners() {
    // Prevent right-click context menu
    document.addEventListener('contextmenu', (e) => {
      if (document.getElementById('adminPanel').style.display !== 'none') {
        e.preventDefault();
      }
    });

    // Prevent F12, Ctrl+Shift+I, Ctrl+U
    document.addEventListener('keydown', (e) => {
      if (document.getElementById('adminPanel').style.display !== 'none') {
        if (e.key === 'F12' || 
            (e.ctrlKey && e.shiftKey && e.key === 'I') ||
            (e.ctrlKey && e.key === 'u')) {
          e.preventDefault();
          this.showSecurityWarning();
        }
      }
    });

    // Detect developer tools
    this.detectDevTools();
  }

  detectDevTools() {
    const threshold = 160;
    setInterval(() => {
      if (document.getElementById('adminPanel').style.display !== 'none') {
        if (window.outerHeight - window.innerHeight > threshold || 
            window.outerWidth - window.innerWidth > threshold) {
          this.showSecurityWarning();
        }
      }
    }, 1000);
  }

  initCSRFProtection() {
    // Add CSRF token to all forms
    const forms = document.querySelectorAll('form');
    forms.forEach(form => {
      const csrfInput = document.createElement('input');
      csrfInput.type = 'hidden';
      csrfInput.name = 'csrf_token';
      csrfInput.value = this.csrfToken;
      form.appendChild(csrfInput);
    });
  }

  validateCSRF(token) {
    return token === this.csrfToken;
  }

  showSecurityWarning() {
    const warning = document.createElement('div');
    warning.className = 'security-indicator show';
    warning.textContent = 'Security Warning: Unauthorized access detected!';
    warning.style.background = 'rgba(220, 53, 69, 0.9)';
    document.body.appendChild(warning);

    setTimeout(() => {
      warning.remove();
    }, 5000);

    // Log security event
    console.warn('Security event detected at:', new Date().toISOString());
  }

  showSessionExpiredMessage() {
    alert('Your session has expired for security reasons. Please log in again.');
    this.logout();
  }

  logout() {
    localStorage.removeItem(this.sessionKey);
    document.getElementById('loginScreen').style.display = 'flex';
    document.getElementById('adminPanel').style.display = 'none';
    
    // Clear all form data
    document.querySelectorAll('input').forEach(input => {
      if (input.type !== 'file') input.value = '';
    });

    // Show security indicator
    const indicator = document.createElement('div');
    indicator.className = 'security-indicator show';
    indicator.textContent = 'Logged out successfully';
    document.body.appendChild(indicator);

    setTimeout(() => {
      indicator.remove();
    }, 3000);
  }

  // Rate limiting for API calls
  rateLimiter = {
    calls: new Map(),
    limit: 10, // 10 calls per minute
    window: 60000, // 1 minute

    canMakeCall(action) {
      const now = Date.now();
      const key = action;
      
      if (!this.calls.has(key)) {
        this.calls.set(key, []);
      }

      const calls = this.calls.get(key);
      
      // Remove old calls outside the window
      const validCalls = calls.filter(time => now - time < this.window);
      this.calls.set(key, validCalls);

      if (validCalls.length >= this.limit) {
        return false;
      }

      validCalls.push(now);
      return true;
    }
  };

  // Input sanitization
  sanitizeInput(input) {
    if (typeof input !== 'string') return input;
    
    return input
      .replace(/[<>]/g, '') // Remove potential HTML tags
      .replace(/javascript:/gi, '') // Remove javascript: protocol
      .replace(/on\w+=/gi, '') // Remove event handlers
      .trim();
  }

  // Validate file uploads
  validateFile(file) {
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    const maxSize = 5 * 1024 * 1024; // 5MB

    if (!allowedTypes.includes(file.type)) {
      throw new Error('Invalid file type. Only images are allowed.');
    }

    if (file.size > maxSize) {
      throw new Error('File too large. Maximum size is 5MB.');
    }

    return true;
  }
}

// Initialize security system
window.adminSecurity = new AdminSecurity();