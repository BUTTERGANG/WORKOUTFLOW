import type { User } from "@shared/schema";

/**
 * Check if a user has a coach role (admin, head_coach, or assistant_coach)
 * Accepts partial User to handle schema migrations gracefully
 */
export function isCoach(user: Pick<User, 'role'>): boolean {
  return ['admin', 'head_coach', 'assistant_coach'].includes(user.role);
}

/**
 * Check if a user is an admin
 * Accepts partial User to handle schema migrations gracefully
 */
export function isAdmin(user: Pick<User, 'role'>): boolean {
  return user.role === 'admin';
}

/**
 * Check if a user is a head coach or admin
 * Accepts partial User to handle schema migrations gracefully
 */
export function isHeadCoachOrAdmin(user: Pick<User, 'role'>): boolean {
  return user.role === 'admin' || user.role === 'head_coach';
}

/**
 * Check if a user is an athlete
 * Accepts partial User to handle schema migrations gracefully
 */
export function isAthlete(user: Pick<User, 'role'>): boolean {
  return user.role === 'athlete';
}
