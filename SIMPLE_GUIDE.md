# FICOS Campaign Manager - Simple Setup Guide

## For Complete Beginners 👶

This guide explains how to build and use FICOS Campaign Manager in the simplest possible terms.

---

## 🎯 What Is This?

A program that lets you:
1. Create HTML forms
2. Send those forms to many people via email
3. Collect their responses automatically
4. View all responses in one place

**No web hosting needed. No subscriptions. Just install and use.**

---

## 📥 STEP 1: Download & Install

### If someone already built the .exe file for you:

**Windows Users:**
1. Download `FICOS-Campaign-Manager-Setup.exe`
2. Double-click it
3. Click "Install"
4. Done! Look for "FICOS Campaign Manager" on your desktop

**That's it! Skip to STEP 3 below.**

---

## 🛠️ STEP 2: Build It Yourself (If you need to)

### What You Need:
- A computer (Windows, Mac, or Linux)
- Internet connection
- 30 minutes

### A. Install Node.js

1. Go to https://nodejs.org
2. Download the version labeled "LTS" (left button)
3. Run the installer
4. Click "Next" until it's done
5. Restart your computer

### B. Download This Project

1. Download the `ficos-app` folder
2. Put it somewhere easy to find (like Desktop or Documents)

### C. Build the App

**Windows:**
1. Find the `ficos-app` folder you downloaded
2. Hold SHIFT and right-click inside the folder
3. Click "Open PowerShell window here" or "Open Command Prompt here"
4. Type: `npm install` and press ENTER (wait 2-5 minutes)
5. Type: `npm run build:win` and press ENTER (wait 2-5 minutes)
6. Done! Look in the `dist` folder for your .exe file

**Mac:**
1. Open Terminal (search "Terminal" in Spotlight)
2. Type: `cd ` (with a space after cd)
3. Drag the `ficos-app` folder into Terminal, then press ENTER
4. Type: `npm install` and press ENTER (wait 2-5 minutes)
5. Type: `npm run build:mac` and press ENTER (wait 2-5 minutes)
6. Done! Look in the `dist` folder for your .app file

**Linux:**
1. Open Terminal
2. Navigate to the `ficos-app` folder
3. Type: `npm install` and press ENTER
4. Type: `npm run build:linux` and press ENTER
5. Done! Look in the `dist` folder for your .AppImage file

---

## ▶️ STEP 3: First Time Opening the App

### What You'll See:

1. **Splash Screen** - Purple screen with "FICOS" - this means it's loading
2. **Setup Wizard** - A form asking for:
   - **Company Name**: Your business name (e.g., "FICOS Inc")
   - **Your Full Name**: Your name
   - **Email**: Your work email
   - **Password**: Create a password (remember this!)
   - **Confirm Password**: Type the same password again

3. Click "Create Owner Account"
4. You're now logged in!

**Important:** The first person to set up the app becomes the OWNER (boss). They have full control.

---

## 🎨 STEP 4: Using the App

### Left Sidebar - Your Menu:

- **📊 Dashboard** - Overview of everything
- **📧 Campaigns** - Your email campaigns
- **👥 Contacts** - People you'll email
- **📝 Responses** - Form submissions you received
- **⚙️ Email Settings** - How to send emails
- **🔐 Users** - Add team members (OWNER only)

---

## 📧 STEP 5: Set Up Email (Important!)

Before you can send campaigns, tell the app how to send emails:

1. Click **⚙️ Email Settings** in sidebar
2. Click **"+ Add Email Config"**
3. Enter your email info:

### If you use Gmail:
- **Name**: Gmail
- **SMTP Host**: smtp.gmail.com
- **SMTP Port**: 587
- **Username**: your-email@gmail.com
- **Password**: [App Password - see below]
- **From Email**: your-email@gmail.com
- **From Name**: Your Name

**Gmail App Password:**
1. Go to myaccount.google.com
2. Click "Security"
3. Turn on "2-Step Verification"
4. Go back to Security → "App passwords"
5. Generate password for "Mail"
6. Copy that 16-character code
7. Use THAT as your password (not your regular Gmail password)

### If you use Outlook:
- **SMTP Host**: smtp-mail.outlook.com
- **SMTP Port**: 587
- **Username**: your-email@outlook.com
- **Password**: Your Outlook password
- **From Email**: your-email@outlook.com
- **From Name**: Your Name

---

## 📝 STEP 6: Add Contacts

1. Click **👥 Contacts** in sidebar
2. Click **"+ Add Contact"**
3. Enter:
   - Email (required)
   - First Name
   - Last Name
   - Company

Repeat for each person you want to email.

---

## 🚀 STEP 7: Create Your First Campaign

1. Click **📧 Campaigns** in sidebar
2. Click **"+ New Campaign"**
3. Enter:
   - **Campaign Name**: e.g., "Customer Feedback Survey"
   - **Description**: Brief description

4. **The Form Builder:**
   - **Left side**: Type your HTML form code
   - **Right side**: See live preview
   - It starts with a sample form - you can edit it

5. Click **"Create Campaign"**

---

## 📤 STEP 8: Send Your Campaign

1. Go to **Campaigns**
2. Find your campaign
3. Click **"Send"** (coming soon in full version)
4. Select contacts to send to
5. Click **"Send Emails"**

Each person gets a unique link to fill out your form.

---

## 📊 STEP 9: View Responses

1. Click **📝 Responses** in sidebar
2. See all form submissions
3. Click "View" to see details

---

## 👥 STEP 10: Add Team Members (OWNER only)

1. Click **🔐 Users** in sidebar
2. Click **"+ Add User"**
3. Enter their info:
   - Name
   - Email
   - Password (they can change it later)
   - Role:
     - **ADMIN**: Can create campaigns
     - **USER**: Can only view assigned campaigns

---

## 💾 Backing Up Your Data

All your data is in ONE file located at:

**Windows:**
```
C:\Users\[Your Name]\AppData\Roaming\ficos-campaign-manager\ficos.db
```

**Mac:**
```
/Users/[Your Name]/Library/Application Support/ficos-campaign-manager/ficos.db
```

**How to Backup:**
1. Close the FICOS app
2. Find that file
3. Copy it to a USB drive or cloud storage
4. Done!

**How to Restore:**
1. Close the FICOS app
2. Replace the file with your backup copy
3. Open the app
4. All your data is back!

---

## ❓ Common Questions

### Q: Do I need internet?
A: Only when sending emails. You can create campaigns and contacts offline.

### Q: Is my data private?
A: Yes! Everything is stored locally on your computer. Nothing goes to the cloud unless you send emails.

### Q: Can multiple people use it at once?
A: Not at the same time. Install the app on each person's computer separately.

### Q: How many contacts can I have?
A: Unlimited! SQLite can handle millions of records.

### Q: Can I use this for free forever?
A: Yes! No subscriptions. Pay once (or build it yourself for free).

### Q: What if I forget my password?
A: You'll need to delete the database file and start over, OR edit the database manually if you know SQL.

---

## 🆘 Troubleshooting

### Problem: App won't open
**Solution:** Right-click → "Run as Administrator"

### Problem: Can't send emails
**Solution:** 
1. Check your SMTP settings
2. Make sure you're using an App Password (not regular password for Gmail)
3. Check your internet connection

### Problem: "Setup Wizard" shows every time
**Solution:** The database file is being deleted. Make sure the app has permission to write files.

### Problem: I messed up and want to start over
**Solution:** 
1. Close the app
2. Delete the `ficos.db` file
3. Open the app
4. Setup wizard will appear again

---

## 🎉 You're Done!

You now have a working campaign manager. No monthly fees, no limits, complete control.

**FICOS '26 - Making Email Campaigns Simple**

---

## 📞 Need Help?

Check the main README.md file for technical details or contact FICOS support.
