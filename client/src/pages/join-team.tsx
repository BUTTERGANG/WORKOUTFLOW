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

type Team = {
  id: string;
  name: string;
  description: string | null;
  organizationId: string;
  organization: {
    id: string;
    name: string;
  };
};

type JoinRequest = {
  id: string;
  teamId: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
  team: {
    id: string;
    name: string;
    organization: {
      name: string;
    };
  };
};

export default function JoinTeam() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [message, setMessage] = useState("");

  // Search teams
  const { data: teams, isLoading: searchingTeams, refetch } = useQuery<Team[]>({
    queryKey: ['/api/teams/search', searchTerm],
    enabled: false, // Disable automatic fetching
  });

  // Get user's join requests
  const { data: joinRequests } = useQuery<JoinRequest[]>({
    queryKey: ['/api/my-join-requests'],
  });

  const searchMutation = useMutation({
    mutationFn: async (query: string) => {
      const response = await fetch(`/api/teams/search?q=${encodeURIComponent(query)}`, {
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to search teams');
      return response.json();
    },
  });

  const joinRequestMutation = useMutation({
    mutationFn: async (data: { teamId: string; message?: string }) => {
      return await apiRequest("/api/team-join-requests", {
        method: "POST",
        body: data,
      });
    },
    onSuccess: () => {
      toast({
        title: "Request sent!",
        description: "Your join request has been sent to the team. You'll be notified when it's reviewed.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/my-join-requests'] });
      setSelectedTeam(null);
      setMessage("");
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
    if (selectedTeam) {
      joinRequestMutation.mutate({
        teamId: selectedTeam.id,
        message: message.trim() || undefined,
      });
    }
  };

  const getRequestStatusForTeam = (teamId: string): JoinRequest | undefined => {
    return joinRequests?.find(req => req.teamId === teamId && req.status === 'pending');
  };

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="mx-auto max-w-4xl space-y-6 py-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-foreground">Join a Team</h1>
          <p className="mt-2 text-muted-foreground">
            Search for your team and request to join
          </p>
        </div>

        {/* Search Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="h-5 w-5" />
              Search for Teams
            </CardTitle>
            <CardDescription>
              Enter your team name to find and join them
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <div className="flex-1 space-y-2">
                <Label htmlFor="search">Team Name</Label>
                <Input
                  id="search"
                  placeholder="Search by team name..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  data-testid="input-search-team"
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
                    ? "No teams found. Try a different search term."
                    : `Found ${searchMutation.data.length} team${searchMutation.data.length === 1 ? '' : 's'}`}
                </div>
                <div className="grid gap-3">
                  {searchMutation.data.map((team: Team) => {
                    const pendingRequest = getRequestStatusForTeam(team.id);
                    return (
                      <Card
                        key={team.id}
                        className={`hover-elevate ${selectedTeam?.id === team.id ? 'ring-2 ring-primary' : ''}`}
                        data-testid={`card-team-${team.id}`}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1 space-y-1">
                              <div className="flex items-center gap-2">
                                <Users className="h-4 w-4 text-muted-foreground" />
                                <h3 className="font-semibold">{team.name}</h3>
                              </div>
                              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <Building2 className="h-3 w-3" />
                                <span>{team.organization.name}</span>
                              </div>
                              {team.description && (
                                <p className="text-sm text-muted-foreground">{team.description}</p>
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
                                  onClick={() => setSelectedTeam(team)}
                                  variant={selectedTeam?.id === team.id ? "default" : "outline"}
                                  size="sm"
                                  data-testid={`button-select-team-${team.id}`}
                                >
                                  {selectedTeam?.id === team.id ? "Selected" : "Request to Join"}
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

        {/* Join Request Form */}
        {selectedTeam && (
          <Card>
            <CardHeader>
              <CardTitle>Request to Join {selectedTeam.name}</CardTitle>
              <CardDescription>
                Add an optional message to introduce yourself to the coaches
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="message">Message (Optional)</Label>
                <Textarea
                  id="message"
                  placeholder="Tell the coaches about yourself..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={4}
                  data-testid="textarea-message"
                />
              </div>
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
                    setSelectedTeam(null);
                    setMessage("");
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
                Track the status of your team join requests
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {joinRequests.map((request) => (
                <Card key={request.id} data-testid={`card-request-${request.id}`}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <div className="font-medium">{request.team.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {request.team.organization.name}
                        </div>
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
