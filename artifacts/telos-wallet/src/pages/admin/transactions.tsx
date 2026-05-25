import { AdminLayout } from "@/components/layout";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { useQuery } from "@tanstack/react-query";
import { ArrowUpRight, ArrowDownLeft, Copy } from "lucide-react";

async function adminFetch(path: string) {
  const res = await fetch(`/api${path}`);
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || res.statusText);
  return res.json();
}

const statusColors: Record<string, string> = {
  confirmed: "text-green-400",
  pending: "text-yellow-400",
  failed: "text-red-400",
};

export default function AdminTransactionsPage() {
  const { toast } = useToast();

  const { data, isLoading } = useQuery({
    queryKey: ["admin-transactions"],
    queryFn: () => adminFetch("/admin/transactions?limit=100"),
    refetchInterval: 15000,
  });

  const copy = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Copied!" });
  };

  const txs = data?.transactions ?? [];

  return (
    <AdminLayout>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">All Transactions</h1>
        <span className="text-sm text-gray-500">{data?.total ?? 0} total</span>
      </div>

      <div className="bg-[#111] rounded-2xl overflow-hidden border border-white/5">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-[#1a1a1a]">
              <tr>
                <th className="text-left px-4 py-3 text-gray-500 font-medium text-xs">Type</th>
                <th className="text-left px-4 py-3 text-gray-500 font-medium text-xs">User</th>
                <th className="text-left px-4 py-3 text-gray-500 font-medium text-xs">Amount</th>
                <th className="text-left px-4 py-3 text-gray-500 font-medium text-xs">From → To</th>
                <th className="text-left px-4 py-3 text-gray-500 font-medium text-xs">Status</th>
                <th className="text-left px-4 py-3 text-gray-500 font-medium text-xs">Network</th>
                <th className="text-left px-4 py-3 text-gray-500 font-medium text-xs">Date</th>
                <th className="text-left px-4 py-3 text-gray-500 font-medium text-xs">TX Hash</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {isLoading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i}><td colSpan={8} className="p-3"><Skeleton className="h-6 w-full bg-white/5" /></td></tr>
                ))
              ) : txs.length === 0 ? (
                <tr><td colSpan={8} className="text-center py-12 text-gray-600">No transactions yet</td></tr>
              ) : txs.map((tx: any) => {
                const isCredit = tx.fromAddress === "admin";
                return (
                  <tr key={tx.id} className="hover:bg-white/3 transition-colors">
                    <td className="px-4 py-3">
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center ${isCredit ? "bg-green-600/15" : "bg-red-600/15"}`}>
                        {isCredit ? <ArrowDownLeft className="w-3.5 h-3.5 text-green-400" /> : <ArrowUpRight className="w-3.5 h-3.5 text-red-400" />}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-xs truncate max-w-[120px]">{tx.userEmail || `#${tx.userId}`}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-bold">{tx.amount} <span className="text-gray-500 font-normal text-xs">{tx.currency}</span></p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-mono text-xs text-gray-400 truncate max-w-[160px]">
                        {tx.fromAddress.slice(0, 10)}... → {tx.toAddress.slice(0, 10)}...
                      </p>
                      {tx.memo && <p className="text-xs text-gray-600 italic">{tx.memo}</p>}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-semibold ${statusColors[tx.status] || "text-gray-400"}`}>{tx.status}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs uppercase text-gray-400">{tx.network}</span>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-xs text-gray-500">{new Date(tx.createdAt).toLocaleString()}</p>
                    </td>
                    <td className="px-4 py-3">
                      {tx.txHash && (
                        <div className="flex items-center gap-1">
                          <span className="font-mono text-xs text-cyan-400 truncate max-w-[80px]">{tx.txHash.slice(0, 12)}...</span>
                          <button onClick={() => copy(tx.txHash)} className="text-gray-600 hover:text-white">
                            <Copy className="w-3 h-3" />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </AdminLayout>
  );
}
