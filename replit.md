# Workout Programming Platform

## Overview
This platform is a professional weightlifting team management system designed for strength and conditioning coaches and athletes. Its primary purpose is to empower coaches with robust tools for creating training programs, meticulously tracking athlete progress, and efficiently managing their teams. Athletes benefit from a mobile-optimized experience for logging workouts, complete with detailed performance tracking and insightful visualizations of their strength progression over time. The platform aims to streamline the coaching workflow and enhance the athlete's training experience.

## User Preferences
*No specific preferences recorded yet.*

## System Architecture
The platform is built with a modern web stack, featuring a **React frontend with TypeScript, TailwindCSS, and Shadcn UI**. The **backend is an Express.js application also written in TypeScript**. Data persistence is handled by **PostgreSQL, utilizing Drizzle ORM**. **Email/password authentication** is implemented using Passport.js local strategy with bcrypt password hashing.

### UI/UX Decisions
- **Design System**: Follows Material Design 3 principles with a dark mode theme and blue accents.
- **Typography**: Uses Roboto for general UI and Roboto Mono for data and numbers.
- **Components**: Leverages Shadcn UI with custom styling for a consistent look and feel.
- **Mobile-First**: Designed with a strong emphasis on responsive and mobile-optimized layouts, especially for the workout logging experience.

### Technical Implementations
- **Organization Hierarchy**: Structures data around Organizations → Teams → Athletes, with role-based access control (Admin, Head Coach, Assistant Coach, Athlete).
- **Program Structure**: Programs are organized hierarchically into Weeks → Days → Exercises, supporting various periodization phases.
- **Workout Logging**: Tracks workout sessions, exercise logs, and set logs, including weight, reps, RPE, and completion status.
- **Authentication** (Nov 2025): Email/password authentication using Passport.js local strategy with bcrypt password hashing (10 salt rounds). Session-based authentication with PostgreSQL session store.
- **Database Schema**: Utilizes UUIDs (as VARCHAR) for user IDs and most entity primary keys. User passwords stored as bcrypt hashes in `users.password_hash` field.
- **Error Handling**: Centralized error handling system with custom error classes and Zod validation support.
- **Security**: Implements `sanitize-html` for XSS prevention, bcrypt password hashing, and role-based access control on all API endpoints.
  - **Rate Limiting** (Nov 2025): Auth endpoints (/api/login, /api/register) protected with rate limiting (5 attempts per 15 minutes per IP) using express-rate-limit middleware
  - **Crypto-Safe Invite Codes** (Nov 2025): Organization invite codes generated using crypto.randomBytes for cryptographic security with collision detection
  - **Session Security** (Nov 2025): Session cookies configured with SameSite: 'lax' to prevent CSRF attacks
  - **Compression** (Nov 2025): Response compression middleware active for improved performance
- **Performance Optimizations** (Nov 2025):
  - Query optimization: Rewrote `getProgramWeeks()` using JOINs to reduce 73 queries → 1 query for 12-week programs
  - Transaction wrapping: `createCompleteProgram()` creates entire program structure atomically
  - Cascade deletes: Comprehensive cascade delete for programs, organizations, and teams
- **Data Integrity Validation** (Nov 2025):
  - Prevents duplicate week numbers within programs
  - Prevents duplicate day numbers within weeks
  - Prevents duplicate exercise orders within days
  - Validates positive values for sets, week/day numbers, exercise orders
  - Validates day numbers are 1-7
  - Verifies exercise existence before program creation
- **Cascade Delete Implementation** (Nov 2025):
  - **Organization deletion**: Removes all teams, programs (with weeks/days/exercises), workout sessions (with exercise logs/set logs), team members, join requests, and program assignments atomically
  - **Team deletion**: Removes team members and join requests (program assignments belong to organizations, not teams)
  - **Program deletion**: Removes all weeks, days, exercises, and program assignments atomically
  - All deletion operations wrapped in transactions to prevent orphaned data
- **Error Handling Improvements** (Nov 2025):
  - Enhanced JSON parsing in API client with descriptive error messages
  - Prevents silent failures when server returns invalid JSON
- **Authentication Bug Fixes** (Nov 2025):
  - Fixed `upsertUser` to only update defined fields, preventing OAuth providers from overwriting existing firstName/lastName with undefined values
  - Users' profile data (firstName, lastName) now persists correctly across logout/login cycles even when OAuth providers don't provide those fields
- **Layout Fixes** (Nov 2025):
  - Fixed main content area to use `flex-1` and `overflow-auto` for proper flex layout with sidebar
  - Ensures sidebar and main content display side by side without clipping or off-center positioning
  - Moved `SidebarProvider` to only wrap authenticated routes, allowing registration and landing pages to render centered without sidebar interference
- **Form Validation Enhancements** (Nov 2025):
  - **Registration**: Added email format validation with regex pattern, name length validation (minimum 2 characters)
  - **Onboarding**: Added comprehensive validation for organization/team names (3-100 character length requirements)
  - **Navigation**: Replaced unsafe `window.location.href` redirects with wouter's `setLocation()` for proper client-side routing
  - **Context Usage**: Replaced unsafe `localStorage` access in onboarding with `AppContext`'s `currentOrganization` for reliable state management
- **Performance Improvements** (Nov 2025):
  - **Athletes Page**: Added `useMemo` optimization for team member filtering to prevent unnecessary re-renders
- **UX Improvements** (Nov 2025):
  - **Messages**: Replaced misleading "Message sent" toast with honest "Coming Soon" badge to set proper user expectations
  - Updated messaging empty state to clearly communicate that feature is under development

### Feature Specifications
- **Program Builder**: Allows coaches to create and assign detailed training programs.
- **Exercise Library**: Includes a pre-loaded library with support for custom exercises.
- **Team Management**: Tools for organizing athletes and managing team memberships.
  - **Organization Search & Join** (Nov 2025): Athletes can search for organizations by name and send join requests that coaches can approve/reject
  - **Invite Code System** (Nov 2025): Every organization has a unique 8-character invite code for easy sharing
    - Codes use alphanumeric characters excluding ambiguous ones (0/O/1/I/l)
    - Auto-generated on organization creation with collision detection
    - Displayed in organization search results to disambiguate organizations with duplicate names
  - **Shareable Invite Links** (Nov 2025): Coaches can share invite links (`/join/:inviteCode`) with athletes
    - Link prominently displayed on coach dashboard with one-click copy functionality
    - Also available in Settings page
    - Athletes can join directly via link instead of searching
    - Join still requires coach approval to maintain security
  - **Join Request Management**: Coaches can view, approve, or reject athlete join requests
  - **Smart Routing**: Athletes without organizations are directed to /join-team, coaches to /onboarding
- **Progress Analytics**: Tracks athlete performance metrics like 1RM estimates and volume.
- **Workout Logging**: Mobile-optimized interface for athletes to log sets, reps, and RPE.
- **Tools for Athletes**: Includes a rest timer and plate calculator.
- **Messaging System** (Nov 2025): Organization-wide messaging between members
  - **Backend**: REST endpoints for sending messages, fetching conversations, and marking messages as read
  - **Frontend**: Member list, conversation view, message composition
  - **Real-time**: Polling-based updates (5-second intervals) for new messages
  - **Security**: Enforces shared-organization membership between sender and recipient
  - **UX**: Empty states, loading states, "Coming Soon" badge for transparency
- **Self-Assignment** (Nov 2025): Athletes can browse and self-assign template programs
  - **Backend**: GET /api/programs/available (fetches template programs from user's organizations) and POST /api/program-assignments/self-assign (creates self-assignment with security checks)
  - **Frontend**: Athlete view on Programs page shows available template programs in cards with self-assignment button
  - **Security**: Organization-based access control, template-only restriction, duplicate assignment prevention
  - **UX**: Loading states, empty states for no programs, toast notifications for success/error

## External Dependencies
- **Database**: PostgreSQL (specifically NeonDB for serverless deployment).
- **Authentication**: Passport.js (local strategy for email/password authentication).
- **Password Hashing**: bcryptjs (for secure password storage).
- **ORM**: Drizzle ORM (for database interaction).
- **UI Components**: Shadcn UI.
- **Styling**: TailwindCSS.
- **Backend Framework**: Express.js.
- **XSS Protection**: `sanitize-html` library.
- **Session Management**: `connect-pg-simple` (for PostgreSQL session storage).