"use client";

import { useState, useCallback } from "react";
import UserTable from "./UserTable";
import UserForm from "./UserForm";
import RolePermissionsInfo from "./RolePermissionsInfo";
import { ALLE_ROLLEN, filterAndSortUsers, roleFilterOptions } from "@/lib/users/role-list";

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
  const [gekozenRol, setGekozenRol] = useState<string>(ALLE_ROLLEN);

  // Story 10.78: filter op rol; valt de gekozen rol leeg (bv. na bewerken), dan weer iedereen.
  const opties = roleFilterOptions(users);
  const rol = opties.some((o) => o.value === gekozenRol) ? gekozenRol : ALLE_ROLLEN;
  const zichtbaar = filterAndSortUsers(users, rol);

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

      <div role="group" aria-label="Filter op rol" className="flex flex-wrap gap-2">
        {opties.map((o) => {
          const actief = o.value === rol;
          return (
            <button
              key={o.value}
              type="button"
              aria-pressed={actief}
              onClick={() => setGekozenRol(o.value)}
              className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                actief
                  ? "border-[#1b4332] bg-[#1b4332] text-white"
                  : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
              }`}
            >
              {`${o.label} (${o.count})`}
            </button>
          );
        })}
      </div>

      <UserTable users={zichtbaar} onEdit={handleEdit} />

      <RolePermissionsInfo />
    </div>
  );
}
