---
title: "User Guide"
description: "Complete guide to using reDeploy for triggering deployments across your repositories"
---

# reDeploy User Guide

Welcome to reDeploy! This guide will help you get started with triggering deployments across your GitHub repositories.

## Getting Started

### 1. Connect Your GitHub Account

1. Visit the [Login page](/login)
2. Click **Connect with GitHub**
3. Authorize reDeploy to access your repositories
4. You'll be redirected to your dashboard

### 2. Add Repositories

1. From your Dashboard, click **Add Repository**
2. Search for repositories from your GitHub account
3. Select the branches you want to deploy
4. Click **Add** to save the repository

### 3. Trigger Deployments

**Single Repository:**
- Click the deploy button (lightning icon) next to any repository

**Multiple Repositories:**
- Check the boxes next to repositories you want to deploy
- Click **Deploy Selected**

**All Repositories:**
- Click **Deploy All** to trigger all active repositories

## Features

### Repository Management

- **Add/Remove**: Easily add or remove repositories from your dashboard
- **Branch Selection**: Choose specific branches for each repository
- **Active/Inactive**: Toggle repositories on/off without removing them

### Deployment Groups

Organize repositories into groups for batch deployments:

1. Go to Dashboard
2. Click **Create Group**
3. Name your group and add repositories
4. Deploy entire groups with one click

### Webhooks

Trigger deployments from external services:

1. Go to Settings > Webhooks
2. Click **Create Webhook**
3. Choose target (all repos, group, or specific repos)
4. Copy the webhook URL
5. Use in your CI/CD pipelines or automation tools

**Example webhook usage:**
```bash
curl -X POST "https://redeploy.app/api/webhook/trigger" \
  -H "X-Webhook-Token: your-token" \
  -H "X-GitHub-Token: your-github-token"
```

### Deployment History

View all past deployments:

- **Filter by status**: Success, Failed, All
- **Filter by repository**: See deployments for specific repos
- **Filter by date**: View deployments within a date range
- **Export**: Download history as CSV

## Settings

### Connected Accounts

Manage your GitHub and Google account connections:
- Connect additional accounts
- Disconnect accounts
- View connection status

### Preferences

Customize your reDeploy experience:

- **Default Branch**: Set the default branch for new repositories
- **Commit Message**: Customize the deployment trigger commit message
- **Notifications**: Enable/disable email notifications

### Danger Zone

- **Delete Account**: Permanently delete your account and all data

## How It Works

reDeploy triggers deployments by creating empty commits on your repositories:

1. You click "Deploy"
2. reDeploy creates an empty commit with message: `chore: trigger rebuild`
3. The commit is pushed to your selected branch
4. Your CI/CD platform (Netlify, Vercel, GitHub Actions, etc.) detects the change
5. Your site rebuilds and deploys

**Note:** This works with any CI/CD platform that triggers on git commits.

## FAQ

**Q: Does reDeploy modify my code?**
A: No. reDeploy only creates empty commits with no file changes. Your code remains untouched.

**Q: What permissions does reDeploy need?**
A: reDeploy requires `repo` scope to push commits to your repositories.

**Q: Can I use reDeploy with private repositories?**
A: Yes! reDeploy works with both public and private repositories.

**Q: What CI/CD platforms are supported?**
A: Any platform that triggers on git commits: Netlify, Vercel, GitHub Actions, GitLab CI, CircleCI, Travis CI, and more.

**Q: Is there a rate limit?**
A: reDeploy respects GitHub's API rate limits. You can deploy up to 5000 repositories per hour.

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `D` | Deploy selected repositories |
| `A` | Select all repositories |
| `R` | Refresh repository list |
| `/` | Focus search box |
| `Esc` | Close modal / Clear selection |

## Need Help?

- **GitHub Issues**: [Report bugs or request features](https://github.com/jasonsutter87/reDeploy/issues)
- **Email**: support@redeploy.app

---

*Last updated: December 2025*
