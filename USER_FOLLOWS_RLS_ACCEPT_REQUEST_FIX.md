# 🔧 User Follows RLS Policy Fix for Accept Requests

## Problem

When trying to accept a follow request, getting this error:
```
"new row violates row-level security policy for table \"user_follows\""
```

## Root Cause

The current RLS policy on `user_follows` for INSERT is:
```sql
CREATE POLICY "Users can create own follows" ON public.user_follows
    FOR INSERT WITH CHECK (auth.uid() = follower_id);
```

**This only allows users to create follows where THEY are the follower.**

But when accepting a follow request:
- **User A** sent request to **User B** (private profile)
- **User B** accepts the request
- System tries to insert: `{ follower_id: userA.id, following_id: userB.id }`
- But `auth.uid() = userB.id`, so `auth.uid() = follower_id` fails!

## Instagram Model Requirements

The INSERT policy needs to allow:
1. **Users creating their own follows** (when they follow someone)
2. **Users accepting follow requests** (when someone requests to follow them)

## Solution

Update the INSERT policy to allow both scenarios:

```sql
-- Drop current restrictive policy
DROP POLICY IF EXISTS "Users can create own follows" ON public.user_follows;

-- Create new policy that handles both direct follows and accepted requests
CREATE POLICY "Users can create follows (direct or accepted requests)" ON public.user_follows
    FOR INSERT WITH CHECK (
        auth.uid() = follower_id                     -- User following someone directly
        OR auth.uid() = following_id                 -- User accepting a follow request
    );
```

## Manual Database Fix

**Run this SQL in Supabase → SQL Editor:**

```sql
-- Fix user_follows INSERT policy to allow accepting requests
DROP POLICY IF EXISTS "Users can create own follows" ON public.user_follows;

CREATE POLICY "Users can create follows (direct or accepted requests)" ON public.user_follows
    FOR INSERT WITH CHECK (
        auth.uid() = follower_id                     -- User following someone directly
        OR auth.uid() = following_id                 -- User accepting a follow request
    );
```

## Expected Behavior After Fix

### **✅ Direct Follows** (Public Profiles):
- User A follows User B directly → `auth.uid() = follower_id` ✅

### **✅ Accept Requests** (Private Profiles):
- User B accepts User A's request → `auth.uid() = following_id` ✅
- Creates follow relationship successfully

### **✅ Security Maintained**:
- Users can only create follows where they're involved (as follower OR following)
- Cannot create arbitrary follow relationships between other users

---

**This completes the RLS policy fixes for the Instagram privacy model!** 🎯