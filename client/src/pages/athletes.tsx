import { useEffect, useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useApp } from "@/contexts/AppContext";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { UserPlus, Users, Search, Mail, Calendar, Target, UserCheck, UserX, Clock } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { User, OrganizationMember, Program, ProgramAssignment, OrganizationJoinRequest } from "@shared/schema";

type JoinRequest = OrganizationJoinRequest & {
  user: User;
};

export default function Athletes() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading, user } = useAuth();
  const { currentOrganization, currentTeam } = useApp();
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [selectedAthlete, setSelectedAthlete] = useState<OrganizationMember | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [newMemberEmail, setNewMemberEmail] = useState("");
  const [selectedProgram, setSelectedProgram] = useState("");
  const [startDate, setStartDate] = useState("");

  // Fetch organization members
  const { data: organizationMembers } = useQuery<(OrganizationMember & { user: User })[]>({
    queryKey: ['/api/organizations', currentOrganization?.id, 'members'],
    enabled: !!currentOrganization,
    queryFn: async () => {
      const res = await fetch(`/api/organizations/${currentOrganization!.id}/members`);
      if (!res.ok) throw new Error('Failed to fetch members');
      return res.json();
    },
  });

  // Fetch programs for assignment
  const { data: programs } = useQuery<Program[]>({
    queryKey: ['/api/programs', currentOrganization?.id],
    enabled: !!currentOrganization,
  });

  // Fetch program assignments
  const { data: assignments } = useQuery<(ProgramAssignment & { program: Program })[]>({
    queryKey: ['/api/program-assignments', currentTeam?.id],
    enabled: !!currentTeam,
    queryFn: async () => {
      const res = await fetch(`/api/program-assignments?teamId=${currentTeam!.id}`);
      if (!res.ok) throw new Error('Failed to fetch assignments');
      return res.json();
    },
  });

  // Fetch pending join requests for current organization
  const { data: joinRequests } = useQuery<JoinRequest[]>({
    queryKey: ['/api/organizations', currentOrganization?.id, 'join-requests'],
    enabled: !!currentOrganization,
    queryFn: async () => {
      const res = await fetch(`/api/organizations/${currentOrganization!.id}/join-requests?status=pending`);
      if (!res.ok) throw new Error('Failed to fetch join requests');
      return res.json();
    },
  });

  // Add team member mutation (deprecated - keeping for backward compatibility)
  const addMemberMutation = useMutation({
    mutationFn: async (data: { teamId: string; email: string; role: string }) => {
      return await apiRequest(`/api/teams/${data.teamId}/members`, {
        method: "POST",
        body: { email: data.email, role: data.role },
      });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['/api/teams'] });
      queryClient.invalidateQueries({ queryKey: ['/api/teams', variables.teamId, 'members'] });
      queryClient.invalidateQueries({ queryKey: ['/api/organizations'] });
      toast({ title: "Success", description: "Team member invited successfully" });
      setInviteDialogOpen(false);
      setNewMemberEmail("");
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error?.message || "Failed to add team member",
        variant: "destructive",
      });
    },
  });

  // Assign program mutation
  const assignProgramMutation = useMutation({
    mutationFn: async (data: { programId: string; athleteId: string; startDate: string }) => {
      return await apiRequest<ProgramAssignment>(`/api/program-assignments`, {
        method: "POST",
        body: data,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/program-assignments'] });
      if (currentTeam) {
        queryClient.invalidateQueries({ queryKey: ['/api/program-assignments', currentTeam.id] });
      }
      toast({ title: "Success", description: "Program assigned successfully" });
      setAssignDialogOpen(false);
      setSelectedAthlete(null);
      setSelectedProgram("");
      setStartDate("");
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error?.message || "Failed to assign program",
        variant: "destructive",
      });
    },
  });

  // Approve join request mutation
  const approveJoinRequestMutation = useMutation({
    mutationFn: async (requestId: string) => {
      return await apiRequest(`/api/organization-join-requests/${requestId}/approve`, {
        method: "POST",
      });
    },
    onSuccess: () => {
      if (currentOrganization) {
        queryClient.invalidateQueries({ queryKey: ['/api/organizations', currentOrganization.id, 'join-requests'] });
        queryClient.invalidateQueries({ queryKey: ['/api/organizations', currentOrganization.id, 'members'] });
      }
      queryClient.invalidateQueries({ queryKey: ['/api/organizations'] });
      toast({ title: "Success", description: "Join request approved" });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error?.message || "Failed to approve request",
        variant: "destructive",
      });
    },
  });

  // Reject join request mutation
  const rejectJoinRequestMutation = useMutation({
    mutationFn: async (requestId: string) => {
      return await apiRequest(`/api/organization-join-requests/${requestId}/reject`, {
        method: "POST",
      });
    },
    onSuccess: () => {
      if (currentOrganization) {
        queryClient.invalidateQueries({ queryKey: ['/api/organizations', currentOrganization.id, 'join-requests'] });
      }
      toast({ title: "Success", description: "Join request rejected" });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error?.message || "Failed to reject request",
        variant: "destructive",
      });
    },
  });

  const handleAddMember = () => {
    if (!newMemberEmail.trim() || !currentTeam) return;
    addMemberMutation.mutate({
      teamId: currentTeam.id,
      email: newMemberEmail,
      role: 'athlete',
    });
  };

  const handleAssignProgram = () => {
    if (!selectedProgram || !selectedAthlete || !startDate) return;
    assignProgramMutation.mutate({
      programId: selectedProgram,
      athleteId: selectedAthlete.userId,
      startDate,
    });
  };

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
      return;
    }
  }, [isAuthenticated, isLoading, toast]);

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

  if (!isCoach) {
    return (
      <div className="flex h-screen items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Access Denied</CardTitle>
            <CardDescription>
              Only coaches can access athlete management.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (!currentTeam) {
    return (
      <div className="flex h-screen items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>No Team Selected</CardTitle>
            <CardDescription>
              Please select a team to manage athletes.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  // Memoize filtered members for performance
  const filteredMembers = useMemo(() => {
    if (!organizationMembers) return undefined;
    const query = searchQuery.toLowerCase();
    return organizationMembers.filter((member) =>
      member.user &&
      (member.user.firstName?.toLowerCase().includes(query) ||
        member.user.lastName?.toLowerCase().includes(query) ||
        member.user.email?.toLowerCase().includes(query))
    );
  }, [organizationMembers, searchQuery]);

  // Get assignment for athlete
  const getAthleteAssignment = (athleteId: string) => {
    return assignments?.find((a) => a.athleteId === athleteId && a.status === 'active');
  };

  return (
    <div className="h-full overflow-auto">
      <div className="mx-auto max-w-7xl p-4 sm:p-6 lg:p-8">
        {/* Header */}
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Athletes</h1>
            <p className="mt-2 text-muted-foreground">
              Manage your team members and track their progress
            </p>
          </div>

          <Dialog open={inviteDialogOpen} onOpenChange={setInviteDialogOpen}>
            <DialogTrigger asChild>
              <Button data-testid="button-invite-athlete" className="gap-2">
                <UserPlus className="h-4 w-4" />
                Add Athlete
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Add Athlete to Team</DialogTitle>
                <DialogDescription>
                  Add an existing user by email or send invitation
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="athlete@example.com"
                    value={newMemberEmail}
                    onChange={(e) => setNewMemberEmail(e.target.value)}
                    data-testid="input-athlete-email"
                  />
                  <p className="text-xs text-muted-foreground">
                    If the user exists, they'll be added immediately. Otherwise, an invitation will be sent.
                  </p>
                </div>
              </div>
              <DialogFooter>
                <Button
                  onClick={handleAddMember}
                  disabled={!newMemberEmail.trim() || addMemberMutation.isPending}
                  data-testid="button-submit-add-athlete"
                >
                  {addMemberMutation.isPending ? "Adding..." : "Add Athlete"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Search */}
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search athletes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
              data-testid="input-search-athletes"
            />
          </div>
        </div>

        {/* Pending Join Requests */}
        {joinRequests && joinRequests.length > 0 && (
          <Card className="mb-6">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-primary" />
                <CardTitle>Pending Join Requests</CardTitle>
              </div>
              <CardDescription>
                Review and respond to athlete requests to join your team
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {joinRequests.map((request) => (
                  <div
                    key={request.id}
                    className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4 sm:flex-row sm:items-center sm:justify-between"
                    data-testid={`join-request-${request.id}`}
                  >
                    <div className="flex items-start gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={request.user.profileImageUrl || undefined} />
                        <AvatarFallback>
                          {request.user.firstName?.[0]}{request.user.lastName?.[0]}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-foreground">
                          {request.user.firstName} {request.user.lastName}
                        </p>
                        <p className="text-sm text-muted-foreground">{request.user.email}</p>
                        {request.message && (
                          <p className="mt-2 text-sm text-foreground italic">
                            "{request.message}"
                          </p>
                        )}
                        <p className="mt-1 text-xs text-muted-foreground">
                          Requested {request.createdAt ? new Date(request.createdAt).toLocaleDateString() : 'Recently'}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => approveJoinRequestMutation.mutate(request.id)}
                        disabled={approveJoinRequestMutation.isPending || rejectJoinRequestMutation.isPending}
                        data-testid={`button-approve-${request.id}`}
                        className="gap-1"
                      >
                        <UserCheck className="h-4 w-4" />
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => rejectJoinRequestMutation.mutate(request.id)}
                        disabled={approveJoinRequestMutation.isPending || rejectJoinRequestMutation.isPending}
                        data-testid={`button-reject-${request.id}`}
                        className="gap-1"
                      >
                        <UserX className="h-4 w-4" />
                        Reject
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Athletes Grid */}
        {!organizationMembers || organizationMembers.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Users className="mb-4 h-12 w-12 text-muted-foreground" />
              <h3 className="mb-2 text-lg font-semibold">No Athletes Yet</h3>
              <p className="mb-4 text-center text-sm text-muted-foreground">
                Add athletes to your organization to get started
              </p>
              <Button onClick={() => setInviteDialogOpen(true)} variant="outline">
                Add Athlete
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {filteredMembers?.map((member) => {
              const assignment = getAthleteAssignment(member.userId);
              return (
                <Card key={member.id} className="hover-elevate" data-testid={`card-athlete-${member.userId}`}>
                  <CardHeader>
                    <div className="flex items-start gap-4">
                      <Avatar className="h-12 w-12">
                        <AvatarImage src={member.user.profileImageUrl || undefined} />
                        <AvatarFallback>
                          {member.user.firstName?.[0]}{member.user.lastName?.[0]}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <CardTitle className="text-base">
                          {member.user.firstName} {member.user.lastName}
                        </CardTitle>
                        <p className="text-sm text-muted-foreground">{member.user.email}</p>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">{member.role}</Badge>
                    </div>

                    {assignment ? (
                      <div className="rounded-lg bg-muted/50 p-3 space-y-2">
                        <div className="flex items-center gap-2 text-sm font-medium">
                          <Target className="h-4 w-4 text-primary" />
                          Current Program
                        </div>
                        <p className="text-sm">{assignment.program.name}</p>
                        <p className="text-xs text-muted-foreground">
                          Started: {new Date(assignment.startDate).toLocaleDateString()}
                        </p>
                      </div>
                    ) : (
                      <Button
                        onClick={() => {
                          setSelectedAthlete(member);
                          setAssignDialogOpen(true);
                        }}
                        variant="outline"
                        size="sm"
                        className="w-full"
                        data-testid={`button-assign-program-${member.userId}`}
                      >
                        <Calendar className="h-4 w-4 mr-1" />
                        Assign Program
                      </Button>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Assign Program Dialog */}
        <Dialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Assign Program</DialogTitle>
              <DialogDescription>
                Assign a training program to athlete
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="program">Select Program</Label>
                <Select value={selectedProgram} onValueChange={setSelectedProgram}>
                  <SelectTrigger data-testid="select-program">
                    <SelectValue placeholder="Choose a program..." />
                  </SelectTrigger>
                  <SelectContent>
                    {programs?.map((program) => (
                      <SelectItem key={program.id} value={program.id}>
                        {program.name} ({program.durationWeeks} weeks)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="startDate">Start Date</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  data-testid="input-start-date"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setAssignDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleAssignProgram}
                disabled={!selectedProgram || !startDate || assignProgramMutation.isPending}
                data-testid="button-submit-assign-program"
              >
                {assignProgramMutation.isPending ? "Assigning..." : "Assign Program"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
