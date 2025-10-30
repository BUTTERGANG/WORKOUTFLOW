import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useToast } from "@/hooks/use-toast";
import { Dumbbell } from "lucide-react";

type UserType = "athlete" | "coach";

export default function Register() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [userType, setUserType] = useState<UserType>("athlete");

  const registerMutation = useMutation({
    mutationFn: async (data: { firstName: string; lastName: string; email: string; userType: UserType }) => {
      return await apiRequest("/api/auth/register", {
        method: "POST",
        body: data,
      });
    },
    onSuccess: () => {
      toast({ title: "Registration successful", description: "Welcome to the platform!" });
      // Reload page to refresh auth state
      window.location.href = "/dashboard";
    },
    onError: (error: any) => {
      toast({
        title: "Registration failed",
        description: error?.message || "Failed to complete registration",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName.trim() || !lastName.trim() || !email.trim()) {
      toast({
        title: "Missing information",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }
    registerMutation.mutate({ firstName, lastName, email, userType });
  };

  // If user is already registered, redirect to dashboard
  if (user?.firstName && user?.lastName) {
    setLocation("/dashboard");
    return null;
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4 bg-background">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mb-4 flex justify-center">
            <div className="rounded-full bg-primary/10 p-4">
              <Dumbbell className="h-8 w-8 text-primary" />
            </div>
          </div>
          <CardTitle className="text-2xl">Welcome to the Platform</CardTitle>
          <CardDescription className="text-base">
            Complete your profile to get started
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">First Name *</Label>
                <Input
                  id="firstName"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="John"
                  required
                  data-testid="input-first-name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Last Name *</Label>
                <Input
                  id="lastName"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="Doe"
                  required
                  data-testid="input-last-name"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="john.doe@example.com"
                required
                data-testid="input-email"
              />
            </div>

            <div className="space-y-3">
              <Label>I am a... *</Label>
              <RadioGroup
                value={userType}
                onValueChange={(value) => setUserType(value as UserType)}
                data-testid="radio-user-type"
              >
                <div className="flex items-center space-x-2 rounded-md border p-4 hover-elevate active-elevate-2">
                  <RadioGroupItem value="athlete" id="athlete" data-testid="radio-athlete" />
                  <Label htmlFor="athlete" className="flex-1 cursor-pointer">
                    <div className="font-semibold">Athlete</div>
                    <div className="text-sm text-muted-foreground">
                      Join a team and track your workouts
                    </div>
                  </Label>
                </div>
                <div className="flex items-center space-x-2 rounded-md border p-4 hover-elevate active-elevate-2">
                  <RadioGroupItem value="coach" id="coach" data-testid="radio-coach" />
                  <Label htmlFor="coach" className="flex-1 cursor-pointer">
                    <div className="font-semibold">Coach</div>
                    <div className="text-sm text-muted-foreground">
                      Create programs and manage your team
                    </div>
                  </Label>
                </div>
              </RadioGroup>
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={registerMutation.isPending}
              data-testid="button-submit-registration"
            >
              {registerMutation.isPending ? "Creating Account..." : "Get Started"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
