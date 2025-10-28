import { Request, Response, NextFunction } from "express";
import { storage } from "../storage";

interface AuthRequest extends Request {
  user: any;
}

// Middleware to check if user has required role
export function requireRole(allowedRoles: string[]) {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?.claims?.sub;
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(401).json({ message: "User not found" });
      }

      if (!allowedRoles.includes(user.role)) {
        return res.status(403).json({ message: "Forbidden: insufficient permissions" });
      }

      // Attach user to request for downstream use
      (req as any).currentUser = user;
      next();
    } catch (error) {
      console.error("Authorization error:", error);
      res.status(500).json({ message: "Authorization failed" });
    }
  };
}

// Middleware to verify organization access
export async function verifyOrganizationAccess(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.claims?.sub;
    const organizationId = req.params.orgId || req.params.organizationId || req.body.organizationId;

    if (!organizationId) {
      return res.status(400).json({ message: "Organization ID required" });
    }

    const org = await storage.getOrganization(organizationId);
    if (!org) {
      return res.status(404).json({ message: "Organization not found" });
    }

    // Check if user owns the organization or is a member
    if (org.ownerId !== userId) {
      const userTeams = await storage.getUserTeams(userId);
      const hasAccess = userTeams.some(team => team.organizationId === organizationId);
      
      if (!hasAccess) {
        return res.status(403).json({ message: "Forbidden: not a member of this organization" });
      }
    }

    next();
  } catch (error) {
    console.error("Organization access verification error:", error);
    res.status(500).json({ message: "Failed to verify organization access" });
  }
}

// Middleware to verify team access
export async function verifyTeamAccess(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.claims?.sub;
    const teamId = req.params.teamId || req.body.teamId;

    if (!teamId) {
      return res.status(400).json({ message: "Team ID required" });
    }

    const team = await storage.getTeam(teamId);
    if (!team) {
      return res.status(404).json({ message: "Team not found" });
    }

    // Verify user has access to the team's organization
    const org = await storage.getOrganization(team.organizationId);
    if (!org) {
      return res.status(404).json({ message: "Organization not found" });
    }

    if (org.ownerId !== userId) {
      const members = await storage.getTeamMembers(teamId);
      const isMember = members.some(member => member.userId === userId);
      
      if (!isMember) {
        return res.status(403).json({ message: "Forbidden: not a member of this team" });
      }
    }

    next();
  } catch (error) {
    console.error("Team access verification error:", error);
    res.status(500).json({ message: "Failed to verify team access" });
  }
}
