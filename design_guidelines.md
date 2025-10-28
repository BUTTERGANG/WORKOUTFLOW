# Weightlifting Team Management Platform - Design Guidelines

## Design Approach

**Selected System**: Material Design 3  
**Rationale**: Ideal for data-heavy productivity applications with strong mobile and desktop experiences. Provides robust component patterns for forms, tables, charts, and real-time data entry.

**Core Principles**:
- Efficiency over aesthetics - minimize clicks and cognitive load
- Mobile-first workout logging, desktop-optimized program building
- Clear information hierarchy for quick data scanning
- Consistent patterns across organization/team/athlete contexts

---

## Typography System

**Font Family**: Roboto (primary), Roboto Mono (data/numbers)

**Hierarchy**:
- Display: 32px/40px, semi-bold - Dashboard headers, page titles
- Headline: 24px/32px, medium - Section headers, card titles
- Title: 20px/28px, medium - Subsections, form labels
- Body: 16px/24px, regular - Primary content, descriptions
- Caption: 14px/20px, regular - Metadata, timestamps, helper text
- Data: 16px/24px, Roboto Mono, medium - Sets, reps, weights, RPE values

---

## Layout System

**Spacing Units**: Tailwind 2, 3, 4, 6, 8, 12, 16 (focus on 4, 8, 16 for primary layouts)

**Grid Structure**:
- Desktop: 12-column grid, max-w-7xl container
- Tablet: 8-column grid, full-width with padding
- Mobile: 4-column grid, edge-to-edge content

**Responsive Breakpoints**:
- Mobile: < 768px (single column, stack all)
- Tablet: 768px - 1024px (2-column where appropriate)
- Desktop: > 1024px (full multi-column layouts)

---

## Component Library

### Navigation
**Desktop Top Bar**:
- Organization/Team selector dropdown (left)
- Primary navigation tabs: Programs, Athletes, Analytics, Messages
- User profile menu with role badge (right)
- Height: 64px, persistent across all pages

**Mobile Bottom Navigation**:
- 5 tabs: Workout, Programs, Team, Messages, Profile
- Active workout session indicator (pulsing dot)
- Height: 56px, fixed position

**Sidebar (Desktop Only)**:
- Width: 280px, collapsible to 64px
- Hierarchical navigation: Organization > Teams > Athletes
- Search/filter input at top
- Contextual actions based on selection

### Cards & Containers
**Program Card**:
- Compact view: Title, duration, athlete count, thumbnail
- Padding: p-4, rounded-lg, shadow-sm
- Hover: lift effect (shadow-md)

**Workout Day Card**:
- Exercise list with set/rep scheme preview
- Completion status indicator
- Padding: p-6, clear visual separation between exercises

**Athlete Card**:
- Avatar, name, current program, last activity
- Quick stats: compliance rate, recent PRs
- Grid layout: 3-column desktop, 2-column tablet, 1-column mobile

### Forms & Inputs
**Exercise Set Logger** (Critical Mobile Component):
- Large touch targets: minimum 48px height
- Weight input: Numeric keypad, unit toggle (lbs/kg)
- Reps input: Quick increment buttons (+/-) with manual entry
- RPE selector: Horizontal slider or button grid (1-10)
- Submit button: Full-width, primary action, sticky at bottom
- Previous set reference: Compact card above current input

**Program Builder Form**:
- Drag-and-drop exercise reordering
- Inline editing for sets/reps/intensity
- Autosave indicator
- Nested structure: Week > Day > Exercise
- Padding: p-8 for comfortable desktop use

**Standard Inputs**:
- Height: 48px (mobile), 40px (desktop)
- Clear focus states with outline, no border color changes
- Label always visible above input
- Helper text below in caption size
- Error states with icon and message

### Data Display
**Progress Charts**:
- Line charts: 1RM progression over time
- Bar charts: Volume comparison across weeks
- Minimal chrome, data-focused
- Legend placement: bottom for mobile, right for desktop
- Tooltips on hover/tap with detailed metrics

**Exercise History Table** (Mobile Compact):
- Previous 5 sets shown during workout
- Columns: Date, Weight, Reps, RPE
- Condensed spacing: py-2 per row
- Sticky header on scroll

**Analytics Dashboard**:
- Widget grid: 2-column mobile, 4-column desktop
- Key metrics: Total volume, Estimated 1RM, Workout compliance, PRs this month
- Each widget: Title, large number, trend indicator, mini-chart

### Messaging
**Chat Interface**:
- Message bubbles: max-w-prose, p-3
- Coach messages: align-left
- Athlete messages: align-right
- Timestamp: caption size, subtle
- Input bar: sticky bottom, 56px height, attachment button

**Workout Comments**:
- Inline with exercise logs
- Threaded view for context
- Compact padding: p-3

### Actions & Buttons
**Primary Actions**:
- Height: 48px (mobile), 40px (desktop)
- Full-width on mobile for critical actions
- Rounded: rounded-lg
- Examples: "Start Workout", "Save Program", "Assign to Athletes"

**Secondary Actions**:
- Outlined or text style
- Same height as primary
- Used for "Cancel", "View Details", "Edit"

**FAB (Floating Action Button)** - Mobile:
- Position: bottom-right, 16px margin
- Size: 56px diameter
- Primary use: "Add Exercise" during workout logging
- Shadow: shadow-lg for elevation

---

## Accessibility

- Minimum touch target: 48px × 48px for all interactive elements
- Form inputs: Clear label association, ARIA attributes
- Focus indicators: 2px outline on all interactive elements
- Keyboard navigation: Tab order follows visual hierarchy
- Screen reader: Descriptive labels for data tables and charts

---

## Images

**Not Required**: This is a data-centric productivity tool. All UI focuses on forms, tables, charts, and workout logging interfaces. No hero images or decorative photography needed. Exercise library uses video thumbnails (small, 16:9 ratio, embedded in cards).

---

## Page-Specific Layouts

**Dashboard** (Desktop):
- 3-column layout: Quick stats, Recent activity feed, Upcoming workouts
- Full-width analytics section below
- Spacing: p-16 container, gap-8 between sections

**Program Builder** (Desktop):
- Left sidebar: Exercise library with search
- Center: Program structure (week/day/exercise tree)
- Right panel: Exercise details and customization
- Spacing: Full-screen layout, minimal padding

**Workout Logging** (Mobile):
- Full-screen, no distractions
- One exercise visible at a time
- Swipe to next/previous exercise
- Progress indicator: top bar showing exercise X of Y
- Spacing: p-4, generous tap targets

**Team Management** (Desktop):
- Data table: sortable columns, filter row
- Bulk actions: checkboxes for multi-select
- Row height: 56px for comfortable scanning