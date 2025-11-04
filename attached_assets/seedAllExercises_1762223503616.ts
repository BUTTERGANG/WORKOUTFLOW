import { db } from './db';
import { exercises } from '../shared/schema';
import { sql } from 'drizzle-orm';
import { logger } from './logger';

// All 193 weightlifting exercises
const ALL_EXERCISES = [
  // Clean exercises
  { name: "2in Blocks: Clean", category: "Clean", muscleGroup: "Variation", equipment: "barbell" },
  { name: "3-Position (Bottoms-Up) Clean", category: "Clean", muscleGroup: "Variation", equipment: "barbell" },
  { name: "3-Position (Top-Down) Clean", category: "Clean", muscleGroup: "Variation", equipment: "barbell" },
  { name: "3-Position Pause Clean Pull", category: "Clean", muscleGroup: "Pull", equipment: "barbell" },
  { name: "Above Knee Hang Clean", category: "Clean", muscleGroup: "Variation", equipment: "barbell" },
  { name: "Below Knee Hang Clean", category: "Clean", muscleGroup: "Variation", equipment: "barbell" },
  { name: "Blocks Above Knee: Clean", category: "Clean", muscleGroup: "Variation", equipment: "barbell" },
  { name: "Blocks Mid-Shin: Clean", category: "Clean", muscleGroup: "Variation", equipment: "barbell" },
  { name: "Clean and Jerk", category: "Clean", muscleGroup: "Competition", equipment: "barbell" },
  { name: "Clean High Pull", category: "Clean", muscleGroup: "Pull", equipment: "barbell" },
  { name: "Clean Pull to Explode", category: "Clean", muscleGroup: "Pull", equipment: "barbell" },
  { name: "Clean w/ Pause Above Knee", category: "Clean", muscleGroup: "Variation", equipment: "barbell" },
  { name: "Clean w/ Pause AK", category: "Clean", muscleGroup: "Variation", equipment: "barbell" },
  { name: "Clean-Jerk", category: "Clean", muscleGroup: "Accessory", equipment: "barbell" },
  { name: "Deficit Clean", category: "Clean", muscleGroup: "Variation", equipment: "barbell" },
  { name: "Deficit Clean Pull", category: "Clean", muscleGroup: "Pull", equipment: "barbell" },
  { name: "Deficit Clean Pull to Above Knee", category: "Clean", muscleGroup: "Pull", equipment: "barbell" },
  { name: "Floating Clean", category: "Clean", muscleGroup: "Variation", equipment: "barbell" },
  { name: "Hip (Midthigh) Clean", category: "Clean", muscleGroup: "Variation", equipment: "barbell" },
  { name: "Hip Muscle Clean", category: "Clean", muscleGroup: "Accessory", equipment: "barbell" },
  { name: "Muscle Clean", category: "Clean", muscleGroup: "Accessory", equipment: "barbell" },
  { name: "No Contact Clean", category: "Clean", muscleGroup: "Variation", equipment: "barbell" },
  { name: "No Hook No Foot Clean", category: "Clean", muscleGroup: "Variation", equipment: "barbell" },
  { name: "No Hook No Foot No Contact Clean", category: "Clean", muscleGroup: "Variation", equipment: "barbell" },
  { name: "Power Clean", category: "Clean", muscleGroup: "Variation", equipment: "barbell" },
  { name: "Single Legow Pull Clean", category: "Clean", muscleGroup: "Variation", equipment: "barbell" },
  { name: "Tall Clean", category: "Clean", muscleGroup: "Accessory", equipment: "barbell" },
  { name: "Yo-Yo Clean", category: "Clean", muscleGroup: "Variation", equipment: "barbell" },
  { name: "Yo-Yo Clean Pull", category: "Clean", muscleGroup: "Pull", equipment: "barbell" },
  
  // Snatch exercises
  { name: "2in Blocks: Snatch", category: "Snatch", muscleGroup: "Variation", equipment: "barbell" },
  { name: "3-Position (Bottoms-Up) Snatch", category: "Snatch", muscleGroup: "Variation", equipment: "barbell" },
  { name: "3-Position (Top-Down) Snatch", category: "Snatch", muscleGroup: "Variation", equipment: "barbell" },
  { name: "3-Position Pause Snatch Pull", category: "Snatch", muscleGroup: "Pull", equipment: "barbell" },
  { name: "Above Knee Hang Snatch", category: "Snatch", muscleGroup: "Variation", equipment: "barbell" },
  { name: "Below Knee Hang Snatch", category: "Snatch", muscleGroup: "Variation", equipment: "barbell" },
  { name: "Blocks Above Knee: Snatch", category: "Snatch", muscleGroup: "Variation", equipment: "barbell" },
  { name: "Blocks Mid-Shin: Snatch", category: "Snatch", muscleGroup: "Variation", equipment: "barbell" },
  { name: "Deficit Snatch", category: "Snatch", muscleGroup: "Variation", equipment: "barbell" },
  { name: "Deficit Snatch Pull", category: "Snatch", muscleGroup: "Pull", equipment: "barbell" },
  { name: "Drop Snatch", category: "Snatch", muscleGroup: "Accessory", equipment: "barbell" },
  { name: "Flat Footed Snatch Pull", category: "Snatch", muscleGroup: "Pull", equipment: "barbell" },
  { name: "Floating Snatch", category: "Snatch", muscleGroup: "Variation", equipment: "barbell" },
  { name: "Hip Muscle Snatch", category: "Snatch", muscleGroup: "Accessory", equipment: "barbell" },
  { name: "Hip Snatch", category: "Snatch", muscleGroup: "Variation", equipment: "barbell" },
  { name: "Muscle Snatch", category: "Snatch", muscleGroup: "Accessory", equipment: "barbell" },
  { name: "No Contact Snatch", category: "Snatch", muscleGroup: "Variation", equipment: "barbell" },
  { name: "No Hook No Foot No Contact Snatch", category: "Snatch", muscleGroup: "Variation", equipment: "barbell" },
  { name: "No Hook No Foot Snatch", category: "Snatch", muscleGroup: "Variation", equipment: "barbell" },
  { name: "Overhead Squat", category: "Snatch", muscleGroup: "Accessory", equipment: "barbell" },
  { name: "Power Snatch", category: "Snatch", muscleGroup: "Variation", equipment: "barbell" },
  { name: "Slow Pull Snatch", category: "Snatch", muscleGroup: "Variation", equipment: "barbell" },
  { name: "Snatch", category: "Snatch", muscleGroup: "Competition", equipment: "barbell" },
  { name: "Snatch Balance", category: "Snatch", muscleGroup: "Accessory", equipment: "barbell" },
  { name: "Snatch Grip RDL", category: "Snatch", muscleGroup: "Pull", equipment: "barbell" },
  { name: "Snatch Grip Sotts Press", category: "Snatch", muscleGroup: "Accessory", equipment: "barbell" },
  { name: "Snatch High Pull", category: "Snatch", muscleGroup: "Pull", equipment: "barbell" },
  { name: "Snatch Panda Pull", category: "Snatch", muscleGroup: "Pull", equipment: "barbell" },
  { name: "Snatch Pull to Explode", category: "Snatch", muscleGroup: "Pull", equipment: "barbell" },
  { name: "Snatch Pull to Height", category: "Snatch", muscleGroup: "Pull", equipment: "barbell" },
  { name: "Snatch Pull to Hold", category: "Snatch", muscleGroup: "Pull", equipment: "barbell" },
  { name: "Snatch Pull w/ Pause Above Knee", category: "Snatch", muscleGroup: "Pull", equipment: "barbell" },
  { name: "Snatch Push Press", category: "Snatch", muscleGroup: "Accessory", equipment: "barbell" },
  { name: "Snatch Sotts Press", category: "Snatch", muscleGroup: "Accessory", equipment: "barbell" },
  { name: "Snatch w/ Pause Above Knee", category: "Snatch", muscleGroup: "Variation", equipment: "barbell" },
  { name: "Snatch w/ Pause AK", category: "Snatch", muscleGroup: "Variation", equipment: "barbell" },
  { name: "Tall Snatch", category: "Snatch", muscleGroup: "Accessory", equipment: "barbell" },
  { name: "Yo-Yo Snatch", category: "Snatch", muscleGroup: "Variation", equipment: "barbell" },
  { name: "Yo-Yo Snatch Pull", category: "Snatch", muscleGroup: "Pull", equipment: "barbell" },
  
  // Jerk exercises
  { name: "BTN Jerk in Split", category: "Jerk", muscleGroup: "Accessory", equipment: "barbell" },
  { name: "BTN Power Jerk", category: "Jerk", muscleGroup: "Variation", equipment: "barbell" },
  { name: "BTN Split Jerk", category: "Jerk", muscleGroup: "Variation", equipment: "barbell" },
  { name: "Jerk Dip", category: "Jerk", muscleGroup: "Accessory", equipment: "barbell" },
  { name: "Jerk Dip to Split", category: "Jerk", muscleGroup: "Accessory", equipment: "barbell" },
  { name: "Jerk Drive", category: "Jerk", muscleGroup: "Accessory", equipment: "barbell" },
  { name: "Jerk Grip OHS", category: "Jerk", muscleGroup: "Accessory", equipment: "barbell" },
  { name: "Jerk in Split", category: "Jerk", muscleGroup: "Accessory", equipment: "barbell" },
  { name: "Jerk Recovery", category: "Jerk", muscleGroup: "Accessory", equipment: "barbell" },
  { name: "Jerk w/ Pause in Dip", category: "Jerk", muscleGroup: "Variation", equipment: "barbell" },
  { name: "Jerk w/ Pause in Split", category: "Jerk", muscleGroup: "Variation", equipment: "barbell" },
  { name: "On Toe Jerk", category: "Jerk", muscleGroup: "Accessory", equipment: "barbell" },
  { name: "Power Jerk", category: "Jerk", muscleGroup: "Variation", equipment: "barbell" },
  { name: "Push Jerk", category: "Jerk", muscleGroup: "Variation", equipment: "barbell" },
  { name: "Push Press", category: "Jerk", muscleGroup: "Accessory", equipment: "barbell" },
  { name: "Sotts Press", category: "Jerk", muscleGroup: "Accessory", equipment: "barbell" },
  { name: "Squat Jerk", category: "Jerk", muscleGroup: "Variation", equipment: "barbell" },
  { name: "Tall Split Jerk", category: "Jerk", muscleGroup: "Accessory", equipment: "barbell" },
  { name: "Touch and Go Power Jerk", category: "Jerk", muscleGroup: "Variation", equipment: "barbell" },
  { name: "Touch and Go Split Jerk", category: "Jerk", muscleGroup: "Variation", equipment: "barbell" },

  // Squat exercises
  { name: "Back Squat", category: "Squat", muscleGroup: "Legs", equipment: "barbell" },
  { name: "Cluster Back Squat", category: "Squat", muscleGroup: "Legs", equipment: "barbell" },
  { name: "Front Squat", category: "Squat", muscleGroup: "Legs", equipment: "barbell" },
  { name: "No Lockout Back Squat", category: "Squat", muscleGroup: "Legs", equipment: "barbell" },
  { name: "No Lockout Front Squat", category: "Squat", muscleGroup: "Legs", equipment: "barbell" },
  { name: "Safety Bar Squat", category: "Squat", muscleGroup: "Legs", equipment: "barbell" },
  { name: "Transformer Bar Squat", category: "Squat", muscleGroup: "Legs", equipment: "barbell" },
  { name: "Zercher Squat", category: "Squat", muscleGroup: "Legs", equipment: "barbell" },
  
  // Plyometric exercises - Lower
  { name: "Adductor Catches", category: "Plyo", muscleGroup: "Lower", equipment: "bodyweight" },
  { name: "Adductor Hip Shift", category: "Plyo", muscleGroup: "Lower", equipment: "bodyweight" },
  { name: "Alternating KB Drop Lunge", category: "Plyo", muscleGroup: "Lower", equipment: "kettlebell" },
  { name: "BB CMJ", category: "Plyo", muscleGroup: "Lower", equipment: "barbell" },
  { name: "BB Pogos", category: "Plyo", muscleGroup: "Lower", equipment: "barbell" },
  { name: "Bounds", category: "Plyo", muscleGroup: "Lower", equipment: "bodyweight" },
  { name: "Broad Jump to Vertical Jump", category: "Plyo", muscleGroup: "Lower", equipment: "bodyweight" },
  { name: "Continuous Single Leg Rocket Jump", category: "Plyo", muscleGroup: "Lower", equipment: "bodyweight" },
  { name: "Deep Bounds", category: "Plyo", muscleGroup: "Lower", equipment: "bodyweight" },
  { name: "Deep Leap Twists", category: "Plyo", muscleGroup: "Lower", equipment: "bodyweight" },
  { name: "Deep Leaps", category: "Plyo", muscleGroup: "Lower", equipment: "bodyweight" },
  { name: "Deep SS Leaps", category: "Plyo", muscleGroup: "Lower", equipment: "bodyweight" },
  { name: "Depth Drop", category: "Plyo", muscleGroup: "Lower", equipment: "bodyweight" },
  { name: "Depth Drop to Box Jump", category: "Plyo", muscleGroup: "Lower", equipment: "bodyweight" },
  { name: "Depth Jump", category: "Plyo", muscleGroup: "Lower", equipment: "bodyweight" },
  { name: "Drop Catch Back Squat", category: "Plyo", muscleGroup: "Lower", equipment: "barbell" },
  { name: "Drop Catch RDL", category: "Plyo", muscleGroup: "Lower", equipment: "barbell" },
  { name: "Hamstring Catch", category: "Plyo", muscleGroup: "Lower", equipment: "bodyweight" },
  { name: "Lateral Hop to Single Leg Vertical Jump", category: "Plyo", muscleGroup: "Lower", equipment: "bodyweight" },
  { name: "Lateral Hurdle Hops", category: "Plyo", muscleGroup: "Lower", equipment: "bodyweight" },
  { name: "OHS Deep Leaps", category: "Plyo", muscleGroup: "Lower", equipment: "barbell" },
  { name: "Partner Leg Throws", category: "Plyo", muscleGroup: "Lower", equipment: "bodyweight" },
  { name: "Plyo GHR", category: "Plyo", muscleGroup: "Lower", equipment: "bodyweight" },
  { name: "Pogo Hops", category: "Plyo", muscleGroup: "Lower", equipment: "bodyweight" },
  { name: "Scissor Bounds", category: "Plyo", muscleGroup: "Lower", equipment: "bodyweight" },
  { name: "Seated Broad Jump", category: "Plyo", muscleGroup: "Lower", equipment: "bodyweight" },
  { name: "Shin Hop", category: "Plyo", muscleGroup: "Lower", equipment: "bodyweight" },
  { name: "Shin Hop Box Jump", category: "Plyo", muscleGroup: "Lower", equipment: "bodyweight" },
  { name: "Short Lever Rotations", category: "Plyo", muscleGroup: "Lower", equipment: "bodyweight" },
  { name: "Single Leg Bound to Single Leg Vertical Jump", category: "Plyo", muscleGroup: "Lower", equipment: "bodyweight" },
  { name: "Single Leg Bounds", category: "Plyo", muscleGroup: "Lower", equipment: "bodyweight" },
  { name: "Single Leg Hamstring Catch", category: "Plyo", muscleGroup: "Lower", equipment: "bodyweight" },
  { name: "Single Leg Reactive Broad Jump", category: "Plyo", muscleGroup: "Lower", equipment: "bodyweight" },
  { name: "Single Leg Rocket Jumps", category: "Plyo", muscleGroup: "Lower", equipment: "bodyweight" },
  { name: "Split Jerk Deep Leaps", category: "Plyo", muscleGroup: "Lower", equipment: "bodyweight" },
  { name: "Swan Leap", category: "Plyo", muscleGroup: "Lower", equipment: "bodyweight" },
  { name: "Tuck Jump", category: "Plyo", muscleGroup: "Lower", equipment: "bodyweight" },
  { name: "Weighted Swan Leap", category: "Plyo", muscleGroup: "Lower", equipment: "dumbbell" },
  { name: "Wide to Narrow Deep Leaps", category: "Plyo", muscleGroup: "Lower", equipment: "bodyweight" },

  // Plyometric exercises - Upper
  { name: "Banded Baseball Swings", category: "Plyo", muscleGroup: "Upper", equipment: "resistance band" },
  { name: "Banded SA Fly Spasms", category: "Plyo", muscleGroup: "Upper", equipment: "resistance band" },
  { name: "Banded SA Pulldown Spasms", category: "Plyo", muscleGroup: "Upper", equipment: "resistance band" },
  { name: "Banded Wood Chop Spasms", category: "Plyo", muscleGroup: "Upper", equipment: "resistance band" },
  { name: "Banded Y Spasms", category: "Plyo", muscleGroup: "Upper", equipment: "resistance band" },
  { name: "Bench Press Throws", category: "Plyo", muscleGroup: "Upper", equipment: "barbell" },
  { name: "Depth Drop Push-Up", category: "Plyo", muscleGroup: "Upper", equipment: "bodyweight" },
  { name: "Depth Jump Push-Up", category: "Plyo", muscleGroup: "Upper", equipment: "bodyweight" },
  { name: "Drop-Catch Bench Press", category: "Plyo", muscleGroup: "Upper", equipment: "barbell" },
  { name: "Drop-Catch Push-Up", category: "Plyo", muscleGroup: "Upper", equipment: "bodyweight" },
  { name: "Explosive Kip Swing", category: "Plyo", muscleGroup: "Upper", equipment: "bodyweight" },
  { name: "Long Lever Rotations", category: "Plyo", muscleGroup: "Upper", equipment: "bodyweight" },
  { name: "MB Chest Pass", category: "Plyo", muscleGroup: "Upper", equipment: "medicine ball" },
  { name: "MB Drop-Catch Vertical Toss", category: "Plyo", muscleGroup: "Upper", equipment: "medicine ball" },
  { name: "MB Rotational Slam", category: "Plyo", muscleGroup: "Upper", equipment: "medicine ball" },
  { name: "MB Shot Put Throw", category: "Plyo", muscleGroup: "Upper", equipment: "medicine ball" },
  { name: "MB Slam", category: "Plyo", muscleGroup: "Upper", equipment: "medicine ball" },
  { name: "MB Vertical Toss", category: "Plyo", muscleGroup: "Upper", equipment: "medicine ball" },
  { name: "OH MB Taps", category: "Plyo", muscleGroup: "Upper", equipment: "medicine ball" },
  { name: "Plyo Push-Up", category: "Plyo", muscleGroup: "Upper", equipment: "bodyweight" },
  { name: "Push-Up Plate Hops", category: "Plyo", muscleGroup: "Upper", equipment: "plate" },
  { name: "SS MB Slams", category: "Plyo", muscleGroup: "Upper", equipment: "medicine ball" },
  { name: "Supine MB Chest Pass", category: "Plyo", muscleGroup: "Upper", equipment: "medicine ball" },
  
  // Accessory - Lower
  { name: "Box Jump", category: "Accessory", muscleGroup: "Lower", equipment: "bodyweight" },
  { name: "Copenhagen Lifts", category: "Accessory", muscleGroup: "Lower", equipment: "bodyweight" },
  { name: "Crab Walk", category: "Accessory", muscleGroup: "Lower", equipment: "bodyweight" },
  { name: "HK Hip Flexor Lifts", category: "Accessory", muscleGroup: "Lower", equipment: "bodyweight" },
  { name: "Inchworm to Cobra", category: "Accessory", muscleGroup: "Lower", equipment: "bodyweight" },
  { name: "Spiderman Crawl", category: "Accessory", muscleGroup: "Lower", equipment: "bodyweight" },
  { name: "Spinal Reaches", category: "Accessory", muscleGroup: "Lower", equipment: "bodyweight" },
  { name: "Standing BB Rotations", category: "Accessory", muscleGroup: "Lower", equipment: "barbell" },

  // Accessory - Upper
  { name: "BB Wrist Roller", category: "Accessory", muscleGroup: "Upper", equipment: "barbell" },
  { name: "DB Arm Bar", category: "Accessory", muscleGroup: "Upper", equipment: "dumbbell" },
  { name: "DB External Rotation", category: "Accessory", muscleGroup: "Upper", equipment: "dumbbell" },
  { name: "HK Wall Opener", category: "Accessory", muscleGroup: "Upper", equipment: "bodyweight" },
  { name: "OH Side Bends", category: "Accessory", muscleGroup: "Upper", equipment: "dumbbell" },
  { name: "Pike Crawl", category: "Accessory", muscleGroup: "Upper", equipment: "bodyweight" },
  { name: "Plate Pinch Farmer's Carry", category: "Accessory", muscleGroup: "Upper", equipment: "plate" },
  { name: "Plate Spine Circles", category: "Accessory", muscleGroup: "Upper", equipment: "plate" },
  { name: "Reverse Plank Press Up", category: "Accessory", muscleGroup: "Upper", equipment: "bodyweight" },
  { name: "Rotational Kettlebell Swings", category: "Accessory", muscleGroup: "Upper", equipment: "kettlebell" },
  { name: "Wrist Roller", category: "Accessory", muscleGroup: "Upper", equipment: "dumbbell" },

  // Isometric - Lower
  { name: "Adductor Squeeze Iso", category: "Isometric", muscleGroup: "Lower", equipment: "bodyweight" },
  { name: "Bulgarian SS Iso", category: "Isometric", muscleGroup: "Lower", equipment: "bodyweight" },
  { name: "Copenhagen Plank", category: "Isometric", muscleGroup: "Lower", equipment: "bodyweight" },
  { name: "GHR 45° Iso", category: "Isometric", muscleGroup: "Lower", equipment: "bodyweight" },
  { name: "Side Lunge Iso", category: "Isometric", muscleGroup: "Lower", equipment: "bodyweight" },
  { name: "Single Arm Plank", category: "Isometric", muscleGroup: "Lower", equipment: "bodyweight" },
  { name: "Single Leg Calf Overcoming Iso", category: "Isometric", muscleGroup: "Lower", equipment: "bodyweight" },
  { name: "Sorenson Hold", category: "Isometric", muscleGroup: "Lower", equipment: "bodyweight" },
  { name: "Split Squat Iso", category: "Isometric", muscleGroup: "Lower", equipment: "bodyweight" },
  { name: "Straight Single Leg Glute Bridge Iso", category: "Isometric", muscleGroup: "Lower", equipment: "bodyweight" },

  // Isometric - Upper
  { name: "4-way Neck Bridge", category: "Isometric", muscleGroup: "Upper", equipment: "bodyweight" },
  { name: "Dip Iso", category: "Isometric", muscleGroup: "Upper", equipment: "bodyweight" },
  { name: "Prone Y Iso", category: "Isometric", muscleGroup: "Upper", equipment: "bodyweight" },
  { name: "Push-Up Iso", category: "Isometric", muscleGroup: "Upper", equipment: "bodyweight" },
  { name: "Reverse Shrug Iso", category: "Isometric", muscleGroup: "Upper", equipment: "bodyweight" },
];

async function seedAllExercises() {
  logger.logSeed('Starting comprehensive exercise seed', { total: ALL_EXERCISES.length });

  let inserted = 0;
  let skipped = 0;

  try {
    for (const exercise of ALL_EXERCISES) {
      try {
        // Check if exercise already exists
        const existing = await db.query.exercises.findFirst({
          where: (exercises, { eq }) => eq(exercises.name, exercise.name),
        });

        if (existing) {
          logger.debug(`Skipping exercise: ${exercise.name} (already exists)`);
          skipped++;
          continue;
        }

        // Insert new exercise
        await db.insert(exercises).values({
          name: exercise.name,
          category: exercise.category,
          muscleGroup: exercise.muscleGroup,
          equipment: exercise.equipment,
          organizationId: null, // Global exercise
          createdBy: null,
        });

        logger.debug(`Inserted exercise: ${exercise.name}`);
        inserted++;
      } catch (error) {
        logger.error(`Error inserting exercise: ${exercise.name}`, error);
      }
    }

    logger.logSeed('Comprehensive exercise seed complete', { inserted, skipped, total: ALL_EXERCISES.length });

  } catch (error) {
    logger.error('Seed failed', error);
    throw error;
  }
}

// Run the seed
seedAllExercises()
  .then(() => {
    logger.info('Exercise seed completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    logger.error('Fatal seed error', error);
    process.exit(1);
  });
