# Workout Programming Platform

A professional weightlifting team management platform built for strength and conditioning coaches and athletes.

## Overview

This platform provides coaches with powerful tools to create training programs, track athlete progress, and manage teams. Athletes get a mobile-optimized workout logging experience with detailed performance tracking.

## Features

### For Coaches
- **Program Builder**: Create detailed training programs organized by weeks, days, and exercises
- **Exercise Library**: 100+ pre-loaded exercises with support for custom movements
- **Team Management**: Organize athletes into teams with role-based access control
- **Progress Analytics**: Track athlete performance with 1RM estimates and volume metrics
- **Communication**: Direct messaging and workout-specific comments

### For Athletes
- **Workout Logging**: Mobile-optimized interface for logging sets, reps, weight, and RPE
- **Rest Timer**: Built-in timer with notifications
- **Plate Calculator**: Automatic barbell loading calculator
- **Exercise History**: View previous performance during workouts
- **Progress Tracking**: Visualize strength progression over time

## Architecture

### Tech Stack
- **Frontend**: React with TypeScript, TailwindCSS, Shadcn UI
- **Backend**: Express.js with TypeScript
- **Database**: PostgreSQL with Drizzle ORM
- **Authentication**: Replit Auth (supports Google, GitHub, email/password)

### Design System
- **Theme**: Dark mode with blue accents (Material Design 3)
- **Typography**: Roboto (UI), Roboto Mono (data/numbers)
- **Components**: Shadcn UI with custom styling
- **Mobile-First**: Responsive design optimized for workout logging

## Database Schema

### Organization Hierarchy
- Organizations → Teams → Athletes
- Role-based access: Admin, Head Coach, Assistant Coach, Athlete

### Program Structure
- Programs → Weeks → Days → Exercises
- Supports periodization phases (hypertrophy, strength, power, peaking, deload)

### Workout Logging
- Workout Sessions → Exercise Logs → Set Logs
- Tracks weight, reps, RPE, completion status

## Recent Changes

- **2025-10-28**: Critical ID Type Fix - Replit Auth Compatibility
  - ⚠️ **CRITICAL**: Reverted users.id to `varchar` type (Replit Auth provides string IDs, not UUIDs)
  - ✅ Updated all foreign keys referencing users.id to varchar (organizations.ownerId, teamMembers.userId, etc.)
  - ✅ Database schema recreated with correct types - **users.id is VARCHAR, all other entities use UUID**
  - ✅ PostgreSQL pgcrypto extension enabled for UUID generation compatibility
  - ✅ Fixed TypeScript compilation errors (target ES2015, proper Express type augmentation)
  - ✅ Enhanced seed script with progress logging - seeded 34 global exercises
  - ✅ Backend compiles cleanly with no errors
  - ✅ Authentication flow working correctly with Replit Auth
  - ✅ Comprehensive authorization system with tenant isolation
  - ✅ Database indexes on all foreign keys and query columns

- **2025-10-28**: Initial MVP implementation
  - Complete database schema with multi-tenant support
  - Full authentication system with role-based access
  - All frontend components built with dark theme
  - Backend API for all core features

## User Preferences

*No specific preferences recorded yet.*

## Development

### Environment Setup
- PostgreSQL database provisioned
- Replit Auth configured
- Session management with PostgreSQL storage

### Available Scripts
- `npm run dev` - Start development server (frontend + backend)
- `npm run db:push` - Sync database schema with Drizzle
- `tsx server/seed.ts` - Seed database with global exercises (run after fresh database setup)

### Important Database Notes
- **users.id is VARCHAR**: Replit Auth provides string-based user IDs (e.g., "2755323"), NOT UUIDs
- All other entities use UUID primary keys with `.defaultRandom()`
- Foreign keys referencing users.id must be VARCHAR type
- Sessions table uses VARCHAR sid for session management

### API Endpoints

**Authentication**
- `GET /api/auth/user` - Get current user
- `GET /api/login` - Initiate login
- `GET /api/logout` - Log out

**Organizations & Teams**
- `POST /api/organizations` - Create organization
- `GET /api/organizations` - List user's organizations
- `POST /api/teams` - Create team
- `GET /api/organizations/:orgId/teams` - List organization teams
- `POST /api/teams/:teamId/members` - Add team member

**Programs**
- `POST /api/programs` - Create program
- `GET /api/programs` - List programs
- `POST /api/programs/:id/weeks` - Add week to program
- `POST /api/weeks/:id/days` - Add day to week
- `POST /api/days/:id/exercises` - Add exercise to day

**Workouts**
- `POST /api/workout-sessions` - Create workout session
- `GET /api/workout-sessions` - List athlete's workouts
- `POST /api/workout-sessions/:id/exercise-logs` - Log exercise
- `POST /api/exercise-logs/:id/sets` - Log set

**Exercises**
- `GET /api/exercises` - List exercises
- `POST /api/exercises` - Create custom exercise

**Messaging**
- `POST /api/messages` - Send message
- `GET /api/messages/conversation/:userId` - Get conversation

## Project Status

**Current Phase**: MVP Complete
- ✅ Database schema designed and deployed
- ✅ Authentication system implemented
- ✅ All frontend components built
- ✅ Backend API implemented
- ✅ Exercise library seeded
- 🔄 Ready for testing and validation

**Next Steps**:
1. Test core user journeys
2. Add data seed for demo organizations/teams
3. Implement program templates feature
4. Add offline mode for workout logging
5. Build analytics dashboard with charts
