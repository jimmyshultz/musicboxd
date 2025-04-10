# GitHub Repository Setup

This document outlines the process used to set up the Musicboxd GitHub repository and how to manage access.

## Repository Creation

The Musicboxd repository was created on GitHub with the following settings:

- **Repository Name**: musicboxd
- **Visibility**: Private (will be made public later)
- **License**: MIT
- **Initialize with**: README.md, .gitignore for React Native

## Branch Protection Rules

We've established the following branch protection rules to maintain code quality:

### `main` branch
- Require pull request before merging
- Require at least 1 approval before merging
- Dismiss stale pull request approvals when new commits are pushed
- Require status checks to pass before merging
- Require branches to be up to date before merging
- Do not allow bypassing the above settings

### `develop` branch
- Require pull request before merging
- Require at least 1 approval before merging
- Require status checks to pass before merging
- Allow force pushes for repository administrators only

## Branch Structure

The repository follows a modified GitFlow workflow:

- `main`: Production-ready code, deployable at any time
- `develop`: Integration branch for development work
- `feature/*`: Feature branches created from and merged back to `develop`
- `bugfix/*`: Bug fix branches created from and merged back to `develop`
- `release/*`: Release preparation branches from `develop` to `main`
- `hotfix/*`: Urgent fix branches from `main` and merged to both `main` and `develop`

## Team Access Management

### Access Levels

- **Admin**: Full repository control, including dangerous actions
- **Maintain**: Project management access without dangerous actions
- **Write**: Pushing to non-protected branches and creating pull requests
- **Triage**: Managing issues and pull requests without write access
- **Read**: View-only access to the repository

### Adding Team Members

1. Navigate to repository **Settings** > **Collaborators and teams**
2. Click **Add people** or **Add teams**
3. Search for the GitHub username or email
4. Select the appropriate permission level
5. Click **Add**

Team members will receive an email invitation to join the repository.

### Best Practices for Collaboration

- Create issues for tracking work items
- Reference issues in commit messages and pull requests
- Use descriptive branch names (e.g., `feature/album-rating`)
- Write meaningful commit messages
- Keep pull requests focused on a single concern
- Request reviews from appropriate team members

## GitHub Actions Setup

Basic CI/CD workflows will be added to:

- Run linting on pull requests
- Run tests on pull requests
- Build and verify the app on pull requests
- Deploy to testing environments on merges to `develop`
- Deploy to production on merges to `main`

---

This document will be updated as the repository configuration evolves. 