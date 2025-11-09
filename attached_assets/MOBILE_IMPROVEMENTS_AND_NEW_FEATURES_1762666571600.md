# Mobile-First Design Improvements & New Features

This document covers mobile responsiveness improvements, touch gesture optimizations, and new features: self-assignment, athlete search, and group assignments.

---

## 📱 PART 1: MOBILE-FIRST DESIGN IMPROVEMENTS

### Current Mobile Issues Found

**1. Touch Target Sizes Too Small**
- Buttons in many places are default size (h-10 = 40px) - should be 44-48px minimum on mobile
- Icon-only buttons lack sufficient padding
- Small click areas in program cards

**2. Dialogs Not Mobile-Optimized**
- Full-screen dialogs on mobile should slide from bottom (use Drawer instead)
- Too much content in single dialog screens
- Poor scrolling behavior

**3. No Swipe Gestures**
- No swipe-to-delete on lists
- No swipe navigation between workout exercises
- No pull-to-refresh

**4. Poor Text Readability**
- Some text too small on mobile (text-xs without mobile overrides)
- Insufficient line height for touch devices
- Poor contrast in some areas

**5. Fixed Layouts Breaking on Small Screens**
- Horizontal scrolling on some cards
- Overflow issues with long athlete names
- Grid layouts not adapting properly

---

## ✅ Mobile-First Best Practices to Implement

### 1. Touch Target Sizing

**Minimum Sizes:**
- Primary buttons: `h-12 px-6` (48px height) on mobile
- Icon buttons: `min-w-12 min-h-12` on mobile
- List items: `min-h-14` on mobile
- Inputs: `h-12` on mobile

**Implementation Pattern:**
```typescript
// Bad
<Button>Click Me</Button>

// Good - Mobile-first
<Button className="h-12 text-base sm:h-10 sm:text-sm">
  Click Me
</Button>
```

### 2. Use Drawer on Mobile, Dialog on Desktop

**Pattern:**
```typescript
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Drawer, DrawerContent } from "@/components/ui/drawer";

function ResponsiveModal({ open, onOpenChange, children }) {
  const isDesktop = useMediaQuery("(min-width: 768px)");

  if (isDesktop) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>{children}</DialogContent>
      </Dialog>
    );
  }

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent>{children}</DrawerContent>
    </Drawer>
  );
}
```

### 3. Swipe Gestures

Install swipe library:
```bash
npm install react-swipeable
```

**Swipe-to-delete pattern:**
```typescript
import { useSwipeable } from 'react-swipeable';

function SwipeableListItem({ item, onDelete }) {
  const [swipeOffset, setSwipeOffset] = useState(0);

  const handlers = useSwipeable({
    onSwiping: (e) => setSwipeOffset(e.deltaX),
    onSwipedLeft: () => {
      if (swipeOffset < -100) {
        onDelete(item.id);
      }
      setSwipeOffset(0);
    },
    onSwipedRight: () => setSwipeOffset(0),
    trackMouse: true,
  });

  return (
    <div {...handlers} style={{ transform: `translateX(${swipeOffset}px)` }}>
      <div className="relative">
        <div className="bg-destructive text-destructive-foreground absolute right-0 top-0 bottom-0 w-20 flex items-center justify-center">
          Delete
        </div>
        <div className="bg-background">
          {item.content}
        </div>
      </div>
    </div>
  );
}
```

### 4. Mobile Navigation Improvements

**Bottom Navigation for Mobile:**
```typescript
function MobileBottomNav() {
  const [location] = useLocation();

  const navItems = [
    { path: '/', icon: Home, label: 'Home' },
    { path: '/workout', icon: Dumbbell, label: 'Workout' },
    { path: '/messages', icon: MessageSquare, label: 'Messages' },
    { path: '/settings', icon: Settings, label: 'Settings' },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-background border-t md:hidden">
      <div className="flex items-center justify-around h-16">
        {navItems.map((item) => (
          <button
            key={item.path}
            onClick={() => window.location.href = item.path}
            className={cn(
              "flex flex-col items-center justify-center flex-1 h-full gap-1",
              location === item.path ? "text-primary" : "text-muted-foreground"
            )}
          >
            <item.icon className="h-6 w-6" />
            <span className="text-xs">{item.label}</span>
          </button>
        ))}
      </div>
    </nav>
  );
}
```

### 5. Pull-to-Refresh

```typescript
import { useState, useRef } from 'react';

function usePullToRefresh(onRefresh: () => Promise<void>) {
  const [isPulling, setIsPulling] = useState(false);
  const startY = useRef(0);
  const currentY = useRef(0);

  const handleTouchStart = (e: TouchEvent) => {
    startY.current = e.touches[0].clientY;
  };

  const handleTouchMove = (e: TouchEvent) => {
    currentY.current = e.touches[0].clientY;
    const diff = currentY.current - startY.current;

    if (diff > 80 && window.scrollY === 0) {
      setIsPulling(true);
    }
  };

  const handleTouchEnd = async () => {
    if (isPulling) {
      await onRefresh();
      setIsPulling(false);
    }
  };

  return { isPulling, handleTouchStart, handleTouchMove, handleTouchEnd };
}
```

---

## 🎯 PART 2: SPECIFIC MOBILE IMPROVEMENTS BY PAGE

### Fix 1: Workout Page (Most Critical - Used During Workouts)

**File:** `client/src/pages/workout.tsx`

**Issues:**
- Text too small when exercising
- Hard to tap inputs while sweating
- No swipe between exercises
- No rest timer with haptic feedback

**Implementation:**

```typescript
import { Vibration } from '@/lib/vibration'; // New utility
import { useSwipeable } from 'react-swipeable';

export default function Workout() {
  // ... existing code ...

  // Swipe between exercises
  const swipeHandlers = useSwipeable({
    onSwipedLeft: () => {
      if (currentExerciseIndex < (plannedExercises?.length || 0) - 1) {
        setCurrentExerciseIndex(prev => prev + 1);
      }
    },
    onSwipedRight: () => {
      if (currentExerciseIndex > 0) {
        setCurrentExerciseIndex(prev => prev - 1);
      }
    },
  });

  // Haptic feedback for rest timer completion
  useEffect(() => {
    if (restTimer === 0 && isResting) {
      Vibration.success();
      setIsResting(false);
    }
  }, [restTimer, isResting]);

  return (
    <div className="pb-20 md:pb-8"> {/* Extra padding for mobile bottom nav */}
      <div {...swipeHandlers} className="min-h-screen">
        {/* Large, tappable buttons */}
        <div className="grid grid-cols-2 gap-3 p-4">
          <Button
            size="lg"
            className="h-16 text-lg font-semibold"
            onClick={handleLogSet}
          >
            Log Set
          </Button>
          <Button
            size="lg"
            variant="outline"
            className="h-16 text-lg"
            onClick={startRest}
          >
            Start Rest
          </Button>
        </div>

        {/* Large inputs for sweaty fingers */}
        <div className="space-y-4 p-4">
          <div>
            <Label className="text-base mb-2 block">Weight (lbs)</Label>
            <Input
              type="number"
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              className="h-14 text-2xl text-center font-mono"
              inputMode="decimal"
            />
          </div>

          <div>
            <Label className="text-base mb-2 block">Reps</Label>
            <div className="flex gap-3">
              <Button
                size="lg"
                variant="outline"
                onClick={() => setReps(Math.max(1, reps - 1))}
                className="h-14 flex-1 text-2xl"
              >
                -
              </Button>
              <div className="h-14 flex-1 flex items-center justify-center text-3xl font-bold border rounded-md">
                {reps}
              </div>
              <Button
                size="lg"
                variant="outline"
                onClick={() => setReps(reps + 1)}
                className="h-14 flex-1 text-2xl"
              >
                +
              </Button>
            </div>
          </div>
        </div>

        {/* Rest Timer - Full width, visible */}
        {isResting && (
          <div className="fixed bottom-20 md:bottom-8 left-0 right-0 bg-primary text-primary-foreground p-6 shadow-lg">
            <div className="max-w-md mx-auto text-center">
              <p className="text-sm mb-2">Rest Time</p>
              <div className="text-6xl font-mono font-bold">
                {Math.floor(restTimer / 60)}:{String(restTimer % 60).padStart(2, '0')}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
```

**Add vibration utility:**

**File:** Create `client/src/lib/vibration.ts`

```typescript
export const Vibration = {
  // Short vibration for button feedback
  light: () => {
    if ('vibrate' in navigator) {
      navigator.vibrate(10);
    }
  },

  // Medium vibration for actions
  medium: () => {
    if ('vibrate' in navigator) {
      navigator.vibrate(50);
    }
  },

  // Success pattern
  success: () => {
    if ('vibrate' in navigator) {
      navigator.vibrate([50, 100, 50]);
    }
  },

  // Error pattern
  error: () => {
    if ('vibrate' in navigator) {
      navigator.vibrate([100, 50, 100]);
    }
  },
};
```

---

### Fix 2: Programs Page - Use Drawer on Mobile

**File:** `client/src/pages/programs.tsx`

**Replace Dialog usage with responsive modal:**

```typescript
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription } from "@/components/ui/drawer";

function ProgramBuilderDialog({ program, open, onOpenChange }) {
  const isDesktop = useMediaQuery("(min-width: 768px)");

  const content = (
    <div className="space-y-4">
      {/* Program builder content */}
    </div>
  );

  if (isDesktop) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>{program?.name}</DialogTitle>
          </DialogHeader>
          {content}
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[96vh]">
        <DrawerHeader>
          <DrawerTitle>{program?.name}</DrawerTitle>
        </DrawerHeader>
        <div className="overflow-y-auto px-4 pb-8">
          {content}
        </div>
      </DrawerContent>
    </Drawer>
  );
}
```

---

### Fix 3: Athletes Page - Swipe-to-Remove

**File:** `client/src/pages/athletes.tsx`

**Add swipe-to-remove for athlete cards:**

```typescript
import { useSwipeable } from 'react-swipeable';

function AthleteCard({ member, onRemove }) {
  const [swipeOffset, setSwipeOffset] = useState(0);
  const [showDelete, setShowDelete] = useState(false);

  const handlers = useSwipeable({
    onSwiping: (e) => {
      const offset = Math.min(0, Math.max(-100, e.deltaX));
      setSwipeOffset(offset);
      setShowDelete(offset < -50);
    },
    onSwiped: () => {
      if (showDelete) {
        onRemove(member.id);
      }
      setSwipeOffset(0);
      setShowDelete(false);
    },
    trackMouse: true,
  });

  return (
    <div className="relative overflow-hidden">
      {/* Delete background */}
      <div className="absolute right-0 top-0 bottom-0 w-24 bg-destructive flex items-center justify-center text-destructive-foreground">
        <Trash2 className="h-5 w-5" />
      </div>

      {/* Card content */}
      <div
        {...handlers}
        style={{ transform: `translateX(${swipeOffset}px)` }}
        className="transition-transform bg-card relative"
      >
        <Card>
          {/* Existing card content */}
        </Card>
      </div>
    </div>
  );
}
```

---

### Fix 4: Create useMediaQuery Hook

**File:** Create `client/src/hooks/useMediaQuery.ts`

```typescript
import { useState, useEffect } from 'react';

export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const media = window.matchMedia(query);

    if (media.matches !== matches) {
      setMatches(media.matches);
    }

    const listener = () => setMatches(media.matches);

    // Modern browsers
    if (media.addEventListener) {
      media.addEventListener('change', listener);
      return () => media.removeEventListener('change', listener);
    }

    // Fallback for older browsers
    media.addListener(listener);
    return () => media.removeListener(listener);
  }, [matches, query]);

  return matches;
}

// Convenience hooks
export function useIsMobile() {
  return useMediaQuery('(max-width: 767px)');
}

export function useIsTablet() {
  return useMediaQuery('(min-width: 768px) and (max-width: 1023px)');
}

export function useIsDesktop() {
  return useMediaQuery('(min-width: 1024px)');
}
```

---

## 🎯 PART 3: NEW FEATURES IMPLEMENTATION

### Feature 1: Self-Assignment (Assign Programs to Yourself)

**Backend Changes:**

**File:** `server/routes.ts`

**Add new route after line 1209:**

```typescript
// Allow users to assign programs to themselves
app.post('/api/program-assignments/self', isAuthenticated, async (req: AuthRequest, res) => {
  try {
    if (!req.currentUser) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const { programId, startDate } = req.body;

    // Verify program exists
    const program = await storage.getProgram(programId);
    if (!program) {
      return res.status(404).json({ message: "Program not found" });
    }

    // Verify user has access to the program's organization
    const hasAccess = await hasOrganizationAccess(req.currentUser.id, program.organizationId);
    if (!hasAccess) {
      return res.status(403).json({
        message: "Forbidden: program not in your organization"
      });
    }

    // Check if already assigned
    const existingAssignments = await storage.getAthleteAssignments(req.currentUser.id);
    const alreadyAssigned = existingAssignments.some(
      a => a.programId === programId && a.status === 'active'
    );

    if (alreadyAssigned) {
      return res.status(400).json({
        message: "You already have this program assigned"
      });
    }

    // Create self-assignment
    const assignment = await storage.createProgramAssignment({
      programId,
      athleteId: req.currentUser.id,
      startDate: new Date(startDate),
      assignedBy: req.currentUser.id, // Self-assigned
    });

    res.json(assignment);
  } catch (error: any) {
    console.error("Error creating self-assignment:", error);
    res.status(400).json({ message: error?.message || "Failed to assign program" });
  }
});
```

**Frontend - Add Self-Assign Button:**

**File:** `client/src/pages/programs.tsx`

**Update ProgramCard to show "Assign to Me" button for all users:**

```typescript
function ProgramCard({ program, onView }) {
  const { user } = useAuth();
  const [selfAssignOpen, setSelfAssignOpen] = useState(false);
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);

  // Check if user already has this program
  const { data: myAssignments } = useQuery<ProgramAssignment[]>({
    queryKey: ['/api/athletes', user?.id, 'assignments'],
    enabled: !!user,
  });

  const alreadyAssigned = myAssignments?.some(
    a => a.programId === program.id && a.status === 'active'
  );

  const selfAssignMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest('/api/program-assignments/self', {
        method: 'POST',
        body: { programId: program.id, startDate },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/athletes'] });
      toast({ title: "Success", description: "Program assigned to you!" });
      setSelfAssignOpen(false);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error?.message || "Failed to assign program",
        variant: "destructive",
      });
    },
  });

  return (
    <Card>
      {/* ... existing content ... */}

      <CardContent className="space-y-3">
        {/* ... existing badges ... */}

        <div className="grid gap-2">
          {/* Self-assign button - show for everyone */}
          {!alreadyAssigned && (
            <Button
              variant="outline"
              className="w-full gap-2 h-12 md:h-10"
              onClick={() => setSelfAssignOpen(true)}
            >
              <Plus className="h-4 w-4" />
              Assign to Me
            </Button>
          )}

          {alreadyAssigned && (
            <Badge variant="success" className="justify-center py-2">
              <Check className="h-4 w-4 mr-1" />
              Currently Assigned
            </Badge>
          )}

          {/* Coach-only buttons */}
          {isCoach(user) && (
            <>
              <Button
                variant="outline"
                className="w-full gap-2 h-12 md:h-10"
                onClick={() => setAssignDialogOpen(true)}
              >
                <UserPlus className="h-4 w-4" />
                Assign to Athletes
              </Button>

              <Button
                variant="ghost"
                className="w-full gap-2 h-12 md:h-10"
                onClick={onView}
              >
                <Eye className="h-4 w-4" />
                View/Edit Program
              </Button>
            </>
          )}
        </div>
      </CardContent>

      {/* Self-assign dialog */}
      <Dialog open={selfAssignOpen} onOpenChange={setSelfAssignOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Assign Program to Yourself</DialogTitle>
            <DialogDescription>
              Start "{program.name}" today or choose a future date
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="self-start-date">Start Date</Label>
              <Input
                id="self-start-date"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="h-12 md:h-10"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              onClick={() => selfAssignMutation.mutate()}
              disabled={selfAssignMutation.isPending}
              className="w-full h-12 md:h-10"
            >
              {selfAssignMutation.isPending ? "Assigning..." : "Confirm Assignment"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
```

---

### Feature 2: Searchable Athlete Selection

**File:** `client/src/pages/programs.tsx`

**Update AssignAthleteDialog to include search:**

```typescript
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";

function AssignAthleteDialog({ program, open, onOpenChange, currentAssignments }) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedAthletes, setSelectedAthletes] = useState<string[]>([]);

  // ... existing fetch logic ...

  // Filter athletes by search
  const filteredAthletes = availableAthletes.filter((athlete: User) => {
    const fullName = `${athlete.firstName} ${athlete.lastName}`.toLowerCase();
    const email = athlete.email?.toLowerCase() || '';
    const query = searchQuery.toLowerCase();
    return fullName.includes(query) || email.includes(query);
  });

  const toggleAthlete = (athleteId: string) => {
    setSelectedAthletes(prev =>
      prev.includes(athleteId)
        ? prev.filter(id => id !== athleteId)
        : [...prev, athleteId]
    );
  };

  const assignSelectedMutation = useMutation({
    mutationFn: async () => {
      // Assign to all selected athletes
      return Promise.all(
        selectedAthletes.map(athleteId =>
          apiRequest('/api/program-assignments', {
            method: 'POST',
            body: {
              programId: program.id,
              athleteId,
              startDate: new Date(startDate).toISOString(),
            },
          })
        )
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/programs', program.id, 'assignments'] });
      toast({
        title: "Success",
        description: `Assigned to ${selectedAthletes.length} athlete(s)`,
      });
      setSelectedAthletes([]);
      setSearchQuery("");
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-hidden flex flex-col sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Assign Athletes to Program</DialogTitle>
          <DialogDescription>
            Search and select athletes to assign "{program.name}"
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 flex-1 overflow-hidden flex flex-col">
          {/* Search Input */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search athletes by name or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-12 md:h-10"
            />
          </div>

          {/* Selected Count */}
          {selectedAthletes.length > 0 && (
            <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
              <span className="text-sm font-medium">
                {selectedAthletes.length} athlete(s) selected
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedAthletes([])}
              >
                Clear
              </Button>
            </div>
          )}

          {/* Athlete List */}
          <div className="flex-1 overflow-y-auto border rounded-lg">
            <Command>
              <CommandList>
                {filteredAthletes.length === 0 ? (
                  <CommandEmpty>
                    {searchQuery ? "No athletes found" : "No available athletes"}
                  </CommandEmpty>
                ) : (
                  <CommandGroup>
                    {filteredAthletes.map((athlete: User) => {
                      const isSelected = selectedAthletes.includes(athlete.id);
                      return (
                        <CommandItem
                          key={athlete.id}
                          onSelect={() => toggleAthlete(athlete.id)}
                          className="flex items-center gap-3 p-3 cursor-pointer"
                        >
                          <div className={cn(
                            "w-5 h-5 border-2 rounded flex items-center justify-center",
                            isSelected ? "bg-primary border-primary" : "border-muted-foreground"
                          )}>
                            {isSelected && <Check className="h-3 w-3 text-primary-foreground" />}
                          </div>

                          <Avatar className="h-10 w-10">
                            <AvatarImage src={athlete.profileImageUrl || undefined} />
                            <AvatarFallback>
                              {athlete.firstName?.[0]}{athlete.lastName?.[0]}
                            </AvatarFallback>
                          </Avatar>

                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate">
                              {athlete.firstName} {athlete.lastName}
                            </p>
                            <p className="text-sm text-muted-foreground truncate">
                              {athlete.email}
                            </p>
                          </div>
                        </CommandItem>
                      );
                    })}
                  </CommandGroup>
                )}
              </CommandList>
            </Command>
          </div>

          {/* Start Date */}
          <div>
            <Label htmlFor="start-date">Start Date</Label>
            <Input
              id="start-date"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="h-12 md:h-10"
            />
          </div>
        </div>

        <DialogFooter className="flex-row gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="flex-1 h-12 md:h-10"
          >
            Cancel
          </Button>
          <Button
            onClick={() => assignSelectedMutation.mutate()}
            disabled={selectedAthletes.length === 0 || assignSelectedMutation.isPending}
            className="flex-1 h-12 md:h-10"
          >
            {assignSelectedMutation.isPending
              ? "Assigning..."
              : `Assign to ${selectedAthletes.length || 0}`
            }
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

---

### Feature 3: Athlete Groups for Batch Assignment

**Backend - Add Groups Schema:**

**File:** `shared/schema.ts`

**Add new table after teams (around line 120):**

```typescript
export const athleteGroups = pgTable("athlete_groups", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id").notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  name: varchar("name", { length: 100 }).notNull(),
  description: text("description"),
  createdBy: varchar("created_by").notNull().references(() => users.id, { onDelete: 'cascade' }),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_athlete_groups_org_id").on(table.organizationId),
]);

export const athleteGroupMembers = pgTable("athlete_group_members", {
  id: uuid("id").defaultRandom().primaryKey(),
  groupId: uuid("group_id").notNull().references(() => athleteGroups.id, { onDelete: 'cascade' }),
  athleteId: varchar("athlete_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  addedAt: timestamp("added_at").defaultNow(),
}, (table) => [
  index("idx_group_members_group_id").on(table.groupId),
  index("idx_group_members_athlete_id").on(table.athleteId),
  unique("unique_group_member").on(table.groupId, table.athleteId),
]);
```

**Add types:**

```typescript
export const insertAthleteGroupSchema = createInsertSchema(athleteGroups).omit({
  id: true,
  createdAt: true,
});

export const insertAthleteGroupMemberSchema = createInsertSchema(athleteGroupMembers).omit({
  id: true,
  addedAt: true,
});

export type AthleteGroup = typeof athleteGroups.$inferSelect;
export type InsertAthleteGroup = z.infer<typeof insertAthleteGroupSchema>;

export type AthleteGroupMember = typeof athleteGroupMembers.$inferSelect;
export type InsertAthleteGroupMember = z.infer<typeof insertAthleteGroupMemberSchema>;
```

**Backend - Add Group Routes:**

**File:** `server/routes.ts`

**Add after teams routes:**

```typescript
// ============================================
// ATHLETE GROUP ROUTES
// ============================================

app.post('/api/athlete-groups', isAuthenticated, async (req: AuthRequest, res) => {
  try {
    const data = insertAthleteGroupSchema.parse({
      ...req.body,
      createdBy: req.currentUser!.id,
    });

    // Verify user has access to organization
    const hasAccess = await hasOrganizationAccess(req.currentUser!.id, data.organizationId);
    if (!hasAccess) {
      return res.status(403).json({ message: "Forbidden" });
    }

    const group = await storage.createAthleteGroup(data);
    res.json(group);
  } catch (error: any) {
    console.error("Error creating athlete group:", error);
    res.status(400).json({ message: error?.message || "Failed to create group" });
  }
});

app.get('/api/organizations/:orgId/athlete-groups', isAuthenticated, async (req: AuthRequest, res) => {
  try {
    const hasAccess = await hasOrganizationAccess(req.currentUser!.id, req.params.orgId);
    if (!hasAccess) {
      return res.status(403).json({ message: "Forbidden" });
    }

    const groups = await storage.getOrganizationGroups(req.params.orgId);
    res.json(groups);
  } catch (error) {
    console.error("Error fetching groups:", error);
    res.status(500).json({ message: "Failed to fetch groups" });
  }
});

app.post('/api/athlete-groups/:groupId/members', isAuthenticated, async (req: AuthRequest, res) => {
  try {
    const { athleteIds } = req.body; // Array of athlete IDs

    // Verify access to group
    const group = await storage.getAthleteGroup(req.params.groupId);
    if (!group) {
      return res.status(404).json({ message: "Group not found" });
    }

    const hasAccess = await hasOrganizationAccess(req.currentUser!.id, group.organizationId);
    if (!hasAccess) {
      return res.status(403).json({ message: "Forbidden" });
    }

    // Add all athletes to group
    const members = await Promise.all(
      athleteIds.map((athleteId: string) =>
        storage.addAthleteToGroup({ groupId: req.params.groupId, athleteId })
      )
    );

    res.json(members);
  } catch (error: any) {
    console.error("Error adding group members:", error);
    res.status(400).json({ message: error?.message || "Failed to add members" });
  }
});

app.get('/api/athlete-groups/:groupId/members', isAuthenticated, async (req: AuthRequest, res) => {
  try {
    const members = await storage.getGroupMembers(req.params.groupId);
    res.json(members);
  } catch (error) {
    console.error("Error fetching group members:", error);
    res.status(500).json({ message: "Failed to fetch members" });
  }
});

// Assign program to entire group
app.post('/api/athlete-groups/:groupId/assign-program', isAuthenticated, async (req: AuthRequest, res) => {
  try {
    const { programId, startDate } = req.body;

    // Get all group members
    const members = await storage.getGroupMembers(req.params.groupId);

    // Create assignment for each member
    const assignments = await Promise.all(
      members.map(member =>
        storage.createProgramAssignment({
          programId,
          athleteId: member.athleteId,
          startDate: new Date(startDate),
          assignedBy: req.currentUser!.id,
        })
      )
    );

    res.json({ count: assignments.length, assignments });
  } catch (error: any) {
    console.error("Error assigning program to group:", error);
    res.status(400).json({ message: error?.message || "Failed to assign program" });
  }
});
```

**Storage Layer:**

**File:** `server/storage.ts`

**Add to IStorage interface:**

```typescript
// Athlete group operations
createAthleteGroup(group: InsertAthleteGroup): Promise<AthleteGroup>;
getAthleteGroup(id: string): Promise<AthleteGroup | undefined>;
getOrganizationGroups(organizationId: string): Promise<AthleteGroup[]>;
addAthleteToGroup(member: InsertAthleteGroupMember): Promise<AthleteGroupMember>;
getGroupMembers(groupId: string): Promise<AthleteGroupMember[]>;
removeAthleteFromGroup(groupId: string, athleteId: string): Promise<void>;
deleteAthleteGroup(id: string): Promise<void>;
```

**Implement in StorageService class:**

```typescript
async createAthleteGroup(groupData: InsertAthleteGroup): Promise<AthleteGroup> {
  const [group] = await db
    .insert(athleteGroups)
    .values(groupData)
    .returning();
  return group;
}

async getAthleteGroup(id: string): Promise<AthleteGroup | undefined> {
  const [group] = await db
    .select()
    .from(athleteGroups)
    .where(eq(athleteGroups.id, id));
  return group;
}

async getOrganizationGroups(organizationId: string): Promise<AthleteGroup[]> {
  return await db
    .select()
    .from(athleteGroups)
    .where(eq(athleteGroups.organizationId, organizationId))
    .orderBy(athleteGroups.name);
}

async addAthleteToGroup(memberData: InsertAthleteGroupMember): Promise<AthleteGroupMember> {
  const [member] = await db
    .insert(athleteGroupMembers)
    .values(memberData)
    .returning();
  return member;
}

async getGroupMembers(groupId: string): Promise<AthleteGroupMember[]> {
  return await db
    .select()
    .from(athleteGroupMembers)
    .where(eq(athleteGroupMembers.groupId, groupId));
}

async removeAthleteFromGroup(groupId: string, athleteId: string): Promise<void> {
  await db
    .delete(athleteGroupMembers)
    .where(
      and(
        eq(athleteGroupMembers.groupId, groupId),
        eq(athleteGroupMembers.athleteId, athleteId)
      )
    );
}

async deleteAthleteGroup(id: string): Promise<void> {
  await db.delete(athleteGroups).where(eq(athleteGroups.id, id));
}
```

**Frontend - Groups UI:**

**File:** Update `client/src/pages/programs.tsx`

**Add Groups Tab to AssignAthleteDialog:**

```typescript
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

function AssignAthleteDialog({ program, open, onOpenChange, currentAssignments }) {
  const [activeTab, setActiveTab] = useState("individuals");
  const { currentOrganization } = useApp();

  // Fetch groups
  const { data: groups } = useQuery<AthleteGroup[]>({
    queryKey: ['/api/organizations', currentOrganization?.id, 'athlete-groups'],
    enabled: !!currentOrganization && open,
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Assign Program to Athletes</DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 overflow-hidden flex flex-col">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="individuals">
              <Users className="h-4 w-4 mr-2" />
              Individuals
            </TabsTrigger>
            <TabsTrigger value="groups">
              <UsersIcon className="h-4 w-4 mr-2" />
              Groups
            </TabsTrigger>
          </TabsList>

          <TabsContent value="individuals" className="flex-1 overflow-hidden">
            {/* Individual athlete selection (previous implementation) */}
          </TabsContent>

          <TabsContent value="groups" className="flex-1 overflow-y-auto space-y-4">
            {/* Groups selection */}
            <GroupAssignmentView
              program={program}
              groups={groups || []}
              startDate={startDate}
              onSuccess={() => {
                queryClient.invalidateQueries({ queryKey: ['/api/programs', program.id, 'assignments'] });
                onOpenChange(false);
              }}
            />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

function GroupAssignmentView({ program, groups, startDate, onSuccess }) {
  const { toast } = useToast();
  const [selectedGroups, setSelectedGroups] = useState<string[]>([]);

  const assignToGroupsMutation = useMutation({
    mutationFn: async () => {
      return Promise.all(
        selectedGroups.map(groupId =>
          apiRequest(`/api/athlete-groups/${groupId}/assign-program`, {
            method: 'POST',
            body: { programId: program.id, startDate },
          })
        )
      );
    },
    onSuccess: (results) => {
      const totalAssigned = results.reduce((sum, r: any) => sum + r.count, 0);
      toast({
        title: "Success",
        description: `Assigned to ${totalAssigned} athlete(s) across ${selectedGroups.length} group(s)`,
      });
      onSuccess();
    },
  });

  return (
    <div className="space-y-4">
      {groups.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <UsersIcon className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground mb-4">No groups created yet</p>
            <Button variant="outline" onClick={() => {/* Open create group dialog */}}>
              Create Group
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {groups.map((group) => (
            <Card
              key={group.id}
              className={cn(
                "cursor-pointer transition-colors",
                selectedGroups.includes(group.id) && "border-primary bg-primary/5"
              )}
              onClick={() => {
                setSelectedGroups(prev =>
                  prev.includes(group.id)
                    ? prev.filter(id => id !== group.id)
                    : [...prev, group.id]
                );
              }}
            >
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "w-5 h-5 border-2 rounded flex items-center justify-center",
                    selectedGroups.includes(group.id) ? "bg-primary border-primary" : "border-muted-foreground"
                  )}>
                    {selectedGroups.includes(group.id) && (
                      <Check className="h-3 w-3 text-primary-foreground" />
                    )}
                  </div>

                  <div className="flex-1">
                    <p className="font-medium">{group.name}</p>
                    {group.description && (
                      <p className="text-sm text-muted-foreground">{group.description}</p>
                    )}
                  </div>

                  <Badge variant="secondary">
                    {/* Show member count */}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Button
        onClick={() => assignToGroupsMutation.mutate()}
        disabled={selectedGroups.length === 0 || assignToGroupsMutation.isPending}
        className="w-full h-12"
      >
        {assignToGroupsMutation.isPending
          ? "Assigning..."
          : `Assign to ${selectedGroups.length} Group(s)`
        }
      </Button>
    </div>
  );
}
```

---

## 📋 Implementation Checklist

### Phase 1: Mobile-First Improvements (2-3 hours)
- [ ] Install `react-swipeable` package
- [ ] Create `useMediaQuery` hook
- [ ] Create vibration utility
- [ ] Update Workout page with larger touch targets
- [ ] Add swipe gestures to Workout page
- [ ] Replace Dialogs with Drawers on mobile (Programs, Athletes)
- [ ] Add swipe-to-delete on Athletes page
- [ ] Increase all button sizes to h-12 on mobile
- [ ] Add bottom navigation for mobile

### Phase 2: Self-Assignment (1 hour)
- [ ] Add self-assignment route to server
- [ ] Update ProgramCard with "Assign to Me" button
- [ ] Create self-assignment dialog
- [ ] Test assignment flow

### Phase 3: Athlete Search (1 hour)
- [ ] Update AssignAthleteDialog with Command component
- [ ] Add search input with filtering
- [ ] Add multi-select checkboxes
- [ ] Test search and selection

### Phase 4: Athlete Groups (2-3 hours)
- [ ] Add database schema for groups
- [ ] Run migration: `npm run db:push`
- [ ] Add group routes to server
- [ ] Implement group storage functions
- [ ] Create GroupManagement page/dialog
- [ ] Add Groups tab to assignment dialog
- [ ] Test batch assignment to groups

---

## 🎯 Success Metrics

**Mobile Responsiveness:**
- ✅ All touch targets minimum 44px on mobile
- ✅ Swipe gestures work smoothly
- ✅ Bottom navigation on mobile
- ✅ Drawers instead of dialogs on mobile
- ✅ Text readable at all sizes
- ✅ No horizontal scrolling

**New Features:**
- ✅ Users can assign programs to themselves
- ✅ Search works with 100+ athletes
- ✅ Multi-select for batch assignment
- ✅ Groups created and managed easily
- ✅ Bulk assignment to groups works

---

**Document Version:** 1.0
**Created:** 2025-11-08
**Features:** Mobile-first design + 3 new features
**Estimated Time:** 6-9 hours total

---

## 📝 APPENDIX A: COMPLETE UTILITY FILES

### File 1: useMediaQuery Hook

**File:** `client/src/hooks/useMediaQuery.ts` (CREATE NEW)

```typescript
import { useState, useEffect } from 'react';

export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const media = window.matchMedia(query);

    if (media.matches !== matches) {
      setMatches(media.matches);
    }

    const listener = () => setMatches(media.matches);

    // Modern browsers
    if (media.addEventListener) {
      media.addEventListener('change', listener);
      return () => media.removeEventListener('change', listener);
    }

    // Fallback for older browsers
    media.addListener(listener);
    return () => media.removeListener(listener);
  }, [matches, query]);

  return matches;
}

// Convenience hooks
export function useIsMobile() {
  return useMediaQuery('(max-width: 767px)');
}

export function useIsTablet() {
  return useMediaQuery('(min-width: 768px) and (max-width: 1023px)');
}

export function useIsDesktop() {
  return useMediaQuery('(min-width: 1024px)');
}
```

---

### File 2: Vibration Utility

**File:** `client/src/lib/vibration.ts` (CREATE NEW)

```typescript
/**
 * Haptic feedback utility for mobile devices
 * Provides vibration patterns for different actions
 */
export const Vibration = {
  // Short vibration for button feedback
  light: () => {
    if ('vibrate' in navigator) {
      navigator.vibrate(10);
    }
  },

  // Medium vibration for actions
  medium: () => {
    if ('vibrate' in navigator) {
      navigator.vibrate(50);
    }
  },

  // Success pattern (short-pause-short)
  success: () => {
    if ('vibrate' in navigator) {
      navigator.vibrate([50, 100, 50]);
    }
  },

  // Error pattern (long-short-long)
  error: () => {
    if ('vibrate' in navigator) {
      navigator.vibrate([100, 50, 100]);
    }
  },

  // Long press feedback
  longPress: () => {
    if ('vibrate' in navigator) {
      navigator.vibrate(100);
    }
  },

  // Cancel any ongoing vibration
  cancel: () => {
    if ('vibrate' in navigator) {
      navigator.vibrate(0);
    }
  },
};
```

---

### File 3: Responsive Modal Component

**File:** `client/src/components/ResponsiveModal.tsx` (CREATE NEW)

```typescript
import { ReactNode } from "react";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription } from "@/components/ui/drawer";

interface ResponsiveModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
}

export function ResponsiveModal({
  open,
  onOpenChange,
  title,
  description,
  children,
  className = "sm:max-w-[600px]",
}: ResponsiveModalProps) {
  const isDesktop = useMediaQuery("(min-width: 768px)");

  if (isDesktop) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className={className}>
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            {description && <DialogDescription>{description}</DialogDescription>}
          </DialogHeader>
          {children}
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[96vh]">
        <DrawerHeader>
          <DrawerTitle>{title}</DrawerTitle>
          {description && <DrawerDescription>{description}</DrawerDescription>}
        </DrawerHeader>
        <div className="overflow-y-auto px-4 pb-8">
          {children}
        </div>
      </DrawerContent>
    </Drawer>
  );
}
```

---

### File 4: Mobile Bottom Navigation

**File:** `client/src/components/MobileBottomNav.tsx` (CREATE NEW)

```typescript
import { useLocation } from "wouter";
import { Home, Dumbbell, MessageSquare, Settings } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";

export function MobileBottomNav() {
  const [location, setLocation] = useLocation();
  const { user } = useAuth();

  const navItems = [
    { path: '/', icon: Home, label: 'Home' },
    { path: '/workout', icon: Dumbbell, label: 'Workout', roles: ['athlete'] },
    { path: '/programs', icon: Dumbbell, label: 'Programs', roles: ['admin', 'head_coach', 'assistant_coach'] },
    { path: '/messages', icon: MessageSquare, label: 'Messages' },
    { path: '/settings', icon: Settings, label: 'Settings' },
  ];

  // Filter nav items by user role
  const visibleItems = navItems.filter(item =>
    !item.roles || (user?.role && item.roles.includes(user.role))
  );

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-background border-t border-border md:hidden safe-area-bottom">
      <div className="flex items-center justify-around h-16 max-w-lg mx-auto">
        {visibleItems.map((item) => {
          const isActive = location === item.path;
          return (
            <button
              key={item.path}
              onClick={() => setLocation(item.path)}
              className={cn(
                "flex flex-col items-center justify-center flex-1 h-full gap-1 transition-colors touch-manipulation",
                isActive ? "text-primary" : "text-muted-foreground active:text-primary"
              )}
            >
              <item.icon className={cn("h-6 w-6", isActive && "fill-current")} />
              <span className="text-xs font-medium">{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}

// Add to App.tsx layout:
// <MobileBottomNav />
// And add pb-20 to main content container on mobile
```

---

## 📝 APPENDIX B: COMPLETE FEATURE IMPLEMENTATIONS

### Feature 1: Self-Assignment - Complete Code

**Backend Route:**

**File:** `server/routes.ts`

**Add after program assignment routes (around line 1250):**

```typescript
// ============================================
// SELF-ASSIGNMENT ROUTE
// ============================================

app.post('/api/program-assignments/self', isAuthenticated, async (req: AuthRequest, res) => {
  try {
    if (!req.currentUser) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const { programId, startDate } = req.body;

    if (!programId || !startDate) {
      return res.status(400).json({ message: "Program ID and start date are required" });
    }

    // Verify program exists
    const program = await storage.getProgram(programId);
    if (!program) {
      return res.status(404).json({ message: "Program not found" });
    }

    // Verify user has access to the program's organization
    const hasAccess = await hasOrganizationAccess(req.currentUser.id, program.organizationId);
    if (!hasAccess) {
      return res.status(403).json({
        message: "Forbidden: program not in your organization"
      });
    }

    // Check if already assigned
    const existingAssignments = await storage.getAthleteAssignments(req.currentUser.id);
    const alreadyAssigned = existingAssignments.some(
      a => a.programId === programId && a.status === 'active'
    );

    if (alreadyAssigned) {
      return res.status(400).json({
        message: "You already have this program assigned"
      });
    }

    // Create self-assignment
    const assignment = await storage.createProgramAssignment({
      programId,
      athleteId: req.currentUser.id,
      startDate: new Date(startDate),
      assignedBy: req.currentUser.id, // Self-assigned
    });

    res.json(assignment);
  } catch (error: any) {
    console.error("Error creating self-assignment:", error);
    res.status(400).json({ message: error?.message || "Failed to assign program" });
  }
});
```

**Frontend Component:**

**File:** `client/src/pages/programs.tsx`

**Add this component before the main Programs export:**

```typescript
// Self-Assignment Dialog Component
function SelfAssignDialog({
  program,
  open,
  onOpenChange,
}: {
  program: Program;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { toast } = useToast();
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);

  const selfAssignMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest('/api/program-assignments/self', {
        method: 'POST',
        body: { programId: program.id, startDate },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/athletes'] });
      queryClient.invalidateQueries({ queryKey: ['/api/programs'] });
      toast({
        title: "Success",
        description: "Program assigned to you! Check your Workout page."
      });
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error?.message || "Failed to assign program",
        variant: "destructive",
      });
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Assign to Yourself</DialogTitle>
          <DialogDescription>
            Start "{program.name}" on your chosen date
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="self-start-date">Start Date</Label>
            <Input
              id="self-start-date"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="h-12 md:h-10"
              min={new Date().toISOString().split('T')[0]}
            />
            <p className="text-xs text-muted-foreground">
              Choose today to start immediately, or a future date
            </p>
          </div>
        </div>

        <DialogFooter className="flex-col gap-2 sm:flex-row">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="w-full h-12 md:h-10"
          >
            Cancel
          </Button>
          <Button
            onClick={() => selfAssignMutation.mutate()}
            disabled={selfAssignMutation.isPending || !startDate}
            className="w-full h-12 md:h-10"
          >
            {selfAssignMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Assigning...
              </>
            ) : (
              <>
                <Check className="mr-2 h-4 w-4" />
                Confirm Assignment
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

**Update ProgramCard to include self-assign button:**

**In ProgramCard component, add these states:**
```typescript
const [selfAssignOpen, setSelfAssignOpen] = useState(false);

// Check if user already has this program
const { data: myAssignments } = useQuery<ProgramAssignment[]>({
  queryKey: ['/api/athletes', user?.id, 'assignments'],
  enabled: !!user,
});

const alreadyAssigned = myAssignments?.some(
  a => a.programId === program.id && a.status === 'active'
);
```

**In the CardContent, replace the button section with:**
```typescript
<CardContent className="space-y-3">
  {/* ... existing badges ... */}

  <div className="grid gap-2">
    {/* Self-assign button - for all users */}
    {!alreadyAssigned ? (
      <Button
        variant="outline"
        className="w-full gap-2 h-12 md:h-10"
        onClick={(e) => {
          e.stopPropagation();
          setSelfAssignOpen(true);
        }}
      >
        <Plus className="h-4 w-4" />
        Assign to Me
      </Button>
    ) : (
      <div className="flex items-center justify-center gap-2 h-12 md:h-10 bg-success/10 text-success rounded-md">
        <Check className="h-4 w-4" />
        <span className="text-sm font-medium">Currently Assigned</span>
      </div>
    )}

    {/* Coach-only buttons */}
    {isCoach(user) && (
      <>
        <Button
          variant="outline"
          className="w-full gap-2 h-12 md:h-10"
          onClick={(e) => {
            e.stopPropagation();
            setAssignDialogOpen(true);
          }}
        >
          <UserPlus className="h-4 w-4" />
          Assign to Athletes
        </Button>

        <Button
          variant="ghost"
          className="w-full gap-2 h-12 md:h-10"
          onClick={onView}
        >
          <Eye className="h-4 w-4" />
          View/Edit Program
        </Button>
      </>
    )}
  </div>
</CardContent>

{/* Add dialogs at end of card */}
<SelfAssignDialog
  program={program}
  open={selfAssignOpen}
  onOpenChange={setSelfAssignOpen}
/>
```

---

### Feature 2: Searchable Athletes - Complete Code

**File:** `client/src/pages/programs.tsx`

**Replace the entire AssignAthleteDialog component with this:**

```typescript
import { Search, Loader2 } from "lucide-react";

function AssignAthleteDialog({
  program,
  open,
  onOpenChange,
  currentAssignments,
}: {
  program: Program;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentAssignments: (ProgramAssignment & { athlete: User })[];
}) {
  const { toast } = useToast();
  const { currentOrganization } = useApp();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedAthletes, setSelectedAthletes] = useState<string[]>([]);
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);

  // Fetch organization members
  const { data: members, isLoading: membersLoading } = useQuery<any[]>({
    queryKey: ['/api/organizations', currentOrganization?.id, 'members'],
    enabled: !!currentOrganization && open,
  });

  // Get all athletes
  const allAthletes = members?.filter(m => m.user.role === 'athlete').map(m => m.user) || [];

  // Filter out already assigned athletes
  const availableAthletes = allAthletes.filter(
    (athlete: User) => !currentAssignments.find(a => a.athleteId === athlete.id)
  );

  // Filter by search query
  const filteredAthletes = availableAthletes.filter((athlete: User) => {
    if (!searchQuery) return true;
    const fullName = `${athlete.firstName || ''} ${athlete.lastName || ''}`.toLowerCase();
    const email = (athlete.email || '').toLowerCase();
    const query = searchQuery.toLowerCase();
    return fullName.includes(query) || email.includes(query);
  });

  const toggleAthlete = (athleteId: string) => {
    setSelectedAthletes(prev =>
      prev.includes(athleteId)
        ? prev.filter(id => id !== athleteId)
        : [...prev, athleteId]
    );
  };

  const assignMutation = useMutation({
    mutationFn: async () => {
      // Assign to all selected athletes
      return Promise.all(
        selectedAthletes.map(athleteId =>
          apiRequest('/api/program-assignments', {
            method: 'POST',
            body: {
              programId: program.id,
              athleteId,
              startDate: new Date(startDate).toISOString(),
            },
          })
        )
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/programs', program.id, 'assignments'] });
      toast({
        title: "Success",
        description: `Assigned to ${selectedAthletes.length} athlete(s)`,
      });
      setSelectedAthletes([]);
      setSearchQuery("");
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error?.message || "Failed to assign athletes",
        variant: "destructive",
      });
    },
  });

  const removeAssignmentMutation = useMutation({
    mutationFn: async (assignmentId: string) => {
      return await apiRequest(`/api/program-assignments/${assignmentId}`, {
        method: 'DELETE',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/programs', program.id, 'assignments'] });
      toast({ title: "Success", description: "Athlete removed from program" });
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-hidden flex flex-col sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Assign Athletes to Program</DialogTitle>
          <DialogDescription>
            Search and select athletes to assign "{program.name}"
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 flex-1 overflow-hidden flex flex-col">
          {/* Currently Assigned Section */}
          {currentAssignments.length > 0 && (
            <div className="space-y-2">
              <Label className="text-sm font-medium">
                Currently Assigned ({currentAssignments.length})
              </Label>
              <div className="max-h-32 overflow-y-auto space-y-2 p-2 border rounded-lg bg-muted/50">
                {currentAssignments.map((assignment) => (
                  <div
                    key={assignment.id}
                    className="flex items-center justify-between gap-2 p-2 bg-background rounded"
                  >
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <Avatar className="h-8 w-8 shrink-0">
                        <AvatarFallback className="text-xs">
                          {assignment.athlete.firstName?.[0]}{assignment.athlete.lastName?.[0]}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">
                          {assignment.athlete.firstName} {assignment.athlete.lastName}
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeAssignmentMutation.mutate(assignment.id)}
                      disabled={removeAssignmentMutation.isPending}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Search Input */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search athletes by name or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-12 md:h-10"
            />
          </div>

          {/* Selected Count */}
          {selectedAthletes.length > 0 && (
            <div className="flex items-center justify-between p-3 bg-primary/10 rounded-lg">
              <span className="text-sm font-medium">
                {selectedAthletes.length} athlete(s) selected
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedAthletes([])}
              >
                Clear
              </Button>
            </div>
          )}

          {/* Athletes List */}
          <div className="flex-1 overflow-y-auto border rounded-lg">
            {membersLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : filteredAthletes.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center p-4">
                <Users className="h-12 w-12 text-muted-foreground mb-3" />
                <p className="text-sm text-muted-foreground">
                  {searchQuery
                    ? "No athletes found matching your search"
                    : availableAthletes.length === 0
                    ? "No available athletes (all assigned)"
                    : "No athletes in this organization"}
                </p>
              </div>
            ) : (
              <div className="divide-y">
                {filteredAthletes.map((athlete: User) => {
                  const isSelected = selectedAthletes.includes(athlete.id);
                  return (
                    <div
                      key={athlete.id}
                      onClick={() => toggleAthlete(athlete.id)}
                      className="flex items-center gap-3 p-3 cursor-pointer hover:bg-muted/50 transition-colors"
                    >
                      <div className={cn(
                        "w-5 h-5 border-2 rounded flex items-center justify-center shrink-0",
                        isSelected ? "bg-primary border-primary" : "border-muted-foreground"
                      )}>
                        {isSelected && <Check className="h-3 w-3 text-primary-foreground" />}
                      </div>

                      <Avatar className="h-10 w-10 shrink-0">
                        <AvatarImage src={athlete.profileImageUrl || undefined} />
                        <AvatarFallback>
                          {athlete.firstName?.[0]}{athlete.lastName?.[0]}
                        </AvatarFallback>
                      </Avatar>

                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">
                          {athlete.firstName} {athlete.lastName}
                        </p>
                        <p className="text-sm text-muted-foreground truncate">
                          {athlete.email}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Start Date */}
          <div className="space-y-2">
            <Label htmlFor="assign-start-date">Start Date</Label>
            <Input
              id="assign-start-date"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="h-12 md:h-10"
              min={new Date().toISOString().split('T')[0]}
            />
          </div>
        </div>

        <DialogFooter className="flex-row gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="flex-1 h-12 md:h-10"
          >
            Cancel
          </Button>
          <Button
            onClick={() => assignMutation.mutate()}
            disabled={selectedAthletes.length === 0 || assignMutation.isPending || !startDate}
            className="flex-1 h-12 md:h-10"
          >
            {assignMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Assigning...
              </>
            ) : (
              `Assign to ${selectedAthletes.length || 0}`
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

---

### NPM Packages to Install

```bash
# For swipe gestures
npm install react-swipeable
npm install --save-dev @types/react-swipeable

# Verify drawer component exists
# If not, install shadcn drawer:
npx shadcn-ui@latest add drawer
```

---

### Mobile CSS Additions

**File:** `client/src/index.css`

**Add at the end:**

```css
/* Mobile-specific optimizations */
@media (max-width: 767px) {
  /* Prevent zoom on input focus (iOS) */
  input[type="text"],
  input[type="email"],
  input[type="password"],
  input[type="number"],
  input[type="tel"],
  input[type="date"],
  textarea,
  select {
    font-size: 16px !important;
  }

  /* Better touch targets */
  button,
  a {
    min-height: 44px;
    min-width: 44px;
  }

  /* Prevent accidental zoom */
  body {
    touch-action: manipulation;
  }

  /* Safe area for notch devices */
  .safe-area-bottom {
    padding-bottom: env(safe-area-inset-bottom);
  }

  /* Smooth scrolling */
  * {
    -webkit-overflow-scrolling: touch;
  }
}

/* Touch feedback */
.touch-manipulation {
  touch-action: manipulation;
}

.touch-manipulation:active {
  opacity: 0.7;
}

/* Swipeable transitions */
.swipeable-item {
  transition: transform 0.2s ease-out;
}
```
