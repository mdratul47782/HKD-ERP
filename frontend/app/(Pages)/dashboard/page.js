// frontend/app/(Pages)/dashboard/page.js

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import {
  User,
  Building2,
  Factory,
  Calendar,
  Clock,
  Hash,
  ShieldCheck,
  Pencil,
  KeyRound,
  LogOut,
  X,
  Check,
  Eye,
  EyeOff,
  Camera,
} from "lucide-react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
const FACTORIES = ["K-1", "K-2", "K-3"];
const BUILDINGS = ["A-2", "B-2", "A-3", "B-3", "A-4", "B-4", "A-5", "B-5"];

// ── tiny reusable input ──────────────────────────────────────────────────────
function Field({ label, icon: Icon, children }) {
  return (
    <div className="space-y-1.5">
      <p className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-widest text-slate-400 dark:text-[#666]">
        {Icon && <Icon size={11} />}
        {label}
      </p>
      {children}
    </div>
  );
}

function StaticValue({ value, className = "" }) {
  return (
    <p className={`text-[13px] font-medium text-slate-800 dark:text-[#d4d4d4] ${className}`}>
      {value}
    </p>
  );
}

const inputCls =
  "w-full bg-slate-50 dark:bg-[#2a2a2a] border border-slate-200 dark:border-white/[0.09] rounded-lg px-3 py-2 text-[13px] text-slate-800 dark:text-[#ececec] placeholder:text-slate-400 dark:placeholder:text-[#555] outline-none focus:border-slate-400 dark:focus:border-white/20 focus:ring-2 focus:ring-slate-200 dark:focus:ring-white/[0.06] transition-all";

// ── password input with show/hide ────────────────────────────────────────────
function PasswordInput({ value, onChange, placeholder }) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <input
        type={show ? "text" : "password"}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className={inputCls + " pr-9"}
      />
      <button
        type="button"
        onClick={() => setShow((s) => !s)}
        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-[#666] hover:text-slate-600 dark:hover:text-[#aaa] transition-colors"
      >
        {show ? <EyeOff size={14} /> : <Eye size={14} />}
      </button>
    </div>
  );
}

// ── modal shell ──────────────────────────────────────────────────────────────
function Modal({ open, onClose, title, children }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/40 dark:bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative w-full max-w-sm mx-4 bg-white dark:bg-[#2a2a2a] border border-slate-200 dark:border-white/[0.09] rounded-2xl shadow-2xl overflow-hidden">
        {/* header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-white/[0.07]">
          <h2 className="text-[14px] font-semibold text-slate-800 dark:text-[#ececec]">{title}</h2>
          <button
            onClick={onClose}
            className="h-6 w-6 rounded-md flex items-center justify-center text-slate-400 dark:text-[#666] hover:text-slate-600 dark:hover:text-[#ececec] hover:bg-slate-100 dark:hover:bg-white/[0.07] transition-all"
          >
            <X size={14} />
          </button>
        </div>
        <div className="px-5 py-4">{children}</div>
      </div>
    </div>
  );
}

// ── main page ────────────────────────────────────────────────────────────────
export default function DashboardPage() {
  const { user, loading, logout, setAuth } = useAuth();
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [filePreview, setFilePreview] = useState(null);
  const [formData, setFormData] = useState({
    user_name: "",
    role: "",
    assigned_building: "",
    factory: "",
  });
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordData, setPasswordData] = useState({
    current_password: "",
    new_password: "",
    confirm_password: "",
  });
  const [passwordError, setPasswordError] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState("");
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  // ── auth guard ─────────────────────────────────────────────────────────────
  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (!storedUser || storedUser === "null" || storedUser === "undefined") {
      router.push("/login");
      return;
    }
    if (!loading && !user) {
      router.push("/login");
      return;
    }
    if (user && !user.createdAt && user.id) {
      fetch(`${API_URL}/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_name: user.user_name }),
      })
        .then((r) => r.json())
        .then((d) => {
          if (d.user) setAuth(d.user);
          else {
            localStorage.removeItem("user");
            router.push("/login");
          }
        })
        .catch(() => {
          localStorage.removeItem("user");
          router.push("/login");
        })
        .finally(() => setRefreshing(false));
    } else {
      setRefreshing(false);
    }
  }, [user, loading, router, setAuth]);

  useEffect(() => {
    if (user) {
      setFormData({
        user_name: user.user_name || "",
        role: user.role || "",
        assigned_building: user.assigned_building || "",
        factory: user.factory || "",
      });
      setFilePreview(user.profile_picture || null);
    }
  }, [user]);

  // ── loading state ──────────────────────────────────────────────────────────
  if (loading || refreshing)
    return (
      <div className="min-h-screen bg-[#f5f5f4] dark:bg-[#1a1a1a] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-7 h-7 border-2 border-slate-200 dark:border-[#333] border-t-slate-500 dark:border-t-[#888] rounded-full animate-spin" />
          <p className="text-[12px] text-slate-400 dark:text-[#666]">Loading…</p>
        </div>
      </div>
    );
  if (!user) return null;

  // ── handlers ───────────────────────────────────────────────────────────────
  const handleLogout = async () => {
    await logout();
    router.push("/login");
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      alert("শুধু JPG, PNG, বা WEBP image দিন।");
      return;
    }
   
    const reader = new FileReader();
    reader.onloadend = () => setFilePreview(reader.result);
    reader.readAsDataURL(file);
  };

  async function handleSave() {
    setIsSaving(true);
    try {
      const res = await fetch(`${API_URL}/auth/update`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          old_user_name: user.user_name,
          ...formData,
          profile_picture: filePreview,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      setAuth(data.user);
      setIsEditing(false);
    } catch (err) {
      alert(err.message);
    } finally {
      setIsSaving(false);
    }
  }

  const handlePasswordChange = async () => {
    setPasswordError("");
    setPasswordSuccess("");
    if (
      !passwordData.current_password ||
      !passwordData.new_password ||
      !passwordData.confirm_password
    ) {
      setPasswordError("সব fields পূরণ করুন");
      return;
    }
    if (passwordData.new_password.length < 4) {
      setPasswordError("Password কমপক্ষে 4 character হতে হবে");
      return;
    }
    if (passwordData.new_password !== passwordData.confirm_password) {
      setPasswordError("নতুন password মিলছে না");
      return;
    }
    setIsChangingPassword(true);
    try {
      const res = await fetch(`${API_URL}/auth/change-password`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_name: user.user_name,
          current_password: passwordData.current_password,
          new_password: passwordData.new_password,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      setPasswordSuccess("Password সফলভাবে পরিবর্তন হয়েছে ✓");
      setPasswordData({ current_password: "", new_password: "", confirm_password: "" });
      setTimeout(() => {
        setShowPasswordModal(false);
        setPasswordSuccess("");
      }, 1500);
    } catch (err) {
      setPasswordError(err.message);
    } finally {
      setIsChangingPassword(false);
    }
  };

  const initials = user.user_name?.slice(0, 2).toUpperCase();
  const createdDate = user?.createdAt
    ? new Date(user.createdAt).toLocaleDateString("en-GB", {
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    : "N/A";
  const createdTime = user?.createdAt
    ? new Date(user.createdAt).toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
      })
    : "N/A";

  // ── render ─────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#f5f5f4] dark:bg-[#1a1a1a]">
      <div className="max-w-2xl mx-auto px-4 py-8 space-y-3">

        {/* ── PROFILE CARD ─────────────────────────────────────────────── */}
        <div className="bg-white dark:bg-[#252525] border border-slate-200/80 dark:border-white/[0.08] rounded-2xl overflow-hidden shadow-sm dark:shadow-none">

          {/* avatar + name row */}
          <div className="flex items-center gap-4 px-5 py-5 border-b border-slate-100 dark:border-white/[0.07]">
            {/* avatar */}
            <div className="relative flex-shrink-0">
              <div className="w-14 h-14 rounded-2xl overflow-hidden bg-slate-100 dark:bg-[#333] ring-1 ring-slate-200 dark:ring-white/[0.08]">
                {filePreview ? (
                  <img
                    src={filePreview}
                    alt="Profile"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-slate-500 dark:text-[#888] text-base font-semibold">
                    {initials}
                  </div>
                )}
              </div>
              {isEditing && (
                <label className="absolute -bottom-1 -right-1 w-5 h-5 bg-slate-800 dark:bg-[#e0e0e0] rounded-full flex items-center justify-center cursor-pointer shadow-md hover:scale-110 transition-transform">
                  <Camera size={10} className="text-white dark:text-[#1a1a1a]" />
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </label>
              )}
            </div>

            {/* name + role */}
            <div className="flex-1 min-w-0">
              {isEditing ? (
                <div className="space-y-1.5">
                  <input
                    value={formData.user_name}
                    onChange={(e) =>
                      setFormData({ ...formData, user_name: e.target.value })
                    }
                    className={inputCls + " font-medium"}
                    placeholder="Username"
                  />
                  <input
                    value={formData.role}
                    onChange={(e) =>
                      setFormData({ ...formData, role: e.target.value })
                    }
                    className={inputCls}
                    placeholder="Role"
                  />
                </div>
              ) : (
                <>
                  <h2 className="text-[15px] font-semibold text-slate-900 dark:text-[#ececec] truncate">
                    {user.user_name}
                  </h2>
                  <p className="text-[12px] text-slate-500 dark:text-[#8a8a8a] mt-0.5">
                    {user.role || "User"}
                  </p>
                  {/* badges */}
                  <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium bg-slate-100 dark:bg-[#333] text-slate-600 dark:text-[#aaa]">
                      <Factory size={9} />
                      {user.factory || "No Factory"}
                    </span>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium bg-slate-100 dark:bg-[#333] text-slate-600 dark:text-[#aaa]">
                      <Building2 size={9} />
                      {user.assigned_building || "No Building"}
                    </span>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 dark:bg-emerald-500" />
                      Active
                    </span>
                  </div>
                </>
              )}
            </div>

            {/* action buttons */}
            <div className="flex items-center gap-1.5 flex-shrink-0">
              {isEditing ? (
                <>
                  <button
                    onClick={() => setIsEditing(false)}
                    className="h-8 px-3 rounded-lg text-[12px] font-medium text-slate-500 dark:text-[#aaa] bg-slate-100 dark:bg-[#333] hover:bg-slate-200 dark:hover:bg-[#3d3d3d] transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="h-8 px-3 rounded-lg text-[12px] font-medium text-white dark:text-[#1a1a1a] bg-slate-800 dark:bg-[#e0e0e0] hover:bg-slate-700 dark:hover:bg-white disabled:opacity-50 transition-all flex items-center gap-1.5"
                  >
                    {isSaving ? (
                      <div className="w-3 h-3 border border-white/40 dark:border-[#1a1a1a]/40 border-t-white dark:border-t-[#1a1a1a] rounded-full animate-spin" />
                    ) : (
                      <Check size={12} />
                    )}
                    Save
                  </button>
                </>
              ) : (
                <button
                  onClick={() => setIsEditing(true)}
                  className="h-8 px-3 rounded-lg text-[12px] font-medium text-slate-600 dark:text-[#aaa] bg-slate-100 dark:bg-[#333] hover:bg-slate-200 dark:hover:bg-[#3d3d3d] transition-all flex items-center gap-1.5"
                >
                  <Pencil size={11} />
                  Edit
                </button>
              )}
            </div>
          </div>

          {/* edit dropdowns row (only when editing) */}
          {isEditing && (
            <div className="px-5 py-4 grid grid-cols-2 gap-3 border-b border-slate-100 dark:border-white/[0.07]">
              <Field label="Factory" icon={Factory}>
                <select
                  value={formData.factory}
                  onChange={(e) => setFormData({ ...formData, factory: e.target.value })}
                  className={inputCls}
                >
                  <option value="">Select factory</option>
                  {FACTORIES.map((f) => (
                    <option key={f}>{f}</option>
                  ))}
                </select>
              </Field>
              <Field label="Building" icon={Building2}>
                <select
                  value={formData.assigned_building}
                  onChange={(e) =>
                    setFormData({ ...formData, assigned_building: e.target.value })
                  }
                  className={inputCls}
                >
                  <option value="">Select building</option>
                  {BUILDINGS.map((b) => (
                    <option key={b}>{b}</option>
                  ))}
                </select>
              </Field>
            </div>
          )}

          {/* bottom action row */}
          <div className="flex items-center gap-1 px-5 py-3">
            <button
              onClick={() => setShowPasswordModal(true)}
              className="flex items-center gap-1.5 h-7 px-3 rounded-lg text-[12px] text-slate-500 dark:text-[#8a8a8a] hover:bg-slate-100 dark:hover:bg-white/[0.06] hover:text-slate-700 dark:hover:text-[#ececec] transition-all"
            >
              <KeyRound size={12} />
              Change password
            </button>
            <div className="flex-1" />
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 h-7 px-3 rounded-lg text-[12px] text-slate-400 dark:text-[#666] hover:bg-red-50 dark:hover:bg-red-950/20 hover:text-red-500 dark:hover:text-red-400 transition-all"
            >
              <LogOut size={12} />
              Sign out
            </button>
          </div>
        </div>

        {/* ── ACCOUNT DETAILS CARD ─────────────────────────────────────── */}
        <div className="bg-white dark:bg-[#252525] border border-slate-200/80 dark:border-white/[0.08] rounded-2xl overflow-hidden shadow-sm dark:shadow-none">
          <div className="px-5 py-4 border-b border-slate-100 dark:border-white/[0.07]">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-400 dark:text-[#666]">
              Account Details
            </p>
          </div>

          <div className="divide-y divide-slate-100 dark:divide-white/[0.05]">
            {[
              { icon: Hash,        label: "User ID",      value: `#${user.id}` },
              { icon: User,        label: "Username",     value: user.user_name },
              { icon: ShieldCheck, label: "Role",         value: user.role || "User" },
              { icon: Factory,     label: "Factory",      value: user.factory || "—" },
              { icon: Building2,   label: "Building",     value: user.assigned_building || "—" },
              { icon: Calendar,    label: "Member since", value: createdDate },
              { icon: Clock,       label: "Created at",   value: createdTime },
            ].map(({ icon: Icon, label, value }) => (
              <div key={label} className="flex items-center gap-3 px-5 py-3">
                <div className="w-7 h-7 rounded-lg bg-slate-50 dark:bg-[#2f2f2f] flex items-center justify-center flex-shrink-0">
                  <Icon size={13} className="text-slate-400 dark:text-[#666]" />
                </div>
                <span className="text-[12px] text-slate-500 dark:text-[#8a8a8a] flex-shrink-0 w-28">
                  {label}
                </span>
                <span className="text-[13px] font-medium text-slate-800 dark:text-[#d4d4d4] truncate">
                  {value}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── PASSWORD MODAL ─────────────────────────────────────────────── */}
      <Modal
        open={showPasswordModal}
        onClose={() => {
          setShowPasswordModal(false);
          setPasswordData({ current_password: "", new_password: "", confirm_password: "" });
          setPasswordError("");
          setPasswordSuccess("");
        }}
        title="Change Password"
      >
        <div className="space-y-3">
          <div>
            <label className="block text-[11px] font-medium text-slate-500 dark:text-[#8a8a8a] mb-1.5">
              Current password
            </label>
            <PasswordInput
              value={passwordData.current_password}
              onChange={(e) =>
                setPasswordData({ ...passwordData, current_password: e.target.value })
              }
              placeholder="Enter current password"
            />
          </div>
          <div>
            <label className="block text-[11px] font-medium text-slate-500 dark:text-[#8a8a8a] mb-1.5">
              New password
            </label>
            <PasswordInput
              value={passwordData.new_password}
              onChange={(e) =>
                setPasswordData({ ...passwordData, new_password: e.target.value })
              }
              placeholder="Enter new password"
            />
          </div>
          <div>
            <label className="block text-[11px] font-medium text-slate-500 dark:text-[#8a8a8a] mb-1.5">
              Confirm new password
            </label>
            <PasswordInput
              value={passwordData.confirm_password}
              onChange={(e) =>
                setPasswordData({ ...passwordData, confirm_password: e.target.value })
              }
              placeholder="Confirm new password"
            />
          </div>

          {passwordError && (
            <p className="text-[12px] text-red-500 dark:text-red-400 flex items-center gap-1.5">
              <X size={12} />
              {passwordError}
            </p>
          )}
          {passwordSuccess && (
            <p className="text-[12px] text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
              <Check size={12} />
              {passwordSuccess}
            </p>
          )}

          <div className="flex gap-2 pt-1">
            <button
              onClick={() => {
                setShowPasswordModal(false);
                setPasswordData({ current_password: "", new_password: "", confirm_password: "" });
                setPasswordError("");
              }}
              className="flex-1 h-9 rounded-lg text-[13px] font-medium text-slate-500 dark:text-[#aaa] bg-slate-100 dark:bg-[#333] hover:bg-slate-200 dark:hover:bg-[#3d3d3d] transition-all"
            >
              Cancel
            </button>
            <button
              onClick={handlePasswordChange}
              disabled={isChangingPassword}
              className="flex-1 h-9 rounded-lg text-[13px] font-medium text-white dark:text-[#1a1a1a] bg-slate-800 dark:bg-[#e0e0e0] hover:bg-slate-700 dark:hover:bg-white disabled:opacity-50 transition-all flex items-center justify-center gap-2"
            >
              {isChangingPassword ? (
                <div className="w-3.5 h-3.5 border border-white/40 dark:border-[#1a1a1a]/40 border-t-white dark:border-t-[#1a1a1a] rounded-full animate-spin" />
              ) : null}
              Change
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}