import {
  Activity, Bike, Dumbbell, Flag, Flame, Footprints, HandFist, HeartPulse, Mountain, MountainSnow, Music, PersonStanding,
  Sailboat, Snowflake, Volleyball, Waves, type LucideIcon,
} from 'lucide-react-native';

/** Ein Line-Icon je Sportart statt Emoji */
const BY_ID: Record<string, LucideIcon> = {
  laufen: Footprints, gehen: Footprints, wandern: Mountain, radfahren: Bike, mtb: Bike, spinning: Bike, schwimmen: Waves, rudern: Waves,
  sup: Sailboat, surfen: Waves, golf: Flag, gym: Dumbbell, hiit: Flame, yoga: PersonStanding, pilateskurs: PersonStanding, tanzen: Music,
  boxen: HandFist, klettern: MountainSnow, ski: Snowflake, langlauf: Snowflake, snowboard: Snowflake, eislaufen: Snowflake,
};
const BY_CAT: Record<string, LucideIcon> = { Ausdauer: HeartPulse, Ballsport: Volleyball, Fitness: Dumbbell, Outdoor: Mountain };
export const sportIcon = (id: string, cat?: string): LucideIcon => BY_ID[id] || (cat && BY_CAT[cat]) || Activity;
