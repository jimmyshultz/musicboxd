# 🧪 Final Privacy Testing Checklist

## Test Scenarios to Verify

### **Scenario 1: Public Profile Behavior**
- [ ] Public user can see all other profiles in search
- [ ] Public user can see private user's basic info (username, bio, avatar)
- [ ] Public user **cannot** see private user's activity until following
- [ ] Public user can send follow request to private user
- [ ] After acceptance, public user can see private user's content

### **Scenario 2: Private Profile Behavior**  
- [ ] Private user can see all profiles and content as normal
- [ ] Private user receives follow requests in settings
- [ ] Private user can accept/reject requests
- [ ] After accepting, requester gains access to content

### **Scenario 3: Content Protection**
- [ ] **Before following private user**: No access to listens, ratings, diary entries
- [ ] **After following private user**: Full access to all content
- [ ] **Home page feeds**: Private friends' content appears correctly

### **Scenario 4: Follow Request Workflow**
- [ ] Send request shows "Requested" button state
- [ ] Accept request creates follow relationship  
- [ ] Reject request maintains privacy
- [ ] Cancel request removes pending status

## Quick Test Instructions

1. **Create two test accounts** (if not done already)
2. **Set one private, one public**
3. **Test search and discovery**
4. **Test follow request workflow**
5. **Verify content visibility changes**
6. **Check home page feeds include private friends**

---

**If all checkboxes pass ✅, privacy controls are complete!**