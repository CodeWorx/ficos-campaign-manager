# FICOS Campaign Manager - Version 3.1 Update

**Release Date:** November 7, 2025  
**Update Type:** Major Feature Release  
**Status:** ✅ PRODUCTION READY

---

## 🎉 What's New in Version 3.1

This update addresses critical legal, security, and usability improvements requested by the client. All features have been implemented and tested.

---

## ✨ New Features

### 1. 📜 **Terms of Service & License Agreement** (REQUIRED)

**Before anyone can use the app, they must accept comprehensive Terms of Service that protect FICOS intellectual property.**

#### What It Includes:
- ✅ Free unlimited use license
- ✅ Prohibition on redistribution, code copying, or reselling
- ✅ Requirement to keep FICOS branding intact
- ✅ Anti-spam policy (ZERO TOLERANCE)
- ✅ CAN-SPAM Act compliance requirements
- ✅ License termination rights (30-day notice or immediate for violations)
- ✅ Limitation of liability (FICOS not liable for damages)
- ✅ Indemnification clause
- ✅ Intellectual property protection

#### User Experience:
1. App launches → Shows TOS screen FIRST
2. User must scroll through entire document
3. User must check "I Accept" checkbox
4. Declining closes the application
5. TOS acceptance is stored and never asked again (unless version changes)

**File:** `/src/terms-of-service.html`

---

### 2. 🧙 **Interactive Setup Wizard** (USER-FRIENDLY)

**Replaces the basic setup with a guided, step-by-step wizard that walks users through everything.**

#### Features:
- **Step 1: Owner Account** - Create the main account
- **Step 2: Branding** - Upload logo, set brand colors, customize appearance
- **Step 3: Email Setup** - Configure SMTP with provider presets (Gmail, Outlook, Yahoo, Custom)
- **Step 4: Import Contacts** - Multiple options (CSV, Device, Manual, Skip)
- **Step 5: Completion** - Summary and quick start guide

#### Branding Tutorial:
- Visual color picker with live preview
- Logo upload with drag & drop
- Clear explanation: "Your branding appears alongside FICOS branding"
- Warning: "You cannot remove FICOS branding per license agreement"

#### SMTP Presets:
```javascript
Gmail:   smtp.gmail.com:587
Outlook: smtp.office365.com:587
Yahoo:   smtp.mail.yahoo.com:587
Custom:  User enters manually
```

**File:** `/src/setup-wizard.html`

---

### 3. 📱 **Device Contacts Access** (WITH PERMISSION)

**Users can import contacts from their device with proper permission handling.**

#### Implementation:
```javascript
// Request permission
const granted = await window.api.requestContactsPermission();

// If granted, get contacts
if (granted) {
    const contacts = await window.api.getDeviceContacts();
    // Returns: [{ email, name, phone }, ...]
}
```

#### Note:
Electron doesn't have native contact access. Current implementation:
- Returns `false` for permission (not available)
- Users can use CSV import as alternative
- Could be extended with platform-specific native modules

**Future Enhancement:** Add native modules for Windows/Mac/Linux contact access

---

### 4. 👥 **User Invitation System** (FOR OWNERS)

**Owners can invite team members to collaborate without sharing passwords.**

#### Features:
- Generate secure invitation links
- Set role (ADMIN or USER) before sending
- Invitations expire after 7 days
- Track pending/accepted invitations
- Revoke invitations before acceptance

#### Usage (Owner):
```javascript
// Invite a user
const result = await window.api.inviteUser({
    email: 'teammate@company.com',
    role: 'ADMIN',
    invitedBy: currentUserId
});

// Result includes secure link:
// ficos://invite/a1b2c3d4e5f6...
```

#### Usage (Invitee):
1. Click invitation link
2. Loads app with token
3. Creates account with preset email/role
4. Gets immediate access

**Database Table:** `user_invitations`

---

### 5. 🔍 **Owner Oversight Dashboard** (FULL TRANSPARENCY)

**Owners can see EVERYTHING users do without needing their passwords.**

#### What Owners Can See:
- ✅ All users and their roles
- ✅ Number of campaigns each user created
- ✅ Total actions per user
- ✅ Last login dates
- ✅ Complete activity history for ANY user
- ✅ Recent activity feed (all users combined)
- ✅ System-wide statistics

#### Activity Tracking:
Every action is logged:
- Login/Logout
- Campaign creation/sending/deletion
- Contact imports
- Settings changes
- User invitations
- And more...

#### Access:
- Only available to users with `role = 'OWNER'`
- Link appears in main dashboard for owners
- Shows real-time data from audit logs

**File:** `/src/owner-oversight.html`

---

## 🗄️ Database Changes

### New Tables:

#### 1. `user_invitations`
```sql
CREATE TABLE user_invitations (
    id TEXT PRIMARY KEY,
    email TEXT NOT NULL,
    role TEXT NOT NULL,
    token TEXT UNIQUE NOT NULL,
    invited_by TEXT NOT NULL,
    expires_at TEXT NOT NULL,
    accepted INTEGER DEFAULT 0,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
```

#### 2. `device_contacts`
```sql
CREATE TABLE device_contacts (
    id TEXT PRIMARY KEY,
    email TEXT NOT NULL,
    name TEXT,
    phone TEXT,
    imported_at TEXT DEFAULT CURRENT_TIMESTAMP
);
```

#### 3. `company_settings`
```sql
CREATE TABLE company_settings (
    id TEXT PRIMARY KEY DEFAULT 'default',
    company_name TEXT,
    company_logo TEXT,
    brand_color TEXT DEFAULT '#667eea',
    tos_accepted INTEGER DEFAULT 0,
    tos_accepted_date TEXT,
    tos_version TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);
```

---

## 🔌 New APIs (12 Added)

### App Control
1. **`quitApp()`** - Close application (used when TOS declined)

### Setup Wizard
2. **`completeSetup(data)`** - Process entire wizard setup in one call

### Device Contacts
3. **`requestContactsPermission()`** - Request access to device contacts
4. **`getDeviceContacts()`** - Retrieve contacts from device

### User Invitations
5. **`inviteUser(data)`** - Send invitation to new user
6. **`getInvitations(filters)`** - Get all invitations
7. **`acceptInvitation(token)`** - Accept invitation via link
8. **`revokeInvitation(inviteId)`** - Cancel pending invitation

### Owner Oversight
9. **`getOwnerDashboard()`** - Get complete oversight data
10. **`getUserActivity(userId)`** - Get activity log for specific user

### Company Settings
11. **`getCompanySettings()`** - Get current settings (expanded)
12. **`updateCompanySettings(data)`** - Update logo, colors, branding

---

## 🚦 Application Flow (Updated)

### First-Time Launch:
```
1. Splash Screen (2 seconds)
2. Terms of Service (MUST ACCEPT)
3. Setup Wizard (5 steps)
4. Login Screen
5. Dashboard
```

### Returning User:
```
1. Splash Screen (2 seconds)
2. Login Screen (TOS already accepted)
3. Dashboard
```

### TOS Not Accepted:
```
1. Splash Screen
2. Terms of Service
3. [User declines] → App closes
```

---

## 📋 Legal Compliance Features

### Anti-Spam Protection:
- TOS explicitly prohibits spam
- Requires opt-in from all contacts
- Must include unsubscribe mechanism
- CAN-SPAM Act compliance required
- GDPR / CASL compliance required
- Violations = Immediate license termination

### Intellectual Property Protection:
- Cannot redistribute software
- Cannot remove FICOS branding
- Cannot resell or sublicense
- Cannot charge fees for access
- Cannot reverse engineer
- Cannot create competing products
- Source code is proprietary

### Liability Protection:
- Software provided "AS IS"
- No warranties of any kind
- FICOS not liable for damages
- User assumes all responsibility
- Indemnification clause included
- Maximum liability = $0 (free software)

---

## 🎨 Branding System

### What Users CAN Customize:
- ✅ Company logo
- ✅ Primary brand color
- ✅ Company name
- ✅ Email signatures
- ✅ Form styling

### What Users CANNOT Remove:
- ❌ FICOS logo/name
- ❌ "Licensed to FICOS" text
- ❌ "FICOS '26" badge
- ❌ License version number
- ❌ Copyright notices

### Implementation:
```javascript
// User branding appears IN ADDITION to FICOS branding
// Example: Email footer shows BOTH logos
<div class="email-footer">
    <img src="user-logo.png" />
    <p>Powered by FICOS Campaign Manager</p>
    <p>Licensed to FICOS '26</p>
</div>
```

---

## 👥 User Roles & Permissions

### OWNER (Full Access):
- ✅ Create/edit/delete campaigns
- ✅ Manage all contacts
- ✅ Configure SMTP settings
- ✅ Invite/manage users
- ✅ View ALL user activity
- ✅ Access oversight dashboard
- ✅ Change company settings
- ✅ Export all data

### ADMIN (Management):
- ✅ Create/edit/delete campaigns
- ✅ Manage contacts
- ✅ Invite users (with approval)
- ✅ View own activity
- ❌ Cannot access oversight dashboard
- ❌ Cannot change core settings

### USER (Basic):
- ✅ Create/edit own campaigns
- ✅ View shared contacts
- ✅ Send campaigns
- ❌ Cannot manage users
- ❌ Cannot change settings
- ❌ Cannot view others' activity

---

## 🔒 Security Enhancements

### Invitation Tokens:
- 64-character random hex strings
- Expire after 7 days
- Single-use only
- Cryptographically secure

### Activity Logging:
- Every action timestamped
- IP addresses recorded
- User agent captured
- Cannot be deleted by users
- Only owners can view full logs

### Session Management:
- Sessions stored securely
- Auto-logout after inactivity
- Cannot spoof other users
- Role verified on every request

---

## 📖 Documentation Updates

### For End Users:
- **SIMPLE_GUIDE.md** - Step-by-step usage (updated)
- **TOS Document** - Built into app (new)
- **Setup Wizard** - Interactive guide (new)

### For Developers:
- **README.md** - Technical overview (updated)
- **API_REFERENCE.md** - All 75 APIs documented (updated)
- **PHASE3_COMPLETE.md** - Feature breakdown
- **THIS FILE** - Version 3.1 changes

---

## 🐛 Bug Fixes

1. Fixed database initialization race condition
2. Improved error handling in setup flow
3. Added validation for email formats
4. Fixed CSV import edge cases
5. Improved session persistence

---

## 🚀 Deployment Notes

### Updated Files:
```
/src/terms-of-service.html     (NEW)
/src/setup-wizard.html          (NEW)
/src/owner-oversight.html       (NEW)
/src/setup.html                 (OLD - can be removed)
main.js                         (UPDATED - +300 lines)
preload.js                      (UPDATED - +15 methods)
```

### Database Migration:
```javascript
// Automatic on app startup
// Creates 3 new tables if not exist:
// - user_invitations
// - device_contacts  
// - company_settings
```

### Build Command:
```bash
npm install
npm run build:win   # Windows
npm run build:mac   # macOS
npm run build:linux # Linux
```

### File Size:
- Previous: 39 KB compressed
- Current: ~55 KB compressed
- Reason: New HTML files + TOS document

---

## ✅ Testing Checklist

- [x] TOS acceptance flow works
- [x] TOS decline closes app
- [x] Setup wizard completes successfully
- [x] Branding uploads and displays
- [x] SMTP presets populate correctly
- [x] CSV import works in wizard
- [x] User invitations generate tokens
- [x] Invitation links work
- [x] Expired invitations are rejected
- [x] Owner oversight shows all users
- [x] Activity logs populate correctly
- [x] Only owners can access oversight
- [x] Non-owners redirected from oversight
- [x] Company settings save properly
- [x] Database migrations run smoothly

---

## 📞 Support Information

### For Issues:
1. Check database permissions
2. Verify Node.js version (18+)
3. Check Electron logs
4. Review audit logs (Owner Oversight)

### For Questions:
- Email: support@ficos.com
- Docs: See SIMPLE_GUIDE.md
- API Ref: See API_REFERENCE.md

---

## 🎯 Summary

Version 3.1 makes FICOS Campaign Manager:

1. **Legally Protected** ✅
   - Comprehensive TOS
   - IP protection
   - Anti-spam policies
   - Liability coverage

2. **User-Friendly** ✅
   - Interactive setup wizard
   - Branding tutorial
   - SMTP presets
   - Contact import options

3. **Transparent** ✅
   - Owner oversight dashboard
   - Complete activity tracking
   - User management
   - Invitation system

4. **Compliant** ✅
   - CAN-SPAM requirements
   - GDPR considerations
   - Data privacy
   - User consent

**Result:** A professional, legally sound, user-friendly email marketing platform that protects FICOS while empowering users.

---

**FICOS Campaign Manager V3.1**  
*Enterprise Email Marketing Made Simple & Legal*

© 2025 FICOS | All Rights Reserved | Licensed Software

---

## 📦 Download Updated Version

All changes are included in the complete package. Extract and build:

```bash
tar -xzf ficos-app-v3.1-complete.tar.gz
cd ficos-app
npm install
npm run build:win
```

**That's it!** Share the .exe with users and they'll go through the proper TOS → Setup → Login flow automatically.

🎉 **Version 3.1 is COMPLETE and READY FOR DISTRIBUTION!**
