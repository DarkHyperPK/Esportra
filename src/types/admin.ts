
export interface AdminUser {
  id: string;
  username: string;
  email: string;
  roles: string[];
  createdAt: string;
  status: 'active' | 'suspended' | 'pending';
}
