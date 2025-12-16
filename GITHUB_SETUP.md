# 📦 GitHub Repository Setup Guide

Step-by-step instructions to push this project to GitHub.

## Prerequisites

- ✅ Git installed on your system
- ✅ GitHub account created
- ✅ Project directory is `mcp-chat-app-3` (or similar)

## Step 1: Initialize Git Repository

**Open terminal in your project directory:**

```bash
cd /path/to/mcp-chat-app-3

# Initialize git
git init

# Check git status
git status
```

You should see all your files listed as "Untracked files".

---

## Step 2: Create .env.local (If Not Already Done)

**IMPORTANT:** Never commit your API keys!

```bash
# Copy example env file
cp .env.example .env.local

# Add your actual API key
# Edit .env.local and replace sk-ant-your-key-here with your real key
```

**Verify .env.local is in .gitignore:**

```bash
grep "env.local" .gitignore
```

You should see: `.env*.local`

---

## Step 3: Stage Your Files

```bash
# Add all files to git
git add .

# Check what will be committed
git status
```

**Expected output:**
```
Changes to be committed:
  new file:   .env.example
  new file:   .gitignore
  new file:   Dockerfile
  new file:   docker-compose.yml
  new file:   next.config.js
  new file:   package.json
  ... (many more files)
```

**IMPORTANT:** Make sure `.env.local` is NOT in the list!

---

## Step 4: Create Initial Commit

```bash
# Create first commit
git commit -m "Initial commit: MCP Chat App with Claude AI, FastAPI, and Next.js"
```

---

## Step 5: Create GitHub Repository

**Option A: Using GitHub Website**

1. Go to https://github.com
2. Click the **"+"** icon → **"New repository"**
3. Fill in details:
   - **Repository name:** `mcp-chat-app` (or your preferred name)
   - **Description:** "AI-powered product assistant using Claude API, MCP, FastAPI, and Next.js"
   - **Visibility:** 
     - ✅ **Public** (if you want to share)
     - ✅ **Private** (if keeping it private)
   - **DO NOT** initialize with README, .gitignore, or license
4. Click **"Create repository"**

**Option B: Using GitHub CLI**

```bash
# Install GitHub CLI first: https://cli.github.com/
gh auth login
gh repo create mcp-chat-app --public --source=. --remote=origin
```

---

## Step 6: Connect Local Repository to GitHub

**Copy the commands from GitHub** (you'll see them after creating the repo):

```bash
# Add remote repository
git remote add origin https://github.com/YOUR-USERNAME/mcp-chat-app.git

# Verify remote was added
git remote -v
```

**Expected output:**
```
origin  https://github.com/YOUR-USERNAME/mcp-chat-app.git (fetch)
origin  https://github.com/YOUR-USERNAME/mcp-chat-app.git (push)
```

---

## Step 7: Push to GitHub

```bash
# Rename branch to main (if needed)
git branch -M main

# Push your code
git push -u origin main
```

**Enter your GitHub credentials if prompted.**

---

## Step 8: Verify Upload

1. Go to https://github.com/YOUR-USERNAME/mcp-chat-app
2. You should see all your files!
3. **Verify `.env.local` is NOT there** (security check!)

---

## Step 9: Add Repository Description & Topics

On GitHub repository page:

1. Click **"Add topics"**
2. Add topics: `claude-ai`, `mcp`, `fastapi`, `nextjs`, `chatbot`, `docker`
3. Click **"About"** → **"Edit"**
4. Add description and website (if you deploy it)

---

## Step 10: Create GitHub README

The repository should automatically show `PROJECT_README.md`. Let's rename it:

```bash
# Rename to standard README name
mv PROJECT_README.md README.md

# Commit the change
git add README.md
git commit -m "Add comprehensive README"
git push
```

---

## 🎉 Done!

Your project is now on GitHub! 

### Next Steps

**Add a Repository Banner:**

Create a nice banner image and add to README:
```markdown
![Project Banner](https://your-image-url.com/banner.png)
```

**Set Up GitHub Actions (CI/CD):**

Add `.github/workflows/docker.yml` for automatic Docker builds.

**Enable GitHub Pages:**

If you want to host documentation.

**Add License:**

```bash
# Add MIT license
cat > LICENSE << 'EOF'
MIT License

Copyright (c) 2024 Your Name

[Full MIT license text...]
EOF

git add LICENSE
git commit -m "Add MIT license"
git push
```

---

## 📝 Common Git Commands

```bash
# Check status
git status

# View commit history
git log --oneline

# Create a new branch
git checkout -b feature/new-feature

# Switch branches
git checkout main

# Pull latest changes
git pull origin main

# View changes
git diff

# Undo changes (careful!)
git checkout -- filename.txt
```

---

## 🔒 Security Checklist

Before pushing, verify:

- ✅ `.env.local` is in `.gitignore`
- ✅ No API keys in code
- ✅ No sensitive data in commits
- ✅ MongoDB credentials not hardcoded

**Check for accidentally committed secrets:**

```bash
# Search for potential secrets
git log -p | grep -i "api_key\|password\|secret"
```

---

## 📦 Cloning Your Repo (For Team Members)

To set up the project from GitHub:

```bash
# Clone repository
git clone https://github.com/YOUR-USERNAME/mcp-chat-app.git
cd mcp-chat-app

# Create .env.local
cp .env.example .env.local
# Add your ANTHROPIC_API_KEY

# Start with Docker
docker-compose up -d

# Or manual setup
npm install
cd backend && pip install -r requirements.txt
```

---

## 🚀 Advanced: GitHub Actions

Create `.github/workflows/docker.yml`:

```yaml
name: Docker Build

on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v3
    - name: Build Docker images
      run: docker-compose build
```

---

## 📊 Repository Stats

After pushing, GitHub automatically shows:

- **Languages used** (TypeScript, Python, etc.)
- **Code frequency**
- **Commit activity**
- **Contributors**

---

## 🤝 Collaboration

**Invite team members:**

1. Go to **Settings** → **Collaborators**
2. Click **"Add people"**
3. Enter GitHub username

**Protect main branch:**

1. Go to **Settings** → **Branches**
2. Add rule for `main`
3. Enable "Require pull request reviews"

---

## 📞 Need Help?

- GitHub Docs: https://docs.github.com
- Git Docs: https://git-scm.com/doc
- Common issues: Check `.gitignore` first!

---

**Your code is now version-controlled and backed up! 🎊**
