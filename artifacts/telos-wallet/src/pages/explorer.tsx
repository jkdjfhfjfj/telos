import { useState } from "react";
import { Layout } from "@/components/layout";
import { useGetExplorerBlocks, useGetExplorerTransactions, useExplorerSearch } from "@workspace/api-client-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Box, ArrowRightLeft, Zap, Globe, X, Hash, Clock } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

type Network = "evm" | "zero";

export default function ExplorerPage() {
  const [network, setNetwork] = useState<Network>("evm");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchTrigger, setSearchTrigger] = useState("");
  const [activeTab, setActiveTab] = useState<"blocks" | "transactions">("blocks");

  const { data: blocks, isLoading: blocksLoading } = useGetExplorerBlocks(
    { network },
    { query: { refetchInterval: 5000 } as any }
  );
  const { data: txs, isLoading: txsLoading } = useGetExplorerTransactions(
    { network },
    { query: { refetchInterval: 5000 } as any }
  );

  const { data: searchResults, isLoading: searchLoading } = useExplorerSearch(
    { q: searchTrigger },
    { query: { enabled: !!searchTrigger } as any }
  );

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) setSearchTrigger(searchQuery.trim());
  };

  const clearSearch = () => {
    setSearchTrigger("");
    setSearchQuery("");
  };

  return (
    <Layout>
      <div className="px-4 pt-5 pb-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold mb-0.5">Explorer</h1>
          <p className="text-gray-500 text-sm">Live Telos network activity</p>
        </div>

        <form onSubmit={handleSearch} className="flex gap-2 mb-5">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500 w-4 h-4" />
            <input
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Address, block, or tx hash..."
              className="w-full bg-[#1a1a1a] border border-white/10 rounded-xl pl-10 pr-4 py-3 text-sm text-white outline-none focus:border-cyan-500/50 transition-colors placeholder-gray-600"
            />
          </div>
          <button
            type="submit"
            className="px-4 py-3 bg-cyan-500 text-white rounded-xl text-sm font-semibold hover:bg-cyan-400 transition-colors shrink-0"
          >
            Search
          </button>
        </form>

        {searchTrigger && (
          <div className="mb-5 bg-[#1a1a1a] border border-white/10 rounded-2xl overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
              <div className="flex items-center gap-2">
                <Hash className="w-4 h-4 text-cyan-400" />
                <span className="text-sm font-semibold">Search Results</span>
              </div>
              <button onClick={clearSearch} className="text-gray-500 hover:text-gray-300 transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-4">
              {searchLoading ? (
                <Skeleton className="h-20 w-full bg-white/5" />
              ) : searchResults ? (
                <div>
                  <span className="inline-block text-[10px] font-bold uppercase tracking-widest text-cyan-400 bg-cyan-500/10 border border-cyan-500/20 rounded-full px-2.5 py-1 mb-3">
                    {searchResults.type}
                  </span>
                  <pre className="text-xs font-mono whitespace-pre-wrap overflow-x-auto text-gray-400 bg-black/40 p-3 rounded-xl leading-relaxed">
                    {JSON.stringify(searchResults.data, null, 2)}
                  </pre>
                </div>
              ) : (
                <p className="text-gray-500 text-sm text-center py-4">No results found</p>
              )}
            </div>
          </div>
        )}

        <div className="flex items-center gap-2 mb-4">
          <button
            onClick={() => setNetwork("evm")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
              network === "evm"
                ? "bg-cyan-500/15 border border-cyan-500/30 text-cyan-400"
                : "bg-[#1a1a1a] border border-white/10 text-gray-400 hover:text-gray-200"
            }`}
          >
            <Globe className="w-3.5 h-3.5" />
            Telos EVM
          </button>
          <button
            onClick={() => setNetwork("zero")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
              network === "zero"
                ? "bg-purple-500/15 border border-purple-500/30 text-purple-400"
                : "bg-[#1a1a1a] border border-white/10 text-gray-400 hover:text-gray-200"
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            Telos Zero
          </button>

          <div className="flex-1" />

          <div className="flex bg-[#1a1a1a] border border-white/10 rounded-xl p-0.5">
            <button
              onClick={() => setActiveTab("blocks")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === "blocks" ? "bg-white/10 text-white" : "text-gray-500"
              }`}
            >
              <Box className="w-3 h-3" /> Blocks
            </button>
            <button
              onClick={() => setActiveTab("transactions")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === "transactions" ? "bg-white/10 text-white" : "text-gray-500"
              }`}
            >
              <ArrowRightLeft className="w-3 h-3" /> Txns
            </button>
          </div>
        </div>

        <div className="bg-[#111] border border-white/5 rounded-2xl overflow-hidden">
          {activeTab === "blocks" ? (
            <>
              <div className="px-4 py-3 border-b border-white/5 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Box className="w-4 h-4 text-cyan-400" />
                  <span className="text-sm font-bold">Latest Blocks</span>
                </div>
                <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
              </div>
              {blocksLoading ? (
                <div className="p-4 space-y-3">
                  {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-14 w-full bg-white/5" />)}
                </div>
              ) : blocks && blocks.length > 0 ? (
                <div className="divide-y divide-white/5">
                  {blocks.map(block => (
                    <div key={block.blockNumber} className="px-4 py-3.5 flex items-center gap-3 hover:bg-white/3 transition-colors">
                      <div className="w-9 h-9 rounded-lg bg-cyan-500/10 flex items-center justify-center shrink-0">
                        <Box className="w-4 h-4 text-cyan-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-sm text-cyan-400"># {block.blockNumber.toLocaleString()}</p>
                        <p className="text-xs text-gray-500 truncate font-mono">
                          {block.producer.slice(0, 16)}...
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-sm font-semibold">{block.txCount} txns</p>
                        <p className="text-xs text-gray-500 flex items-center gap-1 justify-end">
                          <Clock className="w-3 h-3" />
                          {new Date(block.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-12 text-center text-gray-600 text-sm">No block data available</div>
              )}
            </>
          ) : (
            <>
              <div className="px-4 py-3 border-b border-white/5 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ArrowRightLeft className="w-4 h-4 text-purple-400" />
                  <span className="text-sm font-bold">Recent Transactions</span>
                </div>
                <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
              </div>
              {txsLoading ? (
                <div className="p-4 space-y-3">
                  {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-14 w-full bg-white/5" />)}
                </div>
              ) : txs && txs.length > 0 ? (
                <div className="divide-y divide-white/5">
                  {txs.map(tx => (
                    <div key={tx.txHash} className="px-4 py-3.5 flex items-center gap-3 hover:bg-white/3 transition-colors overflow-hidden">
                      <div className="w-9 h-9 rounded-lg bg-purple-500/10 flex items-center justify-center shrink-0">
                        <ArrowRightLeft className="w-4 h-4 text-purple-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-mono text-xs text-purple-400 truncate">{tx.txHash}</p>
                        <p className="text-xs text-gray-500 font-mono truncate">From: {tx.fromAddress}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-sm font-semibold">{tx.amount} {tx.currency}</p>
                        <p className="text-xs text-gray-500 flex items-center gap-1 justify-end">
                          <Clock className="w-3 h-3" />
                          {new Date(tx.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-12 text-center text-gray-600 text-sm">No transaction data available</div>
              )}
            </>
          )}
        </div>
      </div>
    </Layout>
  );
}
