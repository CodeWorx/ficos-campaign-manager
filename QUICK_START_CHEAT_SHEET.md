# 🚀 QUICK START CHEAT SHEET

## ⏱️ Get Your .exe in 20 Minutes

### 1️⃣ CREATE GITHUB ACCOUNT (2 min)
```
https://github.com/signup
```
Sign up → Verify email → Done!

---

### 2️⃣ CREATE REPOSITORY (1 min)
```
https://github.com/new
```
- Name: `ficos-campaign-manager`
- Private ✅
- Create repository

---

### 3️⃣ INSTALL GIT (3 min)
```
https://git-scm.com/download/win
```
Download → Install → Restart

---

### 4️⃣ GET PERSONAL ACCESS TOKEN (2 min)
```
https://github.com/settings/tokens
```
Generate new token → Check `repo` → Generate → **COPY TOKEN**

---

### 5️⃣ PUSH YOUR CODE (5 min)
```powershell
cd C:\Users\nicho\Documents\ficos-app

git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/CodeWorx/ficos-campaign-manager.git
git branch -M main
git push -u origin main
```
**Username:** Your GitHub username  
**Password:** Use the token you copied!

---

### 6️⃣ WAIT FOR BUILD (15 min)
```
https://github.com/CodeWorx/ficos-campaign-manager/actions
```
Watch the build progress → Wait for green checkmark ✅

---

### 7️⃣ DOWNLOAD .EXE (2 min)
Click completed build → Scroll to Artifacts → Download Windows → Extract ZIP → Done!

---

## 🎯 Commands Quick Copy

```powershell
# Navigate
cd C:\Users\nicho\Documents\ficos-app

# Initialize and push
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/CodeWorx/ficos-campaign-manager.git
git branch -M main
git push -u origin main
```

---

## 🔄 Update Your App Later

```powershell
cd C:\Users\nicho\Documents\ficos-app

# Make changes to code...

git add .
git commit -m "Your change description"
git push

# GitHub rebuilds automatically!
```

---

## 📦 Downloads

1. **App Package:** [ficos-app-v3.1-github-ready.tar.gz](computer:///mnt/user-data/outputs/ficos-app-v3.1-github-ready.tar.gz)
2. **Full Guide:** [GITHUB_SETUP_GUIDE.md](computer:///mnt/user-data/outputs/GITHUB_SETUP_GUIDE.md)
3. **This Page:** [GITHUB_ACTIONS_READY.md](computer:///mnt/user-data/outputs/GITHUB_ACTIONS_READY.md)

---

## ⚠️ Troubleshooting

**"git is not recognized"**
→ Install Git from git-scm.com

**"Authentication failed"**
→ Use Personal Access Token (not password)

**"Workflow failed"**
→ Check Actions tab for errors

**"Can't find .exe"**
→ Actions tab → Click build → Artifacts section

---

## 💡 Tips

✅ Use **Private repository** (code stays secret)  
✅ Create **releases** for version tags  
✅ **Bookmark** your Actions page  
✅ Download from **Artifacts** (not source code)

---

**Total Time: ~20 minutes**  
**Difficulty: Easy** (just copy/paste commands)

**FICOS Campaign Manager v3.1**  
Ready for GitHub Actions! 🚀
