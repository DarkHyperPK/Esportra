import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface RoleDropdownProps {
  roles: string[];
  onChange: (newRoles: string[]) => void;
}

const RoleDropdown: React.FC<RoleDropdownProps> = ({ roles, onChange }) => {
  const handleChange = (value: string) => {
    const newRoles = [...roles];
    if (newRoles.includes(value)) {
      const index = newRoles.indexOf(value);
      newRoles.splice(index, 1);
    } else {
      newRoles.push(value);
    }
    onChange(newRoles);
  };

  return (
    <Select onValueChange={handleChange}>
      <SelectTrigger>
        <SelectValue placeholder="Select roles" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="admin">Admin</SelectItem>
        <SelectItem value="organizer">Organizer</SelectItem>
        <SelectItem value="venue_owner">Venue Owner</SelectItem>
      </SelectContent>
    </Select>
  );
};

export default RoleDropdown; 
