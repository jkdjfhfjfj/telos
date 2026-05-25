import { useGetMe, useListWallets, useGetNetworkStats } from "@workspace/api-client-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Layout } from "@/components/layout";
import { Skeleton } from "@/components/ui/skeleton";

export default function DashboardPage() {
  const { data: user } = useGetMe();
  const { data: wallets, isLoading: isLoadingWallets } = useListWallets();
  const { data: stats, isLoading: isLoadingStats } = useGetNetworkStats();

  return (
    <Layout>
      <header className="mb-8">
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">Welcome back, {user?.displayName || user?.email}</p>
      </header>
      
      <div className="grid grid-cols-3 gap-6 mb-8">
        <div className="p-6 bg-card border border-border rounded-xl">
          <h3 className="text-sm font-medium text-muted-foreground mb-1">Total Wallets</h3>
          {isLoadingWallets ? <Skeleton className="h-9 w-16" /> : <p className="text-3xl font-bold">{wallets?.length || 0}</p>}
        </div>
        <div className="p-6 bg-card border border-border rounded-xl">
          <h3 className="text-sm font-medium text-muted-foreground mb-1">TLOS Price</h3>
          {isLoadingStats ? <Skeleton className="h-9 w-24" /> : <p className="text-3xl font-bold">${stats?.tlosPrice || "0.00"}</p>}
        </div>
        <div className="p-6 bg-card border border-border rounded-xl">
          <h3 className="text-sm font-medium text-muted-foreground mb-1">Network TPS</h3>
          {isLoadingStats ? <Skeleton className="h-9 w-16" /> : <p className="text-3xl font-bold text-primary">{stats?.tps || 0}</p>}
        </div>
      </div>

      <div className="bg-card border border-border rounded-xl p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold">Your Wallets</h2>
          <Link href="/wallets/create">
            <Button size="sm">Create Wallet</Button>
          </Link>
        </div>
        
        {isLoadingWallets ? (
          <div className="space-y-4">
            <Skeleton className="h-20 w-full rounded-lg" />
            <Skeleton className="h-20 w-full rounded-lg" />
          </div>
        ) : wallets && wallets.length > 0 ? (
          <div className="grid gap-4">
            {wallets.map((wallet) => (
              <div key={wallet.id} className="p-4 border border-border rounded-lg flex items-center justify-between hover:border-primary/50 transition-colors">
                <div>
                  <h4 className="font-medium text-lg text-primary">{wallet.label}</h4>
                  <div className="flex gap-4 mt-1">
                    <p className="text-sm text-muted-foreground font-mono">
                      <span className="text-foreground/50 mr-1">Zero:</span>
                      {wallet.zeroAddress}
                    </p>
                    <p className="text-sm text-muted-foreground font-mono">
                      <span className="text-foreground/50 mr-1">EVM:</span>
                      {wallet.evmAddress.slice(0, 6)}...{wallet.evmAddress.slice(-4)}
                    </p>
                  </div>
                </div>
                <Link href={`/wallets/${wallet.id}`}>
                  <Button variant="secondary" size="sm">Manage</Button>
                </Link>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 border border-dashed border-border rounded-lg">
            <p className="text-muted-foreground mb-4">You don't have any wallets yet.</p>
            <Link href="/wallets/create">
              <Button>Create Your First Wallet</Button>
            </Link>
          </div>
        )}
      </div>
    </Layout>
  );
}
