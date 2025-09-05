# 🔍 Debug Privacy Relationships

## Current Issue
Private profiles are **completely invisible** to existing followers, but they should remain visible per Instagram privacy model.

## What to Check

### 1. **Database Follow Relationships**
Run this SQL in your Supabase SQL Editor to check if relationships still exist:

```sql
-- Check all follow relationships
SELECT 
  uf.follower_id,
  uf.following_id,
  follower.username as follower_username,
  following.username as following_username,
  following.is_private as following_is_private,
  uf.created_at
FROM user_follows uf
JOIN user_profiles follower ON follower.id = uf.follower_id
JOIN user_profiles following ON following.id = uf.following_id
ORDER BY uf.created_at DESC;
```

**Expected**: You should see rows showing Public Profile following Private Profile

### 2. **Check Privacy Settings**
```sql
-- Check user privacy settings
SELECT username, is_private, created_at, updated_at 
FROM user_profiles 
ORDER BY updated_at DESC;
```

### 3. **Test Follow Relationship Query**
```sql
-- Replace 'PUBLIC_USER_ID' and 'PRIVATE_USER_ID' with actual IDs
SELECT * FROM user_follows 
WHERE follower_id = 'PUBLIC_USER_ID' 
  AND following_id = 'PRIVATE_USER_ID';
```

**Expected**: Should return a row if relationship exists

## Possible Issues

### **Issue 1: Follow Relationships Deleted**
If the follow relationship was deleted when going private, we need to preserve it.

### **Issue 2: UserService getFollowing() Not Working**
The two-step query approach might have bugs.

### **Issue 3: Social Feeds Using Wrong Logic**
Home page social sections might be filtering out private profiles incorrectly.

### **Issue 4: Different User ID Systems**
Mismatch between `auth.users.id` and `user_profiles.id` causing lookup failures.

## Debug Steps

### **Step 1**: Check Database Relationships
Run the SQL queries above to verify relationships exist.

### **Step 2**: Test getFollowing() Method
In your app console, test:
```javascript
// Get the public user's following list
const following = await userService.getFollowing('PUBLIC_USER_ID');
console.log('Following list:', following);
// Should include the private user
```

### **Step 3**: Test Search
```javascript
// Search for private user while logged in as public user
const results = await userService.searchUsers('PRIVATE_USERNAME');
console.log('Search results:', results);
// Should include private user if following relationship exists
```

### **Step 4**: Check Social Feeds
Look at browser console for any errors in:
- Popular With Friends loading
- New From Friends loading
- Following/Followers count loading

## Next Actions

Based on what you find:

### **If relationships exist in DB but app can't see them**:
- Fix the `getFollowing()` method
- Check for ID mismatch issues

### **If relationships were deleted**:
- Need to prevent deletion when going private
- Add migration to restore relationships

### **If relationships exist but feeds are empty**:
- Fix social feed privacy filtering
- Update home page logic

---

**Please run the SQL queries and let me know what you find!** 🔍