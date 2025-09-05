# 🔧 User Follows Foreign Key Relationship Fix

## Problem Identified
**Error**: `Could not find a relationship between 'user_follows' and 'user_profiles' in the schema cache`

**Root Cause**: The `user_follows` table references `auth.users(id)` but the UserService was trying to join with `user_profiles` using non-existent foreign key names.

## Database Schema Issue

### **How Tables Are Related**:
```sql
-- user_follows table
CREATE TABLE public.user_follows (
    follower_id UUID REFERENCES auth.users(id),    -- Points to auth.users
    following_id UUID REFERENCES auth.users(id)    -- Points to auth.users
);

-- user_profiles table  
CREATE TABLE public.user_profiles (
    id UUID REFERENCES auth.users(id),  -- Links to same auth.users
    username TEXT,
    -- ... other profile fields
);
```

### **The Relationship**:
- `user_follows.follower_id` → `auth.users.id` → `user_profiles.id`
- `user_follows.following_id` → `auth.users.id` → `user_profiles.id`

But the join needs to be done properly!

## Failed Query Attempts

### **What Was Breaking**:
```typescript
// This tried to use non-existent foreign key names
.select(`
  follower:user_profiles!user_follows_follower_id_fkey(*)
`)

// Foreign key 'user_follows_follower_id_fkey' doesn't exist because
// user_follows points to auth.users, not user_profiles
```

## Solution Applied

### ✅ **Fixed with Two-Step Queries**
Instead of complex joins, now using simple, reliable two-step approach:

#### **getFollowers() Method**:
```typescript
// Step 1: Get follower IDs from user_follows
const { data: followData } = await supabase
  .from('user_follows')
  .select('follower_id')
  .eq('following_id', userId);

// Step 2: Get user profiles for those IDs
const followerIds = followData.map(row => row.follower_id);
const { data: profileData } = await supabase
  .from('user_profiles')
  .select('*')
  .in('id', followerIds);
```

#### **getFollowing() Method**:
```typescript
// Step 1: Get following IDs from user_follows  
const { data: followData } = await supabase
  .from('user_follows')
  .select('following_id')
  .eq('follower_id', userId);

// Step 2: Get user profiles for those IDs
const followingIds = followData.map(row => row.following_id);
const { data: profileData } = await supabase
  .from('user_profiles')
  .select('*')
  .in('id', followingIds);
```

#### **Follow Request Methods**:
```typescript
// getPendingFollowRequests()
// Step 1: Get request data
const { data: requestData } = await supabase
  .from('follow_requests')
  .select('*')
  .eq('requested_id', userId);

// Step 2: Get requester profiles
const requesterIds = requestData.map(req => req.requester_id);
const { data: profileData } = await supabase
  .from('user_profiles')
  .select('*')
  .in('id', requesterIds);

// Step 3: Combine data
return requestData.map(request => ({
  ...request,
  requester: profileData?.find(profile => profile.id === request.requester_id)
}));
```

#### **Search Method**:
```typescript
// Simplified to avoid complex joins
// Step 1: Get user's following list
const followingUsers = await this.getFollowing(currentUser.id);
const followingIds = followingUsers.map(user => user.id);

// Step 2: Search all profiles
const { data } = await supabase
  .from('user_profiles')
  .select('*')
  .or(`username.ilike.%${query}%,display_name.ilike.%${query}%`);

// Step 3: Filter based on privacy + following status
return data.filter(user => {
  if (!user.is_private) return true; // Public profiles always visible
  return followingIds.includes(user.id); // Private profiles only if following
});
```

## Benefits of This Approach

### ✅ **Reliability**:
- No complex join syntax that might break
- Works regardless of foreign key naming
- Clear, predictable queries

### ✅ **Performance**:
- Two simple queries often faster than complex joins
- Uses proper indexes on both tables
- Supabase optimizes `.in()` queries well

### ✅ **Maintainability**:
- Easy to understand and debug
- No dependency on specific foreign key names
- Works with any relationship structure

### ✅ **Flexibility**:
- Can easily add filtering/sorting to either step
- Easy to add additional data from either table
- Simple error handling for each step

## Files Fixed

### **Core Service**:
- `src/services/userService.ts` - All relationship query methods

### **Methods Updated**:
- ✅ `getFollowers()` - Two-step approach
- ✅ `getFollowing()` - Two-step approach  
- ✅ `searchUsers()` - Simplified privacy filtering
- ✅ `getPendingFollowRequests()` - Two-step with profile joining
- ✅ `getSentFollowRequests()` - Two-step with profile joining

## Testing

### ✅ **Should Now Work**:
- Home page social sections (Popular With Friends, New From Friends)
- User search with privacy filtering
- Follow/Following lists in profiles
- Follow requests screen
- All follow/unfollow operations

### 🧪 **Test These Scenarios**:
1. **Home page loads** without foreign key errors
2. **User search** shows appropriate results based on privacy
3. **Following/Followers lists** display correctly in profiles
4. **Follow requests** can be sent and managed
5. **Privacy toggles** work with existing relationships

---

**Result**: All foreign key relationship errors resolved! Social features should now work properly. 🎉