# Supabase Realtime Subscription Audit

## 🔴 Critical Issues

### 1. **MapVeto.tsx:326** - Channel Name with `Date.now()` Causes New Channels on Every Mount
**File:** `src/components/tournament/MapVeto.tsx`  
**Line:** 326  
**Issue:** Channel name includes `Date.now()`, creating a unique channel on every component mount/re-render
```tsx
.channel(`match-veto-${matchId}-${Date.now()}`) // ❌ Unique channel name
```
**Impact:** ⚠️ **CAUSES MULTIPLE SUBSCRIPTIONS** - Each re-render creates a new channel, old ones may not be cleaned up properly  
**Fix:** Use stable channel name: `.channel(`match-veto-${matchId}`)`

---

### 2. **useMessaging.ts:381** - Filter Dependency Causes Subscription Remounts
**File:** `src/hooks/useMessaging.ts`  
**Line:** 381  
**Issue:** Filter uses `conversations.map(c => c.id).join(',')` which changes on every render, causing subscription to remount
```tsx
filter: `conversation_id=in.(${conversations.map(c => c.id).join(',')})`,
```
**Dependencies:** `[user, conversations, currentConversation, fetchConversations]` - `conversations` array reference changes frequently  
**Impact:** ⚠️ **CAUSES REPEATED REMOUNTS** - Subscription recreates every time conversations array reference changes  
**Fix:** 
- Memoize conversation IDs: `const conversationIds = useMemo(() => conversations.map(c => c.id), [conversations])`
- Or use a more stable filter approach

---

## 🟡 Issues Causing State Resets (Reload-like Behavior)

### 3. **MapVeto.tsx:363, 386** - `fetchVetoData()` Calls in Subscription Handlers
**File:** `src/components/tournament/MapVeto.tsx`  
**Lines:** 363, 386  
**Issue:** Calls `fetchVetoData()` in subscription handlers, which sets loading state and resets veto state
```tsx
// Line 363
fetchVetoData(); // ❌ Causes loading state and state reset

// Line 386
setTimeout(() => {
  if (mounted) {
    fetchVetoData(); // ❌ Causes loading state and state reset
  }
}, 100);
```
**Impact:** ⚠️ **CAUSES UI JUMPS** - Loading state appears, state resets, causing reload-like behavior  
**Fix:** Update state directly instead of refetching (already done for UPDATE events, but not for INSERT/DELETE)

---

### 4. **NotificationContext.tsx:137** - `fetchNotifications()` Call in Subscription Handler
**File:** `src/components/NotificationContext.tsx`  
**Line:** 137  
**Issue:** Calls `fetchNotifications()` in team_invites subscription handler, which resets all notifications
```tsx
(payload) => {
  console.log('[Notifications] Team invite update:', payload.eventType);
  // Refetch notifications to include updated invites
  fetchNotifications(); // ❌ Resets all notifications state
}
```
**Impact:** ⚠️ **CAUSES STATE RESET** - All notifications are refetched and state is reset, causing UI jump  
**Fix:** Update notifications state directly by adding/updating synthetic invite notifications

---

### 5. **useMessaging.ts:391** - `fetchConversations()` Call in Subscription Handler
**File:** `src/hooks/useMessaging.ts`  
**Line:** 391  
**Issue:** Calls `fetchConversations()` in subscription handler, which may reset conversations state
```tsx
// Update conversations list
fetchConversations(); // ❌ May reset conversations state
```
**Impact:** ⚠️ **MAY CAUSE STATE RESET** - Depends on `fetchConversations` implementation  
**Fix:** Update conversations state directly instead of refetching

---

## 🟠 Potential Issues (May Cause Unnecessary Re-renders)

### 6. **Brackets.tsx:822** - Unstable Dependencies Causing Remounts
**File:** `src/pages/tournaments/Brackets.tsx`  
**Line:** 822  
**Issue:** `useEffect` dependencies include `participants`, `teamCount`, `buildTeamMappings` which may change frequently
```tsx
}, [tournament?.id, participants, teamCount, buildTeamMappings]);
```
**Impact:** ⚠️ **MAY CAUSE REMOUNTS** - If `participants` array reference changes or `buildTeamMappings` reference changes, subscription remounts  
**Fix:** 
- Use `tournament?.id` only as dependency (most stable)
- Or memoize `buildTeamMappings` with `useCallback` (already done)
- Consider using refs for `participants` and `teamCount` if they're only used in handlers

---

### 7. **Brackets.tsx:750-810** - Double `setParticipants` Call
**File:** `src/pages/tournaments/Brackets.tsx`  
**Lines:** 750-810  
**Issue:** `setParticipants` is called twice in participant change handler
```tsx
// First call (lines 751-763)
if (payload.eventType === 'INSERT' && payload.new) {
  setParticipants(prev => { ... }); // First update
}

// Second call (line 767)
setParticipants(prevParticipants => { // Second update - redundant!
  const updatedParticipants = ...
  return updatedParticipants;
});
```
**Impact:** ⚠️ **CAUSES DOUBLE RE-RENDER** - Two state updates instead of one  
**Fix:** Remove first `setParticipants` calls (lines 751-763), keep only the functional update at line 767

---

### 8. **NotificationContext.tsx:146** - `fetchNotifications` in Dependencies
**File:** `src/components/NotificationContext.tsx`  
**Line:** 146  
**Issue:** `fetchNotifications` in dependency array may cause remounts if it's not memoized
```tsx
}, [user, fetchNotifications]);
```
**Impact:** ⚠️ **MAY CAUSE REMOUNTS** - If `fetchNotifications` reference changes, subscription remounts  
**Fix:** `fetchNotifications` is already `useCallback`, so this should be OK, but verify it's stable

---

## ✅ Good Practices Found

### Proper Cleanup
- ✅ All subscriptions have cleanup functions
- ✅ `mounted` flags used in MapVeto.tsx to prevent updates after unmount
- ✅ Channels are properly unsubscribed in cleanup

### Direct State Updates (Good)
- ✅ Brackets.tsx: Match updates use direct state updates (no refetch)
- ✅ NotificationContext.tsx: Notification updates use direct state updates (except invites)
- ✅ MapVeto.tsx: UPDATE events use direct state updates

---

## 📋 Summary

### Critical Issues (Fix Immediately):
1. **MapVeto.tsx:326** - Channel name with `Date.now()` (causes multiple subscriptions)
2. **useMessaging.ts:381** - Filter dependency causes remounts (causes repeated subscriptions)

### State Reset Issues (Fix to Prevent Reload-like Behavior):
3. **MapVeto.tsx:363, 386** - `fetchVetoData()` calls in handlers (causes UI jumps)
4. **NotificationContext.tsx:137** - `fetchNotifications()` call in handler (causes state reset)
5. **useMessaging.ts:391** - `fetchConversations()` call in handler (may cause state reset)

### Optimization Issues (Fix to Prevent Unnecessary Re-renders):
6. **Brackets.tsx:822** - Unstable dependencies (may cause remounts)
7. **Brackets.tsx:750-810** - Double `setParticipants` call (causes double re-render)

### Total Issues:
- **2 Critical** (multiple subscriptions)
- **3 State Reset** (reload-like behavior)
- **2 Optimization** (unnecessary re-renders)

---

## Recommended Actions

1. **Immediate:** Fix MapVeto channel name and useMessaging filter dependency
2. **High Priority:** Replace `fetchVetoData()` and `fetchNotifications()` calls with direct state updates
3. **Medium Priority:** Fix double `setParticipants` call and optimize dependencies

