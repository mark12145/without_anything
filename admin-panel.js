// Admin Panel Management System
class AdminPanel {
  constructor() {
    this.currentUser = null;
    this.unsavedChanges = false;
    this.init();
  }

  init() {
    this.setupEventListeners();
    this.loadCurrentPrices();
    this.setupBeforeUnloadWarning();
  }

  setupEventListeners() {
    // Login form
    document.getElementById('loginForm').addEventListener('submit', (e) => {
      this.handleLogin(e);
    });

    // Logout button
    document.getElementById('logoutBtn').addEventListener('click', () => {
      this.handleLogout();
    });

    // Tab switching
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        this.switchTab(e.target.dataset.tab);
      });
    });

    // Save buttons
    document.getElementById('savePricesBtn').addEventListener('click', () => {
      this.savePrices();
    });

    document.getElementById('saveImagesBtn').addEventListener('click', () => {
      this.saveImages();
    });

    // Track changes in price inputs
    document.querySelectorAll('input[type="number"]').forEach(input => {
      input.addEventListener('input', () => {
        this.unsavedChanges = true;
        this.updateSaveButtonState();
      });
    });

    // File input handlers
    document.querySelectorAll('input[type="file"]').forEach(input => {
      input.addEventListener('change', (e) => {
        this.handleFileSelection(e);
      });
    });
  }

  async handleLogin(e) {
    e.preventDefault();
    
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value;
    const errorDiv = document.getElementById('loginError');

    // Clear previous errors
    errorDiv.style.display = 'none';
    errorDiv.textContent = '';

    // Input validation
    if (!username || !password) {
      this.showError('Please enter both username and password.');
      return;
    }

    try {
      // Check login attempts
      window.adminSecurity.checkLoginAttempts();

      // Add loading state
      const loginBtn = document.querySelector('.login-btn');
      const originalText = loginBtn.textContent;
      loginBtn.innerHTML = '<span class="loading"></span> Authenticating...';
      loginBtn.disabled = true;

      // Simulate network delay for security
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Validate credentials
      if (window.adminSecurity.validateCredentials(username, password)) {
        // Create secure session
        const session = window.adminSecurity.createSession(username);
        this.currentUser = session;

        // Record successful login
        window.adminSecurity.recordLoginAttempt(true);

        // Show admin panel
        this.showAdminPanel();
        
        // Clear form
        document.getElementById('loginForm').reset();
        
        // Show success message
        this.showSuccessMessage('Login successful!');
      } else {
        // Record failed login
        window.adminSecurity.recordLoginAttempt(false);
        throw new Error('Invalid username or password.');
      }
    } catch (error) {
      this.showError(error.message);
    } finally {
      // Restore login button
      const loginBtn = document.querySelector('.login-btn');
      loginBtn.textContent = originalText;
      loginBtn.disabled = false;
    }
  }

  handleLogout() {
    if (this.unsavedChanges) {
      if (!confirm('You have unsaved changes. Are you sure you want to logout?')) {
        return;
      }
    }

    window.adminSecurity.logout();
    this.currentUser = null;
    this.unsavedChanges = false;
  }

  showAdminPanel() {
    document.getElementById('loginScreen').style.display = 'none';
    document.getElementById('adminPanel').style.display = 'block';
    document.getElementById('adminUser').textContent = `Welcome, ${this.currentUser.username}`;
  }

  switchTab(tabName) {
    // Update tab buttons
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.classList.remove('active');
    });
    document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');

    // Update tab content
    document.querySelectorAll('.tab-content').forEach(content => {
      content.classList.remove('active');
    });
    document.getElementById(`${tabName}Tab`).classList.add('active');
  }

  loadCurrentPrices() {
    try {
      // Load prices from localStorage
      const storedPrices = localStorage.getItem('methodsRoomPrices');
      if (storedPrices) {
        const prices = JSON.parse(storedPrices);
        this.populatePriceInputs(prices.prices);
      }
    } catch (error) {
      console.warn('Could not load stored prices:', error);
    }
  }

  populatePriceInputs(prices) {
    if (!prices) return;

    Object.keys(prices).forEach(roomType => {
      const room = prices[roomType];
      if (room.morning) {
        Object.keys(room.morning).forEach(period => {
          const input = document.getElementById(`${roomType}-morning-${period}`);
          if (input) input.value = room.morning[period];
        });
      }
      if (room.evening) {
        Object.keys(room.evening).forEach(period => {
          const input = document.getElementById(`${roomType}-evening-${period}`);
          if (input) input.value = room.evening[period];
        });
      }
    });
  }

  async savePrices() {
    if (!window.adminSecurity.rateLimiter.canMakeCall('savePrices')) {
      this.showError('Too many requests. Please wait before trying again.');
      return;
    }

    const saveBtn = document.getElementById('savePricesBtn');
    const statusDiv = document.getElementById('pricesSaveStatus');
    
    try {
      // Show loading state
      saveBtn.innerHTML = '<span class="loading"></span> Saving...';
      saveBtn.disabled = true;
      statusDiv.className = 'save-status';
      statusDiv.style.display = 'none';

      // Collect all price data
      const prices = {
        training: {
          morning: {
            hourly: parseInt(document.getElementById('training-morning-hourly').value) || 0,
            daily: parseInt(document.getElementById('training-morning-daily').value) || 0,
            monthly: parseInt(document.getElementById('training-morning-monthly').value) || 0
          },
          evening: {
            hourly: parseInt(document.getElementById('training-evening-hourly').value) || 0,
            daily: parseInt(document.getElementById('training-evening-daily').value) || 0,
            monthly: parseInt(document.getElementById('training-evening-monthly').value) || 0
          }
        },
        private: {
          morning: {
            hourly: parseInt(document.getElementById('private-morning-hourly').value) || 0,
            daily: parseInt(document.getElementById('private-morning-daily').value) || 0,
            monthly: parseInt(document.getElementById('private-morning-monthly').value) || 0
          },
          evening: {
            hourly: parseInt(document.getElementById('private-evening-hourly').value) || 0,
            daily: parseInt(document.getElementById('private-evening-daily').value) || 0,
            monthly: parseInt(document.getElementById('private-evening-monthly').value) || 0
          }
        },
        meeting: {
          morning: {
            hourly: parseInt(document.getElementById('meeting-morning-hourly').value) || 0,
            daily: parseInt(document.getElementById('meeting-morning-daily').value) || 0,
            monthly: parseInt(document.getElementById('meeting-morning-monthly').value) || 0
          },
          evening: {
            hourly: parseInt(document.getElementById('meeting-evening-hourly').value) || 0,
            daily: parseInt(document.getElementById('meeting-evening-daily').value) || 0,
            monthly: parseInt(document.getElementById('meeting-evening-monthly').value) || 0
          }
        }
      };

      // Validate prices
      this.validatePrices(prices);

      // Simulate save delay
      await new Promise(resolve => setTimeout(resolve, 1500));

      // Save to localStorage with timestamp
      const priceData = {
        prices: prices,
        timestamp: Date.now(),
        updatedBy: this.currentUser.username
      };

      localStorage.setItem('methodsRoomPrices', JSON.stringify(priceData));

      // Save individual room data for real-time updates
      Object.keys(prices).forEach(roomType => {
        const roomData = {
          morning: prices[roomType].morning,
          evening: prices[roomType].evening,
          timestamp: Date.now()
        };
        localStorage.setItem(`${roomType}RoomPrices`, JSON.stringify(roomData));
      });

      // Trigger real-time updates on all room pages
      this.broadcastPriceUpdates(prices);

      // Show success
      statusDiv.textContent = 'Prices saved successfully! All room pages updated.';
      statusDiv.className = 'save-status success';
      this.unsavedChanges = false;

      // Log the update
      console.log('Prices updated by:', this.currentUser.username, 'at:', new Date().toISOString());

    } catch (error) {
      statusDiv.textContent = `Error: ${error.message}`;
      statusDiv.className = 'save-status error';
    } finally {
      saveBtn.textContent = 'Save All Prices';
      saveBtn.disabled = false;
      this.updateSaveButtonState();
    }
  }

  validatePrices(prices) {
    Object.keys(prices).forEach(roomType => {
      const room = prices[roomType];
      
      // Check that evening prices are not lower than morning prices
      if (room.evening.hourly < room.morning.hourly) {
        throw new Error(`${roomType} room: Evening hourly rate cannot be lower than morning rate.`);
      }
      
      // Check reasonable price ranges
      if (room.morning.hourly < 10 || room.morning.hourly > 1000) {
        throw new Error(`${roomType} room: Hourly rate must be between 10 and 1000 EGP.`);
      }
      
      // Check that daily rate makes sense compared to hourly
      const expectedDaily = room.morning.hourly * 8; // 8 hours
      if (room.morning.daily < expectedDaily * 0.7 || room.morning.daily > expectedDaily * 1.5) {
        throw new Error(`${roomType} room: Daily rate seems inconsistent with hourly rate.`);
      }
    });
  }

  broadcastPriceUpdates(prices) {
    // Broadcast to other tabs/windows
    Object.keys(prices).forEach(roomType => {
      const event = new CustomEvent('priceUpdate', {
        detail: {
          roomType: roomType,
          prices: prices[roomType],
          timestamp: Date.now()
        }
      });
      window.dispatchEvent(event);
    });

    // Trigger storage events for cross-tab communication
    window.dispatchEvent(new StorageEvent('storage', {
      key: 'methodsRoomPrices',
      newValue: JSON.stringify({
        prices: prices,
        timestamp: Date.now()
      })
    }));
  }

  handleFileSelection(e) {
    const files = Array.from(e.target.files);
    const roomId = e.target.id.split('-')[0]; // Extract room name
    const previewDiv = document.getElementById(`${roomId}-preview`);

    // Clear previous previews
    previewDiv.innerHTML = '';

    files.forEach(file => {
      try {
        // Validate file
        window.adminSecurity.validateFile(file);

        // Create preview
        const img = document.createElement('img');
        img.className = 'preview-image';
        img.file = file;

        const reader = new FileReader();
        reader.onload = (e) => {
          img.src = e.target.result;
        };
        reader.readAsDataURL(file);

        previewDiv.appendChild(img);
        this.unsavedChanges = true;
        this.updateSaveButtonState();

      } catch (error) {
        this.showError(`File ${file.name}: ${error.message}`);
      }
    });
  }

  async saveImages() {
    if (!window.adminSecurity.rateLimiter.canMakeCall('saveImages')) {
      this.showError('Too many requests. Please wait before trying again.');
      return;
    }

    const saveBtn = document.getElementById('saveImagesBtn');
    const statusDiv = document.getElementById('imagesSaveStatus');

    try {
      saveBtn.innerHTML = '<span class="loading"></span> Saving...';
      saveBtn.disabled = true;
      statusDiv.className = 'save-status';
      statusDiv.style.display = 'none';

      // Simulate image processing and upload
      await new Promise(resolve => setTimeout(resolve, 2000));

      // In a real implementation, you would upload images to a server
      // For this demo, we'll just show success
      statusDiv.textContent = 'Images saved successfully! (Demo mode - images not actually uploaded)';
      statusDiv.className = 'save-status success';
      this.unsavedChanges = false;

      // Log the update
      console.log('Images updated by:', this.currentUser.username, 'at:', new Date().toISOString());

    } catch (error) {
      statusDiv.textContent = `Error: ${error.message}`;
      statusDiv.className = 'save-status error';
    } finally {
      saveBtn.textContent = 'Save All Images';
      saveBtn.disabled = false;
      this.updateSaveButtonState();
    }
  }

  updateSaveButtonState() {
    const pricesBtn = document.getElementById('savePricesBtn');
    const imagesBtn = document.getElementById('saveImagesBtn');
    
    if (this.unsavedChanges) {
      pricesBtn.style.background = 'linear-gradient(135deg, #ffc107, #fd7e14)';
      imagesBtn.style.background = 'linear-gradient(135deg, #ffc107, #fd7e14)';
    } else {
      pricesBtn.style.background = 'linear-gradient(135deg, #28a745, #20c997)';
      imagesBtn.style.background = 'linear-gradient(135deg, #28a745, #20c997)';
    }
  }

  setupBeforeUnloadWarning() {
    window.addEventListener('beforeunload', (e) => {
      if (this.unsavedChanges) {
        e.preventDefault();
        e.returnValue = 'You have unsaved changes. Are you sure you want to leave?';
        return e.returnValue;
      }
    });
  }

  showError(message) {
    const errorDiv = document.getElementById('loginError');
    errorDiv.textContent = message;
    errorDiv.style.display = 'block';
    
    // Auto-hide after 5 seconds
    setTimeout(() => {
      errorDiv.style.display = 'none';
    }, 5000);
  }

  showSuccessMessage(message) {
    const indicator = document.createElement('div');
    indicator.className = 'security-indicator show';
    indicator.textContent = message;
    document.body.appendChild(indicator);

    setTimeout(() => {
      indicator.remove();
    }, 3000);
  }
}

// Initialize admin panel when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  window.adminPanel = new AdminPanel();
  
  // Check if user is already logged in
  const session = window.adminSecurity.checkSession();
  if (session) {
    window.adminPanel.currentUser = session;
    window.adminPanel.showAdminPanel();
  }
});