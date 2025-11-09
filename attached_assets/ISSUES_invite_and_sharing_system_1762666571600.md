# Issues with Organization Invite & Program Sharing System

## 📋 Current State Analysis

### ✅ What Works (Organization Invites)

**Backend:**
- Invite codes auto-generated when creating organizations
- `GET /api/organizations/by-invite/:inviteCode` - Lookup org by code
- `POST /api/organizations/join/:inviteCode` - Join via code
- `ensureOrganizationHasInviteCode()` - Creates code if missing
- Invite codes are 8 characters, avoid ambiguous characters

**Frontend:**
- Dashboard shows invite code and shareable link (for coaches)
- `/join/:inviteCode` page - Athletes can join organizations
- Copy to clipboard functionality
- Join request flow (coach approval required)

### ❌ Critical Issues Found

---

## 🔴 Issue 1: Program Sharing Feature Doesn't Exist

**Severity:** MISSING FEATURE

**Problem:** You mentioned wanting to ensure the program sharing feature works, but **this feature doesn't exist at all**. There's currently no way to:
- Share a program via link
- Allow athletes to preview programs
- Copy/duplicate programs between organizations
- Export/import programs

**Current State:**
- Programs can only be assigned to athletes through the Athletes page
- No public or shareable links for programs
- No way for coaches to share programs with other coaches

**Impact:** Coaches cannot easily share workout programs with athletes outside the assignment flow, and cannot collaborate with other coaches by sharing programs.

---

## 🟡 Issue 2: Invite Code Not Guaranteed During Onboarding

**Severity:** HIGH - May break invite flow

**Problem:** When creating an organization during onboarding, the invite code is generated in `storage.createOrganization()`, but there's no explicit guarantee it's returned or stored properly.

**File:** `server/routes.ts` (lines 154-171)

**Current Code:**
```typescript
app.post('/api/organizations', isAuthenticated, async (req: AuthRequest, res) => {
  const data = insertOrganizationSchema.parse({ ...req.body, ownerId: userId });
  const org = await storage.createOrganization(data);

  // Update user role to admin
  await storage.updateUserRole(userId, 'admin');

  res.json(org); // Returns org with inviteCode
});
```

**Issue:** If `storage.createOrganization()` fails to generate the invite code (after 10 attempts), it throws an error. This could break onboarding entirely instead of allowing the org to be created without a code.

**Better Approach:** Allow organization creation to succeed even if invite code generation fails, and generate it lazily when needed.

---

## 🟡 Issue 3: No Way to View/Regenerate Invite Code

**Severity:** MEDIUM - UX issue

**Problem:** If a coach loses their invite code or wants to regenerate it for security reasons, there's no UI to do so.

**Current State:**
- Dashboard displays the code if it exists
- `ensureOrganizationHasInviteCode()` can generate one if missing
- But there's no button to regenerate or create new codes

**Missing Features:**
1. "Generate New Code" button (invalidate old one)
2. View invite analytics (who joined via the code)
3. Set expiration dates on invite codes
4. Create multiple invite codes for different purposes

---

## 🟡 Issue 4: Invite Link Not Visible on Athletes Page

**Severity:** MEDIUM - Discoverability issue

**Problem:** The invite link is only shown on the Dashboard, but coaches most commonly need it when they're on the Athletes page trying to add new members.

**File:** `client/src/pages/athletes.tsx`

**Current State:**
- Athletes page has "Add Athlete" button
- Opens dialog asking for email
- No option to copy/share invite link
- Coaches have to navigate back to Dashboard

**Recommendation:** Add invite link display to Athletes page header or in the "Add Athlete" dialog.

---

## 🟠 Issue 5: No Invite Link in Athlete Dialog

**Severity:** MEDIUM - UX friction

**Problem:** When clicking "Add Athlete" on the Athletes page, the dialog only allows email input. There's no quick way to copy the shareable link to send to the athlete.

**File:** `client/src/pages/athletes.tsx` (lines 286-323)

**Current Dialog:**
```typescript
<DialogContent>
  <DialogTitle>Add Athlete to Team</DialogTitle>
  <Input type="email" placeholder="athlete@example.com" />
  <p>If the user exists, they'll be added immediately.</p>
</DialogContent>
```

**Missing:**
- Tabs: "By Email" vs "By Invite Link"
- Display invite link with copy button
- QR code for easy mobile sharing

---

## 🟠 Issue 6: No Error Handling for Invalid Invite Codes

**Severity:** LOW - Edge case

**Problem:** The join flow handles 404 errors, but doesn't handle other failure modes.

**File:** `client/src/pages/join-via-invite.tsx` (lines 18-31)

**Missing Error Cases:**
1. Invite code expired (if expiration is added)
2. Organization deleted
3. Organization at member limit
4. User already in organization (handled, but could be better UX)

**Current Behavior:** Generic error message for all failures

---

## 🟠 Issue 7: Invite Analytics Missing

**Severity:** LOW - Nice to have

**Problem:** No way for coaches to track:
- How many people used the invite link
- Who joined via the invite link vs search
- When the link was used
- Success rate of invite links

**Data Not Captured:**
- Which invite code was used (if multiple exist)
- Referral source
- Join request conversion rate

---

## 🆕 MISSING FEATURE: Program Sharing

Since you mentioned wanting program sharing to work, here's a complete implementation plan:

### Option A: Public Program Links (Recommended)

**Concept:** Allow coaches to generate shareable links for programs that athletes can preview and request to be assigned.

**Implementation:**

**1. Add Program Share Codes to Schema**

**File:** `shared/schema.ts`

**Add to programs table:**
```typescript
export const programs = pgTable("programs", {
  id: uuid("id").defaultRandom().primaryKey(),
  // ... existing fields
  shareCode: varchar("share_code", { length: 8 }).unique(),
  isPublic: boolean("is_public").default(false),
  // ... rest of fields
});
```

**2. Server Routes**

**File:** `server/routes.ts`

**Add new endpoints:**
```typescript
// Generate share code for a program
app.post('/api/programs/:programId/generate-share-code', isAuthenticated, async (req: AuthRequest, res) => {
  try {
    const programId = req.params.programId;
    const program = await storage.getProgram(programId);

    if (!program) {
      return res.status(404).json({ message: "Program not found" });
    }

    // Verify user owns the program's organization
    const hasAccess = await hasOrganizationAccess(req.currentUser!.id, program.organizationId);
    if (!hasAccess) {
      return res.status(403).json({ message: "Forbidden" });
    }

    // Generate unique share code
    let shareCode = generateInviteCode(); // Reuse the same generator
    let attempts = 0;

    while (attempts < 10) {
      const existing = await db
        .select()
        .from(programs)
        .where(eq(programs.shareCode, shareCode))
        .limit(1);

      if (existing.length === 0) break;
      shareCode = generateInviteCode();
      attempts++;
    }

    if (attempts >= 10) {
      return res.status(500).json({ message: "Failed to generate share code" });
    }

    // Update program with share code and make it public
    await db
      .update(programs)
      .set({ shareCode, isPublic: true })
      .where(eq(programs.id, programId));

    res.json({ shareCode });
  } catch (error) {
    console.error("Error generating share code:", error);
    res.status(500).json({ message: "Failed to generate share code" });
  }
});

// Get program by share code (public view)
app.get('/api/programs/share/:shareCode', async (req: AuthRequest, res) => {
  try {
    const [program] = await db
      .select()
      .from(programs)
      .where(and(
        eq(programs.shareCode, req.params.shareCode),
        eq(programs.isPublic, true)
      ));

    if (!program) {
      return res.status(404).json({ message: "Program not found or not public" });
    }

    // Fetch program structure (weeks, days, exercises) - public preview
    const weeks = await storage.getProgramWeeks(program.id);

    res.json({
      program,
      weeks,
      // Don't include sensitive data like notes or organization details
    });
  } catch (error) {
    console.error("Error fetching program by share code:", error);
    res.status(500).json({ message: "Failed to fetch program" });
  }
});

// Request to be assigned a shared program
app.post('/api/programs/share/:shareCode/request', isAuthenticated, async (req: AuthRequest, res) => {
  try {
    const [program] = await db
      .select()
      .from(programs)
      .where(and(
        eq(programs.shareCode, req.params.shareCode),
        eq(programs.isPublic, true)
      ));

    if (!program) {
      return res.status(404).json({ message: "Program not found" });
    }

    // Check if user is in the same organization
    const userInOrg = await hasOrganizationAccess(req.currentUser!.id, program.organizationId);

    if (!userInOrg) {
      return res.status(403).json({
        message: "You must be a member of this organization to request this program"
      });
    }

    // Check if already assigned
    const existingAssignments = await storage.getAthleteAssignments(req.currentUser!.id);
    const alreadyAssigned = existingAssignments.some(a => a.programId === program.id && a.status === 'active');

    if (alreadyAssigned) {
      return res.status(400).json({ message: "You already have this program assigned" });
    }

    // Create program assignment request (or auto-assign if athlete)
    // For now, we'll auto-assign
    const assignment = await storage.createProgramAssignment({
      programId: program.id,
      athleteId: req.currentUser!.id,
      startDate: new Date(),
      assignedBy: program.createdBy, // Original creator
    });

    res.json(assignment);
  } catch (error) {
    console.error("Error requesting program:", error);
    res.status(500).json({ message: "Failed to request program" });
  }
});
```

**3. Frontend - Add Share Button to ProgramCard**

**File:** `client/src/pages/programs.tsx`

**Update ProgramCard component (after line 978):**
```typescript
function ProgramCard({ program, onView }: { program: Program; onView: () => void }) {
  const { toast } = useToast();
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [shareCode, setShareCode] = useState(program.shareCode || "");
  const [copiedShare, setCopiedShare] = useState(false);

  // ... existing code ...

  const generateShareCodeMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest<{ shareCode: string }>(
        `/api/programs/${program.id}/generate-share-code`,
        { method: 'POST' }
      );
    },
    onSuccess: (data) => {
      setShareCode(data.shareCode);
      queryClient.invalidateQueries({ queryKey: ['/api/programs'] });
      toast({ title: "Share link generated successfully" });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error?.message || "Failed to generate share link",
        variant: "destructive",
      });
    },
  });

  const copyShareLink = () => {
    const link = `${window.location.origin}/program/${shareCode}`;
    navigator.clipboard.writeText(link);
    setCopiedShare(true);
    toast({ title: "Share link copied to clipboard" });
    setTimeout(() => setCopiedShare(false), 2000);
  };

  return (
    <Card>
      {/* ... existing card content ... */}

      <CardContent className="space-y-3">
        {/* ... existing content ... */}

        <div className="flex gap-2">
          <Button
            variant="outline"
            className="flex-1 gap-2"
            onClick={(e) => {
              e.stopPropagation();
              setAssignDialogOpen(true);
            }}
          >
            <UserPlus className="h-4 w-4" />
            {assignedCount > 0 ? 'Manage Athletes' : 'Assign Athletes'}
          </Button>

          <Button
            variant="outline"
            size="icon"
            onClick={(e) => {
              e.stopPropagation();
              setShareDialogOpen(true);
            }}
            title="Share Program"
          >
            <Share2 className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>

      {/* Share Dialog */}
      <Dialog open={shareDialogOpen} onOpenChange={setShareDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Share Program</DialogTitle>
            <DialogDescription>
              Generate a shareable link for this program
            </DialogDescription>
          </DialogHeader>

          {shareCode ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Shareable Link</Label>
                <div className="flex gap-2">
                  <Input
                    value={`${window.location.origin}/program/${shareCode}`}
                    readOnly
                    className="font-mono text-sm"
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={copyShareLink}
                  >
                    {copiedShare ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              <Alert>
                <AlertDescription className="text-sm">
                  Athletes in your organization can use this link to preview and request this program.
                </AlertDescription>
              </Alert>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Generate a shareable link to allow athletes to preview and request this program.
              </p>

              <Button
                onClick={() => generateShareCodeMutation.mutate()}
                disabled={generateShareCodeMutation.isPending}
                className="w-full"
              >
                {generateShareCodeMutation.isPending ? "Generating..." : "Generate Share Link"}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Existing dialogs */}
      <AssignAthleteDialog ... />
    </Card>
  );
}
```

**4. Frontend - Program Preview Page**

**File:** Create new file `client/src/pages/program-preview.tsx`

```typescript
import { useRoute, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, Users, CheckCircle2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { Program, ProgramWeek } from "@shared/schema";

export default function ProgramPreview() {
  const [, params] = useRoute("/program/:shareCode");
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const shareCode = params?.shareCode;

  const { data, isLoading, error } = useQuery<{ program: Program; weeks: ProgramWeek[] }>({
    queryKey: ['/api/programs/share', shareCode],
    enabled: !!shareCode,
    queryFn: async () => {
      const res = await fetch(`/api/programs/share/${shareCode}`);
      if (!res.ok) throw new Error('Program not found');
      return res.json();
    },
  });

  const requestProgramMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest(`/api/programs/share/${shareCode}/request`, {
        method: 'POST',
      });
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Program has been assigned to you!",
      });
      setTimeout(() => setLocation('/'), 2000);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error?.message || "Failed to request program",
        variant: "destructive",
      });
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="mb-4 inline-block h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
          <p className="text-muted-foreground">Loading program...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex items-center justify-center min-h-screen p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-destructive">Program Not Found</CardTitle>
            <CardDescription>
              This program link is invalid or has been removed.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const { program, weeks } = data;

  return (
    <div className="min-h-screen p-4">
      <div className="mx-auto max-w-4xl space-y-6">
        {/* Program Header */}
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="text-3xl">{program.name}</CardTitle>
                {program.description && (
                  <CardDescription className="mt-2 text-base">
                    {program.description}
                  </CardDescription>
                )}
              </div>
            </div>

            <div className="flex flex-wrap gap-2 mt-4">
              <Badge variant="secondary" className="gap-1">
                <Calendar className="h-4 w-4" />
                {program.durationWeeks} weeks
              </Badge>
              {program.phase && (
                <Badge variant="outline">{program.phase}</Badge>
              )}
            </div>
          </CardHeader>

          <CardContent>
            <Button
              onClick={() => requestProgramMutation.mutate()}
              disabled={requestProgramMutation.isPending}
              size="lg"
              className="w-full gap-2"
            >
              {requestProgramMutation.isPending ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-background border-t-transparent" />
                  Requesting...
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4" />
                  Request This Program
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Program Structure */}
        <div className="space-y-4">
          <h2 className="text-2xl font-bold">Program Structure</h2>

          {weeks && weeks.length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {weeks.map((week) => (
                <Card key={week.id}>
                  <CardHeader>
                    <CardTitle className="text-lg">
                      Week {week.weekNumber}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      {week.days?.length || 0} workout days
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-muted-foreground">
                  This program structure will be visible once you join.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
```

**5. Add Route**

**File:** `client/src/App.tsx`

```typescript
import ProgramPreview from "@/pages/program-preview";

// Add to routes:
<Route path="/program/:shareCode" component={ProgramPreview} />
```

---

## 🎯 Recommended Fixes Priority

### Phase 1: Quick Fixes (30 minutes)
1. **Fix 4:** Add invite link to Athletes page header
2. **Fix 5:** Add "Copy Link" tab to "Add Athlete" dialog

### Phase 2: Program Sharing (2-3 hours)
3. **Missing Feature:** Implement basic program sharing
   - Add shareCode field to programs table
   - Add generate share code endpoint
   - Add share button to ProgramCard
   - Create program preview page

### Phase 3: Enhancements (1-2 hours)
4. **Fix 2:** Improve invite code generation robustness
5. **Fix 3:** Add "Regenerate Code" button
6. **Fix 6:** Better error handling for edge cases

### Phase 4: Analytics (Future)
7. **Fix 7:** Add invite analytics tracking

---

## 📊 Success Metrics

After implementing fixes:

**Organization Invites:**
- ✅ Invite link visible on both Dashboard and Athletes page
- ✅ Quick copy button in "Add Athlete" dialog
- ✅ Robust invite code generation (never fails org creation)
- ✅ Option to regenerate codes
- ✅ Better error messages for invalid codes

**Program Sharing (New):**
- ✅ Coaches can generate shareable program links
- ✅ Athletes can preview programs before requesting
- ✅ Public program preview page
- ✅ One-click "Request Program" flow
- ✅ Track which programs are shared

---

**Document Version:** 1.0
**Created:** 2025-11-08
**Issues Found:** 7
**Missing Features:** 1 (Program Sharing)
**Estimated Fix Time:** 4-6 hours total
