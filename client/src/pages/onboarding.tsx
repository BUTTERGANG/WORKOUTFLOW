import { useState } from "react";
import { useLocation } from "wouter";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useApp } from "@/contexts/AppContext";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Building2, Users } from "lucide-react";
import type { Organization, Team } from "@shared/schema";

export default function Onboarding() {
  const [, setLocation] = useLocation();
  const { setCurrentOrganization, setCurrentTeam } = useApp();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [orgName, setOrgName] = useState("");
  const [teamName, setTeamName] = useState("");
  const [step, setStep] = useState<'org' | 'team'>('org');

  const createOrgMutation = useMutation({
    mutationFn: async (name: string) => {
      return await apiRequest<Organization>("/api/organizations", {
        method: "POST",
        body: { name },
      });
    },
    onSuccess: (org) => {
      setCurrentOrganization(org);
      queryClient.invalidateQueries({ queryKey: ['/api/organizations'] });
      toast({
        title: "Success",
        description: "Organization created successfully",
      });
      setStep('team');
    },
    onError: (error: any) => {
      console.error("Organization creation error:", error);
      toast({
        title: "Error",
        description: error?.message || "Failed to create organization",
        variant: "destructive",
      });
    },
  });

  const createTeamMutation = useMutation({
    mutationFn: async ({ organizationId, name }: { organizationId: string; name: string }) => {
      return await apiRequest<Team>("/api/teams", {
        method: "POST",
        body: { organizationId, name },
      });
    },
    onSuccess: (team) => {
      setCurrentTeam(team);
      queryClient.invalidateQueries({ queryKey: ['/api/organizations'] });
      toast({
        title: "Success",
        description: "Team created successfully. Redirecting...",
      });
      setTimeout(() => setLocation("/"), 500);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create team",
        variant: "destructive",
      });
    },
  });

  const handleCreateOrg = (e: React.FormEvent) => {
    e.preventDefault();
    if (orgName.trim()) {
      createOrgMutation.mutate(orgName);
    }
  };

  const handleCreateTeam = (e: React.FormEvent) => {
    e.preventDefault();
    if (teamName.trim() && setCurrentOrganization) {
      const org = JSON.parse(localStorage.getItem('currentOrganization') || '{}');
      if (org.id) {
        createTeamMutation.mutate({ organizationId: org.id, name: teamName });
      }
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-foreground">Welcome!</h1>
          <p className="mt-2 text-muted-foreground">
            Let's set up your coaching platform
          </p>
        </div>

        {step === 'org' && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Create Organization
              </CardTitle>
              <CardDescription>
                Start by creating an organization for your coaching business
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCreateOrg} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="orgName">Organization Name</Label>
                  <Input
                    id="orgName"
                    placeholder="e.g., Elite Weightlifting Club"
                    value={orgName}
                    onChange={(e) => setOrgName(e.target.value)}
                    required
                    data-testid="input-org-name"
                  />
                </div>
                <Button
                  type="submit"
                  className="w-full"
                  disabled={createOrgMutation.isPending}
                  data-testid="button-create-org"
                >
                  {createOrgMutation.isPending ? "Creating..." : "Create Organization"}
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

        {step === 'team' && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Create Your First Team
              </CardTitle>
              <CardDescription>
                Teams help organize athletes into groups
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCreateTeam} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="teamName">Team Name</Label>
                  <Input
                    id="teamName"
                    placeholder="e.g., Competition Team"
                    value={teamName}
                    onChange={(e) => setTeamName(e.target.value)}
                    required
                    data-testid="input-team-name"
                  />
                </div>
                <Button
                  type="submit"
                  className="w-full"
                  disabled={createTeamMutation.isPending}
                  data-testid="button-create-team"
                >
                  {createTeamMutation.isPending ? "Creating..." : "Create Team & Continue"}
                </Button>
              </form>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
