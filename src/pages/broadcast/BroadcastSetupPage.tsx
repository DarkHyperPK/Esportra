import { useParams } from 'react-router-dom';
import { ShowPreparation } from '@/components/broadcast/ShowPreparation';
export default function BroadcastSetupPage() {
  const { showId = '' } = useParams<{ showId: string }>();
  return <ShowPreparation key={showId} showId={showId} />;
}
