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

### Feature Specifications
- **Program Builder**: Allows coaches to create and assign detailed training programs.
- **Exercise Library**: Includes a pre-loaded library with support for custom exercises.
- **Team Management**: Tools for organizing athletes and managing team memberships.
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