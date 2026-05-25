import { useState } from "react";
import { Layout } from "@/components/layout";
import { useGetMe, useSetup2fa, useEnable2fa, useDisable2fa, getGetMeQueryKey } from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { useClerk } from "@clerk/react";
import { ChevronRight, Shield, LogOut, User, Copy } from "lucide-react";

export default function SettingsPage() {
  const { data: user } = useGetMe();
  const [isSettingUp, setIsSettingUp] = useState(false);
  const [code, setCode] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { signOut } = useClerk();

  const { data: setupData, refetch: setupRefetch } = useSetup2fa({ query: { enabled: false } as any });

  const enableMutation = useEnable2fa({
    mutation: {
      onSuccess: () => {
        toast({ title: "2FA Enabled!" });
        setIsSettingUp(false);
        setCode("");
        queryClient.invalidateQueries({ queryKey: getGetMeQueryKey() });
      },
      onError: (err: any) => toast({ title: "Failed", description: err.message, variant: "destructive" })
    }
  });

  const disableMutation = useDisable2fa({
    mutation: {
      onSuccess: () => {
        toast({ title: "2FA Disabled" });
        setCode("");
        queryClient.invalidateQueries({ queryKey: getGetMeQueryKey() });
      },
      onError: (err: any) => toast({ title: "Failed", description: err.message, variant: "destructive" })
    }
  });

  const handleStartSetup = () => {
    setIsSettingUp(true);
    setupRefetch();
  };

  return (
    <Layout>
      {/* Header */}
      <div className="px-4 pt-6 pb-4">
        <h1 className="text-xl font-bold">Settings</h1>
      </div>

      {/* Profile card */}
      <div className="mx-4 mb-4 bg-[#1a1a1a] rounded-2xl p-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-gradient-to-br from-cyan-500 to-purple-600 flex items-center justify-center">
            <User className="w-7 h-7 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-base truncate">{user?.displayName || user?.email?.split("@")[0] || "User"}</p>
            <p className="text-sm text-gray-500 truncate">{user?.email}</p>
            <span className={`inline-flex items-center gap-1 text-xs font-semibold mt-1 px-2 py-0.5 rounded-full ${
              user?.role === "admin" ? "bg-cyan-500/20 text-cyan-400" : "bg-gray-700 text-gray-400"
            }`}>
              {user?.role || "user"}
            </span>
          </div>
        </div>
      </div>

      {/* Security section */}
      <div className="mx-4 mb-4">
        <p className="text-xs text-gray-500 uppercase tracking-wider mb-2 px-1">Security</p>
        <div className="bg-[#1a1a1a] rounded-2xl overflow-hidden">
          {/* 2FA toggle row */}
          <div className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-9 h-9 rounded-full flex items-center justify-center ${user?.twoFactorEnabled ? "bg-green-600/20" : "bg-gray-700"}`}>
                <Shield className={`w-4 h-4 ${user?.twoFactorEnabled ? "text-green-400" : "text-gray-500"}`} />
              </div>
              <div>
                <p className="text-sm font-semibold">Two-Factor Auth (TOTP)</p>
                <p className={`text-xs mt-0.5 ${user?.twoFactorEnabled ? "text-green-400" : "text-gray-500"}`}>
                  {user?.twoFactorEnabled ? "Enabled & Active" : "Not enabled"}
                </p>
              </div>
            </div>
            {!user?.twoFactorEnabled && !isSettingUp && (
              <button onClick={handleStartSetup} className="text-xs bg-cyan-500/20 text-cyan-400 px-3 py-1.5 rounded-full font-semibold">
                Enable
              </button>
            )}
            {user?.twoFactorEnabled && (
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            )}
          </div>

          {/* 2FA setup panel */}
          {!user?.twoFactorEnabled && isSettingUp && setupData && (
            <div className="border-t border-white/5 p-4 space-y-4">
              <p className="text-sm font-semibold text-gray-300">Scan with your authenticator app:</p>
              <div className="bg-white p-3 rounded-xl w-fit mx-auto">
                <img src={(setupData as any).qrCodeDataUrl} alt="2FA QR" className="w-44 h-44" />
              </div>
              <div className="bg-[#111] rounded-xl p-3">
                <p className="text-xs text-gray-500 mb-1">Manual entry key:</p>
                <div className="flex items-center gap-2">
                  <p className="font-mono text-sm text-cyan-400 flex-1 select-all">{(setupData as any).secret}</p>
                  <button onClick={() => { navigator.clipboard.writeText((setupData as any).secret); toast({ title: "Key copied!" }); }}>
                    <Copy className="w-4 h-4 text-gray-500" />
                  </button>
                </div>
              </div>
              <div className="flex gap-2">
                <input
                  value={code}
                  onChange={e => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  placeholder="Enter 6-digit code"
                  maxLength={6}
                  className="flex-1 bg-[#111] border border-white/10 rounded-xl px-4 py-3 text-white font-mono text-center text-xl tracking-widest outline-none focus:border-cyan-500/50"
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => enableMutation.mutate({ data: { code } })}
                  disabled={code.length !== 6 || enableMutation.isPending}
                  className="flex-1 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-purple-600 text-white font-bold text-sm disabled:opacity-40"
                >
                  {enableMutation.isPending ? "Verifying..." : "Verify & Enable"}
                </button>
                <button onClick={() => { setIsSettingUp(false); setCode(""); }} className="px-4 py-3 rounded-xl bg-[#222] text-gray-400 text-sm">
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Disable 2FA */}
          {user?.twoFactorEnabled && (
            <div className="border-t border-white/5 p-4 space-y-3">
              <p className="text-xs text-gray-500">Enter a code from your authenticator app to disable 2FA:</p>
              <div className="flex gap-2">
                <input
                  value={code}
                  onChange={e => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  placeholder="000000"
                  maxLength={6}
                  className="flex-1 bg-[#111] border border-white/10 rounded-xl px-4 py-3 text-white font-mono text-center text-xl tracking-widest outline-none focus:border-red-500/50"
                />
                <button
                  onClick={() => disableMutation.mutate({ data: { code } })}
                  disabled={code.length !== 6 || disableMutation.isPending}
                  className="px-4 py-3 rounded-xl bg-red-600/20 border border-red-600/20 text-red-400 text-sm font-semibold disabled:opacity-40"
                >
                  Disable
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Account section */}
      <div className="mx-4 mb-4">
        <p className="text-xs text-gray-500 uppercase tracking-wider mb-2 px-1">Account</p>
        <div className="bg-[#1a1a1a] rounded-2xl overflow-hidden">
          <button
            onClick={() => signOut()}
            className="w-full flex items-center gap-3 p-4 text-red-400 hover:bg-red-500/5 transition-colors"
          >
            <LogOut className="w-5 h-5" />
            <span className="text-sm font-semibold">Sign Out</span>
          </button>
        </div>
      </div>

      {/* Version */}
      <div className="text-center py-6">
        <p className="text-xs text-gray-700">TelosWallet v1.0.0 · Powered by Telos Blockchain</p>
      </div>
    </Layout>
  );
}
