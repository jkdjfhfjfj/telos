import { useState } from "react";
import { useClerk, useAuth } from "@clerk/react";
import { useGetMe } from "@workspace/api-client-react";
import { useLocation } from "wouter";
import { Shield, Eye, EyeOff, Lock, ArrowLeft } from "lucide-react";
import { SignIn } from "@clerk/react";

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

export default function AdminLoginPage() {
  const { isLoaded, isSignedIn } = useAuth();
  const { data: user, isLoading: userLoading } = useGetMe({ query: { enabled: isSignedIn } as any });
  const { signOut } = useClerk();
  const [, setLocation] = useLocation();

  if (!isLoaded || (isSignedIn && userLoading)) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (isSignedIn && user?.role === "admin") {
    setLocation("/admin");
    return null;
  }

  if (isSignedIn && user && user.role !== "admin") {
    return (
      <div className="min-h-screen bg-[#0a0a0a] text-white flex items-center justify-center px-4">
        <div className="w-full max-w-sm text-center">
          <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/30 flex items-center justify-center mx-auto mb-6">
            <Lock className="w-8 h-8 text-red-400" />
          </div>
          <h1 className="text-2xl font-bold mb-2">Access Denied</h1>
          <p className="text-gray-400 text-sm mb-8">
            Your account (<span className="text-white font-medium">{user.email}</span>) does not have admin privileges.
          </p>
          <div className="space-y-3">
            <button
              onClick={() => signOut()}
              className="w-full py-3 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 font-semibold hover:bg-cyan-500/20 transition-colors"
            >
              Sign in with a different account
            </button>
            <button
              onClick={() => setLocation("/dashboard")}
              className="w-full py-3 rounded-xl bg-white/5 border border-white/10 text-gray-300 font-medium hover:bg-white/10 transition-colors"
            >
              Return to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white flex flex-col">
      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-sm">
          <div className="text-center mb-8">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-cyan-400 to-purple-600 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-cyan-500/20">
              <Shield className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold mb-1">Admin Portal</h1>
            <p className="text-gray-400 text-sm">Sign in with your admin credentials</p>
          </div>

          <div className="bg-[#111] border border-white/10 rounded-2xl overflow-hidden">
            <SignIn
              routing="hash"
              signUpUrl={`${basePath}/sign-up`}
              forceRedirectUrl={`${basePath}/admin`}
            />
          </div>

          <div className="mt-6 text-center">
            <button
              onClick={() => setLocation("/")}
              className="flex items-center gap-2 text-gray-500 hover:text-gray-300 text-sm transition-colors mx-auto"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to main site
            </button>
          </div>
        </div>
      </div>

      <footer className="text-center py-4 text-gray-600 text-xs border-t border-white/5">
        Telos Wallet Admin &mdash; Authorized access only
      </footer>
    </div>
  );
}
