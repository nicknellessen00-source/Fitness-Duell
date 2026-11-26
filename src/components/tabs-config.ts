import { ChartColumn, Dumbbell, House, Trophy, UtensilsCrossed } from 'lucide-react-native';

/* Die fünf Bereiche der App – gemeinsam für iOS/Android (native Tabs) und Web */
export const TABS = [
  { name: 'index', href: '/', label: 'Start', sf: 'house.fill', md: 'home', icon: House },
  { name: 'training', href: '/training', label: 'Training', sf: 'dumbbell.fill', md: 'fitness_center', icon: Dumbbell },
  { name: 'tracker', href: '/tracker', label: 'Tracker', sf: 'chart.bar.fill', md: 'insights', icon: ChartColumn },
  { name: 'food', href: '/food', label: 'Ernährung', sf: 'fork.knife', md: 'restaurant', icon: UtensilsCrossed },
  { name: 'friends', href: '/friends', label: 'Rangliste', sf: 'trophy.fill', md: 'emoji_events', icon: Trophy },
] as const;
