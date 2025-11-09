const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('api', {
  // Setup
  setupOwner: (data) => ipcRenderer.invoke('setup-owner', data),
  
  // Auth
  login: (data) => ipcRenderer.invoke('login', data),
  logout: () => ipcRenderer.invoke('logout'),
  getSession: () => ipcRenderer.invoke('get-session'),
  
  // 2FA & Security
  setup2FA: (userId) => ipcRenderer.invoke('setup-2fa', userId),
  enable2FA: (data) => ipcRenderer.invoke('enable-2fa', data),
  disable2FA: (data) => ipcRenderer.invoke('disable-2fa', data),
  enableBiometric: (data) => ipcRenderer.invoke('enable-biometric', data),
  verifyBiometric: (data) => ipcRenderer.invoke('verify-biometric', data),
  
  // Password Recovery
  requestPasswordReset: (email) => ipcRenderer.invoke('request-password-reset', email),
  resetPassword: (data) => ipcRenderer.invoke('reset-password', data),
  
  // Company
  getCompanySettings: () => ipcRenderer.invoke('get-company-settings'),
  
  // Campaigns
  getCampaigns: (userId) => ipcRenderer.invoke('get-campaigns', userId),
  createCampaign: (data) => ipcRenderer.invoke('create-campaign', data),
  getCampaign: (id) => ipcRenderer.invoke('get-campaign', id),
  updateCampaign: (data) => ipcRenderer.invoke('update-campaign', data),
  deleteCampaign: (id) => ipcRenderer.invoke('delete-campaign', id),
  scheduleCampaign: (data) => ipcRenderer.invoke('schedule-campaign', data),
  sendCampaign: (data) => ipcRenderer.invoke('send-campaign', data),
  getCampaignAnalytics: (id) => ipcRenderer.invoke('get-campaign-analytics', id),
  
  // Contacts
  getContacts: () => ipcRenderer.invoke('get-contacts'),
  createContact: (data) => ipcRenderer.invoke('create-contact', data),
  importContacts: (contacts) => ipcRenderer.invoke('import-contacts', contacts),
  importContactsCSV: (csvData) => ipcRenderer.invoke('import-contacts-csv', csvData),
  deleteContact: (id) => ipcRenderer.invoke('delete-contact', id),
  
  // Contact Lists
  getContactLists: (userId) => ipcRenderer.invoke('get-contact-lists', userId),
  createContactList: (data) => ipcRenderer.invoke('create-contact-list', data),
  deleteContactList: (listId) => ipcRenderer.invoke('delete-contact-list', listId),
  addContactsToList: (data) => ipcRenderer.invoke('add-contacts-to-list', data),
  removeContactFromList: (data) => ipcRenderer.invoke('remove-contact-from-list', data),
  removeAllContactsFromList: (listId) => ipcRenderer.invoke('remove-all-contacts-from-list', listId),
  getListContacts: (listId) => ipcRenderer.invoke('get-list-contacts', listId),
  
  // Email configs
  getEmailConfigs: () => ipcRenderer.invoke('get-email-configs'),
  saveEmailConfig: (data) => ipcRenderer.invoke('save-email-config', data),
  testSmtpConnection: (data) => ipcRenderer.invoke('test-smtp-connection', data),
  testEmailConfig: (configId) => ipcRenderer.invoke('test-email-config', configId),
  setDefaultEmailConfig: (configId) => ipcRenderer.invoke('set-default-email-config', configId),
  
  // Email Templates
  getEmailTemplates: (userId) => ipcRenderer.invoke('get-email-templates', userId),
  createEmailTemplate: (data) => ipcRenderer.invoke('create-email-template', data),
  deleteEmailTemplate: (id) => ipcRenderer.invoke('delete-email-template', id),

  // Campaign Templates
  getCampaignTemplates: (filters) => ipcRenderer.invoke('get-campaign-templates', filters),
  createCampaignTemplate: (data) => ipcRenderer.invoke('create-campaign-template', data),
  deleteCampaignTemplate: (data) => ipcRenderer.invoke('delete-campaign-template', data),

  // Responses
  getResponses: (campaignId) => ipcRenderer.invoke('get-responses', campaignId),
  saveResponse: (data) => ipcRenderer.invoke('save-response', data),
  exportResponsesCSV: (campaignId) => ipcRenderer.invoke('export-responses-csv', campaignId),
  
  // Users
  getUsers: () => ipcRenderer.invoke('get-users'),
  createUser: (data) => ipcRenderer.invoke('create-user', data),
  deleteUser: (id) => ipcRenderer.invoke('delete-user', id),
  getUserPreferences: (userId) => ipcRenderer.invoke('get-user-preferences', userId),
  saveUserPreferences: (data) => ipcRenderer.invoke('save-user-preferences', data),
  
  // NEW: App Control
  quitApp: () => ipcRenderer.invoke('quit-app'),
  
  // NEW: Setup Wizard
  completeSetup: (data) => ipcRenderer.invoke('complete-setup', data),
  
  // NEW: Device Contacts
  requestContactsPermission: () => ipcRenderer.invoke('request-contacts-permission'),
  getDeviceContacts: () => ipcRenderer.invoke('get-device-contacts'),
  
  // NEW: User Invitations
  inviteUser: (data) => ipcRenderer.invoke('invite-user', data),
  getInvitations: (filters) => ipcRenderer.invoke('get-invitations', filters),
  acceptInvitation: (token) => ipcRenderer.invoke('accept-invitation', token),
  revokeInvitation: (inviteId) => ipcRenderer.invoke('revoke-invitation', inviteId),
  
  // NEW: Owner Oversight
  getOwnerDashboard: () => ipcRenderer.invoke('get-owner-dashboard'),
  getUserActivity: (userId) => ipcRenderer.invoke('get-user-activity', userId),
  
  // NEW: Company Settings (expanded)
  updateCompanySettings: (data) => ipcRenderer.invoke('update-company-settings', data),

  // NEW: Logging
  openLogs: () => ipcRenderer.invoke('open-logs'),
  getLogPath: () => ipcRenderer.invoke('get-log-path')
});
