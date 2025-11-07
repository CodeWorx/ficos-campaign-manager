# FICOS Campaign Manager - Complete API Reference

Comprehensive documentation for all 63 APIs available in the Electron application.

**Version:** 2.0  
**Last Updated:** November 7, 2025

---

## Table of Contents

1. [Authentication APIs](#authentication-apis) (4 APIs)
2. [Security APIs](#security-apis) (6 APIs)
3. [User Management APIs](#user-management-apis) (6 APIs)
4. [Campaign APIs](#campaign-apis) (8 APIs)
5. [Contact APIs](#contact-apis) (7 APIs)
6. [Form Builder APIs](#form-builder-apis) (5 APIs)
7. [Email APIs](#email-apis) (6 APIs)
8. [Response Management APIs](#response-management-apis) (5 APIs)
9. [Analytics APIs](#analytics-apis) (4 APIs)
10. [Settings APIs](#settings-apis) (5 APIs)
11. [Template APIs](#template-apis) (4 APIs)
12. [Webhook APIs](#webhook-apis) (3 APIs)

---

## 🔐 Authentication APIs

### 1. setupOwner(data)
Create the initial owner account during first-run setup.

**Usage:**
```javascript
await window.api.setupOwner({
  name: 'John Doe',
  email: 'john@company.com',
  password: 'secure123',
  companyName: 'FICOS Inc',
  companyLogo: 'base64-encoded-image' // Optional
})
```

**Returns:**
```javascript
{ 
  success: true, 
  userId: 'uuid-string',
  message: 'Owner account created successfully' 
}
```

---

### 2. login(data)
Authenticate user with optional 2FA.

**Usage:**
```javascript
await window.api.login({
  email: 'john@company.com',
  password: 'secure123',
  twoFactorCode: '123456', // Optional, required if 2FA enabled
  biometricToken: 'token'  // Optional, for biometric login
})
```

**Returns:**
```javascript
// Success
{ 
  success: true, 
  user: {
    id: 'uuid',
    email: 'john@company.com',
    name: 'John Doe',
    role: 'OWNER'
  }
}

// OR requires 2FA
{ 
  success: false, 
  requiresTwoFactor: true 
}
```

---

### 3. logout()
Log out the current user session.

**Usage:**
```javascript
await window.api.logout()
```

**Returns:**
```javascript
{ success: true }
```

---

### 4. getSession()
Get the current authenticated user session.

**Usage:**
```javascript
const session = await window.api.getSession()
```

**Returns:**
```javascript
// If logged in
{
  userId: 'uuid-string',
  email: 'user@email.com',
  name: 'User Name',
  role: 'OWNER' | 'ADMIN' | 'USER'
}

// If not logged in
null
```

---

## 🔒 Security APIs

### 5. setup2FA(userId)
Generate 2FA secret and QR code for authenticator apps.

**Usage:**
```javascript
const result = await window.api.setup2FA('user-id')
```

**Returns:**
```javascript
{
  success: true,
  secret: 'BASE32ENCODEDSECRET',
  qrCode: 'data:image/png;base64,iVBORw0KG...',
  backupCodes: ['code1', 'code2', ...]
}
```

---

### 6. enable2FA(data)
Verify and enable 2FA for a user.

**Usage:**
```javascript
await window.api.enable2FA({
  userId: 'user-id',
  token: '123456'  // 6-digit code from authenticator app
})
```

**Returns:**
```javascript
{ success: true, message: '2FA enabled successfully' }
// OR
{ success: false, error: 'Invalid token' }
```

---

### 7. disable2FA(data)
Disable 2FA with password verification.

**Usage:**
```javascript
await window.api.disable2FA({
  userId: 'user-id',
  password: 'current-password'
})
```

**Returns:**
```javascript
{ success: true, message: '2FA disabled' }
```

---

### 8. enableBiometric(data)
Enable biometric authentication (fingerprint/face).

**Usage:**
```javascript
await window.api.enableBiometric({
  userId: 'user-id',
  publicKey: 'generated-public-key-from-device'
})
```

**Returns:**
```javascript
{ success: true }
```

---

### 9. verifyBiometric(data)
Authenticate using biometric credentials.

**Usage:**
```javascript
await window.api.verifyBiometric({
  userId: 'user-id',
  signature: 'biometric-signature'
})
```

**Returns:**
```javascript
{ 
  success: true, 
  user: { id, email, name, role } 
}
```

---

### 10. getAuditLogs(filters)
Retrieve security audit logs.

**Usage:**
```javascript
const logs = await window.api.getAuditLogs({
  userId: 'user-id',      // Optional filter
  action: 'LOGIN',        // Optional: LOGIN, LOGOUT, CREATE, UPDATE, DELETE
  startDate: '2025-01-01',
  endDate: '2025-12-31',
  limit: 100,
  offset: 0
})
```

**Returns:**
```javascript
{
  logs: [
    {
      id: 'uuid',
      userId: 'user-id',
      action: 'LOGIN',
      entityType: 'USER',
      entityId: 'entity-id',
      details: 'User logged in from IP 192.168.1.1',
      timestamp: '2025-11-07T12:00:00Z'
    },
    ...
  ],
  total: 150
}
```

---

## 👥 User Management APIs

### 11. createUser(data)
Create a new user account.

**Usage:**
```javascript
await window.api.createUser({
  name: 'Jane Smith',
  email: 'jane@company.com',
  password: 'secure456',
  role: 'ADMIN' // OWNER, ADMIN, or USER
})
```

**Returns:**
```javascript
{ 
  success: true, 
  userId: 'uuid-string' 
}
```

---

### 12. getUsers(filters)
Retrieve all users with optional filtering.

**Usage:**
```javascript
const users = await window.api.getUsers({
  role: 'ADMIN',  // Optional
  search: 'jane', // Optional: search by name/email
  limit: 50,
  offset: 0
})
```

**Returns:**
```javascript
{
  users: [
    {
      id: 'uuid',
      email: 'user@email.com',
      name: 'User Name',
      role: 'ADMIN',
      twoFactorEnabled: true,
      biometricEnabled: false,
      createdAt: '2025-01-15T10:00:00Z',
      lastLogin: '2025-11-07T09:30:00Z'
    },
    ...
  ],
  total: 25
}
```

---

### 13. updateUser(data)
Update user information.

**Usage:**
```javascript
await window.api.updateUser({
  userId: 'user-id',
  name: 'New Name',
  email: 'newemail@company.com',
  role: 'ADMIN'
})
```

**Returns:**
```javascript
{ success: true }
```

---

### 14. deleteUser(userId)
Delete a user account (soft delete).

**Usage:**
```javascript
await window.api.deleteUser('user-id')
```

**Returns:**
```javascript
{ success: true }
```

---

### 15. changePassword(data)
Change user password.

**Usage:**
```javascript
await window.api.changePassword({
  userId: 'user-id',
  oldPassword: 'old-password',
  newPassword: 'new-password'
})
```

**Returns:**
```javascript
{ success: true }
// OR
{ success: false, error: 'Incorrect password' }
```

---

### 16. resetPassword(data)
Reset password via email token.

**Usage:**
```javascript
await window.api.resetPassword({
  email: 'user@email.com',
  resetToken: 'token-from-email',
  newPassword: 'new-password'
})
```

**Returns:**
```javascript
{ success: true }
```

---

## 📧 Campaign APIs

### 17. createCampaign(data)
Create a new email campaign.

**Usage:**
```javascript
await window.api.createCampaign({
  name: 'Q4 Product Launch',
  description: 'Launch campaign for new product',
  formHtml: '<form>...</form>',
  subject: 'Check out our new product!',
  fromName: 'FICOS Team',
  fromEmail: 'team@ficos.com',
  replyTo: 'support@ficos.com',
  scheduleDate: '2025-12-01T10:00:00Z', // Optional
  status: 'DRAFT' // DRAFT, SCHEDULED, SENT
})
```

**Returns:**
```javascript
{ 
  success: true, 
  campaignId: 'uuid-string' 
}
```

---

### 18. getCampaigns(filters)
Retrieve campaigns with filtering.

**Usage:**
```javascript
const campaigns = await window.api.getCampaigns({
  status: 'SENT',     // Optional: DRAFT, SCHEDULED, SENT
  search: 'product',  // Optional
  startDate: '2025-01-01',
  endDate: '2025-12-31',
  limit: 20,
  offset: 0
})
```

**Returns:**
```javascript
{
  campaigns: [
    {
      id: 'uuid',
      name: 'Q4 Product Launch',
      subject: 'Check out our new product!',
      status: 'SENT',
      sentCount: 1500,
      openRate: 45.2,
      clickRate: 12.8,
      responseRate: 8.5,
      createdAt: '2025-11-01T10:00:00Z',
      sentAt: '2025-11-07T10:00:00Z'
    },
    ...
  ],
  total: 45
}
```

---

### 19. getCampaign(campaignId)
Get detailed campaign information.

**Usage:**
```javascript
const campaign = await window.api.getCampaign('campaign-id')
```

**Returns:**
```javascript
{
  id: 'uuid',
  name: 'Campaign Name',
  description: 'Campaign description',
  formHtml: '<form>...</form>',
  subject: 'Email subject',
  fromName: 'FICOS Team',
  fromEmail: 'team@ficos.com',
  status: 'SENT',
  stats: {
    totalSent: 1500,
    delivered: 1485,
    opened: 678,
    clicked: 192,
    responded: 127,
    bounced: 15,
    unsubscribed: 8
  },
  createdAt: '2025-11-01T10:00:00Z',
  sentAt: '2025-11-07T10:00:00Z'
}
```

---

### 20. updateCampaign(data)
Update campaign details.

**Usage:**
```javascript
await window.api.updateCampaign({
  campaignId: 'campaign-id',
  name: 'Updated Name',
  formHtml: '<form>...</form>',
  subject: 'New subject line'
})
```

**Returns:**
```javascript
{ success: true }
```

---

### 21. deleteCampaign(campaignId)
Delete a campaign (soft delete).

**Usage:**
```javascript
await window.api.deleteCampaign('campaign-id')
```

**Returns:**
```javascript
{ success: true }
```

---

### 22. sendCampaign(data)
Send campaign to contact list.

**Usage:**
```javascript
await window.api.sendCampaign({
  campaignId: 'campaign-id',
  contactListIds: ['list-id-1', 'list-id-2'],
  sendNow: true, // false to schedule
  scheduleDate: '2025-12-01T10:00:00Z' // Required if sendNow = false
})
```

**Returns:**
```javascript
{ 
  success: true, 
  emailsQueued: 1500,
  message: 'Campaign sent successfully' 
}
```

---

### 23. duplicateCampaign(campaignId)
Create a copy of an existing campaign.

**Usage:**
```javascript
await window.api.duplicateCampaign('campaign-id')
```

**Returns:**
```javascript
{ 
  success: true, 
  newCampaignId: 'uuid-string' 
}
```

---

### 24. testCampaign(data)
Send test email of campaign.

**Usage:**
```javascript
await window.api.testCampaign({
  campaignId: 'campaign-id',
  testEmails: ['test1@email.com', 'test2@email.com']
})
```

**Returns:**
```javascript
{ 
  success: true, 
  message: 'Test emails sent' 
}
```

---

## 📇 Contact APIs

### 25. createContact(data)
Add a new contact.

**Usage:**
```javascript
await window.api.createContact({
  email: 'contact@email.com',
  name: 'Contact Name',
  phone: '+1234567890',
  company: 'Company Inc',
  customFields: {
    industry: 'Technology',
    jobTitle: 'CTO'
  },
  listIds: ['list-id-1', 'list-id-2']
})
```

**Returns:**
```javascript
{ 
  success: true, 
  contactId: 'uuid-string' 
}
```

---

### 26. getContacts(filters)
Retrieve contacts with filtering.

**Usage:**
```javascript
const contacts = await window.api.getContacts({
  listId: 'list-id',      // Optional
  search: 'john',         // Optional: search by name/email
  subscribed: true,       // Optional: true, false, null (all)
  startDate: '2025-01-01',
  endDate: '2025-12-31',
  limit: 100,
  offset: 0
})
```

**Returns:**
```javascript
{
  contacts: [
    {
      id: 'uuid',
      email: 'contact@email.com',
      name: 'Contact Name',
      phone: '+1234567890',
      company: 'Company Inc',
      subscribed: true,
      lists: ['Marketing', 'Newsletter'],
      createdAt: '2025-05-15T10:00:00Z',
      lastEmailSent: '2025-11-01T12:00:00Z'
    },
    ...
  ],
  total: 2500
}
```

---

### 27. updateContact(data)
Update contact information.

**Usage:**
```javascript
await window.api.updateContact({
  contactId: 'contact-id',
  name: 'Updated Name',
  email: 'newemail@email.com',
  customFields: {
    industry: 'Finance'
  }
})
```

**Returns:**
```javascript
{ success: true }
```

---

### 28. deleteContact(contactId)
Delete a contact (soft delete).

**Usage:**
```javascript
await window.api.deleteContact('contact-id')
```

**Returns:**
```javascript
{ success: true }
```

---

### 29. importContacts(data)
Bulk import contacts from CSV.

**Usage:**
```javascript
await window.api.importContacts({
  csvData: 'email,name,phone\njohn@email.com,John,123...',
  listId: 'list-id',
  updateExisting: true,
  mapping: {
    email: 0,    // CSV column index
    name: 1,
    phone: 2
  }
})
```

**Returns:**
```javascript
{ 
  success: true, 
  imported: 150,
  updated: 25,
  errors: 5,
  errorDetails: [
    { row: 10, error: 'Invalid email format' },
    ...
  ]
}
```

---

### 30. exportContacts(filters)
Export contacts to CSV.

**Usage:**
```javascript
const csv = await window.api.exportContacts({
  listId: 'list-id',  // Optional
  subscribed: true    // Optional
})
```

**Returns:**
```javascript
{
  success: true,
  csvData: 'email,name,phone,company...',
  filename: 'contacts-2025-11-07.csv',
  count: 1500
}
```

---

### 31. manageContactLists(data)
Add or remove contacts from lists.

**Usage:**
```javascript
await window.api.manageContactLists({
  contactIds: ['contact-id-1', 'contact-id-2'],
  addToLists: ['list-id-1'],
  removeFromLists: ['list-id-2']
})
```

**Returns:**
```javascript
{ 
  success: true, 
  updated: 2 
}
```

---

## 📝 Form Builder APIs

### 32. saveForm(data)
Save or update a form template.

**Usage:**
```javascript
await window.api.saveForm({
  id: 'form-id',  // Optional, creates new if not provided
  name: 'Product Survey',
  html: '<form>...</form>',
  fields: [
    { name: 'email', type: 'email', required: true },
    { name: 'feedback', type: 'textarea', required: false }
  ]
})
```

**Returns:**
```javascript
{ 
  success: true, 
  formId: 'uuid-string' 
}
```

---

### 33. getForms(filters)
Retrieve saved forms.

**Usage:**
```javascript
const forms = await window.api.getForms({
  search: 'survey',
  limit: 20,
  offset: 0
})
```

**Returns:**
```javascript
{
  forms: [
    {
      id: 'uuid',
      name: 'Product Survey',
      fieldCount: 8,
      usedInCampaigns: 3,
      createdAt: '2025-10-01T10:00:00Z',
      updatedAt: '2025-10-15T14:30:00Z'
    },
    ...
  ],
  total: 15
}
```

---

### 34. getForm(formId)
Get form details.

**Usage:**
```javascript
const form = await window.api.getForm('form-id')
```

**Returns:**
```javascript
{
  id: 'uuid',
  name: 'Product Survey',
  html: '<form>...</form>',
  fields: [
    { name: 'email', type: 'email', required: true },
    { name: 'feedback', type: 'textarea', required: false }
  ],
  createdAt: '2025-10-01T10:00:00Z'
}
```

---

### 35. deleteForm(formId)
Delete a form template.

**Usage:**
```javascript
await window.api.deleteForm('form-id')
```

**Returns:**
```javascript
{ success: true }
```

---

### 36. previewForm(html)
Generate form preview.

**Usage:**
```javascript
const preview = await window.api.previewForm('<form>...</form>')
```

**Returns:**
```javascript
{
  success: true,
  previewUrl: 'data:text/html;base64,...',
  warnings: [
    'Form missing submit button',
    'Email field not found'
  ]
}
```

---

## 📨 Email APIs

### 37. configureSmtp(data)
Configure SMTP email settings.

**Usage:**
```javascript
await window.api.configureSmtp({
  host: 'smtp.gmail.com',
  port: 587,
  secure: false,  // true for 465, false for other ports
  user: 'your-email@gmail.com',
  password: 'app-specific-password',
  fromName: 'FICOS Team',
  fromEmail: 'team@ficos.com'
})
```

**Returns:**
```javascript
{ success: true }
```

---

### 38. testSmtp()
Test SMTP configuration.

**Usage:**
```javascript
await window.api.testSmtp()
```

**Returns:**
```javascript
{ 
  success: true, 
  message: 'SMTP connection successful' 
}
// OR
{ 
  success: false, 
  error: 'Authentication failed' 
}
```

---

### 39. getEmailSettings()
Get current email configuration.

**Usage:**
```javascript
const settings = await window.api.getEmailSettings()
```

**Returns:**
```javascript
{
  host: 'smtp.gmail.com',
  port: 587,
  secure: false,
  user: 'your-email@gmail.com',
  fromName: 'FICOS Team',
  fromEmail: 'team@ficos.com',
  configured: true
}
```

---

### 40. getCampaignEmails(campaignId, filters)
Get emails sent for a campaign.

**Usage:**
```javascript
const emails = await window.api.getCampaignEmails('campaign-id', {
  status: 'DELIVERED',  // SENT, DELIVERED, OPENED, CLICKED, BOUNCED
  limit: 50,
  offset: 0
})
```

**Returns:**
```javascript
{
  emails: [
    {
      id: 'uuid',
      contactEmail: 'recipient@email.com',
      status: 'OPENED',
      sentAt: '2025-11-07T10:00:00Z',
      deliveredAt: '2025-11-07T10:00:15Z',
      openedAt: '2025-11-07T11:30:00Z',
      clickedAt: '2025-11-07T11:35:00Z'
    },
    ...
  ],
  total: 1500
}
```

---

### 41. resendEmail(emailId)
Resend a failed email.

**Usage:**
```javascript
await window.api.resendEmail('email-id')
```

**Returns:**
```javascript
{ 
  success: true, 
  message: 'Email queued for resending' 
}
```

---

### 42. sendTestEmail(data)
Send a test email.

**Usage:**
```javascript
await window.api.sendTestEmail({
  to: 'test@email.com',
  subject: 'Test Email',
  html: '<h1>Test</h1>'
})
```

**Returns:**
```javascript
{ 
  success: true, 
  messageId: 'smtp-message-id' 
}
```

---

## 📊 Response Management APIs

### 43. getResponses(filters)
Get form responses.

**Usage:**
```javascript
const responses = await window.api.getResponses({
  campaignId: 'campaign-id',  // Optional
  startDate: '2025-11-01',
  endDate: '2025-11-07',
  search: 'john',             // Optional: search in responses
  limit: 50,
  offset: 0
})
```

**Returns:**
```javascript
{
  responses: [
    {
      id: 'uuid',
      campaignId: 'campaign-id',
      campaignName: 'Q4 Launch',
      contactEmail: 'user@email.com',
      responseData: {
        name: 'John Doe',
        feedback: 'Great product!',
        rating: 5
      },
      ipAddress: '192.168.1.1',
      submittedAt: '2025-11-07T12:30:00Z'
    },
    ...
  ],
  total: 127
}
```

---

### 44. getResponse(responseId)
Get detailed response information.

**Usage:**
```javascript
const response = await window.api.getResponse('response-id')
```

**Returns:**
```javascript
{
  id: 'uuid',
  campaignId: 'campaign-id',
  campaignName: 'Q4 Launch',
  contact: {
    email: 'user@email.com',
    name: 'John Doe',
    company: 'Tech Corp'
  },
  responseData: {
    name: 'John Doe',
    email: 'user@email.com',
    feedback: 'Great product!',
    rating: 5
  },
  ipAddress: '192.168.1.1',
  userAgent: 'Mozilla/5.0...',
  submittedAt: '2025-11-07T12:30:00Z'
}
```

---

### 45. deleteResponse(responseId)
Delete a form response.

**Usage:**
```javascript
await window.api.deleteResponse('response-id')
```

**Returns:**
```javascript
{ success: true }
```

---

### 46. exportResponses(filters)
Export responses to CSV.

**Usage:**
```javascript
const csv = await window.api.exportResponses({
  campaignId: 'campaign-id',
  startDate: '2025-11-01',
  endDate: '2025-11-07'
})
```

**Returns:**
```javascript
{
  success: true,
  csvData: 'email,name,feedback,rating,submitted_at...',
  filename: 'responses-Q4-Launch-2025-11-07.csv',
  count: 127
}
```

---

### 47. markResponseAsRead(responseId)
Mark a response as reviewed.

**Usage:**
```javascript
await window.api.markResponseAsRead('response-id')
```

**Returns:**
```javascript
{ success: true }
```

---

## 📈 Analytics APIs

### 48. getDashboardStats()
Get overview statistics for dashboard.

**Usage:**
```javascript
const stats = await window.api.getDashboardStats()
```

**Returns:**
```javascript
{
  totalCampaigns: 45,
  activeCampaigns: 5,
  totalContacts: 15000,
  totalResponses: 2340,
  recentActivity: [
    {
      type: 'CAMPAIGN_SENT',
      description: 'Q4 Launch campaign sent to 1500 contacts',
      timestamp: '2025-11-07T10:00:00Z'
    },
    ...
  ],
  topCampaigns: [
    {
      id: 'uuid',
      name: 'Q4 Launch',
      openRate: 45.2,
      clickRate: 12.8,
      responseRate: 8.5
    },
    ...
  ]
}
```

---

### 49. getCampaignAnalytics(campaignId)
Get detailed campaign analytics.

**Usage:**
```javascript
const analytics = await window.api.getCampaignAnalytics('campaign-id')
```

**Returns:**
```javascript
{
  campaignId: 'uuid',
  campaignName: 'Q4 Launch',
  totalSent: 1500,
  delivered: 1485,
  opened: 678,
  clicked: 192,
  responded: 127,
  bounced: 15,
  unsubscribed: 8,
  rates: {
    deliveryRate: 99.0,
    openRate: 45.2,
    clickRate: 12.8,
    responseRate: 8.5,
    bounceRate: 1.0,
    unsubscribeRate: 0.5
  },
  timeline: [
    { date: '2025-11-07', opens: 145, clicks: 42, responses: 28 },
    { date: '2025-11-08', opens: 89, clicks: 25, responses: 15 },
    ...
  ],
  topLinks: [
    { url: 'https://example.com/product', clicks: 85 },
    { url: 'https://example.com/pricing', clicks: 47 },
    ...
  ]
}
```

---

### 50. getContactAnalytics(contactId)
Get analytics for a specific contact.

**Usage:**
```javascript
const analytics = await window.api.getContactAnalytics('contact-id')
```

**Returns:**
```javascript
{
  contactId: 'uuid',
  email: 'user@email.com',
  totalEmailsReceived: 15,
  totalOpens: 12,
  totalClicks: 8,
  totalResponses: 3,
  engagementScore: 75,  // 0-100
  campaigns: [
    {
      campaignName: 'Q4 Launch',
      sent: '2025-11-07T10:00:00Z',
      opened: '2025-11-07T11:30:00Z',
      clicked: true,
      responded: true
    },
    ...
  ]
}
```

---

### 51. exportAnalytics(filters)
Export analytics data.

**Usage:**
```javascript
const report = await window.api.exportAnalytics({
  type: 'CAMPAIGN', // CAMPAIGN, CONTACT, OVERALL
  campaignId: 'campaign-id',  // Required if type = CAMPAIGN
  startDate: '2025-11-01',
  endDate: '2025-11-07',
  format: 'CSV' // CSV or JSON
})
```

**Returns:**
```javascript
{
  success: true,
  data: 'campaign,sent,opened,clicked...',
  filename: 'analytics-report-2025-11-07.csv'
}
```

---

## ⚙️ Settings APIs

### 52. getCompanySettings()
Get company/application settings.

**Usage:**
```javascript
const settings = await window.api.getCompanySettings()
```

**Returns:**
```javascript
{
  companyName: 'FICOS Inc',
  companyLogo: 'base64-encoded-image',
  brandColor: '#1a73e8',
  timezone: 'America/New_York',
  dateFormat: 'MM/DD/YYYY',
  language: 'en',
  features: {
    twoFactorAuth: true,
    biometricAuth: true,
    webhooks: true,
    apiAccess: true
  }
}
```

---

### 53. updateCompanySettings(data)
Update company settings.

**Usage:**
```javascript
await window.api.updateCompanySettings({
  companyName: 'FICOS Corporation',
  brandColor: '#ff5722',
  timezone: 'America/Los_Angeles'
})
```

**Returns:**
```javascript
{ success: true }
```

---

### 54. uploadCompanyLogo(data)
Upload company logo.

**Usage:**
```javascript
await window.api.uploadCompanyLogo({
  imageData: 'base64-encoded-image',
  filename: 'logo.png'
})
```

**Returns:**
```javascript
{ 
  success: true, 
  logoUrl: 'path/to/logo.png' 
}
```

---

### 55. getSystemSettings()
Get system-level settings.

**Usage:**
```javascript
const settings = await window.api.getSystemSettings()
```

**Returns:**
```javascript
{
  version: '2.0.0',
  databaseSize: '45.2 MB',
  totalUsers: 5,
  totalCampaigns: 45,
  totalContacts: 15000,
  totalResponses: 2340,
  emailProvider: 'SMTP',
  backupEnabled: true,
  lastBackup: '2025-11-07T00:00:00Z'
}
```

---

### 56. createBackup()
Create database backup.

**Usage:**
```javascript
await window.api.createBackup()
```

**Returns:**
```javascript
{ 
  success: true, 
  backupFile: 'backup-2025-11-07.db',
  size: '45.2 MB' 
}
```

---

## 📄 Template APIs

### 57. createTemplate(data)
Create email template.

**Usage:**
```javascript
await window.api.createTemplate({
  name: 'Welcome Email',
  subject: 'Welcome to {{companyName}}!',
  html: '<h1>Welcome {{name}}!</h1>...',
  variables: ['companyName', 'name', 'productName']
})
```

**Returns:**
```javascript
{ 
  success: true, 
  templateId: 'uuid-string' 
}
```

---

### 58. getTemplates(filters)
Get email templates.

**Usage:**
```javascript
const templates = await window.api.getTemplates({
  search: 'welcome',
  limit: 20,
  offset: 0
})
```

**Returns:**
```javascript
{
  templates: [
    {
      id: 'uuid',
      name: 'Welcome Email',
      subject: 'Welcome to {{companyName}}!',
      usageCount: 25,
      createdAt: '2025-10-01T10:00:00Z'
    },
    ...
  ],
  total: 12
}
```

---

### 59. updateTemplate(data)
Update email template.

**Usage:**
```javascript
await window.api.updateTemplate({
  templateId: 'template-id',
  name: 'Updated Welcome Email',
  html: '<h1>Updated content</h1>'
})
```

**Returns:**
```javascript
{ success: true }
```

---

### 60. deleteTemplate(templateId)
Delete email template.

**Usage:**
```javascript
await window.api.deleteTemplate('template-id')
```

**Returns:**
```javascript
{ success: true }
```

---

## 🔗 Webhook APIs

### 61. createWebhook(data)
Create webhook endpoint.

**Usage:**
```javascript
await window.api.createWebhook({
  name: 'Slack Notifications',
  url: 'https://hooks.slack.com/services/...',
  events: ['FORM_SUBMITTED', 'CAMPAIGN_SENT'],
  active: true,
  secret: 'webhook-secret'  // Optional, for signature verification
})
```

**Returns:**
```javascript
{ 
  success: true, 
  webhookId: 'uuid-string' 
}
```

---

### 62. getWebhooks()
Get all webhooks.

**Usage:**
```javascript
const webhooks = await window.api.getWebhooks()
```

**Returns:**
```javascript
{
  webhooks: [
    {
      id: 'uuid',
      name: 'Slack Notifications',
      url: 'https://hooks.slack.com/services/...',
      events: ['FORM_SUBMITTED', 'CAMPAIGN_SENT'],
      active: true,
      successCount: 145,
      failureCount: 2,
      lastTriggered: '2025-11-07T12:00:00Z'
    },
    ...
  ]
}
```

---

### 63. deleteWebhook(webhookId)
Delete webhook.

**Usage:**
```javascript
await window.api.deleteWebhook('webhook-id')
```

**Returns:**
```javascript
{ success: true }
```

---

## 📚 Additional Information

### Error Handling

All APIs return consistent error formats:

```javascript
{
  success: false,
  error: 'Error message',
  code: 'ERROR_CODE',  // Optional
  details: {...}       // Optional
}
```

### Common Error Codes

- `AUTH_REQUIRED` - User not authenticated
- `PERMISSION_DENIED` - Insufficient permissions
- `VALIDATION_ERROR` - Invalid input data
- `NOT_FOUND` - Resource not found
- `DUPLICATE_EMAIL` - Email already exists
- `SMTP_ERROR` - Email sending failed
- `DATABASE_ERROR` - Database operation failed

### Event System

The application also supports event listeners:

```javascript
// Listen for campaign sent event
window.api.on('campaign-sent', (data) => {
  console.log('Campaign sent:', data);
});

// Listen for new response
window.api.on('form-response', (data) => {
  console.log('New response:', data);
});
```

---

**FICOS Campaign Manager V2.0**  
*Complete API Documentation*

© 2025 FICOS | Licensed to FICOS  
For support, contact: support@ficos.com
