import { useState } from "react";
import { Layout } from "@/components/layout";
import { useGetExplorerBlocks, useGetExplorerTransactions, useExplorerSearch } from "@workspace/api-client-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Box, ArrowRightLeft } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";

export default function ExplorerPage() {
  const [network, setNetwork] = useState<"evm" | "zero">("evm");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchTrigger, setSearchTrigger] = useState("");

  const { data: blocks, isLoading: blocksLoading } = useGetExplorerBlocks({ network }, { query: { refetchInterval: 5000 } });
  const { data: txs, isLoading: txsLoading } = useGetExplorerTransactions({ network }, { query: { refetchInterval: 5000 } });
  
  const { data: searchResults, isLoading: searchLoading } = useExplorerSearch(
    { q: searchTrigger }, 
    { query: { enabled: !!searchTrigger } }
  );

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      setSearchTrigger(searchQuery.trim());
    }
  };

  return (
    <Layout>
      <div className="max-w-6xl mx-auto">
        <header className="mb-10 text-center max-w-2xl mx-auto">
          <h1 className="text-4xl font-extrabold mb-4">Telos Explorer</h1>
          <p className="text-muted-foreground text-lg mb-8">Real-time network visibility for Telos EVM and Telos Zero.</p>
          
          <form onSubmit={handleSearch} className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground w-5 h-5" />
              <Input 
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search by address, block, or transaction hash..." 
                className="pl-12 h-14 text-lg rounded-full bg-card shadow-sm border-border"
              />
            </div>
            <Button type="submit" size="lg" className="h-14 rounded-full px-8">Search</Button>
          </form>
        </header>

        {searchTrigger && (
          <div className="mb-12 bg-primary/5 border border-primary/20 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">Search Results</h2>
              <Button variant="ghost" size="sm" onClick={() => {setSearchTrigger(""); setSearchQuery("");}}>Clear</Button>
            </div>
            
            {searchLoading ? (
              <Skeleton className="h-24 w-full" />
            ) : searchResults ? (
              <div className="bg-card border border-border p-4 rounded-xl">
                <div className="mb-2">
                  <Badge variant="outline" className="uppercase tracking-wider font-bold mb-2">
                    Found {searchResults.type}
                  </Badge>
                </div>
                <pre className="text-sm font-mono whitespace-pre-wrap overflow-x-auto text-muted-foreground bg-muted p-4 rounded-lg">
                  {JSON.stringify(searchResults.data, null, 2)}
                </pre>
              </div>
            ) : null}
          </div>
        )}

        <Tabs value={network} onValueChange={(v) => setNetwork(v as any)} className="w-full">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold">Live Network Activity</h2>
            <TabsList className="h-12 bg-card border border-border">
              <TabsTrigger value="evm" className="text-base px-6">Telos EVM</TabsTrigger>
              <TabsTrigger value="zero" className="text-base px-6">Telos Zero</TabsTrigger>
            </TabsList>
          </div>

          <div className="grid lg:grid-cols-2 gap-8">
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-2">
                <Box className="w-5 h-5 text-primary" />
                <h3 className="text-lg font-bold">Latest Blocks</h3>
              </div>
              
              <div className="bg-card border border-border rounded-xl overflow-hidden">
                {blocksLoading ? (
                  <div className="p-4 space-y-4"><Skeleton className="h-16 w-full" /><Skeleton className="h-16 w-full" /></div>
                ) : blocks && blocks.length > 0 ? (
                  <div className="divide-y divide-border">
                    {blocks.map(block => (
                      <div key={block.blockNumber} className="p-4 flex items-center justify-between hover:bg-muted/50 transition-colors">
                        <div className="flex gap-4 items-center">
                          <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center font-bold text-sm">
                            Bk
                          </div>
                          <div>
                            <p className="font-bold text-primary cursor-pointer hover:underline">{block.blockNumber.toLocaleString()}</p>
                            <p className="text-xs text-muted-foreground">Proposer: <span className="font-mono">{block.producer.slice(0,10)}...</span></p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-bold">{block.txCount} txns</p>
                          <p className="text-xs text-muted-foreground">{new Date(block.timestamp).toLocaleTimeString()}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-8 text-center text-muted-foreground">No blocks data</div>
                )}
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-2">
                <ArrowRightLeft className="w-5 h-5 text-secondary" />
                <h3 className="text-lg font-bold">Recent Transactions</h3>
              </div>
              
              <div className="bg-card border border-border rounded-xl overflow-hidden">
                {txsLoading ? (
                  <div className="p-4 space-y-4"><Skeleton className="h-16 w-full" /><Skeleton className="h-16 w-full" /></div>
                ) : txs && txs.length > 0 ? (
                  <div className="divide-y divide-border">
                    {txs.map(tx => (
                      <div key={tx.txHash} className="p-4 flex items-center justify-between hover:bg-muted/50 transition-colors">
                        <div className="flex gap-4 items-center overflow-hidden">
                          <div className="w-12 h-12 rounded-lg bg-secondary/10 text-secondary flex items-center justify-center">
                            <ArrowRightLeft className="w-5 h-5" />
                          </div>
                          <div className="overflow-hidden">
                            <p className="font-mono text-sm text-secondary truncate cursor-pointer hover:underline max-w-[200px]">{tx.txHash}</p>
                            <p className="text-xs text-muted-foreground font-mono truncate max-w-[200px]">From: {tx.fromAddress}</p>
                          </div>
                        </div>
                        <div className="text-right pl-4 shrink-0">
                          <p className="text-sm font-bold">{tx.amount} {tx.currency}</p>
                          <p className="text-xs text-muted-foreground">{new Date(tx.timestamp).toLocaleTimeString()}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-8 text-center text-muted-foreground">No transaction data</div>
                )}
              </div>
            </div>
          </div>
        </Tabs>
      </div>
    </Layout>
  );
}
