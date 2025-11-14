# 🎯 GitHub Actions Setup Guide - Get Your .exe Built Automatically!

## 📋 What You'll Get

After following this guide:
- ✅ Your code hosted on GitHub
- ✅ Automatic .exe building on every code change
- ✅ Professional distribution method
- ✅ Windows, Mac, and Linux builds
- ✅ No compilation issues on your machine

**Time needed:** 10 minutes

---

## 🚀 Step-by-Step Instructions

### **Step 1: Create GitHub Account (if you don't have one)**

1. Go to: **https://github.com/signup**
2. Enter your email and create password
3. Verify your email
4. Choose Free plan

---

### **Step 2: Create New Repository**

1. Go to: **https://github.com/new**
2. Fill in:
   - **Repository name:** `ficos-campaign-manager`
   - **Description:** `FICOS Campaign Manager - Enterprise Email Marketing`
   - **Private/Public:** Choose **Private** (recommended for proprietary code)
   - **Initialize:** Leave unchecked (we have files already)
3. Click **Create repository**

---

### **Step 3: Install Git on Your Computer**

#### If you don't have Git:
1. Download: **https://git-scm.com/download/win**
2. Run installer (default options are fine)
3. Restart computer

#### Verify Git is installed:
```powershell
git --version
```
Should show: `git version 2.x.x`

---

### **Step 4: Upload Your Code to GitHub**

Open PowerShell and run these commands:

```powershell
# Navigate to your project
cd C:\Users\nicho\Documents\ficos-app

# Initialize Git repository
git init

# Add all files
git add .

# Commit files
git commit -m "Initial commit - FICOS Campaign Manager v3.1"

# Connect to your GitHub repository
# Replace YOUR-USERNAME with your actual GitHub username
git remote add origin https://github.com/CodeWorx/ficos-campaign-manager.git

# Push to GitHub
git branch -M main
git push -u origin main
```

**When prompted for credentials:**
- Username: Your GitHub username
- Password: Use a **Personal Access Token** (not your GitHub password)

#### To create a Personal Access Token:
1. Go to: **https://github.com/settings/tokens**
2. Click **Generate new token** → **Classic**
3. Give it a name: `FICOS App Upload`
4. Select scopes: ✅ **repo** (full control)
5. Click **Generate token**
6. **Copy the token** (you won't see it again!)
7. Use this token as your password when pushing

---

### **Step 5: GitHub Builds Your .exe Automatically!**

Once you push the code:

1. Go to your repository: `https://github.com/CodeWorx/ficos-campaign-manager`
2. Click the **Actions** tab
3. You'll see a workflow running: "Build FICOS Campaign Manager"
4. Wait ~10-15 minutes for it to complete
5. When done, you'll see green checkmarks ✅

---

### **Step 6: Download Your .exe**

#### Option A: From Actions (for any commit)
1. Go to **Actions** tab
2. Click on the latest successful build
3. Scroll down to **Artifacts**
4. Download **FICOS-Campaign-Manager-Windows**
5. Extract the ZIP - your `.exe` is inside!

#### Option B: From Releases (for tagged versions)
1. In your repository, click **Releases** (right sidebar)
2. Click **Create a new release**
3. Tag version: `v3.1.0`
4. Release title: `FICOS Campaign Manager v3.1`
5. Click **Publish release**
6. Wait for builds to attach automatically
7. Download the `.exe` from the release!

---

## 📦 What Gets Built

Every time you push code, GitHub automatically builds:

| Platform | File | Size |
|----------|------|------|
| **Windows** | `FICOS Campaign Manager Setup.exe` | ~150 MB |
| **macOS** | `FICOS Campaign Manager.dmg` | ~150 MB |
| **Linux** | `FICOS-Campaign-Manager.AppImage` | ~150 MB |
| **Linux** | `ficos-campaign-manager.deb` | ~150 MB |

All platforms build in parallel, taking about 10-15 minutes total.

---

## 🔄 Making Changes & Rebuilding

When you want to update the app:

```powershell
cd C:\Users\nicho\Documents\ficos-app

# Make your changes to the code

# Save and commit
git add .
git commit -m "Updated feature X"
git push

# GitHub automatically rebuilds everything!
```

Then download the new .exe from Actions or Releases.

---

## 💡 Pro Tips

### Keep Your Code Private
- Use a **Private repository** to protect your IP
- Only people you invite can see the code
- Builds still work on private repos

### Automatic Versioning
Create tags for releases:
```powershell
git tag v3.1.1
git push origin v3.1.1
```
This triggers a release build automatically!

### Share the .exe
Two ways:
1. **Artifacts:** Download and share the file directly
2. **Releases:** Share the GitHub release URL (public releases only)

### Multiple Branches
- `main` branch = production builds
- `dev` branch = development builds
- Workflow builds both automatically

---

## 📋 Files I Created for You

These are already in your project:

1. **`.github/workflows/build.yml`**
   - GitHub Actions workflow
   - Builds Windows, Mac, Linux
   - Uploads artifacts automatically

2. **`.gitignore`**
   - Tells Git which files to ignore
   - Excludes node_modules, builds, etc.

3. **`README-GITHUB.md`**
   - Professional README for your repository
   - Rename to `README.md` before pushing

---

## 🎯 Quick Command Summary

```powershell
# First time setup
cd C:\Users\nicho\Documents\ficos-app
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/CodeWorx/ficos-campaign-manager.git
git branch -M main
git push -u origin main

# Future updates
git add .
git commit -m "Your change description"
git push

# Create release
git tag v3.1.1
git push origin v3.1.1
```

---

## ⚠️ Troubleshooting

### "git is not recognized"
**Fix:** Install Git from https://git-scm.com/download/win

### "Permission denied"
**Fix:** Use a Personal Access Token instead of password

### "Workflow failed"
**Fix:** Check the Actions tab for error details. Usually `npm install --legacy-peer-deps` fixes it.

### "Can't find my .exe"
**Fix:** 
1. Go to Actions tab
2. Click latest successful build
3. Scroll to Artifacts section
4. Download the Windows artifact

---

## 🎉 That's It!

Now you have:
- ✅ Professional Git workflow
- ✅ Automatic builds on every change
- ✅ No more compilation issues
- ✅ All platforms supported
- ✅ Easy distribution

**Next Steps:**
1. Follow the steps above to push your code
2. Wait for GitHub to build your .exe
3. Download and share!

---

## 📞 Need Help?

If you get stuck:
1. Check the Actions tab for build logs
2. Look for error messages in red
3. Share the error and I'll help debug

The most common issue is the Personal Access Token - make sure you:
1. Created one at https://github.com/settings/tokens
2. Gave it `repo` permissions
3. Used it as your password when pushing

---

**Ready to start? Just follow Step 1 above!** 🚀

---

## 📚 Additional Resources

- GitHub Actions Docs: https://docs.github.com/actions
- Git Tutorial: https://git-scm.com/book/en/v2
- Creating Tokens: https://docs.github.com/authentication/keeping-your-account-and-data-secure/creating-a-personal-access-token

---

**FICOS Campaign Manager v3.1**  
© 2025 FICOS | Licensed Software
