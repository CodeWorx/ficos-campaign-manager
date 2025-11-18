# Release & Build Guide

This guide explains how to build and release FICOS Campaign Manager with automatic updates.

## 🚀 Quick Release Process

### 1. Update Version

```bash
# Bump version (patch: 3.1.0 -> 3.1.1)
npm version patch

# Or for minor version (3.1.0 -> 3.2.0)
npm version minor

# Or for major version (3.1.0 -> 4.0.0)
npm version major
```

This automatically:
- Updates `package.json` version
- Creates a git commit
- Creates a git tag (e.g., `v3.1.1`)

### 2. Push to GitHub

```bash
# Push the commit and tag
git push && git push --tags
```

### 3. Automatic Build & Release

GitHub Actions will automatically:
1. ✅ Build Windows executable
2. ✅ Upload `latest.yml` (for auto-updates)
3. ✅ Create GitHub Release with files
4. ✅ Generate release notes

**The auto-update system will now detect this release!**

---

## 📦 What Gets Built

When you push to `main` or create a tag:

| File | Purpose |
|------|---------|
| `FICOS-Campaign-Manager-Setup-3.1.0.exe` | Windows installer |
| `latest.yml` | Update manifest (tells app about new version) |

These are uploaded to:
- **Artifacts** (30-day retention) for regular pushes
- **GitHub Releases** (permanent) for tagged versions

---

## 🔄 How Auto-Updates Work

### User Experience:

1. **User opens app** → App checks GitHub releases
2. **New version found** → User sees notification
3. **User clicks "Download"** → Update downloads in background
4. **User quits app** → Update installs automatically
5. **User reopens app** → New version running!

### Technical Flow:

```
App Startup
    ↓
Check GitHub: https://github.com/CodeWorx/ficos-campaign-manager/releases/latest
    ↓
Read latest.yml → Compare versions
    ↓
If newer: Send 'update-available' event to UI
    ↓
User downloads → Progress tracked
    ↓
On quit → Installer runs automatically
```

---

## 🛠️ Manual Local Build

If you want to build locally without releasing:

```bash
# Install dependencies
npm install

# Build Windows executable (outputs to dist/)
npm run build:win

# Build for other platforms
npm run build:mac    # macOS
npm run build:linux  # Linux
npm run build        # Current platform
```

Built files go to `dist/` folder.

---

## 🔐 GitHub Token Setup

The build process needs a GitHub token to publish releases:

### Option 1: GitHub Actions (Automatic)
The workflow uses `${{ secrets.GITHUB_TOKEN }}` which is automatically provided.

### Option 2: Local Builds (Manual)
For local publishing, set your personal token:

```bash
# Linux/macOS
export GH_TOKEN="ghp_your_token_here"

# Windows PowerShell
$env:GH_TOKEN="ghp_your_token_here"

# Then build with publish
npm run build:win -- --publish always
```

**How to create token:**
1. GitHub → Settings → Developer settings → Personal access tokens
2. Generate new token (classic)
3. Select scope: `repo` (full control)
4. Copy token and set as environment variable

---

## 📋 Release Checklist

Before releasing a new version:

- [ ] Test the application locally
- [ ] Update version with `npm version patch/minor/major`
- [ ] Review changes in commit
- [ ] Push to GitHub with tags: `git push && git push --tags`
- [ ] Wait for GitHub Actions to complete
- [ ] Verify release appears on GitHub
- [ ] Test auto-update from previous version

---

## 🐛 Troubleshooting

**Build fails on GitHub Actions:**
- Check Actions logs at: `https://github.com/CodeWorx/ficos-campaign-manager/actions`
- Verify `node_modules` aren't corrupted
- Try: Clear cache and rebuild

**Auto-updates not working:**
- Ensure `latest.yml` was uploaded to release
- Verify release is marked as "Latest" on GitHub
- Check app logs for update errors
- Confirm repository URL in `package.json` is correct

**"403 Forbidden" when publishing:**
- GitHub token needs `repo` permission
- Token must be set in `GH_TOKEN` environment variable

---

## 🎯 Version Strategy

Recommended versioning:

- **Patch** (3.1.0 → 3.1.1): Bug fixes, small tweaks
- **Minor** (3.1.0 → 3.2.0): New features, non-breaking changes
- **Major** (3.1.0 → 4.0.0): Breaking changes, major overhaul

---

## 📝 Workflow Details

### Triggers:
- Push to `main` or `master` branch → Build only
- Push tag like `v3.1.1` → Build + Create Release
- Manual trigger via "Actions" tab

### Jobs:
1. **build-windows**: Builds Windows installer + latest.yml
2. **create-release**: Creates GitHub release (only for tags)

### Artifacts:
- Kept for 30 days
- Available in "Actions" → Select run → "Artifacts"

---

## 🚨 Important Notes

1. **Always use tags for releases** - Auto-update system requires GitHub releases
2. **Don't delete old releases** - Users may still be on older versions
3. **Test updates locally first** - Install old version, then test update to new
4. **`latest.yml` is critical** - Without it, auto-updates won't work

---

## 📞 Support

For issues with builds or releases:
- Check GitHub Actions logs
- Review `main.js` auto-updater configuration (lines 765-831)
- Verify `package.json` publish settings (lines 24-28)
