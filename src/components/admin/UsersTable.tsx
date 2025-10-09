
import { AdminUser } from "@/types/admin";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Edit, Trash2 } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface UsersTableProps {
  users: AdminUser[];
}

const UsersTable = ({ users }: UsersTableProps) => {
  const getRoleBadgeColor = (role: string) => {
    switch(role) {
      case 'admin':
        return 'bg-red-500';
      case 'venue_owner':
        return 'bg-blue-500';
      case 'organizer':
        return 'bg-green-500';
      case 'player':
        return 'bg-purple-500';
      default:
        return 'bg-gray-500';
    }
  };

  return (
    <div className="rounded-md border border-gaming-gray/30 overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-gaming-gray/5 hover:bg-gaming-gray/10">
            <TableHead>Username</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Roles</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Created</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.length > 0 ? (
            users.map(user => (
              <TableRow key={user.id} className="hover:bg-gaming-gray/5">
                <TableCell className="font-medium">{user.username}</TableCell>
                <TableCell>{user.email}</TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {user.roles.map(role => (
                      <Badge key={role} className={`${getRoleBadgeColor(role)}`}>
                        {role}
                      </Badge>
                    ))}
                  </div>
                </TableCell>
                <TableCell>
                  <Badge className={
                    user.status === 'active' ? 'bg-green-500' : 
                    user.status === 'suspended' ? 'bg-red-500' : 'bg-yellow-500'
                  }>
                    {user.status}
                  </Badge>
                </TableCell>
                <TableCell>{user.createdAt}</TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="icon" className="text-gray-400 hover:text-white">
                    <Edit size={16} />
                  </Button>
                  <Button variant="ghost" size="icon" className="text-gray-400 hover:text-red-500">
                    <Trash2 size={16} />
                  </Button>
                </TableCell>
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={6} className="text-center py-8 text-gray-400">
                No users found matching your search.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
};

export default UsersTable;
