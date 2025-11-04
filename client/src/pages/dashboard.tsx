import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useApp } from "@/contexts/AppContext";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Users, FileText, TrendingUp, Activity, Link2, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Organization } from "@shared/schema";

export default function Dashboard() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { isAuthenticated, isLoading, user } = useAuth();
  const { currentOrganization, setCurrentOrganization } = useApp();
  const [copiedCode, setCopiedCode] = useState(false);

  // Fetch user's organizations
  const { data: organizations, isLoading: orgsLoading } = useQuery<Organization[]>({
    queryKey: ['/api/organizations/my'],
    enabled: isAuthenticated && !!user,
  });

  // Fetch full organization details to get invite code
  const { data: organizationDetails } = useQuery<Organization>({
    queryKey: ['/api/organizations', currentOrganization?.id],
    enabled: !!currentOrganization?.id,
    queryFn: async () => {
      const res = await fetch(`/api/organizations/${currentOrganization!.id}`);
      if (!res.ok) throw new Error('Failed to fetch organization');
      return res.json();
    },
  });

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      toast({
        title: "Unauthorized",
        description: "Redirecting to login...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
      return;
    }
  }, [isAuthenticated, isLoading, toast]);

  // Auto-select first organization if none selected
  useEffect(() => {
    if (!orgsLoading && organizations && organizations.length > 0 && !currentOrganization) {
      setCurrentOrganization(organizations[0]);
    }
  }, [organizations, orgsLoading, currentOrganization, setCurrentOrganization]);

  // Redirect based on user role if no organizations
  useEffect(() => {
    if (!orgsLoading && organizations && organizations.length === 0 && user) {
      // Athletes should join existing teams
      if (user.role === 'athlete') {
        setLocation("/join-team");
      }
      // Coaches should create organizations/teams
      else if (user.role === 'admin' || user.role === 'head_coach' || user.role === 'assistant_coach') {
        setLocation("/onboarding");
      }
    }
  }, [organizations, orgsLoading, setLocation, user]);

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <div className="mb-4 inline-block h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) return null;

  const isCoach = user.role === 'admin' || user.role === 'head_coach' || user.role === 'assistant_coach';
  const isAthlete = user.role === 'athlete';

  const copyInviteLink = async () => {
    if (organizationDetails?.inviteCode) {
      const inviteLink = `${window.location.origin}/join/${organizationDetails.inviteCode}`;
      try {
        await navigator.clipboard.writeText(inviteLink);
        setCopiedCode(true);
        toast({
          title: "Copied!",
          description: "Invite link copied to clipboard",
        });
        setTimeout(() => setCopiedCode(false), 2000);
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to copy link",
          variant: "destructive",
        });
      }
    }
  };

  return (
    <div className="h-full overflow-auto">
      <div className="mx-auto max-w-7xl p-4 sm:p-6 lg:p-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">
            Welcome back, {user.firstName || user.email?.split('@')[0] || 'there'}!
          </h1>
          <p className="mt-2 text-muted-foreground">
            {isCoach ? "Here's an overview of your coaching dashboard" : "Ready to track your progress"}
          </p>
        </div>

        {/* Stats Grid */}
        <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card className="hover-elevate">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Programs</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="stat-programs">0</div>
              <p className="text-xs text-muted-foreground">
                {isCoach ? "programs created" : "assigned to you"}
              </p>
            </CardContent>
          </Card>

          <Card className="hover-elevate">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {isCoach ? "Athletes" : "Workouts"}
              </CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="stat-athletes">0</div>
              <p className="text-xs text-muted-foreground">
                {isCoach ? "total athletes" : "completed this week"}
              </p>
            </CardContent>
          </Card>

          <Card className="hover-elevate">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Completion Rate</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="stat-completion">0%</div>
              <p className="text-xs text-muted-foreground">last 7 days</p>
            </CardContent>
          </Card>

          <Card className="hover-elevate">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Weekly Volume</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="stat-volume">0</div>
              <p className="text-xs text-muted-foreground">total reps</p>
            </CardContent>
          </Card>
        </div>

        {/* Invite Code Card - Only for Coaches */}
        {isCoach && organizationDetails?.inviteCode && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Link2 className="h-5 w-5" />
                Invite Athletes to Your Organization
              </CardTitle>
              <CardDescription>
                Share this link with athletes to invite them to join {organizationDetails.name}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="invite-code-dashboard">Invite Code</Label>
                  <div className="flex gap-2">
                    <Input
                      id="invite-code-dashboard"
                      value={organizationDetails.inviteCode}
                      readOnly
                      className="font-mono text-lg"
                      data-testid="input-dashboard-invite-code"
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={copyInviteLink}
                      data-testid="button-dashboard-copy-code"
                    >
                      {copiedCode ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="invite-link-dashboard">Shareable Link</Label>
                  <div className="flex gap-2">
                    <Input
                      id="invite-link-dashboard"
                      value={`${window.location.origin}/join/${organizationDetails.inviteCode}`}
                      readOnly
                      className="text-sm"
                      data-testid="input-dashboard-invite-link"
                    />
                    <Button
                      onClick={copyInviteLink}
                      data-testid="button-dashboard-copy-link"
                    >
                      {copiedCode ? (
                        <>
                          <Check className="mr-2 h-4 w-4" />
                          Copied
                        </>
                      ) : (
                        <>
                          <Copy className="mr-2 h-4 w-4" />
                          Copy Link
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </div>
              <p className="mt-4 text-xs text-muted-foreground">
                Athletes who use this link will send a join request that you can approve or reject from the Athletes page.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Main Content */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Upcoming Workouts */}
          <Card>
            <CardHeader>
              <CardTitle>
                {isCoach ? "Recent Activity" : "Upcoming Workouts"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col items-center justify-center py-12">
                <FileText className="mb-4 h-12 w-12 text-muted-foreground" />
                <p className="text-center text-muted-foreground">
                  {isCoach
                    ? "No recent activity. Create a program to get started."
                    : "No workouts scheduled. Contact your coach."}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {isCoach ? (
                <>
                  <Button 
                    variant="outline" 
                    className="w-full justify-start" 
                    data-testid="button-create-program"
                    onClick={() => window.location.href = '/programs'}
                  >
                    <FileText className="mr-2 h-4 w-4" />
                    Create New Program
                  </Button>
                  <Button 
                    variant="outline" 
                    className="w-full justify-start"
                    data-testid="button-manage-athletes"
                    onClick={() => window.location.href = '/athletes'}
                  >
                    <Users className="mr-2 h-4 w-4" />
                    Manage Athletes
                  </Button>
                  <Button 
                    variant="outline" 
                    className="w-full justify-start"
                    data-testid="button-view-analytics"
                    onClick={() => window.location.href = '/progress'}
                  >
                    <TrendingUp className="mr-2 h-4 w-4" />
                    View Analytics
                  </Button>
                </>
              ) : (
                <>
                  <Button 
                    variant="default" 
                    className="w-full justify-start"
                    data-testid="button-start-workout"
                    onClick={() => window.location.href = '/workout'}
                  >
                    <Activity className="mr-2 h-4 w-4" />
                    Start Workout
                  </Button>
                  <Button 
                    variant="outline" 
                    className="w-full justify-start"
                    data-testid="button-view-progress"
                    onClick={() => window.location.href = '/progress'}
                  >
                    <TrendingUp className="mr-2 h-4 w-4" />
                    View My Progress
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
