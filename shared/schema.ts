import { sql } from 'drizzle-orm';
import { relations } from 'drizzle-orm';
import {
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  varchar,
  pgEnum,
  real,
  boolean,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// ============================================
// ENUMS
// ============================================

export const userRoleEnum = pgEnum('user_role', ['admin', 'head_coach', 'assistant_coach', 'athlete']);
export const programPhaseEnum = pgEnum('program_phase', ['hypertrophy', 'strength', 'power', 'peaking', 'deload']);
export const workoutStatusEnum = pgEnum('workout_status', ['scheduled', 'in_progress', 'completed', 'skipped']);

// ============================================
// SESSION & AUTH TABLES (Required for Replit Auth)
// ============================================

// Session storage table for Replit Auth
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User storage table for Replit Auth
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  role: userRoleEnum("role").notNull().default('athlete'),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;

// ============================================
// ORGANIZATION HIERARCHY
// ============================================

export const organizations = pgTable("organizations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  ownerId: varchar("owner_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_organizations_owner_id").on(table.ownerId),
]);

export const teams = pgTable("teams", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  organizationId: varchar("organization_id").notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_teams_organization_id").on(table.organizationId),
]);

// Junction table for team members (coaches and athletes)
export const teamMembers = pgTable("team_members", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  teamId: varchar("team_id").notNull().references(() => teams.id, { onDelete: 'cascade' }),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  role: userRoleEnum("role").notNull(),
  joinedAt: timestamp("joined_at").defaultNow(),
}, (table) => [
  index("idx_team_members_team_id").on(table.teamId),
  index("idx_team_members_user_id").on(table.userId),
]);

// ============================================
// EXERCISE LIBRARY
// ============================================

export const exercises = pgTable("exercises", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  category: varchar("category", { length: 100 }), // e.g., 'squat', 'press', 'pull', 'olympic', 'accessory'
  muscleGroup: varchar("muscle_group", { length: 100 }), // e.g., 'legs', 'chest', 'back'
  equipment: varchar("equipment", { length: 100 }), // e.g., 'barbell', 'dumbbell', 'bodyweight'
  videoUrl: text("video_url"),
  instructions: text("instructions"),
  createdBy: varchar("created_by").references(() => users.id, { onDelete: 'set null' }),
  organizationId: varchar("organization_id").references(() => organizations.id, { onDelete: 'cascade' }), // null = global exercise
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_exercises_organization_id").on(table.organizationId),
  index("idx_exercises_created_by").on(table.createdBy),
]);

// ============================================
// PROGRAMS & WORKOUTS
// ============================================

export const programs = pgTable("programs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  durationWeeks: integer("duration_weeks").notNull(),
  phase: programPhaseEnum("phase"),
  createdBy: varchar("created_by").notNull().references(() => users.id, { onDelete: 'cascade' }),
  organizationId: varchar("organization_id").notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  isTemplate: boolean("is_template").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_programs_organization_id").on(table.organizationId),
  index("idx_programs_created_by").on(table.createdBy),
  index("idx_programs_created_at").on(table.createdAt),
]);

export const programWeeks = pgTable("program_weeks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  programId: varchar("program_id").notNull().references(() => programs.id, { onDelete: 'cascade' }),
  weekNumber: integer("week_number").notNull(),
  notes: text("notes"),
}, (table) => [
  index("idx_program_weeks_program_id").on(table.programId),
]);

export const programDays = pgTable("program_days", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  weekId: varchar("week_id").notNull().references(() => programWeeks.id, { onDelete: 'cascade' }),
  dayNumber: integer("day_number").notNull(),
  name: varchar("name", { length: 255 }), // e.g., "Squat Day", "Upper Body"
  notes: text("notes"),
}, (table) => [
  index("idx_program_days_week_id").on(table.weekId),
]);

export const programExercises = pgTable("program_exercises", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  dayId: varchar("day_id").notNull().references(() => programDays.id, { onDelete: 'cascade' }),
  exerciseId: varchar("exercise_id").notNull().references(() => exercises.id, { onDelete: 'cascade' }),
  order: integer("order").notNull(),
  sets: integer("sets").notNull(),
  reps: varchar("reps", { length: 50 }), // e.g., "5", "8-12", "AMRAP"
  intensity: varchar("intensity", { length: 50 }), // e.g., "75%", "RPE 8"
  restSeconds: integer("rest_seconds"),
  notes: text("notes"),
}, (table) => [
  index("idx_program_exercises_day_id").on(table.dayId),
  index("idx_program_exercises_exercise_id").on(table.exerciseId),
]);

// Program assignments to athletes
export const programAssignments = pgTable("program_assignments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  programId: varchar("program_id").notNull().references(() => programs.id, { onDelete: 'cascade' }),
  athleteId: varchar("athlete_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  startDate: timestamp("start_date").notNull(),
  status: varchar("status", { length: 50 }).default('active'), // 'active', 'completed', 'paused'
  assignedBy: varchar("assigned_by").notNull().references(() => users.id, { onDelete: 'cascade' }),
  assignedAt: timestamp("assigned_at").defaultNow(),
}, (table) => [
  index("idx_program_assignments_program_id").on(table.programId),
  index("idx_program_assignments_athlete_id").on(table.athleteId),
  index("idx_program_assignments_assigned_by").on(table.assignedBy),
  index("idx_program_assignments_assigned_at").on(table.assignedAt),
]);

// ============================================
// WORKOUT LOGGING
// ============================================

export const workoutSessions = pgTable("workout_sessions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  athleteId: varchar("athlete_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  programDayId: varchar("program_day_id").references(() => programDays.id, { onDelete: 'set null' }),
  scheduledDate: timestamp("scheduled_date"),
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
  status: workoutStatusEnum("status").default('scheduled'),
  durationMinutes: integer("duration_minutes"),
  overallRpe: integer("overall_rpe"), // 1-10 scale
  notes: text("notes"),
}, (table) => [
  index("idx_workout_sessions_athlete_id").on(table.athleteId),
  index("idx_workout_sessions_program_day_id").on(table.programDayId),
  index("idx_workout_sessions_scheduled_date").on(table.scheduledDate),
  index("idx_workout_sessions_completed_at").on(table.completedAt),
]);

export const exerciseLogs = pgTable("exercise_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sessionId: varchar("session_id").notNull().references(() => workoutSessions.id, { onDelete: 'cascade' }),
  exerciseId: varchar("exercise_id").notNull().references(() => exercises.id, { onDelete: 'cascade' }),
  order: integer("order").notNull(),
  notes: text("notes"),
}, (table) => [
  index("idx_exercise_logs_session_id").on(table.sessionId),
  index("idx_exercise_logs_exercise_id").on(table.exerciseId),
]);

export const setLogs = pgTable("set_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  exerciseLogId: varchar("exercise_log_id").notNull().references(() => exerciseLogs.id, { onDelete: 'cascade' }),
  setNumber: integer("set_number").notNull(),
  weight: real("weight"), // in user's preferred unit (lbs/kg)
  reps: integer("reps"),
  rpe: integer("rpe"), // 1-10 scale
  completed: boolean("completed").default(true),
  timestamp: timestamp("timestamp").defaultNow(),
}, (table) => [
  index("idx_set_logs_exercise_log_id").on(table.exerciseLogId),
]);

// ============================================
// MESSAGING
// ============================================

export const messages = pgTable("messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  senderId: varchar("sender_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  recipientId: varchar("recipient_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  workoutSessionId: varchar("workout_session_id").references(() => workoutSessions.id, { onDelete: 'set null' }), // for workout-specific comments
  content: text("content").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  readAt: timestamp("read_at"),
}, (table) => [
  index("idx_messages_sender_id").on(table.senderId),
  index("idx_messages_recipient_id").on(table.recipientId),
  index("idx_messages_workout_session_id").on(table.workoutSessionId),
  index("idx_messages_created_at").on(table.createdAt),
]);

// ============================================
// RELATIONS
// ============================================

export const usersRelations = relations(users, ({ many }) => ({
  ownedOrganizations: many(organizations),
  teamMemberships: many(teamMembers),
  createdPrograms: many(programs),
  programAssignments: many(programAssignments),
  workoutSessions: many(workoutSessions),
  sentMessages: many(messages, { relationName: 'sentMessages' }),
  receivedMessages: many(messages, { relationName: 'receivedMessages' }),
}));

export const organizationsRelations = relations(organizations, ({ one, many }) => ({
  owner: one(users, {
    fields: [organizations.ownerId],
    references: [users.id],
  }),
  teams: many(teams),
  programs: many(programs),
  exercises: many(exercises),
}));

export const teamsRelations = relations(teams, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [teams.organizationId],
    references: [organizations.id],
  }),
  members: many(teamMembers),
}));

export const teamMembersRelations = relations(teamMembers, ({ one }) => ({
  team: one(teams, {
    fields: [teamMembers.teamId],
    references: [teams.id],
  }),
  user: one(users, {
    fields: [teamMembers.userId],
    references: [users.id],
  }),
}));

export const exercisesRelations = relations(exercises, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [exercises.organizationId],
    references: [organizations.id],
  }),
  programExercises: many(programExercises),
  exerciseLogs: many(exerciseLogs),
}));

export const programsRelations = relations(programs, ({ one, many }) => ({
  creator: one(users, {
    fields: [programs.createdBy],
    references: [users.id],
  }),
  organization: one(organizations, {
    fields: [programs.organizationId],
    references: [organizations.id],
  }),
  weeks: many(programWeeks),
  assignments: many(programAssignments),
}));

export const programWeeksRelations = relations(programWeeks, ({ one, many }) => ({
  program: one(programs, {
    fields: [programWeeks.programId],
    references: [programs.id],
  }),
  days: many(programDays),
}));

export const programDaysRelations = relations(programDays, ({ one, many }) => ({
  week: one(programWeeks, {
    fields: [programDays.weekId],
    references: [programWeeks.id],
  }),
  exercises: many(programExercises),
  sessions: many(workoutSessions),
}));

export const programExercisesRelations = relations(programExercises, ({ one }) => ({
  day: one(programDays, {
    fields: [programExercises.dayId],
    references: [programDays.id],
  }),
  exercise: one(exercises, {
    fields: [programExercises.exerciseId],
    references: [exercises.id],
  }),
}));

export const programAssignmentsRelations = relations(programAssignments, ({ one }) => ({
  program: one(programs, {
    fields: [programAssignments.programId],
    references: [programs.id],
  }),
  athlete: one(users, {
    fields: [programAssignments.athleteId],
    references: [users.id],
  }),
}));

export const workoutSessionsRelations = relations(workoutSessions, ({ one, many }) => ({
  athlete: one(users, {
    fields: [workoutSessions.athleteId],
    references: [users.id],
  }),
  programDay: one(programDays, {
    fields: [workoutSessions.programDayId],
    references: [programDays.id],
  }),
  exerciseLogs: many(exerciseLogs),
  messages: many(messages),
}));

export const exerciseLogsRelations = relations(exerciseLogs, ({ one, many }) => ({
  session: one(workoutSessions, {
    fields: [exerciseLogs.sessionId],
    references: [workoutSessions.id],
  }),
  exercise: one(exercises, {
    fields: [exerciseLogs.exerciseId],
    references: [exercises.id],
  }),
  sets: many(setLogs),
}));

export const setLogsRelations = relations(setLogs, ({ one }) => ({
  exerciseLog: one(exerciseLogs, {
    fields: [setLogs.exerciseLogId],
    references: [exerciseLogs.id],
  }),
}));

export const messagesRelations = relations(messages, ({ one }) => ({
  sender: one(users, {
    fields: [messages.senderId],
    references: [users.id],
    relationName: 'sentMessages',
  }),
  recipient: one(users, {
    fields: [messages.recipientId],
    references: [users.id],
    relationName: 'receivedMessages',
  }),
  workoutSession: one(workoutSessions, {
    fields: [messages.workoutSessionId],
    references: [workoutSessions.id],
  }),
}));

// ============================================
// INSERT SCHEMAS (for validation)
// ============================================

export const insertOrganizationSchema = createInsertSchema(organizations).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertTeamSchema = createInsertSchema(teams).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertTeamMemberSchema = createInsertSchema(teamMembers).omit({
  id: true,
  joinedAt: true,
});

export const insertExerciseSchema = createInsertSchema(exercises).omit({
  id: true,
  createdAt: true,
});

export const insertProgramSchema = createInsertSchema(programs).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertProgramWeekSchema = createInsertSchema(programWeeks).omit({
  id: true,
});

export const insertProgramDaySchema = createInsertSchema(programDays).omit({
  id: true,
});

export const insertProgramExerciseSchema = createInsertSchema(programExercises).omit({
  id: true,
});

export const insertProgramAssignmentSchema = createInsertSchema(programAssignments).omit({
  id: true,
  assignedAt: true,
});

export const insertWorkoutSessionSchema = createInsertSchema(workoutSessions).omit({
  id: true,
});

export const insertExerciseLogSchema = createInsertSchema(exerciseLogs).omit({
  id: true,
});

export const insertSetLogSchema = createInsertSchema(setLogs).omit({
  id: true,
  timestamp: true,
});

export const insertMessageSchema = createInsertSchema(messages).omit({
  id: true,
  createdAt: true,
  readAt: true,
});

// ============================================
// TYPES
// ============================================

export type Organization = typeof organizations.$inferSelect;
export type InsertOrganization = z.infer<typeof insertOrganizationSchema>;

export type Team = typeof teams.$inferSelect;
export type InsertTeam = z.infer<typeof insertTeamSchema>;

export type TeamMember = typeof teamMembers.$inferSelect;
export type InsertTeamMember = z.infer<typeof insertTeamMemberSchema>;

export type Exercise = typeof exercises.$inferSelect;
export type InsertExercise = z.infer<typeof insertExerciseSchema>;

export type Program = typeof programs.$inferSelect;
export type InsertProgram = z.infer<typeof insertProgramSchema>;

export type ProgramWeek = typeof programWeeks.$inferSelect;
export type InsertProgramWeek = z.infer<typeof insertProgramWeekSchema>;

export type ProgramDay = typeof programDays.$inferSelect;
export type InsertProgramDay = z.infer<typeof insertProgramDaySchema>;

export type ProgramExercise = typeof programExercises.$inferSelect;
export type InsertProgramExercise = z.infer<typeof insertProgramExerciseSchema>;

export type ProgramAssignment = typeof programAssignments.$inferSelect;
export type InsertProgramAssignment = z.infer<typeof insertProgramAssignmentSchema>;

export type WorkoutSession = typeof workoutSessions.$inferSelect;
export type InsertWorkoutSession = z.infer<typeof insertWorkoutSessionSchema>;

export type ExerciseLog = typeof exerciseLogs.$inferSelect;
export type InsertExerciseLog = z.infer<typeof insertExerciseLogSchema>;

export type SetLog = typeof setLogs.$inferSelect;
export type InsertSetLog = z.infer<typeof insertSetLogSchema>;

export type Message = typeof messages.$inferSelect;
export type InsertMessage = z.infer<typeof insertMessageSchema>;
