import { useState } from "react";
import { useRoute, useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { useSendTransaction, useGetWallet, useGetWalletBalance } from "@workspace/api-client-react";
import { ChevronLeft, ArrowUpRight } from "lucide-react";
import { Layout } from "@/components/layout";

export default function WalletSendPage() {
  const [, params] = useRoute("/wallets/:id/send");
  const walletId = params?.id ? parseInt(params.id) : 0;
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const { data: wallet } = useGetWallet(walletId, { query: { enabled: !!walletId } as any });
  const { data: balance } = useGetWalletBalance(walletId, { query: { enabled: !!walletId } as any });

  const [toAddress, setToAddress] = useState("");
  const [amount, setAmount] = useState("");
  const [memo, setMemo] = useState("");
  const [network, setNetwork] = useState<"evm" | "zero">("evm");
  const [totpCode, setTotpCode] = useState("");

  const tlos = parseFloat((balance as any)?.balanceTlos ?? (wallet as any)?.balanceTlos ?? "0");

  const sendTx = useSendTransaction({
    mutation: {
      onSuccess: (data: any) => {
        toast({ title: "Transaction Sent", description: `Sent ${data.amount} TLOS successfully` });
        setLocation(`/wallets/${walletId}`);
      },
      onError: (err: any) => {
        toast({ title: "Transaction Failed", description: err.message || "An error occurred", variant: "destructive" });
      }
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!toAddress || !amount) return;
    sendTx.mutate({
      data: { fromWalletId: walletId, toAddress, amount, memo: memo || undefined, network, totpCode: totpCode || "000000" }
    });
  };

  const setMax = () => setAmount(tlos.toFixed(8));

  return (
    <Layout>
      {/* Header */}
      <div className="flex items-center gap-3 px-4 pt-6 pb-4">
        <button onClick={() => setLocation(`/wallets/${walletId}`)} className="text-gray-400">
          <ChevronLeft className="w-6 h-6" />
        </button>
        <h1 className="text-lg font-bold">Send TLOS</h1>
      </div>

      {/* Balance pill */}
      <div className="mx-4 mb-6 bg-[#1a1a1a] rounded-2xl p-4 flex items-center justify-between">
        <div>
          <p className="text-xs text-gray-500">Available Balance</p>
          <p className="text-xl font-bold mt-0.5">{tlos.toFixed(4)} <span className="text-gray-400 text-sm font-normal">TLOS</span></p>
        </div>
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-500 to-purple-600 flex items-center justify-center">
          <ArrowUpRight className="w-5 h-5 text-white" />
        </div>
      </div>

      <form onSubmit={handleSubmit} className="px-4 space-y-4">
        {/* Network */}
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

        {/* To address */}
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

        {/* Amount */}
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
              className="flex-1 bg-transparent text-white text-2xl font-light placeholder-gray-700 outline-none"
              required
            />
            <span className="text-gray-400 font-semibold text-sm">TLOS</span>
          </div>
        </div>

        {/* Memo (Zero only) */}
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

        {/* 2FA */}
        <div className="bg-[#1a1a1a] rounded-2xl p-4">
          <p className="text-xs text-gray-500 mb-2">2FA Code <span className="text-gray-600">(leave blank if not enabled)</span></p>
          <input
            value={totpCode}
            onChange={e => setTotpCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
            placeholder="000000"
            maxLength={6}
            className="w-full bg-transparent text-white font-mono text-2xl tracking-widest placeholder-gray-700 outline-none"
          />
        </div>

        <button
          type="submit"
          disabled={!toAddress || !amount || sendTx.isPending}
          className="w-full py-4 rounded-2xl bg-gradient-to-r from-cyan-500 to-purple-600 text-white font-bold text-base disabled:opacity-40 mt-2"
        >
          {sendTx.isPending ? "Sending..." : "Confirm & Send"}
        </button>
      </form>
    </Layout>
  );
}
