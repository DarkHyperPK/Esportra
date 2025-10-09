import { useAuth } from '@/contexts/AuthContext';
import Footer from "@/components/Footer";
import { useUserManagement } from '@/hooks/useUserManagement';
import UsersList from '@/components/admin/UsersList';
import AccessDenied from '@/components/admin/AccessDenied';
import ErrorDisplay from '@/components/admin/ErrorDisplay';
import { Button } from '@/components/ui/button';

const ManageUsers = () => {
  const { user } = useAuth();
  const { users, loading, error, handleRoleChange, deleteUser, cleanupOrphanedProfiles } = useUserManagement();

  // Now all authenticated users can access this page
  if (!user) {
    return (
      <div className="min-h-screen bg-esports-dark text-white flex flex-col">
        <AccessDenied message="You need to be logged in to access this page." />
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-esports-dark text-white flex flex-col">
      <main className="flex-grow container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-3xl font-bold">Manage Users</h1>
          <Button 
            onClick={cleanupOrphanedProfiles}
            variant="outline"
          >
            Cleanup Orphaned Profiles
          </Button>
        </div>
        
        {error && <ErrorDisplay message={error} />}
        
        <UsersList 
          users={users}
          loading={loading}
          onRoleChange={handleRoleChange}
          onDeleteUser={deleteUser}
        />
      </main>
      <Footer />
    </div>
  );
};

export default ManageUsers;
