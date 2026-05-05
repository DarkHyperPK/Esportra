import { useParams } from 'react-router-dom';
import AdminAuditTrail from '@/components/season/admin/AdminAuditTrail';

export default function AdminSeasonAudit() {
  const { id } = useParams<{ id: string }>();

  if (!id) {
    return <div>Season ID is required</div>;
  }

  return (
    <div className="container mx-auto py-8">
      <AdminAuditTrail seasonId={id} />
    </div>
  );
}
