import { useState } from 'react';
import { User, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuGroup,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from '@/components/ui/button';
import { MoreVertical } from 'lucide-react';
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger 
} from "@/components/ui/alert-dialog";

interface UserProfile {
  id: string;
  username: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
}

interface UsersListProps {
  users: UserProfile[];
  loading: boolean;
  onRoleChange: (userId: string, newRole: string) => Promise<void>;
  onDeleteUser: (userId: string) => Promise<void>;
}

const UsersList = ({ users, loading, onRoleChange, onDeleteUser }: UsersListProps) => {
  const { toast } = useToast();
  const [processingRoleChange, setProcessingRoleChange] = useState<string | null>(null);
  const [processingDelete, setProcessingDelete] = useState<string | null>(null);

  const handleDeleteUser = async (userId: string) => {
    try {
      setProcessingDelete(userId);
      await onDeleteUser(userId);
    } catch (error: any) {
      console.error('Error deleting user:', error);
      toast({
        title: "Delete Failed",
        description: error.message || "Failed to delete user",
        variant: "destructive",
      });
    } finally {
      setProcessingDelete(null);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-10">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-gaming-purple"></div>
      </div>
    );
  }

  if (users.length === 0) {
    return (
      <div className="text-center py-8 text-gray-400">
        <p>No users found</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableCaption>A list of all users in your account. Click on a user to manage account.</TableCaption>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[50px]">
              <User className="h-4 w-4" />
            </TableHead>
            <TableHead>Username</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Full Name</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.map((user) => (
            <TableRow key={user.id}>
              <TableCell>
                <img
                  src={user.avatar_url || 'https://via.placeholder.com/50'}
                  alt={user.username}
                  className="h-8 w-8 rounded-full"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.onerror = null;
                    target.src = 'https://via.placeholder.com/50';
                  }}
                />
              </TableCell>
              <TableCell>{user.username}</TableCell>
              <TableCell>{user.email}</TableCell>
              <TableCell>{user.full_name || 'N/A'}</TableCell>
              <TableCell className="text-right">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="h-8 w-8 p-0">
                      <span className="sr-only">Open menu</span>
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuLabel>Actions</DropdownMenuLabel>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                          Make Admin
                        </DropdownMenuItem>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Confirm Role Change</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to make {user.username} an admin? This will grant them full access to all administrative features.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction 
                            onClick={() => onRoleChange(user.id, 'admin')}
                            disabled={processingRoleChange === user.id}
                          >
                            {processingRoleChange === user.id ? 'Processing...' : 'Confirm'}
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>

                    <DropdownMenuItem 
                      onSelect={(e) => {
                        e.preventDefault();
                        onRoleChange(user.id, 'venue_owner');
                      }}
                      disabled={processingRoleChange === user.id}
                    >
                      {processingRoleChange === user.id ? 'Processing...' : 'Make Venue Owner'}
                    </DropdownMenuItem>
                    
                    <DropdownMenuItem 
                      onSelect={(e) => {
                        e.preventDefault();
                        onRoleChange(user.id, 'organizer');
                      }}
                      disabled={processingRoleChange === user.id}
                    >
                      {processingRoleChange === user.id ? 'Processing...' : 'Make Organizer'}
                    </DropdownMenuItem>
                    
                    <DropdownMenuItem 
                      onSelect={(e) => {
                        e.preventDefault();
                        onRoleChange(user.id, 'player');
                      }}
                      disabled={processingRoleChange === user.id}
                    >
                      {processingRoleChange === user.id ? 'Processing...' : 'Make Player'}
                    </DropdownMenuItem>
                    
                    <DropdownMenuSeparator />
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-red-500">
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete User
                        </DropdownMenuItem>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Confirm Deletion</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to delete {user.username}? This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction 
                            onClick={() => handleDeleteUser(user.id)}
                            disabled={processingDelete === user.id}
                            className="bg-red-500 hover:bg-red-600"
                          >
                            {processingDelete === user.id ? 'Deleting...' : 'Delete'}
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};

export default UsersList;
