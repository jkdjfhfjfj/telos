import { Layout } from "@/components/layout";
import { useListTransactions, useListWallets } from "@workspace/api-client-react";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowUpRight, ArrowDownLeft } from "lucide-react";

function statusColor(status: string) {
  if (status === "confirmed") return "text-green-400";
  if (status === "failed") return "text-red-400";
  return "text-yellow-400";
}

export default function TransactionsPage() {
  const { data: wallets } = useListWallets();
  const { data: txs, isLoading } = useListTransactions({ limit: 50 } as any);

  return (
    <Layout>
      <div className="px-4 pt-6 pb-2">
        <h1 className="text-xl font-bold">Activity</h1>
        <p className="text-sm text-gray-500 mt-0.5">{wallets?.length ?? 0} wallet{wallets?.length !== 1 ? "s" : ""}</p>
      </div>

      <div className="px-4 mt-4">
        {isLoading ? (
          <div className="space-y-3">
            {[1,2,3,4].map(i => <Skeleton key={i} className="h-16 w-full rounded-2xl bg-white/10" />)}
          </div>
        ) : !txs || (txs as any[]).length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-16 h-16 rounded-full bg-[#1a1a1a] flex items-center justify-center mb-4">
              <ArrowUpRight className="w-7 h-7 text-gray-600" />
            </div>
            <p className="text-gray-500 text-sm">No transactions yet</p>
            <p className="text-gray-700 text-xs mt-1">Your transaction history will appear here</p>
          </div>
        ) : (
          <div className="space-y-2">
            {(txs as any[]).map((tx: any) => {
              const isReceive = tx.fromAddress === "admin";
              const wallet = wallets?.find(w => w.id === tx.walletId);
              return (
                <div key={tx.id} className="bg-[#1a1a1a] rounded-2xl p-4 flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${isReceive ? "bg-green-600/15" : "bg-red-600/15"}`}>
                    {isReceive
                      ? <ArrowDownLeft className="w-5 h-5 text-green-400" />
                      : <ArrowUpRight className="w-5 h-5 text-red-400" />
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold">{isReceive ? "Received" : "Sent"}</p>
                      <p className={`text-sm font-bold ${isReceive ? "text-green-400" : "text-red-400"}`}>
                        {isReceive ? "+" : "-"}{tx.amount} TLOS
                      </p>
                    </div>
                    <div className="flex items-center justify-between mt-0.5">
                      <p className="text-xs text-gray-600 truncate">
                        {wallet ? wallet.zeroAddress : `Wallet #${tx.walletId}`} · {tx.network?.toUpperCase()}
                      </p>
                      <div className="flex items-center gap-1.5">
                        <span className={`text-[10px] font-semibold ${statusColor(tx.status)}`}>{tx.status}</span>
                        <span className="text-[10px] text-gray-600">{new Date(tx.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                    {tx.memo && <p className="text-xs text-gray-600 mt-0.5 italic">"{tx.memo}"</p>}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </Layout>
  );
}
