import { useParams } from 'react-router-dom';
import ManualOverrideInterface from '@/components/season/admin/ManualOverrideInterface';

export default function AdminSeasonOverride() {
  const { id } = useParams<{ id: string }>();

  if (!id) {
    return <div>Season ID is required</div>;
  }

  return (
    <div className="container mx-auto py-8">
      <ManualOverrideInterface seasonId={id} />
    </div>
  );
}
