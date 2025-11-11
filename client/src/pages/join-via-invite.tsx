import { useEffect, useState } from "react";
import { useRoute, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { Organization } from "@shared/schema";
import { LoadingSpinner } from "@/components/LoadingSpinner";

export default function JoinViaInvite() {
  const [, params] = useRoute("/join/:inviteCode");
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const inviteCode = params?.inviteCode;

  const { data: organization, isLoading, error } = useQuery<Organization>({
    queryKey: ['/api/organizations/by-invite', inviteCode],
    enabled: !!inviteCode,
    queryFn: async () => {
      const res = await fetch(`/api/organizations/by-invite/${inviteCode}`);
      if (!res.ok) {
        if (res.status === 404) {
          throw new Error("Invalid invite code");
        }
        throw new Error("Failed to fetch organization");
      }
      return res.json();
    },
  });

  const joinMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest(`/api/organizations/join/${inviteCode}`, {
        method: "POST",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/organization-join-requests'] });
      toast({
        title: "Success",
        description: "Join request sent successfully! A coach will review your request.",
      });
      setTimeout(() => {
        setLocation('/');
      }, 2000);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error?.message || "Failed to send join request",
        variant: "destructive",
      });
    },
  });

  if (!inviteCode) {
    return (
      <div className="flex items-center justify-center min-h-screen p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-destructive">Invalid Link</CardTitle>
            <CardDescription>This invite link is invalid.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return <LoadingSpinner fullScreen />;
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-destructive flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              Invalid Invite Code
            </CardTitle>
            <CardDescription>
              {(error as Error).message === "Invalid invite code"
                ? "This invite code doesn't exist or has expired."
                : "There was an error loading this invite."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              onClick={() => setLocation('/join-team')}
              className="w-full"
              data-testid="button-search-organizations"
            >
              Search for Organizations
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!organization) {
    return null;
  }

  return (
    <div className="flex items-center justify-center min-h-screen p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl" data-testid="text-org-name">
            {organization.name}
          </CardTitle>
          <CardDescription>
            You've been invited to join this organization
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {organization.description && (
            <div className="text-sm text-muted-foreground" data-testid="text-org-description">
              {organization.description}
            </div>
          )}

          <Alert>
            <AlertDescription className="text-sm">
              After sending your join request, a coach will review and approve it before you can access the organization.
            </AlertDescription>
          </Alert>

          <div className="space-y-2">
            <Button
              onClick={() => joinMutation.mutate()}
              disabled={joinMutation.isPending}
              className="w-full"
              size="lg"
              data-testid="button-join-organization"
            >
              {joinMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending Request...
                </>
              ) : (
                <>
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  Send Join Request
                </>
              )}
            </Button>

            <Button
              variant="outline"
              onClick={() => setLocation('/join-team')}
              className="w-full"
              data-testid="button-back-to-search"
            >
              Back to Search
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
