// frontend/app/(AuthPages)/admin/users/page.js

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useAuth } from "@/hooks/useAuth";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

// Roles allowed on this page
const USER_MANAGER_ROLES = ["Developer", "ERP-Executive"];

// Editable text/select fields shown in the edit modal, in order.
// (profile_picture is handled separately below since it needs an
// upload control + preview, not a plain text input.)
const FIELDS = [
  { name: "user_name", label: "User Name" },
  { name: "email", label: "Email" },
  { name: "role", label: "Role" },
  { name: "department", label: "Department" },
  { name: "assigned_building", label: "Assigned Floor" },
  { name: "factory", label: "Factory" },
];

const fmt = (v) =>
  v && !Number.isNaN(new Date(v).getTime())
    ? new Date(v).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })
    : "—";

const fileToDataUrl = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

export default function ManageUsersPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  const [users, setUsers] = useState([]);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState("");
  const [editingUser, setEditingUser] = useState(null);
  const [saving, setSaving] = useState(false);

  const canManageUsers = user && USER_MANAGER_ROLES.includes(user.role);

  useEffect(() => {
    if (!loading && !canManageUsers) {
      router.replace("/dashboard");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, user]);

  useEffect(() => {
    if (!loading && canManageUsers) fetchUsers();
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
      email: u.email || "",
      role: u.role,
      department: u.department || "",
      assigned_building: u.assigned_building,
      factory: u.factory,
      // `profile_picture` here doubles as both "current preview" and the
      // value actually sent to the server:
      //  - unchanged  -> stays as the existing URL string (server keeps it)
      //  - new upload -> becomes a base64 data URL (server re-uploads it)
      //  - removed    -> becomes null (server deletes it)
      profile_picture: u.profile_picture || null,
    });
  }

  function updateField(name, value) {
    setEditingUser((prev) => ({ ...prev, [name]: value }));
  }

  async function handlePictureChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const dataUrl = await fileToDataUrl(file);
    updateField("profile_picture", dataUrl);
  }

  function removePicture() {
    updateField("profile_picture", null);
  }

  async function saveEdit(e) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const res = await fetch(`${API_URL}/auth/update`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...editingUser,
          requester_user_name: user.user_name,
          requester_role: user.role,
        }),
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

  if (loading || !canManageUsers) return null;

  return (
    <section className="min-h-screen bg-gray-50 px-4 py-10">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-800 mb-6">Manage Users</h1>

        {error && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        )}

        {fetching ? (
          <p className="text-gray-500">Loading users...</p>
        ) : (
          <div className="bg-white rounded-xl shadow overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-100 text-gray-600 text-left">
                <tr>
                  <th className="px-4 py-2">Name</th>
                  <th className="px-4 py-2">Email</th>
                  <th className="px-4 py-2">Role</th>
                  <th className="px-4 py-2">Department</th>
                  <th className="px-4 py-2">Floor</th>
                  <th className="px-4 py-2">Factory</th>
                  <th className="px-4 py-2">Joined</th>
                  <th className="px-4 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} className="border-t border-gray-100">
                    <td className="px-4 py-2 flex items-center gap-2 whitespace-nowrap">
                      {u.profile_picture ? (
                        <div className="relative w-8 h-8 rounded-full overflow-hidden shrink-0">
                          <Image src={u.profile_picture} alt={u.user_name} fill className="object-cover" />
                        </div>
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-gray-200 text-gray-400 flex items-center justify-center text-xs font-semibold shrink-0">
                          {u.user_name?.[0]?.toUpperCase() || "?"}
                        </div>
                      )}
                      {u.user_name}
                    </td>
                    <td className="px-4 py-2">{u.email || "—"}</td>
                    <td className="px-4 py-2">{u.role}</td>
                    <td className="px-4 py-2">{u.department || "-"}</td>
                    <td className="px-4 py-2">{u.assigned_building}</td>
                    <td className="px-4 py-2">{u.factory}</td>
                    <td className="px-4 py-2 whitespace-nowrap text-gray-500">{fmt(u.createdAt)}</td>
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
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center px-4 z-50 overflow-y-auto py-8">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">
              Edit {editingUser.old_user_name}
            </h2>
            <form onSubmit={saveEdit} className="space-y-4">
              {/* Profile picture — preview + upload + remove */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Profile Picture</label>
                <div className="flex items-center gap-3">
                  {editingUser.profile_picture ? (
                    <div className="relative w-14 h-14 rounded-full overflow-hidden shrink-0 border border-gray-200">
                      <Image src={editingUser.profile_picture} alt="" fill className="object-cover" />
                    </div>
                  ) : (
                    <div className="w-14 h-14 rounded-full bg-gray-100 text-gray-400 flex items-center justify-center text-xs shrink-0 border border-gray-200">
                      None
                    </div>
                  )}
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 cursor-pointer">
                      Upload new
                      <input type="file" accept="image/*" className="hidden" onChange={handlePictureChange} disabled={saving} />
                    </label>
                    {editingUser.profile_picture && (
                      <button
                        type="button"
                        onClick={removePicture}
                        disabled={saving}
                        className="text-xs font-semibold text-rose-600 hover:text-rose-700 text-left"
                      >
                        Remove picture
                      </button>
                    )}
                  </div>
                </div>
              </div>

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