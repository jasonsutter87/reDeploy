# reDeploy - Project Roadmap

One-click deployment trigger for multiple repositories.

## Overview

reDeploy allows users to trigger empty commits across multiple repositories simultaneously, causing CI/CD pipelines (Netlify, Vercel, GitHub Actions, etc.) to rebuild.

## Tech Stack

- **Frontend**: Hugo + TailwindCSS + SCSS
- **Backend**: TBD (Node.js/Go serverless functions)
- **Auth**: Google OAuth, GitHub OAuth, Email/Password
- **Database**: TBD (Firebase/Supabase/PostgreSQL)
- **Hosting**: Netlify

---

## Phase 1: Foundation & Auth

### 1.1 Project Setup
- [x] Initialize Hugo project from starter template
- [x] Configure package.json and hugo.toml
- [x] Set up Git repository
- [ ] Set up testing framework (Jest)
- [ ] Configure ESLint + Prettier
- [ ] Set up CI pipeline for tests

### 1.2 Authentication System
- [ ] **TDD**: Write tests for auth flows
- [ ] Set up Firebase Auth (or alternative)
- [ ] Implement GitHub OAuth login
  - Required scopes: `repo`, `user:email`
- [ ] Implement Google OAuth login
- [ ] Implement Email/Password auth
- [ ] Create auth state management
- [ ] Build login/signup pages
- [ ] Build user profile page
- [ ] Implement logout functionality
- [ ] Add session persistence

### 1.3 Landing Page
- [ ] Hero section with value proposition
- [ ] Feature highlights
- [ ] How it works section
- [ ] CTA buttons (Sign up / Login)
- [ ] Footer with links

---

## Phase 2: Core Functionality

### 2.1 GitHub Integration
- [ ] **TDD**: Write tests for GitHub API interactions
- [ ] Store GitHub access token securely
- [ ] Fetch user's repositories list
- [ ] Cache repository data
- [ ] Handle pagination for users with many repos
- [ ] Display repos with search/filter

### 2.2 Repository Management
- [ ] **TDD**: Write tests for repo selection logic
- [ ] Create "Add Repository" flow
- [ ] Build repository list UI
- [ ] Allow selecting specific branches per repo
- [ ] Save user's repo configurations to database
- [ ] Edit/remove repository configurations
- [ ] Repository grouping (optional)

### 2.3 Deployment Trigger
- [ ] **TDD**: Write tests for commit creation
- [ ] Create empty commit function
  ```
  git commit --allow-empty -m "chore: trigger rebuild [YYYY-MM-DD HH:MM:SS]"
  ```
- [ ] Push commit to selected branch(es)
- [ ] Handle API rate limits
- [ ] Queue system for multiple repos
- [ ] Progress indicator UI
- [ ] Success/failure feedback per repo

---

## Phase 3: Dashboard & UX

### 3.1 User Dashboard
- [ ] Overview of connected repos
- [ ] Quick deploy buttons
- [ ] Recent deployment history
- [ ] Status indicators (last deployed, branch)

### 3.2 Deployment History
- [ ] **TDD**: Write tests for history tracking
- [ ] Log each deployment trigger
- [ ] Show timestamp, repos affected, branches
- [ ] Filter by date range
- [ ] Export history (CSV)

### 3.3 Settings Page
- [ ] Manage connected accounts (GitHub, Google)
- [ ] Default branch preferences
- [ ] Commit message customization
- [ ] Notification preferences
- [ ] Delete account option

---

## Phase 4: Advanced Features

### 4.1 Batch Operations
- [ ] "Deploy All" button
- [ ] Select multiple repos for batch deploy
- [ ] Scheduled deployments (cron-style)
- [ ] Deployment presets/groups

### 4.2 Webhooks & Integrations
- [ ] Incoming webhooks to trigger deploys
- [ ] Slack notifications
- [ ] Discord notifications
- [ ] Email notifications

### 4.3 Team Features (Future)
- [ ] Organization support
- [ ] Shared repo configurations
- [ ] Team member permissions
- [ ] Audit log

---

## Phase 5: Polish & Launch

### 5.1 Testing & QA
- [ ] End-to-end tests (Playwright/Cypress)
- [ ] Accessibility audit (WCAG 2.1 AA)
- [ ] Performance optimization
- [ ] Security audit

### 5.2 Documentation
- [ ] User guide
- [ ] API documentation (if public API)
- [ ] FAQ section

### 5.3 Launch Prep
- [ ] Set up production environment
- [ ] Configure domain (redeploy.app)
- [ ] Set up monitoring/analytics
- [ ] Create launch announcement

---

## Testing Strategy (TDD)

Each feature follows this pattern:

1. **Write failing test** - Define expected behavior
2. **Implement feature** - Make test pass
3. **Refactor** - Clean up while keeping tests green

### Test Categories

- **Unit Tests**: Individual functions, utilities
- **Integration Tests**: API calls, database operations
- **Component Tests**: UI components in isolation
- **E2E Tests**: Full user flows

### Test Files Structure

```
/tests
  /unit
    auth.test.js
    github-api.test.js
    commit-trigger.test.js
  /integration
    repo-management.test.js
    deployment-flow.test.js
  /e2e
    login-flow.spec.js
    deploy-repos.spec.js
```

---

## Database Schema (Draft)

### Users
```
users {
  id: string (PK)
  email: string
  display_name: string
  github_token: encrypted string
  google_id: string (nullable)
  created_at: timestamp
  updated_at: timestamp
}
```

### Repositories
```
repositories {
  id: string (PK)
  user_id: string (FK)
  github_repo_id: number
  repo_name: string
  repo_owner: string
  default_branch: string
  selected_branches: string[]
  is_active: boolean
  created_at: timestamp
}
```

### Deployment Logs
```
deployment_logs {
  id: string (PK)
  user_id: string (FK)
  repository_id: string (FK)
  branch: string
  commit_sha: string
  status: enum (pending, success, failed)
  triggered_at: timestamp
  completed_at: timestamp
  error_message: string (nullable)
}
```

---

## API Endpoints (Draft)

### Auth
- `POST /api/auth/login` - Email/password login
- `GET /api/auth/github` - GitHub OAuth redirect
- `GET /api/auth/github/callback` - GitHub OAuth callback
- `GET /api/auth/google` - Google OAuth redirect
- `GET /api/auth/google/callback` - Google OAuth callback
- `POST /api/auth/logout` - Logout

### Repositories
- `GET /api/repos` - List user's saved repos
- `GET /api/repos/github` - Fetch repos from GitHub
- `POST /api/repos` - Add repo to tracking
- `PUT /api/repos/:id` - Update repo config
- `DELETE /api/repos/:id` - Remove repo

### Deployments
- `POST /api/deploy` - Trigger deployment
- `POST /api/deploy/batch` - Batch deployment
- `GET /api/deploy/history` - Get deployment history

---

## Current Status

**Phase**: 1.1 (Project Setup)
**Next Step**: Set up testing framework and write first tests
