import type { User } from "@shared/schema";

/**
 * Check if a user has a coach role (admin, head_coach, or assistant_coach)
 */
export function isCoach(user: User): boolean {
  return ['admin', 'head_coach', 'assistant_coach'].includes(user.role);
}

/**
 * Check if a user is an admin
 */
export function isAdmin(user: User): boolean {
  return user.role === 'admin';
}

/**
 * Check if a user is a head coach or admin
 */
export function isHeadCoachOrAdmin(user: User): boolean {
  return user.role === 'admin' || user.role === 'head_coach';
}

/**
 * Check if a user is an athlete
 */
export function isAthlete(user: User): boolean {
  return user.role === 'athlete';
}
