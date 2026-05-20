// frontend/app/register/page.js

"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";

export default function RegisterPage() {
  const { register } = useAuth();
  const router = useRouter();
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [filePreview, setFilePreview] = useState(null);

  const fe = fieldErrors;
  const inputClass = (name) =>
    `w-full border px-3 py-2 rounded-lg transition-all focus:outline-none ${
      fe[name]
        ? "border-red-400 focus:ring-2 focus:ring-red-300 focus:border-red-400"
        : "border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
    } text-gray-800`;

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) { setFilePreview(null); return; }

    const validTypes = ["image/jpeg", "image/png", "image/webp"];
   

    if (!validTypes.includes(file.type)) {
      alert("শুধু JPG, PNG, বা WEBP image দিন।");
      e.target.value = "";
      return;
    }
    

    const reader = new FileReader();
    reader.onloadend = () => setFilePreview(reader.result);
    reader.readAsDataURL(file);
  };

  async function onSubmit(e) {
    e.preventDefault();
    setIsLoading(true);
    setError("");
    setFieldErrors({});

    try {
      const formData = new FormData(e.currentTarget);
      const payload = {
        user_name: formData.get("user_name"),
        password: formData.get("password"),
        role: formData.get("role"),
        assigned_building: formData.get("assigned_building"),
        factory: formData.get("factory"),
        profile_picture: filePreview || null,
      };

      await register(payload);
      router.push("/dashboard");
    } catch (err) {
      if (err.message === "Username already taken") {
        setFieldErrors({ user_name: true });
      }
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <section className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-indigo-100 px-4">
      <div className="bg-white shadow-2xl rounded-2xl w-full max-w-4xl border border-gray-100 flex flex-col md:flex-row overflow-hidden">

        {/* LEFT: Illustration */}
        <div className="hidden md:flex w-1/2 items-center justify-center bg-indigo-50 p-8">
          <Image
            src="/Sign up-rafiki.svg"
            alt="Sign up illustration"
            width={420}
            height={420}
            className="w-full h-auto max-w-sm"
            priority
          />
        </div>

        {/* RIGHT: Form */}
        <div className="w-full md:w-1/2 p-8 flex flex-col justify-center">
          <div className="text-center mb-6">
            <h1 className="text-3xl font-extrabold text-gray-800">Create Your Account</h1>
            <p className="text-sm text-gray-500 mt-2">Join HKD Outdoor Innovations Ltd.</p>
          </div>

          {error && (
            <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          )}

          <form onSubmit={onSubmit} className="space-y-5">
            {/* User Name */}
            <div>
              <label htmlFor="user_name" className="block text-sm font-medium text-gray-700 mb-1">
                User Name
              </label>
              <input
                type="text"
                id="user_name"
                name="user_name"
                disabled={isLoading}
                className={inputClass("user_name")}
                placeholder="Enter your name"
                minLength={3}
                required
              />
              {fe.user_name && (
                <p className="mt-1 text-xs text-red-600">এই User Name আগে থেকেই আছে।</p>
              )}
            </div>

            {/* Password */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                Password
              </label>
              <input
                type="password"
                id="password"
                name="password"
                disabled={isLoading}
                className={inputClass("password")}
                placeholder="••••••••"
                required
                minLength={6}
              />
            </div>

            {/* Role */}
            <div>
              <label htmlFor="role" className="block text-sm font-medium text-gray-700 mb-1">
                Role
              </label>
              <input
                type="text"
                id="role"
                name="role"
                disabled={isLoading}
                className={inputClass("role")}
                placeholder="Enter your role"
                required
              />
            </div>

            {/* Assigned Building */}
            <div>
              <label htmlFor="assigned_building" className="block text-sm font-medium text-gray-700 mb-1">
                Assigned Floor
              </label>
              <select
                id="assigned_building"
                name="assigned_building"
                disabled={isLoading}
                className={inputClass("assigned_building")}
                required
              >
                <option value="">Select a building</option>
                <option value="A-2">A-2</option>
                <option value="B-2">B-2</option>
                <option value="A-3">A-3</option>
                <option value="B-3">B-3</option>
                <option value="A-4">A-4</option>
                <option value="B-4">B-4</option>
                <option value="A-5">A-5</option>
                <option value="B-5">B-5</option>
              </select>
            </div>

            {/* Factory */}
            <div>
              <label htmlFor="factory" className="block text-sm font-medium text-gray-700 mb-1">
                Factory
              </label>
              <select
                id="factory"
                name="factory"
                disabled={isLoading}
                className={inputClass("factory")}
                required
              >
                <option value="">Select a factory</option>
                <option value="K-1">K-1</option>
                <option value="K-2">K-2</option>
                <option value="K-3">K-3</option>
              </select>
            </div>

            {/* Profile Picture */}
            <div>
              <label htmlFor="profile_picture" className="block text-sm font-medium text-gray-700 mb-1">
                Profile Picture (Optional)
              </label>
              <input
                type="file"
                id="profile_picture"
                name="profile_picture"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleFileChange}
                disabled={isLoading}
                className={inputClass("profile_picture")}
              />
              {filePreview && (
                <div className="mt-3">
                  <p className="text-xs text-gray-600 mb-2">Preview:</p>
                  <div className="relative w-24 h-24 rounded-lg overflow-hidden border-2 border-gray-200">
                    <Image src={filePreview} alt="Preview" fill className="object-cover" />
                  </div>
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-70 disabled:cursor-not-allowed text-white font-semibold rounded-lg py-2 transition-all duration-300 shadow-md hover:shadow-lg flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Creating Account...
                </>
              ) : "Create Account"}
            </button>
          </form>

          <div className="mt-6 text-center text-sm text-gray-600">
            Already have an account?{" "}
            <Link href="/login" className="text-indigo-600 font-medium hover:underline">
              Login here
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}