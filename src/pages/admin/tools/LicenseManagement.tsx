import LicenseManagement from "@/components/admin/LicenseManagement";
import { AdminPage } from "@/components/admin/AdminPage";

const LicenseManagementTool = () => {
  return (
    <AdminPage
      eyebrow="Users & Access"
      title="Licenses"
      description="Issue, audit, and revoke organizer and venue-owner licenses"
    >
      <LicenseManagement />
    </AdminPage>
  );
};

export default LicenseManagementTool;
