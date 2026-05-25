import React, { useState } from "react";
import { AdminLayout } from "@/components/layout";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, XCircle, Clock } from "lucide-react";

async function adminFetch(path: string, opts?: RequestInit) {
  const res = await fetch(`/api${path}`, {
    ...opts,
    headers: { "Content-Type": "application/json", ...opts?.headers },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || res.statusText);
  }
  return res.json();
}

type Withdrawal = {
  id: number; userId: number; walletId: number; amount: string; toAddress: string;
  network: string; status: string; adminNote: string | null; txHash: string | null;
  createdAt: string; processedAt: string | null;
  userEmail: string | null; walletLabel: string | null; walletEvmAddress: string | null; walletZeroAddress: string | null;
};

const statusIcons: Record<string, React.ReactElement> = {
  pending: <Clock className="w-4 h-4 text-yellow-400" />,
  approved: <CheckCircle2 className="w-4 h-4 text-green-400" />,
  rejected: <XCircle className="w-4 h-4 text-red-400" />,
};

const statusColors: Record<string, string> = {
  pending: "bg-yellow-500/15 text-yellow-400",
  approved: "bg-green-500/15 text-green-400",
  rejected: "bg-red-500/15 text-red-400",
};

export default function AdminWithdrawalsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<"all" | "pending" | "approved" | "rejected">("pending");
  const [actionModal, setActionModal] = useState<{ withdrawal: Withdrawal; action: "approve" | "reject" } | null>(null);
  const [adminNote, setAdminNote] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["admin-withdrawals", filter],
    queryFn: () => adminFetch(`/admin/withdrawals${filter !== "all" ? `?status=${filter}` : ""}?limit=100`),
  });

  const processWithdrawal = useMutation({
    mutationFn: ({ id, action, adminNote }: { id: number; action: string; adminNote: string }) =>
      adminFetch(`/admin/withdrawals/${id}`, { method: "PATCH", body: JSON.stringify({ action, adminNote }) }),
    onSuccess: (res, vars) => {
      toast({ title: vars.action === "approve" ? "Withdrawal Approved!" : "Withdrawal Rejected", description: vars.action === "approve" ? "Balance deducted and transaction recorded." : undefined });
      queryClient.invalidateQueries({ queryKey: ["admin-withdrawals"] });
      setActionModal(null);
      setAdminNote("");
    },
    onError: (err: any) => toast({ title: "Failed", description: err.message, variant: "destructive" }),
  });

  const withdrawals: Withdrawal[] = data?.withdrawals ?? [];

  return (
    <AdminLayout>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Withdrawal Requests</h1>
        <span className="text-sm text-gray-500">{data?.total ?? 0} total</span>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 mb-6">
        {(["pending", "all", "approved", "rejected"] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-colors capitalize ${
              filter === f ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/30" : "bg-[#1a1a1a] text-gray-500 hover:text-white"
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Action Modal */}
      {actionModal && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <div className="bg-[#1a1a1a] rounded-2xl p-6 w-full max-w-sm border border-white/10">
            <div className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4 ${actionModal.action === "approve" ? "bg-green-500/20" : "bg-red-500/20"}`}>
              {actionModal.action === "approve"
                ? <CheckCircle2 className="w-6 h-6 text-green-400" />
                : <XCircle className="w-6 h-6 text-red-400" />
              }
            </div>
            <h3 className="font-bold text-lg text-center mb-1">
              {actionModal.action === "approve" ? "Approve Withdrawal" : "Reject Withdrawal"}
            </h3>
            <div className="bg-[#111] rounded-xl p-3 my-4 space-y-1">
              <p className="text-sm"><span className="text-gray-500">Amount:</span> <span className="font-bold text-white">{actionModal.withdrawal.amount} TLOS</span></p>
              <p className="text-sm"><span className="text-gray-500">To:</span> <span className="font-mono text-xs text-gray-300">{actionModal.withdrawal.toAddress}</span></p>
              <p className="text-sm"><span className="text-gray-500">User:</span> <span className="text-gray-300">{actionModal.withdrawal.userEmail}</span></p>
              {actionModal.action === "approve" && (
                <p className="text-xs text-yellow-400 mt-2">This will deduct {actionModal.withdrawal.amount} TLOS from the user's wallet balance.</p>
              )}
            </div>
            <div className="mb-4">
              <label className="text-xs text-gray-500 mb-1 block">Admin Note (optional)</label>
              <input
                value={adminNote}
                onChange={e => setAdminNote(e.target.value)}
                placeholder={actionModal.action === "approve" ? "Processed successfully" : "Reason for rejection..."}
                className="w-full bg-[#111] border border-white/10 rounded-xl px-4 py-3 text-white text-sm outline-none"
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => processWithdrawal.mutate({ id: actionModal.withdrawal.id, action: actionModal.action, adminNote })}
                disabled={processWithdrawal.isPending}
                className={`flex-1 py-3 rounded-xl font-bold text-sm disabled:opacity-40 ${
                  actionModal.action === "approve"
                    ? "bg-green-600 text-white hover:bg-green-700"
                    : "bg-red-600 text-white hover:bg-red-700"
                }`}
              >
                {processWithdrawal.isPending ? "Processing..." : actionModal.action === "approve" ? "Confirm Approval" : "Confirm Rejection"}
              </button>
              <button onClick={() => { setActionModal(null); setAdminNote(""); }} className="px-4 py-3 rounded-xl bg-[#222] text-gray-400 text-sm">Cancel</button>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {isLoading ? (
          Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-24 w-full rounded-2xl bg-white/5" />)
        ) : withdrawals.length === 0 ? (
          <div className="text-center py-16 text-gray-600">
            <Clock className="w-12 h-12 mx-auto mb-3 text-gray-700" />
            <p>No {filter !== "all" ? filter : ""} withdrawal requests</p>
          </div>
        ) : withdrawals.map(w => (
          <div key={w.id} className="bg-[#1a1a1a] rounded-2xl p-4 border border-white/5">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2">
                  <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${statusColors[w.status]}`}>
                    {statusIcons[w.status]}
                    {w.status}
                  </span>
                  <span className="text-xs text-gray-500">{new Date(w.createdAt).toLocaleString()}</span>
                </div>
                <p className="text-2xl font-bold mb-1">{parseFloat(w.amount).toFixed(4)} <span className="text-gray-500 text-sm font-normal">TLOS</span></p>
                <p className="text-xs text-gray-500 mb-1">
                  <span className="text-gray-400">User:</span> {w.userEmail}
                </p>
                <p className="text-xs text-gray-500 mb-1">
                  <span className="text-gray-400">Wallet:</span> {w.walletLabel} ({w.walletZeroAddress})
                </p>
                <p className="text-xs text-gray-500 mb-1">
                  <span className="text-gray-400">To ({w.network?.toUpperCase()}):</span> <span className="font-mono">{w.toAddress.slice(0, 20)}...</span>
                </p>
                {w.adminNote && (
                  <p className="text-xs text-gray-400 italic mt-1">Note: {w.adminNote}</p>
                )}
                {w.txHash && (
                  <p className="text-xs text-green-400 mt-1 font-mono">TX: {w.txHash.slice(0, 20)}...</p>
                )}
              </div>
              {w.status === "pending" && (
                <div className="flex flex-col gap-2 shrink-0">
                  <button
                    onClick={() => setActionModal({ withdrawal: w, action: "approve" })}
                    className="flex items-center gap-1.5 bg-green-500/15 text-green-400 border border-green-500/20 px-3 py-2 rounded-xl text-xs font-semibold hover:bg-green-500/25"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" /> Approve
                  </button>
                  <button
                    onClick={() => setActionModal({ withdrawal: w, action: "reject" })}
                    className="flex items-center gap-1.5 bg-red-500/15 text-red-400 border border-red-500/20 px-3 py-2 rounded-xl text-xs font-semibold hover:bg-red-500/25"
                  >
                    <XCircle className="w-3.5 h-3.5" /> Reject
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </AdminLayout>
  );
}
