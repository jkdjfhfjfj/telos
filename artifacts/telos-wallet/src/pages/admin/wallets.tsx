import { useState } from "react";
import { AdminLayout } from "@/components/layout";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Edit2, Copy, Search } from "lucide-react";

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

type AdminWallet = {
  id: number; userId: number; label: string; zeroAddress: string; evmAddress: string;
  network: string; balanceTlos: string; balanceUsd: string; createdAt: string;
  userEmail: string | null; userDisplayName: string | null; userClerkId: string | null;
};

export default function AdminWalletsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [editingWallet, setEditingWallet] = useState<AdminWallet | null>(null);
  const [newTlos, setNewTlos] = useState("");
  const [newUsd, setNewUsd] = useState("");
  const [note, setNote] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["admin-wallets"],
    queryFn: () => adminFetch("/admin/wallets?limit=100"),
  });

  const updateBalance = useMutation({
    mutationFn: ({ walletId, balanceTlos, balanceUsd, note }: any) =>
      adminFetch(`/admin/wallets/${walletId}/balance`, {
        method: "PATCH",
        body: JSON.stringify({ balanceTlos, balanceUsd, note }),
      }),
    onSuccess: () => {
      toast({ title: "Balance updated!" });
      queryClient.invalidateQueries({ queryKey: ["admin-wallets"] });
      setEditingWallet(null);
      setNewTlos("");
      setNewUsd("");
      setNote("");
    },
    onError: (err: any) => toast({ title: "Failed", description: err.message, variant: "destructive" }),
  });

  const copy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: `${label} copied!` });
  };

  const wallets: AdminWallet[] = data?.wallets ?? [];
  const filtered = wallets.filter(w =>
    !search ||
    w.label?.toLowerCase().includes(search.toLowerCase()) ||
    w.zeroAddress?.includes(search) ||
    w.evmAddress?.toLowerCase().includes(search.toLowerCase()) ||
    w.userEmail?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <AdminLayout>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Wallets Management</h1>
        <span className="text-sm text-gray-500">{data?.total ?? 0} total wallets</span>
      </div>

      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search by address, email, or label..."
          className="w-full bg-[#1a1a1a] border border-white/10 rounded-xl pl-9 pr-4 py-3 text-sm text-white outline-none placeholder-gray-600"
        />
      </div>

      {/* Edit Balance Modal */}
      {editingWallet && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <div className="bg-[#1a1a1a] rounded-2xl p-6 w-full max-w-sm border border-white/10">
            <h3 className="font-bold text-lg mb-1">Update Balance</h3>
            <p className="text-sm text-gray-500 mb-4">{editingWallet.label} · {editingWallet.zeroAddress}</p>
            <p className="text-xs text-gray-500 mb-4">Current: <span className="text-white font-semibold">{editingWallet.balanceTlos} TLOS</span></p>
            <div className="space-y-3 mb-4">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">New TLOS Balance</label>
                <input
                  type="number"
                  step="any"
                  value={newTlos}
                  onChange={e => setNewTlos(e.target.value)}
                  placeholder={editingWallet.balanceTlos}
                  className="w-full bg-[#111] border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-cyan-500/50"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">USD Equivalent (optional)</label>
                <input
                  type="number"
                  step="any"
                  value={newUsd}
                  onChange={e => setNewUsd(e.target.value)}
                  placeholder={editingWallet.balanceUsd}
                  className="w-full bg-[#111] border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-cyan-500/50"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Admin Note (optional)</label>
                <input
                  value={note}
                  onChange={e => setNote(e.target.value)}
                  placeholder="e.g. Manual credit — deposit received"
                  className="w-full bg-[#111] border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-cyan-500/50"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => updateBalance.mutate({ walletId: editingWallet.id, balanceTlos: newTlos || undefined, balanceUsd: newUsd || undefined, note: note || undefined })}
                disabled={updateBalance.isPending || (!newTlos && !newUsd)}
                className="flex-1 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-purple-600 text-white font-bold text-sm disabled:opacity-40"
              >
                {updateBalance.isPending ? "Updating..." : "Update Balance"}
              </button>
              <button onClick={() => setEditingWallet(null)} className="px-4 py-3 rounded-xl bg-[#222] text-gray-400 text-sm">Cancel</button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-[#111] rounded-2xl overflow-hidden border border-white/5">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-[#1a1a1a]">
              <tr>
                <th className="text-left px-4 py-3 text-gray-500 font-medium text-xs">User / Wallet</th>
                <th className="text-left px-4 py-3 text-gray-500 font-medium text-xs">Zero Address</th>
                <th className="text-left px-4 py-3 text-gray-500 font-medium text-xs">EVM Address</th>
                <th className="text-right px-4 py-3 text-gray-500 font-medium text-xs">Balance</th>
                <th className="text-right px-4 py-3 text-gray-500 font-medium text-xs">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}><td colSpan={5} className="p-4"><Skeleton className="h-8 w-full bg-white/5" /></td></tr>
                ))
              ) : filtered.length === 0 ? (
                <tr><td colSpan={5} className="text-center py-12 text-gray-600">No wallets found</td></tr>
              ) : filtered.map(w => (
                <tr key={w.id} className="hover:bg-white/3 transition-colors">
                  <td className="px-4 py-3">
                    <p className="font-semibold text-sm">{w.label}</p>
                    <p className="text-xs text-gray-500 truncate max-w-[150px]">{w.userEmail || `User #${w.userId}`}</p>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono text-xs text-cyan-400">{w.zeroAddress}</span>
                      <button onClick={() => copy(w.zeroAddress, "Zero address")} className="text-gray-600 hover:text-white">
                        <Copy className="w-3 h-3" />
                      </button>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono text-xs text-gray-400">{w.evmAddress.slice(0, 10)}...{w.evmAddress.slice(-6)}</span>
                      <button onClick={() => copy(w.evmAddress, "EVM address")} className="text-gray-600 hover:text-white">
                        <Copy className="w-3 h-3" />
                      </button>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <p className="font-bold text-white">{parseFloat(w.balanceTlos).toFixed(4)} TLOS</p>
                    <p className="text-xs text-gray-500">${parseFloat(w.balanceUsd).toFixed(2)}</p>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => { setEditingWallet(w); setNewTlos(w.balanceTlos); setNewUsd(w.balanceUsd); }}
                      className="flex items-center gap-1.5 ml-auto bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-cyan-500/20"
                    >
                      <Edit2 className="w-3 h-3" /> Edit Balance
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </AdminLayout>
  );
}
