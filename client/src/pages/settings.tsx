import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { useApp } from "@/contexts/AppContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LogOut, User, Shield, Link2, Copy, Check } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import type { Organization } from "@shared/schema";
import { LoadingSpinner } from "@/components/LoadingSpinner";

export default function Settings() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading, user } = useAuth();
  const { currentOrganization } = useApp();
  const [copiedCode, setCopiedCode] = useState(false);

  // Fetch organization details if user owns an organization
  const { data: organization } = useQuery<Organization>({
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
    return <LoadingSpinner fullScreen />;
  }

  if (!user) return null;

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'admin': return 'default';
      case 'head_coach': return 'secondary';
      case 'assistant_coach': return 'secondary';
      default: return 'outline';
    }
  };

  const getRoleLabel = (role: string) => {
    return role.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  const copyInviteLink = async () => {
    if (organization?.inviteCode) {
      const inviteLink = `${window.location.origin}/join/${organization.inviteCode}`;
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

  const isCoach = user?.role === 'admin' || user?.role === 'head_coach' || user?.role === 'assistant_coach';

  return (
    <div className="h-full overflow-auto">
      <div className="mx-auto max-w-4xl p-4 sm:p-6 lg:p-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">Settings</h1>
          <p className="mt-2 text-muted-foreground">
            Manage your account preferences and profile
          </p>
        </div>

        <div className="space-y-6">
          {/* Profile Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Profile Information
              </CardTitle>
              <CardDescription>
                Your personal information and account details
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Profile Picture */}
              <div className="flex items-center gap-4">
                <Avatar className="h-20 w-20">
                  <AvatarImage src={user.profileImageUrl || undefined} style={{ objectFit: 'cover' }} />
                  <AvatarFallback className="text-lg">
                    {user.firstName?.[0] || user.email?.[0] || 'U'}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium">Profile Picture</p>
                  <p className="text-sm text-muted-foreground">
                    Managed by your authentication provider
                  </p>
                </div>
              </div>

              {/* Email */}
              <div className="grid gap-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={user.email || ''}
                  disabled
                  data-testid="input-email"
                />
                <p className="text-xs text-muted-foreground">
                  Email cannot be changed
                </p>
              </div>

              {/* Name */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="grid gap-2">
                  <Label htmlFor="firstName">First Name</Label>
                  <Input
                    id="firstName"
                    value={user.firstName || ''}
                    disabled
                    data-testid="input-firstname"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="lastName">Last Name</Label>
                  <Input
                    id="lastName"
                    value={user.lastName || ''}
                    disabled
                    data-testid="input-lastname"
                  />
                </div>
              </div>

              <p className="text-xs text-muted-foreground">
                Profile information is managed by your authentication provider
              </p>
            </CardContent>
          </Card>

          {/* Role & Permissions */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Role & Permissions
              </CardTitle>
              <CardDescription>
                Your access level in the platform
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Current Role</p>
                  <p className="text-sm text-muted-foreground">
                    Assigned by organization administrator
                  </p>
                </div>
                {user.role && (
                  <Badge variant={getRoleBadgeVariant(user.role)} className="text-sm">
                    {getRoleLabel(user.role)}
                  </Badge>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Organization Invite Link - Only for Coaches */}
          {isCoach && organization && organization.inviteCode && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Link2 className="h-5 w-5" />
                  Organization Invite Link
                </CardTitle>
                <CardDescription>
                  Share this link with athletes to invite them to your organization
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Invite Code</Label>
                  <div className="flex gap-2">
                    <Input
                      value={organization.inviteCode}
                      readOnly
                      className="font-mono"
                      data-testid="input-invite-code"
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={copyInviteLink}
                      data-testid="button-copy-invite"
                    >
                      {copiedCode ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Full Invite Link</Label>
                  <div className="flex gap-2">
                    <Input
                      value={`${window.location.origin}/join/${organization.inviteCode}`}
                      readOnly
                      className="text-sm"
                      data-testid="input-invite-link"
                    />
                    <Button
                      onClick={copyInviteLink}
                      data-testid="button-copy-link"
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
                <p className="text-xs text-muted-foreground">
                  Athletes can use this link to send a join request to your organization. You'll need to approve their request before they can access the organization.
                </p>
              </CardContent>
            </Card>
          )}

          {/* Account Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Account Actions</CardTitle>
              <CardDescription>
                Manage your account session
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                variant="destructive"
                onClick={async () => {
                  try {
                    await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
                    window.location.href = '/';
                  } catch (error) {
                    console.error('Logout failed:', error);
                  }
                }}
                data-testid="button-logout"
                className="gap-2"
              >
                <LogOut className="h-4 w-4" />
                Log Out
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
