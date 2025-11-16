# GitHub Setup Guide

This guide will help you push your project to GitHub and maintain it with proper version control.

## 📋 Prerequisites

1. GitHub account (create at [github.com](https://github.com))
2. Git installed on your computer
3. Your project code ready

## 🚀 Initial Setup (First Time)

### Step 1: Check if Git is Initialized

```bash
# Check if .git folder exists
ls -la .git

# If not, initialize git
git init
```

### Step 2: Create GitHub Repository

1. Go to [github.com](https://github.com) and login
2. Click the **"+"** icon → **"New repository"**
3. Fill in:
   - **Repository name**: `frag-and-book` (or your preferred name)
   - **Description**: "Esports Tournament Management Platform"
   - **Visibility**: 
     - ✅ Public (anyone can see)
     - ✅ Private (only you can see) - Recommended for now
   - ❌ **DO NOT** check "Initialize with README" (we already have one)
4. Click **"Create repository"**

### Step 3: Add Remote and Push

After creating the repository, GitHub will show you commands. Use these:

```bash
# Add all files to staging
git add .

# Create initial commit
git commit -m "Initial commit: Esports tournament platform"

# Add GitHub as remote (replace YOUR_USERNAME with your GitHub username)
git remote add origin https://github.com/YOUR_USERNAME/frag-and-book.git

# Rename branch to main (if needed)
git branch -M main

# Push to GitHub
git push -u origin main
```

If prompted for credentials:
- **Username**: Your GitHub username
- **Password**: Use a Personal Access Token (not your GitHub password)
  - Create token: GitHub → Settings → Developer settings → Personal access tokens → Tokens (classic) → Generate new token
  - Select scopes: `repo` (full control)
  - Copy token and use it as password

## ✅ Verify Setup

1. Go to your GitHub repository page
2. You should see all your files uploaded
3. Check that `node_modules` and `.env` are NOT visible (they're in .gitignore)

## 📝 Daily Workflow (Making Updates)

### Standard Update Process:

```bash
# 1. Check current status
git status

# 2. Add changed files
git add .

# Or add specific files
git add src/components/NewComponent.tsx

# 3. Commit with descriptive message
git commit -m "Add tournament bracket visualization feature"

# 4. Push to GitHub
git push origin main
```

### Best Practices for Commit Messages:

✅ **Good commit messages:**
- `"Fix bracket generation for 8-team tournaments"`
- `"Add team logo display in brackets"`
- `"Update match status to pending when editing"`
- `"Remove seed numbers from bracket display"`

❌ **Bad commit messages:**
- `"Fixed stuff"`
- `"Updates"`
- `"Changes"`

### Recommended Commit Message Format:

```
Type: Brief description

Optional detailed explanation if needed

Examples:
- feat: Add tournament registration system
- fix: Resolve bracket generation bug for 8 teams
- style: Update bracket UI spacing
- docs: Add deployment guide
- refactor: Clean up team management hooks
```

## 🌿 Working with Branches

### Create a Feature Branch:

```bash
# Create and switch to new branch
git checkout -b feature/tournament-scheduling

# Make changes, then commit
git add .
git commit -m "Add tournament scheduling feature"

# Push branch to GitHub
git push -u origin feature/tournament-scheduling
```

### Switch Between Branches:

```bash
# List all branches
git branch

# Switch to main branch
git checkout main

# Switch back to feature branch
git checkout feature/tournament-scheduling
```

### Merge Feature Branch:

```bash
# Switch to main branch
git checkout main

# Pull latest changes
git pull origin main

# Merge feature branch
git merge feature/tournament-scheduling

# Push merged changes
git push origin main
```

## 🔄 Syncing with GitHub

### Pull Latest Changes:

```bash
# Fetch and merge remote changes
git pull origin main

# Or fetch first, then merge
git fetch origin
git merge origin/main
```

### If You Have Local Changes:

```bash
# Stash changes temporarily
git stash

# Pull latest
git pull origin main

# Apply stashed changes back
git stash pop
```

## 🛡️ Important Files to NOT Commit

The `.gitignore` file already handles this, but make sure these are NEVER committed:

- ❌ `.env` files (contain secrets)
- ❌ `node_modules/` (too large)
- ❌ `dist/` (build output)
- ❌ Personal API keys
- ❌ Database passwords

**Always check before committing:**
```bash
git status
```

## 📊 Viewing Project History

```bash
# View commit history
git log

# View with file changes
git log --stat

# View specific file history
git log -- src/pages/tournaments/Brackets.tsx
```

## 🔍 Troubleshooting

### Issue: "remote origin already exists"
```bash
# Remove existing remote
git remote remove origin

# Add correct remote
git remote add origin https://github.com/YOUR_USERNAME/frag-and-book.git
```

### Issue: "Please tell me who you are"
```bash
git config --global user.name "Your Name"
git config --global user.email "your.email@example.com"
```

### Issue: Authentication failed
- Use Personal Access Token instead of password
- Or use SSH keys (more secure for long-term)

### Issue: Files are too large
```bash
# Check file sizes
git ls-files | xargs du -h | sort -h

# Remove large files from history (use Git LFS if needed)
```

### Issue: Accidentally committed .env
```bash
# Remove from git but keep file
git rm --cached .env

# Commit the removal
git commit -m "Remove .env from version control"

# Add to .gitignore (already done)
# Push changes
git push origin main
```

## 🎯 Quick Reference Commands

```bash
# Check status
git status

# Add files
git add .

# Commit
git commit -m "Your message"

# Push
git push origin main

# Pull latest
git pull origin main

# View history
git log --oneline

# Create branch
git checkout -b feature/name

# Switch branch
git checkout main

# Merge branch
git merge feature/name

# Discard changes
git checkout -- filename

# Undo last commit (keep changes)
git reset --soft HEAD~1
```

## 📚 Resources

- [Git Documentation](https://git-scm.com/doc)
- [GitHub Guides](https://guides.github.com)
- [Git Cheat Sheet](https://education.github.com/git-cheat-sheet-education.pdf)

## ✅ Next Steps

After setting up GitHub:

1. ✅ Push your initial code
2. ✅ Add collaborators (if needed)
3. ✅ Set up branch protection rules (Settings → Branches)
4. ✅ Enable GitHub Actions (if needed for CI/CD)
5. ✅ Connect to deployment platform (Vercel/Hostinger)

---

**Remember**: Commit often, push regularly, write clear commit messages! 🚀

