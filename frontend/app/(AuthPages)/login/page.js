// frontend/app/login/page.js

"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/app/provider/AuthProvider";

export default function LoginPage() {
  const { login } = useAuth();
  const router = useRouter();
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    setIsLoading(true);
    setError("");
    try {
      const formData = new FormData(e.currentTarget);
      await login(formData.get("user_name"), formData.get("password"));
      router.push("/dashboard");
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <section className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-100 to-indigo-100 px-4">
      <div className="bg-white shadow-2xl rounded-2xl w-full max-w-4xl overflow-hidden flex flex-col md:flex-row">

        {/* LEFT: Illustration */}
        <div className="w-full md:w-1/2 bg-indigo-50 flex items-center justify-center p-8">
          <Image
            src="/Computer login-amico.svg"
            alt="Login illustration"
            width={420}
            height={420}
            className="w-full h-auto max-w-sm"
            priority
          />
        </div>

        {/* RIGHT: Form */}
        <div className="w-full md:w-1/2 p-8 flex flex-col justify-center">
          <div className="flex flex-col items-center mb-6">
            <Image
              src="/HKD_LOGO.png"
              alt="HKD Logo"
              width={80}
              height={80}
              className="rounded-3xl mb-3 shadow-md"
              priority
            />
            <h1 className="text-xl text-indigo-600 font-extrabold text-center">
              HKD Outdoor Innovations Ltd.
            </h1>
          </div>

          <h2 className="text-3xl font-bold text-center text-gray-800 mb-6">
            Sign In
          </h2>

          {error && (
            <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          )}

          <form onSubmit={onSubmit} className="space-y-5">
            <div>
              <label htmlFor="user_name" className="block text-sm font-medium text-gray-700 mb-1">
                User Name
              </label>
              <input
                type="text"
                id="user_name"
                name="user_name"
                disabled={isLoading}
                className="w-full border text-black border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:outline-none rounded-lg px-3 py-2 disabled:opacity-60 disabled:cursor-not-allowed"
                placeholder="Enter your username"
                required
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                Password
              </label>
              <input
                type="password"
                id="password"
                name="password"
                disabled={isLoading}
                className="w-full border border-gray-300 focus:ring-2 focus:ring-indigo-500 text-black focus:outline-none rounded-lg px-3 py-2 disabled:opacity-60 disabled:cursor-not-allowed"
                placeholder="••••••••"
                required
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-70 disabled:cursor-not-allowed text-white font-semibold rounded-lg py-2 transition-all duration-200 flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Logging in...
                </>
              ) : "Login"}
            </button>
          </form>

          <p className="text-center text-sm text-gray-500 mt-6">
            Don't have an account?{" "}
            <Link href="/register" className="text-indigo-600 hover:text-indigo-800 font-medium">
              Register
            </Link>
          </p>
        </div>
      </div>
    </section>
  );
}