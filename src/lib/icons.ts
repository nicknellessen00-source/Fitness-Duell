/* Auf dem iPhone werden die Lucide-Icons durch passende SF Symbols ersetzt (Apple-Systemsymbole) */
import {
  Activity, ArrowUp, Barcode, Bike, Camera, ChartColumn, Check, ImageIcon, Mic, ScanText, Square, ChevronLeft, ChevronRight, Droplet, Dumbbell, Flag, Flame, Footprints, HandFist, HeartPulse, House,
  Minus, Mountain, MountainSnow, Music, Pause, PersonStanding, Play, Plus, Sailboat, Search, Snowflake, Star, Timer, Trash2, Trophy, UtensilsCrossed,
  Volleyball, Waves, X, Zap, type LucideIcon,
} from 'lucide-react-native';
import type { SFSymbol } from 'sf-symbols-typescript';

export const SF_FOR = new Map<LucideIcon, SFSymbol>([
  [Activity, 'figure.mixed.cardio'], [ArrowUp, 'arrow.up'], [Barcode, 'barcode.viewfinder'], [Camera, 'camera'], [ImageIcon, 'photo'], [Mic, 'mic'], [ScanText, 'text.viewfinder'], [Square, 'stop.fill'], [Bike, 'figure.outdoor.cycle'], [ChartColumn, 'chart.bar'], [Check, 'checkmark'],
  [ChevronLeft, 'chevron.left'], [ChevronRight, 'chevron.right'], [Droplet, 'drop'], [Dumbbell, 'dumbbell'], [Flag, 'flag'],
  [Flame, 'flame'], [Footprints, 'figure.run'], [HandFist, 'figure.boxing'], [HeartPulse, 'heart'], [House, 'house'], [Minus, 'minus'],
  [Mountain, 'mountain.2'], [MountainSnow, 'figure.climbing'], [Music, 'figure.dance'], [Pause, 'pause.fill'], [PersonStanding, 'figure.yoga'],
  [Play, 'play.fill'], [Plus, 'plus'], [Sailboat, 'sailboat'], [Search, 'magnifyingglass'], [Snowflake, 'figure.skiing.downhill'],
  [Star, 'star'], [Timer, 'timer'], [Trash2, 'trash'], [Trophy, 'trophy'], [UtensilsCrossed, 'fork.knife'], [Volleyball, 'figure.volleyball'],
  [Waves, 'figure.pool.swim'], [X, 'xmark'], [Zap, 'bolt'],
]);

/** Eigene Apple-Sportfiguren je Sportart */
export const SPORT_SF: Record<string, SFSymbol> = {
  laufen: 'figure.run', gehen: 'figure.walk', wandern: 'figure.hiking', radfahren: 'figure.outdoor.cycle', mtb: 'figure.outdoor.cycle',
  spinning: 'figure.indoor.cycle', schwimmen: 'figure.pool.swim', rudern: 'figure.rower', inline: 'figure.skating', tennis: 'figure.tennis',
  padel: 'figure.racquetball', squash: 'figure.squash', badminton: 'figure.badminton', tischtennis: 'figure.table.tennis',
  fussball: 'figure.indoor.soccer', basketball: 'figure.basketball', volleyball: 'figure.volleyball', handball: 'figure.handball',
  hockey: 'figure.hockey', golf: 'figure.golf', gym: 'dumbbell', hiit: 'figure.highintensity.intervaltraining', yoga: 'figure.yoga',
  pilateskurs: 'figure.pilates', tanzen: 'figure.dance', boxen: 'figure.boxing', klettern: 'figure.climbing', ski: 'figure.skiing.downhill',
  langlauf: 'figure.skiing.crosscountry', snowboard: 'figure.snowboarding', sup: 'figure.sailing', surfen: 'figure.surfing',
  reiten: 'figure.equestrian.sports', eislaufen: 'figure.skating',
};
