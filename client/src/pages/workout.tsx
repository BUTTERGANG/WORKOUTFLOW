import { useEffect, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dumbbell, Plus, Minus, Timer, Calculator, Check, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { WorkoutSession, ExerciseLog, SetLog, ProgramAssignment, ProgramDay, Exercise, ProgramExercise } from "@shared/schema";

export default function Workout() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading, user } = useAuth();
  const [activeSession, setActiveSession] = useState<WorkoutSession | null>(null);
  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0);
  const [weight, setWeight] = useState<string>("");
  const [reps, setReps] = useState<number>(5);
  const [rpe, setRpe] = useState<string>("7");
  const [restTimer, setRestTimer] = useState<number>(0);
  const [isResting, setIsResting] = useState(false);

  // Fetch active program assignment
  const { data: activeAssignment } = useQuery<ProgramAssignment & { program: { name: string } }>({
    queryKey: ['/api/program-assignments/active'],
    enabled: !!user,
    queryFn: async () => {
      const res = await fetch('/api/program-assignments/active');
      if (!res.ok) throw new Error('No active assignment');
      return res.json();
    },
    retry: false,
  });

  // Fetch today's workout (active or scheduled)
  const { data: todaysWorkout } = useQuery<WorkoutSession & { programDay: ProgramDay }>({
    queryKey: ['/api/workout-sessions/today'],
    enabled: !!user,
    queryFn: async () => {
      const res = await fetch('/api/workout-sessions/today');
      if (!res.ok) return null;
      return res.json();
    },
    retry: false,
  });

  // Fetch planned exercises for today's workout
  const { data: plannedExercises } = useQuery<(ProgramExercise & { exercise: Exercise })[]>({
    queryKey: ['/api/program-days', todaysWorkout?.programDayId, 'exercises'],
    enabled: !!todaysWorkout?.programDayId,
    queryFn: async () => {
      const res = await fetch(`/api/program-days/${todaysWorkout!.programDayId}/exercises`);
      if (!res.ok) throw new Error('Failed to fetch exercises');
      return res.json();
    },
  });

  // Fetch logged exercises for active session
  const { data: exerciseLogs } = useQuery<(ExerciseLog & { setLogs: SetLog[]; exercise: Exercise })[]>({
    queryKey: ['/api/workout-sessions', activeSession?.id, 'logs'],
    enabled: !!activeSession,
    queryFn: async () => {
      const res = await fetch(`/api/workout-sessions/${activeSession!.id}/exercise-logs`);
      if (!res.ok) throw new Error('Failed to fetch logs');
      return res.json();
    },
  });

  // Start workout session
  const startSessionMutation = useMutation({
    mutationFn: async (programDayId?: string | null) => {
      return await apiRequest<WorkoutSession>("/api/workout-sessions", {
        method: "POST",
        body: {
          programDayId: programDayId || undefined,
          scheduledDate: new Date().toISOString(),
        },
      });
    },
    onSuccess: (session) => {
      setActiveSession(session);
      queryClient.invalidateQueries({ queryKey: ['/api/workout-sessions'] });
      queryClient.invalidateQueries({ queryKey: ['/api/workout-sessions/today'] });
      queryClient.invalidateQueries({ queryKey: ['/api/program-days'] });
      toast({ title: "Workout started!" });
    },
  });

  // Log exercise
  const logExerciseMutation = useMutation({
    mutationFn: async (data: { sessionId: string; exerciseId: string; order: number }) => {
      return await apiRequest<ExerciseLog>(`/api/workout-sessions/${data.sessionId}/exercise-logs`, {
        method: "POST",
        body: data,
      });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['/api/workout-sessions'] });
      queryClient.invalidateQueries({ queryKey: ['/api/workout-sessions', variables.sessionId, 'logs'] });
    },
  });

  // Log set
  const logSetMutation = useMutation({
    mutationFn: async (data: { exerciseLogId: string; setNumber: number; weight: number; reps: number; rpe: number }) => {
      return await apiRequest<SetLog>(`/api/exercise-logs/${data.exerciseLogId}/sets`, {
        method: "POST",
        body: data,
      });
    },
    onSuccess: () => {
      if (activeSession) {
        queryClient.invalidateQueries({ queryKey: ['/api/workout-sessions', activeSession.id, 'logs'] });
      }
      queryClient.invalidateQueries({ queryKey: ['/api/workout-sessions'] });
      toast({ title: "Set logged", description: `${weight} lbs × ${reps} reps @ RPE ${rpe}` });
      setIsResting(true);
      setRestTimer(180); // 3 minutes default rest
      setWeight("");
    },
  });

  // Complete workout
  const completeWorkoutMutation = useMutation({
    mutationFn: async (sessionId: string) => {
      return await apiRequest(`/api/workout-sessions/${sessionId}/complete`, {
        method: "POST",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/workout-sessions'] });
      queryClient.invalidateQueries({ queryKey: ['/api/workout-sessions/today'] });
      setActiveSession(null);
      setCurrentExerciseIndex(0);
      toast({ title: "Workout completed!", description: "Great work!" });
    },
  });

  // Rest timer countdown
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isResting && restTimer > 0) {
      interval = setInterval(() => {
        setRestTimer((prev) => {
          if (prev <= 1) {
            setIsResting(false);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isResting, restTimer]);

  const handleStartWorkout = () => {
    startSessionMutation.mutate(todaysWorkout?.programDayId);
  };

  const handleLogSet = () => {
    if (!activeSession || !plannedExercises || currentExerciseIndex >= plannedExercises.length) return;
    
    const currentPlannedExercise = plannedExercises[currentExerciseIndex];
    
    // Find or create exercise log for this exercise
    const existingLog = exerciseLogs?.find(log => log.exerciseId === currentPlannedExercise.exerciseId);
    
    if (existingLog) {
      // Log set to existing exercise log
      const setNumber = (existingLog.setLogs?.length || 0) + 1;
      logSetMutation.mutate({
        exerciseLogId: existingLog.id,
        setNumber,
        weight: parseFloat(weight) || 0,
        reps,
        rpe: parseInt(rpe),
      });
    } else {
      // Create new exercise log first, then log set
      logExerciseMutation.mutate(
        {
          sessionId: activeSession.id,
          exerciseId: currentPlannedExercise.exerciseId,
          order: currentExerciseIndex + 1,
        },
        {
          onSuccess: (exerciseLog) => {
            logSetMutation.mutate({
              exerciseLogId: exerciseLog.id,
              setNumber: 1,
              weight: parseFloat(weight) || 0,
              reps,
              rpe: parseInt(rpe),
            });
          },
        }
      );
    }
  };

  const handleCompleteWorkout = () => {
    if (!activeSession) return;
    completeWorkoutMutation.mutate(activeSession.id);
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

  // Calculate plate loading for barbell
  const calculatePlates = (totalWeight: number) => {
    const barWeight = 45;
    const weightPerSide = (totalWeight - barWeight) / 2;
    
    if (weightPerSide <= 0) return [];
    
    const plates = [45, 35, 25, 10, 5, 2.5];
    const result: number[] = [];
    let remaining = weightPerSide;
    
    for (const plate of plates) {
      while (remaining >= plate) {
        result.push(plate);
        remaining -= plate;
      }
    }
    
    return result;
  };

  const plates = weight ? calculatePlates(parseFloat(weight) || 0) : [];

  // Get current exercise details
  const currentPlannedExercise = plannedExercises?.[currentExerciseIndex];
  const currentExerciseLog = exerciseLogs?.find(log => log.exerciseId === currentPlannedExercise?.exerciseId);
  const completedSets = currentExerciseLog?.setLogs?.length || 0;
  const totalSets = currentPlannedExercise?.sets || 0;

  return (
    <div className="h-full overflow-auto bg-background">
      <div className="mx-auto max-w-4xl p-4">
        {/* Workout Header */}
        <div className="mb-6">
          <div className="mb-2 flex items-center justify-between">
            <h1 className="text-2xl font-bold text-foreground">Today's Workout</h1>
            {activeSession ? (
              <Badge variant="default" className="gap-1" data-testid="badge-workout-status">
                <Timer className="h-3 w-3" />
                Active Session
              </Badge>
            ) : (
              <Badge variant="outline" data-testid="badge-workout-status">
                Not Started
              </Badge>
            )}
          </div>
          {activeAssignment && (
            <p className="text-sm text-muted-foreground">
              {activeAssignment.program.name}
            </p>
          )}
        </div>

        {/* No Assignment Message */}
        {!activeAssignment && (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Dumbbell className="mb-4 h-12 w-12 text-muted-foreground" />
              <h3 className="mb-2 text-lg font-semibold">No Active Program</h3>
              <p className="text-center text-sm text-muted-foreground">
                You don't have an active training program assigned. Check with your coach.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Start Workout Button */}
        {!activeSession && activeAssignment && plannedExercises && plannedExercises.length > 0 && (
          <Card className="mb-6">
            <CardContent className="flex flex-col items-center justify-center py-8">
              <h3 className="mb-4 text-lg font-semibold">Ready to train?</h3>
              <p className="mb-4 text-center text-sm text-muted-foreground">
                {plannedExercises.length} exercises planned for today
              </p>
              <Button
                onClick={handleStartWorkout}
                size="lg"
                className="gap-2"
                data-testid="button-start-workout"
              >
                <Dumbbell className="h-5 w-5" />
                Start Workout
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Active Workout */}
        {activeSession && currentPlannedExercise && (
          <>
            {/* Progress Indicator */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted-foreground">
                  Exercise {currentExerciseIndex + 1} of {plannedExercises?.length || 0}
                </span>
                <span className="text-sm font-medium">
                  Set {completedSets + 1} of {totalSets}
                </span>
              </div>
              <div className="h-2 w-full rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary transition-all"
                  style={{ width: `${(completedSets / totalSets) * 100}%` }}
                />
              </div>
            </div>

            {/* Current Exercise Card */}
            <Card className="mb-6">
              <CardHeader className="space-y-0 pb-4">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-xl">{currentPlannedExercise.exercise.name}</CardTitle>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {currentPlannedExercise.sets} sets × {currentPlannedExercise.reps} reps
                      {currentPlannedExercise.intensity && ` @ ${currentPlannedExercise.intensity}`}
                    </p>
                  </div>
                  <Dumbbell className="h-6 w-6 text-muted-foreground" />
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Previous Sets */}
                {currentExerciseLog && currentExerciseLog.setLogs && currentExerciseLog.setLogs.length > 0 && (
                  <div>
                    <h3 className="mb-3 text-sm font-medium">Completed Sets</h3>
                    <div className="space-y-2 rounded-lg bg-muted/50 p-3">
                      {currentExerciseLog.setLogs.map((set) => (
                        <div key={set.id} className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Set {set.setNumber}</span>
                          <span className="font-mono">{set.weight} lbs × {set.reps} @ RPE {set.rpe}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Log Set Form */}
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="weight">Weight (lbs)</Label>
                      <Input
                        id="weight"
                        type="number"
                        placeholder="225"
                        value={weight}
                        onChange={(e) => setWeight(e.target.value)}
                        className="text-lg"
                        data-testid="input-weight"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="reps">Reps</Label>
                      <div className="flex items-center gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          onClick={() => setReps(Math.max(1, reps - 1))}
                          data-testid="button-reps-minus"
                        >
                          <Minus className="h-4 w-4" />
                        </Button>
                        <Input
                          id="reps"
                          type="number"
                          value={reps}
                          onChange={(e) => setReps(parseInt(e.target.value) || 1)}
                          className="text-center text-lg font-mono"
                          data-testid="input-reps"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          onClick={() => setReps(reps + 1)}
                          data-testid="button-reps-plus"
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="rpe">RPE (Rate of Perceived Exertion)</Label>
                    <Select value={rpe} onValueChange={setRpe}>
                      <SelectTrigger data-testid="select-rpe">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((val) => (
                          <SelectItem key={val} value={val.toString()}>
                            RPE {val} {val >= 9 ? "(Max Effort)" : val >= 7 ? "(Hard)" : "(Moderate)"}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Plate Calculator */}
                  {plates.length > 0 && (
                    <div className="rounded-lg border p-3">
                      <div className="mb-2 flex items-center gap-2 text-sm font-medium">
                        <Calculator className="h-4 w-4" />
                        Plates per side
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {plates.map((plate, i) => (
                          <Badge key={i} variant="secondary">
                            {plate} lbs
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Log Set Button */}
                  <Button
                    onClick={handleLogSet}
                    className="w-full"
                    size="lg"
                    disabled={!weight || logSetMutation.isPending}
                    data-testid="button-log-set"
                  >
                    <Check className="h-5 w-5 mr-2" />
                    Log Set
                  </Button>
                </div>

                {/* Rest Timer */}
                {isResting && (
                  <div className="rounded-lg bg-primary/10 p-4 text-center">
                    <Timer className="mx-auto mb-2 h-8 w-8 text-primary" />
                    <p className="text-2xl font-bold font-mono">
                      {Math.floor(restTimer / 60)}:{(restTimer % 60).toString().padStart(2, '0')}
                    </p>
                    <p className="text-sm text-muted-foreground">Rest time</p>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setIsResting(false);
                        setRestTimer(0);
                      }}
                      className="mt-2"
                    >
                      Skip Rest
                    </Button>
                  </div>
                )}

                {/* Exercise Navigation */}
                {completedSets >= totalSets && (
                  <div className="flex gap-2">
                    {currentExerciseIndex < (plannedExercises?.length || 0) - 1 ? (
                      <Button
                        onClick={() => setCurrentExerciseIndex(currentExerciseIndex + 1)}
                        className="w-full"
                        size="lg"
                        data-testid="button-next-exercise"
                      >
                        Next Exercise
                      </Button>
                    ) : (
                      <Button
                        onClick={handleCompleteWorkout}
                        className="w-full"
                        size="lg"
                        variant="default"
                        data-testid="button-complete-workout"
                      >
                        Complete Workout
                      </Button>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}
