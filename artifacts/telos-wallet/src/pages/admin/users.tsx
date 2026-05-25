import { useState } from "react";
import { AdminLayout } from "@/components/layout";
import { useAdminListUsers, useAdminUpdateUser, getAdminListUsersQueryKey } from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "wouter";
import { Search, Shield, ShieldOff } from "lucide-react";

export default function AdminUsersPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");

  const { data, isLoading } = useAdminListUsers({ search: search || undefined, limit: 100 } as any);

  const updateUser = useAdminUpdateUser({
    mutation: {
      onSuccess: () => {
        toast({ title: "User updated" });
        queryClient.invalidateQueries({ queryKey: getAdminListUsersQueryKey() });
      },
      onError: (err: any) => toast({ title: "Failed", description: err.message, variant: "destructive" }),
    }
  });

  const toggleStatus = (userId: string, status: string) =>
    updateUser.mutate({ userId, data: { status: status === "active" ? "suspended" : "active" } });

  const setRole = (userId: string, role: "user" | "admin") =>
    updateUser.mutate({ userId, data: { role } });

  const users = (data as any)?.users ?? [];

  return (
    <AdminLayout>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">User Management</h1>
        <span className="text-sm text-gray-500">{(data as any)?.total ?? 0} users</span>
      </div>

      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search by email or name..."
          className="w-full bg-[#1a1a1a] border border-white/10 rounded-xl pl-9 pr-4 py-3 text-sm text-white outline-none placeholder-gray-600"
        />
      </div>

      <div className="space-y-3">
        {isLoading ? (
          Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-20 w-full rounded-2xl bg-white/5" />)
        ) : users.length === 0 ? (
          <div className="text-center py-12 text-gray-600">No users found</div>
        ) : users.map((user: any) => (
          <div key={user.id} className="bg-[#1a1a1a] rounded-2xl p-4 border border-white/5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-500/30 to-purple-600/30 flex items-center justify-center text-white font-bold text-sm shrink-0">
                {(user.displayName || user.email || "U")[0].toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <p className="font-semibold text-sm truncate">{user.email}</p>
                  <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full shrink-0 ${user.role === "admin" ? "bg-cyan-500/20 text-cyan-400" : "bg-gray-700 text-gray-400"}`}>
                    {user.role}
                  </span>
                  <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full shrink-0 ${(user.status || "active") === "active" ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"}`}>
                    {user.status || "active"}
                  </span>
                  {user.twoFactorEnabled && (
                    <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full shrink-0 bg-blue-500/20 text-blue-400">2FA</span>
                  )}
                </div>
                <p className="text-xs text-gray-600">Joined {new Date(user.createdAt).toLocaleDateString()}</p>
              </div>
            </div>

            <div className="flex gap-2 mt-3 flex-wrap">
              <Link href={`/admin/users/${user.clerkId}`}>
                <button className="text-xs bg-[#222] text-gray-300 px-3 py-1.5 rounded-lg hover:bg-[#333]">View Details</button>
              </Link>
              <button
                onClick={() => toggleStatus(user.clerkId, user.status || "active")}
                disabled={updateUser.isPending}
                className={`text-xs px-3 py-1.5 rounded-lg font-medium flex items-center gap-1 ${
                  (user.status || "active") === "active"
                    ? "bg-red-500/15 text-red-400"
                    : "bg-green-500/15 text-green-400"
                }`}
              >
                {(user.status || "active") === "active" ? <><ShieldOff className="w-3 h-3" /> Suspend</> : <><Shield className="w-3 h-3" /> Activate</>}
              </button>
              {user.role !== "admin" ? (
                <button
                  onClick={() => setRole(user.clerkId, "admin")}
                  disabled={updateUser.isPending}
                  className="text-xs bg-cyan-500/15 text-cyan-400 px-3 py-1.5 rounded-lg"
                >
                  Make Admin
                </button>
              ) : (
                <button
                  onClick={() => setRole(user.clerkId, "user")}
                  disabled={updateUser.isPending}
                  className="text-xs bg-gray-700 text-gray-400 px-3 py-1.5 rounded-lg"
                >
                  Remove Admin
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </AdminLayout>
  );
}
