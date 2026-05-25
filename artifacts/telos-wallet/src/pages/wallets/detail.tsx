import { Layout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Link, useRoute } from "wouter";
import { useGetWallet, useGetWalletBalance } from "@workspace/api-client-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Copy, ArrowUpRight, ArrowDownLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function WalletDetailPage() {
  const [, params] = useRoute("/wallets/:id");
  const walletId = params?.id ? parseInt(params.id) : 0;
  const { toast } = useToast();
  
  const { data: wallet, isLoading } = useGetWallet(walletId, { query: { enabled: !!walletId } });
  const { data: balances, isLoading: balancesLoading } = useGetWalletBalance(walletId, { query: { enabled: !!walletId, refetchInterval: 10000 } });
  
  const copyToClipboard = (text: string, type: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied!",
      description: `${type} address copied to clipboard.`,
    });
  };

  return (
    <Layout>
      <div className="max-w-4xl mx-auto">
        <header className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold">{isLoading ? <Skeleton className="h-9 w-32" /> : wallet?.label}</h1>
            <p className="text-muted-foreground">Manage your assets across both networks.</p>
          </div>
          <div className="flex gap-3">
            <Link href={`/wallets/${walletId}/receive`}>
              <Button variant="outline" className="gap-2">
                <ArrowDownLeft className="w-4 h-4 text-primary" />
                Receive
              </Button>
            </Link>
            <Link href={`/wallets/${walletId}/send`}>
              <Button className="gap-2">
                <ArrowUpRight className="w-4 h-4" />
                Send
              </Button>
            </Link>
          </div>
        </header>
        
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          {/* Telos Zero Card */}
          <div className="bg-card border border-border rounded-2xl p-6 relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-bl-full -mr-8 -mt-8 transition-transform group-hover:scale-110" />
            <h3 className="text-xl font-bold mb-6 text-primary flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
              Telos Zero
            </h3>
            
            <div className="mb-6">
              <p className="text-sm text-muted-foreground mb-1">Available Balance</p>
              {balancesLoading ? <Skeleton className="h-10 w-32" /> : (
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-extrabold tracking-tight">{balances?.zeroBalance || "0.0000"}</span>
                  <span className="text-lg text-muted-foreground font-bold">TLOS</span>
                </div>
              )}
            </div>

            {isLoading ? (
              <Skeleton className="h-12 w-full" />
            ) : (
              <div className="bg-background/50 border border-border/50 p-4 rounded-xl flex items-center justify-between mt-auto">
                <span className="font-mono text-lg tracking-widest font-bold">{wallet?.zeroAddress}</span>
                <Button variant="ghost" size="icon" onClick={() => copyToClipboard(wallet?.zeroAddress || "", "Telos Zero")} className="hover:bg-primary/20 hover:text-primary">
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
            )}
          </div>
          
          {/* Telos EVM Card */}
          <div className="bg-card border border-border rounded-2xl p-6 relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-secondary/5 rounded-bl-full -mr-8 -mt-8 transition-transform group-hover:scale-110" />
            <h3 className="text-xl font-bold mb-6 text-secondary flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-secondary animate-pulse" />
              Telos EVM
            </h3>
            
            <div className="mb-6">
              <p className="text-sm text-muted-foreground mb-1">Available Balance</p>
              {balancesLoading ? <Skeleton className="h-10 w-32" /> : (
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-extrabold tracking-tight">{balances?.evmBalance || "0.0000"}</span>
                  <span className="text-lg text-muted-foreground font-bold">TLOS</span>
                </div>
              )}
            </div>

            {isLoading ? (
              <Skeleton className="h-12 w-full" />
            ) : (
              <div className="bg-background/50 border border-border/50 p-4 rounded-xl flex items-center justify-between mt-auto">
                <span className="font-mono text-sm break-all font-medium leading-relaxed">{wallet?.evmAddress}</span>
                <Button variant="ghost" size="icon" onClick={() => copyToClipboard(wallet?.evmAddress || "", "Telos EVM")} className="hover:bg-secondary/20 hover:text-secondary shrink-0 ml-4">
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
            )}
          </div>
        </div>
        
        <div className="bg-card border border-border rounded-xl p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold">Recent Activity</h2>
            <Link href="/transactions">
              <Button variant="link" className="text-primary">View All History</Button>
            </Link>
          </div>
          <div className="text-center py-12 border border-dashed border-border rounded-lg bg-background/50">
            <p className="text-muted-foreground mb-4">You can view complete transaction history in the Transactions tab.</p>
            <Link href={`/wallets/${walletId}/receive`}>
              <Button variant="secondary">Receive Assets to Get Started</Button>
            </Link>
          </div>
        </div>
      </div>
    </Layout>
  );
}
