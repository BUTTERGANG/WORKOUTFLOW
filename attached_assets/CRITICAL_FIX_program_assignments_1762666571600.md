# CRITICAL FIX: Program Assignment Issues

## 🔴 Critical Bugs Found

### Bug 1: Missing API Route (BREAKING)
**Severity:** CRITICAL - Feature is completely broken

**Problem:** The client is calling a route that doesn't exist on the server.

**Client Code** (`client/src/pages/athletes.tsx:70`):
```typescript
const res = await fetch(`/api/program-assignments?teamId=${currentTeam!.id}`);
```

**Server Code:** This route DOES NOT EXIST. The server only has:
- `/api/athletes/:athleteId/assignments`
- `/api/programs/:programId/assignments`

**Impact:** The assignments query always fails silently. Athletes page shows no assignments.

---

### Bug 2: No Athlete Verification (SECURITY)
**Severity:** CRITICAL - Authorization bypass

**Problem:** When assigning a program, the server NEVER verifies that the athlete is part of the organization.

**Current Code** (`server/routes.ts:1155-1209`):
```typescript
// Only checks if COACH has access to organization
const hasAccess = await hasOrganizationAccess(req.currentUser!.id, program.organizationId);

// MISSING: Never checks if ATHLETE is in the organization!
const assignment = await storage.createProgramAssignment(data);
```

**Impact:** A coach can assign a program to ANY user in the entire system, even if they're not part of the organization. This is a major security flaw.

---

### Bug 3: No Team Relationship
**Severity:** HIGH - Data model issue

**Problem:** The `programAssignments` table has no `teamId` field, but the client is trying to filter by team.

**Schema** (`shared/schema.ts:225-238`):
```typescript
export const programAssignments = pgTable("program_assignments", {
  id: uuid("id").defaultRandom().primaryKey(),
  programId: uuid("program_id"),
  athleteId: varchar("athlete_id"),
  startDate: timestamp("start_date"),
  status: varchar("status"),
  assignedBy: varchar("assigned_by"),
  assignedAt: timestamp("assigned_at"),
  // MISSING: No teamId field!
});
```

**Impact:** Cannot filter assignments by team. All assignments are organization-wide only.

---

### Bug 4: No Duplicate Prevention
**Severity:** MEDIUM - Data integrity issue

**Problem:** No check to prevent assigning the same program to an athlete multiple times.

**Impact:** An athlete can have multiple active assignments for the same program, causing confusion.

---

### Bug 5: No Program Type Association
**Severity:** MEDIUM - Unclear data relationship

**Problem:** The assignment doesn't include the program details, requiring an additional query every time.

**Current Query** (`client/src/pages/athletes.tsx:66-74`):
```typescript
const { data: assignments } = useQuery<(ProgramAssignment & { program: Program })[]>({
  // Expects program data, but server doesn't return it
});
```

---

## 🔧 FIXES

### Fix 1: Add Missing API Route

**File:** `server/routes.ts`

**Add this route after line 1209:**

```typescript
// Get program assignments by team (for athletes page)
app.get('/api/program-assignments', isAuthenticated, async (req: AuthRequest, res) => {
  try {
    if (!req.currentUser) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const teamId = req.query.teamId as string | undefined;

    if (!teamId) {
      return res.status(400).json({ message: "Team ID required" });
    }

    // Verify user has access to this team
    const hasAccess = await hasTeamAccess(req.currentUser.id, teamId);
    if (!hasAccess) {
      return res.status(403).json({ message: "Forbidden: not a member of this team" });
    }

    // Get all team members
    const teamMembers = await storage.getTeamMembers(teamId);
    const athleteIds = teamMembers
      .filter(m => m.user.role === 'athlete')
      .map(m => m.userId);

    if (athleteIds.length === 0) {
      return res.json([]);
    }

    // Get assignments for all athletes in the team
    const allAssignments = await Promise.all(
      athleteIds.map(athleteId => storage.getAthleteAssignments(athleteId))
    );

    // Flatten and deduplicate
    const assignments = allAssignments.flat();

    // Fetch program details for each assignment
    const assignmentsWithPrograms = await Promise.all(
      assignments.map(async (assignment) => {
        const program = await storage.getProgram(assignment.programId);
        return {
          ...assignment,
          program,
        };
      })
    );

    res.json(assignmentsWithPrograms);
  } catch (error) {
    console.error("Error fetching team program assignments:", error);
    res.status(500).json({ message: "Failed to fetch program assignments" });
  }
});
```

---

### Fix 2: Add Athlete Verification to Assignment Creation

**File:** `server/routes.ts`

**Replace lines 1193-1200 with:**

```typescript
// Verify coach has access to both program and athlete
const hasAccess = await hasOrganizationAccess(req.currentUser!.id, program.organizationId);
if (!hasAccess) {
  return res.status(403).json({ message: "Forbidden: program not in your organization" });
}

// CRITICAL FIX: Verify athlete is also part of the organization
const athleteHasAccess = await hasOrganizationAccess(data.athleteId, program.organizationId);
if (!athleteHasAccess) {
  return res.status(403).json({
    message: "Forbidden: athlete is not a member of this organization"
  });
}

// Check if athlete already has an active assignment for this program
const existingAssignments = await storage.getAthleteAssignments(data.athleteId);
const hasActiveAssignment = existingAssignments.some(
  a => a.programId === data.programId && a.status === 'active'
);

if (hasActiveAssignment) {
  return res.status(400).json({
    message: "Athlete already has an active assignment for this program"
  });
}

const assignment = await storage.createProgramAssignment(data);
res.json(assignment);
```

---

### Fix 3: Add Program Details to Assignment Response

**File:** `server/storage.ts`

**Replace the `getAthleteAssignments` function (around line 1055):**

```typescript
async getAthleteAssignments(athleteId: string): Promise<(ProgramAssignment & { program: Program })[]> {
  const assignments = await db
    .select()
    .from(programAssignments)
    .where(eq(programAssignments.athleteId, athleteId))
    .orderBy(desc(programAssignments.assignedAt));

  // Fetch program details for each assignment
  const assignmentsWithPrograms = await Promise.all(
    assignments.map(async (assignment) => {
      const [program] = await db
        .select()
        .from(programs)
        .where(eq(programs.id, assignment.programId));

      return {
        ...assignment,
        program,
      };
    })
  );

  return assignmentsWithPrograms;
}
```

**Update the interface in `server/storage.ts` (around line 141):**

```typescript
getAthleteAssignments(athleteId: string): Promise<(ProgramAssignment & { program: Program })[]>;
```

---

### Fix 4: OPTIONAL - Add Team ID to Program Assignments (Database Change)

**WARNING:** This requires a database migration

**File:** `shared/schema.ts`

**Update the programAssignments table (line 225):**

```typescript
export const programAssignments = pgTable("program_assignments", {
  id: uuid("id").defaultRandom().primaryKey(),
  programId: uuid("program_id").notNull().references(() => programs.id, { onDelete: 'cascade' }),
  athleteId: varchar("athlete_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  teamId: uuid("team_id").references(() => teams.id, { onDelete: 'set null' }), // NEW FIELD
  startDate: timestamp("start_date").notNull(),
  status: varchar("status", { length: 50 }).default('active'),
  assignedBy: varchar("assigned_by").notNull().references(() => users.id, { onDelete: 'cascade' }),
  assignedAt: timestamp("assigned_at").defaultNow(),
}, (table) => [
  index("idx_program_assignments_program_id").on(table.programId),
  index("idx_program_assignments_athlete_id").on(table.athleteId),
  index("idx_program_assignments_team_id").on(table.teamId), // NEW INDEX
  index("idx_program_assignments_assigned_by").on(table.assignedBy),
  index("idx_program_assignments_assigned_at").on(table.assignedAt),
]);
```

**Then update the insert schema (around line 578):**

```typescript
export const insertProgramAssignmentSchema = createInsertSchema(programAssignments).omit({
  id: true,
  assignedAt: true,
}).extend({
  startDate: z.union([z.date(), z.string().transform(str => new Date(str))]),
  teamId: z.string().uuid().optional(), // NEW FIELD
});
```

**Run database migration:**
```bash
npm run db:push
```

**Then update the client to pass teamId:**

**File:** `client/src/pages/athletes.tsx`

**Line 197-201, replace with:**
```typescript
const handleAssignProgram = () => {
  if (!selectedProgram || !selectedAthlete || !startDate) return;
  assignProgramMutation.mutate({
    programId: selectedProgram,
    athleteId: selectedAthlete.userId,
    teamId: currentTeam?.id, // Pass team ID
    startDate,
  });
};
```

**And update the mutation type (line 114):**
```typescript
mutationFn: async (data: {
  programId: string;
  athleteId: string;
  teamId?: string;
  startDate: string
}) => {
```

---

## 🎯 Implementation Priority

**CRITICAL (Fix Immediately):**
1. ✅ **Fix 1** - Add missing API route (enables basic functionality)
2. ✅ **Fix 2** - Add athlete verification (fixes security hole)

**HIGH (Fix Soon):**
3. ✅ **Fix 3** - Add program details to response (improves performance)

**MEDIUM (Optional Enhancement):**
4. ⚠️ **Fix 4** - Add teamId to schema (requires migration, improves data model)

---

## 🧪 Testing Steps

After implementing fixes 1-3:

1. **Test Basic Assignment:**
   - Login as a coach
   - Go to Athletes page
   - Assign a program to an athlete in your organization
   - Verify the assignment appears on the athlete card

2. **Test Authorization:**
   - Try to assign a program to a user NOT in your organization
   - Should fail with "athlete is not a member of this organization"

3. **Test Duplicate Prevention:**
   - Try to assign the same program to the same athlete twice
   - Should fail with "already has an active assignment"

4. **Test Cross-Organization:**
   - Create two organizations
   - Verify Coach A cannot assign programs to Coach B's athletes

---

## 📊 Impact Analysis

**Before Fixes:**
- ❌ Program assignments don't show up (broken route)
- ❌ Can assign programs to anyone (security issue)
- ❌ Can assign same program multiple times (data integrity)
- ❌ Requires extra queries for program details (performance)

**After Fixes:**
- ✅ Program assignments display correctly
- ✅ Can only assign to org members (secure)
- ✅ Prevents duplicate assignments (clean data)
- ✅ Program details included (better performance)

---

## 🚨 Why This Wasn't Caught Earlier

This bug exists because:
1. The client was written to expect a route that was never implemented
2. No error handling for the failed query (fails silently)
3. No integration tests for the assignment flow
4. The assignments query is only enabled when `currentTeam` exists, hiding the error

---

**Document Created:** 2025-11-08
**Severity:** CRITICAL - Core feature is broken
**Estimated Fix Time:** 30-60 minutes for critical fixes (1-3)

---

## 📝 APPENDIX: COMPLETE CODE IMPLEMENTATIONS

### Complete Fix 1 Code - Add Missing API Route

**File:** `server/routes.ts`

**Location:** Add after line 1209 (after DELETE program-assignments route)

**Complete implementation:**

```typescript
// Get program assignments by team (for athletes page)
app.get('/api/program-assignments', isAuthenticated, async (req: AuthRequest, res) => {
  try {
    if (!req.currentUser) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const teamId = req.query.teamId as string | undefined;

    if (!teamId) {
      return res.status(400).json({ message: "Team ID required" });
    }

    // Verify user has access to this team
    const hasAccess = await hasTeamAccess(req.currentUser.id, teamId);
    if (!hasAccess) {
      return res.status(403).json({ message: "Forbidden: not a member of this team" });
    }

    // Get all team members (only athletes)
    const teamMembers = await storage.getTeamMembers(teamId);
    const athleteIds = teamMembers
      .filter(m => m.user.role === 'athlete')
      .map(m => m.userId);

    if (athleteIds.length === 0) {
      return res.json([]);
    }

    // Get assignments for all athletes in the team
    const allAssignments = await Promise.all(
      athleteIds.map(athleteId => storage.getAthleteAssignments(athleteId))
    );

    // Flatten the results
    const assignments = allAssignments.flat();

    res.json(assignments);
  } catch (error) {
    console.error("Error fetching team program assignments:", error);
    res.status(500).json({ message: "Failed to fetch program assignments" });
  }
});
```

---

### Complete Fix 2 Code - Add Athlete Verification

**File:** `server/routes.ts`

**Location:** Replace lines 1193-1201

**Find this code:**
```typescript
// Verify coach has access to both program and athlete
const hasAccess = await hasOrganizationAccess(req.currentUser!.id, program.organizationId);
if (!hasAccess) {
  return res.status(403).json({ message: "Forbidden: program not in your organization" });
}

const assignment = await storage.createProgramAssignment(data);
res.json(assignment);
```

**Replace with this:**
```typescript
// Verify coach has access to the organization
const hasAccess = await hasOrganizationAccess(req.currentUser!.id, program.organizationId);
if (!hasAccess) {
  return res.status(403).json({ message: "Forbidden: program not in your organization" });
}

// CRITICAL FIX: Verify athlete is also part of the organization
const athleteHasAccess = await hasOrganizationAccess(data.athleteId, program.organizationId);
if (!athleteHasAccess) {
  return res.status(403).json({
    message: "Forbidden: athlete is not a member of this organization"
  });
}

// Check if athlete already has an active assignment for this program
const existingAssignments = await storage.getAthleteAssignments(data.athleteId);
const hasActiveAssignment = existingAssignments.some(
  a => a.programId === data.programId && a.status === 'active'
);

if (hasActiveAssignment) {
  return res.status(400).json({
    message: "Athlete already has an active assignment for this program"
  });
}

const assignment = await storage.createProgramAssignment(data);
res.json(assignment);
```

---

### Complete Fix 3 Code - Include Program Details

**File:** `server/storage.ts`

**Location:** Around line 1055-1061

**Find this function:**
```typescript
async getAthleteAssignments(athleteId: string): Promise<ProgramAssignment[]> {
  return await db
    .select()
    .from(programAssignments)
    .where(eq(programAssignments.athleteId, athleteId))
    .orderBy(desc(programAssignments.assignedAt));
}
```

**Replace with:**
```typescript
async getAthleteAssignments(athleteId: string): Promise<(ProgramAssignment & { program: Program })[]> {
  const assignments = await db
    .select()
    .from(programAssignments)
    .where(eq(programAssignments.athleteId, athleteId))
    .orderBy(desc(programAssignments.assignedAt));

  // Fetch program details for each assignment
  const assignmentsWithPrograms = await Promise.all(
    assignments.map(async (assignment) => {
      const [program] = await db
        .select()
        .from(programs)
        .where(eq(programs.id, assignment.programId));

      return {
        ...assignment,
        program,
      };
    })
  );

  return assignmentsWithPrograms;
}
```

**Also update the interface at line 141:**

**Find:**
```typescript
getAthleteAssignments(athleteId: string): Promise<ProgramAssignment[]>;
```

**Replace with:**
```typescript
getAthleteAssignments(athleteId: string): Promise<(ProgramAssignment & { program: Program })[]>;
```

---

### Testing Script

**File:** Create `test-program-assignments.sh`

```bash
#!/bin/bash

echo "Testing Program Assignment Fixes..."

# Test 1: Get assignments by team (should work now)
echo -e "\n1. Testing GET /api/program-assignments?teamId=XXX"
curl -X GET "http://localhost:5000/api/program-assignments?teamId=YOUR_TEAM_ID" \
  -H "Cookie: connect.sid=YOUR_SESSION" \
  -v

# Test 2: Try to assign to athlete outside org (should fail)
echo -e "\n2. Testing security - assign to outside athlete"
curl -X POST "http://localhost:5000/api/program-assignments" \
  -H "Content-Type: application/json" \
  -H "Cookie: connect.sid=YOUR_SESSION" \
  -d '{
    "programId": "PROGRAM_ID",
    "athleteId": "OUTSIDE_ATHLETE_ID",
    "startDate": "2025-01-01"
  }' \
  -v

# Test 3: Duplicate assignment (should fail)
echo -e "\n3. Testing duplicate prevention"
curl -X POST "http://localhost:5000/api/program-assignments" \
  -H "Content-Type: application/json" \
  -H "Cookie: connect.sid=YOUR_SESSION" \
  -d '{
    "programId": "PROGRAM_ID",
    "athleteId": "ATHLETE_ID",
    "startDate": "2025-01-01"
  }' \
  -v

echo -e "\n\nTests complete!"
```

**Make executable:**
```bash
chmod +x test-program-assignments.sh
```
