import React, { useState } from "react";
import { AdminLayout } from "@/components/layout";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, XCircle, Clock, Copy, ExternalLink, User, Wallet, ArrowRightLeft, Calendar } from "lucide-react";

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
  userEmail: string | null; userDisplayName: string | null;
  walletLabel: string | null; walletEvmAddress: string | null; walletZeroAddress: string | null;
};

const statusConfig: Record<string, { icon: React.ReactElement; color: string; label: string }> = {
  pending: { icon: <Clock className="w-4 h-4" />, color: "bg-yellow-500/15 text-yellow-400 border-yellow-500/20", label: "Pending" },
  approved: { icon: <CheckCircle2 className="w-4 h-4" />, color: "bg-green-500/15 text-green-400 border-green-500/20", label: "Approved" },
  rejected: { icon: <XCircle className="w-4 h-4" />, color: "bg-red-500/15 text-red-400 border-red-500/20", label: "Rejected" },
};

function copyToClipboard(text: string) {
  navigator.clipboard.writeText(text).catch(() => {});
}

export default function AdminWithdrawalsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<"all" | "pending" | "approved" | "rejected">("pending");
  const [selectedWithdrawal, setSelectedWithdrawal] = useState<Withdrawal | null>(null);
  const [action, setAction] = useState<"approve" | "reject" | null>(null);
  const [adminNote, setAdminNote] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["admin-withdrawals", filter],
    queryFn: () => adminFetch(`/admin/withdrawals${filter !== "all" ? `?status=${filter}` : ""}${filter !== "all" ? "&limit=100" : "?limit=100"}`),
    refetchInterval: 10000,
  });

  const processWithdrawal = useMutation({
    mutationFn: ({ id, action, adminNote }: { id: number; action: string; adminNote: string }) =>
      adminFetch(`/admin/withdrawals/${id}`, { method: "PATCH", body: JSON.stringify({ action, adminNote }) }),
    onSuccess: (_, vars) => {
      toast({ title: vars.action === "approve" ? "✓ Withdrawal Approved" : "Withdrawal Rejected", description: vars.action === "approve" ? "Balance deducted and transaction recorded." : "User has been notified." });
      queryClient.invalidateQueries({ queryKey: ["admin-withdrawals"] });
      setSelectedWithdrawal(null);
      setAction(null);
      setAdminNote("");
    },
    onError: (err: any) => toast({ title: "Failed", description: err.message, variant: "destructive" }),
  });

  const withdrawals: Withdrawal[] = data?.withdrawals ?? [];
  const pendingCount = withdrawals.filter(w => w.status === "pending").length;

  return (
    <AdminLayout>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Withdrawal Requests</h1>
          <p className="text-sm text-gray-500 mt-0.5">{data?.total ?? 0} total · {pendingCount} pending</p>
        </div>
        {pendingCount > 0 && (
          <span className="bg-yellow-500/15 border border-yellow-500/20 text-yellow-400 text-xs font-bold px-3 py-1.5 rounded-full animate-pulse">
            {pendingCount} Need Review
          </span>
        )}
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

      {/* Detail / Action Modal */}
      {selectedWithdrawal && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-end sm:items-center justify-center p-4">
          <div className="bg-[#141414] rounded-2xl w-full max-w-lg border border-white/10 overflow-hidden">
            {/* Modal header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
              <h3 className="font-bold text-lg">Withdrawal #{selectedWithdrawal.id}</h3>
              <button onClick={() => { setSelectedWithdrawal(null); setAction(null); setAdminNote(""); }} className="text-gray-500 hover:text-white text-xl leading-none">×</button>
            </div>

            <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
              {/* Amount hero */}
              <div className="bg-[#1a1a1a] rounded-2xl p-5 text-center border border-white/5">
                <p className="text-4xl font-black text-white">{parseFloat(selectedWithdrawal.amount).toFixed(4)}</p>
                <p className="text-gray-400 text-sm font-semibold mt-1">TLOS</p>
                <div className={`inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-full border mt-3 ${statusConfig[selectedWithdrawal.status]?.color}`}>
                  {statusConfig[selectedWithdrawal.status]?.icon}
                  {statusConfig[selectedWithdrawal.status]?.label}
                </div>
              </div>

              {/* User info */}
              <div className="bg-[#1a1a1a] rounded-xl p-4 border border-white/5">
                <div className="flex items-center gap-2 mb-3">
                  <User className="w-3.5 h-3.5 text-cyan-400" />
                  <span className="text-xs font-semibold text-cyan-400 uppercase tracking-wider">User</span>
                </div>
                <DetailRow label="Email" value={selectedWithdrawal.userEmail ?? "—"} />
                {selectedWithdrawal.userDisplayName && <DetailRow label="Name" value={selectedWithdrawal.userDisplayName} />}
                <DetailRow label="User ID" value={String(selectedWithdrawal.userId)} />
              </div>

              {/* Wallet info */}
              <div className="bg-[#1a1a1a] rounded-xl p-4 border border-white/5">
                <div className="flex items-center gap-2 mb-3">
                  <Wallet className="w-3.5 h-3.5 text-purple-400" />
                  <span className="text-xs font-semibold text-purple-400 uppercase tracking-wider">Source Wallet</span>
                </div>
                <DetailRow label="Label" value={selectedWithdrawal.walletLabel ?? "—"} />
                {selectedWithdrawal.walletEvmAddress && (
                  <DetailRow label="EVM Address" value={selectedWithdrawal.walletEvmAddress} mono copyable />
                )}
                {selectedWithdrawal.walletZeroAddress && (
                  <DetailRow label="Zero Address" value={selectedWithdrawal.walletZeroAddress} mono copyable />
                )}
              </div>

              {/* Transaction info */}
              <div className="bg-[#1a1a1a] rounded-xl p-4 border border-white/5">
                <div className="flex items-center gap-2 mb-3">
                  <ArrowRightLeft className="w-3.5 h-3.5 text-green-400" />
                  <span className="text-xs font-semibold text-green-400 uppercase tracking-wider">Transaction Details</span>
                </div>
                <DetailRow label="Network" value={selectedWithdrawal.network.toUpperCase()} />
                <DetailRow label="To Address" value={selectedWithdrawal.toAddress} mono copyable />
                <DetailRow label="Amount" value={`${selectedWithdrawal.amount} TLOS`} highlight />
              </div>

              {/* Timing */}
              <div className="bg-[#1a1a1a] rounded-xl p-4 border border-white/5">
                <div className="flex items-center gap-2 mb-3">
                  <Calendar className="w-3.5 h-3.5 text-gray-400" />
                  <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Timeline</span>
                </div>
                <DetailRow label="Requested" value={new Date(selectedWithdrawal.createdAt).toLocaleString()} />
                {selectedWithdrawal.processedAt && (
                  <DetailRow label="Processed" value={new Date(selectedWithdrawal.processedAt).toLocaleString()} />
                )}
                {selectedWithdrawal.txHash && (
                  <DetailRow label="TX Hash" value={selectedWithdrawal.txHash} mono copyable />
                )}
                {selectedWithdrawal.adminNote && (
                  <DetailRow label="Admin Note" value={selectedWithdrawal.adminNote} />
                )}
              </div>

              {/* Action section */}
              {selectedWithdrawal.status === "pending" && (
                <div className="space-y-3">
                  {!action ? (
                    <div className="flex gap-3">
                      <button
                        onClick={() => setAction("approve")}
                        className="flex-1 flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white py-3 rounded-xl font-bold text-sm transition-colors"
                      >
                        <CheckCircle2 className="w-4 h-4" /> Approve
                      </button>
                      <button
                        onClick={() => setAction("reject")}
                        className="flex-1 flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white py-3 rounded-xl font-bold text-sm transition-colors"
                      >
                        <XCircle className="w-4 h-4" /> Reject
                      </button>
                    </div>
                  ) : (
                    <div className="bg-[#1a1a1a] rounded-xl p-4 border border-white/10">
                      <p className={`text-sm font-semibold mb-3 ${action === "approve" ? "text-green-400" : "text-red-400"}`}>
                        {action === "approve" ? "✓ Confirm Approval" : "✗ Confirm Rejection"}
                      </p>
                      {action === "approve" && (
                        <p className="text-xs text-yellow-400 mb-3 bg-yellow-500/8 px-3 py-2 rounded-lg">
                          This will deduct <strong>{selectedWithdrawal.amount} TLOS</strong> from the user's wallet and record a confirmed transaction.
                        </p>
                      )}
                      <input
                        value={adminNote}
                        onChange={e => setAdminNote(e.target.value)}
                        placeholder={action === "approve" ? "Admin note (optional)" : "Reason for rejection (optional)"}
                        className="w-full bg-[#111] border border-white/10 rounded-xl px-4 py-3 text-white text-sm outline-none mb-3"
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={() => processWithdrawal.mutate({ id: selectedWithdrawal.id, action, adminNote })}
                          disabled={processWithdrawal.isPending}
                          className={`flex-1 py-3 rounded-xl font-bold text-sm text-white disabled:opacity-40 transition-colors ${
                            action === "approve" ? "bg-green-600 hover:bg-green-700" : "bg-red-600 hover:bg-red-700"
                          }`}
                        >
                          {processWithdrawal.isPending ? "Processing..." : action === "approve" ? "Confirm Approval" : "Confirm Rejection"}
                        </button>
                        <button onClick={() => setAction(null)} className="px-4 py-3 rounded-xl bg-[#222] text-gray-400 text-sm">Back</button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Withdrawal list */}
      <div className="space-y-3">
        {isLoading ? (
          Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-28 w-full rounded-2xl bg-white/5" />)
        ) : withdrawals.length === 0 ? (
          <div className="text-center py-16 text-gray-600">
            <Clock className="w-12 h-12 mx-auto mb-3 text-gray-700" />
            <p className="text-sm">No {filter !== "all" ? filter : ""} withdrawal requests</p>
          </div>
        ) : withdrawals.map(w => {
          const sc = statusConfig[w.status];
          return (
            <div
              key={w.id}
              className="bg-[#1a1a1a] rounded-2xl p-4 border border-white/5 cursor-pointer hover:border-white/10 transition-colors"
              onClick={() => { setSelectedWithdrawal(w); setAction(null); setAdminNote(""); }}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full border ${sc?.color}`}>
                      {sc?.icon} {sc?.label}
                    </span>
                    <span className="text-xs text-gray-500">#{w.id} · {new Date(w.createdAt).toLocaleString()}</span>
                  </div>
                  <p className="text-2xl font-bold mb-1">
                    {parseFloat(w.amount).toFixed(4)} <span className="text-gray-500 text-sm font-normal">TLOS</span>
                  </p>
                  <p className="text-xs text-gray-400 mb-0.5">
                    <span className="text-gray-500">From:</span> {w.userEmail ?? "—"}
                    {w.userDisplayName ? <span className="text-gray-600"> ({w.userDisplayName})</span> : null}
                  </p>
                  <p className="text-xs text-gray-500">
                    <span className="text-gray-600">To ({w.network?.toUpperCase()}):</span>{" "}
                    <span className="font-mono">{w.toAddress.slice(0, 18)}...{w.toAddress.slice(-6)}</span>
                  </p>
                  {w.adminNote && <p className="text-xs text-gray-500 italic mt-1">"{w.adminNote}"</p>}
                </div>
                <div className="shrink-0 flex flex-col items-end gap-2">
                  <span className="text-xs text-gray-600">{w.walletLabel}</span>
                  {w.status === "pending" && (
                    <div className="flex gap-1.5">
                      <button
                        onClick={e => { e.stopPropagation(); setSelectedWithdrawal(w); setAction("approve"); setAdminNote(""); }}
                        className="flex items-center gap-1 bg-green-500/15 text-green-400 border border-green-500/20 px-2.5 py-1.5 rounded-lg text-xs font-semibold hover:bg-green-500/25"
                      >
                        <CheckCircle2 className="w-3 h-3" /> Approve
                      </button>
                      <button
                        onClick={e => { e.stopPropagation(); setSelectedWithdrawal(w); setAction("reject"); setAdminNote(""); }}
                        className="flex items-center gap-1 bg-red-500/15 text-red-400 border border-red-500/20 px-2.5 py-1.5 rounded-lg text-xs font-semibold hover:bg-red-500/25"
                      >
                        <XCircle className="w-3 h-3" /> Reject
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </AdminLayout>
  );
}

function DetailRow({ label, value, mono, copyable, highlight }: {
  label: string; value: string; mono?: boolean; copyable?: boolean; highlight?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-2 py-1.5 border-b border-white/3 last:border-0">
      <span className="text-xs text-gray-500 shrink-0 mt-0.5 w-24">{label}</span>
      <div className="flex items-center gap-1.5 min-w-0 flex-1 justify-end">
        <span className={`text-xs text-right break-all ${highlight ? "text-white font-bold" : mono ? "font-mono text-gray-300" : "text-gray-300"}`}>
          {mono && value.length > 20 ? `${value.slice(0, 10)}...${value.slice(-8)}` : value}
        </span>
        {copyable && (
          <button onClick={() => copyToClipboard(value)} className="shrink-0 text-gray-600 hover:text-gray-300 transition-colors">
            <Copy className="w-3 h-3" />
          </button>
        )}
      </div>
    </div>
  );
}
