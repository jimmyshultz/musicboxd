# Feature Branch Workflow - Quick Reference

## 🚀 Start New Feature
```bash
git checkout main
git pull origin main
git checkout -b feature/descriptive-name
```

## 💻 Develop & Commit
```bash
# Make changes, then commit
git add .
git commit -m "feat: Add user authentication screen"

# Push to remote
git push origin feature/descriptive-name
```

## 📋 Create Pull Request
```bash
gh pr create \
  --base main \
  --head feature/descriptive-name \
  --title "feat: Add user authentication" \
  --body "Description of changes..."
```

## ✅ Merge & Cleanup
```bash
# After PR is merged
git checkout main
git pull origin main
git branch -d feature/descriptive-name
git push origin --delete feature/descriptive-name
```

## 🔧 Common Commands
```bash
# Check branches
git branch -a

# Update feature branch with main
git checkout feature/your-feature
git rebase main

# View PR details
gh pr view

# Clean up stale references
git remote prune origin
```

## 📝 Commit Message Format
- `feat:` New features
- `fix:` Bug fixes  
- `refactor:` Code refactoring
- `docs:` Documentation
- `style:` Code style
- `test:` Tests

## ⚠️ Important Rules
- ✅ Always start from `main`
- ✅ Use `feature/` prefix for branch names
- ✅ One feature per branch
- ✅ Delete branches after merge
- ✅ Keep branches short-lived (1-2 weeks max)

---
**Full documentation**: [Feature Branch Workflow Guide](feature_branch_workflow.md) 