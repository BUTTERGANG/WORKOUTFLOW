import { db } from './db';
import { exercises } from '../shared/schema';
import { sql } from 'drizzle-orm';

// All 193 weightlifting exercises
const ALL_EXERCISES = [
  // Clean exercises
  { name: "2in Blocks: Clean", category: "Clean", muscleGroup: "Variation" },
  { name: "3-Position (Bottoms-Up) Clean", category: "Clean", muscleGroup: "Variation" },
  { name: "3-Position (Top-Down) Clean", category: "Clean", muscleGroup: "Variation" },
  { name: "3-Position Pause Clean Pull", category: "Clean", muscleGroup: "Pull" },
  { name: "Above Knee Hang Clean", category: "Clean", muscleGroup: "Variation" },
  { name: "Below Knee Hang Clean", category: "Clean", muscleGroup: "Variation" },
  { name: "Blocks Above Knee: Clean", category: "Clean", muscleGroup: "Variation" },
  { name: "Blocks Mid-Shin: Clean", category: "Clean", muscleGroup: "Variation" },
  { name: "Clean and Jerk", category: "Clean", muscleGroup: "Competition" },
  { name: "Clean High Pull", category: "Clean", muscleGroup: "Pull" },
  { name: "Clean Pull to Explode", category: "Clean", muscleGroup: "Pull" },
  { name: "Clean w/ Pause Above Knee", category: "Clean", muscleGroup: "Variation" },
  { name: "Clean w/ Pause AK", category: "Clean", muscleGroup: "Variation" },
  { name: "Clean-Jerk", category: "Clean", muscleGroup: "Accessory" },
  { name: "Deficit Clean", category: "Clean", muscleGroup: "Variation" },
  { name: "Deficit Clean Pull", category: "Clean", muscleGroup: "Pull" },
  { name: "Deficit Clean Pull to Above Knee", category: "Clean", muscleGroup: "Pull" },
  { name: "Floating Clean", category: "Clean", muscleGroup: "Variation" },
  { name: "Hip (Midthigh) Clean", category: "Clean", muscleGroup: "Variation" },
  { name: "Hip Muscle Clean", category: "Clean", muscleGroup: "Accessory" },
  { name: "Muscle Clean", category: "Clean", muscleGroup: "Accessory" },
  { name: "No Contact Clean", category: "Clean", muscleGroup: "Variation" },
  { name: "No Hook No Foot Clean", category: "Clean", muscleGroup: "Variation" },
  { name: "No Hook No Foot No Contact Clean", category: "Clean", muscleGroup: "Variation" },
  { name: "Power Clean", category: "Clean", muscleGroup: "Variation" },
  { name: "Single Legow Pull Clean", category: "Clean", muscleGroup: "Variation" },
  { name: "Tall Clean", category: "Clean", muscleGroup: "Accessory" },
  { name: "Yo-Yo Clean", category: "Clean", muscleGroup: "Variation" },
  { name: "Yo-Yo Clean Pull", category: "Clean", muscleGroup: "Pull" },
  
  // Snatch exercises
  { name: "2in Blocks: Snatch", category: "Snatch", muscleGroup: "Variation" },
  { name: "3-Position (Bottoms-Up) Snatch", category: "Snatch", muscleGroup: "Variation" },
  { name: "3-Position (Top-Down) Snatch", category: "Snatch", muscleGroup: "Variation" },
  { name: "3-Position Pause Snatch Pull", category: "Snatch", muscleGroup: "Pull" },
  { name: "Above Knee Hang Snatch", category: "Snatch", muscleGroup: "Variation" },
  { name: "Below Knee Hang Snatch", category: "Snatch", muscleGroup: "Variation" },
  { name: "Blocks Above Knee: Snatch", category: "Snatch", muscleGroup: "Variation" },
  { name: "Blocks Mid-Shin: Snatch", category: "Snatch", muscleGroup: "Variation" },
  { name: "Deficit Snatch", category: "Snatch", muscleGroup: "Variation" },
  { name: "Deficit Snatch Pull", category: "Snatch", muscleGroup: "Pull" },
  { name: "Drop Snatch", category: "Snatch", muscleGroup: "Accessory" },
  { name: "Flat Footed Snatch Pull", category: "Snatch", muscleGroup: "Pull" },
  { name: "Floating Snatch", category: "Snatch", muscleGroup: "Variation" },
  { name: "Hip Muscle Snatch", category: "Snatch", muscleGroup: "Accessory" },
  { name: "Hip Snatch", category: "Snatch", muscleGroup: "Variation" },
  { name: "Muscle Snatch", category: "Snatch", muscleGroup: "Accessory" },
  { name: "No Contact Snatch", category: "Snatch", muscleGroup: "Variation" },
  { name: "No Hook No Foot No Contact Snatch", category: "Snatch", muscleGroup: "Variation" },
  { name: "No Hook No Foot Snatch", category: "Snatch", muscleGroup: "Variation" },
  { name: "Overhead Squat", category: "Snatch", muscleGroup: "Accessory" },
  { name: "Power Snatch", category: "Snatch", muscleGroup: "Variation" },
  { name: "Slow Pull Snatch", category: "Snatch", muscleGroup: "Variation" },
  { name: "Snatch", category: "Snatch", muscleGroup: "Competition" },
  { name: "Snatch Balance", category: "Snatch", muscleGroup: "Accessory" },
  { name: "Snatch Grip RDL", category: "Snatch", muscleGroup: "Pull" },
  { name: "Snatch Grip Sotts Press", category: "Snatch", muscleGroup: "Accessory" },
  { name: "Snatch High Pull", category: "Snatch", muscleGroup: "Pull" },
  { name: "Snatch Panda Pull", category: "Snatch", muscleGroup: "Pull" },
  { name: "Snatch Pull to Explode", category: "Snatch", muscleGroup: "Pull" },
  { name: "Snatch Pull to Height", category: "Snatch", muscleGroup: "Pull" },
  { name: "Snatch Pull to Hold", category: "Snatch", muscleGroup: "Pull" },
  { name: "Snatch Pull w/ Pause Above Knee", category: "Snatch", muscleGroup: "Pull" },
  { name: "Snatch Push Press", category: "Snatch", muscleGroup: "Accessory" },
  { name: "Snatch Sotts Press", category: "Snatch", muscleGroup: "Accessory" },
  { name: "Snatch w/ Pause Above Knee", category: "Snatch", muscleGroup: "Variation" },
  { name: "Snatch w/ Pause AK", category: "Snatch", muscleGroup: "Variation" },
  { name: "Tall Snatch", category: "Snatch", muscleGroup: "Accessory" },
  { name: "Yo-Yo Snatch", category: "Snatch", muscleGroup: "Variation" },
  { name: "Yo-Yo Snatch Pull", category: "Snatch", muscleGroup: "Pull" },
  
  // Jerk exercises
  { name: "BTN Jerk in Split", category: "Jerk", muscleGroup: "Accessory" },
  { name: "BTN Power Jerk", category: "Jerk", muscleGroup: "Variation" },
  { name: "BTN Split Jerk", category: "Jerk", muscleGroup: "Variation" },
  { name: "Jerk Dip", category: "Jerk", muscleGroup: "Accessory" },
  { name: "Jerk Dip to Split", category: "Jerk", muscleGroup: "Accessory" },
  { name: "Jerk Drive", category: "Jerk", muscleGroup: "Accessory" },
  { name: "Jerk Grip OHS", category: "Jerk", muscleGroup: "Accessory" },
  { name: "Jerk in Split", category: "Jerk", muscleGroup: "Accessory" },
  { name: "Jerk Recovery", category: "Jerk", muscleGroup: "Accessory" },
  { name: "Jerk w/ Pause in Dip", category: "Jerk", muscleGroup: "Variation" },
  { name: "Jerk w/ Pause in Split", category: "Jerk", muscleGroup: "Variation" },
  { name: "On Toe Jerk", category: "Jerk", muscleGroup: "Accessory" },
  { name: "Power Jerk", category: "Jerk", muscleGroup: "Variation" },
  { name: "Push Jerk", category: "Jerk", muscleGroup: "Variation" },
  { name: "Push Press", category: "Jerk", muscleGroup: "Accessory" },
  { name: "Sotts Press", category: "Jerk", muscleGroup: "Accessory" },
  { name: "Squat Jerk", category: "Jerk", muscleGroup: "Variation" },
  { name: "Tall Split Jerk", category: "Jerk", muscleGroup: "Accessory" },
  { name: "Touch and Go Power Jerk", category: "Jerk", muscleGroup: "Variation" },
  { name: "Touch and Go Split Jerk", category: "Jerk", muscleGroup: "Variation" },
  
  // Squat exercises
  { name: "Back Squat", category: "Squat", muscleGroup: "Legs" },
  { name: "Cluster Back Squat", category: "Squat", muscleGroup: "Legs" },
  { name: "Front Squat", category: "Squat", muscleGroup: "Legs" },
  { name: "No Lockout Back Squat", category: "Squat", muscleGroup: "Legs" },
  { name: "No Lockout Front Squat", category: "Squat", muscleGroup: "Legs" },
  { name: "Safety Bar Squat", category: "Squat", muscleGroup: "Legs" },
  { name: "Transformer Bar Squat", category: "Squat", muscleGroup: "Legs" },
  { name: "Zercher Squat", category: "Squat", muscleGroup: "Legs" },
  
  // Plyometric exercises - Lower
  { name: "Adductor Catches", category: "Plyo", muscleGroup: "Lower" },
  { name: "Adductor Hip Shift", category: "Plyo", muscleGroup: "Lower" },
  { name: "Alternating KB Drop Lunge", category: "Plyo", muscleGroup: "Lower" },
  { name: "BB CMJ", category: "Plyo", muscleGroup: "Lower" },
  { name: "BB Pogos", category: "Plyo", muscleGroup: "Lower" },
  { name: "Bounds", category: "Plyo", muscleGroup: "Lower" },
  { name: "Broad Jump to Vertical Jump", category: "Plyo", muscleGroup: "Lower" },
  { name: "Continuous Single Leg Rocket Jump", category: "Plyo", muscleGroup: "Lower" },
  { name: "Deep Bounds", category: "Plyo", muscleGroup: "Lower" },
  { name: "Deep Leap Twists", category: "Plyo", muscleGroup: "Lower" },
  { name: "Deep Leaps", category: "Plyo", muscleGroup: "Lower" },
  { name: "Deep SS Leaps", category: "Plyo", muscleGroup: "Lower" },
  { name: "Depth Drop", category: "Plyo", muscleGroup: "Lower" },
  { name: "Depth Drop to Box Jump", category: "Plyo", muscleGroup: "Lower" },
  { name: "Depth Jump", category: "Plyo", muscleGroup: "Lower" },
  { name: "Drop Catch Back Squat", category: "Plyo", muscleGroup: "Lower" },
  { name: "Drop Catch RDL", category: "Plyo", muscleGroup: "Lower" },
  { name: "Hamstring Catch", category: "Plyo", muscleGroup: "Lower" },
  { name: "Lateral Hop to Single Leg Vertical Jump", category: "Plyo", muscleGroup: "Lower" },
  { name: "Lateral Hurdle Hops", category: "Plyo", muscleGroup: "Lower" },
  { name: "OHS Deep Leaps", category: "Plyo", muscleGroup: "Lower" },
  { name: "Partner Leg Throws", category: "Plyo", muscleGroup: "Lower" },
  { name: "Plyo GHR", category: "Plyo", muscleGroup: "Lower" },
  { name: "Pogo Hops", category: "Plyo", muscleGroup: "Lower" },
  { name: "Scissor Bounds", category: "Plyo", muscleGroup: "Lower" },
  { name: "Seated Broad Jump", category: "Plyo", muscleGroup: "Lower" },
  { name: "Shin Hop", category: "Plyo", muscleGroup: "Lower" },
  { name: "Shin Hop Box Jump", category: "Plyo", muscleGroup: "Lower" },
  { name: "Short Lever Rotations", category: "Plyo", muscleGroup: "Lower" },
  { name: "Single Leg Bound to Single Leg Vertical Jump", category: "Plyo", muscleGroup: "Lower" },
  { name: "Single Leg Bounds", category: "Plyo", muscleGroup: "Lower" },
  { name: "Single Leg Hamstring Catch", category: "Plyo", muscleGroup: "Lower" },
  { name: "Single Leg Reactive Broad Jump", category: "Plyo", muscleGroup: "Lower" },
  { name: "Single Leg Rocket Jumps", category: "Plyo", muscleGroup: "Lower" },
  { name: "Split Jerk Deep Leaps", category: "Plyo", muscleGroup: "Lower" },
  { name: "Swan Leap", category: "Plyo", muscleGroup: "Lower" },
  { name: "Tuck Jump", category: "Plyo", muscleGroup: "Lower" },
  { name: "Weighted Swan Leap", category: "Plyo", muscleGroup: "Lower" },
  { name: "Wide to Narrow Deep Leaps", category: "Plyo", muscleGroup: "Lower" },
  
  // Plyometric exercises - Upper
  { name: "Banded Baseball Swings", category: "Plyo", muscleGroup: "Upper" },
  { name: "Banded SA Fly Spasms", category: "Plyo", muscleGroup: "Upper" },
  { name: "Banded SA Pulldown Spasms", category: "Plyo", muscleGroup: "Upper" },
  { name: "Banded Wood Chop Spasms", category: "Plyo", muscleGroup: "Upper" },
  { name: "Banded Y Spasms", category: "Plyo", muscleGroup: "Upper" },
  { name: "Bench Press Throws", category: "Plyo", muscleGroup: "Upper" },
  { name: "Depth Drop Push-Up", category: "Plyo", muscleGroup: "Upper" },
  { name: "Depth Jump Push-Up", category: "Plyo", muscleGroup: "Upper" },
  { name: "Drop-Catch Bench Press", category: "Plyo", muscleGroup: "Upper" },
  { name: "Drop-Catch Push-Up", category: "Plyo", muscleGroup: "Upper" },
  { name: "Explosive Kip Swing", category: "Plyo", muscleGroup: "Upper" },
  { name: "Long Lever Rotations", category: "Plyo", muscleGroup: "Upper" },
  { name: "MB Chest Pass", category: "Plyo", muscleGroup: "Upper" },
  { name: "MB Drop-Catch Vertical Toss", category: "Plyo", muscleGroup: "Upper" },
  { name: "MB Rotational Slam", category: "Plyo", muscleGroup: "Upper" },
  { name: "MB Shot Put Throw", category: "Plyo", muscleGroup: "Upper" },
  { name: "MB Slam", category: "Plyo", muscleGroup: "Upper" },
  { name: "MB Vertical Toss", category: "Plyo", muscleGroup: "Upper" },
  { name: "OH MB Taps", category: "Plyo", muscleGroup: "Upper" },
  { name: "Plyo Push-Up", category: "Plyo", muscleGroup: "Upper" },
  { name: "Push-Up Plate Hops", category: "Plyo", muscleGroup: "Upper" },
  { name: "SS MB Slams", category: "Plyo", muscleGroup: "Upper" },
  { name: "Supine MB Chest Pass", category: "Plyo", muscleGroup: "Upper" },
  
  // Accessory - Lower
  { name: "Box Jump", category: "Accessory", muscleGroup: "Lower" },
  { name: "Copenhagen Lifts", category: "Accessory", muscleGroup: "Lower" },
  { name: "Crab Walk", category: "Accessory", muscleGroup: "Lower" },
  { name: "HK Hip Flexor Lifts", category: "Accessory", muscleGroup: "Lower" },
  { name: "Inchworm to Cobra", category: "Accessory", muscleGroup: "Lower" },
  { name: "Spiderman Crawl", category: "Accessory", muscleGroup: "Lower" },
  { name: "Spinal Reaches", category: "Accessory", muscleGroup: "Lower" },
  { name: "Standing BB Rotations", category: "Accessory", muscleGroup: "Lower" },
  
  // Accessory - Upper
  { name: "BB Wrist Roller", category: "Accessory", muscleGroup: "Upper" },
  { name: "DB Arm Bar", category: "Accessory", muscleGroup: "Upper" },
  { name: "DB External Rotation", category: "Accessory", muscleGroup: "Upper" },
  { name: "HK Wall Opener", category: "Accessory", muscleGroup: "Upper" },
  { name: "OH Side Bends", category: "Accessory", muscleGroup: "Upper" },
  { name: "Pike Crawl", category: "Accessory", muscleGroup: "Upper" },
  { name: "Plate Pinch Farmer's Carry", category: "Accessory", muscleGroup: "Upper" },
  { name: "Plate Spine Circles", category: "Accessory", muscleGroup: "Upper" },
  { name: "Reverse Plank Press Up", category: "Accessory", muscleGroup: "Upper" },
  { name: "Rotational Kettlebell Swings", category: "Accessory", muscleGroup: "Upper" },
  { name: "Wrist Roller", category: "Accessory", muscleGroup: "Upper" },
  
  // Isometric - Lower
  { name: "Adductor Squeeze Iso", category: "Isometric", muscleGroup: "Lower" },
  { name: "Bulgarian SS Iso", category: "Isometric", muscleGroup: "Lower" },
  { name: "Copenhagen Plank", category: "Isometric", muscleGroup: "Lower" },
  { name: "GHR 45° Iso", category: "Isometric", muscleGroup: "Lower" },
  { name: "Side Lunge Iso", category: "Isometric", muscleGroup: "Lower" },
  { name: "Single Arm Plank", category: "Isometric", muscleGroup: "Lower" },
  { name: "Single Leg Calf Overcoming Iso", category: "Isometric", muscleGroup: "Lower" },
  { name: "Sorenson Hold", category: "Isometric", muscleGroup: "Lower" },
  { name: "Split Squat Iso", category: "Isometric", muscleGroup: "Lower" },
  { name: "Straight Single Leg Glute Bridge Iso", category: "Isometric", muscleGroup: "Lower" },
  
  // Isometric - Upper
  { name: "4-way Neck Bridge", category: "Isometric", muscleGroup: "Upper" },
  { name: "Dip Iso", category: "Isometric", muscleGroup: "Upper" },
  { name: "Prone Y Iso", category: "Isometric", muscleGroup: "Upper" },
  { name: "Push-Up Iso", category: "Isometric", muscleGroup: "Upper" },
  { name: "Reverse Shrug Iso", category: "Isometric", muscleGroup: "Upper" },
];

async function seedAllExercises() {
  console.log('🌱 Starting comprehensive exercise seed...');
  console.log(`📊 Total exercises to import: ${ALL_EXERCISES.length}`);
  
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
          console.log(`⏭️  Skipping: ${exercise.name} (already exists)`);
          skipped++;
          continue;
        }
        
        // Insert new exercise
        await db.insert(exercises).values({
          name: exercise.name,
          category: exercise.category,
          muscleGroup: exercise.muscleGroup,
          equipment: 'barbell', // Default for weightlifting exercises
          organizationId: null, // Global exercise
          createdBy: null,
        });
        
        console.log(`✅ Inserted: ${exercise.name}`);
        inserted++;
      } catch (error) {
        console.error(`❌ Error inserting ${exercise.name}:`, error);
      }
    }
    
    console.log('\n🎉 Comprehensive exercise seed complete!');
    console.log(`   ✅ Inserted: ${inserted}`);
    console.log(`   ⏭️  Skipped: ${skipped}`);
    console.log(`   📊 Total: ${ALL_EXERCISES.length}`);
    
  } catch (error) {
    console.error('❌ Seed failed:', error);
    throw error;
  }
}

// Run the seed
seedAllExercises()
  .then(() => {
    console.log('\n✅ All done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Fatal error:', error);
    process.exit(1);
  });
