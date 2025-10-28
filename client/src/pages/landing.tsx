import { Dumbbell, TrendingUp, Users, Target, FileText, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export default function Landing() {
  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <div className="relative overflow-hidden border-b border-border">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-background to-background" />
        
        <div className="relative mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:px-8">
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
            
            <Button
              size="lg"
              onClick={() => window.location.href = '/api/login'}
              className="h-12 px-8 text-base font-medium"
              data-testid="button-login"
            >
              Get Started
            </Button>
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

        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
          <Card className="p-6">
            <div className="mb-4 inline-flex items-center justify-center rounded-lg bg-primary/10 p-3">
              <FileText className="h-6 w-6 text-primary" />
            </div>
            <h3 className="mb-2 text-xl font-semibold text-card-foreground">Program Builder</h3>
            <p className="text-muted-foreground">
              Create detailed training programs with our intuitive builder. 
              Organize by weeks, days, and exercises with full customization.
            </p>
          </Card>

          <Card className="p-6">
            <div className="mb-4 inline-flex items-center justify-center rounded-lg bg-primary/10 p-3">
              <Dumbbell className="h-6 w-6 text-primary" />
            </div>
            <h3 className="mb-2 text-xl font-semibold text-card-foreground">Workout Logging</h3>
            <p className="text-muted-foreground">
              Athletes log sets, reps, weight, and RPE with our mobile-optimized interface. 
              Track every detail effortlessly.
            </p>
          </Card>

          <Card className="p-6">
            <div className="mb-4 inline-flex items-center justify-center rounded-lg bg-primary/10 p-3">
              <TrendingUp className="h-6 w-6 text-primary" />
            </div>
            <h3 className="mb-2 text-xl font-semibold text-card-foreground">Progress Analytics</h3>
            <p className="text-muted-foreground">
              Visualize strength progression with 1RM estimates, volume tracking, 
              and comprehensive performance metrics.
            </p>
          </Card>

          <Card className="p-6">
            <div className="mb-4 inline-flex items-center justify-center rounded-lg bg-primary/10 p-3">
              <Users className="h-6 w-6 text-primary" />
            </div>
            <h3 className="mb-2 text-xl font-semibold text-card-foreground">Team Management</h3>
            <p className="text-muted-foreground">
              Organize athletes into teams, assign coaches, and manage your entire 
              organization from one platform.
            </p>
          </Card>

          <Card className="p-6">
            <div className="mb-4 inline-flex items-center justify-center rounded-lg bg-primary/10 p-3">
              <MessageSquare className="h-6 w-6 text-primary" />
            </div>
            <h3 className="mb-2 text-xl font-semibold text-card-foreground">Coach Communication</h3>
            <p className="text-muted-foreground">
              Stay connected with athletes through workout-specific comments 
              and direct messaging.
            </p>
          </Card>

          <Card className="p-6">
            <div className="mb-4 inline-flex items-center justify-center rounded-lg bg-primary/10 p-3">
              <Target className="h-6 w-6 text-primary" />
            </div>
            <h3 className="mb-2 text-xl font-semibold text-card-foreground">Exercise Library</h3>
            <p className="text-muted-foreground">
              Access 100+ pre-loaded exercises or create custom movements 
              with video demonstrations.
            </p>
          </Card>
        </div>
      </div>

      {/* CTA Section */}
      <div className="border-t border-border bg-card/50">
        <div className="mx-auto max-w-7xl px-4 py-16 text-center sm:px-6 lg:px-8">
          <h2 className="mb-4 text-3xl font-bold text-card-foreground">
            Ready to Transform Your Coaching?
          </h2>
          <p className="mb-8 text-lg text-muted-foreground">
            Join coaches who are already using our platform to build stronger athletes.
          </p>
          <Button
            size="lg"
            onClick={() => window.location.href = '/api/login'}
            className="h-12 px-8 text-base font-medium"
            data-testid="button-cta-login"
          >
            Start Free Trial
          </Button>
        </div>
      </div>
    </div>
  );
}
