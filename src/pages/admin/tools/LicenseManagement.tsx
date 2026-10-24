import LicenseManagement from "@/components/admin/LicenseManagement";
import { AdminPage } from "@/components/admin/AdminPage";
import ProEventRequestQueue from "@/components/admin/ProEventRequestQueue";

const LicenseManagementTool = () => {
  return (
    <AdminPage
      eyebrow="Users & Access"
      title="Licenses"
      description="Issue, audit, and revoke organizer and venue-owner licenses"
    >
      <LicenseManagement />
      <ProEventRequestQueue />
    </AdminPage>
  );
};

export default LicenseManagementTool;
