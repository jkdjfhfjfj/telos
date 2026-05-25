import { useState } from "react";
import { AdminLayout } from "@/components/layout";
import { useAdminGetStats, useAdminListUsers, useAdminUpdateUser, getAdminListUsersQueryKey } from "@workspace/api-client-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { Users, Wallet, ArrowRightLeft, AlertTriangle, Search } from "lucide-react";
import { Link } from "wouter";

export default function AdminDashboardPage() {
  const { data: stats, isLoading: statsLoading } = useAdminGetStats();
  const [search, setSearch] = useState("");
  const { data: users, isLoading: usersLoading } = useAdminListUsers({ search: search || undefined, limit: 20 } as any);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const updateUser = useAdminUpdateUser({
    mutation: {
      onSuccess: () => {
        toast({ title: "User updated" });
        queryClient.invalidateQueries({ queryKey: getAdminListUsersQueryKey() });
      },
      onError: () => toast({ title: "Update failed", variant: "destructive" })
    }
  });

  const toggleStatus = (userId: string, currentStatus: string) => {
    updateUser.mutate({ userId, data: { status: currentStatus === "active" ? "suspended" : "active" } });
  };

  const makeAdmin = (userId: string) => {
    updateUser.mutate({ userId, data: { role: "admin" } });
  };

  const statCards = [
    { label: "Total Users", value: stats?.totalUsers, icon: Users, color: "text-cyan-400" },
    { label: "Wallets", value: stats?.totalWallets, icon: Wallet, color: "text-purple-400" },
    { label: "Transactions", value: stats?.totalTransactions, icon: ArrowRightLeft, color: "text-green-400" },
    { label: "Pending Withdrawals", value: (stats as any)?.pendingWithdrawals ?? 0, icon: AlertTriangle, color: "text-yellow-400" },
  ];

  return (
    <AdminLayout>
      <h1 className="text-2xl font-bold mb-6">Admin Dashboard</h1>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {statCards.map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-[#1a1a1a] rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <Icon className={`w-4 h-4 ${color}`} />
              <p className="text-xs text-gray-500">{label}</p>
            </div>
            {statsLoading ? <Skeleton className="h-8 w-16 bg-white/10" /> : (
              <p className={`text-3xl font-bold ${color}`}>{value ?? 0}</p>
            )}
          </div>
        ))}
      </div>

      {/* Quick links */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
        <Link href="/admin/wallets">
          <div className="bg-cyan-500/10 border border-cyan-500/20 rounded-xl p-4 cursor-pointer hover:bg-cyan-500/15 transition-colors">
            <Wallet className="w-5 h-5 text-cyan-400 mb-2" />
            <p className="text-sm font-semibold text-cyan-400">Manage Wallets</p>
            <p className="text-xs text-gray-500 mt-0.5">Update balances</p>
          </div>
        </Link>
        <Link href="/admin/withdrawals">
          <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-4 cursor-pointer hover:bg-yellow-500/15 transition-colors">
            <AlertTriangle className="w-5 h-5 text-yellow-400 mb-2" />
            <p className="text-sm font-semibold text-yellow-400">Withdrawals</p>
            <p className="text-xs text-gray-500 mt-0.5">Approve / Reject</p>
          </div>
        </Link>
        <Link href="/admin/transactions">
          <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-4 cursor-pointer hover:bg-green-500/15 transition-colors">
            <ArrowRightLeft className="w-5 h-5 text-green-400 mb-2" />
            <p className="text-sm font-semibold text-green-400">Transactions</p>
            <p className="text-xs text-gray-500 mt-0.5">Full history</p>
          </div>
        </Link>
        <Link href="/admin/users">
          <div className="bg-purple-500/10 border border-purple-500/20 rounded-xl p-4 cursor-pointer hover:bg-purple-500/15 transition-colors">
            <Users className="w-5 h-5 text-purple-400 mb-2" />
            <p className="text-sm font-semibold text-purple-400">Users</p>
            <p className="text-xs text-gray-500 mt-0.5">Manage accounts</p>
          </div>
        </Link>
      </div>

      {/* Users table */}
      <div className="bg-[#111] rounded-2xl overflow-hidden border border-white/5">
        <div className="p-4 flex items-center justify-between border-b border-white/5">
          <h2 className="text-base font-bold">Recent Users</h2>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search..."
              className="bg-[#1a1a1a] border border-white/10 rounded-xl pl-8 pr-3 py-2 text-sm text-white outline-none w-48 placeholder-gray-600"
            />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-[#1a1a1a]">
              <tr>
                <th className="text-left px-4 py-3 text-gray-500 font-medium text-xs">Email</th>
                <th className="text-left px-4 py-3 text-gray-500 font-medium text-xs">Role</th>
                <th className="text-left px-4 py-3 text-gray-500 font-medium text-xs">Status</th>
                <th className="text-left px-4 py-3 text-gray-500 font-medium text-xs">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {usersLoading ? (
                <tr><td colSpan={4} className="p-4"><Skeleton className="h-8 w-full bg-white/10" /></td></tr>
              ) : users?.users?.map((user: any) => (
                <tr key={user.id} className="hover:bg-white/3 transition-colors">
                  <td className="px-4 py-3">
                    <p className="font-medium truncate max-w-[200px]">{user.email}</p>
                    <p className="text-xs text-gray-600">{user.displayName || ""}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${user.role === "admin" ? "bg-cyan-500/20 text-cyan-400" : "bg-gray-700 text-gray-400"}`}>
                      {user.role}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${user.status === "active" ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"}`}>
                      {user.status || "active"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <Link href={`/admin/users/${user.clerkId}`}>
                        <button className="text-xs bg-[#222] text-gray-300 px-3 py-1 rounded-lg hover:bg-[#333]">View</button>
                      </Link>
                      <button
                        onClick={() => toggleStatus(user.clerkId, user.status || "active")}
                        disabled={updateUser.isPending}
                        className={`text-xs px-3 py-1 rounded-lg ${user.status === "active" ? "bg-red-500/20 text-red-400" : "bg-green-500/20 text-green-400"}`}
                      >
                        {user.status === "active" ? "Suspend" : "Activate"}
                      </button>
                      {user.role !== "admin" && (
                        <button
                          onClick={() => makeAdmin(user.clerkId)}
                          disabled={updateUser.isPending}
                          className="text-xs bg-cyan-500/20 text-cyan-400 px-3 py-1 rounded-lg"
                        >
                          Make Admin
                        </button>
                      )}
                    </div>
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
