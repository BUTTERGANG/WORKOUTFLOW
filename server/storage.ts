import {
  users,
  organizations,
  organizationMembers,
  organizationJoinRequests,
  teams,
  teamMembers,
  teamJoinRequests,
  exercises,
  programs,
  programWeeks,
  programDays,
  programExercises,
  programAssignments,
  workoutSessions,
  exerciseLogs,
  setLogs,
  messages,
  type User,
  type UpsertUser,
  type Organization,
  type InsertOrganization,
  type OrganizationMember,
  type InsertOrganizationMember,
  type OrganizationJoinRequest,
  type InsertOrganizationJoinRequest,
  type Team,
  type InsertTeam,
  type TeamMember,
  type InsertTeamMember,
  type TeamJoinRequest,
  type InsertTeamJoinRequest,
  type Exercise,
  type InsertExercise,
  type Program,
  type InsertProgram,
  type ProgramWeek,
  type InsertProgramWeek,
  type ProgramDay,
  type InsertProgramDay,
  type ProgramExercise,
  type InsertProgramExercise,
  type ProgramAssignment,
  type InsertProgramAssignment,
  type WorkoutSession,
  type InsertWorkoutSession,
  type ExerciseLog,
  type InsertExerciseLog,
  type SetLog,
  type InsertSetLog,
  type Message,
  type InsertMessage,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, sql, ilike, inArray } from "drizzle-orm";
import { ConflictError, ValidationError } from "./errors";

// Generate a random 8-character alphanumeric invite code
// Crypto-safe invite code generation
import { randomBytes } from 'crypto';

export function generateInviteCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Removed ambiguous characters (0, O, 1, I)
  let code = '';
  
  // Use cryptographically secure random bytes
  const bytes = randomBytes(8);
  
  for (let i = 0; i < 8; i++) {
    // Use modulo to map bytes to character set
    code += chars.charAt(bytes[i] % chars.length);
  }
  
  return code;
}

export interface IStorage {
  // User operations (Email/password authentication)
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: UpsertUser): Promise<User>;
  updateUserRole(userId: string, role: 'admin' | 'head_coach' | 'assistant_coach' | 'athlete'): Promise<void>;
  updateUserProfile(userId: string, data: { firstName: string; lastName: string; email: string; role: 'admin' | 'head_coach' | 'assistant_coach' | 'athlete' }): Promise<void>;
  getUserTeams(userId: string): Promise<Team[]>;
  
  // Organization operations
  createOrganization(org: InsertOrganization): Promise<Organization>;
  getOrganization(id: string): Promise<Organization | undefined>;
  getUserOrganizations(userId: string): Promise<Organization[]>;
  searchOrganizations(searchTerm: string): Promise<Organization[]>;
  getOrganizationByInviteCode(inviteCode: string): Promise<Organization | undefined>;
  ensureOrganizationHasInviteCode(organizationId: string): Promise<string>;
  
  // Organization membership operations
  addOrganizationMember(member: InsertOrganizationMember): Promise<OrganizationMember>;
  getOrganizationMembers(organizationId: string): Promise<(OrganizationMember & { user: User })[]>;
  
  // Organization join request operations
  createOrganizationJoinRequest(request: InsertOrganizationJoinRequest): Promise<OrganizationJoinRequest>;
  getOrganizationJoinRequests(organizationId: string, status?: 'pending' | 'approved' | 'rejected'): Promise<(OrganizationJoinRequest & { user: User })[]>;
  getUserOrganizationJoinRequests(userId: string, status?: 'pending' | 'approved' | 'rejected'): Promise<(OrganizationJoinRequest & { organization: Organization })[]>;
  approveOrganizationJoinRequest(requestId: string, reviewedBy: string): Promise<void>;
  rejectOrganizationJoinRequest(requestId: string, reviewedBy: string): Promise<void>;
  
  // Team operations
  createTeam(team: InsertTeam): Promise<Team>;
  getTeam(id: string): Promise<Team | undefined>;
  getOrganizationTeams(organizationId: string): Promise<Team[]>;
  addTeamMember(member: InsertTeamMember): Promise<TeamMember>;
  getTeamMembers(teamId: string): Promise<(TeamMember & { user: User })[]>;
  searchTeams(searchTerm: string): Promise<(Team & { organization: Organization })[]>;
  
  // Team join request operations
  createTeamJoinRequest(request: InsertTeamJoinRequest): Promise<TeamJoinRequest>;
  getTeamJoinRequests(teamId: string, status?: 'pending' | 'approved' | 'rejected'): Promise<(TeamJoinRequest & { user: User; team: Team & { organization: Organization } })[]>;
  getUserJoinRequests(userId: string, status?: 'pending' | 'approved' | 'rejected'): Promise<(TeamJoinRequest & { team: Team & { organization: Organization } })[]>;
  getOrganizationTeamJoinRequests(organizationId: string, status?: 'pending' | 'approved' | 'rejected'): Promise<(TeamJoinRequest & { user: User; team: Team })[]>;
  approveJoinRequest(requestId: string, reviewedBy: string): Promise<void>;
  rejectJoinRequest(requestId: string, reviewedBy: string): Promise<void>;
  deleteJoinRequest(requestId: string): Promise<void>;
  
  // Exercise operations
  createExercise(exercise: InsertExercise): Promise<Exercise>;
  getExercises(organizationId?: string): Promise<Exercise[]>;
  getExercise(id: string): Promise<Exercise | undefined>;
  
  // Program operations
  createProgram(program: InsertProgram): Promise<Program>;
  createCompleteProgram(data: {
    program: InsertProgram;
    weeks: Array<{
      week: Omit<InsertProgramWeek, 'programId'>;
      days: Array<{
        day: Omit<InsertProgramDay, 'weekId'>;
        exercises: Array<Omit<InsertProgramExercise, 'dayId'>>;
      }>;
    }>;
  }): Promise<Program>;
  getProgram(id: string): Promise<Program | undefined>;
  getOrganizationPrograms(organizationId: string): Promise<Program[]>;
  createProgramWeek(week: InsertProgramWeek): Promise<ProgramWeek>;
  createProgramDay(day: InsertProgramDay): Promise<ProgramDay>;
  createProgramExercise(exercise: InsertProgramExercise): Promise<ProgramExercise>;
  getProgramWeeks(programId: string): Promise<ProgramWeek[]>;
  getProgramDays(weekId: string): Promise<ProgramDay[]>;
  getProgramExercises(dayId: string): Promise<ProgramExercise[]>;
  
  // Program assignment operations
  createProgramAssignment(assignment: InsertProgramAssignment): Promise<ProgramAssignment>;
  getAthleteAssignments(athleteId: string): Promise<(ProgramAssignment & { program: Program })[]>;
  getProgramAssignments(programId: string): Promise<(ProgramAssignment & { athlete: User })[]>;
  deleteProgramAssignment(id: string): Promise<void>;
  
  // Workout logging operations
  createWorkoutSession(session: InsertWorkoutSession): Promise<WorkoutSession>;
  getWorkoutSession(id: string): Promise<WorkoutSession | undefined>;
  getAthleteWorkouts(athleteId: string): Promise<WorkoutSession[]>;
  updateWorkoutSession(id: string, data: Partial<WorkoutSession>): Promise<WorkoutSession | undefined>;
  createExerciseLog(log: InsertExerciseLog): Promise<ExerciseLog>;
  createSetLog(log: InsertSetLog): Promise<SetLog>;
  getSessionExerciseLogs(sessionId: string): Promise<ExerciseLog[]>;
  getExerciseLogSets(exerciseLogId: string): Promise<SetLog[]>;
  
  // Messaging operations
  createMessage(message: InsertMessage): Promise<Message>;
  getConversation(userId1: string, userId2: string): Promise<Message[]>;
  markMessageAsRead(id: string): Promise<void>;
  
  // DELETE operations
  deleteOrganization(id: string): Promise<void>;
  deleteTeam(id: string): Promise<void>;
  removeTeamMember(teamId: string, userId: string): Promise<void>;
  deleteProgram(id: string): Promise<void>;
  deleteExercise(id: string): Promise<void>;
  deleteWorkoutSession(id: string): Promise<void>;
  deleteExerciseLog(id: string): Promise<void>;
  deleteSetLog(id: string): Promise<void>;
  deleteProgramExercise(id: string): Promise<void>;
  
  // UPDATE operations
  updateExercise(id: string, data: Partial<Exercise>): Promise<Exercise | undefined>;
  updateProgram(id: string, data: Partial<Program>): Promise<Program | undefined>;
  updateProgramWeek(id: string, data: Partial<ProgramWeek>): Promise<ProgramWeek | undefined>;
  updateProgramDay(id: string, data: Partial<ProgramDay>): Promise<ProgramDay | undefined>;
  updateProgramExercise(id: string, data: Partial<ProgramExercise>): Promise<ProgramExercise | undefined>;
  updateOrganization(id: string, data: Partial<Organization>): Promise<Organization | undefined>;
  updateTeam(id: string, data: Partial<Team>): Promise<Team | undefined>;
  
  // Additional GET operations
  getProgramExercise(id: string): Promise<ProgramExercise | undefined>;
  getProgramWeek(id: string): Promise<ProgramWeek | undefined>;
  getProgramDay(id: string): Promise<ProgramDay | undefined>;
  getExerciseLog(id: string): Promise<ExerciseLog | undefined>;
}

export class DatabaseStorage implements IStorage {
  // ============================================
  // USER OPERATIONS (Required for Replit Auth)
  // ============================================
  
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async createUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .returning();
    return user;
  }

  async updateUserRole(userId: string, role: 'admin' | 'head_coach' | 'assistant_coach' | 'athlete'): Promise<void> {
    await db
      .update(users)
      .set({ role, updatedAt: new Date() })
      .where(eq(users.id, userId));
  }

  async updateUserProfile(userId: string, data: { firstName: string; lastName: string; email: string; role: 'admin' | 'head_coach' | 'assistant_coach' | 'athlete' }): Promise<void> {
    await db
      .update(users)
      .set({
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        role: data.role,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId));
  }

  async getUserTeams(userId: string): Promise<Team[]> {
    const userTeamMemberships = await db
      .select({
        team: teams,
      })
      .from(teamMembers)
      .innerJoin(teams, eq(teamMembers.teamId, teams.id))
      .where(eq(teamMembers.userId, userId));
    
    return userTeamMemberships.map(row => row.team);
  }

  // ============================================
  // ORGANIZATION OPERATIONS
  // ============================================
  
  async createOrganization(orgData: InsertOrganization): Promise<Organization> {
    // Generate a unique invite code if not provided
    let inviteCode = orgData.inviteCode;
    if (!inviteCode) {
      inviteCode = generateInviteCode();
      let attempts = 0;
      const maxAttempts = 10;
      
      while (attempts < maxAttempts) {
        const existing = await this.getOrganizationByInviteCode(inviteCode);
        if (!existing) {
          break;
        }
        inviteCode = generateInviteCode();
        attempts++;
      }
      
      if (attempts >= maxAttempts) {
        throw new Error("Failed to generate unique invite code");
      }
    }
    
    const [org] = await db
      .insert(organizations)
      .values({ ...orgData, inviteCode })
      .returning();
    return org;
  }

  async getOrganization(id: string): Promise<Organization | undefined> {
    const [org] = await db
      .select()
      .from(organizations)
      .where(eq(organizations.id, id));
    return org;
  }

  async getUserOrganizations(userId: string): Promise<Organization[]> {
    const orgs = await db
      .select()
      .from(organizations)
      .where(eq(organizations.ownerId, userId));
    return orgs;
  }

  async searchOrganizations(searchTerm: string): Promise<Organization[]> {
    const results = await db
      .select()
      .from(organizations)
      .where(ilike(organizations.name, `%${searchTerm}%`));
    return results;
  }

  async getOrganizationByInviteCode(inviteCode: string): Promise<Organization | undefined> {
    const [org] = await db
      .select()
      .from(organizations)
      .where(eq(organizations.inviteCode, inviteCode));
    return org;
  }

  async ensureOrganizationHasInviteCode(organizationId: string): Promise<string> {
    const org = await this.getOrganization(organizationId);
    if (!org) {
      throw new Error("Organization not found");
    }
    
    if (org.inviteCode) {
      return org.inviteCode;
    }
    
    // Generate a unique invite code
    let inviteCode = generateInviteCode();
    let attempts = 0;
    const maxAttempts = 10;
    
    while (attempts < maxAttempts) {
      const existing = await this.getOrganizationByInviteCode(inviteCode);
      if (!existing) {
        break;
      }
      inviteCode = generateInviteCode();
      attempts++;
    }
    
    if (attempts >= maxAttempts) {
      throw new Error("Failed to generate unique invite code");
    }
    
    // Update the organization with the invite code
    await db
      .update(organizations)
      .set({ inviteCode, updatedAt: new Date() })
      .where(eq(organizations.id, organizationId));
    
    return inviteCode;
  }

  // ============================================
  // ORGANIZATION MEMBERSHIP OPERATIONS
  // ============================================

  async addOrganizationMember(memberData: InsertOrganizationMember): Promise<OrganizationMember> {
    const [member] = await db
      .insert(organizationMembers)
      .values(memberData)
      .returning();
    return member;
  }

  async getOrganizationMembers(organizationId: string): Promise<(OrganizationMember & { user: User })[]> {
    const members = await db
      .select({
        id: organizationMembers.id,
        organizationId: organizationMembers.organizationId,
        userId: organizationMembers.userId,
        role: organizationMembers.role,
        joinedAt: organizationMembers.joinedAt,
        user: users,
      })
      .from(organizationMembers)
      .innerJoin(users, eq(organizationMembers.userId, users.id))
      .where(eq(organizationMembers.organizationId, organizationId));
    return members;
  }

  // ============================================
  // ORGANIZATION JOIN REQUEST OPERATIONS
  // ============================================

  async createOrganizationJoinRequest(requestData: InsertOrganizationJoinRequest): Promise<OrganizationJoinRequest> {
    const [request] = await db
      .insert(organizationJoinRequests)
      .values(requestData)
      .returning();
    return request;
  }

  async getOrganizationJoinRequests(organizationId: string, status?: 'pending' | 'approved' | 'rejected'): Promise<(OrganizationJoinRequest & { user: User })[]> {
    let whereClause = eq(organizationJoinRequests.organizationId, organizationId);
    if (status) {
      whereClause = and(eq(organizationJoinRequests.organizationId, organizationId), eq(organizationJoinRequests.status, status)) as any;
    }

    const results = await db
      .select()
      .from(organizationJoinRequests)
      .innerJoin(users, eq(organizationJoinRequests.userId, users.id))
      .where(whereClause);
    
    return results.map((r: any) => ({
      ...r.organization_join_requests,
      user: r.users,
    }));
  }

  async getUserOrganizationJoinRequests(userId: string, status?: 'pending' | 'approved' | 'rejected'): Promise<(OrganizationJoinRequest & { organization: Organization })[]> {
    let whereClause = eq(organizationJoinRequests.userId, userId);
    if (status) {
      whereClause = and(eq(organizationJoinRequests.userId, userId), eq(organizationJoinRequests.status, status)) as any;
    }

    const results = await db
      .select()
      .from(organizationJoinRequests)
      .innerJoin(organizations, eq(organizationJoinRequests.organizationId, organizations.id))
      .where(whereClause);
    
    return results.map((r: any) => ({
      ...r.organization_join_requests,
      organization: r.organizations,
    }));
  }

  async approveOrganizationJoinRequest(requestId: string, reviewedBy: string): Promise<void> {
    await db.transaction(async (tx) => {
      // Get the request first
      const [request] = await tx
        .select()
        .from(organizationJoinRequests)
        .where(eq(organizationJoinRequests.id, requestId));
      
      if (!request) {
        throw new Error('Organization join request not found');
      }

      // Update status to approved
      await tx
        .update(organizationJoinRequests)
        .set({
          status: 'approved',
          reviewedBy,
          reviewedAt: new Date(),
        })
        .where(eq(organizationJoinRequests.id, requestId));

      // Add the user as an organization member
      await tx
        .insert(organizationMembers)
        .values({
          organizationId: request.organizationId,
          userId: request.userId,
          role: 'athlete',
        });
    });
  }

  async rejectOrganizationJoinRequest(requestId: string, reviewedBy: string): Promise<void> {
    await db
      .update(organizationJoinRequests)
      .set({
        status: 'rejected',
        reviewedBy,
        reviewedAt: new Date(),
      })
      .where(eq(organizationJoinRequests.id, requestId));
  }

  // ============================================
  // TEAM OPERATIONS
  // ============================================
  
  async createTeam(teamData: InsertTeam): Promise<Team> {
    const [team] = await db
      .insert(teams)
      .values(teamData)
      .returning();
    return team;
  }

  async getTeam(id: string): Promise<Team | undefined> {
    const [team] = await db
      .select()
      .from(teams)
      .where(eq(teams.id, id));
    return team;
  }

  async getOrganizationTeams(organizationId: string): Promise<Team[]> {
    const teamList = await db
      .select()
      .from(teams)
      .where(eq(teams.organizationId, organizationId));
    return teamList;
  }

  async addTeamMember(memberData: InsertTeamMember): Promise<TeamMember> {
    const [member] = await db
      .insert(teamMembers)
      .values(memberData)
      .returning();
    return member;
  }

  async getTeamMembers(teamId: string): Promise<(TeamMember & { user: User })[]> {
    const members = await db
      .select({
        id: teamMembers.id,
        teamId: teamMembers.teamId,
        userId: teamMembers.userId,
        role: teamMembers.role,
        joinedAt: teamMembers.joinedAt,
        user: users,
      })
      .from(teamMembers)
      .innerJoin(users, eq(teamMembers.userId, users.id))
      .where(eq(teamMembers.teamId, teamId));
    return members;
  }

  async searchTeams(searchTerm: string): Promise<(Team & { organization: Organization })[]> {
    const results = await db
      .select({
        id: teams.id,
        name: teams.name,
        description: teams.description,
        organizationId: teams.organizationId,
        createdAt: teams.createdAt,
        updatedAt: teams.updatedAt,
        organization: organizations,
      })
      .from(teams)
      .innerJoin(organizations, eq(teams.organizationId, organizations.id))
      .where(ilike(teams.name, `%${searchTerm}%`));
    return results;
  }

  // ============================================
  // TEAM JOIN REQUEST OPERATIONS
  // ============================================

  async createTeamJoinRequest(requestData: InsertTeamJoinRequest): Promise<TeamJoinRequest> {
    const [request] = await db
      .insert(teamJoinRequests)
      .values(requestData)
      .returning();
    return request;
  }

  async getTeamJoinRequests(teamId: string, status?: 'pending' | 'approved' | 'rejected'): Promise<(TeamJoinRequest & { user: User; team: Team & { organization: Organization } })[]> {
    let whereClause = eq(teamJoinRequests.teamId, teamId);
    if (status) {
      whereClause = and(eq(teamJoinRequests.teamId, teamId), eq(teamJoinRequests.status, status)) as any;
    }

    const results = await db
      .select()
      .from(teamJoinRequests)
      .innerJoin(users, eq(teamJoinRequests.userId, users.id))
      .innerJoin(teams, eq(teamJoinRequests.teamId, teams.id))
      .innerJoin(organizations, eq(teams.organizationId, organizations.id))
      .where(whereClause);
    
    return results.map((r: any) => ({
      ...r.team_join_requests,
      user: r.users,
      team: {
        ...r.teams,
        organization: r.organizations,
      },
    }));
  }

  async getUserJoinRequests(userId: string, status?: 'pending' | 'approved' | 'rejected'): Promise<(TeamJoinRequest & { team: Team & { organization: Organization } })[]> {
    let whereClause = eq(teamJoinRequests.userId, userId);
    if (status) {
      whereClause = and(eq(teamJoinRequests.userId, userId), eq(teamJoinRequests.status, status)) as any;
    }

    const results = await db
      .select()
      .from(teamJoinRequests)
      .innerJoin(teams, eq(teamJoinRequests.teamId, teams.id))
      .innerJoin(organizations, eq(teams.organizationId, organizations.id))
      .where(whereClause);
    
    return results.map((r: any) => ({
      ...r.team_join_requests,
      team: {
        ...r.teams,
        organization: r.organizations,
      },
    }));
  }

  async getOrganizationTeamJoinRequests(organizationId: string, status?: 'pending' | 'approved' | 'rejected'): Promise<(TeamJoinRequest & { user: User; team: Team })[]> {
    let whereClause = eq(teams.organizationId, organizationId);
    if (status) {
      whereClause = and(eq(teams.organizationId, organizationId), eq(teamJoinRequests.status, status)) as any;
    }

    const results = await db
      .select()
      .from(teamJoinRequests)
      .innerJoin(users, eq(teamJoinRequests.userId, users.id))
      .innerJoin(teams, eq(teamJoinRequests.teamId, teams.id))
      .where(whereClause);
    
    return results.map((r: any) => ({
      ...r.team_join_requests,
      user: r.users,
      team: r.teams,
    }));
  }

  async approveJoinRequest(requestId: string, reviewedBy: string): Promise<void> {
    // Get the request first
    const [request] = await db
      .select()
      .from(teamJoinRequests)
      .where(eq(teamJoinRequests.id, requestId));
    
    if (!request) {
      throw new Error('Join request not found');
    }

    // Update status to approved
    await db
      .update(teamJoinRequests)
      .set({
        status: 'approved',
        reviewedBy,
        reviewedAt: new Date(),
      })
      .where(eq(teamJoinRequests.id, requestId));

    // Add the user as a team member
    await db
      .insert(teamMembers)
      .values({
        teamId: request.teamId,
        userId: request.userId,
        role: 'athlete',
      });
  }

  async rejectJoinRequest(requestId: string, reviewedBy: string): Promise<void> {
    await db
      .update(teamJoinRequests)
      .set({
        status: 'rejected',
        reviewedBy,
        reviewedAt: new Date(),
      })
      .where(eq(teamJoinRequests.id, requestId));
  }

  async deleteJoinRequest(requestId: string): Promise<void> {
    await db
      .delete(teamJoinRequests)
      .where(eq(teamJoinRequests.id, requestId));
  }

  // ============================================
  // EXERCISE OPERATIONS
  // ============================================
  
  async createExercise(exerciseData: InsertExercise): Promise<Exercise> {
    const [exercise] = await db
      .insert(exercises)
      .values(exerciseData)
      .returning();
    return exercise;
  }

  async getExercises(organizationId?: string): Promise<Exercise[]> {
    if (organizationId) {
      // Get both global exercises and organization-specific exercises
      return await db
        .select()
        .from(exercises)
        .where(
          sql`${exercises.organizationId} IS NULL OR ${exercises.organizationId} = ${organizationId}`
        );
    }
    // Get only global exercises
    return await db
      .select()
      .from(exercises)
      .where(sql`${exercises.organizationId} IS NULL`);
  }

  async getExercise(id: string): Promise<Exercise | undefined> {
    const [exercise] = await db
      .select()
      .from(exercises)
      .where(eq(exercises.id, id));
    return exercise;
  }

  // ============================================
  // PROGRAM OPERATIONS
  // ============================================
  
  async createProgram(programData: InsertProgram): Promise<Program> {
    const [program] = await db
      .insert(programs)
      .values(programData)
      .returning();
    return program;
  }

  async createCompleteProgram(data: {
    program: InsertProgram;
    weeks: Array<{
      week: Omit<InsertProgramWeek, 'programId'>;
      days: Array<{
        day: Omit<InsertProgramDay, 'weekId'>;
        exercises: Array<Omit<InsertProgramExercise, 'dayId'>>;
      }>;
    }>;
  }): Promise<Program> {
    // CREATE COMPLETE PROGRAM: All-or-nothing transaction with validation
    return await db.transaction(async (tx) => {
      // Validate program structure before creating anything
      const weekNumbers = new Set<number>();
      
      for (const weekData of data.weeks) {
        // Validate week number is positive
        if (weekData.week.weekNumber < 1) {
          throw new ValidationError('Week number must be at least 1');
        }
        
        // Check for duplicate week numbers
        if (weekNumbers.has(weekData.week.weekNumber)) {
          throw new ConflictError(`Week ${weekData.week.weekNumber} appears multiple times in program`);
        }
        weekNumbers.add(weekData.week.weekNumber);
        
        // Validate days in this week
        const dayNumbers = new Set<number>();
        for (const dayData of weekData.days) {
          // Validate day number is within range
          if (dayData.day.dayNumber < 1 || dayData.day.dayNumber > 7) {
            throw new ValidationError('Day number must be between 1 and 7');
          }
          
          // Check for duplicate day numbers in this week
          if (dayNumbers.has(dayData.day.dayNumber)) {
            throw new ConflictError(`Day ${dayData.day.dayNumber} appears multiple times in week ${weekData.week.weekNumber}`);
          }
          dayNumbers.add(dayData.day.dayNumber);
          
          // Validate exercises in this day
          const exerciseOrders = new Set<number>();
          for (const exercise of dayData.exercises) {
            // Validate sets is positive
            if (exercise.sets !== null && exercise.sets !== undefined && exercise.sets < 1) {
              throw new ValidationError('Sets must be at least 1');
            }
            
            // Validate order is positive
            if (exercise.order < 1) {
              throw new ValidationError('Exercise order must be at least 1');
            }
            
            // Check for duplicate orders in this day
            if (exerciseOrders.has(exercise.order)) {
              throw new ConflictError(`Exercise order ${exercise.order} appears multiple times in week ${weekData.week.weekNumber}, day ${dayData.day.dayNumber}`);
            }
            exerciseOrders.add(exercise.order);
            
            // Verify exercise exists
            const exerciseExists = await tx
              .select()
              .from(exercises)
              .where(eq(exercises.id, exercise.exerciseId))
              .limit(1);
            
            if (exerciseExists.length === 0) {
              throw new ValidationError(`Exercise ${exercise.exerciseId} does not exist`);
            }
          }
        }
      }

      // All validation passed - create the program
      const [program] = await tx
        .insert(programs)
        .values(data.program)
        .returning();

      // Create all weeks, days, and exercises
      for (const weekData of data.weeks) {
        const [week] = await tx
          .insert(programWeeks)
          .values({
            ...weekData.week,
            programId: program.id,
          })
          .returning();

        for (const dayData of weekData.days) {
          const [day] = await tx
            .insert(programDays)
            .values({
              ...dayData.day,
              weekId: week.id,
            })
            .returning();

          if (dayData.exercises.length > 0) {
            const exerciseValues = dayData.exercises.map((ex) => ({
              ...ex,
              dayId: day.id,
            }));

            await tx
              .insert(programExercises)
              .values(exerciseValues);
          }
        }
      }

      return program;
    });
  }

  async getProgram(id: string): Promise<Program | undefined> {
    const [program] = await db
      .select()
      .from(programs)
      .where(eq(programs.id, id));
    return program;
  }

  async getOrganizationPrograms(organizationId: string): Promise<Program[]> {
    return await db
      .select()
      .from(programs)
      .where(eq(programs.organizationId, organizationId))
      .orderBy(desc(programs.createdAt));
  }

  async createProgramWeek(weekData: InsertProgramWeek): Promise<ProgramWeek> {
    // Validate week number is positive
    if (weekData.weekNumber < 1) {
      throw new ValidationError('Week number must be at least 1');
    }

    // Check for duplicate week number in the same program
    const existing = await db
      .select()
      .from(programWeeks)
      .where(
        and(
          eq(programWeeks.programId, weekData.programId),
          eq(programWeeks.weekNumber, weekData.weekNumber)
        )
      )
      .limit(1);

    if (existing.length > 0) {
      throw new ConflictError(`Week ${weekData.weekNumber} already exists in this program`);
    }

    const [week] = await db
      .insert(programWeeks)
      .values(weekData)
      .returning();
    return week;
  }

  async createProgramDay(dayData: InsertProgramDay): Promise<ProgramDay> {
    // Validate day number is within reasonable range (1-7 for weekly programs)
    if (dayData.dayNumber < 1 || dayData.dayNumber > 7) {
      throw new ValidationError('Day number must be between 1 and 7');
    }

    // Check for duplicate day number in the same week
    const existing = await db
      .select()
      .from(programDays)
      .where(
        and(
          eq(programDays.weekId, dayData.weekId),
          eq(programDays.dayNumber, dayData.dayNumber)
        )
      )
      .limit(1);

    if (existing.length > 0) {
      throw new ConflictError(`Day ${dayData.dayNumber} already exists in this week`);
    }

    const [day] = await db
      .insert(programDays)
      .values(dayData)
      .returning();
    return day;
  }

  async createProgramExercise(exerciseData: InsertProgramExercise): Promise<ProgramExercise> {
    // Validate sets is positive
    if (exerciseData.sets !== null && exerciseData.sets !== undefined && exerciseData.sets < 1) {
      throw new ValidationError('Sets must be at least 1');
    }

    // Validate order is positive
    if (exerciseData.order < 1) {
      throw new ValidationError('Exercise order must be at least 1');
    }

    // Verify exercise exists
    const exerciseExists = await db
      .select()
      .from(exercises)
      .where(eq(exercises.id, exerciseData.exerciseId))
      .limit(1);

    if (exerciseExists.length === 0) {
      throw new ValidationError('Exercise does not exist');
    }

    // Check for duplicate order in the same day
    const existing = await db
      .select()
      .from(programExercises)
      .where(
        and(
          eq(programExercises.dayId, exerciseData.dayId),
          eq(programExercises.order, exerciseData.order)
        )
      )
      .limit(1);

    if (existing.length > 0) {
      throw new ConflictError(`Exercise order ${exerciseData.order} is already used in this day`);
    }

    const [exercise] = await db
      .insert(programExercises)
      .values(exerciseData)
      .returning();
    return exercise;
  }

  async getProgramWeeks(programId: string): Promise<any[]> {
    // OPTIMIZED: Single query with JOINs instead of N+1 queries
    // Fetch all weeks, days, and exercises in one query
    const results = await db
      .select({
        week: programWeeks,
        day: programDays,
        programExercise: programExercises,
        exercise: exercises,
      })
      .from(programWeeks)
      .leftJoin(programDays, eq(programWeeks.id, programDays.weekId))
      .leftJoin(programExercises, eq(programDays.id, programExercises.dayId))
      .leftJoin(exercises, eq(programExercises.exerciseId, exercises.id))
      .where(eq(programWeeks.programId, programId))
      .orderBy(programWeeks.weekNumber, programDays.dayNumber, programExercises.order);

    // Group results in memory
    const weeksMap = new Map<string, any>();

    for (const row of results) {
      const { week, day, programExercise, exercise } = row;

      // Initialize week if not exists
      if (!weeksMap.has(week.id)) {
        weeksMap.set(week.id, {
          ...week,
          days: new Map<string, any>(),
        });
      }

      const weekData = weeksMap.get(week.id);

      // If there's a day, add it
      if (day) {
        if (!weekData.days.has(day.id)) {
          weekData.days.set(day.id, {
            ...day,
            exercises: [],
          });
        }

        const dayData = weekData.days.get(day.id);

        // If there's an exercise, add it
        if (programExercise) {
          dayData.exercises.push({
            id: programExercise.id,
            dayId: programExercise.dayId,
            exerciseId: programExercise.exerciseId,
            order: programExercise.order,
            sets: programExercise.sets,
            reps: programExercise.reps,
            intensity: programExercise.intensity,
            notes: programExercise.notes,
            exercise: exercise,
          });
        }
      }
    }

    // Convert maps to arrays
    return Array.from(weeksMap.values()).map(week => ({
      ...week,
      days: Array.from(week.days.values()),
    }));
  }

  async getProgramWeek(id: string): Promise<ProgramWeek | undefined> {
    const [week] = await db
      .select()
      .from(programWeeks)
      .where(eq(programWeeks.id, id));
    return week;
  }

  async getProgramDays(weekId: string): Promise<ProgramDay[]> {
    return await db
      .select()
      .from(programDays)
      .where(eq(programDays.weekId, weekId))
      .orderBy(programDays.dayNumber);
  }

  async getProgramDay(id: string): Promise<ProgramDay | undefined> {
    const [day] = await db
      .select()
      .from(programDays)
      .where(eq(programDays.id, id));
    return day;
  }

  async getProgramExercises(dayId: string): Promise<ProgramExercise[]> {
    return await db
      .select()
      .from(programExercises)
      .where(eq(programExercises.dayId, dayId))
      .orderBy(programExercises.order);
  }

  // ============================================
  // PROGRAM ASSIGNMENT OPERATIONS
  // ============================================
  
  async createProgramAssignment(assignmentData: InsertProgramAssignment): Promise<ProgramAssignment> {
    const [assignment] = await db
      .insert(programAssignments)
      .values(assignmentData)
      .returning();
    return assignment;
  }

  async getAthleteAssignments(athleteId: string): Promise<(ProgramAssignment & { program: Program })[]> {
    return await db
      .select({
        id: programAssignments.id,
        programId: programAssignments.programId,
        athleteId: programAssignments.athleteId,
        startDate: programAssignments.startDate,
        status: programAssignments.status,
        assignedBy: programAssignments.assignedBy,
        assignedAt: programAssignments.assignedAt,
        program: programs,
      })
      .from(programAssignments)
      .innerJoin(programs, eq(programAssignments.programId, programs.id))
      .where(eq(programAssignments.athleteId, athleteId))
      .orderBy(desc(programAssignments.assignedAt));
  }

  async getProgramAssignments(programId: string): Promise<(ProgramAssignment & { athlete: User })[]> {
    return await db
      .select({
        id: programAssignments.id,
        programId: programAssignments.programId,
        athleteId: programAssignments.athleteId,
        startDate: programAssignments.startDate,
        status: programAssignments.status,
        assignedBy: programAssignments.assignedBy,
        assignedAt: programAssignments.assignedAt,
        athlete: users,
      })
      .from(programAssignments)
      .innerJoin(users, eq(programAssignments.athleteId, users.id))
      .where(eq(programAssignments.programId, programId))
      .orderBy(desc(programAssignments.assignedAt));
  }

  async deleteProgramAssignment(id: string): Promise<void> {
    await db.delete(programAssignments).where(eq(programAssignments.id, id));
  }

  // ============================================
  // WORKOUT LOGGING OPERATIONS
  // ============================================
  
  async createWorkoutSession(sessionData: InsertWorkoutSession): Promise<WorkoutSession> {
    const [session] = await db
      .insert(workoutSessions)
      .values(sessionData)
      .returning();
    return session;
  }

  async getWorkoutSession(id: string): Promise<WorkoutSession | undefined> {
    const [session] = await db
      .select()
      .from(workoutSessions)
      .where(eq(workoutSessions.id, id));
    return session;
  }

  async getAthleteWorkouts(athleteId: string): Promise<WorkoutSession[]> {
    return await db
      .select()
      .from(workoutSessions)
      .where(eq(workoutSessions.athleteId, athleteId))
      .orderBy(desc(workoutSessions.scheduledDate));
  }

  async updateWorkoutSession(
    id: string,
    data: Partial<WorkoutSession>
  ): Promise<WorkoutSession | undefined> {
    const [session] = await db
      .update(workoutSessions)
      .set(data)
      .where(eq(workoutSessions.id, id))
      .returning();
    return session;
  }

  async createExerciseLog(logData: InsertExerciseLog): Promise<ExerciseLog> {
    const [log] = await db
      .insert(exerciseLogs)
      .values(logData)
      .returning();
    return log;
  }

  async createSetLog(logData: InsertSetLog): Promise<SetLog> {
    const [log] = await db
      .insert(setLogs)
      .values(logData)
      .returning();
    return log;
  }

  async getSessionExerciseLogs(sessionId: string): Promise<ExerciseLog[]> {
    return await db
      .select()
      .from(exerciseLogs)
      .where(eq(exerciseLogs.sessionId, sessionId))
      .orderBy(exerciseLogs.order);
  }

  async getExerciseLog(id: string): Promise<ExerciseLog | undefined> {
    const [log] = await db
      .select()
      .from(exerciseLogs)
      .where(eq(exerciseLogs.id, id));
    return log;
  }

  async getExerciseLogSets(exerciseLogId: string): Promise<SetLog[]> {
    return await db
      .select()
      .from(setLogs)
      .where(eq(setLogs.exerciseLogId, exerciseLogId))
      .orderBy(setLogs.setNumber);
  }

  // ============================================
  // MESSAGING OPERATIONS
  // ============================================
  
  async createMessage(messageData: InsertMessage): Promise<Message> {
    const [message] = await db
      .insert(messages)
      .values(messageData)
      .returning();
    return message;
  }

  async getConversation(userId1: string, userId2: string): Promise<Message[]> {
    return await db
      .select()
      .from(messages)
      .where(
        sql`(${messages.senderId} = ${userId1} AND ${messages.recipientId} = ${userId2}) OR (${messages.senderId} = ${userId2} AND ${messages.recipientId} = ${userId1})`
      )
      .orderBy(messages.createdAt);
  }

  async markMessageAsRead(id: string): Promise<void> {
    await db
      .update(messages)
      .set({ readAt: new Date() })
      .where(eq(messages.id, id));
  }

  // ============================================
  // DELETE OPERATIONS
  // ============================================

  async deleteOrganization(id: string): Promise<void> {
    // CASCADE DELETE: Remove organization and all its children in a transaction
    await db.transaction(async (tx) => {
      // Step 1: Get all teams in this organization
      const orgTeams = await tx
        .select({ id: teams.id })
        .from(teams)
        .where(eq(teams.organizationId, id));
      
      const teamIds = orgTeams.map(t => t.id);
      
      if (teamIds.length > 0) {
        // Step 2: Delete all join requests for teams in this organization
        await tx
          .delete(teamJoinRequests)
          .where(inArray(teamJoinRequests.teamId, teamIds));
        
        // Step 3: Delete all team members for teams in this organization
        await tx
          .delete(teamMembers)
          .where(inArray(teamMembers.teamId, teamIds));
      }
      
      // Step 5: Get all programs in this organization
      const orgPrograms = await tx
        .select({ id: programs.id })
        .from(programs)
        .where(eq(programs.organizationId, id));
      
      const programIds = orgPrograms.map(p => p.id);
      
      if (programIds.length > 0) {
        // Step 6: Get all weeks for these programs
        const weeks = await tx
          .select({ id: programWeeks.id })
          .from(programWeeks)
          .where(inArray(programWeeks.programId, programIds));
        
        const weekIds = weeks.map(w => w.id);
        
        if (weekIds.length > 0) {
          // Step 7: Get all days for these weeks
          const days = await tx
            .select({ id: programDays.id })
            .from(programDays)
            .where(inArray(programDays.weekId, weekIds));
          
          const dayIds = days.map(d => d.id);
          
          if (dayIds.length > 0) {
            // Step 8: Get all workout sessions for these days
            const sessions = await tx
              .select({ id: workoutSessions.id })
              .from(workoutSessions)
              .where(inArray(workoutSessions.programDayId, dayIds));
            
            const sessionIds = sessions.map(s => s.id);
            
            if (sessionIds.length > 0) {
              // Step 8a: Get all exercise logs for these sessions
              const logs = await tx
                .select({ id: exerciseLogs.id })
                .from(exerciseLogs)
                .where(inArray(exerciseLogs.sessionId, sessionIds));
              
              const logIds = logs.map(l => l.id);
              
              if (logIds.length > 0) {
                // Step 8b: Delete all set logs
                await tx
                  .delete(setLogs)
                  .where(inArray(setLogs.exerciseLogId, logIds));
              }
              
              // Step 8c: Delete all exercise logs
              await tx
                .delete(exerciseLogs)
                .where(inArray(exerciseLogs.sessionId, sessionIds));
            }
            
            // Step 8d: Delete all workout sessions
            await tx
              .delete(workoutSessions)
              .where(inArray(workoutSessions.programDayId, dayIds));
            
            // Step 9: Delete all program exercises for these days
            await tx
              .delete(programExercises)
              .where(inArray(programExercises.dayId, dayIds));
          }
          
          // Step 10: Delete all days
          await tx
            .delete(programDays)
            .where(inArray(programDays.weekId, weekIds));
        }
        
        // Step 11: Delete all weeks
        await tx
          .delete(programWeeks)
          .where(inArray(programWeeks.programId, programIds));
        
        // Step 12: Delete all program assignments
        await tx
          .delete(programAssignments)
          .where(inArray(programAssignments.programId, programIds));
        
        // Step 13: Delete all programs
        await tx
          .delete(programs)
          .where(eq(programs.organizationId, id));
      }
      
      // Step 14: Delete all custom exercises for this organization
      await tx
        .delete(exercises)
        .where(eq(exercises.organizationId, id));
      
      // Step 15: Delete all teams
      if (teamIds.length > 0) {
        await tx
          .delete(teams)
          .where(eq(teams.organizationId, id));
      }
      
      // Step 16: Finally, delete the organization itself
      await tx
        .delete(organizations)
        .where(eq(organizations.id, id));
    });
  }

  async deleteTeam(id: string): Promise<void> {
    // CASCADE DELETE: Remove team and all its children in a transaction
    await db.transaction(async (tx) => {
      // Step 1: Delete all join requests for this team
      await tx
        .delete(teamJoinRequests)
        .where(eq(teamJoinRequests.teamId, id));
      
      // Step 2: Delete all team members
      await tx
        .delete(teamMembers)
        .where(eq(teamMembers.teamId, id));
      
      // Step 3: Finally, delete the team itself
      // Note: We don't delete program assignments because they're tied to programs/athletes,
      // not teams. Programs belong to organizations, not teams.
      await tx
        .delete(teams)
        .where(eq(teams.id, id));
    });
  }

  async removeTeamMember(teamId: string, userId: string): Promise<void> {
    await db
      .delete(teamMembers)
      .where(and(eq(teamMembers.teamId, teamId), eq(teamMembers.userId, userId)));
  }

  async deleteProgram(id: string): Promise<void> {
    // CASCADE DELETE: Remove program and all its children in a transaction
    await db.transaction(async (tx) => {
      // Get all weeks for this program
      const weeks = await tx
        .select({ id: programWeeks.id })
        .from(programWeeks)
        .where(eq(programWeeks.programId, id));
      
      if (weeks.length > 0) {
        const weekIds = weeks.map(w => w.id);
        
        // Get all days for these weeks
        const days = await tx
          .select({ id: programDays.id })
          .from(programDays)
          .where(inArray(programDays.weekId, weekIds));
        
        if (days.length > 0) {
          const dayIds = days.map(d => d.id);
          
          // Delete exercises for these days
          await tx.delete(programExercises).where(inArray(programExercises.dayId, dayIds));
          
          // Delete the days
          await tx.delete(programDays).where(inArray(programDays.id, dayIds));
        }
        
        // Delete the weeks
        await tx.delete(programWeeks).where(inArray(programWeeks.id, weekIds));
      }
      
      // Finally delete the program itself
      await tx.delete(programs).where(eq(programs.id, id));
    });
  }

  async deleteExercise(id: string): Promise<void> {
    await db.delete(exercises).where(eq(exercises.id, id));
  }

  async deleteWorkoutSession(id: string): Promise<void> {
    await db.delete(workoutSessions).where(eq(workoutSessions.id, id));
  }

  async deleteExerciseLog(id: string): Promise<void> {
    await db.delete(exerciseLogs).where(eq(exerciseLogs.id, id));
  }

  async deleteSetLog(id: string): Promise<void> {
    await db.delete(setLogs).where(eq(setLogs.id, id));
  }

  async deleteProgramExercise(id: string): Promise<void> {
    await db.delete(programExercises).where(eq(programExercises.id, id));
  }

  // ============================================
  // UPDATE OPERATIONS
  // ============================================

  async updateExercise(
    id: string,
    data: Partial<Exercise>
  ): Promise<Exercise | undefined> {
    const [exercise] = await db
      .update(exercises)
      .set(data)
      .where(eq(exercises.id, id))
      .returning();
    return exercise;
  }

  async updateProgram(
    id: string,
    data: Partial<Program>
  ): Promise<Program | undefined> {
    const [program] = await db
      .update(programs)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(programs.id, id))
      .returning();
    return program;
  }

  async updateProgramWeek(
    id: string,
    data: Partial<ProgramWeek>
  ): Promise<ProgramWeek | undefined> {
    const [week] = await db
      .update(programWeeks)
      .set(data)
      .where(eq(programWeeks.id, id))
      .returning();
    return week;
  }

  async updateProgramDay(
    id: string,
    data: Partial<ProgramDay>
  ): Promise<ProgramDay | undefined> {
    const [day] = await db
      .update(programDays)
      .set(data)
      .where(eq(programDays.id, id))
      .returning();
    return day;
  }

  async updateProgramExercise(
    id: string,
    data: Partial<ProgramExercise>
  ): Promise<ProgramExercise | undefined> {
    const [exercise] = await db
      .update(programExercises)
      .set(data)
      .where(eq(programExercises.id, id))
      .returning();
    return exercise;
  }

  async updateOrganization(
    id: string,
    data: Partial<Organization>
  ): Promise<Organization | undefined> {
    const [org] = await db
      .update(organizations)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(organizations.id, id))
      .returning();
    return org;
  }

  async updateTeam(
    id: string,
    data: Partial<Team>
  ): Promise<Team | undefined> {
    const [team] = await db
      .update(teams)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(teams.id, id))
      .returning();
    return team;
  }

  // ============================================
  // ADDITIONAL GET OPERATIONS
  // ============================================

  async getProgramExercise(id: string): Promise<ProgramExercise | undefined> {
    const [exercise] = await db
      .select()
      .from(programExercises)
      .where(eq(programExercises.id, id));
    return exercise;
  }

  // ============================================
  // STATISTICS OPERATIONS
  // ============================================

  async getCoachStatistics(userId: string, organizationId: string) {
    // Verify user has access to this organization (either through teams or as org member/owner)
    const userTeams = await this.getUserTeams(userId);
    const hasTeamAccess = userTeams.some(team => team.organizationId === organizationId);
    
    if (!hasTeamAccess) {
      // Check if user is an organization member (owner/creator)
      const orgMembers = await db
        .select()
        .from(organizationMembers)
        .where(
          and(
            eq(organizationMembers.organizationId, organizationId),
            eq(organizationMembers.userId, userId)
          )
        );
      
      if (orgMembers.length === 0) {
        throw new Error('User does not have access to this organization');
      }
    }

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const programCount = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(programs)
      .where(eq(programs.organizationId, organizationId));

    // Use COUNT(DISTINCT) to avoid double-counting athletes in multiple teams
    const athleteCount = await db
      .select({ count: sql<number>`count(distinct ${users.id})::int` })
      .from(teamMembers)
      .innerJoin(users, eq(teamMembers.userId, users.id))
      .innerJoin(teams, eq(teamMembers.teamId, teams.id))
      .where(
        and(
          eq(teams.organizationId, organizationId),
          eq(users.role, 'athlete')
        )
      );

    // Use DISTINCT to avoid double-counting workouts for athletes in multiple teams
    const completionStats = await db
      .select({
        total: sql<number>`count(distinct ${workoutSessions.id})::int`,
        completed: sql<number>`count(distinct ${workoutSessions.id}) filter (where ${workoutSessions.completedAt} is not null)::int`,
      })
      .from(workoutSessions)
      .innerJoin(users, eq(workoutSessions.athleteId, users.id))
      .innerJoin(teamMembers, eq(users.id, teamMembers.userId))
      .innerJoin(teams, eq(teamMembers.teamId, teams.id))
      .where(
        and(
          eq(teams.organizationId, organizationId),
          sql`${workoutSessions.startedAt} >= ${sevenDaysAgo}`
        )
      );

    // Use DISTINCT on set_logs.id to avoid double-counting
    const volumeStats = await db
      .select({
        totalReps: sql<number>`coalesce(sum(distinct_reps.reps), 0)::int`,
      })
      .from(
        db
          .selectDistinct({
            id: setLogs.id,
            reps: setLogs.reps,
          })
          .from(setLogs)
          .innerJoin(exerciseLogs, eq(setLogs.exerciseLogId, exerciseLogs.id))
          .innerJoin(workoutSessions, eq(exerciseLogs.sessionId, workoutSessions.id))
          .innerJoin(users, eq(workoutSessions.athleteId, users.id))
          .innerJoin(teamMembers, eq(users.id, teamMembers.userId))
          .innerJoin(teams, eq(teamMembers.teamId, teams.id))
          .where(
            and(
              eq(teams.organizationId, organizationId),
              sql`${setLogs.timestamp} >= ${sevenDaysAgo}`
            )
          )
          .as('distinct_reps')
      );

    const total = completionStats[0]?.total || 0;
    const completed = completionStats[0]?.completed || 0;
    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

    return {
      programs: programCount[0]?.count || 0,
      athletes: athleteCount[0]?.count || 0,
      completionRate,
      weeklyVolume: volumeStats[0]?.totalReps || 0,
    };
  }

  async getAthleteStatistics(userId: string) {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const assignmentCount = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(programAssignments)
      .where(
        and(
          eq(programAssignments.athleteId, userId),
          eq(programAssignments.status, 'active')
        )
      );

    const workoutCount = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(workoutSessions)
      .where(
        and(
          eq(workoutSessions.athleteId, userId),
          sql`${workoutSessions.completedAt} is not null`,
          sql`${workoutSessions.completedAt} >= ${sevenDaysAgo}`
        )
      );

    const completionStats = await db
      .select({
        total: sql<number>`count(*)::int`,
        completed: sql<number>`count(*) filter (where ${workoutSessions.completedAt} is not null)::int`,
      })
      .from(workoutSessions)
      .where(
        and(
          eq(workoutSessions.athleteId, userId),
          sql`${workoutSessions.startedAt} >= ${sevenDaysAgo}`
        )
      );

    const volumeStats = await db
      .select({
        totalReps: sql<number>`coalesce(sum(${setLogs.reps}), 0)::int`,
      })
      .from(setLogs)
      .innerJoin(exerciseLogs, eq(setLogs.exerciseLogId, exerciseLogs.id))
      .innerJoin(workoutSessions, eq(exerciseLogs.sessionId, workoutSessions.id))
      .where(
        and(
          eq(workoutSessions.athleteId, userId),
          sql`${setLogs.timestamp} >= ${sevenDaysAgo}`
        )
      );

    const total = completionStats[0]?.total || 0;
    const completed = completionStats[0]?.completed || 0;
    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

    return {
      programs: assignmentCount[0]?.count || 0,
      workouts: workoutCount[0]?.count || 0,
      completionRate,
      weeklyVolume: volumeStats[0]?.totalReps || 0,
    };
  }
}

export const storage = new DatabaseStorage();
