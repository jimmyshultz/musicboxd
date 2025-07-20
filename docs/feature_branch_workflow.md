# Feature Branch Workflow Strategy

## Overview

This project uses a **Feature Branch Workflow** strategy instead of a traditional develop branch approach. This keeps the repository clean, enables parallel development, and provides a clear path for code review and integration.

## Why Feature Branch Workflow?

- ✅ **Clean main branch**: Main always contains production-ready code
- ✅ **Parallel development**: Multiple features can be developed simultaneously
- ✅ **Clear review process**: Each feature gets its own pull request
- ✅ **Easy rollback**: Features can be abandoned without affecting main
- ✅ **Simplified history**: No complex merge conflicts from long-lived branches

## Workflow Strategy

### Branch Structure
```
main (production-ready code)
├── feature/user-authentication
├── feature/album-search
├── feature/rating-system
└── feature/social-features
```

### Branch Naming Convention
- **Format**: `feature/descriptive-feature-name`
- **Examples**:
  - `feature/user-authentication`
  - `feature/album-search-enhancement`
  - `feature/rating-system-ui`
  - `feature/social-following`

## Step-by-Step Workflow

### 1. Start New Feature
```bash
# Ensure you're on main and up to date
git checkout main
git pull origin main

# Create and switch to new feature branch
git checkout -b feature/your-feature-name
```

### 2. Develop Feature
```bash
# Make your changes
# Commit frequently with descriptive messages
git add .
git commit -m "feat: Add user authentication screen"

# Push feature branch to remote
git push origin feature/your-feature-name
```

### 3. Create Pull Request
```bash
# Use GitHub CLI to create PR
gh pr create \
  --base main \
  --head feature/your-feature-name \
  --title "feat: Add user authentication" \
  --body "This PR adds user authentication functionality including login/signup screens and JWT token management."
```

### 4. Code Review & Iteration
- Request reviewers if needed
- Address feedback and push additional commits
- All commits to the feature branch automatically update the PR

### 5. Merge & Cleanup
```bash
# After PR is approved and merged
git checkout main
git pull origin main

# Delete local feature branch
git branch -d feature/your-feature-name

# Delete remote feature branch
git push origin --delete feature/your-feature-name
```

## Best Practices

### Commit Messages
Use conventional commit format:
- `feat:` New features
- `fix:` Bug fixes
- `refactor:` Code refactoring
- `docs:` Documentation changes
- `style:` Code style changes
- `test:` Adding or updating tests

### Branch Management
- **Keep branches short-lived**: Aim to merge within 1-2 weeks
- **One feature per branch**: Don't mix multiple features
- **Regular updates**: Rebase on main if needed to avoid conflicts
- **Delete after merge**: Always clean up merged branches

### Pull Request Guidelines
- **Clear title**: Describe what the PR does
- **Detailed description**: Explain the changes and reasoning
- **Screenshots**: Include UI changes for visual features
- **Testing notes**: Document how to test the feature
- **Breaking changes**: Clearly mark any breaking changes

## For AI Agents

### When Creating New Features
1. **Always start from main**: `git checkout main && git pull origin main`
2. **Create feature branch**: `git checkout -b feature/descriptive-name`
3. **Follow naming convention**: Use `feature/` prefix with descriptive name
4. **Commit frequently**: Make small, focused commits with clear messages
5. **Create PR early**: Even if incomplete, create PR for visibility
6. **Document changes**: Include detailed PR descriptions

### When Reviewing Code
1. **Check branch strategy**: Ensure feature branches are used
2. **Verify naming**: Confirm branch follows naming convention
3. **Review commit history**: Look for clear, descriptive commits
4. **Suggest improvements**: Recommend better commit messages or structure

### When Merging
1. **Ensure main is target**: All PRs should target main branch
2. **Clean up branches**: Delete feature branches after merge
3. **Update documentation**: Update any relevant docs
4. **Verify deployment**: Ensure changes work in production

## Common Commands Reference

```bash
# Branch management
git checkout -b feature/new-feature
git branch -d feature/old-feature
git push origin --delete feature/old-feature

# Keeping up to date
git checkout main
git pull origin main
git checkout feature/your-feature
git rebase main

# PR management
gh pr create --base main --head feature/your-feature
gh pr view
gh pr merge

# Cleanup
git remote prune origin
git branch -a
```

## Troubleshooting

### Merge Conflicts
```bash
# Rebase on main to resolve conflicts
git checkout feature/your-feature
git rebase main
# Resolve conflicts, then continue
git rebase --continue
```

### Outdated Branch
```bash
# Update feature branch with latest main
git checkout feature/your-feature
git rebase main
git push origin feature/your-feature --force-with-lease
```

### Accidentally Committed to Main
```bash
# Create feature branch from current state
git checkout -b feature/recovery
git checkout main
git reset --hard origin/main
```

## Repository State

This repository maintains a clean state with:
- **main**: Production-ready code
- **No develop branch**: Feature branches are used instead
- **No long-lived feature branches**: All branches are short-lived
- **Regular cleanup**: Merged branches are deleted promptly

## Conclusion

This feature branch workflow provides a clean, efficient development process that scales well for both individual developers and teams. It ensures code quality through pull requests while maintaining a simple, linear history in the main branch.

---

**Remember**: Always start from main, create feature branches, and clean up after merging! 