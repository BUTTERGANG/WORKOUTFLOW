import { db } from "./db";
import { exercises } from "@shared/schema";

async function seed() {
  console.log("Seeding database with global exercises...");

  const globalExercises = [
    // Squat Variations
    { name: "Back Squat", category: "squat", muscleGroup: "legs", equipment: "barbell", description: "Traditional barbell back squat" },
    { name: "Front Squat", category: "squat", muscleGroup: "legs", equipment: "barbell", description: "Barbell squat with bar on front of shoulders" },
    { name: "Goblet Squat", category: "squat", muscleGroup: "legs", equipment: "dumbbell", description: "Squat holding dumbbell at chest" },
    { name: "Bulgarian Split Squat", category: "squat", muscleGroup: "legs", equipment: "dumbbell", description: "Single-leg squat with rear foot elevated" },
    { name: "Box Squat", category: "squat", muscleGroup: "legs", equipment: "barbell", description: "Squat to box or bench" },
    
    // Olympic Lifts
    { name: "Clean & Jerk", category: "olympic", muscleGroup: "full_body", equipment: "barbell", description: "Full clean followed by jerk overhead" },
    { name: "Snatch", category: "olympic", muscleGroup: "full_body", equipment: "barbell", description: "Single motion lift from ground to overhead" },
    { name: "Power Clean", category: "olympic", muscleGroup: "full_body", equipment: "barbell", description: "Clean without full squat" },
    { name: "Hang Clean", category: "olympic", muscleGroup: "full_body", equipment: "barbell", description: "Clean starting from hang position" },
    { name: "Push Press", category: "olympic", muscleGroup: "shoulders", equipment: "barbell", description: "Overhead press with leg drive" },
    
    // Press Variations
    { name: "Bench Press", category: "press", muscleGroup: "chest", equipment: "barbell", description: "Horizontal barbell press" },
    { name: "Overhead Press", category: "press", muscleGroup: "shoulders", equipment: "barbell", description: "Standing barbell overhead press" },
    { name: "Incline Bench Press", category: "press", muscleGroup: "chest", equipment: "barbell", description: "Bench press on inclined bench" },
    { name: "Dumbbell Bench Press", category: "press", muscleGroup: "chest", equipment: "dumbbell", description: "Horizontal dumbbell press" },
    { name: "Push-Ups", category: "press", muscleGroup: "chest", equipment: "bodyweight", description: "Bodyweight horizontal press" },
    
    // Pull Variations
    { name: "Deadlift", category: "pull", muscleGroup: "back", equipment: "barbell", description: "Conventional deadlift" },
    { name: "Romanian Deadlift", category: "pull", muscleGroup: "back", equipment: "barbell", description: "Deadlift with straight legs" },
    { name: "Bent Over Row", category: "pull", muscleGroup: "back", equipment: "barbell", description: "Bent over barbell row" },
    { name: "Pull-Ups", category: "pull", muscleGroup: "back", equipment: "bodyweight", description: "Bodyweight vertical pull" },
    { name: "Chin-Ups", category: "pull", muscleGroup: "back", equipment: "bodyweight", description: "Underhand grip pull-ups" },
    { name: "Lat Pulldown", category: "pull", muscleGroup: "back", equipment: "machine", description: "Machine vertical pull" },
    
    // Accessory - Legs
    { name: "Leg Press", category: "accessory", muscleGroup: "legs", equipment: "machine", description: "Machine leg press" },
    { name: "Leg Curl", category: "accessory", muscleGroup: "legs", equipment: "machine", description: "Hamstring curl" },
    { name: "Leg Extension", category: "accessory", muscleGroup: "legs", equipment: "machine", description: "Quad extension" },
    { name: "Calf Raise", category: "accessory", muscleGroup: "legs", equipment: "machine", description: "Standing or seated calf raise" },
    { name: "Lunges", category: "accessory", muscleGroup: "legs", equipment: "dumbbell", description: "Walking or stationary lunges" },
    
    // Accessory - Upper Body
    { name: "Bicep Curl", category: "accessory", muscleGroup: "arms", equipment: "dumbbell", description: "Standard bicep curl" },
    { name: "Tricep Extension", category: "accessory", muscleGroup: "arms", equipment: "dumbbell", description: "Overhead tricep extension" },
    { name: "Lateral Raise", category: "accessory", muscleGroup: "shoulders", equipment: "dumbbell", description: "Side delt raise" },
    { name: "Face Pull", category: "accessory", muscleGroup: "shoulders", equipment: "cable", description: "Cable rear delt exercise" },
    { name: "Dips", category: "accessory", muscleGroup: "chest", equipment: "bodyweight", description: "Bodyweight dip exercise" },
    
    // Core
    { name: "Plank", category: "accessory", muscleGroup: "core", equipment: "bodyweight", description: "Static core hold" },
    { name: "Ab Wheel Rollout", category: "accessory", muscleGroup: "core", equipment: "equipment", description: "Ab wheel exercise" },
    { name: "Hanging Leg Raise", category: "accessory", muscleGroup: "core", equipment: "bodyweight", description: "Hanging knee or leg raise" },
  ];

  try {
    let inserted = 0;
    let skipped = 0;

    for (const exercise of globalExercises) {
      const result = await db.insert(exercises).values({
        ...exercise,
        organizationId: null, // Global exercise
        createdBy: null,
      }).onConflictDoNothing().returning();
      
      if (result.length > 0) {
        inserted++;
      } else {
        skipped++;
      }
    }
    
    console.log(`✅ Successfully seeded ${inserted} new exercises`);
    if (skipped > 0) {
      console.log(`ℹ️  Skipped ${skipped} existing exercises`);
    }
    console.log(`📊 Total exercises in library: ${globalExercises.length}`);
  } catch (error) {
    console.error("❌ Error seeding exercises:", error);
    throw error;
  }

  process.exit(0);
}

seed();
