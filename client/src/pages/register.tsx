import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useToast } from "@/hooks/use-toast";
import { Dumbbell } from "lucide-react";
import { Link } from "wouter";

type UserType = "athlete" | "coach";

export default function Register() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [userType, setUserType] = useState<UserType>("athlete");

  const registerMutation = useMutation({
    mutationFn: async (data: { 
      firstName: string; 
      lastName: string; 
      email: string; 
      password: string;
      role: 'athlete' | 'head_coach' | 'assistant_coach'; 
    }) => {
      return await apiRequest("/api/auth/register", {
        method: "POST",
        body: data,
      });
    },
    onSuccess: (data, variables) => {
      // Invalidate user query to fetch new auth state
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      
      toast({ title: "Registration successful", description: "Welcome to the platform!" });
      // Redirect athletes to join team page, coaches to onboarding
      setTimeout(() => {
        if (variables.role === "athlete") {
          setLocation("/join-team");
        } else {
          setLocation("/onboarding");
        }
      }, 500);
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

    // Validate required fields
    if (!firstName.trim() || !lastName.trim() || !email.trim() || !password) {
      toast({
        title: "Missing information",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      toast({
        title: "Invalid Email",
        description: "Please enter a valid email address",
        variant: "destructive",
      });
      return;
    }

    // Validate name lengths
    if (firstName.trim().length < 2 || lastName.trim().length < 2) {
      toast({
        title: "Validation Error",
        description: "First and last name must be at least 2 characters",
        variant: "destructive",
      });
      return;
    }

    // Validate password length
    if (password.length < 6) {
      toast({
        title: "Validation Error",
        description: "Password must be at least 6 characters",
        variant: "destructive",
      });
      return;
    }

    // Convert userType to role
    const role = userType === 'coach' ? 'head_coach' : 'athlete';

    registerMutation.mutate({ firstName, lastName, email, password, role });
  };

  // If user is already registered, redirect to home (in effect to avoid render loop)
  useEffect(() => {
    if (user?.firstName && user?.lastName) {
      setLocation("/");
    }
  }, [user, setLocation]);

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

            <div className="space-y-2">
              <Label htmlFor="password">Password *</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Minimum 6 characters"
                required
                minLength={6}
                data-testid="input-password"
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

            <div className="text-center text-sm">
              <span className="text-muted-foreground">Already have an account? </span>
              <Link href="/login" data-testid="link-login">
                <span className="text-primary hover:underline">Sign in</span>
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
