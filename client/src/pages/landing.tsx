import { Dumbbell, TrendingUp, Users, Target, FileText, MessageSquare, LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function Landing() {
  const handleLogin = () => {
    window.location.href = '/api/login';
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation Header */}
      <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2">
            <Dumbbell className="h-6 w-6 text-primary" />
            <span className="text-lg font-semibold text-foreground">Workout Programming</span>
          </div>
          
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              onClick={handleLogin}
              data-testid="button-header-login"
            >
              <LogIn className="mr-2 h-4 w-4" />
              Login
            </Button>
            <Button
              onClick={handleLogin}
              data-testid="button-header-get-started"
            >
              Get Started
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <div className="relative overflow-hidden border-b border-border">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-background to-background" />
        
        <div className="relative mx-auto max-w-7xl px-4 py-20 sm:px-6 sm:py-24 lg:px-8 lg:py-32">
          <div className="text-center">
            <div className="mb-6 inline-flex items-center justify-center rounded-full bg-primary/10 p-4">
              <Dumbbell className="h-12 w-12 text-primary" />
            </div>
            
            <h1 className="mb-6 text-4xl font-bold tracking-tight text-foreground sm:text-5xl lg:text-6xl">
              Workout Programming
              <span className="block text-primary">Made Simple</span>
            </h1>
            
            <p className="mx-auto mb-10 max-w-2xl text-lg text-muted-foreground sm:text-xl">
              Streamline your coaching workflow with powerful tools for program creation, 
              athlete tracking, and progress analytics. Built for strength and conditioning professionals.
            </p>
            
            <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Button
                size="lg"
                onClick={handleLogin}
                className="h-12 w-full px-8 text-base font-medium sm:w-auto"
                data-testid="button-get-started"
              >
                Get Started Free
              </Button>
              <Button
                size="lg"
                variant="outline"
                onClick={handleLogin}
                className="h-12 w-full px-8 text-base font-medium sm:w-auto"
                data-testid="button-login"
              >
                <LogIn className="mr-2 h-4 w-4" />
                Login
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="mb-12 text-center">
          <h2 className="text-3xl font-bold text-foreground">
            Everything You Need to Coach Better
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Professional tools designed for weightlifting coaches and athletes
          </p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          <Card className="hover-elevate">
            <CardHeader>
              <div className="mb-2 inline-flex items-center justify-center rounded-lg bg-primary/10 p-3">
                <FileText className="h-6 w-6 text-primary" />
              </div>
              <CardTitle className="text-xl">Program Builder</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Create detailed training programs with our intuitive builder. 
                Organize by weeks, days, and exercises with full customization.
              </p>
            </CardContent>
          </Card>

          <Card className="hover-elevate">
            <CardHeader>
              <div className="mb-2 inline-flex items-center justify-center rounded-lg bg-primary/10 p-3">
                <Dumbbell className="h-6 w-6 text-primary" />
              </div>
              <CardTitle className="text-xl">Workout Logging</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Athletes log sets, reps, weight, and RPE with our mobile-optimized interface. 
                Track every detail effortlessly.
              </p>
            </CardContent>
          </Card>

          <Card className="hover-elevate">
            <CardHeader>
              <div className="mb-2 inline-flex items-center justify-center rounded-lg bg-primary/10 p-3">
                <TrendingUp className="h-6 w-6 text-primary" />
              </div>
              <CardTitle className="text-xl">Progress Analytics</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Visualize strength progression with 1RM estimates, volume tracking, 
                and comprehensive performance metrics.
              </p>
            </CardContent>
          </Card>

          <Card className="hover-elevate">
            <CardHeader>
              <div className="mb-2 inline-flex items-center justify-center rounded-lg bg-primary/10 p-3">
                <Users className="h-6 w-6 text-primary" />
              </div>
              <CardTitle className="text-xl">Team Management</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Organize athletes into teams, assign coaches, and manage your entire 
                organization from one platform.
              </p>
            </CardContent>
          </Card>

          <Card className="hover-elevate">
            <CardHeader>
              <div className="mb-2 inline-flex items-center justify-center rounded-lg bg-primary/10 p-3">
                <MessageSquare className="h-6 w-6 text-primary" />
              </div>
              <CardTitle className="text-xl">Coach Communication</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Stay connected with athletes through workout-specific comments 
                and direct messaging.
              </p>
            </CardContent>
          </Card>

          <Card className="hover-elevate">
            <CardHeader>
              <div className="mb-2 inline-flex items-center justify-center rounded-lg bg-primary/10 p-3">
                <Target className="h-6 w-6 text-primary" />
              </div>
              <CardTitle className="text-xl">Exercise Library</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Access 100+ pre-loaded exercises or create custom movements 
                with video demonstrations.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* CTA Section */}
      <div className="border-t border-border bg-card/50">
        <div className="mx-auto max-w-7xl px-4 py-16 text-center sm:px-6 lg:px-8">
          <h2 className="mb-4 text-3xl font-bold text-foreground">
            Ready to Transform Your Coaching?
          </h2>
          <p className="mb-8 text-lg text-muted-foreground">
            Join coaches who are already using our platform to build stronger athletes.
          </p>
          <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Button
              size="lg"
              onClick={handleLogin}
              className="h-12 w-full px-8 text-base font-medium sm:w-auto"
              data-testid="button-cta-get-started"
            >
              Start Free Trial
            </Button>
            <Button
              size="lg"
              variant="outline"
              onClick={handleLogin}
              className="h-12 w-full px-8 text-base font-medium sm:w-auto"
              data-testid="button-cta-login"
            >
              Already Have an Account?
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
