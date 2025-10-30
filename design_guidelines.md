# Weightlifting Team Management Platform - Design Guidelines

## Design Approach

**Selected System**: Material Design 3 (Dark Theme)  
**Rationale**: Optimal for data-heavy mobile productivity with one-handed operation. Dark theme reduces eye strain during gym sessions and extends battery life.

**Core Principles**:
- One-handed mobile operation - critical actions within thumb reach
- Dark UI with strategic blue accents for hierarchy
- Minimal navigation - focused workout flow
- Large touch targets optimized for sweaty hands/gloves
- Information density balanced with breathing room

---

## Dark Theme Color System

**Background Hierarchy**:
- Surface: #121212 (base container)
- Surface variant: #1E1E1E (elevated cards)
- Surface bright: #2A2A2A (active inputs, modals)

**Accent & Interactive**:
- Primary blue: #4A9EFF (CTAs, active states, progress)
- Primary variant: #2C7DD9 (pressed states)
- Success: #4CAF50 (completed sets, PRs)
- Warning: #FFA726 (RPE 8-9)
- Error: #EF5350 (failed lifts, RPE 10)

**Text Contrast**:
- High emphasis: #FFFFFF (headings, active data)
- Medium emphasis: #B3B3B3 (body text, labels)
- Disabled: #666666 (inactive elements)

---

## Typography System

**Font Family**: Roboto (UI), Roboto Mono (data/numbers)

**Mobile Hierarchy**:
- Display: 28px/36px, bold - Session headers
- Headline: 20px/28px, medium - Exercise names
- Body Large: 18px/26px, regular - Form labels, instructions
- Body: 16px/24px, regular - Descriptions, comments
- Data Large: 24px/32px, Roboto Mono, bold - Weight/reps input values
- Data Small: 16px/24px, Roboto Mono, medium - Set history, timers

---

## Layout System

**Spacing Units**: Tailwind 3, 4, 6, 8, 12, 16 (primary: 4, 8)

**Mobile-First Grid**:
- Mobile: 4px edge padding, full-width components
- Tablet: 8-column grid, 16px gutters
- Desktop: 12-column grid, max-w-6xl container

**One-Handed Thumb Zone**:
- Critical actions: Bottom 40% of screen
- Secondary actions: Center 30% of screen
- Reference data: Top 30% of screen (read-only)

---

## Component Library

### Navigation

**Mobile Bottom Bar** (Primary):
- 4 tabs: Workout (icon: dumbbell), Timer (icon: clock), Plates (icon: calculator), Profile
- Height: 64px for easy thumb access
- Active indicator: Blue underline + icon fill
- Active workout: Pulsing blue dot on Workout tab

**Quick Action Bar** (During Workout):
- Floating overlay, 72px height
- Position: Above bottom nav, sticky
- Contains: Previous/Next exercise, Rest timer, Notes
- Background: Surface bright with blur

### Forms & Inputs

**Weight Input** (Mobile Focus):
- Height: 72px, full-width
- Numeric keypad auto-opens
- Unit toggle (lbs/kg): 48px × 80px pill button, top-right
- Previous set reference: Subtle text below, 14px
- Large numbers: 32px Roboto Mono, white

**Reps Counter**:
- Center: Large display (48px number)
- Sides: Increment/decrement buttons, 64px × 64px
- Quick-add buttons: 5, 8, 10, 12 (48px height, pill shape)
- Touch ripple feedback on all interactions

**RPE Selector**:
- Horizontal slider: 48px height track
- Markers: 1-10, every 0.5 increment
- Current value: 40px badge above thumb
- Color gradient: Green (6) → Yellow (8) → Red (10)

**Set Logger Card**:
- Stacked vertical layout: Weight → Reps → RPE → Submit
- Card padding: p-6, rounded-2xl
- Submit button: 56px height, full-width, blue, "Log Set"
- Spacing between inputs: gap-4

### Workout Flow

**Exercise Header**:
- Height: 96px, sticky top
- Exercise name: 20px medium
- Set counter: "Set 3 of 5" - 16px, medium emphasis
- Collapse button: 48px × 48px, top-right
- Background: Surface variant, shadow-md

**Rest Timer Modal**:
- Full-screen overlay, centered content
- Countdown: 72px Roboto Mono, white
- Progress ring: 240px diameter, blue stroke
- Actions: +30s, -30s, Skip (56px height buttons)
- Background: Surface with 80% opacity

**Plate Calculator**:
- Target weight input: 72px height
- Plate breakdown: Visual representation
- Grid: 2 columns showing plates per side
- Plate badges: 48px height, rounded, color-coded
- Standard plates: 45lb (blue), 25lb (green), 10lb (white), 5lb (red)

### Data Display

**Set History Table**:
- Last 5 sets visible during workout
- Row height: 56px
- Columns: Date (compact), Weight, Reps, RPE, Notes icon
- Sticky header: 48px, Surface bright
- Alternating row backgrounds for scanning

**Progress Cards** (Dashboard):
- 2-column grid on mobile
- Card height: 120px minimum
- Large metric: 32px Roboto Mono, white
- Trend indicator: Arrow icon + percentage
- Mini sparkline: 16px height, blue

**Workout Summary**:
- Expandable accordion: 64px collapsed height
- Total volume, duration, exercises completed
- Per-exercise breakdown on expand
- Share button: 48px × 48px, top-right

### Quick Access Tools

**Timer Widget** (Floating):
- Compact: 48px × 120px pill, bottom-right
- Expanded: 280px × 400px modal
- Preset buttons: 1:00, 2:00, 3:00, 5:00 (48px height)
- Custom input: 64px height
- Close: Swipe down gesture

**Notes/Comments**:
- Inline with exercise
- Expandable text area: 120px default, 240px expanded
- Voice input button: 48px × 48px
- Auto-save indicator: Subtle pulse

### Cards & Containers

**Program Card** (Tablet/Desktop):
- Horizontal layout: Thumbnail left, content right
- Height: 140px
- Padding: p-6
- Hover: Transform scale(1.02), shadow-lg

**Athlete Card** (Coach View):
- 3-column desktop, 2-column tablet, 1-column mobile
- Avatar: 56px diameter
- Compliance badge: Top-right corner, 24px
- Last workout: Caption text, timestamp format

---

## Accessibility

- Minimum touch: 48px × 48px (standard), 64px × 64px (critical workout actions)
- Focus indicators: 3px blue outline, 4px offset
- High contrast: All text meets WCAG AAA on dark backgrounds
- Haptic feedback: On successful set log, timer complete
- Screen reader: Descriptive labels for all numeric inputs
- Reduce motion: Optional for timer animations

---

## Images

**No Hero Images**: This is a utility-focused workout app. All visuals are data-driven (charts, progress indicators, exercise thumbnails).

**Exercise Thumbnails**: 
- 16:9 ratio, 120px × 68px
- Embedded in exercise cards
- Low-res acceptable for bandwidth

---

## Page-Specific Layouts

**Workout Logging** (Mobile):
- Full-screen, edge-to-edge
- Single exercise focus, swipe horizontal to navigate
- Progress bar: 4px height, top edge
- Spacing: p-4 container, gap-4 between elements

**Dashboard** (Mobile):
- Vertical scroll
- Today's workout: Full-width card, p-6
- Quick stats: 2-column grid, gap-4
- Recent PRs: Horizontal scroll cards
- Spacing: p-4 outer, gap-6 sections

**Program Builder** (Tablet/Desktop):
- Left: Exercise library, 280px width
- Center: Program tree structure, flex-grow
- Right: Details panel, 320px width
- Full-height layout, minimal padding

**Timer Page**:
- Centered content, max-w-sm
- Large countdown display
- Preset grid: 2 columns, gap-4
- History: Bottom sheet, swipe up