// frontend/app/admin/users/page.js
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useAuth } from "@/hooks/useAuth";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

const FIELDS = [
  { name: "user_name", label: "User Name" },
  { name: "role", label: "Role" },
  { name: "department", label: "Department" },
  { name: "assigned_building", label: "Assigned Floor" },
  { name: "factory", label: "Factory" },
];

export default function ManageUsersPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  const [users, setUsers] = useState([]);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState("");
  const [editingUser, setEditingUser] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!loading && (!user || user.role !== "Developer")) {
      router.replace("/dashboard");
    }
  }, [loading, user, router]);

  useEffect(() => {
    if (!loading && user?.role === "Developer") fetchUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, user]);

  async function fetchUsers() {
    setFetching(true);
    setError("");
    try {
      const res = await fetch(
        `${API_URL}/auth/users?requester_role=${encodeURIComponent(user.role)}`
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to load users");
      setUsers(data.users);
    } catch (err) {
      setError(err.message);
    } finally {
      setFetching(false);
    }
  }

  function startEdit(u) {
    setEditingUser({
      old_user_name: u.user_name,
      user_name: u.user_name,
      role: u.role,
      department: u.department || "",
      assigned_building: u.assigned_building,
      factory: u.factory,
    });
  }

  function updateField(name, value) {
    setEditingUser((prev) => ({ ...prev, [name]: value }));
  }

  async function saveEdit(e) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const res = await fetch(`${API_URL}/auth/update`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editingUser),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Update failed");
      setEditingUser(null);
      fetchUsers();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  if (loading || !user || user.role !== "Developer") return null;

  return (
    <section className="min-h-screen bg-gray-50 px-4 py-10">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-800 mb-6">Manage Users</h1>

        {error && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        )}

        {fetching ? (
          <p className="text-gray-500">Loading users...</p>
        ) : (
          <div className="bg-white rounded-xl shadow overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-100 text-gray-600 text-left">
                <tr>
                  <th className="px-4 py-2">Name</th>
                  <th className="px-4 py-2">Role</th>
                  <th className="px-4 py-2">Department</th>
                  <th className="px-4 py-2">Floor</th>
                  <th className="px-4 py-2">Factory</th>
                  <th className="px-4 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} className="border-t border-gray-100">
                    <td className="px-4 py-2 flex items-center gap-2">
                      {u.profile_picture && (
                        <div className="relative w-8 h-8 rounded-full overflow-hidden">
                          <Image src={u.profile_picture} alt={u.user_name} fill className="object-cover" />
                        </div>
                      )}
                      {u.user_name}
                    </td>
                    <td className="px-4 py-2">{u.role}</td>
                    <td className="px-4 py-2">{u.department || "-"}</td>
                    <td className="px-4 py-2">{u.assigned_building}</td>
                    <td className="px-4 py-2">{u.factory}</td>
                    <td className="px-4 py-2 text-right">
                      <button onClick={() => startEdit(u)} className="text-indigo-600 hover:underline text-sm">
                        Edit
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {editingUser && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center px-4 z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">
              Edit {editingUser.old_user_name}
            </h2>
            <form onSubmit={saveEdit} className="space-y-4">
              {FIELDS.map((f) => (
                <div key={f.name}>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{f.label}</label>
                  <input
                    type="text"
                    value={editingUser[f.name] || ""}
                    onChange={(e) => updateField(f.name, e.target.value)}
                    disabled={saving}
                    className="w-full border border-gray-300 px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              ))}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  disabled={saving}
                  className="flex-1 border border-gray-300 rounded-lg py-2 text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-70 text-white font-semibold rounded-lg py-2 flex items-center justify-center gap-2"
                >
                  {saving ? (
                    <>
                      <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Saving...
                    </>
                  ) : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}