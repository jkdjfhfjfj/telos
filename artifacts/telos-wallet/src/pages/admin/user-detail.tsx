import { useState } from "react";
import { useAdminGetUser, useAdminUpdateUser, getAdminGetUserQueryKey } from "@workspace/api-client-react";
import { useRoute, useLocation } from "wouter";
import { AdminLayout } from "@/components/layout";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft, Edit2, Copy, Shield, ShieldOff, Trash2, RefreshCw,
  ArrowUpRight, ArrowDownLeft, Clock, CheckCircle2, XCircle,
  Wallet, ArrowRightLeft, AlertTriangle, ChevronDown, ChevronUp,
} from "lucide-react";

const TLOS_RATE = 0.01425;

async function adminFetch(path: string, opts?: RequestInit) {
  const res = await fetch(`/api${path}`, {
    ...opts,
    headers: { "Content-Type": "application/json", ...opts?.headers },
  });
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || res.statusText);
  return res.json();
}

const statusColors: Record<string, string> = {
  confirmed: "text-green-400",
  pending: "text-yellow-400",
  failed: "text-red-400",
};

const wStatusConfig: Record<string, { color: string; icon: React.ReactElement }> = {
  pending: { color: "text-yellow-400 bg-yellow-500/10", icon: <Clock className="w-3 h-3" /> },
  approved: { color: "text-green-400 bg-green-500/10", icon: <CheckCircle2 className="w-3 h-3" /> },
  rejected: { color: "text-red-400 bg-red-500/10", icon: <XCircle className="w-3 h-3" /> },
};

export default function AdminUserDetailPage() {
  const [, params] = useRoute("/admin/users/:id");
  const userId = params?.id || "";
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: user, isLoading } = useAdminGetUser(userId, { query: { enabled: !!userId } as any });

  const [editingWallet, setEditingWallet] = useState<any>(null);
  const [newTlos, setNewTlos] = useState("");
  const [note, setNote] = useState("");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showTxs, setShowTxs] = useState(true);
  const [showWithdrawals, setShowWithdrawals] = useState(true);

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
    mutationFn: ({ walletId, balanceTlos, note }: any) =>
      adminFetch(`/admin/wallets/${walletId}/balance`, {
        method: "PATCH",
        body: JSON.stringify({ balanceTlos, note }),
      }),
    onSuccess: () => {
      toast({ title: "Balance updated!" });
      queryClient.invalidateQueries({ queryKey: getAdminGetUserQueryKey(userId) });
      setEditingWallet(null);
      setNewTlos(""); setNote("");
    },
    onError: (err: any) => toast({ title: "Failed", description: err.message, variant: "destructive" }),
  });

  const reset2FA = useMutation({
    mutationFn: () => adminFetch(`/admin/users/${userId}/reset-2fa`, { method: "POST" }),
    onSuccess: () => {
      toast({ title: "2FA reset", description: "User's 2FA has been disabled." });
      queryClient.invalidateQueries({ queryKey: getAdminGetUserQueryKey(userId) });
    },
    onError: (err: any) => toast({ title: "Failed", description: err.message, variant: "destructive" }),
  });

  const deleteUser = useMutation({
    mutationFn: () => adminFetch(`/admin/users/${userId}`, { method: "DELETE" }),
    onSuccess: () => {
      toast({ title: "User deleted" });
      setLocation("/admin/users");
    },
    onError: (err: any) => toast({ title: "Failed", description: err.message, variant: "destructive" }),
  });

  const copy = (text: string, label = "Copied") => {
    navigator.clipboard.writeText(text);
    toast({ title: `${label} copied!` });
  };

  const userWallets = (user as any)?.wallets ?? [];
  const userTxs = (user as any)?.transactions ?? [];
  const userWithdrawals = (user as any)?.withdrawals ?? [];
  const computedUsd = newTlos ? (parseFloat(newTlos) * TLOS_RATE).toFixed(2) : null;

  return (
    <AdminLayout>
      <button onClick={() => setLocation("/admin/users")} className="flex items-center gap-2 text-gray-400 hover:text-white text-sm mb-6">
        <ArrowLeft className="w-4 h-4" /> Back to Users
      </button>

      {/* Edit Balance Modal */}
      {editingWallet && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
          <div className="bg-[#1a1a1a] rounded-2xl p-6 w-full max-w-sm border border-white/10">
            <h3 className="font-bold text-lg mb-1">Update Wallet Balance</h3>
            <p className="text-sm text-gray-500 mb-4">{editingWallet.label}</p>
            <div className="bg-[#111] rounded-xl p-3 mb-4 text-center">
              <p className="text-xs text-gray-500">Current Balance</p>
              <p className="text-2xl font-bold text-cyan-400">{parseFloat(editingWallet.balanceTlos).toFixed(4)} TLOS</p>
              <p className="text-xs text-gray-500">${(parseFloat(editingWallet.balanceTlos) * TLOS_RATE).toFixed(2)} USD</p>
            </div>
            <div className="space-y-3 mb-4">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">New TLOS Balance</label>
                <input
                  type="number" step="any" value={newTlos}
                  onChange={e => setNewTlos(e.target.value)}
                  placeholder="e.g. 1000"
                  className="w-full bg-[#111] border border-white/10 rounded-xl px-4 py-3 text-white outline-none"
                />
                {computedUsd && (
                  <p className="text-xs text-cyan-400 mt-1">≈ ${computedUsd} USD @ ${TLOS_RATE}/TLOS</p>
                )}
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Note (optional)</label>
                <input
                  value={note} onChange={e => setNote(e.target.value)}
                  placeholder="e.g. Deposit, Bonus, Refund..."
                  className="w-full bg-[#111] border border-white/10 rounded-xl px-4 py-3 text-white outline-none"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => updateBalance.mutate({ walletId: editingWallet.id, balanceTlos: newTlos || undefined, note: note || undefined })}
                disabled={updateBalance.isPending || !newTlos}
                className="flex-1 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-purple-600 text-white font-bold text-sm disabled:opacity-40"
              >
                {updateBalance.isPending ? "Updating..." : "Update Balance"}
              </button>
              <button onClick={() => setEditingWallet(null)} className="px-4 py-3 rounded-xl bg-[#222] text-gray-400 text-sm">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
          <div className="bg-[#1a1a1a] rounded-2xl p-6 w-full max-w-sm border border-red-500/20">
            <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-4">
              <Trash2 className="w-6 h-6 text-red-400" />
            </div>
            <h3 className="font-bold text-lg text-center mb-2">Delete User?</h3>
            <p className="text-sm text-gray-400 text-center mb-6">
              This will permanently delete <span className="text-white font-semibold">{(user as any)?.email}</span> and all their wallets, transactions, and withdrawal history. This cannot be undone.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => deleteUser.mutate()}
                disabled={deleteUser.isPending}
                className="flex-1 py-3 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-sm disabled:opacity-40"
              >
                {deleteUser.isPending ? "Deleting..." : "Yes, Delete"}
              </button>
              <button onClick={() => setShowDeleteConfirm(false)} className="flex-1 py-3 rounded-xl bg-[#222] text-gray-400 text-sm">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-32 w-full rounded-2xl bg-white/5" />)}
        </div>
      ) : user ? (
        <div className="space-y-6">
          {/* User Card */}
          <div className="bg-[#1a1a1a] rounded-2xl p-6 border border-white/5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h1 className="text-xl font-bold mb-0.5">{(user as any).displayName || (user as any).email}</h1>
                <p className="text-gray-500 text-sm">{(user as any).email}</p>
                <p className="text-xs text-gray-600 mt-0.5">Joined {new Date((user as any).createdAt).toLocaleDateString()}</p>
              </div>
              <div className="flex gap-2 flex-wrap justify-end">
                <span className={`text-xs font-semibold px-3 py-1.5 rounded-full ${(user as any).role === "admin" ? "bg-cyan-500/20 text-cyan-400" : "bg-gray-700/50 text-gray-400"}`}>
                  {(user as any).role}
                </span>
                <span className={`text-xs font-semibold px-3 py-1.5 rounded-full ${(user as any).status === "active" ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"}`}>
                  {(user as any).status}
                </span>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-4 gap-3 mt-5">
              {[
                { label: "Wallets", value: userWallets.length, icon: <Wallet className="w-3.5 h-3.5" />, color: "text-cyan-400" },
                { label: "Transactions", value: userTxs.length, icon: <ArrowRightLeft className="w-3.5 h-3.5" />, color: "text-purple-400" },
                { label: "Withdrawals", value: userWithdrawals.length, icon: <AlertTriangle className="w-3.5 h-3.5" />, color: "text-yellow-400" },
                { label: "2FA", value: (user as any).twoFactorEnabled ? "On" : "Off", icon: <Shield className="w-3.5 h-3.5" />, color: (user as any).twoFactorEnabled ? "text-green-400" : "text-gray-500" },
              ].map(({ label, value, icon, color }) => (
                <div key={label} className="bg-[#111] rounded-xl p-3 text-center">
                  <div className={`flex items-center justify-center gap-1 ${color} mb-1`}>{icon}</div>
                  <p className={`text-lg font-bold ${color}`}>{value}</p>
                  <p className="text-xs text-gray-600 mt-0.5">{label}</p>
                </div>
              ))}
            </div>

            {/* Controls */}
            <div className="flex flex-wrap gap-2 mt-5 pt-4 border-t border-white/5">
              <button
                onClick={() => updateUser.mutate({ userId, data: { status: (user as any).status === "active" ? "suspended" : "active" } })}
                disabled={updateUser.isPending}
                className={`flex items-center gap-1.5 text-xs px-3 py-2 rounded-xl font-semibold transition-colors ${(user as any).status === "active" ? "bg-red-500/10 text-red-400 hover:bg-red-500/20" : "bg-green-500/10 text-green-400 hover:bg-green-500/20"}`}
              >
                {(user as any).status === "active" ? <><ShieldOff className="w-3.5 h-3.5" /> Suspend</> : <><Shield className="w-3.5 h-3.5" /> Activate</>}
              </button>
              {(user as any).role !== "admin" ? (
                <button
                  onClick={() => updateUser.mutate({ userId, data: { role: "admin" } })}
                  disabled={updateUser.isPending}
                  className="flex items-center gap-1.5 text-xs bg-cyan-500/10 text-cyan-400 hover:bg-cyan-500/20 px-3 py-2 rounded-xl font-semibold"
                >
                  <Shield className="w-3.5 h-3.5" /> Make Admin
                </button>
              ) : (
                <button
                  onClick={() => updateUser.mutate({ userId, data: { role: "user" } })}
                  disabled={updateUser.isPending}
                  className="flex items-center gap-1.5 text-xs bg-gray-500/10 text-gray-400 hover:bg-gray-500/20 px-3 py-2 rounded-xl font-semibold"
                >
                  Remove Admin
                </button>
              )}
              {(user as any).twoFactorEnabled && (
                <button
                  onClick={() => reset2FA.mutate()}
                  disabled={reset2FA.isPending}
                  className="flex items-center gap-1.5 text-xs bg-orange-500/10 text-orange-400 hover:bg-orange-500/20 px-3 py-2 rounded-xl font-semibold"
                >
                  <RefreshCw className="w-3.5 h-3.5" /> Reset 2FA
                </button>
              )}
              {(user as any).role !== "admin" && (
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="flex items-center gap-1.5 text-xs bg-red-500/10 text-red-500 hover:bg-red-500/20 px-3 py-2 rounded-xl font-semibold ml-auto"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Delete User
                </button>
              )}
            </div>
          </div>

          {/* Wallets */}
          <div>
            <h2 className="text-base font-bold mb-3 flex items-center gap-2">
              <Wallet className="w-4 h-4 text-cyan-400" /> Wallets ({userWallets.length})
            </h2>
            <div className="space-y-3">
              {userWallets.length === 0 ? (
                <p className="text-sm text-gray-600 bg-[#1a1a1a] rounded-2xl p-4">No wallets yet</p>
              ) : userWallets.map((w: any) => (
                <div key={w.id} className="bg-[#1a1a1a] rounded-2xl p-4 border border-white/5">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="font-bold">{w.label}</p>
                      <p className="text-xs text-gray-500 capitalize">{w.network}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-cyan-400">{parseFloat(w.balanceTlos).toFixed(4)} TLOS</p>
                      <p className="text-xs text-gray-500">${(parseFloat(w.balanceTlos) * TLOS_RATE).toFixed(2)}</p>
                    </div>
                  </div>
                  <div className="space-y-1.5 mb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-600 w-14 shrink-0">Zero</span>
                      <span className="font-mono text-xs text-cyan-400">{w.zeroAddress}</span>
                      <button onClick={() => copy(w.zeroAddress, "Zero address")} className="text-gray-600 hover:text-gray-300"><Copy className="w-3 h-3" /></button>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-600 w-14 shrink-0">EVM</span>
                      <span className="font-mono text-xs text-gray-400 truncate max-w-[180px]">{w.evmAddress}</span>
                      <button onClick={() => copy(w.evmAddress, "EVM address")} className="text-gray-600 hover:text-gray-300 shrink-0"><Copy className="w-3 h-3" /></button>
                    </div>
                  </div>
                  <button
                    onClick={() => { setEditingWallet(w); setNewTlos(w.balanceTlos); setNote(""); }}
                    className="flex items-center gap-1.5 text-xs bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 px-3 py-1.5 rounded-lg hover:bg-cyan-500/20"
                  >
                    <Edit2 className="w-3 h-3" /> Update Balance
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Transactions */}
          <div>
            <button
              className="w-full flex items-center justify-between mb-3"
              onClick={() => setShowTxs(!showTxs)}
            >
              <h2 className="text-base font-bold flex items-center gap-2">
                <ArrowRightLeft className="w-4 h-4 text-purple-400" /> Transactions ({userTxs.length})
              </h2>
              {showTxs ? <ChevronUp className="w-4 h-4 text-gray-500" /> : <ChevronDown className="w-4 h-4 text-gray-500" />}
            </button>
            {showTxs && (
              <div className="bg-[#111] rounded-2xl overflow-hidden border border-white/5">
                {userTxs.length === 0 ? (
                  <p className="text-sm text-gray-600 p-4">No transactions yet</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead className="bg-[#1a1a1a]">
                        <tr>
                          <th className="text-left px-3 py-2.5 text-gray-500 font-medium">Type</th>
                          <th className="text-left px-3 py-2.5 text-gray-500 font-medium">Amount</th>
                          <th className="text-left px-3 py-2.5 text-gray-500 font-medium">To/From</th>
                          <th className="text-left px-3 py-2.5 text-gray-500 font-medium">Note</th>
                          <th className="text-left px-3 py-2.5 text-gray-500 font-medium">Status</th>
                          <th className="text-left px-3 py-2.5 text-gray-500 font-medium">Date</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/3">
                        {userTxs.map((tx: any) => {
                          const isCredit = tx.fromAddress === "admin";
                          return (
                            <tr key={tx.id} className="hover:bg-white/2">
                              <td className="px-3 py-2.5">
                                <div className={`w-6 h-6 rounded-full flex items-center justify-center ${isCredit ? "bg-green-600/15" : "bg-red-600/15"}`}>
                                  {isCredit
                                    ? <ArrowDownLeft className="w-3 h-3 text-green-400" />
                                    : <ArrowUpRight className="w-3 h-3 text-red-400" />
                                  }
                                </div>
                              </td>
                              <td className="px-3 py-2.5 font-bold">{tx.amount} <span className="text-gray-500 font-normal">{tx.currency}</span></td>
                              <td className="px-3 py-2.5">
                                <span className="font-mono text-gray-400">
                                  {isCredit
                                    ? `From: admin`
                                    : `To: ${tx.toAddress.slice(0, 10)}...`
                                  }
                                </span>
                              </td>
                              <td className="px-3 py-2.5 text-gray-500 italic max-w-[120px] truncate">{tx.memo || "—"}</td>
                              <td className="px-3 py-2.5">
                                <span className={`font-semibold ${statusColors[tx.status] || "text-gray-400"}`}>{tx.status}</span>
                              </td>
                              <td className="px-3 py-2.5 text-gray-500">{new Date(tx.createdAt).toLocaleDateString()}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Withdrawals */}
          <div>
            <button
              className="w-full flex items-center justify-between mb-3"
              onClick={() => setShowWithdrawals(!showWithdrawals)}
            >
              <h2 className="text-base font-bold flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-yellow-400" /> Withdrawal History ({userWithdrawals.length})
              </h2>
              {showWithdrawals ? <ChevronUp className="w-4 h-4 text-gray-500" /> : <ChevronDown className="w-4 h-4 text-gray-500" />}
            </button>
            {showWithdrawals && (
              <div className="space-y-2">
                {userWithdrawals.length === 0 ? (
                  <p className="text-sm text-gray-600 bg-[#111] rounded-2xl p-4">No withdrawals yet</p>
                ) : userWithdrawals.map((w: any) => {
                  const sc = wStatusConfig[w.status];
                  return (
                    <div key={w.id} className="bg-[#1a1a1a] rounded-xl p-3 border border-white/5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${sc?.color}`}>
                            {sc?.icon} {w.status}
                          </span>
                          <span className="font-bold text-sm">{parseFloat(w.amount).toFixed(4)} TLOS</span>
                        </div>
                        <span className="text-xs text-gray-600">{new Date(w.createdAt).toLocaleDateString()}</span>
                      </div>
                      <p className="font-mono text-xs text-gray-500 mt-1.5">
                        To: {w.toAddress.slice(0, 16)}...{w.toAddress.slice(-6)} · {w.network?.toUpperCase()}
                      </p>
                      {w.adminNote && <p className="text-xs text-gray-500 italic mt-1">Note: {w.adminNote}</p>}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="text-center py-16 text-gray-600">User not found</div>
      )}
    </AdminLayout>
  );
}
