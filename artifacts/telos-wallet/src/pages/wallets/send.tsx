import { useState } from "react";
import { useRoute, useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useGetWallet, useGetWalletBalance } from "@workspace/api-client-react";
import { ChevronLeft, ArrowUpRight, Clock, CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { Layout } from "@/components/layout";

async function apiFetch(path: string, opts?: RequestInit) {
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
  id: number; amount: string; toAddress: string; network: string;
  status: "pending" | "approved" | "rejected"; adminNote: string | null;
  txHash: string | null; createdAt: string; processedAt: string | null;
};

export default function WalletSendPage() {
  const [, params] = useRoute("/wallets/:id/send");
  const walletId = params?.id ? parseInt(params.id) : 0;
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: wallet } = useGetWallet(walletId, { query: { enabled: !!walletId } as any });
  const { data: balance } = useGetWalletBalance(walletId, { query: { enabled: !!walletId } as any });

  const [toAddress, setToAddress] = useState("");
  const [amount, setAmount] = useState("");
  const [memo, setMemo] = useState("");
  const [network, setNetwork] = useState<"evm" | "zero">("evm");
  const [submittedWithdrawalId, setSubmittedWithdrawalId] = useState<number | null>(null);

  const tlos = parseFloat((balance as any)?.balanceTlos ?? (wallet as any)?.balanceTlos ?? "0");

  // Poll withdrawal status after submission
  const { data: withdrawalStatus } = useQuery<Withdrawal>({
    queryKey: ["withdrawal-status", submittedWithdrawalId],
    queryFn: () => apiFetch(`/wallets/${walletId}/withdrawals`).then((list: Withdrawal[]) =>
      list.find(w => w.id === submittedWithdrawalId)!
    ),
    enabled: !!submittedWithdrawalId,
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      return status === "pending" ? 3000 : false;
    },
  });

  const createWithdrawal = useMutation({
    mutationFn: (data: { amount: string; toAddress: string; network: string }) =>
      apiFetch(`/wallets/${walletId}/withdraw`, {
        method: "POST",
        body: JSON.stringify(data),
      }),
    onSuccess: (data: Withdrawal) => {
      setSubmittedWithdrawalId(data.id);
      queryClient.invalidateQueries({ queryKey: ["withdrawal-status"] });
    },
    onError: (err: any) => {
      toast({ title: "Withdrawal Failed", description: err.message || "An error occurred", variant: "destructive" });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!toAddress || !amount) return;
    createWithdrawal.mutate({ amount, toAddress, network });
  };

  const setMax = () => setAmount(tlos.toFixed(8));

  // ── Pending / Approved / Rejected screen ──
  if (submittedWithdrawalId) {
    const status = withdrawalStatus?.status ?? "pending";

    return (
      <Layout>
        <div className="flex items-center gap-3 px-4 pt-6 pb-4">
          <button
            onClick={() => setLocation(`/wallets/${walletId}`)}
            className="text-gray-400"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          <h1 className="text-lg font-bold">Withdrawal Status</h1>
        </div>

        <div className="px-4 flex flex-col items-center pt-8 pb-6 text-center">
          {status === "pending" && (
            <>
              <div className="w-20 h-20 rounded-full bg-yellow-500/10 border-2 border-yellow-500/30 flex items-center justify-center mb-5">
                <Loader2 className="w-10 h-10 text-yellow-400 animate-spin" />
              </div>
              <h2 className="text-xl font-bold mb-2">Awaiting Admin Approval</h2>
              <p className="text-gray-400 text-sm mb-6 leading-relaxed">
                Your withdrawal request has been submitted. An admin needs to review and approve it before funds are released.
              </p>
              <div className="w-full bg-[#1a1a1a] border border-white/10 rounded-2xl p-4 text-left space-y-3 mb-6">
                <Row label="Amount" value={`${parseFloat(withdrawalStatus?.amount ?? amount).toFixed(4)} TLOS`} highlight />
                <Row label="To Address" value={withdrawalStatus?.toAddress ?? toAddress} mono truncate />
                <Row label="Network" value={(withdrawalStatus?.network ?? network).toUpperCase()} />
                <Row label="Status" value="Pending Approval" badge="yellow" />
              </div>
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse" />
                Checking for updates every 3 seconds...
              </div>
            </>
          )}

          {status === "approved" && (
            <>
              <div className="w-20 h-20 rounded-full bg-green-500/10 border-2 border-green-500/30 flex items-center justify-center mb-5">
                <CheckCircle2 className="w-10 h-10 text-green-400" />
              </div>
              <h2 className="text-xl font-bold mb-2">Withdrawal Approved!</h2>
              <p className="text-gray-400 text-sm mb-6">Your withdrawal has been approved and processed by admin.</p>
              <div className="w-full bg-[#1a1a1a] border border-white/10 rounded-2xl p-4 text-left space-y-3 mb-6">
                <Row label="Amount" value={`${parseFloat(withdrawalStatus.amount).toFixed(4)} TLOS`} highlight />
                <Row label="To Address" value={withdrawalStatus.toAddress} mono truncate />
                <Row label="Network" value={withdrawalStatus.network.toUpperCase()} />
                {withdrawalStatus.txHash && <Row label="TX Hash" value={withdrawalStatus.txHash} mono truncate />}
                {withdrawalStatus.adminNote && <Row label="Admin Note" value={withdrawalStatus.adminNote} />}
                <Row label="Status" value="Approved" badge="green" />
              </div>
              <button
                onClick={() => setLocation(`/wallets/${walletId}`)}
                className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-cyan-500 to-cyan-600 text-white font-bold"
              >
                Back to Wallet
              </button>
            </>
          )}

          {status === "rejected" && (
            <>
              <div className="w-20 h-20 rounded-full bg-red-500/10 border-2 border-red-500/30 flex items-center justify-center mb-5">
                <XCircle className="w-10 h-10 text-red-400" />
              </div>
              <h2 className="text-xl font-bold mb-2">Withdrawal Rejected</h2>
              <p className="text-gray-400 text-sm mb-6">Your withdrawal was rejected by admin. No funds were deducted.</p>
              <div className="w-full bg-[#1a1a1a] border border-white/10 rounded-2xl p-4 text-left space-y-3 mb-6">
                <Row label="Amount" value={`${parseFloat(withdrawalStatus.amount).toFixed(4)} TLOS`} highlight />
                <Row label="To Address" value={withdrawalStatus.toAddress} mono truncate />
                {withdrawalStatus.adminNote && <Row label="Reason" value={withdrawalStatus.adminNote} />}
                <Row label="Status" value="Rejected" badge="red" />
              </div>
              <div className="flex gap-2 w-full">
                <button
                  onClick={() => { setSubmittedWithdrawalId(null); setAmount(""); setToAddress(""); }}
                  className="flex-1 py-3.5 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 font-bold"
                >
                  Try Again
                </button>
                <button
                  onClick={() => setLocation(`/wallets/${walletId}`)}
                  className="flex-1 py-3.5 rounded-2xl bg-[#1a1a1a] border border-white/10 text-gray-300 font-bold"
                >
                  Back to Wallet
                </button>
              </div>
            </>
          )}
        </div>
      </Layout>
    );
  }

  // ── Send Form ──
  return (
    <Layout>
      <div className="flex items-center gap-3 px-4 pt-6 pb-4">
        <button onClick={() => setLocation(`/wallets/${walletId}`)} className="text-gray-400">
          <ChevronLeft className="w-6 h-6" />
        </button>
        <h1 className="text-lg font-bold">Send TLOS</h1>
      </div>

      <div className="mx-4 mb-6 bg-[#1a1a1a] rounded-2xl p-4 flex items-center justify-between">
        <div>
          <p className="text-xs text-gray-500">Available Balance</p>
          <p className="text-xl font-bold mt-0.5">{tlos.toFixed(4)} <span className="text-gray-400 text-sm font-normal">TLOS</span></p>
        </div>
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-500 to-purple-600 flex items-center justify-center">
          <ArrowUpRight className="w-5 h-5 text-white" />
        </div>
      </div>

      <div className="mx-4 mb-4 bg-yellow-500/8 border border-yellow-500/20 rounded-xl px-4 py-3 flex items-start gap-2">
        <Clock className="w-4 h-4 text-yellow-400 shrink-0 mt-0.5" />
        <p className="text-xs text-yellow-300/80">Withdrawals require admin approval before funds are released.</p>
      </div>

      <form onSubmit={handleSubmit} className="px-4 space-y-4">
        <div className="bg-[#1a1a1a] rounded-2xl p-4">
          <p className="text-xs text-gray-500 mb-3">Network</p>
          <div className="flex gap-2">
            {(["evm", "zero"] as const).map(n => (
              <button
                key={n}
                type="button"
                onClick={() => setNetwork(n)}
                className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-colors ${
                  network === n ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/30" : "bg-[#222] text-gray-400"
                }`}
              >
                {n === "evm" ? "Telos EVM" : "Telos Zero"}
              </button>
            ))}
          </div>
        </div>

        <div className="bg-[#1a1a1a] rounded-2xl p-4">
          <p className="text-xs text-gray-500 mb-2">Recipient Address</p>
          <input
            value={toAddress}
            onChange={e => setToAddress(e.target.value)}
            placeholder={network === "evm" ? "0x..." : "12 char account"}
            className="w-full bg-transparent text-white placeholder-gray-600 font-mono text-sm outline-none"
            required
          />
        </div>

        <div className="bg-[#1a1a1a] rounded-2xl p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs text-gray-500">Amount</p>
            <button type="button" onClick={setMax} className="text-xs text-cyan-400 font-semibold">MAX</button>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="number"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              placeholder="0.00"
              step="any"
              min="0.0001"
              max={tlos}
              className="flex-1 bg-transparent text-white text-2xl font-light placeholder-gray-700 outline-none"
              required
            />
            <span className="text-gray-400 font-semibold text-sm">TLOS</span>
          </div>
        </div>

        {network === "zero" && (
          <div className="bg-[#1a1a1a] rounded-2xl p-4">
            <p className="text-xs text-gray-500 mb-2">Memo (Optional)</p>
            <input
              value={memo}
              onChange={e => setMemo(e.target.value)}
              placeholder="Required by some exchanges"
              className="w-full bg-transparent text-white placeholder-gray-600 text-sm outline-none"
            />
          </div>
        )}

        <button
          type="submit"
          disabled={!toAddress || !amount || createWithdrawal.isPending}
          className="w-full py-4 rounded-2xl bg-gradient-to-r from-cyan-500 to-purple-600 text-white font-bold text-base disabled:opacity-40 mt-2"
        >
          {createWithdrawal.isPending ? (
            <span className="flex items-center justify-center gap-2">
              <Loader2 className="w-5 h-5 animate-spin" /> Submitting...
            </span>
          ) : "Submit Withdrawal Request"}
        </button>
      </form>
    </Layout>
  );
}

function Row({ label, value, highlight, mono, truncate, badge }: {
  label: string; value: string; highlight?: boolean; mono?: boolean;
  truncate?: boolean; badge?: "yellow" | "green" | "red";
}) {
  const badgeClasses = {
    yellow: "bg-yellow-500/15 text-yellow-400",
    green: "bg-green-500/15 text-green-400",
    red: "bg-red-500/15 text-red-400",
  };
  return (
    <div className="flex items-start justify-between gap-3">
      <span className="text-xs text-gray-500 shrink-0 mt-0.5">{label}</span>
      {badge ? (
        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${badgeClasses[badge]}`}>{value}</span>
      ) : (
        <span className={`text-xs text-right ${highlight ? "text-white font-bold text-sm" : mono ? "font-mono text-gray-300" : "text-gray-300"} ${truncate ? "truncate max-w-[60%]" : ""}`}>
          {value}
        </span>
      )}
    </div>
  );
}
