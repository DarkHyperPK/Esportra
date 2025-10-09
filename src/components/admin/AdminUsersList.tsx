
import { Card, CardContent } from "@/components/ui/card";
import { useAdminUsers } from "@/hooks/useAdminUsers";
import UsersHeader from "./UsersHeader";
import UsersTable from "./UsersTable";

const AdminUsersList = () => {
  const { users, searchTerm, setSearchTerm, loading, error } = useAdminUsers();

  return (
    <Card className="bg-gray-800/50 border-gray-700">
      <CardContent className="p-6">
        <UsersHeader 
          searchTerm={searchTerm} 
          onSearchChange={setSearchTerm} 
        />
        
        {loading ? (
          <div className="flex justify-center items-center h-40">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-t-gaming-purple border-r-gaming-purple border-b-transparent border-l-transparent"></div>
          </div>
        ) : error ? (
          <div className="text-red-500 p-4 text-center">
            {error}
          </div>
        ) : (
          <UsersTable users={users} />
        )}
      </CardContent>
    </Card>
  );
};

export default AdminUsersList;
