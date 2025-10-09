
import { Button } from "@/components/ui/button";
import { UserPlus } from "lucide-react";
import UserSearch from "./UserSearch";

interface UsersHeaderProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
}

const UsersHeader = ({ searchTerm, onSearchChange }: UsersHeaderProps) => {
  return (
    <div className="flex justify-between items-center mb-6">
      <h2 className="text-2xl font-bold">Users Management</h2>
      <div className="flex items-center gap-4">
        <UserSearch searchTerm={searchTerm} onSearchChange={onSearchChange} />
        <Button className="bg-gaming-purple hover:bg-gaming-purple/80">
          <UserPlus size={18} className="mr-2" />
          Add User
        </Button>
      </div>
    </div>
  );
};

export default UsersHeader;
