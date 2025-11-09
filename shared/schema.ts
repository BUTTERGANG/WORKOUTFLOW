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
  uuid,
  pgEnum,
  real,
  boolean,
  unique,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// ============================================
// ENUMS
// ============================================

export const userRoleEnum = pgEnum('user_role', ['admin', 'head_coach', 'assistant_coach', 'athlete']);
export const programPhaseEnum = pgEnum('program_phase', ['hypertrophy', 'strength', 'power', 'peaking', 'deload']);
export const workoutStatusEnum = pgEnum('workout_status', ['scheduled', 'in_progress', 'completed', 'skipped']);
export const joinRequestStatusEnum = pgEnum('join_request_status', ['pending', 'approved', 'rejected']);

// ============================================
// SESSION & AUTH TABLES (Required for Replit Auth)
// ============================================

// Session storage table for express-session
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User storage table (email/password authentication)
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").notNull().unique(),
  passwordHash: varchar("password_hash").notNull(),
  firstName: varchar("first_name").notNull(),
  lastName: varchar("last_name").notNull(),
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
  id: uuid("id").defaultRandom().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  inviteCode: varchar("invite_code", { length: 8 }).unique(),
  ownerId: varchar("owner_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_organizations_owner_id").on(table.ownerId),
  index("idx_organizations_invite_code").on(table.inviteCode),
]);

// Junction table for organization members (primary membership system)
export const organizationMembers = pgTable("organization_members", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id").notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  role: userRoleEnum("role").notNull(),
  joinedAt: timestamp("joined_at").defaultNow(),
}, (table) => [
  index("idx_organization_members_organization_id").on(table.organizationId),
  index("idx_organization_members_user_id").on(table.userId),
  unique("unique_organization_member").on(table.organizationId, table.userId),
]);

// Organization join requests (for athletes to request to join organizations)
export const organizationJoinRequests = pgTable("organization_join_requests", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id").notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  status: joinRequestStatusEnum("status").notNull().default('pending'),
  message: text("message"),
  reviewedBy: varchar("reviewed_by").references(() => users.id, { onDelete: 'set null' }),
  reviewedAt: timestamp("reviewed_at"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_organization_join_requests_organization_id").on(table.organizationId),
  index("idx_organization_join_requests_user_id").on(table.userId),
  index("idx_organization_join_requests_status").on(table.status),
  unique("unique_pending_org_request").on(table.organizationId, table.userId, table.status),
]);

export const teams = pgTable("teams", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  organizationId: uuid("organization_id").notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_teams_organization_id").on(table.organizationId),
]);

// Junction table for team members (coaches and athletes)
export const teamMembers = pgTable("team_members", {
  id: uuid("id").defaultRandom().primaryKey(),
  teamId: uuid("team_id").notNull().references(() => teams.id, { onDelete: 'cascade' }),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  role: userRoleEnum("role").notNull(),
  joinedAt: timestamp("joined_at").defaultNow(),
}, (table) => [
  index("idx_team_members_team_id").on(table.teamId),
  index("idx_team_members_user_id").on(table.userId),
]);

// Team join requests (for athletes to request to join teams)
export const teamJoinRequests = pgTable("team_join_requests", {
  id: uuid("id").defaultRandom().primaryKey(),
  teamId: uuid("team_id").notNull().references(() => teams.id, { onDelete: 'cascade' }),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  status: joinRequestStatusEnum("status").notNull().default('pending'),
  message: text("message"),
  reviewedBy: varchar("reviewed_by").references(() => users.id, { onDelete: 'set null' }),
  reviewedAt: timestamp("reviewed_at"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_team_join_requests_team_id").on(table.teamId),
  index("idx_team_join_requests_user_id").on(table.userId),
  index("idx_team_join_requests_status").on(table.status),
  unique("unique_pending_request").on(table.teamId, table.userId, table.status),
]);

// ============================================
// EXERCISE LIBRARY
// ============================================

export const exercises = pgTable("exercises", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  category: varchar("category", { length: 100 }), // e.g., 'squat', 'press', 'pull', 'olympic', 'accessory'
  muscleGroup: varchar("muscle_group", { length: 100 }), // e.g., 'legs', 'chest', 'back'
  equipment: varchar("equipment", { length: 100 }), // e.g., 'barbell', 'dumbbell', 'bodyweight'
  videoUrl: text("video_url"),
  instructions: text("instructions"),
  createdBy: varchar("created_by").references(() => users.id, { onDelete: 'set null' }),
  organizationId: uuid("organization_id").references(() => organizations.id, { onDelete: 'cascade' }), // null = global exercise
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_exercises_organization_id").on(table.organizationId),
  index("idx_exercises_created_by").on(table.createdBy),
]);

// ============================================
// PROGRAMS & WORKOUTS
// ============================================

export const programs = pgTable("programs", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  durationWeeks: integer("duration_weeks").notNull(),
  phase: programPhaseEnum("phase"),
  createdBy: varchar("created_by").notNull().references(() => users.id, { onDelete: 'cascade' }),
  organizationId: uuid("organization_id").notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  isTemplate: boolean("is_template").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_programs_organization_id").on(table.organizationId),
  index("idx_programs_created_by").on(table.createdBy),
  index("idx_programs_created_at").on(table.createdAt),
]);

export const programWeeks = pgTable("program_weeks", {
  id: uuid("id").defaultRandom().primaryKey(),
  programId: uuid("program_id").notNull().references(() => programs.id, { onDelete: 'cascade' }),
  weekNumber: integer("week_number").notNull(),
  notes: text("notes"),
}, (table) => [
  index("idx_program_weeks_program_id").on(table.programId),
]);

export const programDays = pgTable("program_days", {
  id: uuid("id").defaultRandom().primaryKey(),
  weekId: uuid("week_id").notNull().references(() => programWeeks.id, { onDelete: 'cascade' }),
  dayNumber: integer("day_number").notNull(),
  name: varchar("name", { length: 255 }), // e.g., "Squat Day", "Upper Body"
  notes: text("notes"),
}, (table) => [
  index("idx_program_days_week_id").on(table.weekId),
  unique("unique_week_day").on(table.weekId, table.dayNumber),
]);

export const programExercises = pgTable("program_exercises", {
  id: uuid("id").defaultRandom().primaryKey(),
  dayId: uuid("day_id").notNull().references(() => programDays.id, { onDelete: 'cascade' }),
  exerciseId: uuid("exercise_id").notNull().references(() => exercises.id, { onDelete: 'cascade' }),
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
  id: uuid("id").defaultRandom().primaryKey(),
  programId: uuid("program_id").notNull().references(() => programs.id, { onDelete: 'cascade' }),
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
  id: uuid("id").defaultRandom().primaryKey(),
  athleteId: varchar("athlete_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  programDayId: uuid("program_day_id").references(() => programDays.id, { onDelete: 'set null' }),
  scheduledDate: timestamp("scheduled_date"),
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
  status: workoutStatusEnum("status").default('scheduled'),
  durationMinutes: integer("duration_minutes"),
  overallRpe: integer("overall_rpe"), // 1-10 scale
  notes: text("notes"),
}, (table) => [
  // Composite index covers both athlete-only and athlete+date queries
  index("idx_workout_sessions_athlete_started").on(table.athleteId, table.startedAt),
  index("idx_workout_sessions_program_day_id").on(table.programDayId),
  index("idx_workout_sessions_scheduled_date").on(table.scheduledDate),
  index("idx_workout_sessions_completed_at").on(table.completedAt),
]);

export const exerciseLogs = pgTable("exercise_logs", {
  id: uuid("id").defaultRandom().primaryKey(),
  sessionId: uuid("session_id").notNull().references(() => workoutSessions.id, { onDelete: 'cascade' }),
  exerciseId: uuid("exercise_id").notNull().references(() => exercises.id, { onDelete: 'cascade' }),
  order: integer("order").notNull(),
  notes: text("notes"),
}, (table) => [
  index("idx_exercise_logs_session_id").on(table.sessionId),
  index("idx_exercise_logs_exercise_id").on(table.exerciseId),
]);

export const setLogs = pgTable("set_logs", {
  id: uuid("id").defaultRandom().primaryKey(),
  exerciseLogId: uuid("exercise_log_id").notNull().references(() => exerciseLogs.id, { onDelete: 'cascade' }),
  setNumber: integer("set_number").notNull(),
  weight: real("weight"), // in user's preferred unit (lbs/kg)
  reps: integer("reps"),
  rpe: integer("rpe"), // 1-10 scale
  completed: boolean("completed").default(true),
  timestamp: timestamp("timestamp").defaultNow(),
}, (table) => [
  // Composite index covers both exercise_log and exercise_log+timestamp queries
  index("idx_set_logs_exercise_log_timestamp").on(table.exerciseLogId, table.timestamp),
]);

// ============================================
// MESSAGING
// ============================================

export const messages = pgTable("messages", {
  id: uuid("id").defaultRandom().primaryKey(),
  senderId: varchar("sender_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  recipientId: varchar("recipient_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  workoutSessionId: uuid("workout_session_id").references(() => workoutSessions.id, { onDelete: 'set null' }), // for workout-specific comments
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
// HABIT TRACKING
// ============================================

export const habitTypes = pgEnum('habit_type', ['water', 'weight', 'measurement', 'custom']);

export const habitTrackers = pgTable("habit_trackers", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  type: habitTypes("type").notNull(),
  name: varchar("name", { length: 100 }).notNull(), // e.g., "Water Intake", "Body Weight", "Waist"
  unit: varchar("unit", { length: 50 }), // e.g., "oz", "lbs", "inches"
  targetValue: real("target_value"), // optional daily target
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_habit_trackers_user_id").on(table.userId),
  index("idx_habit_trackers_type").on(table.type),
]);

export const habitEntries = pgTable("habit_entries", {
  id: uuid("id").defaultRandom().primaryKey(),
  trackerId: uuid("tracker_id").notNull().references(() => habitTrackers.id, { onDelete: 'cascade' }),
  value: real("value").notNull(), // the measurement value
  date: timestamp("date").notNull(), // when the measurement was taken
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_habit_entries_tracker_id").on(table.trackerId),
  index("idx_habit_entries_date").on(table.date),
  unique("unique_tracker_date").on(table.trackerId, table.date),
]);

// ============================================
// RELATIONS
// ============================================

export const usersRelations = relations(users, ({ many }) => ({
  ownedOrganizations: many(organizations),
  organizationMemberships: many(organizationMembers),
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
  members: many(organizationMembers),
  joinRequests: many(organizationJoinRequests),
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

export const organizationMembersRelations = relations(organizationMembers, ({ one }) => ({
  organization: one(organizations, {
    fields: [organizationMembers.organizationId],
    references: [organizations.id],
  }),
  user: one(users, {
    fields: [organizationMembers.userId],
    references: [users.id],
  }),
}));

export const organizationJoinRequestsRelations = relations(organizationJoinRequests, ({ one }) => ({
  organization: one(organizations, {
    fields: [organizationJoinRequests.organizationId],
    references: [organizations.id],
  }),
  user: one(users, {
    fields: [organizationJoinRequests.userId],
    references: [users.id],
  }),
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
// INSERT SCHEMAS
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

export const insertTeamJoinRequestSchema = createInsertSchema(teamJoinRequests).omit({
  id: true,
  createdAt: true,
  reviewedBy: true,
  reviewedAt: true,
});

export const insertOrganizationMemberSchema = createInsertSchema(organizationMembers).omit({
  id: true,
  joinedAt: true,
});

export const insertOrganizationJoinRequestSchema = createInsertSchema(organizationJoinRequests).omit({
  id: true,
  createdAt: true,
  reviewedBy: true,
  reviewedAt: true,
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
}).extend({
  startDate: z.union([z.date(), z.string().transform(str => new Date(str))]),
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

export type TeamJoinRequest = typeof teamJoinRequests.$inferSelect;
export type InsertTeamJoinRequest = z.infer<typeof insertTeamJoinRequestSchema>;

export type OrganizationMember = typeof organizationMembers.$inferSelect;
export type InsertOrganizationMember = z.infer<typeof insertOrganizationMemberSchema>;

export type OrganizationJoinRequest = typeof organizationJoinRequests.$inferSelect;
export type InsertOrganizationJoinRequest = z.infer<typeof insertOrganizationJoinRequestSchema>;

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
