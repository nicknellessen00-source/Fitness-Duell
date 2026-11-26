import AppTabs from '@/components/app-tabs';
import { CoinToast } from '@/components/coin';
import { Tour } from '@/components/tour';

export default function TabsLayout() {
  return (
    <>
      <AppTabs />
      <CoinToast />
      <Tour />
    </>
  );
}
