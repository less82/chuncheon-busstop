import { Suspense } from 'react';
import { ShelterView } from '@/components/ShelterView';

export default function ShelterPage() {
  return (
    <Suspense>
      <ShelterView />
    </Suspense>
  );
}
