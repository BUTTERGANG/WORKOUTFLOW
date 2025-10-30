import { useEffect, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useApp } from "@/contexts/AppContext";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {  Plus, FileText, Calendar, Users, ChevronRight, Trash2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import type { Program, ProgramWeek, ProgramDay, ProgramExercise, Exercise } from "@shared/schema";

export default function Programs() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading, user } = useAuth();
  const { currentOrganization } = useApp();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [programName, setProgramName] = useState("");
  const [programDescription, setProgramDescription] = useState("");
  const [programDuration, setProgramDuration] = useState("");
  const [selectedProgram, setSelectedProgram] = useState<Program | null>(null);
  const [buildDialogOpen, setBuildDialogOpen] = useState(false);

  const { data: programs, isLoading: programsLoading } = useQuery<Program[]>({
    queryKey: ['/api/programs', currentOrganization?.id],
    queryFn: async () => {
      if (!currentOrganization) return [];
      const res = await fetch(`/api/programs?organizationId=${currentOrganization.id}`, {
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Failed to fetch programs');
      return res.json();
    },
    enabled: !!currentOrganization,
  });

  const { data: exercises } = useQuery<Exercise[]>({
    queryKey: ['/api/exercises'],
    enabled: !!currentOrganization,
  });

  const createProgramMutation = useMutation({
    mutationFn: async (data: { name: string; description: string; durationWeeks: number; organizationId: string }) => {
      return await apiRequest<Program>("/api/programs", {
        method: "POST",
        body: data,
      });
    },
    onSuccess: (program) => {
      queryClient.invalidateQueries({ queryKey: ['/api/programs'] });
      toast({ title: "Success", description: "Program created" });
      setCreateDialogOpen(false);
      setProgramName("");
      setProgramDescription("");
      setProgramDuration("");
      setSelectedProgram(program);
      setBuildDialogOpen(true);
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to create program", variant: "destructive" });
    },
  });

  const handleCreateProgram = () => {
    if (!programName.trim() || !programDuration || !currentOrganization) return;
    createProgramMutation.mutate({
      name: programName,
      description: programDescription,
      durationWeeks: parseInt(programDuration),
      organizationId: currentOrganization.id,
    });
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

  const isCoach = user.role === 'admin' || user.role === 'head_coach' || user.role === 'assistant_coach';

  if (!isCoach) {
    return (
      <div className="flex h-screen items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Access Denied</CardTitle>
            <CardDescription>
              Only coaches can access program management.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (!currentOrganization) {
    return (
      <div className="flex h-screen items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>No Organization Selected</CardTitle>
            <CardDescription>
              Please select or create an organization to manage programs.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="h-full overflow-auto">
      <div className="mx-auto max-w-7xl p-4 sm:p-6 lg:p-8">
        {/* Header */}
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Programs</h1>
            <p className="mt-2 text-muted-foreground">
              Create and manage training programs for your athletes
            </p>
          </div>

          <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button data-testid="button-create-program" className="gap-2">
                <Plus className="h-4 w-4" />
                Create Program
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Create New Program</DialogTitle>
                <DialogDescription>
                  Build a structured training program for your athletes
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="programName">Program Name</Label>
                  <Input
                    id="programName"
                    placeholder="e.g., Strength & Conditioning - Week 1-12"
                    value={programName}
                    onChange={(e) => setProgramName(e.target.value)}
                    data-testid="input-program-name"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="description">Description (Optional)</Label>
                  <Textarea
                    id="description"
                    placeholder="Program goals and overview..."
                    value={programDescription}
                    onChange={(e) => setProgramDescription(e.target.value)}
                    data-testid="input-program-description"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="duration">Duration (Weeks)</Label>
                  <Input
                    id="duration"
                    type="number"
                    min="1"
                    max="52"
                    placeholder="12"
                    value={programDuration}
                    onChange={(e) => setProgramDuration(e.target.value)}
                    data-testid="input-program-duration"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button
                  onClick={handleCreateProgram}
                  disabled={!programName.trim() || !programDuration}
                  data-testid="button-submit-program"
                >
                  Create & Build Program
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Programs Grid */}
        {programsLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="mb-4 inline-block h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
              <p className="text-muted-foreground">Loading programs...</p>
            </div>
          </div>
        ) : !programs || programs.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <FileText className="mb-4 h-12 w-12 text-muted-foreground" />
              <h3 className="mb-2 text-lg font-semibold">No Programs Yet</h3>
              <p className="mb-4 text-center text-sm text-muted-foreground">
                Create your first training program to get started
              </p>
              <Button onClick={() => setCreateDialogOpen(true)} variant="outline">
                Create Program
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {programs.map((program) => (
              <Card
                key={program.id}
                className="hover-elevate cursor-pointer transition-shadow"
                onClick={() => {
                  setSelectedProgram(program);
                  setBuildDialogOpen(true);
                }}
                data-testid={`card-program-${program.id}`}
              >
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg">{program.name}</CardTitle>
                      {program.description && (
                        <CardDescription className="mt-2 line-clamp-2">
                          {program.description}
                        </CardDescription>
                      )}
                    </div>
                    <ChevronRight className="h-5 w-5 flex-shrink-0 text-muted-foreground" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="secondary" className="gap-1">
                      <Calendar className="h-3 w-3" />
                      {program.durationWeeks} weeks
                    </Badge>
                    {program.phase && (
                      <Badge variant="outline">{program.phase}</Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Program Builder Dialog */}
        <ProgramBuilderDialog
          program={selectedProgram}
          open={buildDialogOpen}
          onOpenChange={setBuildDialogOpen}
          exercises={exercises || []}
        />
      </div>
    </div>
  );
}

// Program Builder Dialog Component
function ProgramBuilderDialog({
  program,
  open,
  onOpenChange,
  exercises,
}: {
  program: Program | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  exercises: Exercise[];
}) {
  const { toast } = useToast();
  const [weeks, setWeeks] = useState<(ProgramWeek & { days: ProgramDay[] })[]>([]);
  const [selectedWeek, setSelectedWeek] = useState<number | null>(null);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);

  // Fetch program weeks
  const { data: programWeeks } = useQuery<(ProgramWeek & { days: (ProgramDay & { exercises: (ProgramExercise & { exercise: Exercise })[] })[] })[]>({
    queryKey: ['/api/programs', program?.id, 'weeks'],
    enabled: !!program && open,
    queryFn: async () => {
      const res = await fetch(`/api/programs/${program!.id}/weeks`);
      if (!res.ok) throw new Error('Failed to fetch weeks');
      return res.json();
    },
  });

  const addWeekMutation = useMutation({
    mutationFn: async ({ programId, weekNumber }: { programId: string; weekNumber: number }) => {
      return await apiRequest<ProgramWeek>(`/api/programs/${programId}/weeks`, {
        method: "POST",
        body: { weekNumber },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/programs', program?.id, 'weeks'] });
      toast({ title: "Week added successfully" });
    },
  });

  const addDayMutation = useMutation({
    mutationFn: async ({ weekId, dayNumber, name }: { weekId: string; dayNumber: number; name: string }) => {
      return await apiRequest<ProgramDay>(`/api/weeks/${weekId}/days`, {
        method: "POST",
        body: { dayNumber, name },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/programs', program?.id, 'weeks'] });
      toast({ title: "Day added successfully" });
    },
  });

  const addExerciseMutation = useMutation({
    mutationFn: async (data: { dayId: string; exerciseId: string; order: number; sets: number; reps: string; intensity?: string }) => {
      return await apiRequest<ProgramExercise>(`/api/days/${data.dayId}/exercises`, {
        method: "POST",
        body: data,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/programs', program?.id, 'weeks'] });
      toast({ title: "Exercise added successfully" });
    },
  });

  if (!program) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{program.name} - Program Builder</DialogTitle>
          <DialogDescription>
            Build out your program with weeks, days, and exercises
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Add Week Button */}
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Program Structure</h3>
            <Button
              onClick={() => {
                const nextWeek = (programWeeks?.length || 0) + 1;
                if (nextWeek <= program.durationWeeks) {
                  addWeekMutation.mutate({ programId: program.id, weekNumber: nextWeek });
                }
              }}
              disabled={addWeekMutation.isPending || (programWeeks?.length || 0) >= program.durationWeeks}
              size="sm"
              data-testid="button-add-week"
            >
              <Plus className="h-4 w-4 mr-1" />
              Add Week {(programWeeks?.length || 0) + 1}
            </Button>
          </div>

          {/* Weeks List */}
          {!programWeeks || programWeeks.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-8">
                <FileText className="mb-4 h-10 w-10 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  No weeks added yet. Click "Add Week 1" to start building your program.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {programWeeks.map((week) => (
                <Card key={week.id}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base">Week {week.weekNumber}</CardTitle>
                      <Button
                        onClick={() => {
                          const nextDay = (week.days?.length || 0) + 1;
                          addDayMutation.mutate({
                            weekId: week.id,
                            dayNumber: nextDay,
                            name: `Day ${nextDay}`,
                          });
                        }}
                        size="sm"
                        variant="outline"
                        data-testid={`button-add-day-week-${week.weekNumber}`}
                      >
                        <Plus className="h-3 w-3 mr-1" />
                        Add Day
                      </Button>
                    </div>
                  </CardHeader>
                  {week.days && week.days.length > 0 && (
                    <CardContent className="space-y-3">
                      {week.days.map((day) => (
                        <div key={day.id} className="rounded-lg border p-3 space-y-2">
                          <div className="flex items-center justify-between">
                            <p className="font-medium text-sm">{day.name}</p>
                            <Button
                              onClick={() => {
                                setSelectedWeek(week.weekNumber);
                                setSelectedDay(day.dayNumber);
                              }}
                              size="sm"
                              variant="ghost"
                              data-testid={`button-add-exercise-day-${day.dayNumber}`}
                            >
                              <Plus className="h-3 w-3 mr-1" />
                              Add Exercise
                            </Button>
                          </div>
                          {day.exercises && day.exercises.length > 0 && (
                            <div className="space-y-1 text-sm">
                              {day.exercises.map((ex) => (
                                <div
                                  key={ex.id}
                                  className="flex items-center justify-between text-muted-foreground"
                                >
                                  <span>{ex.exercise.name}</span>
                                  <span className="text-xs">
                                    {ex.sets} × {ex.reps} {ex.intensity && `@ ${ex.intensity}`}
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </CardContent>
                  )}
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Add Exercise Dialog */}
        {selectedWeek !== null && selectedDay !== null && (
          <AddExerciseDialog
            programWeeks={programWeeks || []}
            selectedWeek={selectedWeek}
            selectedDay={selectedDay}
            exercises={exercises}
            onClose={() => {
              setSelectedWeek(null);
              setSelectedDay(null);
            }}
            onAdd={(data) => {
              addExerciseMutation.mutate(data);
              setSelectedWeek(null);
              setSelectedDay(null);
            }}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

// Add Exercise Dialog
function AddExerciseDialog({
  programWeeks,
  selectedWeek,
  selectedDay,
  exercises,
  onClose,
  onAdd,
}: {
  programWeeks: any[];
  selectedWeek: number;
  selectedDay: number;
  exercises: Exercise[];
  onClose: () => void;
  onAdd: (data: { dayId: string; exerciseId: string; order: number; sets: number; reps: string; intensity?: string }) => void;
}) {
  const [selectedExercise, setSelectedExercise] = useState("");
  const [sets, setSets] = useState("3");
  const [reps, setReps] = useState("5");
  const [intensity, setIntensity] = useState("");

  const week = programWeeks.find((w) => w.weekNumber === selectedWeek);
  const day = week?.days?.find((d: ProgramDay) => d.dayNumber === selectedDay);

  if (!day) return null;

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Exercise to Week {selectedWeek}, Day {selectedDay}</DialogTitle>
          <DialogDescription>Select an exercise and configure sets/reps</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="exercise">Exercise</Label>
            <Select value={selectedExercise} onValueChange={setSelectedExercise}>
              <SelectTrigger data-testid="select-exercise">
                <SelectValue placeholder="Select exercise..." />
              </SelectTrigger>
              <SelectContent>
                {exercises.map((ex) => (
                  <SelectItem key={ex.id} value={ex.id}>
                    {ex.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="sets">Sets</Label>
              <Input
                id="sets"
                type="number"
                min="1"
                value={sets}
                onChange={(e) => setSets(e.target.value)}
                data-testid="input-sets"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="reps">Reps</Label>
              <Input
                id="reps"
                placeholder="e.g., 5 or 8-12"
                value={reps}
                onChange={(e) => setReps(e.target.value)}
                data-testid="input-reps"
              />
            </div>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="intensity">Intensity (Optional)</Label>
            <Input
              id="intensity"
              placeholder="e.g., 75% or RPE 8"
              value={intensity}
              onChange={(e) => setIntensity(e.target.value)}
              data-testid="input-intensity"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={() => {
              if (!selectedExercise || !sets || !reps) return;
              onAdd({
                dayId: day.id,
                exerciseId: selectedExercise,
                order: (day.exercises?.length || 0) + 1,
                sets: parseInt(sets),
                reps,
                intensity: intensity || undefined,
              });
            }}
            disabled={!selectedExercise || !sets || !reps}
            data-testid="button-submit-exercise"
          >
            Add Exercise
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
