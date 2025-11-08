// Global state
let currentUser = null;
let campaigns = [];
let contacts = [];
let responses = [];
let emailConfigs = [];
let users = [];
let companySettings = null;
let currentLogoBase64 = null;
let campaignEditor = null; // ToastUI Editor instance

// Initialize dashboard
async function init() {
    // Get current session
    currentUser = await window.api.getSession();

    if (!currentUser) {
        window.location.href = 'login.html';
        return;
    }

    // Update user info in sidebar
    document.getElementById('userName').textContent = currentUser.name;
    document.getElementById('userRole').textContent = currentUser.role;
    document.getElementById('userAvatar').textContent = currentUser.name.charAt(0).toUpperCase();

    // Show users menu only for OWNER
    if (currentUser.role === 'OWNER') {
        document.getElementById('usersNav').style.display = 'flex';
        document.getElementById('settingsDropdownItem').style.display = 'block';
    }

    // Load and apply company settings
    await loadAndApplyCompanySettings();

    // Load initial data
    await loadDashboard();

    // Setup navigation
    setupNavigation();

    // Setup form preview
    setupFormPreview();

    // Setup color picker
    setupColorPicker();
}

// Setup navigation
function setupNavigation() {
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', function() {
            const page = this.getAttribute('data-page');
            
            // Update active nav
            document.querySelectorAll('.nav-item').forEach(nav => nav.classList.remove('active'));
            this.classList.add('active');
            
            // Show corresponding section
            document.querySelectorAll('.content-section').forEach(section => section.classList.remove('active'));
            document.getElementById(page + 'Section').classList.add('active');
            
            // Load data for that section
            switch(page) {
                case 'dashboard':
                    loadDashboard();
                    break;
                case 'campaigns':
                    loadCampaigns();
                    break;
                case 'contacts':
                    loadContacts();
                    break;
                case 'responses':
                    loadResponses();
                    break;
                case 'email-config':
                    loadEmailConfigs();
                    break;
                case 'users':
                    loadUsers();
                    break;
            }
        });
    });
}

// Load dashboard stats
async function loadDashboard() {
    campaigns = await window.api.getCampaigns(currentUser.userId);
    contacts = await window.api.getContacts();
    
    // Update stats
    document.getElementById('totalCampaigns').textContent = campaigns.length;
    document.getElementById('totalContacts').textContent = contacts.length;
    
    // Count total emails and responses
    let totalEmails = 0;
    let totalResponses = 0;
    
    for (const campaign of campaigns) {
        const campaignResponses = await window.api.getResponses(campaign.id);
        totalResponses += campaignResponses.length;
    }
    
    document.getElementById('totalEmails').textContent = totalEmails;
    document.getElementById('totalResponses').textContent = totalResponses;
    
    // Show recent campaigns
    renderRecentCampaigns(campaigns.slice(0, 5));
}

// Render recent campaigns
function renderRecentCampaigns(recentCampaigns) {
    const table = document.getElementById('recentCampaignsTable');
    
    if (recentCampaigns.length === 0) {
        table.innerHTML = `
            <tr>
                <td colspan="4" class="empty-state">
                    <div class="empty-icon">📧</div>
                    <div>No campaigns yet. Create your first campaign!</div>
                </td>
            </tr>
        `;
        return;
    }
    
    table.innerHTML = recentCampaigns.map(campaign => `
        <tr>
            <td>${campaign.name}</td>
            <td><span class="status-badge status-${campaign.status.toLowerCase()}">${campaign.status}</span></td>
            <td>${formatDate(campaign.created_at)}</td>
            <td>
                <button class="btn btn-secondary" onclick="viewCampaign('${campaign.id}')">View</button>
            </td>
        </tr>
    `).join('');
}

// Load campaigns
async function loadCampaigns() {
    campaigns = await window.api.getCampaigns(currentUser.userId);
    renderCampaigns();
}

function renderCampaigns() {
    const table = document.getElementById('campaignsTable');
    
    if (campaigns.length === 0) {
        table.innerHTML = `
            <tr>
                <td colspan="4" class="empty-state">
                    <div class="empty-icon">📧</div>
                    <div>No campaigns found. Create your first campaign!</div>
                </td>
            </tr>
        `;
        return;
    }
    
    table.innerHTML = campaigns.map(campaign => `
        <tr>
            <td>${campaign.name}</td>
            <td><span class="status-badge status-${campaign.status.toLowerCase()}">${campaign.status}</span></td>
            <td>${formatDate(campaign.created_at)}</td>
            <td>
                <button class="btn btn-secondary" onclick="editCampaign('${campaign.id}')">Edit</button>
                ${currentUser.role === 'OWNER' ? `<button class="btn btn-danger" onclick="deleteCampaign('${campaign.id}')">Delete</button>` : ''}
            </td>
        </tr>
    `).join('');
}

// Load contacts
async function loadContacts() {
    contacts = await window.api.getContacts();
    renderContacts();
}

function renderContacts() {
    const table = document.getElementById('contactsTable');
    
    if (contacts.length === 0) {
        table.innerHTML = `
            <tr>
                <td colspan="4" class="empty-state">
                    <div class="empty-icon">👥</div>
                    <div>No contacts found. Add your first contact!</div>
                </td>
            </tr>
        `;
        return;
    }
    
    table.innerHTML = contacts.map(contact => `
        <tr>
            <td>${contact.email}</td>
            <td>${contact.first_name} ${contact.last_name}</td>
            <td>${contact.company || '-'}</td>
            <td>
                ${currentUser.role === 'OWNER' ? `<button class="btn btn-danger" onclick="deleteContact('${contact.id}')">Delete</button>` : ''}
            </td>
        </tr>
    `).join('');
}

// Load responses
async function loadResponses() {
    responses = [];
    
    for (const campaign of campaigns) {
        const campaignResponses = await window.api.getResponses(campaign.id);
        responses.push(...campaignResponses.map(r => ({...r, campaignName: campaign.name})));
    }
    
    renderResponses();
}

function renderResponses() {
    const table = document.getElementById('responsesTable');
    
    if (responses.length === 0) {
        table.innerHTML = `
            <tr>
                <td colspan="4" class="empty-state">
                    <div class="empty-icon">📝</div>
                    <div>No responses yet</div>
                </td>
            </tr>
        `;
        return;
    }
    
    table.innerHTML = responses.map(response => `
        <tr>
            <td>${response.campaignName}</td>
            <td>${response.contact_email}</td>
            <td>${formatDate(response.submitted_at)}</td>
            <td>
                <button class="btn btn-secondary" onclick="viewResponse('${response.id}')">View</button>
            </td>
        </tr>
    `).join('');
}

// Load email configs
async function loadEmailConfigs() {
    emailConfigs = await window.api.getEmailConfigs();
    renderEmailConfigs();
}

function renderEmailConfigs() {
    const table = document.getElementById('emailConfigsTable');
    
    if (emailConfigs.length === 0) {
        table.innerHTML = `
            <tr>
                <td colspan="5" class="empty-state">
                    <div class="empty-icon">⚙️</div>
                    <div>No email configurations. Add one to start sending campaigns!</div>
                </td>
            </tr>
        `;
        return;
    }
    
    table.innerHTML = emailConfigs.map(config => `
        <tr>
            <td>${config.name}</td>
            <td>${config.smtp_host}:${config.smtp_port}</td>
            <td>${config.from_email}</td>
            <td>${config.is_default ? '✓ Default' : ''}</td>
            <td>
                <button class="btn btn-secondary" onclick="testEmailConfig('${config.id}')">Test</button>
            </td>
        </tr>
    `).join('');
}

// Load users (OWNER only)
async function loadUsers() {
    if (currentUser.role !== 'OWNER') return;
    
    users = await window.api.getUsers();
    renderUsers();
}

function renderUsers() {
    const table = document.getElementById('usersTable');
    
    table.innerHTML = users.map(user => `
        <tr>
            <td>${user.name}</td>
            <td>${user.email}</td>
            <td>${user.role}</td>
            <td>
                ${user.id !== currentUser.userId ? `<button class="btn btn-danger" onclick="deleteUser('${user.id}')">Delete</button>` : '<em>Current User</em>'}
            </td>
        </tr>
    `).join('');
}

// Campaign operations
function showCreateCampaign() {
    document.getElementById('createCampaignModal').classList.add('show');
}

async function createCampaign(event) {
    event.preventDefault();

    const name = document.getElementById('campaignName').value;
    const description = document.getElementById('campaignDescription').value;
    const formHtml = document.getElementById('formHtmlEditor').value;

    try {
        const result = await window.api.createCampaign({
            name,
            description,
            formHtml,
            userId: currentUser.userId
        });

        if (result.success || result.id) {
            closeModal('createCampaignModal');
            document.getElementById('createCampaignForm').reset();
            await loadCampaigns();
            alert('Campaign created successfully!');
        } else {
            alert('Failed to create campaign: ' + (result.error || 'Unknown error'));
        }
    } catch (error) {
        console.error('Error creating campaign:', error);
        alert('An error occurred while creating the campaign. Please try again.');
    }
}

async function deleteCampaign(id) {
    if (!confirm('Are you sure you want to delete this campaign?')) return;
    
    await window.api.deleteCampaign(id);
    await loadCampaigns();
    alert('Campaign deleted successfully!');
}

// Contact operations
function showAddContact() {
    document.getElementById('addContactModal').classList.add('show');
}

async function addContact(event) {
    event.preventDefault();

    const email = document.getElementById('contactEmail').value;
    const firstName = document.getElementById('contactFirstName').value;
    const lastName = document.getElementById('contactLastName').value;
    const company = document.getElementById('contactCompany').value;
    const phone = document.getElementById('contactPhone').value;
    const tags = document.getElementById('contactTags').value;

    const result = await window.api.createContact({
        email,
        firstName,
        lastName,
        company,
        phone,
        tags
    });

    if (result.success || result.id) {
        closeModal('addContactModal');
        await loadContacts();
        alert('Contact added successfully!');
        // Reset form
        document.getElementById('addContactForm').reset();
    } else {
        alert('Failed to add contact: ' + (result.error || 'Unknown error'));
    }
}

function showImportContacts() {
    const fileInput = document.getElementById('csvFileInput');
    fileInput.onchange = handleCSVImport;
    fileInput.click();
}

async function handleCSVImport(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async function(e) {
        const csvContent = e.target.result;
        const lines = csvContent.split('\n');

        if (lines.length < 2) {
            alert('CSV file is empty or invalid');
            return;
        }

        // Parse CSV (simple parsing - assumes no quotes with commas)
        const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
        const contacts = [];

        for (let i = 1; i < lines.length; i++) {
            if (!lines[i].trim()) continue;

            const values = lines[i].split(',').map(v => v.trim());
            const contact = {};

            headers.forEach((header, index) => {
                if (values[index]) {
                    contact[header] = values[index];
                }
            });

            if (contact.email) {
                contacts.push(contact);
            }
        }

        if (contacts.length === 0) {
            alert('No valid contacts found in CSV');
            return;
        }

        // Import contacts
        const result = await window.api.importContactsCSV(contacts);

        if (result.success || result.count !== undefined) {
            await loadContacts();
            alert(`Successfully imported ${result.count || contacts.length} contacts!`);
        } else {
            alert('Failed to import contacts: ' + (result.error || 'Unknown error'));
        }

        // Reset file input
        event.target.value = '';
    };

    reader.readAsText(file);
}

async function deleteContact(id) {
    if (!confirm('Are you sure you want to delete this contact?')) return;
    
    await window.api.deleteContact(id);
    await loadContacts();
    alert('Contact deleted successfully!');
}

// Email config operations
function showAddEmailConfig() {
    // Simplified - would normally be a modal
    const name = prompt('Config name (e.g., Gmail):');
    if (!name) return;
    
    const smtpHost = prompt('SMTP Host (e.g., smtp.gmail.com):');
    const smtpPort = prompt('SMTP Port (465 or 587):', '587');
    const smtpUser = prompt('SMTP Username/Email:');
    const smtpPassword = prompt('SMTP Password/App Password:');
    const fromEmail = prompt('From Email:', smtpUser);
    const fromName = prompt('From Name:', currentUser.name);
    
    window.api.saveEmailConfig({
        name,
        smtpHost,
        smtpPort: parseInt(smtpPort),
        smtpUser,
        smtpPassword,
        fromEmail,
        fromName,
        isDefault: emailConfigs.length === 0
    }).then(() => {
        loadEmailConfigs();
        alert('Email configuration saved!');
    });
}

// User operations (OWNER only)
function showAddUser() {
    document.getElementById('addUserModal').classList.add('show');
}

async function addUser(event) {
    event.preventDefault();

    const name = document.getElementById('newUserName').value;
    const email = document.getElementById('newUserEmail').value;
    const password = document.getElementById('newUserPassword').value;
    const role = document.getElementById('newUserRole').value;

    const result = await window.api.createUser({
        name,
        email,
        password,
        role
    });

    if (result.success || result.id) {
        closeModal('addUserModal');
        await loadUsers();
        alert('User created successfully!');
        // Reset form
        document.getElementById('addUserForm').reset();
    } else {
        alert('Failed to create user: ' + (result.error || 'Unknown error'));
    }
}

async function deleteUser(id) {
    if (!confirm('Are you sure you want to delete this user?')) return;
    
    await window.api.deleteUser(id);
    await loadUsers();
    alert('User deleted successfully!');
}

// Form preview
function setupFormPreview() {
    const editor = document.getElementById('formHtmlEditor');
    if (!editor) return;
    
    editor.addEventListener('input', updatePreview);
    updatePreview();
}

function updatePreview() {
    const html = document.getElementById('formHtmlEditor')?.value || '';
    const preview = document.getElementById('formPreview');
    if (preview) {
        preview.innerHTML = html;
    }
}

// Rich Text Toolbar Functions
function insertHTML(html, cursorOffset) {
    const editor = document.getElementById('formHtmlEditor');
    const start = editor.selectionStart;
    const end = editor.selectionEnd;
    const text = editor.value;

    // Insert HTML at cursor position
    const before = text.substring(0, start);
    const after = text.substring(end);
    editor.value = before + html + after;

    // Set cursor position
    const newCursorPos = start + html.length - cursorOffset;
    editor.setSelectionRange(newCursorPos, newCursorPos);
    editor.focus();

    // Update preview
    updatePreview();
}

// User Profile Dropdown Functions
function toggleUserDropdown() {
    const dropdown = document.getElementById('userDropdown');
    dropdown.classList.toggle('show');

    // Close dropdown when clicking outside
    if (dropdown.classList.contains('show')) {
        setTimeout(() => {
            document.addEventListener('click', closeDropdownOnClickOutside);
        }, 0);
    }
}

function closeDropdownOnClickOutside(event) {
    const dropdown = document.getElementById('userDropdown');
    const avatar = document.getElementById('userAvatar');

    if (!dropdown.contains(event.target) && !avatar.contains(event.target)) {
        dropdown.classList.remove('show');
        document.removeEventListener('click', closeDropdownOnClickOutside);
    }
}

function viewProfile() {
    const dropdown = document.getElementById('userDropdown');
    dropdown.classList.remove('show');
    alert('Profile view coming soon!\n\nUser: ' + currentUser.name + '\nEmail: ' + currentUser.email + '\nRole: ' + currentUser.role);
}

function openSettings() {
    const dropdown = document.getElementById('userDropdown');
    dropdown.classList.remove('show');

    // Load current settings into the form
    if (companySettings) {
        document.getElementById('settingsCompanyName').value = companySettings.company_name || '';
        document.getElementById('settingsBrandColor').value = companySettings.brand_color || '#667eea';
        document.getElementById('colorValue').textContent = companySettings.brand_color || '#667eea';

        // Show logo preview if exists
        if (companySettings.company_logo) {
            const logoPreview = document.getElementById('logoPreview');
            const uploadPrompt = document.getElementById('uploadPrompt');
            const uploadArea = document.getElementById('logoUploadArea');

            logoPreview.src = companySettings.company_logo;
            logoPreview.classList.add('show');
            uploadPrompt.style.display = 'none';
            uploadArea.classList.add('has-logo');
            currentLogoBase64 = companySettings.company_logo;
        }
    }

    // Load log path
    loadLogPath();

    // Show the modal
    document.getElementById('settingsModal').classList.add('show');
}

function returnToSetup() {
    const dropdown = document.getElementById('userDropdown');
    dropdown.classList.remove('show');
    if (confirm('Are you sure you want to return to the setup wizard?')) {
        window.location.href = 'setup.html';
    }
}

// Utility functions
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
}

function closeModal(modalId) {
    document.getElementById(modalId).classList.remove('show');
}

async function logout() {
    await window.api.logout();
    window.location.href = 'login.html';
}

// Company Branding Functions
async function loadAndApplyCompanySettings() {
    try {
        companySettings = await window.api.getCompanySettings();
        if (companySettings) {
            applyBrandingToUI(companySettings);
        }
    } catch (error) {
        console.error('Error loading company settings:', error);
        // Use defaults if settings don't exist
        companySettings = {
            company_name: '',
            brand_color: '#667eea',
            company_logo: null
        };
    }
}

function applyBrandingToUI(settings) {
    const companyName = settings.company_name || 'FICOS';
    const brandColor = settings.brand_color || '#667eea';
    const companyLogo = settings.company_logo;

    // Update sidebar company name
    const logoText = document.getElementById('sidebarLogoText');
    const logoSub = document.getElementById('sidebarLogoSub');

    if (companyName && companyName !== 'FICOS') {
        logoText.textContent = companyName;
        logoSub.style.display = 'none';
    } else {
        logoText.textContent = 'FICOS';
        logoSub.textContent = 'Campaign Manager';
        logoSub.style.display = 'block';
    }

    // Update sidebar logo
    const logoImg = document.getElementById('sidebarLogoImg');
    if (companyLogo) {
        logoImg.src = companyLogo;
        logoImg.classList.add('show');
        logoText.style.fontSize = '18px';
    } else {
        logoImg.classList.remove('show');
        logoText.style.fontSize = '28px';
    }

    // Apply brand color to sidebar and buttons
    applyBrandColor(brandColor);

    // Update page title
    if (companyName && companyName !== 'FICOS') {
        document.title = `Dashboard - ${companyName}`;
    }
}

function applyBrandColor(color) {
    const sidebar = document.getElementById('sidebar');
    const darkerColor = generateDarkerShade(color);

    // Create gradient for sidebar
    sidebar.style.background = `linear-gradient(180deg, ${color} 0%, ${darkerColor} 100%)`;

    // Create or update style tag for dynamic colors
    let styleTag = document.getElementById('dynamic-brand-styles');
    if (!styleTag) {
        styleTag = document.createElement('style');
        styleTag.id = 'dynamic-brand-styles';
        document.head.appendChild(styleTag);
    }

    styleTag.textContent = `
        .stat-value {
            color: ${color} !important;
        }
        .btn-primary {
            background: linear-gradient(135deg, ${color}, ${darkerColor}) !important;
        }
        .btn-primary:hover {
            box-shadow: 0 8px 20px ${color}66 !important;
        }
        input:focus, textarea:focus, select:focus {
            border-color: ${color} !important;
        }
        .settings-tab.active {
            color: ${color} !important;
            border-bottom-color: ${color} !important;
        }
        .settings-tab:hover {
            color: ${color} !important;
        }
        .nav-item:hover {
            background: rgba(255,255,255,0.1) !important;
        }
        .nav-item.active {
            background: rgba(255,255,255,0.15) !important;
            border-left: 3px solid white !important;
        }
        .toolbar-btn:hover {
            background: ${color} !important;
            color: white !important;
            border-color: ${color} !important;
        }
        .logo-upload-area:hover {
            border-color: ${color} !important;
        }
        .upload-icon {
            color: ${color} !important;
        }
    `;
}

function generateDarkerShade(hexColor) {
    // Convert hex to RGB
    let r = parseInt(hexColor.slice(1, 3), 16);
    let g = parseInt(hexColor.slice(3, 5), 16);
    let b = parseInt(hexColor.slice(5, 7), 16);

    // Darken by 20%
    r = Math.floor(r * 0.7);
    g = Math.floor(g * 0.7);
    b = Math.floor(b * 0.7);

    // Convert back to hex
    return '#' + [r, g, b].map(x => {
        const hex = x.toString(16);
        return hex.length === 1 ? '0' + hex : hex;
    }).join('');
}

function switchSettingsTab(tabName) {
    // Update tab buttons
    document.querySelectorAll('.settings-tab').forEach(tab => {
        tab.classList.remove('active');
    });
    event.target.classList.add('active');

    // Update content sections
    document.querySelectorAll('.settings-content').forEach(content => {
        content.classList.remove('active');
    });

    const contentMap = {
        'branding': 'brandingSettings',
        'email': 'emailSettings',
        'preferences': 'preferencesSettings'
    };

    const contentId = contentMap[tabName];
    if (contentId) {
        document.getElementById(contentId).classList.add('active');
    }
}

function setupColorPicker() {
    const colorPicker = document.getElementById('settingsBrandColor');
    const colorValue = document.getElementById('colorValue');

    if (colorPicker && colorValue) {
        colorPicker.addEventListener('input', function() {
            colorValue.textContent = this.value.toUpperCase();
        });
    }
}

function triggerLogoUpload() {
    document.getElementById('logoFileInput').click();
}

function handleLogoUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    // Check if it's an image
    if (!file.type.startsWith('image/')) {
        alert('Please select an image file');
        return;
    }

    // Check file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
        alert('Image size should be less than 5MB');
        return;
    }

    // Read and convert to base64
    const reader = new FileReader();
    reader.onload = function(e) {
        const base64String = e.target.result;
        currentLogoBase64 = base64String;

        // Show preview
        const logoPreview = document.getElementById('logoPreview');
        const uploadPrompt = document.getElementById('uploadPrompt');
        const uploadArea = document.getElementById('logoUploadArea');

        logoPreview.src = base64String;
        logoPreview.classList.add('show');
        uploadPrompt.style.display = 'none';
        uploadArea.classList.add('has-logo');
    };

    reader.readAsDataURL(file);
}

async function saveCompanySettings(event) {
    event.preventDefault();

    const companyName = document.getElementById('settingsCompanyName').value.trim();
    const brandColor = document.getElementById('settingsBrandColor').value;

    const settingsData = {
        company_name: companyName || 'FICOS',
        brand_color: brandColor,
        company_logo: currentLogoBase64
    };

    try {
        const result = await window.api.updateCompanySettings(settingsData);

        if (result.success || result.id !== undefined) {
            // Update local state
            companySettings = settingsData;

            // Apply the new branding immediately
            applyBrandingToUI(settingsData);

            // Close modal
            closeModal('settingsModal');

            alert('Company branding updated successfully!');
        } else {
            alert('Failed to update settings: ' + (result.error || 'Unknown error'));
        }
    } catch (error) {
        console.error('Error saving company settings:', error);
        alert('Failed to save settings. Please try again.');
    }
}

// Open logs folder
async function openLogsFolder() {
    try {
        const result = await window.api.openLogs();
        if (result.success) {
            alert('Opening logs folder...\n\nPath: ' + result.path);
        }
    } catch (error) {
        console.error('Error opening logs:', error);
        alert('Failed to open logs folder');
    }
}

// Load log path on settings open
async function loadLogPath() {
    try {
        const logInfo = await window.api.getLogPath();
        const logPathEl = document.getElementById('logPathInfo');
        if (logPathEl && logInfo.logFile) {
            logPathEl.textContent = 'Log file: ' + logInfo.logFile;
        }
    } catch (error) {
        console.error('Error getting log path:', error);
    }
}

// Setup form submissions
document.addEventListener('DOMContentLoaded', function() {
    const createCampaignForm = document.getElementById('createCampaignForm');
    if (createCampaignForm) {
        createCampaignForm.addEventListener('submit', createCampaign);
    }

    const addContactForm = document.getElementById('addContactForm');
    if (addContactForm) {
        addContactForm.addEventListener('submit', addContact);
    }

    const addUserForm = document.getElementById('addUserForm');
    if (addUserForm) {
        addUserForm.addEventListener('submit', addUser);
    }

    const brandingForm = document.getElementById('brandingForm');
    if (brandingForm) {
        brandingForm.addEventListener('submit', saveCompanySettings);
    }
});

// Initialize when page loads
init();
