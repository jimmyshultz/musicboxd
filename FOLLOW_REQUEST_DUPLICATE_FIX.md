# 🔧 Follow Request Duplicate Key Fix

## Problem

When trying to send a follow request, getting this error:
```
"duplicate key value violates unique constraint \"follow_requests_requester_id_requested_id_key\""
```

## Root Cause

The `follow_requests` table has a unique constraint on `(requester_id, requested_id)` to prevent duplicate requests. However, the `sendFollowRequest` method was trying to `INSERT` a new record without checking if one already existed.

**Scenarios that cause this:**
1. **Previous rejected request** exists in database
2. **Previous accepted request** exists in database  
3. **Cancelled request** that wasn't properly deleted

## Solution Implemented

Updated `sendFollowRequest` method to handle existing requests gracefully:

### **New Logic:**
1. **Check for existing request** (any status)
2. **If pending request exists** → Return existing request
3. **If rejected/accepted request exists** → Update it to 'pending'
4. **If no request exists** → Create new request

### **Code Changes:**
```typescript
async sendFollowRequest(requesterId: string, requestedId: string): Promise<FollowRequest> {
  // Check if there's already a request (any status)
  const { data: existing } = await this.client
    .from('follow_requests')
    .select('*')
    .eq('requester_id', requesterId)
    .eq('requested_id', requestedId)
    .maybeSingle();

  if (existing) {
    if (existing.status === 'pending') {
      return existing;  // Already pending
    } else {
      // Update rejected/accepted to pending
      return await this.client
        .from('follow_requests')
        .update({ status: 'pending', updated_at: new Date().toISOString() })
        .eq('id', existing.id)
        .select()
        .single();
    }
  } else {
    // Create new request
    return await this.client
      .from('follow_requests')
      .insert({ requester_id: requesterId, requested_id: requestedId, status: 'pending' })
      .select()
      .single();
  }
}
```

## Expected Behavior After Fix

### **✅ New Request:**
- Creates new follow request successfully

### **✅ Duplicate Request:**
- If pending request exists → Returns existing request (no error)
- If old rejected request exists → Updates it to pending (reuses record)
- If old accepted request exists → Updates it to pending (reuses record)

### **✅ User Experience:**
- No more duplicate key errors
- Button states work correctly
- Can re-request after previous rejection
- Graceful handling of edge cases

## Files Modified

- **`/workspace/Musicboxd/src/services/userService.ts`** → Updated `sendFollowRequest` method

---

**This fix ensures robust follow request handling with proper duplicate prevention!** ✅