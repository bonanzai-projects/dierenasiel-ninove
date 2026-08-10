"use client";

import { useState, useCallback } from "react";
import UserTable from "./UserTable";
import UserForm from "./UserForm";
import RolePermissionsInfo from "./RolePermissionsInfo";

interface User {
  id: number;
  name: string;
  email: string;
  role: string;
  isActive: boolean | null;
  lastLoginAt: Date | null;
  createdAt: Date | null;
}

interface Props {
  users: User[];
}

export default function UserManager({ users }: Props) {
  const [showForm, setShowForm] = useState(false);
  const [editUser, setEditUser] = useState<User | null>(null);

  const handleEdit = useCallback((user: User) => {
    setEditUser(user);
    setShowForm(true);
  }, []);

  const handleClose = useCallback(() => {
    setShowForm(false);
    setEditUser(null);
  }, []);

  const handleAdd = useCallback(() => {
    setEditUser(null);
    setShowForm(true);
  }, []);

  return (
    <div className="space-y-6">
      {!showForm && (
        <div className="flex justify-end">
          <button
            onClick={handleAdd}
            className="rounded-md bg-[#1b4332] px-5 py-2 text-sm font-medium text-white hover:bg-[#2d6a4f]"
          >
            Nieuwe gebruiker
          </button>
        </div>
      )}

      {showForm && (
        <UserForm key={editUser?.id ?? "new"} editUser={editUser} onClose={handleClose} />
      )}

      <UserTable users={users} onEdit={handleEdit} />

      <RolePermissionsInfo />
    </div>
  );
}
