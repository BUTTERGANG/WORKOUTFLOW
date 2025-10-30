import {
  users,
  organizations,
  teams,
  teamMembers,
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
  type Team,
  type InsertTeam,
  type TeamMember,
  type InsertTeamMember,
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
import { eq, and, desc, sql } from "drizzle-orm";

export interface IStorage {
  // User operations (Required for Replit Auth)
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  updateUserRole(userId: string, role: 'admin' | 'head_coach' | 'assistant_coach' | 'athlete'): Promise<void>;
  getUserTeams(userId: string): Promise<Team[]>;
  
  // Organization operations
  createOrganization(org: InsertOrganization): Promise<Organization>;
  getOrganization(id: string): Promise<Organization | undefined>;
  getUserOrganizations(userId: string): Promise<Organization[]>;
  
  // Team operations
  createTeam(team: InsertTeam): Promise<Team>;
  getTeam(id: string): Promise<Team | undefined>;
  getOrganizationTeams(organizationId: string): Promise<Team[]>;
  addTeamMember(member: InsertTeamMember): Promise<TeamMember>;
  getTeamMembers(teamId: string): Promise<(TeamMember & { user: User })[]>;
  
  // Exercise operations
  createExercise(exercise: InsertExercise): Promise<Exercise>;
  getExercises(organizationId?: string): Promise<Exercise[]>;
  getExercise(id: string): Promise<Exercise | undefined>;
  
  // Program operations
  createProgram(program: InsertProgram): Promise<Program>;
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
  getAthleteAssignments(athleteId: string): Promise<ProgramAssignment[]>;
  
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

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  async updateUserRole(userId: string, role: 'admin' | 'head_coach' | 'assistant_coach' | 'athlete'): Promise<void> {
    await db
      .update(users)
      .set({ role, updatedAt: new Date() })
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
    const [org] = await db
      .insert(organizations)
      .values(orgData)
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
    const [week] = await db
      .insert(programWeeks)
      .values(weekData)
      .returning();
    return week;
  }

  async createProgramDay(dayData: InsertProgramDay): Promise<ProgramDay> {
    const [day] = await db
      .insert(programDays)
      .values(dayData)
      .returning();
    return day;
  }

  async createProgramExercise(exerciseData: InsertProgramExercise): Promise<ProgramExercise> {
    const [exercise] = await db
      .insert(programExercises)
      .values(exerciseData)
      .returning();
    return exercise;
  }

  async getProgramWeeks(programId: string): Promise<ProgramWeek[]> {
    return await db
      .select()
      .from(programWeeks)
      .where(eq(programWeeks.programId, programId))
      .orderBy(programWeeks.weekNumber);
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

  async getAthleteAssignments(athleteId: string): Promise<ProgramAssignment[]> {
    return await db
      .select()
      .from(programAssignments)
      .where(eq(programAssignments.athleteId, athleteId))
      .orderBy(desc(programAssignments.assignedAt));
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
    await db.delete(organizations).where(eq(organizations.id, id));
  }

  async deleteTeam(id: string): Promise<void> {
    await db.delete(teams).where(eq(teams.id, id));
  }

  async removeTeamMember(teamId: string, userId: string): Promise<void> {
    await db
      .delete(teamMembers)
      .where(and(eq(teamMembers.teamId, teamId), eq(teamMembers.userId, userId)));
  }

  async deleteProgram(id: string): Promise<void> {
    await db.delete(programs).where(eq(programs.id, id));
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
}

export const storage = new DatabaseStorage();
