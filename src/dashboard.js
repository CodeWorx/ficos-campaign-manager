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
let selectedRecipients = []; // IDs of selected contacts for campaign

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

    // Show scheduled campaigns
    renderScheduledCampaigns(campaigns.filter(c => c.status === 'SCHEDULED'));
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

// Render scheduled campaigns
function renderScheduledCampaigns(scheduledCampaigns) {
    const table = document.getElementById('scheduledCampaignsTable');
    const countElem = document.getElementById('scheduledCount');

    if (countElem) {
        countElem.textContent = `${scheduledCampaigns.length} scheduled`;
    }

    if (scheduledCampaigns.length === 0) {
        table.innerHTML = `
            <tr>
                <td colspan="4" class="empty-state">
                    <div class="empty-icon">📅</div>
                    <div>No scheduled campaigns. Schedule a campaign to see it here!</div>
                </td>
            </tr>
        `;
        return;
    }

    table.innerHTML = scheduledCampaigns.map(campaign => {
        const scheduledDate = campaign.scheduled_for ? new Date(campaign.scheduled_for) : null;
        const dateStr = scheduledDate ? scheduledDate.toLocaleString() : 'Not set';
        const isOverdue = scheduledDate && scheduledDate < new Date();

        return `
            <tr>
                <td>${escapeHtml(campaign.name)}</td>
                <td><span style="color: #666; font-size: 13px;">-</span></td>
                <td>
                    <span style="color: ${isOverdue ? '#e74c3c' : '#666'}; font-weight: ${isOverdue ? '600' : 'normal'};">
                        ${dateStr}
                        ${isOverdue ? ' <span style="color: #e74c3c;">⚠️ Overdue</span>' : ''}
                    </span>
                </td>
                <td>
                    <button class="btn btn-secondary" onclick="viewCampaign('${campaign.id}')">View</button>
                    <button class="btn btn-secondary" onclick="editCampaign('${campaign.id}')">Edit</button>
                    ${currentUser.role === 'OWNER' ? `<button class="btn btn-danger" onclick="cancelScheduledCampaign('${campaign.id}')">Cancel</button>` : ''}
                </td>
            </tr>
        `;
    }).join('');
}

async function cancelScheduledCampaign(id) {
    if (!confirm('Cancel this scheduled campaign? It will be changed to draft status.')) return;

    try {
        // Update campaign status to DRAFT
        const campaign = campaigns.find(c => c.id === id);
        if (campaign) {
            campaign.status = 'DRAFT';
            campaign.scheduled_for = null;

            showNotification('Scheduled campaign canceled successfully', 'success');
            await loadDashboard();
        }
    } catch (error) {
        console.error('Error canceling scheduled campaign:', error);
        showNotification('Failed to cancel scheduled campaign', 'error');
    }
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
                <button class="btn btn-secondary" onclick="viewCampaign('${campaign.id}')">View</button>
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

// Create custom toolbar button for quick template insertion
function createTemplateButton(label, templateId) {
    const button = document.createElement('button');
    button.className = 'toastui-editor-toolbar-icons';
    button.style.cssText = 'background: none; border: none; color: #333; padding: 4px 8px; cursor: pointer; font-size: 12px; font-weight: 500;';
    button.textContent = label;
    button.type = 'button';

    button.onclick = async (e) => {
        e.preventDefault();
        e.stopPropagation();

        // Load templates if not already loaded
        if (!allTemplates || allTemplates.length === 0) {
            await loadTemplates();
        }

        // Find and insert the template
        const template = allTemplates.find(t => t.id === templateId);
        if (template) {
            insertTemplate(templateId);
        }
    };

    return button;
}

function showCreateCampaign() {
    const modal = document.getElementById('createCampaignModal');
    modal.classList.add('show');

    // Aggressively enable all inputs in the modal
    setTimeout(() => {
        modal.querySelectorAll('input, textarea, select').forEach(elem => {
            elem.removeAttribute('disabled');
            elem.removeAttribute('readonly');
            elem.style.pointerEvents = 'auto';
            elem.style.userSelect = 'text';
            elem.style.opacity = '1';
        });
    }, 50);

    // Initialize ToastUI Editor if not already initialized
    if (!campaignEditor) {
        const editorEl = document.getElementById('campaignEditor');
        if (editorEl) {
            campaignEditor = new toastui.Editor({
                el: editorEl,
                height: '500px',
                initialEditType: 'wysiwyg',
                previewStyle: 'vertical',
                initialValue: `<form>
  <label>Name:</label>
  <input type="text" name="name" required><br><br>

  <label>Email:</label>
  <input type="email" name="email" required><br><br>

  <label>Message:</label>
  <textarea name="message" rows="4"></textarea><br><br>

  <button type="submit">Submit</button>
</form>`,
                toolbarItems: [
                    ['heading', 'bold', 'italic', 'strike'],
                    ['hr', 'quote'],
                    ['ul', 'ol', 'task', 'indent', 'outdent'],
                    ['table', 'link'],
                    ['code', 'codeblock'],
                    [
                        {
                            el: createTemplateButton('📋 Header', 'header-simple'),
                            tooltip: 'Insert Header',
                            name: 'insertHeader'
                        },
                        {
                            el: createTemplateButton('🦶 Footer', 'footer-simple'),
                            tooltip: 'Insert Footer',
                            name: 'insertFooter'
                        },
                        {
                            el: createTemplateButton('📱 Social', 'social-facebook'),
                            tooltip: 'Insert Social Icon',
                            name: 'insertSocial'
                        },
                        {
                            el: createTemplateButton('🔘 CTA', 'cta-email'),
                            tooltip: 'Insert Call-to-Action',
                            name: 'insertCTA'
                        }
                    ]
                ]
            });
        }
    }
}

async function createCampaign(event) {
    event.preventDefault();

    const name = document.getElementById('campaignName').value;
    const description = document.getElementById('campaignDescription').value;

    // Get HTML from ToastUI Editor
    const formHtml = campaignEditor ? campaignEditor.getHTML() : '';

    // Get send option
    const sendOption = document.querySelector('input[name="sendOption"]:checked')?.value || 'draft';

    // Validate recipients for immediate/scheduled sends
    if ((sendOption === 'now' || sendOption === 'schedule') && selectedRecipients.length === 0) {
        showNotification('Please select at least one recipient before sending', 'error');
        return;
    }

    // Get scheduled date/time if applicable
    let scheduledFor = null;
    if (sendOption === 'schedule') {
        const dateTimeInput = document.getElementById('scheduledDateTime');
        if (!dateTimeInput.value) {
            showNotification('Please select a date and time for scheduling', 'error');
            return;
        }
        scheduledFor = new Date(dateTimeInput.value).toISOString();

        // Validate date is in the future
        if (new Date(scheduledFor) < new Date()) {
            showNotification('Scheduled time must be in the future', 'error');
            return;
        }
    }

    try {
        const result = await window.api.createCampaign({
            name,
            description,
            formHtml,
            userId: currentUser.userId
        });

        if (result.success || result.id) {
            const campaignId = result.id;

            // Handle scheduling if applicable
            if (sendOption === 'schedule' && scheduledFor) {
                await window.api.scheduleCampaign({
                    campaignId,
                    scheduledFor
                });
                showNotification(`Campaign scheduled for ${new Date(scheduledFor).toLocaleString()}`, 'success');
            }

            // Handle immediate send
            if (sendOption === 'now') {
                const sendResult = await window.api.sendCampaign({
                    campaignId,
                    contactIds: selectedRecipients
                });

                if (sendResult.success) {
                    showNotification(`Campaign sent to ${selectedRecipients.length} recipient(s)!`, 'success');
                } else {
                    showNotification('Campaign created but sending failed: ' + (sendResult.error || 'Unknown error'), 'error');
                }
            }

            // Reset form and state
            closeModal('createCampaignModal');
            document.getElementById('createCampaignForm').reset();
            selectedRecipients = [];
            updateRecipientDisplay();

            // Reset send option to draft
            document.querySelector('input[name="sendOption"][value="draft"]').checked = true;
            updateSendOptions();

            await loadCampaigns();

            if (sendOption === 'draft') {
                showNotification('Campaign created as draft', 'success');
            }
        } else {
            showNotification('Failed to create campaign: ' + (result.error || 'Unknown error'), 'error');
        }
    } catch (error) {
        console.error('Error creating campaign:', error);
        showNotification('An error occurred while creating the campaign. Please try again.', 'error');
    }
}

async function viewCampaign(id) {
    const campaign = campaigns.find(c => c.id === id);
    if (!campaign) {
        alert('Campaign not found');
        return;
    }

    // Create a modal to view the campaign
    const modal = document.createElement('div');
    modal.className = 'modal show';
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 800px;">
            <div class="modal-header">
                <h2>${campaign.name}</h2>
                <span class="close" onclick="this.closest('.modal').remove()">&times;</span>
            </div>
            <div class="modal-body">
                <div style="margin-bottom: 20px;">
                    <strong>Status:</strong> <span class="status-badge status-${campaign.status.toLowerCase()}">${campaign.status}</span>
                </div>
                <div style="margin-bottom: 20px;">
                    <strong>Description:</strong><br>
                    ${campaign.description || 'No description provided'}
                </div>
                <div style="margin-bottom: 20px;">
                    <strong>Created:</strong> ${formatDate(campaign.created_at)}
                </div>
                <div style="margin-bottom: 20px;">
                    <strong>Campaign Content:</strong>
                    <div style="border: 1px solid #ddd; padding: 20px; border-radius: 8px; background: white; margin-top: 10px; max-height: 400px; overflow-y: auto;">
                        ${campaign.form_html || 'No content'}
                    </div>
                </div>
            </div>
            <div style="padding: 20px; border-top: 1px solid #e0e0e0; text-align: right;">
                <button class="btn btn-secondary" onclick="this.closest('.modal').remove()">Close</button>
                <button class="btn btn-primary" onclick="this.closest('.modal').remove(); editCampaign('${id}')">Edit Campaign</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
}

async function editCampaign(id) {
    const campaign = campaigns.find(c => c.id === id);
    if (!campaign) {
        alert('Campaign not found');
        return;
    }

    // Populate the create campaign modal with existing data
    document.getElementById('campaignName').value = campaign.name;
    document.getElementById('campaignDescription').value = campaign.description || '';

    // Initialize editor if not already initialized
    showCreateCampaign();

    // Load the HTML content into the editor
    if (campaignEditor) {
        campaignEditor.setHTML(campaign.form_html || '');
    }

    // Change the form to edit mode (we'll need to handle the submit differently)
    const form = document.getElementById('createCampaignForm');
    const submitButton = form.querySelector('button[type="submit"]');
    submitButton.textContent = 'Update Campaign';

    // Store the campaign ID for updating
    form.dataset.editingId = id;
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

// ===== CAMPAIGN TEMPLATE BROWSER =====

let allTemplates = [];
let currentTemplateCategory = 'all';

// Open template browser modal
async function openTemplateBrowser() {
    document.getElementById('templateBrowserModal').classList.add('show');
    await loadTemplates();
    renderTemplates();
}

// Load templates from database
async function loadTemplates() {
    try {
        allTemplates = await window.api.getCampaignTemplates();
        console.log('Loaded templates:', allTemplates.length);
    } catch (error) {
        console.error('Error loading templates:', error);
        showNotification('Failed to load templates', 'error');
    }
}

// Filter templates by category
function filterTemplatesByCategory(category) {
    currentTemplateCategory = category;

    // Update active tab
    document.querySelectorAll('.template-tab').forEach(tab => {
        tab.classList.remove('active');
    });
    const activeTab = document.querySelector(`.template-tab[data-category="${category}"]`);
    if (activeTab) {
        activeTab.classList.add('active');
    }

    renderTemplates();
}

// Render template cards
function renderTemplates() {
    const templateGrid = document.getElementById('templateGrid');
    const emptyState = document.getElementById('templateEmptyState');

    // Filter templates by category
    let filteredTemplates = allTemplates;
    if (currentTemplateCategory !== 'all') {
        filteredTemplates = allTemplates.filter(t => t.category === currentTemplateCategory);
    }

    // Show empty state if no templates
    if (filteredTemplates.length === 0) {
        templateGrid.style.display = 'none';
        emptyState.style.display = 'block';
        return;
    }

    templateGrid.style.display = 'grid';
    emptyState.style.display = 'none';

    // Render template cards
    templateGrid.innerHTML = filteredTemplates.map(template => `
        <div class="template-card" onclick="insertTemplate('${template.id}')">
            ${template.is_system ? '<div class="template-card-system-badge">Built-in</div>' : ''}
            <div class="template-card-preview">
                <div style="font-size: 11px; color: #999; max-height: 120px; overflow: hidden; line-height: 1.4;">
                    ${escapeHtml(template.html_content).substring(0, 200)}...
                </div>
            </div>
            <div class="template-card-name">${escapeHtml(template.name)}</div>
            <div class="template-card-description">${escapeHtml(template.description || '')}</div>
            <div class="template-card-category">${escapeHtml(template.category)}</div>
        </div>
    `).join('');
}

// Insert template into editor
async function insertTemplate(templateId) {
    try {
        const template = allTemplates.find(t => t.id === templateId);
        if (!template) {
            showNotification('Template not found', 'error');
            return;
        }

        // Process template variables
        let htmlContent = template.html_content;

        // Replace {{company_name}}
        if (companySettings && companySettings.company_name) {
            htmlContent = htmlContent.replace(/\{\{company_name\}\}/g, companySettings.company_name);
        }

        // Replace {{company_logo}}
        if (companySettings && companySettings.company_logo) {
            htmlContent = htmlContent.replace(/\{\{company_logo\}\}/g, companySettings.company_logo);
        }

        // Replace {{year}}
        const currentYear = new Date().getFullYear();
        htmlContent = htmlContent.replace(/\{\{year\}\}/g, currentYear.toString());

        // Insert into ToastUI Editor
        if (campaignEditor) {
            try {
                // Try to insert HTML at cursor position
                campaignEditor.insertHTML(htmlContent);
                showNotification(`Template "${template.name}" inserted successfully`, 'success');
                closeModal('templateBrowserModal');
            } catch (insertError) {
                // If insertion fails, try appending to existing content
                console.warn('Direct insertion failed, appending instead:', insertError);
                const currentContent = campaignEditor.getHTML() || '';
                const newContent = currentContent + (currentContent ? '<br><br>' : '') + htmlContent;
                // Use markdown setter which is more stable
                campaignEditor.setMarkdown(campaignEditor.getMarkdown() + '\n\n');
                // Then switch to WYSIWYG and insert HTML
                campaignEditor.changeMode('wysiwyg');
                setTimeout(() => {
                    try {
                        campaignEditor.insertHTML(htmlContent);
                    } catch (e) {
                        // Last resort: set entire HTML
                        campaignEditor.setHTML(newContent);
                    }
                }, 100);
                showNotification(`Template "${template.name}" inserted successfully`, 'success');
                closeModal('templateBrowserModal');
            }
        } else {
            showNotification('Editor not initialized', 'error');
        }
    } catch (error) {
        console.error('Error inserting template:', error);
        showNotification('Failed to insert template', 'error');
    }
}

// Escape HTML for safe rendering
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Show notification (simple implementation)
function showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.textContent = message;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 15px 25px;
        background: ${type === 'error' ? '#e74c3c' : type === 'success' ? '#27ae60' : '#3498db'};
        color: white;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        z-index: 10000;
        font-size: 14px;
        font-weight: 500;
        animation: slideInRight 0.3s ease-out;
    `;

    document.body.appendChild(notification);

    // Remove after 3 seconds
    setTimeout(() => {
        notification.style.animation = 'slideOutRight 0.3s ease-out';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// Add CSS animation for notifications
const style = document.createElement('style');
style.textContent = `
    @keyframes slideInRight {
        from {
            transform: translateX(400px);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    @keyframes slideOutRight {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(400px);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);

// Save current editor content as template
async function saveAsTemplate() {
    if (!campaignEditor) {
        showNotification('No content to save', 'error');
        return;
    }

    const htmlContent = campaignEditor.getHTML();
    if (!htmlContent || htmlContent.trim() === '') {
        showNotification('Please add some content before saving as template', 'error');
        return;
    }

    // Prompt for template details
    const name = prompt('Template Name:');
    if (!name) return;

    const description = prompt('Template Description (optional):');

    const category = prompt('Category (Headers/Footers/Call to Action/Social Icons/Dividers/Content Blocks):', 'Content Blocks');
    if (!category) return;

    try {
        const result = await window.api.createCampaignTemplate({
            name,
            description: description || '',
            category,
            htmlContent,
            userId: currentUser.userId
        });

        if (result.success || result.id) {
            showNotification(`Template "${name}" saved successfully!`, 'success');

            // Reload templates
            await loadTemplates();
        } else {
            showNotification('Failed to save template: ' + (result.error || 'Unknown error'), 'error');
        }
    } catch (error) {
        console.error('Error saving template:', error);
        showNotification('Failed to save template', 'error');
    }
}

// ===== RECIPIENT SELECTION =====

function selectAllContacts() {
    if (contacts.length === 0) {
        showNotification('No contacts available. Please add contacts first.', 'error');
        return;
    }

    selectedRecipients = contacts.map(c => c.id);
    updateRecipientDisplay();
    showNotification(`All ${contacts.length} contacts selected`, 'success');
}

function showRecipientSelector() {
    if (contacts.length === 0) {
        showNotification('No contacts available. Please add contacts first.', 'error');
        return;
    }

    document.getElementById('recipientSelectorModal').classList.add('show');
    renderRecipientList();
}

function renderRecipientList(searchTerm = '') {
    const recipientList = document.getElementById('recipientList');
    const searchLower = searchTerm.toLowerCase();

    let filteredContacts = contacts;
    if (searchTerm) {
        filteredContacts = contacts.filter(c =>
            c.email.toLowerCase().includes(searchLower) ||
            (c.first_name && c.first_name.toLowerCase().includes(searchLower)) ||
            (c.last_name && c.last_name.toLowerCase().includes(searchLower))
        );
    }

    if (filteredContacts.length === 0) {
        recipientList.innerHTML = '<div style="text-align: center; padding: 40px; color: #999;">No contacts found</div>';
        return;
    }

    recipientList.innerHTML = filteredContacts.map(contact => {
        const isSelected = selectedRecipients.includes(contact.id);
        return `
            <label style="display: flex; align-items: center; gap: 12px; padding: 12px; border-bottom: 1px solid #f0f0f0; cursor: pointer; transition: background 0.2s;"
                   onmouseover="this.style.background='#f9f9f9'"
                   onmouseout="this.style.background='white'">
                <input type="checkbox"
                       value="${contact.id}"
                       ${isSelected ? 'checked' : ''}
                       onchange="toggleRecipient('${contact.id}')"
                       style="width: 18px; height: 18px; cursor: pointer;">
                <div style="flex: 1;">
                    <div style="font-weight: 500; color: #333; margin-bottom: 3px;">
                        ${escapeHtml(contact.first_name || '')} ${escapeHtml(contact.last_name || '')}
                    </div>
                    <div style="font-size: 13px; color: #666;">
                        ${escapeHtml(contact.email)}
                    </div>
                </div>
            </label>
        `;
    }).join('');

    updateSelectedCount();

    // Add search listener
    const searchInput = document.getElementById('recipientSearch');
    searchInput.oninput = (e) => renderRecipientList(e.target.value);
}

function toggleRecipient(contactId) {
    const index = selectedRecipients.indexOf(contactId);
    if (index > -1) {
        selectedRecipients.splice(index, 1);
    } else {
        selectedRecipients.push(contactId);
    }
    updateSelectedCount();
}

function selectAllRecipientsInList() {
    const checkboxes = document.querySelectorAll('#recipientList input[type="checkbox"]');
    checkboxes.forEach(cb => {
        cb.checked = true;
        const contactId = cb.value;
        if (!selectedRecipients.includes(contactId)) {
            selectedRecipients.push(contactId);
        }
    });
    updateSelectedCount();
}

function deselectAllRecipients() {
    selectedRecipients = [];
    const checkboxes = document.querySelectorAll('#recipientList input[type="checkbox"]');
    checkboxes.forEach(cb => cb.checked = false);
    updateSelectedCount();
}

function updateSelectedCount() {
    const countElem = document.getElementById('selectedCount');
    if (countElem) {
        countElem.textContent = selectedRecipients.length;
    }
}

function confirmRecipientSelection() {
    if (selectedRecipients.length === 0) {
        showNotification('Please select at least one recipient', 'error');
        return;
    }

    updateRecipientDisplay();
    closeModal('recipientSelectorModal');
    showNotification(`${selectedRecipients.length} recipient(s) selected`, 'success');
}

function updateRecipientDisplay() {
    const display = document.getElementById('selectedRecipientsDisplay');
    if (selectedRecipients.length === 0) {
        display.innerHTML = 'No recipients selected';
        display.style.color = '#666';
    } else {
        const selectedContacts = contacts.filter(c => selectedRecipients.includes(c.id));
        const names = selectedContacts.slice(0, 3).map(c => c.email).join(', ');
        const extra = selectedRecipients.length > 3 ? ` and ${selectedRecipients.length - 3} more` : '';
        display.innerHTML = `<strong>${selectedRecipients.length} recipient(s):</strong> ${names}${extra}`;
        display.style.color = '#333';
    }
}

// ===== SCHEDULING =====

function updateSendOptions() {
    const sendOption = document.querySelector('input[name="sendOption"]:checked').value;
    const scheduleOptions = document.getElementById('scheduleOptions');

    if (sendOption === 'schedule') {
        scheduleOptions.style.display = 'block';

        // Set default to tomorrow at 9 AM
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(9, 0, 0, 0);

        const dateTimeInput = document.getElementById('scheduledDateTime');
        if (dateTimeInput) {
            // Format for datetime-local input
            const year = tomorrow.getFullYear();
            const month = String(tomorrow.getMonth() + 1).padStart(2, '0');
            const day = String(tomorrow.getDate()).padStart(2, '0');
            const hours = String(tomorrow.getHours()).padStart(2, '0');
            const minutes = String(tomorrow.getMinutes()).padStart(2, '0');
            dateTimeInput.value = `${year}-${month}-${day}T${hours}:${minutes}`;
        }
    } else {
        scheduleOptions.style.display = 'none';
    }
}

// Initialize when page loads
init();
