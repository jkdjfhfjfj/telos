import { useAdminGetUser } from "@workspace/api-client-react";
import { useRoute, useLocation, Link } from "wouter";
import { Layout } from "@/components/layout";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export default function AdminUserDetailPage() {
  const [, params] = useRoute("/admin/users/:id");
  const userId = params?.id || "";
  const [, setLocation] = useLocation();

  const { data: user, isLoading } = useAdminGetUser(userId, { query: { enabled: !!userId } });

  return (
    <Layout>
      <div className="max-w-4xl mx-auto space-y-8">
        <Button variant="ghost" onClick={() => setLocation("/admin")} className="mb-6 gap-2 -ml-4">
          <ArrowLeft className="w-4 h-4" /> Back to Admin Dashboard
        </Button>
        
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-4">
            User Detail
            {user && (
              <Badge variant={user.status === 'active' ? 'default' : 'destructive'}>
                {user.status}
              </Badge>
            )}
          </h1>
          <p className="text-muted-foreground mt-2">Manage user account and review activity.</p>
        </div>

        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-32 w-full rounded-xl" />
            <Skeleton className="h-64 w-full rounded-xl" />
          </div>
        ) : user ? (
          <>
            <div className="bg-card border border-border rounded-xl p-6 grid grid-cols-2 gap-6">
              <div>
                <p className="text-sm text-muted-foreground font-medium mb-1">ID</p>
                <p className="font-mono">{user.id}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground font-medium mb-1">Email</p>
                <p>{user.email}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground font-medium mb-1">Role</p>
                <p className="capitalize">{user.role}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground font-medium mb-1">2FA Status</p>
                <p>{user.twoFactorEnabled ? "Enabled" : "Disabled"}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground font-medium mb-1">Created At</p>
                <p>{new Date(user.createdAt).toLocaleString()}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div className="bg-card border border-border rounded-xl p-6">
                <h3 className="font-bold text-lg mb-2">Wallets</h3>
                <p className="text-3xl font-extrabold text-primary">{user.walletCount}</p>
              </div>
              <div className="bg-card border border-border rounded-xl p-6">
                <h3 className="font-bold text-lg mb-2">Transactions</h3>
                <p className="text-3xl font-extrabold text-secondary">{user.transactionCount}</p>
              </div>
            </div>
          </>
        ) : (
          <div className="p-12 text-center text-muted-foreground border border-dashed rounded-xl">
            User not found.
          </div>
        )}
      </div>
    </Layout>
  );
}
