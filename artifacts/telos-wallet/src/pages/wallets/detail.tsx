import { Layout } from "@/components/layout";
import { useRoute, useLocation } from "wouter";
import { useGetWallet, useGetWalletBalance, useListTransactions } from "@workspace/api-client-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Copy, ArrowUpRight, ArrowDownLeft, ChevronLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const TLOS_USD = 0.18;

export default function WalletDetailPage() {
  const [, params] = useRoute("/wallets/:id");
  const walletId = params?.id ? parseInt(params.id) : 0;
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const { data: wallet, isLoading } = useGetWallet(walletId, { query: { enabled: !!walletId } as any });
  const { data: balance } = useGetWalletBalance(walletId, { query: { enabled: !!walletId, refetchInterval: 15000 } as any });
  const { data: txs } = useListTransactions({ walletId, limit: 10 } as any, { query: { enabled: !!walletId } as any });

  const copy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: `${label} copied!` });
  };

  const tlos = parseFloat((balance as any)?.balanceTlos ?? (wallet as any)?.balanceTlos ?? "0");
  const usd = parseFloat((balance as any)?.balanceUsd ?? (wallet as any)?.balanceUsd ?? "0") || tlos * TLOS_USD;

  return (
    <Layout>
      {/* Header */}
      <div className="flex items-center px-4 pt-6 pb-2 gap-3">
        <button onClick={() => setLocation("/dashboard")} className="text-gray-400">
          <ChevronLeft className="w-6 h-6" />
        </button>
        <div className="flex-1">
          {isLoading ? <Skeleton className="h-5 w-32 bg-white/10" /> : (
            <h2 className="font-bold text-base">{wallet?.label}</h2>
          )}
          <p className="text-xs text-gray-500 capitalize">{wallet?.network} · Telos Zero + EVM</p>
        </div>
      </div>

      {/* Balance */}
      <div className="text-center py-6">
        <p className="text-4xl font-light">${usd.toFixed(2)}</p>
        <p className="text-gray-400 text-sm mt-1">{tlos.toFixed(4)} TLOS</p>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-center gap-6 px-6 mb-6">
        <button
          onClick={() => setLocation(`/wallets/${walletId}/send`)}
          className="flex flex-col items-center gap-2"
        >
          <div className="w-14 h-14 rounded-full bg-gradient-to-br from-cyan-500 to-purple-600 flex items-center justify-center">
            <ArrowUpRight className="w-6 h-6 text-white" />
          </div>
          <span className="text-xs text-gray-400">Send</span>
        </button>
        <button
          onClick={() => setLocation(`/wallets/${walletId}/receive`)}
          className="flex flex-col items-center gap-2"
        >
          <div className="w-14 h-14 rounded-full bg-gradient-to-br from-purple-600 to-cyan-500 flex items-center justify-center">
            <ArrowDownLeft className="w-6 h-6 text-white" />
          </div>
          <span className="text-xs text-gray-400">Receive</span>
        </button>
      </div>

      {/* Addresses */}
      <div className="px-4 space-y-3 mb-6">
        {/* Zero */}
        <div className="bg-[#1a1a1a] rounded-2xl p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-cyan-400" />
              <span className="text-xs font-semibold text-cyan-400">Telos Zero</span>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <p className="font-mono text-lg font-bold tracking-widest truncate flex-1">{wallet?.zeroAddress ?? "—"}</p>
            <button onClick={() => copy(wallet?.zeroAddress ?? "", "Zero address")} className="ml-3 text-gray-500 hover:text-white">
              <Copy className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* EVM */}
        <div className="bg-[#1a1a1a] rounded-2xl p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-purple-400" />
              <span className="text-xs font-semibold text-purple-400">Telos EVM</span>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <p className="font-mono text-sm text-gray-300 truncate flex-1">{wallet?.evmAddress ?? "—"}</p>
            <button onClick={() => copy(wallet?.evmAddress ?? "", "EVM address")} className="ml-3 text-gray-500 hover:text-white">
              <Copy className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Recent Transactions */}
      <div className="px-4">
        <h3 className="text-sm font-semibold text-gray-400 mb-3">Recent Activity</h3>
        {!txs || (txs as any[]).length === 0 ? (
          <div className="text-center py-8 text-gray-600 text-sm">No transactions yet</div>
        ) : (
          <div className="space-y-2">
            {(txs as any[]).slice(0, 5).map((tx: any) => (
              <div key={tx.id} className="bg-[#1a1a1a] rounded-xl p-3 flex items-center gap-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${tx.fromAddress === 'admin' ? 'bg-green-600/20' : 'bg-red-600/20'}`}>
                  {tx.fromAddress === 'admin'
                    ? <ArrowDownLeft className="w-4 h-4 text-green-400" />
                    : <ArrowUpRight className="w-4 h-4 text-red-400" />
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{tx.fromAddress === 'admin' ? 'Received' : `To ${tx.toAddress.slice(0, 8)}...`}</p>
                  <p className="text-xs text-gray-500">{new Date(tx.createdAt).toLocaleDateString()}</p>
                </div>
                <p className={`text-sm font-semibold ${tx.fromAddress === 'admin' ? 'text-green-400' : 'text-red-400'}`}>
                  {tx.fromAddress === 'admin' ? '+' : '-'}{tx.amount} TLOS
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
