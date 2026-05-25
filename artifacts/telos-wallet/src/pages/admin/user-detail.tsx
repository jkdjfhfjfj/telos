import { useState } from "react";
import { useAdminGetUser, useAdminUpdateUser, getAdminGetUserQueryKey } from "@workspace/api-client-react";
import { useRoute, useLocation } from "wouter";
import { AdminLayout } from "@/components/layout";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Edit2, Copy, Shield, ShieldOff } from "lucide-react";

async function adminFetch(path: string, opts?: RequestInit) {
  const res = await fetch(`/api${path}`, {
    ...opts,
    headers: { "Content-Type": "application/json", ...opts?.headers },
  });
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || res.statusText);
  return res.json();
}

export default function AdminUserDetailPage() {
  const [, params] = useRoute("/admin/users/:id");
  const userId = params?.id || "";
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: user, isLoading } = useAdminGetUser(userId, { query: { enabled: !!userId } as any });

  const [editingWallet, setEditingWallet] = useState<any>(null);
  const [newTlos, setNewTlos] = useState("");
  const [newUsd, setNewUsd] = useState("");
  const [note, setNote] = useState("");

  const updateUser = useAdminUpdateUser({
    mutation: {
      onSuccess: () => {
        toast({ title: "User updated" });
        queryClient.invalidateQueries({ queryKey: getAdminGetUserQueryKey(userId) });
      },
      onError: (err: any) => toast({ title: "Failed", description: err.message, variant: "destructive" })
    }
  });

  const updateBalance = useMutation({
    mutationFn: ({ walletId, balanceTlos, balanceUsd, note }: any) =>
      adminFetch(`/admin/wallets/${walletId}/balance`, { method: "PATCH", body: JSON.stringify({ balanceTlos, balanceUsd, note }) }),
    onSuccess: () => {
      toast({ title: "Balance updated!" });
      queryClient.invalidateQueries({ queryKey: getAdminGetUserQueryKey(userId) });
      setEditingWallet(null);
      setNewTlos(""); setNewUsd(""); setNote("");
    },
    onError: (err: any) => toast({ title: "Failed", description: err.message, variant: "destructive" }),
  });

  const copy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: `${label} copied!` });
  };

  const userWallets = (user as any)?.wallets ?? [];

  return (
    <AdminLayout>
      <button onClick={() => setLocation("/admin/users")} className="flex items-center gap-2 text-gray-400 hover:text-white text-sm mb-6">
        <ArrowLeft className="w-4 h-4" /> Back to Users
      </button>

      {/* Edit Balance Modal */}
      {editingWallet && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <div className="bg-[#1a1a1a] rounded-2xl p-6 w-full max-w-sm border border-white/10">
            <h3 className="font-bold text-lg mb-1">Update Wallet Balance</h3>
            <p className="text-sm text-gray-500 mb-4">{editingWallet.label} · {editingWallet.zeroAddress}</p>
            <p className="text-sm mb-4">Current: <span className="text-cyan-400 font-bold">{editingWallet.balanceTlos} TLOS</span></p>
            <div className="space-y-3 mb-4">
              <input type="number" step="any" value={newTlos} onChange={e => setNewTlos(e.target.value)} placeholder="New TLOS balance" className="w-full bg-[#111] border border-white/10 rounded-xl px-4 py-3 text-white outline-none" />
              <input type="number" step="any" value={newUsd} onChange={e => setNewUsd(e.target.value)} placeholder="USD equivalent (optional)" className="w-full bg-[#111] border border-white/10 rounded-xl px-4 py-3 text-white outline-none" />
              <input value={note} onChange={e => setNote(e.target.value)} placeholder="Admin note (optional)" className="w-full bg-[#111] border border-white/10 rounded-xl px-4 py-3 text-white outline-none" />
            </div>
            <div className="flex gap-2">
              <button onClick={() => updateBalance.mutate({ walletId: editingWallet.id, balanceTlos: newTlos || undefined, balanceUsd: newUsd || undefined, note: note || undefined })} disabled={updateBalance.isPending || (!newTlos && !newUsd)} className="flex-1 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-purple-600 text-white font-bold text-sm disabled:opacity-40">
                {updateBalance.isPending ? "Updating..." : "Update"}
              </button>
              <button onClick={() => setEditingWallet(null)} className="px-4 py-3 rounded-xl bg-[#222] text-gray-400 text-sm">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-32 w-full rounded-2xl bg-white/5" />
          <Skeleton className="h-64 w-full rounded-2xl bg-white/5" />
        </div>
      ) : user ? (
        <div className="space-y-6">
          {/* User Card */}
          <div className="bg-[#1a1a1a] rounded-2xl p-6 border border-white/5">
            <div className="flex items-start justify-between">
              <div>
                <h1 className="text-2xl font-bold mb-1">{(user as any).displayName || (user as any).email}</h1>
                <p className="text-gray-500 text-sm">{(user as any).email}</p>
              </div>
              <div className="flex gap-2">
                <span className={`text-xs font-semibold px-3 py-1.5 rounded-full ${(user as any).role === "admin" ? "bg-cyan-500/20 text-cyan-400" : "bg-gray-700 text-gray-400"}`}>{(user as any).role}</span>
                <span className={`text-xs font-semibold px-3 py-1.5 rounded-full ${(user as any).status === "active" ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"}`}>{(user as any).status}</span>
              </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
              <div className="bg-[#111] rounded-xl p-3 text-center">
                <p className="text-2xl font-bold text-cyan-400">{(user as any).walletCount}</p>
                <p className="text-xs text-gray-500 mt-0.5">Wallets</p>
              </div>
              <div className="bg-[#111] rounded-xl p-3 text-center">
                <p className="text-2xl font-bold text-purple-400">{(user as any).transactionCount}</p>
                <p className="text-xs text-gray-500 mt-0.5">Transactions</p>
              </div>
              <div className="bg-[#111] rounded-xl p-3 text-center">
                <p className={`text-sm font-bold ${(user as any).twoFactorEnabled ? "text-green-400" : "text-gray-500"}`}>{(user as any).twoFactorEnabled ? "Enabled" : "Disabled"}</p>
                <p className="text-xs text-gray-500 mt-0.5">2FA</p>
              </div>
              <div className="bg-[#111] rounded-xl p-3 text-center">
                <p className="text-xs font-medium text-gray-300">{new Date((user as any).createdAt).toLocaleDateString()}</p>
                <p className="text-xs text-gray-500 mt-0.5">Joined</p>
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <button
                onClick={() => updateUser.mutate({ userId, data: { status: (user as any).status === "active" ? "suspended" : "active" } })}
                disabled={updateUser.isPending}
                className={`flex items-center gap-1.5 text-sm px-4 py-2 rounded-xl font-semibold ${(user as any).status === "active" ? "bg-red-500/15 text-red-400" : "bg-green-500/15 text-green-400"}`}
              >
                {(user as any).status === "active" ? <><ShieldOff className="w-4 h-4" /> Suspend</> : <><Shield className="w-4 h-4" /> Activate</>}
              </button>
              {(user as any).role !== "admin" && (
                <button onClick={() => updateUser.mutate({ userId, data: { role: "admin" } })} disabled={updateUser.isPending} className="text-sm bg-cyan-500/15 text-cyan-400 px-4 py-2 rounded-xl font-semibold">Make Admin</button>
              )}
            </div>
          </div>

          {/* Wallets */}
          <div>
            <h2 className="text-lg font-bold mb-3">Wallets ({userWallets.length})</h2>
            <div className="space-y-3">
              {userWallets.map((w: any) => (
                <div key={w.id} className="bg-[#1a1a1a] rounded-2xl p-4 border border-white/5">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="font-bold text-base">{w.label}</p>
                      <p className="text-xs text-gray-500 capitalize">{w.network}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-cyan-400 text-lg">{parseFloat(w.balanceTlos).toFixed(4)} TLOS</p>
                      <p className="text-xs text-gray-500">${parseFloat(w.balanceUsd).toFixed(2)}</p>
                    </div>
                  </div>
                  <div className="space-y-1.5 mb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-500 w-16 shrink-0">Zero:</span>
                      <span className="font-mono text-xs text-cyan-400">{w.zeroAddress}</span>
                      <button onClick={() => copy(w.zeroAddress, "Zero address")} className="text-gray-600"><Copy className="w-3 h-3" /></button>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-500 w-16 shrink-0">EVM:</span>
                      <span className="font-mono text-xs text-gray-400 truncate">{w.evmAddress}</span>
                      <button onClick={() => copy(w.evmAddress, "EVM address")} className="text-gray-600 shrink-0"><Copy className="w-3 h-3" /></button>
                    </div>
                  </div>
                  <button
                    onClick={() => { setEditingWallet(w); setNewTlos(w.balanceTlos); setNewUsd(w.balanceUsd); }}
                    className="flex items-center gap-1.5 text-xs bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 px-3 py-1.5 rounded-lg"
                  >
                    <Edit2 className="w-3 h-3" /> Update Balance
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="text-center py-16 text-gray-600">User not found</div>
      )}
    </AdminLayout>
  );
}
