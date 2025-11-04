import { useState } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Search, Users, Building2, CheckCircle, Clock, XCircle, Loader2 } from "lucide-react";

type Organization = {
  id: string;
  name: string;
  description: string | null;
};

type OrganizationJoinRequest = {
  id: string;
  organizationId: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
  organization: {
    id: string;
    name: string;
  };
};

export default function JoinTeam() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedOrganization, setSelectedOrganization] = useState<Organization | null>(null);

  // Get user's join requests
  const { data: joinRequests } = useQuery<OrganizationJoinRequest[]>({
    queryKey: ['/api/organization-join-requests'],
  });

  const searchMutation = useMutation({
    mutationFn: async (query: string) => {
      return await apiRequest("/api/organizations/search", {
        method: "POST",
        body: { searchTerm: query },
      });
    },
  });

  const joinRequestMutation = useMutation({
    mutationFn: async (data: { organizationId: string }) => {
      return await apiRequest("/api/organization-join-requests", {
        method: "POST",
        body: data,
      });
    },
    onSuccess: () => {
      toast({
        title: "Request sent!",
        description: "Your join request has been sent to the organization. You'll be notified when it's reviewed.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/organization-join-requests'] });
      setSelectedOrganization(null);
    },
    onError: (error: any) => {
      toast({
        title: "Request failed",
        description: error?.message || "Failed to send join request",
        variant: "destructive",
      });
    },
  });

  const handleSearch = () => {
    if (searchTerm.trim().length >= 2) {
      searchMutation.mutate(searchTerm);
    }
  };

  const handleJoinRequest = () => {
    if (selectedOrganization) {
      joinRequestMutation.mutate({
        organizationId: selectedOrganization.id,
      });
    }
  };

  const getRequestStatusForOrganization = (organizationId: string): OrganizationJoinRequest | undefined => {
    return joinRequests?.find(req => req.organizationId === organizationId && req.status === 'pending');
  };

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="mx-auto max-w-4xl space-y-6 py-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-foreground">Join an Organization</h1>
          <p className="mt-2 text-muted-foreground">
            Search for your organization and request to join
          </p>
        </div>

        {/* Search Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="h-5 w-5" />
              Search for Organizations
            </CardTitle>
            <CardDescription>
              Enter your organization name to find and join them
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <div className="flex-1 space-y-2">
                <Label htmlFor="search">Organization Name</Label>
                <Input
                  id="search"
                  placeholder="Search by organization name..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  data-testid="input-search-organization"
                />
              </div>
              <div className="flex items-end">
                <Button
                  onClick={handleSearch}
                  disabled={searchTerm.length < 2 || searchMutation.isPending}
                  data-testid="button-search"
                >
                  {searchMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Searching
                    </>
                  ) : (
                    <>
                      <Search className="mr-2 h-4 w-4" />
                      Search
                    </>
                  )}
                </Button>
              </div>
            </div>

            {/* Search Results */}
            {searchMutation.data && (
              <div className="space-y-3">
                <div className="text-sm font-medium text-muted-foreground">
                  {searchMutation.data.length === 0 
                    ? "No organizations found. Try a different search term."
                    : `Found ${searchMutation.data.length} organization${searchMutation.data.length === 1 ? '' : 's'}`}
                </div>
                <div className="grid gap-3">
                  {searchMutation.data.map((org: Organization) => {
                    const pendingRequest = getRequestStatusForOrganization(org.id);
                    return (
                      <Card
                        key={org.id}
                        className={`hover-elevate ${selectedOrganization?.id === org.id ? 'ring-2 ring-primary' : ''}`}
                        data-testid={`card-organization-${org.id}`}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1 space-y-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <Building2 className="h-5 w-5 text-muted-foreground" />
                                <h3 className="font-semibold">{org.name}</h3>
                                {org.inviteCode && (
                                  <span className="text-xs font-mono bg-muted px-2 py-0.5 rounded" data-testid="text-invite-code">
                                    {org.inviteCode}
                                  </span>
                                )}
                              </div>
                              {org.description && (
                                <p className="text-sm text-muted-foreground">{org.description}</p>
                              )}
                            </div>
                            <div>
                              {pendingRequest ? (
                                <Badge variant="secondary" data-testid="badge-pending">
                                  <Clock className="mr-1 h-3 w-3" />
                                  Pending
                                </Badge>
                              ) : (
                                <Button
                                  onClick={() => setSelectedOrganization(org)}
                                  variant={selectedOrganization?.id === org.id ? "default" : "outline"}
                                  size="sm"
                                  data-testid={`button-select-organization-${org.id}`}
                                >
                                  {selectedOrganization?.id === org.id ? "Selected" : "Request to Join"}
                                </Button>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Join Request Confirmation */}
        {selectedOrganization && (
          <Card>
            <CardHeader>
              <CardTitle>Request to Join {selectedOrganization.name}</CardTitle>
              <CardDescription>
                Are you sure you want to send a join request to this organization?
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-3">
                <Button
                  onClick={handleJoinRequest}
                  disabled={joinRequestMutation.isPending}
                  className="flex-1"
                  data-testid="button-send-request"
                >
                  {joinRequestMutation.isPending ? "Sending..." : "Send Request"}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setSelectedOrganization(null);
                  }}
                  data-testid="button-cancel"
                >
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* My Join Requests */}
        {joinRequests && joinRequests.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>My Join Requests</CardTitle>
              <CardDescription>
                Track the status of your organization join requests
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {joinRequests.map((request) => (
                <Card key={request.id} data-testid={`card-request-${request.id}`}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <div className="font-medium">{request.organization.name}</div>
                        <div className="text-xs text-muted-foreground">
                          Sent {new Date(request.createdAt).toLocaleDateString()}
                        </div>
                      </div>
                      <Badge
                        variant={
                          request.status === 'approved' 
                            ? 'default' 
                            : request.status === 'rejected' 
                            ? 'destructive' 
                            : 'secondary'
                        }
                        data-testid={`badge-status-${request.status}`}
                      >
                        {request.status === 'pending' && <Clock className="mr-1 h-3 w-3" />}
                        {request.status === 'approved' && <CheckCircle className="mr-1 h-3 w-3" />}
                        {request.status === 'rejected' && <XCircle className="mr-1 h-3 w-3" />}
                        {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Skip Option */}
        <div className="text-center">
          <Button
            variant="ghost"
            onClick={() => setLocation("/")}
            data-testid="button-skip"
          >
            Skip for now
          </Button>
        </div>
      </div>
    </div>
  );
}
