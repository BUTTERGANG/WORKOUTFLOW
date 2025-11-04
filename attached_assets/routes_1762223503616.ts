import type { Express, Request } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { db } from "./db";
import { eq } from "drizzle-orm";
import { setupAuth, isAuthenticated } from "./replitAuth";
import {
  requireRole,
  verifyOrganizationAccess,
  verifyTeamAccess,
  verifyProgramAccess,
  hasOrganizationAccess,
  hasProgramAccess,
  hasTeamAccess,
  type AuthRequest,
} from "./middleware/authorization";
import { logger } from "./logger";
import {
  insertOrganizationSchema,
  insertTeamSchema,
  insertTeamMemberSchema,
  insertExerciseSchema,
  insertProgramSchema,
  insertProgramWeekSchema,
  insertProgramDaySchema,
  insertProgramExerciseSchema,
  insertProgramAssignmentSchema,
  insertWorkoutSessionSchema,
  insertExerciseLogSchema,
  insertSetLogSchema,
  insertMessageSchema,
  programAssignments,
  teamJoinRequests,
} from "@shared/schema";

export async function registerRoutes(app: Express): Promise<Server> {
  // Setup authentication middleware
  await setupAuth(app);

  // ============================================
  // HEALTH CHECK ENDPOINT
  // ============================================

  app.get('/api/health', (_req, res) => {
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development',
    });
  });

  // ============================================
  // AUTH ROUTES (Required for Replit Auth)
  // ============================================
  
  app.get('/api/auth/user', isAuthenticated, async (req: AuthRequest, res) => {
    try {
      const userId = req.user!.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      res.json(user);
    } catch (error) {
      logger.error("Error fetching user", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  app.post('/api/auth/register', isAuthenticated, async (req: AuthRequest, res) => {
    try {
      const userId = req.user!.claims.sub;
      const { firstName, lastName, email, userType } = req.body;
      
      if (!firstName || !lastName || !email) {
        return res.status(400).json({ message: "Missing required fields" });
      }

      // Determine role based on userType
      const role = userType === 'coach' ? 'head_coach' : 'athlete';
      
      // Update user profile
      await storage.updateUserProfile(userId, {
        firstName,
        lastName,
        email,
        role,
      });
      
      const updatedUser = await storage.getUser(userId);
      res.json(updatedUser);
    } catch (error: any) {
      logger.error("Error completing registration", error);
      res.status(400).json({ message: error?.message || "Failed to complete registration" });
    }
  });

  // ============================================
  // ORGANIZATION ROUTES
  // ============================================
  
  app.post('/api/organizations', isAuthenticated, async (req: AuthRequest, res) => {
    try {
      const userId = req.user!.claims.sub;
      logger.info("Creating organization", { userId });
      const data = insertOrganizationSchema.parse({ ...req.body, ownerId: userId });
      const org = await storage.createOrganization(data);

      // Update user role to admin (organization owner)
      await storage.updateUserRole(userId, 'admin');

      logger.info("Organization created successfully", { organizationId: org.id, userId });
      res.json(org);
    } catch (error: any) {
      logger.error("Error creating organization", error);
      res.status(400).json({ message: error?.message || "Failed to create organization" });
    }
  });

  app.get('/api/organizations', isAuthenticated, async (req: AuthRequest, res) => {
    try {
      const userId = req.user!.claims.sub;
      const orgs = await storage.getUserOrganizations(userId);
      res.json(orgs);
    } catch (error) {
      console.error("Error fetching organizations:", error);
      res.status(500).json({ message: "Failed to fetch organizations" });
    }
  });

  app.get('/api/organizations/my', isAuthenticated, async (req: AuthRequest, res) => {
    try {
      const userId = req.user!.claims.sub;
      const userOrgs = await storage.getUserOrganizations(userId);
      res.json(userOrgs);
    } catch (error) {
      console.error("Error fetching user organizations:", error);
      res.status(500).json({ message: "Failed to fetch organizations" });
    }
  });

  app.get('/api/organizations/:id', isAuthenticated, async (req: AuthRequest, res) => {
    try {
      if (!req.currentUser) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const org = await storage.getOrganization(req.params.id);
      if (!org) {
        return res.status(404).json({ message: "Organization not found" });
      }

      // Verify user has access to this organization
      const hasAccess = await hasOrganizationAccess(req.currentUser.id, req.params.id);
      if (!hasAccess) {
        return res.status(403).json({ message: "Forbidden: not a member of this organization" });
      }

      res.json(org);
    } catch (error) {
      console.error("Error fetching organization:", error);
      res.status(500).json({ message: "Failed to fetch organization" });
    }
  });

  // ============================================
  // TEAM ROUTES
  // ============================================
  
  app.post('/api/teams', isAuthenticated, async (req: AuthRequest, res) => {
    try {
      if (!req.currentUser) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const data = insertTeamSchema.parse(req.body);
      
      // Verify user owns the organization or is a coach WITH ACCESS to this org
      const org = await storage.getOrganization(data.organizationId);
      if (!org) {
        return res.status(404).json({ message: "Organization not found" });
      }
      
      const isOwner = org.ownerId === req.currentUser.id;
      const isCoach = req.currentUser.role === 'admin' || 
                     req.currentUser.role === 'head_coach' || 
                     req.currentUser.role === 'assistant_coach';
      
      // Coaches must be members of the organization
      if (!isOwner && isCoach) {
        const hasAccess = await hasOrganizationAccess(req.currentUser.id, data.organizationId);
        if (!hasAccess) {
          return res.status(403).json({ message: "Forbidden: not a member of this organization" });
        }
      } else if (!isOwner && !isCoach) {
        return res.status(403).json({ message: "Forbidden: only organization owners or coaches can create teams" });
      }
      
      const team = await storage.createTeam(data);
      res.json(team);
    } catch (error) {
      console.error("Error creating team:", error);
      res.status(400).json({ message: "Failed to create team" });
    }
  });

  app.get('/api/organizations/:orgId/teams', isAuthenticated, verifyOrganizationAccess, async (req: AuthRequest, res) => {
    try {
      const teams = await storage.getOrganizationTeams(req.params.orgId);
      
      // Fetch members for each team, filtering to only athletes
      const teamsWithMembers = await Promise.all(
        teams.map(async (team) => {
          const allMembers = await storage.getTeamMembers(team.id);
          // Filter to only include athletes (exclude coaches)
          const athleteMembers = allMembers.filter(m => m.user.role === 'athlete');
          return { ...team, members: athleteMembers };
        })
      );
      
      res.json(teamsWithMembers);
    } catch (error) {
      console.error("Error fetching teams:", error);
      res.status(500).json({ message: "Failed to fetch teams" });
    }
  });

  app.post('/api/teams/:teamId/members', isAuthenticated, requireRole(['admin', 'head_coach']), verifyTeamAccess, async (req: AuthRequest, res) => {
    try {
      const { email, role } = req.body;
      
      // Look up user by email, or create placeholder account
      let user = await storage.getUserByEmail(email);
      if (!user) {
        // Auto-create user account for invitation
        // Generate a unique ID for the invited user (will be replaced when they actually log in)
        const invitedUserId = `invited_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        user = await storage.upsertUser({
          id: invitedUserId,
          email,
          firstName: null,
          lastName: null,
          profileImageUrl: null,
        });
      }
      
      // Add user to team
      const data = insertTeamMemberSchema.parse({ 
        userId: user.id, 
        teamId: req.params.teamId, 
        role 
      });
      const member = await storage.addTeamMember(data);
      res.json(member);
    } catch (error) {
      console.error("Error adding team member:", error);
      res.status(400).json({ message: "Failed to add team member" });
    }
  });

  app.get('/api/teams/:teamId/members', isAuthenticated, verifyTeamAccess, async (req: AuthRequest, res) => {
    try {
      const members = await storage.getTeamMembers(req.params.teamId);
      res.json(members);
    } catch (error) {
      console.error("Error fetching team members:", error);
      res.status(500).json({ message: "Failed to fetch team members" });
    }
  });

  // ============================================
  // TEAM JOIN REQUEST ROUTES
  // ============================================

  // Search for teams
  app.get('/api/teams/search', isAuthenticated, async (req: AuthRequest, res) => {
    try {
      if (!req.currentUser) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const searchTerm = req.query.q as string;
      if (!searchTerm || searchTerm.trim().length < 2) {
        return res.status(400).json({ message: "Search term must be at least 2 characters" });
      }

      const teams = await storage.searchTeams(searchTerm);
      res.json(teams);
    } catch (error) {
      console.error("Error searching teams:", error);
      res.status(500).json({ message: "Failed to search teams" });
    }
  });

  // Create a join request
  app.post('/api/team-join-requests', isAuthenticated, async (req: AuthRequest, res) => {
    try {
      if (!req.currentUser) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      // Verify the team exists
      const team = await storage.getTeam(req.body.teamId);
      if (!team) {
        return res.status(404).json({ message: "Team not found" });
      }

      // Check if user is already a member
      const members = await storage.getTeamMembers(req.body.teamId);
      const isMember = members.some(m => m.userId === req.currentUser!.id);
      if (isMember) {
        return res.status(400).json({ message: "You are already a member of this team" });
      }

      // Check if user already has a pending request
      const existingRequests = await storage.getUserJoinRequests(req.currentUser.id, 'pending');
      const hasPendingRequest = existingRequests.some(r => r.teamId === req.body.teamId);
      if (hasPendingRequest) {
        return res.status(400).json({ message: "You already have a pending request for this team" });
      }

      const data = {
        teamId: req.body.teamId,
        userId: req.currentUser.id,
        message: req.body.message || null,
        status: 'pending' as const,
      };

      const request = await storage.createTeamJoinRequest(data);
      res.json(request);
    } catch (error) {
      console.error("Error creating join request:", error);
      res.status(400).json({ message: "Failed to create join request" });
    }
  });

  // Get join requests for a team (coaches only)
  app.get('/api/teams/:teamId/join-requests', isAuthenticated, verifyTeamAccess, async (req: AuthRequest, res) => {
    try {
      const status = req.query.status as 'pending' | 'approved' | 'rejected' | undefined;
      const requests = await storage.getTeamJoinRequests(req.params.teamId, status);
      res.json(requests);
    } catch (error) {
      console.error("Error fetching join requests:", error);
      res.status(500).json({ message: "Failed to fetch join requests" });
    }
  });

  // Get join requests for current user
  app.get('/api/my-join-requests', isAuthenticated, async (req: AuthRequest, res) => {
    try {
      if (!req.currentUser) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const status = req.query.status as 'pending' | 'approved' | 'rejected' | undefined;
      const requests = await storage.getUserJoinRequests(req.currentUser.id, status);
      res.json(requests);
    } catch (error) {
      console.error("Error fetching user join requests:", error);
      res.status(500).json({ message: "Failed to fetch join requests" });
    }
  });

  // Get join requests for an organization (coaches/admins only)
  app.get('/api/organizations/:orgId/join-requests', isAuthenticated, verifyOrganizationAccess, async (req: AuthRequest, res) => {
    try {
      const status = req.query.status as 'pending' | 'approved' | 'rejected' | undefined;
      const requests = await storage.getOrganizationJoinRequests(req.params.orgId, status);
      res.json(requests);
    } catch (error) {
      console.error("Error fetching organization join requests:", error);
      res.status(500).json({ message: "Failed to fetch join requests" });
    }
  });

  // Approve a join request
  app.post('/api/team-join-requests/:id/approve', isAuthenticated, async (req: AuthRequest, res) => {
    try {
      if (!req.currentUser) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      // Get the join request
      const [request] = await db
        .select()
        .from(teamJoinRequests)
        .where(eq(teamJoinRequests.id, req.params.id));

      if (!request) {
        return res.status(404).json({ message: "Join request not found" });
      }

      // Verify user has access to this team
      const team = await storage.getTeam(request.teamId);
      if (!team) {
        return res.status(404).json({ message: "Team not found" });
      }

      const userHasTeamAccess = await hasTeamAccess(req.currentUser.id, request.teamId);
      if (!userHasTeamAccess) {
        return res.status(403).json({ message: "Forbidden: you don't have access to this team" });
      }

      // Verify user is a coach
      const isCoach = req.currentUser.role === 'admin' || 
                     req.currentUser.role === 'head_coach' || 
                     req.currentUser.role === 'assistant_coach';
      if (!isCoach) {
        return res.status(403).json({ message: "Forbidden: only coaches can approve join requests" });
      }

      await storage.approveJoinRequest(req.params.id, req.currentUser.id);
      res.json({ success: true, message: "Join request approved" });
    } catch (error) {
      console.error("Error approving join request:", error);
      res.status(500).json({ message: "Failed to approve join request" });
    }
  });

  // Reject a join request
  app.post('/api/team-join-requests/:id/reject', isAuthenticated, async (req: AuthRequest, res) => {
    try {
      if (!req.currentUser) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      // Get the join request
      const [request] = await db
        .select()
        .from(teamJoinRequests)
        .where(eq(teamJoinRequests.id, req.params.id));

      if (!request) {
        return res.status(404).json({ message: "Join request not found" });
      }

      // Verify user has access to this team
      const team = await storage.getTeam(request.teamId);
      if (!team) {
        return res.status(404).json({ message: "Team not found" });
      }

      const userHasTeamAccess = await hasTeamAccess(req.currentUser.id, request.teamId);
      if (!userHasTeamAccess) {
        return res.status(403).json({ message: "Forbidden: you don't have access to this team" });
      }

      // Verify user is a coach
      const isCoach = req.currentUser.role === 'admin' || 
                     req.currentUser.role === 'head_coach' || 
                     req.currentUser.role === 'assistant_coach';
      if (!isCoach) {
        return res.status(403).json({ message: "Forbidden: only coaches can reject join requests" });
      }

      await storage.rejectJoinRequest(req.params.id, req.currentUser.id);
      res.json({ success: true, message: "Join request rejected" });
    } catch (error) {
      console.error("Error rejecting join request:", error);
      res.status(500).json({ message: "Failed to reject join request" });
    }
  });

  // Delete a join request (only by the requester)
  app.delete('/api/team-join-requests/:id', isAuthenticated, async (req: AuthRequest, res) => {
    try {
      if (!req.currentUser) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      // Get the join request
      const [request] = await db
        .select()
        .from(teamJoinRequests)
        .where(eq(teamJoinRequests.id, req.params.id));

      if (!request) {
        return res.status(404).json({ message: "Join request not found" });
      }

      // Only the requester can delete their own request
      if (request.userId !== req.currentUser.id) {
        return res.status(403).json({ message: "Forbidden: you can only delete your own join requests" });
      }

      await storage.deleteJoinRequest(req.params.id);
      res.json({ success: true, message: "Join request deleted" });
    } catch (error) {
      console.error("Error deleting join request:", error);
      res.status(500).json({ message: "Failed to delete join request" });
    }
  });

  // ============================================
  // EXERCISE ROUTES
  // ============================================
  
  app.post('/api/exercises', isAuthenticated, async (req: AuthRequest, res) => {
    try {
      if (!req.currentUser) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const data = insertExerciseSchema.parse({ ...req.body, createdBy: req.currentUser.id });

      // Verify user is a coach or org owner
      const isCoach = req.currentUser.role === 'admin' || 
                     req.currentUser.role === 'head_coach' || 
                     req.currentUser.role === 'assistant_coach';

      // If organizationId is provided, verify access
      if (data.organizationId) {
        const org = await storage.getOrganization(data.organizationId);
        if (!org) {
          return res.status(404).json({ message: "Organization not found" });
        }

        const isOwner = org.ownerId === req.currentUser.id;
        
        if (!isOwner && !isCoach) {
          return res.status(403).json({ message: "Forbidden: only coaches or org owners can create organization exercises" });
        }

        const hasAccess = await hasOrganizationAccess(req.currentUser.id, data.organizationId);
        if (!hasAccess) {
          return res.status(403).json({ message: "Forbidden: not a member of this organization" });
        }
      }

      const exercise = await storage.createExercise(data);
      res.json(exercise);
    } catch (error) {
      console.error("Error creating exercise:", error);
      res.status(400).json({ message: "Failed to create exercise" });
    }
  });

  app.get('/api/exercises', isAuthenticated, async (req: AuthRequest, res) => {
    try {
      if (!req.currentUser) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const organizationId = req.query.organizationId as string | undefined;

      // If organizationId is provided, verify user has access to it
      if (organizationId) {
        const hasAccess = await hasOrganizationAccess(req.currentUser.id, organizationId);
        if (!hasAccess) {
          return res.status(403).json({ message: "Forbidden: not a member of this organization" });
        }
      }

      // Only return exercises that belong to user's organizations or are global
      const exercises = await storage.getExercises(organizationId);
      res.json(exercises);
    } catch (error) {
      console.error("Error fetching exercises:", error);
      res.status(500).json({ message: "Failed to fetch exercises" });
    }
  });

  // ============================================
  // PROGRAM ROUTES
  // ============================================
  
  app.post('/api/programs', isAuthenticated, async (req: AuthRequest, res) => {
    try {
      const userId = req.user!.claims.sub;
      const data = insertProgramSchema.parse({ ...req.body, createdBy: userId });
      
      // Verify user owns the organization or is a coach with access
      const org = await storage.getOrganization(data.organizationId);
      if (!org) {
        return res.status(404).json({ message: "Organization not found" });
      }
      
      const user = await storage.getUser(userId);
      const isOwner = org.ownerId === userId;
      const isCoach = user && (user.role === 'admin' || user.role === 'head_coach' || user.role === 'assistant_coach');
      
      // Coaches also need to be members of the organization
      if (!isOwner && isCoach) {
        const userTeams = await storage.getUserTeams(userId);
        const hasAccess = userTeams.some(team => team.organizationId === data.organizationId);
        if (!hasAccess) {
          return res.status(403).json({ message: "Forbidden: not a member of this organization" });
        }
      } else if (!isOwner && !isCoach) {
        return res.status(403).json({ message: "Forbidden: only organization owners or coaches can create programs" });
      }
      
      const program = await storage.createProgram(data);
      res.json(program);
    } catch (error: any) {
      console.error("Error creating program:", error);
      res.status(400).json({ message: error?.message || "Failed to create program" });
    }
  });

  app.get('/api/programs', isAuthenticated, async (req: AuthRequest, res) => {
    try {
      const userId = req.user!.claims.sub;
      const organizationId = req.query.organizationId as string;
      
      if (!organizationId) {
        return res.status(400).json({ message: "Organization ID required" });
      }
      
      // Verify access to organization
      const org = await storage.getOrganization(organizationId);
      if (!org) {
        return res.status(404).json({ message: "Organization not found" });
      }
      
      if (org.ownerId !== userId) {
        const userTeams = await storage.getUserTeams(userId);
        const hasAccess = userTeams.some(team => team.organizationId === organizationId);
        if (!hasAccess) {
          return res.status(403).json({ message: "Forbidden: not a member of this organization" });
        }
      }
      
      const programs = await storage.getOrganizationPrograms(organizationId);
      res.json(programs);
    } catch (error) {
      console.error("Error fetching programs:", error);
      res.status(500).json({ message: "Failed to fetch programs" });
    }
  });

  app.get('/api/programs/:id', isAuthenticated, verifyProgramAccess, async (req: AuthRequest, res) => {
    try {
      const program = await storage.getProgram(req.params.id);
      if (!program) {
        return res.status(404).json({ message: "Program not found" });
      }
      res.json(program);
    } catch (error) {
      console.error("Error fetching program:", error);
      res.status(500).json({ message: "Failed to fetch program" });
    }
  });

  app.post('/api/programs/:programId/weeks', isAuthenticated, async (req: AuthRequest, res) => {
    try {
      if (!req.currentUser) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      // Verify user is a coach or org owner
      const program = await storage.getProgram(req.params.programId);
      if (!program) {
        return res.status(404).json({ message: "Program not found" });
      }

      const org = await storage.getOrganization(program.organizationId);
      if (!org) {
        return res.status(404).json({ message: "Organization not found" });
      }

      const isOwner = org.ownerId === req.currentUser.id;
      const isCoach = req.currentUser.role === 'admin' || 
                     req.currentUser.role === 'head_coach' || 
                     req.currentUser.role === 'assistant_coach';

      if (!isOwner && !isCoach) {
        return res.status(403).json({ message: "Forbidden: only coaches or org owners can modify programs" });
      }

      // Verify access to organization
      const hasAccess = await hasOrganizationAccess(req.currentUser.id, program.organizationId);
      if (!hasAccess) {
        return res.status(403).json({ message: "Forbidden: program not in your organization" });
      }

      const data = insertProgramWeekSchema.parse({ ...req.body, programId: req.params.programId });
      const week = await storage.createProgramWeek(data);
      res.json(week);
    } catch (error) {
      console.error("Error creating program week:", error);
      res.status(400).json({ message: "Failed to create program week" });
    }
  });

  app.get('/api/programs/:programId/weeks', isAuthenticated, async (req: AuthRequest, res) => {
    try {
      if (!req.currentUser) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      // Verify user has access to the program
      const hasAccess = await hasProgramAccess(req.currentUser.id, req.params.programId);
      if (!hasAccess) {
        return res.status(403).json({ message: "Forbidden: program not in your organization" });
      }

      const weeks = await storage.getProgramWeeks(req.params.programId);
      
      // Prevent caching to ensure UI updates immediately
      res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
      res.set('Pragma', 'no-cache');
      res.set('Expires', '0');
      
      res.json(weeks);
    } catch (error) {
      console.error("Error fetching program weeks:", error);
      res.status(500).json({ message: "Failed to fetch program weeks" });
    }
  });

  app.post('/api/weeks/:weekId/days', isAuthenticated, async (req: AuthRequest, res) => {
    try {
      if (!req.currentUser) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      // Get week to find program
      const week = await storage.getProgramWeek(req.params.weekId);
      if (!week) {
        return res.status(404).json({ message: "Week not found" });
      }

      const program = await storage.getProgram(week.programId);
      if (!program) {
        return res.status(404).json({ message: "Program not found" });
      }

      const org = await storage.getOrganization(program.organizationId);
      if (!org) {
        return res.status(404).json({ message: "Organization not found" });
      }

      const isOwner = org.ownerId === req.currentUser.id;
      const isCoach = req.currentUser.role === 'admin' || 
                     req.currentUser.role === 'head_coach' || 
                     req.currentUser.role === 'assistant_coach';

      if (!isOwner && !isCoach) {
        return res.status(403).json({ message: "Forbidden: only coaches or org owners can modify programs" });
      }

      const hasAccess = await hasOrganizationAccess(req.currentUser.id, program.organizationId);
      if (!hasAccess) {
        return res.status(403).json({ message: "Forbidden: program not in your organization" });
      }

      const data = insertProgramDaySchema.parse({ ...req.body, weekId: req.params.weekId });
      const day = await storage.createProgramDay(data);
      res.json(day);
    } catch (error) {
      console.error("Error creating program day:", error);
      res.status(400).json({ message: "Failed to create program day" });
    }
  });

  app.get('/api/weeks/:weekId/days', isAuthenticated, async (req: AuthRequest, res) => {
    try {
      if (!req.currentUser) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      // Get week to find program
      const week = await storage.getProgramWeek(req.params.weekId);
      if (!week) {
        return res.status(404).json({ message: "Week not found" });
      }

      // Verify user has access to the program
      const hasAccess = await hasProgramAccess(req.currentUser.id, week.programId);
      if (!hasAccess) {
        return res.status(403).json({ message: "Forbidden: program not in your organization" });
      }

      const days = await storage.getProgramDays(req.params.weekId);
      res.json(days);
    } catch (error) {
      console.error("Error fetching program days:", error);
      res.status(500).json({ message: "Failed to fetch program days" });
    }
  });

  app.post('/api/days/:dayId/exercises', isAuthenticated, async (req: AuthRequest, res) => {
    try {
      if (!req.currentUser) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      // Get day to find week and program
      const day = await storage.getProgramDay(req.params.dayId);
      if (!day) {
        return res.status(404).json({ message: "Day not found" });
      }

      const week = await storage.getProgramWeek(day.weekId);
      if (!week) {
        return res.status(404).json({ message: "Week not found" });
      }

      const program = await storage.getProgram(week.programId);
      if (!program) {
        return res.status(404).json({ message: "Program not found" });
      }

      const org = await storage.getOrganization(program.organizationId);
      if (!org) {
        return res.status(404).json({ message: "Organization not found" });
      }

      const isOwner = org.ownerId === req.currentUser.id;
      const isCoach = req.currentUser.role === 'admin' || 
                     req.currentUser.role === 'head_coach' || 
                     req.currentUser.role === 'assistant_coach';

      if (!isOwner && !isCoach) {
        return res.status(403).json({ message: "Forbidden: only coaches or org owners can modify programs" });
      }

      const hasAccess = await hasOrganizationAccess(req.currentUser.id, program.organizationId);
      if (!hasAccess) {
        return res.status(403).json({ message: "Forbidden: program not in your organization" });
      }

      const data = insertProgramExerciseSchema.parse({ ...req.body, dayId: req.params.dayId });
      const exercise = await storage.createProgramExercise(data);
      res.json(exercise);
    } catch (error) {
      console.error("Error creating program exercise:", error);
      res.status(400).json({ message: "Failed to create program exercise" });
    }
  });

  app.get('/api/days/:dayId/exercises', isAuthenticated, async (req: AuthRequest, res) => {
    try {
      if (!req.currentUser) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      // Get day to find week and program
      const day = await storage.getProgramDay(req.params.dayId);
      if (!day) {
        return res.status(404).json({ message: "Day not found" });
      }

      const week = await storage.getProgramWeek(day.weekId);
      if (!week) {
        return res.status(404).json({ message: "Week not found" });
      }

      // Verify user has access to the program
      const hasAccess = await hasProgramAccess(req.currentUser.id, week.programId);
      if (!hasAccess) {
        return res.status(403).json({ message: "Forbidden: program not in your organization" });
      }

      const exercises = await storage.getProgramExercises(req.params.dayId);
      res.json(exercises);
    } catch (error) {
      console.error("Error fetching program exercises:", error);
      res.status(500).json({ message: "Failed to fetch program exercises" });
    }
  });

  // ============================================
  // PROGRAM ASSIGNMENT ROUTES
  // ============================================
  
  app.post('/api/program-assignments', isAuthenticated, async (req: AuthRequest, res) => {
    try {
      if (!req.currentUser) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const data = insertProgramAssignmentSchema.parse({ ...req.body, assignedBy: req.currentUser.id });

      // Verify user is a coach or org owner
      const program = await storage.getProgram(data.programId);
      if (!program) {
        return res.status(404).json({ message: "Program not found" });
      }

      const org = await storage.getOrganization(program.organizationId);
      if (!org) {
        return res.status(404).json({ message: "Organization not found" });
      }

      const isOwner = org.ownerId === req.currentUser.id;
      const isCoach = req.currentUser.role === 'admin' || 
                     req.currentUser.role === 'head_coach' || 
                     req.currentUser.role === 'assistant_coach';

      if (!isOwner && !isCoach) {
        return res.status(403).json({ message: "Forbidden: only coaches or org owners can assign programs" });
      }

      // Verify coach has access to both program and athlete
      const hasAccess = await hasOrganizationAccess(req.currentUser.id, program.organizationId);
      if (!hasAccess) {
        return res.status(403).json({ message: "Forbidden: program not in your organization" });
      }

      const assignment = await storage.createProgramAssignment(data);
      res.json(assignment);
    } catch (error) {
      console.error("Error creating program assignment:", error);
      res.status(400).json({ message: "Failed to create program assignment" });
    }
  });

  app.get('/api/athletes/:athleteId/assignments', isAuthenticated, async (req: AuthRequest, res) => {
    try {
      if (!req.currentUser) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      // Users can only view their own assignments unless they're a coach in the same organization
      const athleteId = req.params.athleteId;
      
      if (req.currentUser.id !== athleteId) {
        // Check if user is a coach with access to this athlete
        const athlete = await storage.getUser(athleteId);
        if (!athlete) {
          return res.status(404).json({ message: "Athlete not found" });
        }

        const isCoach = req.currentUser.role === 'admin' || 
                       req.currentUser.role === 'head_coach' || 
                       req.currentUser.role === 'assistant_coach';
        
        if (!isCoach) {
          return res.status(403).json({ message: "Forbidden: can only view your own assignments" });
        }

        // Verify coach has access to athlete's organization
        const athleteTeams = await storage.getUserTeams(athleteId);
        const coachOrgs = req.currentUser.organizationIds || [];
        const athleteOrgIds = [...new Set(athleteTeams.map((t: any) => t.organizationId))];
        
        const hasSharedOrg = athleteOrgIds.some((orgId: string) => coachOrgs.includes(orgId));
        if (!hasSharedOrg) {
          return res.status(403).json({ message: "Forbidden: athlete not in your organization" });
        }
      }

      const assignments = await storage.getAthleteAssignments(athleteId);
      res.json(assignments);
    } catch (error) {
      console.error("Error fetching athlete assignments:", error);
      res.status(500).json({ message: "Failed to fetch athlete assignments" });
    }
  });

  app.get('/api/programs/:programId/assignments', isAuthenticated, async (req: AuthRequest, res) => {
    try {
      if (!req.currentUser) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const program = await storage.getProgram(req.params.programId);
      if (!program) {
        return res.status(404).json({ message: "Program not found" });
      }

      // Verify user has access to this program
      const hasAccess = await hasProgramAccess(req.currentUser.id, req.params.programId);
      if (!hasAccess) {
        return res.status(403).json({ message: "Forbidden: program not in your organization" });
      }

      const org = await storage.getOrganization(program.organizationId);
      if (!org) {
        return res.status(404).json({ message: "Organization not found" });
      }

      // Get all assignments for this program
      const assignments = await storage.getProgramAssignments(req.params.programId);
      
      // If user is org owner or program creator, show all assignments
      const isOwner = org.ownerId === req.currentUser.id;
      const isCreator = program.createdBy === req.currentUser.id;
      
      if (isOwner || isCreator) {
        return res.json(assignments);
      }

      // For coaches, only show assignments for athletes on their teams
      const userTeams = await storage.getUserTeams(req.currentUser.id);
      const userTeamIds = userTeams.map(t => t.id);
      
      const validAssignments = [];
      for (const assignment of assignments) {
        const athleteTeams = await storage.getUserTeams(assignment.athleteId);
        const athleteTeamIds = athleteTeams.map(t => t.id);
        
        // Check if coach and athlete share at least one team
        const hasSharedTeam = userTeamIds.some(id => athleteTeamIds.includes(id));
        if (hasSharedTeam) {
          validAssignments.push(assignment);
        }
      }

      res.json(validAssignments);
    } catch (error) {
      console.error("Error fetching program assignments:", error);
      res.status(500).json({ message: "Failed to fetch program assignments" });
    }
  });

  app.delete('/api/program-assignments/:id', isAuthenticated, async (req: AuthRequest, res) => {
    try {
      if (!req.currentUser) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      // Get the assignment to check permissions
      const assignment = await db
        .select()
        .from(programAssignments)
        .where(eq(programAssignments.id, req.params.id))
        .limit(1);

      if (!assignment || assignment.length === 0) {
        return res.status(404).json({ message: "Assignment not found" });
      }

      const programAssignment = assignment[0];
      const program = await storage.getProgram(programAssignment.programId);
      if (!program) {
        return res.status(404).json({ message: "Program not found" });
      }

      const org = await storage.getOrganization(program.organizationId);
      if (!org) {
        return res.status(404).json({ message: "Organization not found" });
      }

      // Check permissions (org owner or program creator can delete any assignment)
      const isOwner = org.ownerId === req.currentUser.id;
      const isCreator = program.createdBy === req.currentUser.id;
      
      if (isOwner || isCreator) {
        await storage.deleteProgramAssignment(req.params.id);
        return res.json({ success: true, message: "Assignment removed" });
      }

      // For coaches, verify they share at least one team with the athlete
      const isCoach = req.currentUser.role === 'admin' || 
                     req.currentUser.role === 'head_coach' || 
                     req.currentUser.role === 'assistant_coach';
      const hasOrgAccess = await hasOrganizationAccess(req.currentUser.id, program.organizationId);

      if (!isCoach || !hasOrgAccess) {
        return res.status(403).json({ message: "Forbidden: insufficient permissions to remove assignment" });
      }

      // Verify coach shares at least one team with the athlete
      const coachTeams = await storage.getUserTeams(req.currentUser.id);
      const coachTeamIds = coachTeams.map(t => t.id);
      
      const athleteTeams = await storage.getUserTeams(programAssignment.athleteId);
      const athleteTeamIds = athleteTeams.map(t => t.id);
      
      const hasSharedTeam = coachTeamIds.some(id => athleteTeamIds.includes(id));
      if (!hasSharedTeam) {
        return res.status(403).json({ message: "Forbidden: you can only remove assignments for athletes on your teams" });
      }

      await storage.deleteProgramAssignment(req.params.id);
      res.json({ success: true, message: "Assignment removed" });
    } catch (error) {
      console.error("Error deleting program assignment:", error);
      res.status(500).json({ message: "Failed to delete program assignment" });
    }
  });

  // ============================================
  // WORKOUT LOGGING ROUTES
  // ============================================
  
  app.post('/api/workout-sessions', isAuthenticated, async (req: AuthRequest, res) => {
    try {
      const userId = req.user!.claims.sub;
      const data = insertWorkoutSessionSchema.parse({ ...req.body, athleteId: userId });
      const session = await storage.createWorkoutSession(data);
      res.json(session);
    } catch (error) {
      console.error("Error creating workout session:", error);
      res.status(400).json({ message: "Failed to create workout session" });
    }
  });

  app.get('/api/workout-sessions', isAuthenticated, async (req: AuthRequest, res) => {
    try {
      const userId = req.user!.claims.sub;
      const sessions = await storage.getAthleteWorkouts(userId);
      res.json(sessions);
    } catch (error) {
      console.error("Error fetching workout sessions:", error);
      res.status(500).json({ message: "Failed to fetch workout sessions" });
    }
  });

  app.get('/api/workout-sessions/:id', isAuthenticated, async (req: AuthRequest, res) => {
    try {
      if (!req.currentUser) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const session = await storage.getWorkoutSession(req.params.id);
      if (!session) {
        return res.status(404).json({ message: "Workout session not found" });
      }

      // Users can only view their own sessions unless they're a coach
      if (session.athleteId !== req.currentUser.id) {
        const isCoach = req.currentUser.role === 'admin' || 
                       req.currentUser.role === 'head_coach' || 
                       req.currentUser.role === 'assistant_coach';
        
        if (!isCoach) {
          return res.status(403).json({ message: "Forbidden: can only view your own workout sessions" });
        }

        // Verify coach has access to athlete's organization
        const athleteTeams = await storage.getUserTeams(session.athleteId);
        const coachOrgs = req.currentUser.organizationIds || [];
        const athleteOrgIds = [...new Set(athleteTeams.map((t: any) => t.organizationId))];
        
        const hasSharedOrg = athleteOrgIds.some((orgId: string) => coachOrgs.includes(orgId));
        if (!hasSharedOrg) {
          return res.status(403).json({ message: "Forbidden: athlete not in your organization" });
        }
      }

      res.json(session);
    } catch (error) {
      console.error("Error fetching workout session:", error);
      res.status(500).json({ message: "Failed to fetch workout session" });
    }
  });

  app.patch('/api/workout-sessions/:id', isAuthenticated, async (req: AuthRequest, res) => {
    try {
      if (!req.currentUser) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      // Get existing session to check ownership
      const existingSession = await storage.getWorkoutSession(req.params.id);
      if (!existingSession) {
        return res.status(404).json({ message: "Workout session not found" });
      }

      // Only the athlete who owns the session can update it
      if (existingSession.athleteId !== req.currentUser.id) {
        return res.status(403).json({ message: "Forbidden: can only update your own workout sessions" });
      }

      const session = await storage.updateWorkoutSession(req.params.id, req.body);
      if (!session) {
        return res.status(404).json({ message: "Workout session not found" });
      }
      res.json(session);
    } catch (error) {
      console.error("Error updating workout session:", error);
      res.status(400).json({ message: "Failed to update workout session" });
    }
  });

  app.post('/api/workout-sessions/:sessionId/exercise-logs', isAuthenticated, async (req: AuthRequest, res) => {
    try {
      if (!req.currentUser) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      // Verify session ownership
      const session = await storage.getWorkoutSession(req.params.sessionId);
      if (!session) {
        return res.status(404).json({ message: "Workout session not found" });
      }

      // Only the athlete who owns the session can add exercise logs
      if (session.athleteId !== req.currentUser.id) {
        return res.status(403).json({ message: "Forbidden: can only add exercise logs to your own sessions" });
      }

      const data = insertExerciseLogSchema.parse({ ...req.body, sessionId: req.params.sessionId });
      const log = await storage.createExerciseLog(data);
      res.json(log);
    } catch (error) {
      console.error("Error creating exercise log:", error);
      res.status(400).json({ message: "Failed to create exercise log" });
    }
  });

  app.get('/api/workout-sessions/:sessionId/exercise-logs', isAuthenticated, async (req: AuthRequest, res) => {
    try {
      if (!req.currentUser) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      // Verify session access first
      const session = await storage.getWorkoutSession(req.params.sessionId);
      if (!session) {
        return res.status(404).json({ message: "Workout session not found" });
      }

      // Check ownership or coach access
      if (session.athleteId !== req.currentUser.id) {
        const isCoach = req.currentUser.role === 'admin' || 
                       req.currentUser.role === 'head_coach' || 
                       req.currentUser.role === 'assistant_coach';
        
        if (!isCoach) {
          return res.status(403).json({ message: "Forbidden: can only view your own exercise logs" });
        }

        const athleteTeams = await storage.getUserTeams(session.athleteId);
        const coachOrgs = req.currentUser.organizationIds || [];
        const athleteOrgIds = [...new Set(athleteTeams.map((t: any) => t.organizationId))];
        
        const hasSharedOrg = athleteOrgIds.some((orgId: string) => coachOrgs.includes(orgId));
        if (!hasSharedOrg) {
          return res.status(403).json({ message: "Forbidden: athlete not in your organization" });
        }
      }

      const logs = await storage.getSessionExerciseLogs(req.params.sessionId);
      res.json(logs);
    } catch (error) {
      console.error("Error fetching exercise logs:", error);
      res.status(500).json({ message: "Failed to fetch exercise logs" });
    }
  });

  app.post('/api/exercise-logs/:exerciseLogId/sets', isAuthenticated, async (req: AuthRequest, res) => {
    try {
      if (!req.currentUser) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      // Get exercise log to find session
      const exerciseLog = await storage.getExerciseLog(req.params.exerciseLogId);
      if (!exerciseLog) {
        return res.status(404).json({ message: "Exercise log not found" });
      }

      const session = await storage.getWorkoutSession(exerciseLog.sessionId);
      if (!session) {
        return res.status(404).json({ message: "Workout session not found" });
      }

      // Only the athlete who owns the session can add set logs
      if (session.athleteId !== req.currentUser.id) {
        return res.status(403).json({ message: "Forbidden: can only add set logs to your own sessions" });
      }

      const data = insertSetLogSchema.parse({ ...req.body, exerciseLogId: req.params.exerciseLogId });
      const log = await storage.createSetLog(data);
      res.json(log);
    } catch (error) {
      console.error("Error creating set log:", error);
      res.status(400).json({ message: "Failed to create set log" });
    }
  });

  app.get('/api/exercise-logs/:exerciseLogId/sets', isAuthenticated, async (req: AuthRequest, res) => {
    try {
      if (!req.currentUser) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      // Get exercise log to find session
      const exerciseLog = await storage.getExerciseLog(req.params.exerciseLogId);
      if (!exerciseLog) {
        return res.status(404).json({ message: "Exercise log not found" });
      }

      const session = await storage.getWorkoutSession(exerciseLog.sessionId);
      if (!session) {
        return res.status(404).json({ message: "Workout session not found" });
      }

      // Check ownership or coach access
      if (session.athleteId !== req.currentUser.id) {
        const isCoach = req.currentUser.role === 'admin' || 
                       req.currentUser.role === 'head_coach' || 
                       req.currentUser.role === 'assistant_coach';
        
        if (!isCoach) {
          return res.status(403).json({ message: "Forbidden: can only view your own set logs" });
        }

        const athleteTeams = await storage.getUserTeams(session.athleteId);
        const coachOrgs = req.currentUser.organizationIds || [];
        const athleteOrgIds = [...new Set(athleteTeams.map((t: any) => t.organizationId))];
        
        const hasSharedOrg = athleteOrgIds.some((orgId: string) => coachOrgs.includes(orgId));
        if (!hasSharedOrg) {
          return res.status(403).json({ message: "Forbidden: athlete not in your organization" });
        }
      }

      const logs = await storage.getExerciseLogSets(req.params.exerciseLogId);
      res.json(logs);
    } catch (error) {
      console.error("Error fetching set logs:", error);
      res.status(500).json({ message: "Failed to fetch set logs" });
    }
  });

  // ============================================
  // MESSAGING ROUTES
  // ============================================
  
  app.post('/api/messages', isAuthenticated, async (req: AuthRequest, res) => {
    try {
      const userId = req.user!.claims.sub;
      const data = insertMessageSchema.parse({ ...req.body, senderId: userId });
      const message = await storage.createMessage(data);
      res.json(message);
    } catch (error) {
      console.error("Error creating message:", error);
      res.status(400).json({ message: "Failed to create message" });
    }
  });

  app.get('/api/messages/conversation/:otherUserId', isAuthenticated, async (req: AuthRequest, res) => {
    try {
      const userId = req.user!.claims.sub;
      const messages = await storage.getConversation(userId, req.params.otherUserId);
      res.json(messages);
    } catch (error) {
      console.error("Error fetching conversation:", error);
      res.status(500).json({ message: "Failed to fetch conversation" });
    }
  });

  app.patch('/api/messages/:id/read', isAuthenticated, async (req: AuthRequest, res) => {
    try {
      await storage.markMessageAsRead(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error marking message as read:", error);
      res.status(400).json({ message: "Failed to mark message as read" });
    }
  });

  // ============================================
  // DELETE ROUTES
  // ============================================

  // Delete organization (owner only)
  app.delete('/api/organizations/:id', isAuthenticated, async (req: AuthRequest, res) => {
    try {
      if (!req.currentUser) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const org = await storage.getOrganization(req.params.id);
      if (!org) {
        return res.status(404).json({ message: "Organization not found" });
      }

      // Only owner can delete
      if (org.ownerId !== req.currentUser.id) {
        return res.status(403).json({ message: "Forbidden: only organization owner can delete" });
      }

      await storage.deleteOrganization(req.params.id);
      res.json({ success: true, message: "Organization deleted" });
    } catch (error) {
      console.error("Error deleting organization:", error);
      res.status(500).json({ message: "Failed to delete organization" });
    }
  });

  // Delete team (org owner or head coach)
  app.delete('/api/teams/:id', isAuthenticated, async (req: AuthRequest, res) => {
    try {
      if (!req.currentUser) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const team = await storage.getTeam(req.params.id);
      if (!team) {
        return res.status(404).json({ message: "Team not found" });
      }

      const org = await storage.getOrganization(team.organizationId);
      if (!org) {
        return res.status(404).json({ message: "Organization not found" });
      }

      // Check permissions
      const isOwner = org.ownerId === req.currentUser.id;
      const isHeadCoach = req.currentUser.role === 'head_coach' && 
                          await hasOrganizationAccess(req.currentUser.id, team.organizationId);

      if (!isOwner && !isHeadCoach) {
        return res.status(403).json({ message: "Forbidden: only organization owner or head coach can delete teams" });
      }

      await storage.deleteTeam(req.params.id);
      res.json({ success: true, message: "Team deleted" });
    } catch (error) {
      console.error("Error deleting team:", error);
      res.status(500).json({ message: "Failed to delete team" });
    }
  });

  // Remove team member
  app.delete('/api/teams/:teamId/members/:userId', isAuthenticated, async (req: AuthRequest, res) => {
    try {
      if (!req.currentUser) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const team = await storage.getTeam(req.params.teamId);
      if (!team) {
        return res.status(404).json({ message: "Team not found" });
      }

      const org = await storage.getOrganization(team.organizationId);
      if (!org) {
        return res.status(404).json({ message: "Organization not found" });
      }

      // Check permissions (owner, head coach, or removing self)
      const isOwner = org.ownerId === req.currentUser.id;
      const isHeadCoach = req.currentUser.role === 'head_coach' && 
                          await hasOrganizationAccess(req.currentUser.id, team.organizationId);
      const isRemovingSelf = req.params.userId === req.currentUser.id;

      if (!isOwner && !isHeadCoach && !isRemovingSelf) {
        return res.status(403).json({ message: "Forbidden: insufficient permissions" });
      }

      await storage.removeTeamMember(req.params.teamId, req.params.userId);
      res.json({ success: true, message: "Team member removed" });
    } catch (error) {
      console.error("Error removing team member:", error);
      res.status(500).json({ message: "Failed to remove team member" });
    }
  });

  // Delete program
  app.delete('/api/programs/:id', isAuthenticated, async (req: AuthRequest, res) => {
    try {
      if (!req.currentUser) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const program = await storage.getProgram(req.params.id);
      if (!program) {
        return res.status(404).json({ message: "Program not found" });
      }

      // Check permissions (owner or creator)
      const org = await storage.getOrganization(program.organizationId);
      if (!org) {
        return res.status(404).json({ message: "Organization not found" });
      }

      const isOwner = org.ownerId === req.currentUser.id;
      const isCreator = program.createdBy === req.currentUser.id;

      if (!isOwner && !isCreator) {
        return res.status(403).json({ message: "Forbidden: only program creator or org owner can delete" });
      }

      await storage.deleteProgram(req.params.id);
      res.json({ success: true, message: "Program deleted" });
    } catch (error) {
      console.error("Error deleting program:", error);
      res.status(500).json({ message: "Failed to delete program" });
    }
  });

  // Delete exercise (custom only)
  app.delete('/api/exercises/:id', isAuthenticated, async (req: AuthRequest, res) => {
    try {
      if (!req.currentUser) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const exercise = await storage.getExercise(req.params.id);
      if (!exercise) {
        return res.status(404).json({ message: "Exercise not found" });
      }

      // Cannot delete global exercises
      if (!exercise.organizationId) {
        return res.status(403).json({ message: "Forbidden: cannot delete global exercises" });
      }

      // Check permissions
      const org = await storage.getOrganization(exercise.organizationId);
      if (!org) {
        return res.status(404).json({ message: "Organization not found" });
      }

      const isOwner = org.ownerId === req.currentUser.id;
      const isCreator = exercise.createdBy === req.currentUser.id;

      if (!isOwner && !isCreator) {
        return res.status(403).json({ message: "Forbidden: only exercise creator or org owner can delete" });
      }

      await storage.deleteExercise(req.params.id);
      res.json({ success: true, message: "Exercise deleted" });
    } catch (error) {
      console.error("Error deleting exercise:", error);
      res.status(500).json({ message: "Failed to delete exercise" });
    }
  });

  // Delete workout session
  app.delete('/api/workout-sessions/:id', isAuthenticated, async (req: AuthRequest, res) => {
    try {
      if (!req.currentUser) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const session = await storage.getWorkoutSession(req.params.id);
      if (!session) {
        return res.status(404).json({ message: "Workout session not found" });
      }

      // Only athlete can delete their own session
      if (session.athleteId !== req.currentUser.id) {
        return res.status(403).json({ message: "Forbidden: can only delete your own workout sessions" });
      }

      await storage.deleteWorkoutSession(req.params.id);
      res.json({ success: true, message: "Workout session deleted" });
    } catch (error) {
      console.error("Error deleting workout session:", error);
      res.status(500).json({ message: "Failed to delete workout session" });
    }
  });

  // ============================================
  // UPDATE ROUTES
  // ============================================

  // Update exercise
  app.patch('/api/exercises/:id', isAuthenticated, async (req: AuthRequest, res) => {
    try {
      if (!req.currentUser) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const exercise = await storage.getExercise(req.params.id);
      if (!exercise) {
        return res.status(404).json({ message: "Exercise not found" });
      }

      // Cannot update global exercises
      if (!exercise.organizationId) {
        return res.status(403).json({ message: "Forbidden: cannot update global exercises" });
      }

      // Check permissions
      const org = await storage.getOrganization(exercise.organizationId);
      if (!org) {
        return res.status(404).json({ message: "Organization not found" });
      }

      const isOwner = org.ownerId === req.currentUser.id;
      const isCreator = exercise.createdBy === req.currentUser.id;
      const isCoach = req.currentUser.role === 'admin' || 
                     req.currentUser.role === 'head_coach' || 
                     req.currentUser.role === 'assistant_coach';

      // Must be owner, creator, or coach in the org
      if (!isOwner && !isCreator && !isCoach) {
        return res.status(403).json({ message: "Forbidden: insufficient permissions" });
      }

      if (isCoach && !isOwner && !isCreator) {
        const hasAccess = await hasOrganizationAccess(req.currentUser.id, exercise.organizationId);
        if (!hasAccess) {
          return res.status(403).json({ message: "Forbidden: not a member of this organization" });
        }
      }

      // Validate update data
      const updateData: any = {};
      if (req.body.name !== undefined) updateData.name = req.body.name;
      if (req.body.description !== undefined) updateData.description = req.body.description;
      if (req.body.category !== undefined) updateData.category = req.body.category;
      if (req.body.muscleGroup !== undefined) updateData.muscleGroup = req.body.muscleGroup;
      if (req.body.equipment !== undefined) updateData.equipment = req.body.equipment;
      if (req.body.videoUrl !== undefined) updateData.videoUrl = req.body.videoUrl;
      if (req.body.instructions !== undefined) updateData.instructions = req.body.instructions;

      const updated = await storage.updateExercise(req.params.id, updateData);
      if (!updated) {
        return res.status(404).json({ message: "Exercise not found" });
      }

      res.json(updated);
    } catch (error) {
      console.error("Error updating exercise:", error);
      res.status(400).json({ message: "Failed to update exercise" });
    }
  });

  // Update program
  app.patch('/api/programs/:id', isAuthenticated, async (req: AuthRequest, res) => {
    try {
      if (!req.currentUser) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const program = await storage.getProgram(req.params.id);
      if (!program) {
        return res.status(404).json({ message: "Program not found" });
      }

      // Check permissions
      const org = await storage.getOrganization(program.organizationId);
      if (!org) {
        return res.status(404).json({ message: "Organization not found" });
      }

      const isOwner = org.ownerId === req.currentUser.id;
      const isCreator = program.createdBy === req.currentUser.id;

      if (!isOwner && !isCreator) {
        return res.status(403).json({ message: "Forbidden: only program creator or org owner can update" });
      }

      const updateData: any = {};
      if (req.body.name !== undefined) updateData.name = req.body.name;
      if (req.body.description !== undefined) updateData.description = req.body.description;
      if (req.body.durationWeeks !== undefined) updateData.durationWeeks = req.body.durationWeeks;
      if (req.body.phase !== undefined) updateData.phase = req.body.phase;
      if (req.body.isTemplate !== undefined) updateData.isTemplate = req.body.isTemplate;

      const updated = await storage.updateProgram(req.params.id, updateData);
      if (!updated) {
        return res.status(404).json({ message: "Program not found" });
      }

      res.json(updated);
    } catch (error) {
      logger.error("Error updating program", error);
      res.status(400).json({ message: "Failed to update program" });
    }
  });

  // Update program day
  app.patch('/api/program-days/:id', isAuthenticated, async (req: AuthRequest, res) => {
    try {
      if (!req.currentUser) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const day = await storage.getProgramDay(req.params.id);
      if (!day) {
        return res.status(404).json({ message: "Day not found" });
      }

      // Get week -> program to check permissions
      const week = await storage.getProgramWeek(day.weekId);
      if (!week) {
        return res.status(404).json({ message: "Week not found" });
      }

      const program = await storage.getProgram(week.programId);
      if (!program) {
        return res.status(404).json({ message: "Program not found" });
      }

      // Check permissions
      const org = await storage.getOrganization(program.organizationId);
      if (!org) {
        return res.status(404).json({ message: "Organization not found" });
      }

      const isOwner = org.ownerId === req.currentUser.id;
      const isCreator = program.createdBy === req.currentUser.id;
      const isCoach = req.currentUser.role === 'admin' ||
                     req.currentUser.role === 'head_coach' ||
                     req.currentUser.role === 'assistant_coach';

      // Must be owner, creator, or coach in the org
      if (!isOwner && !isCreator && !isCoach) {
        return res.status(403).json({ message: "Forbidden: only program creator, org owner, or coaches can update" });
      }

      if (isCoach && !isOwner && !isCreator) {
        const hasAccess = await hasOrganizationAccess(req.currentUser.id, program.organizationId);
        if (!hasAccess) {
          return res.status(403).json({ message: "Forbidden: not a member of this organization" });
        }
      }

      // Validate and update data
      const updateData: any = {};
      if (req.body.name !== undefined) updateData.name = req.body.name;
      if (req.body.dayNumber !== undefined) {
        // Validate day number
        if (req.body.dayNumber < 1 || req.body.dayNumber > 7) {
          return res.status(400).json({ message: "Day number must be between 1 and 7" });
        }
        updateData.dayNumber = req.body.dayNumber;
      }

      const updated = await storage.updateProgramDay(req.params.id, updateData);
      if (!updated) {
        return res.status(404).json({ message: "Day not found" });
      }

      res.json(updated);
    } catch (error) {
      logger.error("Error updating program day", error);
      res.status(400).json({ message: "Failed to update program day" });
    }
  });

  // Update program exercise
  app.patch('/api/program-exercises/:id', isAuthenticated, async (req: AuthRequest, res) => {
    try {
      if (!req.currentUser) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const programExercise = await storage.getProgramExercise(req.params.id);
      if (!programExercise) {
        return res.status(404).json({ message: "Program exercise not found" });
      }

      // Get day -> week -> program to check permissions
      const day = await storage.getProgramDay(programExercise.dayId);
      if (!day) {
        return res.status(404).json({ message: "Day not found" });
      }

      const week = await storage.getProgramWeek(day.weekId);
      if (!week) {
        return res.status(404).json({ message: "Week not found" });
      }

      const program = await storage.getProgram(week.programId);
      if (!program) {
        return res.status(404).json({ message: "Program not found" });
      }

      // Check permissions
      const org = await storage.getOrganization(program.organizationId);
      if (!org) {
        return res.status(404).json({ message: "Organization not found" });
      }

      const isOwner = org.ownerId === req.currentUser.id;
      const isCreator = program.createdBy === req.currentUser.id;

      if (!isOwner && !isCreator) {
        return res.status(403).json({ message: "Forbidden: only program creator or org owner can update" });
      }

      const updateData: any = {};
      if (req.body.sets !== undefined) updateData.sets = req.body.sets;
      if (req.body.reps !== undefined) updateData.reps = req.body.reps;
      if (req.body.intensity !== undefined) updateData.intensity = req.body.intensity;
      if (req.body.restSeconds !== undefined) updateData.restSeconds = req.body.restSeconds;
      if (req.body.notes !== undefined) updateData.notes = req.body.notes;
      if (req.body.order !== undefined) updateData.order = req.body.order;

      const updated = await storage.updateProgramExercise(req.params.id, updateData);
      if (!updated) {
        return res.status(404).json({ message: "Program exercise not found" });
      }

      res.json(updated);
    } catch (error) {
      console.error("Error updating program exercise:", error);
      res.status(400).json({ message: "Failed to update program exercise" });
    }
  });

  // Delete program exercise
  app.delete('/api/program-exercises/:id', isAuthenticated, async (req: AuthRequest, res) => {
    try {
      if (!req.currentUser) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const programExercise = await storage.getProgramExercise(req.params.id);
      if (!programExercise) {
        return res.status(404).json({ message: "Program exercise not found" });
      }

      // Get day -> week -> program to check permissions
      const day = await storage.getProgramDay(programExercise.dayId);
      if (!day) {
        return res.status(404).json({ message: "Day not found" });
      }

      const week = await storage.getProgramWeek(day.weekId);
      if (!week) {
        return res.status(404).json({ message: "Week not found" });
      }

      const program = await storage.getProgram(week.programId);
      if (!program) {
        return res.status(404).json({ message: "Program not found" });
      }

      // Check permissions
      const org = await storage.getOrganization(program.organizationId);
      if (!org) {
        return res.status(404).json({ message: "Organization not found" });
      }

      const isOwner = org.ownerId === req.currentUser.id;
      const isCreator = program.createdBy === req.currentUser.id;

      if (!isOwner && !isCreator) {
        return res.status(403).json({ message: "Forbidden: only program creator or org owner can delete" });
      }

      await storage.deleteProgramExercise(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting program exercise:", error);
      res.status(500).json({ message: "Failed to delete program exercise" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
