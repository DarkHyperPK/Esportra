import { useAdminUsers } from "@/hooks/useAdminUsers";
import UsersHeader from "./UsersHeader";
import UsersTable from "./UsersTable";

const AdminUsersList = () => {
  const { users, searchTerm, setSearchTerm, loading, error } = useAdminUsers();

  return (
    <div className="rounded-2xl bg-[#0a0a0c] border border-zinc-800/50 overflow-hidden">
      <div className="p-6">
        <UsersHeader
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
        />

        {loading ? (
          <div className="flex justify-center items-center h-40">
            <div className="w-6 h-6 border-2 border-rose-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : error ? (
          <div className="text-red-400 p-4 text-center bg-red-500/10 rounded-xl">
            {error}
          </div>
        ) : (
          <UsersTable users={users} />
        )}
      </div>
    </div>
  );
};

export default AdminUsersList;
