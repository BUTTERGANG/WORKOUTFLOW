# Security and Code Quality Audit - GitHub Issues

Generated: 2025-11-20
Branch: `claude/audit-messaging-permissions-01NALJdNk64hwXNQnjqZbzYE`

This document contains all issues found during the comprehensive security and code quality audit. Copy each issue into GitHub as separate issues.

---

## CRITICAL SECURITY ISSUES

### Issue 1: CSRF Token Implementation Gap - Frontend Not Using Backend Protection

**Priority:** 🔴 CRITICAL
**Labels:** `security`, `bug`, `critical`
**Assignee:** Security Team

**Description:**

The backend has CSRF protection configured (`server/middleware/csrf.ts`) and exposes a token endpoint (`/api/csrf-token`), but the frontend never fetches or sends CSRF tokens with API requests.

**Impact:**
- All mutation endpoints (POST, PUT, PATCH, DELETE) are vulnerable to CSRF attacks
- Attackers can trick authenticated users into performing unwanted actions
- Production-ready CSRF protection is configured but not activated

**Affected Files:**
- `server/middleware/csrf.ts` - CSRF middleware exists
- `server/index.ts:73` - Token endpoint exists but never called
- `client/src/lib/queryClient.ts` - API request function missing CSRF token header

**Evidence:**
```bash
# Backend has CSRF configured
grep -r "csrf" client/src/
# Returns: No files found ❌
```

**Steps to Reproduce:**
1. Open browser DevTools Network tab
2. Make any POST/PUT/DELETE request
3. Observe no `x-csrf-token` header is sent
4. No request to `/api/csrf-token` is made

**Recommendation:**

1. Fetch CSRF token on app initialization
2. Include token in all mutation requests
3. Add retry logic if token expires

**Example Fix:**
```typescript
// In queryClient.ts or a new csrf.ts file
let csrfToken: string | null = null;

export async function getCsrfToken(): Promise<string> {
  if (!csrfToken) {
    const res = await fetch('/api/csrf-token', { credentials: 'include' });
    const data = await res.json();
    csrfToken = data.csrfToken;
  }
  return csrfToken;
}

// Update apiRequest function
export async function apiRequest<T = any>(
  url: string,
  options?: { method?: string; body?: unknown },
): Promise<T> {
  const method = options?.method || 'GET';
  const headers: HeadersInit = options?.body ? { "Content-Type": "application/json" } : {};

  // Add CSRF token for mutations
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
    const token = await getCsrfToken();
    headers['x-csrf-token'] = token;
  }

  const res = await fetch(url, {
    method,
    headers,
    body: options?.body ? JSON.stringify(options.body) : undefined,
    credentials: "include",
  });

  await throwIfResNotOk(res);

  try {
    return await res.json();
  } catch (error) {
    throw new Error(`Failed to parse JSON response from ${url}: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
```

**References:**
- OWASP CSRF Prevention: https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html
- csrf-csrf documentation: https://github.com/Psifi-Solutions/csrf-csrf

---

### Issue 2: Route Ordering Vulnerability - /today Endpoint Unreachable

**Priority:** 🔴 CRITICAL
**Labels:** `bug`, `critical`, `backend`

**Description:**

The `/api/workout-sessions/today` endpoint is defined AFTER the dynamic `/api/workout-sessions/:id` route, making it unreachable. Express matches routes in order, so "today" is interpreted as an ID parameter.

**Impact:**
- The "Get today's workout" feature is broken
- Users cannot access today's scheduled workout
- Frontend may receive errors or wrong workout session

**Affected Files:**
- `server/routes.ts:1755` - `/today` route defined too late
- `server/routes.ts:1714` - `/:id` route matches first

**Current Code:**
```typescript
// Line 1714 - This matches FIRST
app.get('/api/workout-sessions/:id', isAuthenticated, async (req: AuthRequest, res) => {
  // Tries to find workout with id="today"
});

// Line 1755 - This NEVER runs
app.get('/api/workout-sessions/today', isAuthenticated, async (req: AuthRequest, res) => {
  // Unreachable code ❌
});
```

**Steps to Reproduce:**
1. Call `GET /api/workout-sessions/today`
2. Observe it matches the `/:id` route
3. Receives 404 or "workout not found" error

**Fix:**
Move the `/today` route BEFORE the `/:id` route in `server/routes.ts`:

```typescript
// CORRECT ORDER:
// Line 1714 - Specific routes first
app.get('/api/workout-sessions/today', isAuthenticated, async (req: AuthRequest, res) => {
  // ... today logic
});

// After all specific routes - Generic param routes last
app.get('/api/workout-sessions/:id', isAuthenticated, async (req: AuthRequest, res) => {
  // ... id lookup
});
```

**Testing:**
```bash
curl http://localhost:5000/api/workout-sessions/today
# Should return today's workout, not 404
```

---

### Issue 3: Missing Rate Limiting on 71 API Endpoints

**Priority:** 🟠 HIGH
**Labels:** `security`, `enhancement`, `backend`

**Description:**

Only 2 out of 73 API endpoints have rate limiting (login and register). This leaves the application vulnerable to:
- Brute force attacks
- Resource exhaustion
- Spam/flooding
- Data scraping
- Enumeration attacks

**Impact:**
- Attackers can spam creation endpoints (messages, teams, orgs, programs)
- No protection against automated abuse
- Potential DoS through resource creation
- Information disclosure through unlimited search queries

**Statistics:**
- Total Routes: 73
- With Rate Limiting: 2 (2.7%)
- Without Rate Limiting: 71 (97.3%)

**Critical Endpoints Missing Rate Limiting:**

**Write Operations (High Priority):**
- `POST /api/organizations` (line 161)
- `POST /api/teams` (line 289)
- `POST /api/messages` (line 2464)
- `POST /api/exercises` (line 836)
- `POST /api/programs` (line 905)
- `POST /api/team-join-requests` (line 396)
- `POST /api/organization-join-requests` (line 671)
- `POST /api/program-assignments` (line 1275)

**Enumeration-Prone Endpoints (Critical):**
- `GET /api/organizations/by-invite/:inviteCode` (line 619)
- `GET /api/teams/search` (line 376)
- `POST /api/organizations/search` (line 603)

**Approval Endpoints (Medium Priority):**
- `POST /api/team-join-requests/:id/approve` (line 478)
- `POST /api/team-join-requests/:id/reject` (line 525)

**Recommended Rate Limits:**

```typescript
import { rateLimit } from './middleware/rateLimit';

// Resource creation (moderate)
app.post('/api/organizations',
  rateLimit(10, 60 * 1000), // 10 per minute
  isAuthenticated,
  async (req, res) => { /* ... */ }
);

// Messaging (high volume allowed)
app.post('/api/messages',
  rateLimit(30, 60 * 1000), // 30 per minute
  isAuthenticated,
  async (req, res) => { /* ... */ }
);

// Join requests (strict)
app.post('/api/team-join-requests',
  rateLimit(5, 5 * 60 * 1000), // 5 per 5 minutes
  isAuthenticated,
  async (req, res) => { /* ... */ }
);

// Enumeration prevention (very strict)
app.get('/api/organizations/by-invite/:inviteCode',
  rateLimit(3, 15 * 60 * 1000), // 3 per 15 minutes
  async (req, res) => { /* ... */ }
);

// Search endpoints (moderate)
app.post('/api/organizations/search',
  rateLimit(20, 60 * 1000), // 20 per minute
  isAuthenticated,
  async (req, res) => { /* ... */ }
);
```

**Implementation Priority:**
1. **Immediate:** Invite code lookup, search endpoints
2. **This Sprint:** All write operations (POST, PUT, DELETE)
3. **Next Sprint:** Approval endpoints, read operations

**References:**
- OWASP Rate Limiting: https://cheatsheetseries.owasp.org/cheatsheets/Denial_of_Service_Cheat_Sheet.html

---

### Issue 4: Overly Permissive Messaging Permissions

**Priority:** 🟠 HIGH
**Labels:** `security`, `messaging`, `permissions`

**Description:**

The messaging system only checks if users share ANY organization, allowing users to message anyone in any shared organization regardless of team membership or role appropriateness.

**Impact:**
- Athletes can message athletes from other teams
- Coaches can be spammed by athletes from unrelated teams
- No team-level or role-based messaging boundaries
- Privacy expectations violated

**Affected Files:**
- `server/routes.ts:2472-2491` - POST /api/messages
- `server/routes.ts:2508-2527` - GET /api/messages/:userId

**Current Logic:**
```typescript
// Line 2472-2491
const hasSharedOrg = [...senderOrgIds].some(orgId => recipientOrgIds.has(orgId));

if (!hasSharedOrg) {
  return res.status(403).json({ message: "Forbidden: can only message users in same organization" });
}
```

**Problems:**
1. ✅ Checks organization membership
2. ❌ Doesn't check team membership
3. ❌ Doesn't verify role appropriateness (athlete → coach vs athlete → athlete)
4. ❌ No blocking/muting functionality

**Recommended Permission Model:**

```typescript
// Coaches can message:
// - Athletes on their teams
// - Other coaches in same org

// Athletes can message:
// - Coaches on their teams
// - Other athletes on their teams (optional)

async function canSendMessage(senderId: string, recipientId: string): Promise<boolean> {
  const sender = await storage.getUserById(senderId);
  const recipient = await storage.getUserById(recipientId);

  const senderTeams = await storage.getUserTeams(senderId);
  const recipientTeams = await storage.getUserTeams(recipientId);

  // Check if they share any team
  const sharedTeams = senderTeams.filter(st =>
    recipientTeams.some(rt => rt.id === st.id)
  );

  if (sharedTeams.length > 0) {
    return true; // Same team = allowed
  }

  // Check coach permissions (coaches can message across teams in same org)
  const isCoach = (role: string) => ['admin', 'head_coach', 'assistant_coach'].includes(role);

  if (isCoach(sender.role) && isCoach(recipient.role)) {
    // Check if same org
    const senderOrgs = await storage.getUserOrganizations(senderId);
    const recipientOrgs = await storage.getUserOrganizations(recipientId);
    return senderOrgs.some(so => recipientOrgs.some(ro => ro.id === so.id));
  }

  return false;
}
```

**Additional Recommendations:**
- Add team-level permission checks
- Implement blocked users table
- Add org-wide messaging settings (can athletes message each other?)
- Consider adding "message request" workflow for cross-team messages

---

### Issue 5: Session Security - No Session Regeneration on Login

**Priority:** 🟠 HIGH
**Labels:** `security`, `authentication`

**Description:**

The session ID is not regenerated after successful login, leaving the application vulnerable to session fixation attacks.

**Impact:**
- Attackers can fixate a session ID before authentication
- User authenticates with the attacker's known session ID
- Attacker can hijack the authenticated session

**Affected Files:**
- `server/localAuth.ts` - Login logic missing session regeneration

**Attack Scenario:**
1. Attacker obtains session cookie (easy with unencrypted HTTP in dev)
2. Attacker sends link to victim with fixed session ID
3. Victim logs in using the fixed session
4. Attacker uses the now-authenticated session

**Current Code:**
```typescript
// server/localAuth.ts - Missing regeneration
passport.authenticate('local', (err, user, info) => {
  if (err) return next(err);
  if (!user) return res.status(400).json({ message: info?.message || "Invalid credentials" });

  req.logIn(user, (err) => {
    if (err) return next(err);
    // ❌ NO SESSION REGENERATION HERE
    return res.status(200).json({ message: "Login successful", user });
  });
});
```

**Fix:**
```typescript
// Add session regeneration before login
passport.authenticate('local', (err, user, info) => {
  if (err) return next(err);
  if (!user) return res.status(400).json({ message: info?.message || "Invalid credentials" });

  // Regenerate session to prevent fixation
  req.session.regenerate((err) => {
    if (err) {
      logger.error("Session regeneration failed", err);
      return res.status(500).json({ message: "Login failed" });
    }

    req.logIn(user, (err) => {
      if (err) return next(err);
      return res.status(200).json({ message: "Login successful", user });
    });
  });
});
```

**Also Fix Registration:**
The same issue exists in the registration flow.

**Testing:**
```javascript
// Verify session ID changes after login
const sessionBefore = document.cookie;
await login(username, password);
const sessionAfter = document.cookie;
assert(sessionBefore !== sessionAfter);
```

**References:**
- OWASP Session Management: https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html

---

### Issue 6: User Enumeration via Search Endpoints

**Priority:** 🟠 HIGH
**Labels:** `security`, `information-disclosure`

**Description:**

The team and organization search endpoints allow unauthenticated or semi-authenticated users to enumerate all organizations and teams in the system.

**Impact:**
- Attackers can discover organization names
- Attackers can discover team names and associations
- Information disclosure about user base size
- Competitive intelligence gathering

**Affected Endpoints:**

1. **`GET /api/teams/search`** (line 376)
   - Returns all teams globally
   - No restriction to user's organizations
   - No rate limiting

2. **`POST /api/organizations/search`** (line 603)
   - Returns all organizations matching search
   - No rate limiting
   - Allows complete enumeration

3. **`GET /api/organizations/by-invite/:inviteCode`** (line 619)
   - Brute-forceable 8-character codes
   - No rate limiting
   - Reveals organization details

**Current Team Search Code:**
```typescript
// Line 376-393 - Returns ALL teams
app.get('/api/teams/search', isAuthenticated, async (req: AuthRequest, res) => {
  const query = req.query.q as string;

  const teams = await db
    .select()
    .from(teams)
    .where(like(teams.name, `%${query}%`));

  res.json(teams); // ❌ Returns ALL teams globally
});
```

**Recommended Fixes:**

```typescript
// OPTION 1: Restrict to user's organizations
app.get('/api/teams/search',
  rateLimit(20, 60 * 1000),
  isAuthenticated,
  async (req: AuthRequest, res) => {
    const query = req.query.q as string;

    // Get user's organizations
    const userOrgs = await storage.getUserOrganizations(req.currentUser!.id);
    const userOrgIds = userOrgs.map(o => o.id);

    // Only search teams in user's orgs
    const teams = await db
      .select()
      .from(teams)
      .where(
        and(
          like(teams.name, `%${query}%`),
          inArray(teams.organizationId, userOrgIds)
        )
      );

    res.json(teams);
  }
);

// OPTION 2: Make search org-scoped
app.get('/api/teams/search',
  rateLimit(20, 60 * 1000),
  isAuthenticated,
  async (req: AuthRequest, res) => {
    const query = req.query.q as string;
    const orgId = req.query.organizationId as string;

    if (!orgId) {
      return res.status(400).json({ message: "organizationId required" });
    }

    // Verify user has access to org
    const hasAccess = await hasOrganizationAccess(req.currentUser!.id, orgId);
    if (!hasAccess) {
      return res.status(403).json({ message: "Forbidden" });
    }

    const teams = await db
      .select()
      .from(teams)
      .where(
        and(
          like(teams.name, `%${query}%`),
          eq(teams.organizationId, orgId)
        )
      );

    res.json(teams);
  }
);
```

**For Invite Code Endpoint:**
```typescript
app.get('/api/organizations/by-invite/:inviteCode',
  rateLimit(3, 15 * 60 * 1000), // Very strict
  async (req, res) => {
    // ... existing code
  }
);
```

**Implementation Priority:**
1. Add rate limiting immediately
2. Restrict search scope to user's organizations
3. Consider removing global search entirely

---

## HIGH PRIORITY ISSUES

### Issue 7: Missing Email Verification

**Priority:** 🟡 MEDIUM
**Labels:** `security`, `enhancement`, `authentication`

**Description:**

User accounts are active immediately after registration without email verification, allowing:
- Spam account creation
- Account squatting
- Potential abuse through disposable emails

**Impact:**
- Users can register with any email (including someone else's)
- No proof of email ownership
- Difficult to contact users about security issues

**Current Flow:**
```typescript
// server/routes.ts:77
app.post('/api/auth/register', rateLimit(5, 15 * 60 * 1000), async (req, res) => {
  // ... validation
  const user = await storage.createUser(data);
  // ❌ User immediately active, no email verification
  req.login(user, (err) => { /* ... */ });
});
```

**Recommendation:**
1. Add `emailVerified` boolean field to users table
2. Generate verification token on registration
3. Send verification email
4. Restrict features until verified
5. Add `/api/auth/verify/:token` endpoint

---

### Issue 8: No Password Reset Functionality

**Priority:** 🟡 MEDIUM
**Labels:** `enhancement`, `authentication`

**Description:**

Users have no way to reset forgotten passwords, leading to:
- Account lockout
- Support burden
- Poor user experience

**Recommendation:**
1. Add password reset tokens table
2. Implement `/api/auth/forgot-password` endpoint
3. Implement `/api/auth/reset-password/:token` endpoint
4. Add email template for reset links

---

### Issue 9: Missing Logout Endpoint Authentication

**Priority:** 🟡 MEDIUM
**Labels:** `security`, `bug`

**Description:**

`POST /api/auth/logout` (line 141) has no `isAuthenticated` middleware, allowing unauthenticated users to call it.

**Affected File:**
- `server/routes.ts:141`

**Fix:**
```typescript
app.post('/api/auth/logout', isAuthenticated, async (req, res) => {
  // ... existing code
});
```

---

## CODE QUALITY ISSUES

### Issue 10: Dead Code - 5MB of Unused Files in attached_assets/

**Priority:** 🟡 MEDIUM
**Labels:** `technical-debt`, `cleanup`

**Description:**

The `attached_assets/` directory contains 5MB of old backup files, documentation, and duplicate code that should be removed.

**Impact:**
- Clutters repository
- Confuses developers
- Increases clone time
- May contain outdated/incorrect documentation

**Contents:**
```bash
$ du -sh attached_assets/
5.0M    attached_assets/

$ find attached_assets/ -type f | wc -l
28 files
```

**Files Include:**
- Old code backups (`messages_1762223351809.tsx`, etc.)
- Duplicate implementation files
- Old analysis reports (`.md` files)
- Old text dumps (`.txt` files)

**Example Duplicates:**
- `attached_assets/messages_1762223351809.tsx` - Old version of current `client/src/pages/messages.tsx`
- `attached_assets/db_1762223503615.ts` - Duplicate of `server/db.ts`
- Many ANALYSIS reports from previous audits

**Recommendation:**
1. Archive important documentation to `/docs` if needed
2. Delete the entire `attached_assets/` directory
3. Update `.gitignore` to prevent future backup pollution

**Proposed Command:**
```bash
# Review first, then delete
rm -rf /home/user/WORKOUTFLOW/attached_assets/

# Add to .gitignore
echo "attached_assets/" >> .gitignore
```

---

### Issue 11: Unused NPM Dependencies

**Priority:** 🟢 LOW
**Labels:** `technical-debt`, `dependencies`

**Description:**

Several packages in `package.json` are unused, increasing bundle size and dependency vulnerabilities.

**Unused Dependencies:**

1. **`openid-client`** (6.8.1)
   - Only used in `attached_assets/replitAuth_1762223503616.ts` (dead code)
   - Not used in active codebase
   - Size: ~200KB

2. **`memorystore`** (1.6.7)
   - No imports found anywhere
   - Likely replaced by `connect-pg-simple`
   - Size: ~50KB

3. **`react-icons`** (5.4.0)
   - Zero usages in client code
   - Using `lucide-react` instead
   - Size: ~5MB (!!)

4. **`framer-motion`** (11.13.1)
   - No imports in any file
   - Size: ~500KB

5. **`next-themes`** (0.4.6)
   - Using custom theme provider instead
   - No imports found
   - Size: ~50KB

**Evidence:**
```bash
# Check for usage
grep -r "openid-client" client/ server/
# No results in active code

grep -r "react-icons" client/
# No results

grep -r "framer-motion" client/
# No results
```

**Total Waste:**
- **~5.8MB** of unused dependencies
- Increased npm install time
- Potential security vulnerabilities in unused code

**Recommendation:**
```bash
npm uninstall openid-client memorystore react-icons framer-motion next-themes
```

**Before Removing:**
Verify with:
```bash
npm ls openid-client
npm ls memorystore
npm ls react-icons
npm ls framer-motion
npm ls next-themes
```

---

## UI/UX ISSUES

### Issue 12: Hardcoded Heights Breaking Mobile Responsiveness

**Priority:** 🟡 MEDIUM
**Labels:** `ui`, `mobile`, `bug`

**Description:**

Several pages use hardcoded pixel heights that break the layout on small screens, particularly mobile devices.

**Affected Files:**

1. **`client/src/pages/messages.tsx:195`**
   ```typescript
   <div className="grid h-[500px] lg:h-[calc(100vh-16rem)]">
   ```
   - Mobile sees fixed 500px height
   - Causes overflow on small viewports
   - Should use dynamic height

2. **`client/src/pages/messages.tsx:202`**
   ```typescript
   <ScrollArea className="h-[400px] lg:h-[calc(100vh-20rem)]">
   ```
   - Fixed 400px on mobile/tablet
   - Double scrollbars on short screens

3. **`client/src/pages/programs.tsx:471, 769, 1188`**
   ```typescript
   <DialogContent className="max-h-[90vh]">
   ```
   - Breaks on viewports < 400px height
   - No responsive fallback

4. **`client/src/pages/athletes.tsx:230`**
   ```typescript
   <div className="flex h-screen items-center justify-center">
   ```
   - Mobile address bars cause layout shift
   - Use `min-h-screen` instead

**Recommended Fixes:**

```typescript
// messages.tsx - Use responsive heights
<div className="grid h-[calc(100vh-20rem)] sm:h-[500px] lg:h-[calc(100vh-16rem)]">

// Use viewport units with safe fallbacks
<ScrollArea className="h-[60vh] sm:h-[400px] lg:h-[calc(100vh-20rem)]">

// programs.tsx - Add mobile-specific max height
<DialogContent className="max-h-[85vh] sm:max-h-[90vh]">

// athletes.tsx - Use min-h instead of h
<div className="flex min-h-screen items-center justify-center">
```

**Testing:**
Test on:
- iPhone SE (375x667)
- iPad Mini (768x1024)
- Desktop (1920x1080)

---

### Issue 13: Browser confirm() Dialog - Poor UX

**Priority:** 🟡 MEDIUM
**Labels:** `ui`, `ux`, `enhancement`

**Description:**

The program deletion uses browser's native `confirm()` dialog instead of a proper React modal.

**Affected File:**
- `client/src/pages/programs.tsx:879`

**Current Code:**
```typescript
if (window.confirm(`Are you sure you want to delete "${program.name}"?`)) {
  deleteProgramMutation.mutate(program.id);
}
```

**Problems:**
- ❌ Cannot be styled to match app design
- ❌ No undo option
- ❌ Doesn't explain consequences
- ❌ Blocks entire page (not modal)
- ❌ Poor accessibility

**Recommendation:**

Use AlertDialog from UI components:

```typescript
import { AlertDialog, AlertDialogTrigger, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from "@/components/ui/alert-dialog";

// In component
const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
const [programToDelete, setProgramToDelete] = useState<Program | null>(null);

<AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
  <AlertDialogContent>
    <AlertDialogHeader>
      <AlertDialogTitle>Delete Program</AlertDialogTitle>
      <AlertDialogDescription>
        Are you sure you want to delete "{programToDelete?.name}"?
        This will also delete all associated weeks, days, and exercises.
        This action cannot be undone.
      </AlertDialogDescription>
    </AlertDialogHeader>
    <AlertDialogFooter>
      <AlertDialogCancel>Cancel</AlertDialogCancel>
      <AlertDialogAction
        onClick={() => {
          if (programToDelete) {
            deleteProgramMutation.mutate(programToDelete.id);
          }
        }}
        className="bg-destructive hover:bg-destructive/90"
      >
        Delete
      </AlertDialogAction>
    </AlertDialogFooter>
  </AlertDialogContent>
</AlertDialog>
```

---

### Issue 14: Missing Accessibility Labels

**Priority:** 🟢 LOW
**Labels:** `accessibility`, `a11y`, `enhancement`

**Description:**

Several interactive elements lack proper ARIA labels and accessibility attributes, affecting screen reader users.

**Affected Files:**

1. **Message Input - `messages.tsx:351-371`**
   - No `aria-label` on input field
   - Screen readers can't identify purpose

2. **ScrollArea - `messages.tsx:264-272`**
   - No `aria-label` for scrollable region
   - Not labeled for assistive tech

3. **Email Input - `athletes.tsx:292-299`**
   - Label `htmlFor="email"` but Input has no `id`
   - Label-input connection broken

4. **Avatar Images - Multiple files**
   - Missing `alt` attributes on AvatarImage components
   - `athletes.tsx:370, 443`
   - `programs.tsx:1067, 1210, 1281`
   - `messages.tsx` various locations

**Fixes:**

```typescript
// messages.tsx - Add aria-label
<Input
  aria-label="Type your message"
  placeholder={selectedUserId ? "Type a message..." : "Select a user first..."}
  // ...
/>

// athletes.tsx - Fix label connection
<Label htmlFor="email">Email</Label>
<Input
  id="email"  // Add this
  type="email"
  // ...
/>

// Avatar images - Add alt text
<AvatarImage
  src={member.user.avatarUrl}
  alt={`${member.user.firstName} ${member.user.lastName}`}
/>
```

**Testing:**
- Use screen reader (NVDA, VoiceOver, JAWS)
- Run axe DevTools
- Check WCAG 2.1 AA compliance

---

### Issue 15: Missing Error States in Workout and Athletes Pages

**Priority:** 🟢 LOW
**Labels:** `ux`, `error-handling`, `enhancement`

**Description:**

While messages.tsx has good error handling, workout.tsx and athletes.tsx lack error states for failed mutations.

**Impact:**
- Users don't know when operations fail
- No retry mechanism
- Poor debugging experience

**Affected Files:**
- `client/src/pages/workout.tsx` - No error handling on set logging
- `client/src/pages/athletes.tsx` - No error UI for failed operations

**Recommendation:**

Add error states similar to messages.tsx:284-296:

```typescript
const { data, isLoading, isError, error, refetch } = useQuery({
  // ...
});

{isError && (
  <div className="flex flex-col items-center py-12">
    <AlertTriangle className="mb-4 h-12 w-12 text-destructive" />
    <h3 className="mb-2 text-lg font-semibold">Failed to load data</h3>
    <p className="mb-4 text-sm text-muted-foreground">
      {error instanceof Error ? error.message : 'Please try again'}
    </p>
    <Button onClick={() => refetch()} variant="outline">
      <RefreshCw className="mr-2 h-4 w-4" />
      Retry
    </Button>
  </div>
)}
```

---

## DATABASE RECOMMENDATIONS

### Issue 16: No Audit Logging for Sensitive Operations

**Priority:** 🟢 LOW
**Labels:** `enhancement`, `security`, `database`

**Description:**

The database lacks audit logging for sensitive operations, making it difficult to:
- Track who changed what
- Debug issues
- Detect unauthorized access
- Comply with security standards

**Recommended Implementation:**

Create an audit log table:

```typescript
export const auditLogs = pgTable("audit_logs", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: varchar("user_id").references(() => users.id, { onDelete: 'set null' }),
  action: varchar("action", { length: 50 }).notNull(), // 'create', 'update', 'delete'
  entityType: varchar("entity_type", { length: 50 }).notNull(), // 'user', 'program', 'message'
  entityId: varchar("entity_id").notNull(),
  changes: jsonb("changes"), // Store old/new values
  ipAddress: varchar("ip_address", { length: 45 }),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_audit_logs_user_id").on(table.userId),
  index("idx_audit_logs_entity").on(table.entityType, table.entityId),
  index("idx_audit_logs_created_at").on(table.createdAt),
]);
```

**Track These Operations:**
- User registration/login
- Program/team creation/deletion
- Permission changes (role updates)
- Organization membership changes
- Message deletion (if implemented)

---

### Issue 17: No Soft Deletes for Critical Data

**Priority:** 🟢 LOW
**Labels:** `enhancement`, `database`

**Description:**

All deletes are hard deletes. Consider soft deletes for:
- Programs
- Workout sessions
- Messages
- Teams

**Recommendation:**

Add `deletedAt` timestamp to critical tables:

```typescript
export const programs = pgTable("programs", {
  // ... existing fields
  deletedAt: timestamp("deleted_at"), // null = not deleted
}, (table) => [
  // ... existing indexes
  index("idx_programs_deleted_at").on(table.deletedAt),
]);
```

Update queries to filter out deleted:
```typescript
.where(and(
  eq(programs.organizationId, orgId),
  isNull(programs.deletedAt) // Only non-deleted
))
```

---

## SUMMARY

**Total Issues Found:** 17

**By Priority:**
- 🔴 Critical: 2
- 🟠 High: 4
- 🟡 Medium: 6
- 🟢 Low: 5

**By Category:**
- Security: 9 issues
- Code Quality: 2 issues
- UI/UX: 4 issues
- Database: 2 issues

**Immediate Actions Required:**
1. Implement CSRF token in frontend
2. Fix /today route ordering
3. Add rate limiting to critical endpoints
4. Remove dead code from attached_assets/

**Next Sprint:**
5. Implement email verification
6. Add password reset
7. Fix messaging permissions
8. Fix mobile responsiveness issues

---

## Implementation Checklist

- [ ] Issue 1: CSRF Token Implementation
- [ ] Issue 2: Route Ordering Fix
- [ ] Issue 3: Rate Limiting (Critical endpoints first)
- [ ] Issue 4: Messaging Permissions
- [ ] Issue 5: Session Regeneration
- [ ] Issue 6: Search Enumeration Fix
- [ ] Issue 7: Email Verification
- [ ] Issue 8: Password Reset
- [ ] Issue 9: Logout Authentication
- [ ] Issue 10: Remove Dead Code
- [ ] Issue 11: Remove Unused Dependencies
- [ ] Issue 12: Mobile Responsive Heights
- [ ] Issue 13: Replace confirm() Dialogs
- [ ] Issue 14: Accessibility Labels
- [ ] Issue 15: Error States
- [ ] Issue 16: Audit Logging
- [ ] Issue 17: Soft Deletes

---

**Branch:** `claude/audit-messaging-permissions-01NALJdNk64hwXNQnjqZbzYE`
**Generated:** 2025-11-20
**Auditor:** Claude Code Security Audit
