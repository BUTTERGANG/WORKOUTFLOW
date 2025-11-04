# Workout Programming Platform

## Overview
This platform is a professional weightlifting team management system designed for strength and conditioning coaches and athletes. Its primary purpose is to empower coaches with robust tools for creating training programs, meticulously tracking athlete progress, and efficiently managing their teams. Athletes benefit from a mobile-optimized experience for logging workouts, complete with detailed performance tracking and insightful visualizations of their strength progression over time. The platform aims to streamline the coaching workflow and enhance the athlete's training experience.

## User Preferences
*No specific preferences recorded yet.*

## System Architecture
The platform is built with a modern web stack, featuring a **React frontend with TypeScript, TailwindCSS, and Shadcn UI**. The **backend is an Express.js application also written in TypeScript**. Data persistence is handled by **PostgreSQL, utilizing Drizzle ORM**. **Replit Auth** is used for authentication, supporting various SSO providers (Google, GitHub, X, Apple) and traditional email/password login.

### UI/UX Decisions
- **Design System**: Follows Material Design 3 principles with a dark mode theme and blue accents.
- **Typography**: Uses Roboto for general UI and Roboto Mono for data and numbers.
- **Components**: Leverages Shadcn UI with custom styling for a consistent look and feel.
- **Mobile-First**: Designed with a strong emphasis on responsive and mobile-optimized layouts, especially for the workout logging experience.

### Technical Implementations
- **Organization Hierarchy**: Structures data around Organizations → Teams → Athletes, with role-based access control (Admin, Head Coach, Assistant Coach, Athlete).
- **Program Structure**: Programs are organized hierarchically into Weeks → Days → Exercises, supporting various periodization phases.
- **Workout Logging**: Tracks workout sessions, exercise logs, and set logs, including weight, reps, RPE, and completion status.
- **Authentication**: Integrates Replit Auth for secure sign-in, with user profiles stored in the database post-authentication. User IDs are VARCHAR to align with Replit Auth's string-based IDs.
- **Database Schema**: Utilizes UUIDs for most entity primary keys, with foreign keys referencing `users.id` as VARCHAR.
- **Error Handling**: Centralized error handling system with custom error classes and Zod validation support.
- **Security**: Implements `sanitize-html` for XSS prevention and role-based access control on all API endpoints.
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

### Feature Specifications
- **Program Builder**: Allows coaches to create and assign detailed training programs.
- **Exercise Library**: Includes a pre-loaded library with support for custom exercises.
- **Team Management**: Tools for organizing athletes and managing team memberships.
  - **Team Search & Join** (Nov 2025): Athletes can search for teams by name and send join requests that coaches can approve/reject
  - **Join Request Management**: Coaches can view, approve, or reject athlete join requests
  - **Smart Routing**: Athletes without organizations are directed to /join-team, coaches to /onboarding
- **Progress Analytics**: Tracks athlete performance metrics like 1RM estimates and volume.
- **Workout Logging**: Mobile-optimized interface for athletes to log sets, reps, and RPE.
- **Tools for Athletes**: Includes a rest timer and plate calculator.

## External Dependencies
- **Database**: PostgreSQL (specifically NeonDB for serverless deployment).
- **Authentication**: Replit Auth (for Google, GitHub, X, Apple SSO, and email/password).
- **ORM**: Drizzle ORM (for database interaction).
- **UI Components**: Shadcn UI.
- **Styling**: TailwindCSS.
- **Backend Framework**: Express.js.
- **XSS Protection**: `sanitize-html` library.
- **Session Management**: `connect-pg-simple` (for PostgreSQL session storage).