import { Request, Response, NextFunction } from "express";
import { storage } from "../storage";

// Extend Express Request to include authentication properties
declare global {
  namespace Express {
    interface User {
      id: string;
      email: string;
      passwordHash: string;
      firstName: string;
      lastName: string;
      profileImageUrl: string | null;
      role: 'admin' | 'head_coach' | 'assistant_coach' | 'athlete';
      createdAt: Date | null;
      updatedAt: Date | null;
    }
    
    interface Request {
      currentUser?: User;
    }
  }
}

export type AuthRequest = Request;

// Middleware to check if user has required role
export function requireRole(allowedRoles: string[]) {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.currentUser) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      if (!allowedRoles.includes(req.currentUser.role)) {
        return res.status(403).json({ message: "Forbidden: insufficient permissions" });
      }

      next();
    } catch (error) {
      console.error("Authorization error:", error);
      res.status(500).json({ message: "Authorization failed" });
    }
  };
}

// Helper function to check if user owns or has access to an organization
export async function hasOrganizationAccess(userId: string, organizationId: string): Promise<boolean> {
  try {
    const org = await storage.getOrganization(organizationId);
    if (!org) {
      return false;
    }

    // Owner always has access
    if (org.ownerId === userId) {
      return true;
    }

    // Check if user is a member of the organization
    const members = await storage.getOrganizationMembers(organizationId);
    return members.some(member => member.userId === userId);
  } catch (error) {
    console.error("Error checking organization access:", error);
    return false;
  }
}

// Middleware to verify organization access
export async function verifyOrganizationAccess(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    if (!req.currentUser) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const organizationId = req.params.orgId || req.params.organizationId || req.body.organizationId;

    if (!organizationId) {
      return res.status(400).json({ message: "Organization ID required" });
    }

    const hasAccess = await hasOrganizationAccess(req.currentUser.id, organizationId);
    if (!hasAccess) {
      return res.status(403).json({ message: "Forbidden: not a member of this organization" });
    }

    next();
  } catch (error) {
    console.error("Organization access verification error:", error);
    res.status(500).json({ message: "Failed to verify organization access" });
  }
}

// Helper function to check if user has access to a team
export async function hasTeamAccess(userId: string, teamId: string): Promise<boolean> {
  try {
    const team = await storage.getTeam(teamId);
    if (!team) {
      return false;
    }

    // Check if user has access to the team's organization (owner or member)
    const hasOrgAccess = await hasOrganizationAccess(userId, team.organizationId);
    if (!hasOrgAccess) {
      return false;
    }

    // Organization owners and coaches automatically have team access
    const org = await storage.getOrganization(team.organizationId);
    if (org && org.ownerId === userId) {
      return true;
    }

    // Also check if they're specifically a member of this team
    const members = await storage.getTeamMembers(teamId);
    return members.some(member => member.userId === userId);
  } catch (error) {
    console.error("Error checking team access:", error);
    return false;
  }
}

// Helper function to check if user has access to a program
export async function hasProgramAccess(userId: string, programId: string): Promise<boolean> {
  try {
    const program = await storage.getProgram(programId);
    if (!program) {
      return false;
    }

    return await hasOrganizationAccess(userId, program.organizationId);
  } catch (error) {
    console.error("Error checking program access:", error);
    return false;
  }
}

// Middleware to verify team access
export async function verifyTeamAccess(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    if (!req.currentUser) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const teamId = req.params.teamId || req.body.teamId;

    if (!teamId) {
      return res.status(400).json({ message: "Team ID required" });
    }

    const hasAccess = await hasTeamAccess(req.currentUser.id, teamId);
    if (!hasAccess) {
      return res.status(403).json({ message: "Forbidden: not a member of this team" });
    }

    next();
  } catch (error) {
    console.error("Team access verification error:", error);
    res.status(500).json({ message: "Failed to verify team access" });
  }
}

// Middleware to verify program access
export async function verifyProgramAccess(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    if (!req.currentUser) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const programId = req.params.id || req.params.programId;

    if (!programId) {
      return res.status(400).json({ message: "Program ID required" });
    }

    const hasAccess = await hasProgramAccess(req.currentUser.id, programId);
    if (!hasAccess) {
      return res.status(403).json({ message: "Forbidden: program not in your organization" });
    }

    next();
  } catch (error) {
    console.error("Program access verification error:", error);
    res.status(500).json({ message: "Failed to verify program access" });
  }
}
