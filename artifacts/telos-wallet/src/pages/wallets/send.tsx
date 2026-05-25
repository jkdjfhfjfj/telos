import { useState } from "react";
import { useRoute, useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useGetWallet, useGetWalletBalance } from "@workspace/api-client-react";
import { ChevronLeft, ArrowUpRight, Clock, CheckCircle2, XCircle, Loader2, AlertTriangle } from "lucide-react";
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

type FormState = { toAddress: string; amount: string; network: "evm" | "zero" };

export default function WalletSendPage() {
  const [, params] = useRoute("/wallets/:id/send");
  const walletId = params?.id ? parseInt(params.id) : 0;
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: wallet } = useGetWallet(walletId, { query: { enabled: !!walletId } as any });
  const { data: balance } = useGetWalletBalance(walletId, { query: { enabled: !!walletId } as any });

  const [form, setForm] = useState<FormState>({ toAddress: "", amount: "", network: "evm" });
  const [confirming, setConfirming] = useState(false);
  const [submittedWithdrawalId, setSubmittedWithdrawalId] = useState<number | null>(null);

  const tlos = parseFloat((balance as any)?.balanceTlos ?? (wallet as any)?.balanceTlos ?? "0");

  // Poll withdrawal status after submission
  const { data: withdrawalStatus } = useQuery<Withdrawal>({
    queryKey: ["withdrawal-status", submittedWithdrawalId],
    queryFn: () => apiFetch(`/wallets/${walletId}/withdrawals`).then((list: Withdrawal[]) =>
      list.find(w => w.id === submittedWithdrawalId) ?? null
    ),
    enabled: !!submittedWithdrawalId,
    refetchInterval: (query) => query.state.data?.status === "pending" ? 3000 : false,
  });

  const createWithdrawal = useMutation({
    mutationFn: (data: FormState) =>
      apiFetch(`/wallets/${walletId}/withdraw`, { method: "POST", body: JSON.stringify(data) }),
    onSuccess: (data: Withdrawal) => {
      setConfirming(false);
      setSubmittedWithdrawalId(data.id);
      queryClient.invalidateQueries({ queryKey: ["withdrawal-status"] });
    },
    onError: (err: any) => {
      setConfirming(false);
      toast({ title: "Withdrawal Failed", description: err.message || "An error occurred", variant: "destructive" });
    },
  });

  const amountNum = parseFloat(form.amount || "0");
  const isValid = form.toAddress.length > 5 && amountNum > 0 && amountNum <= tlos;

  // ── Confirmation Step ──
  if (confirming && !submittedWithdrawalId) {
    return (
      <Layout>
        <div className="flex items-center gap-3 px-4 pt-6 pb-4">
          <button onClick={() => setConfirming(false)} className="text-gray-400">
            <ChevronLeft className="w-6 h-6" />
          </button>
          <h1 className="text-lg font-bold">Confirm Withdrawal</h1>
        </div>

        <div className="px-4 space-y-4">
          <div className="bg-[#1a1a1a] rounded-2xl p-5 border border-white/5 text-center">
            <p className="text-xs text-gray-500 mb-1">You are sending</p>
            <p className="text-4xl font-black text-white">{amountNum.toFixed(4)}</p>
            <p className="text-gray-400 font-semibold mt-1">TLOS</p>
          </div>

          <div className="bg-[#1a1a1a] rounded-2xl p-4 border border-white/5 space-y-3">
            <div className="flex justify-between items-start">
              <span className="text-xs text-gray-500">Recipient</span>
              <span className="font-mono text-xs text-gray-200 text-right max-w-[60%] break-all">{form.toAddress}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-xs text-gray-500">Network</span>
              <span className="text-xs font-semibold text-gray-300">{form.network === "evm" ? "Telos EVM" : "Telos Zero"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-xs text-gray-500">Status after submit</span>
              <span className="text-xs font-semibold text-yellow-400">Pending Admin Approval</span>
            </div>
          </div>

          <div className="bg-yellow-500/8 border border-yellow-500/20 rounded-xl px-4 py-3 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-yellow-400 shrink-0 mt-0.5" />
            <p className="text-xs text-yellow-300/80">Your withdrawal will be reviewed and verified on the blockchain. This may take a few minutes.</p>
          </div>

          <button
            onClick={() => createWithdrawal.mutate(form)}
            disabled={createWithdrawal.isPending}
            className="w-full py-4 rounded-2xl bg-gradient-to-r from-cyan-500 to-purple-600 text-white font-bold text-base disabled:opacity-60"
          >
            {createWithdrawal.isPending ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2 className="w-5 h-5 animate-spin" /> Submitting...
              </span>
            ) : "Confirm & Submit"}
          </button>
          <button
            onClick={() => setConfirming(false)}
            className="w-full py-3 rounded-2xl bg-transparent text-gray-400 text-sm"
          >
            Go Back & Edit
          </button>
        </div>
      </Layout>
    );
  }

  // ── Pending / Approved / Rejected screen ──
  if (submittedWithdrawalId) {
    const status = withdrawalStatus?.status ?? "pending";

    return (
      <Layout>
        <div className="flex items-center gap-3 px-4 pt-6 pb-4">
          <button onClick={() => setLocation(`/wallets/${walletId}`)} className="text-gray-400">
            <ChevronLeft className="w-6 h-6" />
          </button>
          <h1 className="text-lg font-bold">Withdrawal Status</h1>
        </div>

        <div className="px-4 flex flex-col items-center pt-6 pb-6 text-center">
          {status === "pending" && (
            <>
              <div className="w-20 h-20 rounded-full bg-cyan-500/10 border-2 border-cyan-500/30 flex items-center justify-center mb-5">
                <Loader2 className="w-10 h-10 text-cyan-400 animate-spin" />
              </div>
              <h2 className="text-xl font-bold mb-2">Verifying on the Blockchain</h2>
              <p className="text-gray-400 text-sm mb-6 leading-relaxed px-2">
                Your transaction is being verified on the blockchain. This may take a few minutes while our team processes your request.
              </p>
              <div className="w-full bg-[#1a1a1a] border border-white/10 rounded-2xl p-4 text-left space-y-3 mb-6">
                <Row label="Amount" value={`${parseFloat(withdrawalStatus?.amount ?? form.amount).toFixed(4)} TLOS`} highlight />
                <Row label="To Address" value={withdrawalStatus?.toAddress ?? form.toAddress} mono truncate />
                <Row label="Network" value={(withdrawalStatus?.network ?? form.network).toUpperCase()} />
                <Row label="Status" value="Verifying..." badge="yellow" />
              </div>
              <div className="flex items-center gap-2 text-xs text-gray-500 bg-[#1a1a1a] rounded-xl px-4 py-3">
                <div className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse" />
                Checking blockchain status every 3 seconds
              </div>
            </>
          )}

          {status === "approved" && (
            <>
              <div className="w-20 h-20 rounded-full bg-green-500/10 border-2 border-green-500/30 flex items-center justify-center mb-5">
                <CheckCircle2 className="w-10 h-10 text-green-400" />
              </div>
              <h2 className="text-xl font-bold mb-2">Transaction Confirmed!</h2>
              <p className="text-gray-400 text-sm mb-6">Your transaction has been confirmed on the blockchain.</p>
              <div className="w-full bg-[#1a1a1a] border border-white/10 rounded-2xl p-4 text-left space-y-3 mb-6">
                <Row label="Amount" value={`${parseFloat(withdrawalStatus!.amount).toFixed(4)} TLOS`} highlight />
                <Row label="To Address" value={withdrawalStatus!.toAddress} mono truncate />
                <Row label="Network" value={withdrawalStatus!.network.toUpperCase()} />
                {withdrawalStatus!.txHash && <Row label="TX Hash" value={withdrawalStatus!.txHash} mono truncate />}
                {withdrawalStatus!.adminNote && <Row label="Note" value={withdrawalStatus!.adminNote} />}
                <Row label="Status" value="Confirmed" badge="green" />
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
              <h2 className="text-xl font-bold mb-2">Transaction Not Processed</h2>
              <p className="text-gray-400 text-sm mb-6">Your withdrawal could not be processed. No funds were deducted from your wallet.</p>
              <div className="w-full bg-[#1a1a1a] border border-white/10 rounded-2xl p-4 text-left space-y-3 mb-6">
                <Row label="Amount" value={`${parseFloat(withdrawalStatus!.amount).toFixed(4)} TLOS`} highlight />
                <Row label="To Address" value={withdrawalStatus!.toAddress} mono truncate />
                {withdrawalStatus!.adminNote && <Row label="Reason" value={withdrawalStatus!.adminNote} />}
                <Row label="Status" value="Not Processed" badge="red" />
              </div>
              <div className="flex gap-2 w-full">
                <button
                  onClick={() => { setSubmittedWithdrawalId(null); setForm({ toAddress: "", amount: "", network: "evm" }); }}
                  className="flex-1 py-3.5 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 font-bold"
                >
                  Try Again
                </button>
                <button
                  onClick={() => setLocation(`/wallets/${walletId}`)}
                  className="flex-1 py-3.5 rounded-2xl bg-[#1a1a1a] border border-white/10 text-gray-300 font-bold"
                >
                  Back
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

      <div className="mx-4 mb-5 bg-[#1a1a1a] rounded-2xl p-4 flex items-center justify-between">
        <div>
          <p className="text-xs text-gray-500">Available Balance</p>
          <p className="text-xl font-bold mt-0.5">{tlos.toFixed(4)} <span className="text-gray-400 text-sm font-normal">TLOS</span></p>
        </div>
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-500 to-purple-600 flex items-center justify-center">
          <ArrowUpRight className="w-5 h-5 text-white" />
        </div>
      </div>

      <div className="mx-4 mb-5 bg-[#111] border border-yellow-500/15 rounded-xl px-4 py-3 flex items-start gap-2">
        <Clock className="w-4 h-4 text-yellow-400 shrink-0 mt-0.5" />
        <p className="text-xs text-yellow-300/70 leading-relaxed">Transactions are verified on the blockchain. Processing may take a few minutes.</p>
      </div>

      <div className="px-4 space-y-4">
        <div className="bg-[#1a1a1a] rounded-2xl p-4">
          <p className="text-xs text-gray-500 mb-3">Network</p>
          <div className="flex gap-2">
            {(["evm", "zero"] as const).map(n => (
              <button
                key={n}
                type="button"
                onClick={() => setForm(f => ({ ...f, network: n }))}
                className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-colors ${
                  form.network === n ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/30" : "bg-[#222] text-gray-400"
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
            value={form.toAddress}
            onChange={e => setForm(f => ({ ...f, toAddress: e.target.value }))}
            placeholder={form.network === "evm" ? "0x..." : "12 char account"}
            className="w-full bg-transparent text-white placeholder-gray-600 font-mono text-sm outline-none"
          />
        </div>

        <div className="bg-[#1a1a1a] rounded-2xl p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs text-gray-500">Amount</p>
            <button type="button" onClick={() => setForm(f => ({ ...f, amount: tlos.toFixed(8) }))} className="text-xs text-cyan-400 font-semibold">MAX</button>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="number"
              value={form.amount}
              onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
              placeholder="0.00"
              step="any"
              min="0.0001"
              max={tlos}
              className="flex-1 bg-transparent text-white text-2xl font-light placeholder-gray-700 outline-none"
            />
            <span className="text-gray-400 font-semibold text-sm">TLOS</span>
          </div>
          {amountNum > tlos && <p className="text-xs text-red-400 mt-1">Exceeds available balance</p>}
        </div>

        <button
          type="button"
          disabled={!isValid}
          onClick={() => setConfirming(true)}
          className="w-full py-4 rounded-2xl bg-gradient-to-r from-cyan-500 to-purple-600 text-white font-bold text-base disabled:opacity-40 mt-2"
        >
          Review & Send
        </button>
      </div>
    </Layout>
  );
}

function Row({ label, value, highlight, mono, truncate, badge }: {
  label: string; value: string; highlight?: boolean; mono?: boolean;
  truncate?: boolean; badge?: "yellow" | "green" | "red";
}) {
  const badgeClasses = { yellow: "bg-yellow-500/15 text-yellow-400", green: "bg-green-500/15 text-green-400", red: "bg-red-500/15 text-red-400" };
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
