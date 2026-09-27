"use client";

import { userRoleLabel } from "@/lib/users/role-list";

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
  onEdit: (user: User) => void;
}

export default function UserTable({ users, onEdit }: Props) {
  if (users.length === 0) {
    return (
      <div className="rounded-xl border border-gray-100 bg-white p-8 text-center shadow-sm">
        <p className="text-sm text-gray-500">Geen gebruikers gevonden.</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-200 bg-gray-50 text-left text-xs font-medium text-gray-500">
            <th className="px-4 py-3">Naam</th>
            <th className="px-4 py-3">E-mail</th>
            <th className="px-4 py-3">Rol</th>
            <th className="px-4 py-3">Status</th>
            <th className="px-4 py-3">Laatste login</th>
            <th className="px-4 py-3"></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {users.map((user) => (
            <tr key={user.id} className="hover:bg-gray-50">
              <td className="px-4 py-3 font-medium text-gray-800">{user.name}</td>
              <td className="px-4 py-3 text-gray-600">{user.email}</td>
              <td className="px-4 py-3 text-gray-600">
                {userRoleLabel(user.role)}
              </td>
              <td className="px-4 py-3">
                <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                  user.isActive
                    ? "bg-emerald-100 text-emerald-800"
                    : "bg-gray-100 text-gray-500"
                }`}>
                  {user.isActive ? "Actief" : "Inactief"}
                </span>
              </td>
              <td className="px-4 py-3 text-gray-600">
                {user.lastLoginAt
                  ? new Date(user.lastLoginAt).toLocaleDateString("nl-BE")
                  : "Nooit"}
              </td>
              <td className="px-4 py-3 text-right">
                <button
                  onClick={() => onEdit(user)}
                  className="text-sm font-medium text-emerald-700 hover:text-emerald-900"
                >
                  Bewerken
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
