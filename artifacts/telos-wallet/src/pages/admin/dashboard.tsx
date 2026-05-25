import { useState } from "react";
import { Layout } from "@/components/layout";
import { useAdminGetStats, useAdminListUsers, useAdminListTransactions, useAdminUpdateUser, getAdminListUsersQueryKey } from "@workspace/api-client-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { Search } from "lucide-react";

export default function AdminDashboardPage() {
  const { data: stats, isLoading: statsLoading } = useAdminGetStats();
  const [search, setSearch] = useState("");
  const { data: users, isLoading: usersLoading } = useAdminListUsers({ search: search || undefined });
  const { data: txs, isLoading: txsLoading } = useAdminListTransactions({ limit: 50 });
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const updateUser = useAdminUpdateUser({
    mutation: {
      onSuccess: () => {
        toast({ title: "User updated successfully" });
        queryClient.invalidateQueries({ queryKey: getAdminListUsersQueryKey() });
      },
      onError: () => toast({ title: "Update failed", variant: "destructive" })
    }
  });

  const handleToggleStatus = (userId: string, currentStatus: string) => {
    updateUser.mutate({
      userId: userId.toString(),
      data: { status: currentStatus === 'active' ? 'suspended' : 'active' }
    });
  };

  return (
    <Layout>
      <div className="max-w-6xl mx-auto space-y-8">
        <div>
          <h1 className="text-3xl font-bold">Admin Control Center</h1>
          <p className="text-muted-foreground">Platform-wide statistics and management.</p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard title="Total Users" value={stats?.totalUsers} loading={statsLoading} />
          <StatCard title="Total Wallets" value={stats?.totalWallets} loading={statsLoading} />
          <StatCard title="Transactions" value={stats?.totalTransactions} loading={statsLoading} />
          <StatCard title="Active Today" value={stats?.activeUsersToday} loading={statsLoading} />
        </div>

        <Tabs defaultValue="users" className="w-full">
          <TabsList className="mb-6">
            <TabsTrigger value="users">User Management</TabsTrigger>
            <TabsTrigger value="transactions">All Transactions</TabsTrigger>
          </TabsList>

          <TabsContent value="users" className="space-y-4">
            <div className="flex gap-4 mb-4">
              <div className="relative w-full max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input 
                  placeholder="Search by email..." 
                  value={search} 
                  onChange={e => setSearch(e.target.value)} 
                  className="pl-9"
                />
              </div>
            </div>

            <div className="bg-card border border-border rounded-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm whitespace-nowrap">
                  <thead className="bg-muted text-muted-foreground border-b border-border">
                    <tr>
                      <th className="px-4 py-3 font-medium">ID</th>
                      <th className="px-4 py-3 font-medium">Email</th>
                      <th className="px-4 py-3 font-medium">Role</th>
                      <th className="px-4 py-3 font-medium">Status</th>
                      <th className="px-4 py-3 font-medium text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {usersLoading ? (
                      <tr><td colSpan={5} className="p-4"><Skeleton className="h-8 w-full" /></td></tr>
                    ) : users?.users?.map(user => (
                      <tr key={user.id} className="hover:bg-muted/30">
                        <td className="px-4 py-3 font-mono text-xs">{user.id}</td>
                        <td className="px-4 py-3 font-medium">{user.email}</td>
                        <td className="px-4 py-3"><Badge variant="outline">{user.role}</Badge></td>
                        <td className="px-4 py-3">
                          <Badge variant={user.status === 'active' ? 'default' : 'destructive'}>
                            {user.status || "active"}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Button 
                            variant={user.status === 'active' ? 'destructive' : 'default'} 
                            size="sm"
                            onClick={() => handleToggleStatus(user.id.toString(), user.status || 'active')}
                            disabled={updateUser.isPending}
                          >
                            {user.status === 'active' ? 'Suspend' : 'Activate'}
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="transactions">
            <div className="bg-card border border-border rounded-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm whitespace-nowrap">
                  <thead className="bg-muted text-muted-foreground border-b border-border">
                    <tr>
                      <th className="px-4 py-3 font-medium">ID</th>
                      <th className="px-4 py-3 font-medium">Amount</th>
                      <th className="px-4 py-3 font-medium">Network</th>
                      <th className="px-4 py-3 font-medium">Status</th>
                      <th className="px-4 py-3 font-medium">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {txsLoading ? (
                      <tr><td colSpan={5} className="p-4"><Skeleton className="h-8 w-full" /></td></tr>
                    ) : txs?.map((tx: any) => (
                      <tr key={tx.id} className="hover:bg-muted/30">
                        <td className="px-4 py-3 font-mono text-xs">{tx.id}</td>
                        <td className="px-4 py-3 font-bold">{tx.amount} {tx.currency}</td>
                        <td className="px-4 py-3 uppercase text-xs">{tx.network}</td>
                        <td className="px-4 py-3"><Badge variant="outline">{tx.status}</Badge></td>
                        <td className="px-4 py-3 text-muted-foreground">{new Date(tx.createdAt).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}

function StatCard({ title, value, loading }: { title: string, value: any, loading: boolean }) {
  return (
    <div className="bg-card border border-border p-6 rounded-xl">
      <p className="text-sm font-medium text-muted-foreground mb-2">{title}</p>
      {loading ? <Skeleton className="h-8 w-20" /> : <p className="text-3xl font-bold">{value || 0}</p>}
    </div>
  );
}
