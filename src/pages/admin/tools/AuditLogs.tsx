import { AdminPage } from '@/components/admin/AdminPage';
import AuditLogs from '@/components/admin/AuditLogs';

const AuditLogsTool = () => (
  <AdminPage
    eyebrow="Security"
    title="Audit Logs"
    description="Every staff action across the platform — searchable, filterable, exportable."
  >
    <AuditLogs />
  </AdminPage>
);

export default AuditLogsTool;
