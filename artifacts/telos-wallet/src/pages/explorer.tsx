import { useState, useEffect, useRef, useCallback } from "react";
import { Layout } from "@/components/layout";
import { useGetExplorerBlocks, useGetExplorerTransactions, useExplorerSearch } from "@workspace/api-client-react";
import { Search, Box, ArrowRightLeft, Zap, Globe, X, ChevronDown, ChevronUp, Copy, Check, Activity, Layers, Clock, RefreshCw } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

type Network = "evm" | "zero";

function useCopy() {
  const [copied, setCopied] = useState<string | null>(null);
  const copy = useCallback((text: string, id: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(id);
      setTimeout(() => setCopied(null), 1800);
    });
  }, []);
  return { copied, copy };
}

function CopyBtn({ text, id, copied, copy }: { text: string; id: string; copied: string | null; copy: (t: string, i: string) => void }) {
  const isCopied = copied === id;
  return (
    <button
      onClick={e => { e.stopPropagation(); copy(text, id); }}
      className="p-1 rounded-md text-gray-500 hover:text-gray-300 hover:bg-white/10 transition-all shrink-0"
    >
      {isCopied ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
    </button>
  );
}

function truncate(s: string, start = 6, end = 4) {
  if (!s) return "";
  if (s.length <= start + end + 3) return s;
  return `${s.slice(0, start)}…${s.slice(-end)}`;
}

function timeAgo(ts: string | number) {
  const diff = Date.now() - new Date(ts).getTime();
  if (diff < 5000) return "just now";
  if (diff < 60000) return `${Math.floor(diff / 1000)}s ago`;
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  return new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function StatChip({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string; color: string }) {
  return (
    <div className={`flex items-center gap-2 px-3 py-2 rounded-xl border shrink-0 ${color}`}>
      <span className="opacity-70">{icon}</span>
      <div>
        <p className="text-[10px] text-gray-500 uppercase tracking-wider leading-none mb-0.5">{label}</p>
        <p className="text-sm font-bold leading-none">{value}</p>
      </div>
    </div>
  );
}

export default function ExplorerPage() {
  const [network, setNetwork] = useState<Network>("evm");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchTrigger, setSearchTrigger] = useState("");
  const [activeTab, setActiveTab] = useState<"blocks" | "transactions">("blocks");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [newIds, setNewIds] = useState<Set<string>>(new Set());
  const [lastRefresh, setLastRefresh] = useState(Date.now());
  const prevBlockIds = useRef<Set<string>>(new Set());
  const prevTxIds = useRef<Set<string>>(new Set());
  const { copied, copy } = useCopy();

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

  useEffect(() => {
    if (!blocks) return;
    const incoming = new Set<string>();
    blocks.forEach(b => {
      const id = String(b.blockNumber);
      if (!prevBlockIds.current.has(id) && prevBlockIds.current.size > 0) incoming.add(id);
    });
    if (incoming.size > 0) {
      setNewIds(prev => new Set([...prev, ...incoming]));
      setLastRefresh(Date.now());
      setTimeout(() => setNewIds(prev => { const n = new Set(prev); incoming.forEach(id => n.delete(id)); return n; }), 3000);
    }
    prevBlockIds.current = new Set(blocks.map(b => String(b.blockNumber)));
  }, [blocks]);

  useEffect(() => {
    if (!txs) return;
    const incoming = new Set<string>();
    txs.forEach(tx => {
      if (!prevTxIds.current.has(tx.txHash) && prevTxIds.current.size > 0) incoming.add(tx.txHash);
    });
    if (incoming.size > 0) {
      setNewIds(prev => new Set([...prev, ...incoming]));
      setLastRefresh(Date.now());
      setTimeout(() => setNewIds(prev => { const n = new Set(prev); incoming.forEach(id => n.delete(id)); return n; }), 3000);
    }
    prevTxIds.current = new Set(txs.map(tx => tx.txHash));
  }, [txs]);

  const tps = blocks && blocks.length >= 2
    ? (blocks.slice(0, 5).reduce((sum, b) => sum + b.txCount, 0) / 5).toFixed(1)
    : "—";

  const latestBlock = blocks?.[0]?.blockNumber?.toLocaleString() ?? "—";
  const avgBlockTime = blocks && blocks.length >= 2
    ? ((new Date(blocks[0].timestamp).getTime() - new Date(blocks[blocks.length - 1].timestamp).getTime()) / (blocks.length - 1) / 1000).toFixed(1) + "s"
    : "—";

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) setSearchTrigger(searchQuery.trim());
  };

  const clearSearch = () => { setSearchTrigger(""); setSearchQuery(""); };
  const toggleExpand = (id: string) => setExpandedId(prev => prev === id ? null : id);

  return (
    <Layout>
      <div className="px-4 pt-5 pb-8 max-w-2xl mx-auto">

        <div className="mb-5">
          <div className="flex items-center justify-between mb-1">
            <h1 className="text-2xl font-bold">Explorer</h1>
            <div className="flex items-center gap-1.5 text-xs text-green-400 bg-green-400/10 border border-green-400/20 rounded-full px-2.5 py-1">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
              Live
            </div>
          </div>
          <p className="text-gray-500 text-sm">Real-time Telos network activity</p>
        </div>

        <div className="flex gap-2.5 overflow-x-auto pb-2 mb-5 scrollbar-hide -mx-4 px-4">
          <StatChip icon={<Layers className="w-3.5 h-3.5" />} label="Latest Block" value={latestBlock} color="bg-cyan-500/5 border-cyan-500/20 text-cyan-300" />
          <StatChip icon={<Activity className="w-3.5 h-3.5" />} label="Avg TPS" value={tps} color="bg-purple-500/5 border-purple-500/20 text-purple-300" />
          <StatChip icon={<Clock className="w-3.5 h-3.5" />} label="Block Time" value={avgBlockTime} color="bg-amber-500/5 border-amber-500/20 text-amber-300" />
          <StatChip icon={<RefreshCw className="w-3.5 h-3.5" />} label="Updated" value={timeAgo(lastRefresh)} color="bg-white/3 border-white/10 text-gray-300" />
        </div>

        <form onSubmit={handleSearch} className="flex gap-2 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500 w-4 h-4" />
            <input
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Block, tx hash, or address…"
              className="w-full bg-[#1a1a1a] border border-white/10 rounded-xl pl-10 pr-4 py-3 text-sm text-white outline-none focus:border-cyan-500/50 transition-colors placeholder-gray-600"
            />
            {searchQuery && (
              <button type="button" onClick={clearSearch} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300">
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          <button type="submit" className="px-4 py-3 bg-cyan-500 text-white rounded-xl text-sm font-semibold hover:bg-cyan-400 transition-colors shrink-0">
            Search
          </button>
        </form>

        {searchTrigger && (
          <div className="mb-4 bg-[#1a1a1a] border border-white/10 rounded-2xl overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
              <span className="text-sm font-semibold text-white">Results for "{searchTrigger}"</span>
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
          <div className="flex bg-[#1a1a1a] border border-white/10 rounded-xl p-0.5 flex-1">
            <button
              onClick={() => setNetwork("evm")}
              className={`flex items-center justify-center gap-1.5 flex-1 py-2 rounded-lg text-xs font-semibold transition-all ${
                network === "evm" ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30" : "text-gray-500 hover:text-gray-300"
              }`}
            >
              <Globe className="w-3.5 h-3.5" /> Telos EVM
            </button>
            <button
              onClick={() => setNetwork("zero")}
              className={`flex items-center justify-center gap-1.5 flex-1 py-2 rounded-lg text-xs font-semibold transition-all ${
                network === "zero" ? "bg-purple-500/20 text-purple-300 border border-purple-500/30" : "text-gray-500 hover:text-gray-300"
              }`}
            >
              <Zap className="w-3.5 h-3.5" /> Telos Zero
            </button>
          </div>

          <div className="flex bg-[#1a1a1a] border border-white/10 rounded-xl p-0.5">
            <button
              onClick={() => setActiveTab("blocks")}
              className={`flex items-center gap-1 px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
                activeTab === "blocks" ? "bg-white/10 text-white" : "text-gray-500"
              }`}
            >
              <Box className="w-3 h-3" /> Blocks
            </button>
            <button
              onClick={() => setActiveTab("transactions")}
              className={`flex items-center gap-1 px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
                activeTab === "transactions" ? "bg-white/10 text-white" : "text-gray-500"
              }`}
            >
              <ArrowRightLeft className="w-3 h-3" /> Txns
            </button>
          </div>
        </div>

        <div className="rounded-2xl overflow-hidden border border-white/5 bg-[#0e0e0e]">
          <div className="px-4 py-3 border-b border-white/5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              {activeTab === "blocks"
                ? <><Box className="w-4 h-4 text-cyan-400" /><span className="text-sm font-bold">Latest Blocks</span></>
                : <><ArrowRightLeft className="w-4 h-4 text-purple-400" /><span className="text-sm font-bold">Recent Transactions</span></>
              }
              {(blocks || txs) && (
                <span className="text-[10px] text-gray-500 bg-white/5 rounded-full px-2 py-0.5">
                  {activeTab === "blocks" ? blocks?.length ?? 0 : txs?.length ?? 0} entries
                </span>
              )}
            </div>
            <div className="flex items-center gap-1.5 text-xs text-green-400">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
            </div>
          </div>

          {activeTab === "blocks" ? (
            blocksLoading ? (
              <div className="p-4 space-y-3">
                {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-16 w-full bg-white/5 rounded-xl" />)}
              </div>
            ) : blocks && blocks.length > 0 ? (
              <div className="divide-y divide-white/5">
                {blocks.map(block => {
                  const id = String(block.blockNumber);
                  const isNew = newIds.has(id);
                  const isExpanded = expandedId === id;
                  return (
                    <div
                      key={id}
                      className={`transition-all duration-500 ${isNew ? "bg-cyan-500/8" : ""}`}
                    >
                      <button
                        onClick={() => toggleExpand(id)}
                        className="w-full px-4 py-3.5 flex items-center gap-3 hover:bg-white/3 transition-colors text-left"
                      >
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-colors ${isNew ? "bg-cyan-500/20" : "bg-cyan-500/10"}`}>
                          <Box className={`w-4 h-4 ${isNew ? "text-cyan-300" : "text-cyan-400"}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-bold text-sm text-cyan-400">#{block.blockNumber.toLocaleString()}</p>
                            {isNew && (
                              <span className="text-[9px] font-bold uppercase tracking-wider text-cyan-300 bg-cyan-500/20 border border-cyan-500/30 rounded-full px-1.5 py-0.5 animate-pulse">
                                New
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-gray-500 font-mono truncate">{block.producer}</p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-sm font-semibold text-white">{block.txCount} <span className="text-gray-500 font-normal text-xs">txns</span></p>
                          <p className="text-xs text-gray-500">{timeAgo(block.timestamp)}</p>
                        </div>
                        <div className="ml-1 text-gray-600">
                          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </div>
                      </button>

                      {isExpanded && (
                        <div className="px-4 pb-4 pt-1 bg-black/30 space-y-2.5">
                          <DetailRow label="Block Number" value={String(block.blockNumber)} copyId={`bn-${id}`} copied={copied} copy={copy} />
                          <DetailRow label="Producer" value={block.producer} copyId={`bp-${id}`} copied={copied} copy={copy} mono />
                          <DetailRow label="Transactions" value={String(block.txCount)} />
                          <DetailRow label="Timestamp" value={new Date(block.timestamp).toLocaleString()} />
                          <a
                            href={`https://${network === "evm" ? "teloscan.io" : "explorer.telos.net"}/block/${block.blockNumber}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={e => e.stopPropagation()}
                            className="inline-flex items-center gap-1.5 text-xs text-cyan-400 hover:text-cyan-300 transition-colors mt-1"
                          >
                            View on {network === "evm" ? "Teloscan" : "Telos Explorer"} →
                          </a>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="py-16 text-center text-gray-600 text-sm">No block data available</div>
            )
          ) : (
            txsLoading ? (
              <div className="p-4 space-y-3">
                {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-16 w-full bg-white/5 rounded-xl" />)}
              </div>
            ) : txs && txs.length > 0 ? (
              <div className="divide-y divide-white/5">
                {txs.map(tx => {
                  const isNew = newIds.has(tx.txHash);
                  const isExpanded = expandedId === tx.txHash;
                  return (
                    <div
                      key={tx.txHash}
                      className={`transition-all duration-500 ${isNew ? "bg-purple-500/8" : ""}`}
                    >
                      <button
                        onClick={() => toggleExpand(tx.txHash)}
                        className="w-full px-4 py-3.5 flex items-center gap-3 hover:bg-white/3 transition-colors text-left"
                      >
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${isNew ? "bg-purple-500/20" : "bg-purple-500/10"}`}>
                          <ArrowRightLeft className={`w-4 h-4 ${isNew ? "text-purple-300" : "text-purple-400"}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-mono text-xs text-purple-400 truncate">{truncate(tx.txHash, 8, 6)}</p>
                            {isNew && (
                              <span className="text-[9px] font-bold uppercase tracking-wider text-purple-300 bg-purple-500/20 border border-purple-500/30 rounded-full px-1.5 py-0.5 animate-pulse shrink-0">
                                New
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-gray-500 font-mono truncate">From: {truncate(tx.fromAddress)}</p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-sm font-bold text-white">{Number(tx.amount).toLocaleString(undefined, { maximumFractionDigits: 2 })} <span className="text-gray-400 font-normal text-xs">{tx.currency}</span></p>
                          <p className="text-xs text-gray-500">{timeAgo(tx.timestamp)}</p>
                        </div>
                        <div className="ml-1 text-gray-600">
                          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </div>
                      </button>

                      {isExpanded && (
                        <div className="px-4 pb-4 pt-1 bg-black/30 space-y-2.5">
                          <DetailRow label="Tx Hash" value={tx.txHash} copyId={`txh-${tx.txHash}`} copied={copied} copy={copy} mono />
                          <DetailRow label="From" value={tx.fromAddress} copyId={`txf-${tx.txHash}`} copied={copied} copy={copy} mono />
                          <DetailRow label="Amount" value={`${tx.amount} ${tx.currency}`} />
                          <DetailRow label="Timestamp" value={new Date(tx.timestamp).toLocaleString()} />
                          <a
                            href={`https://${network === "evm" ? "teloscan.io" : "explorer.telos.net"}/tx/${tx.txHash}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={e => e.stopPropagation()}
                            className="inline-flex items-center gap-1.5 text-xs text-purple-400 hover:text-purple-300 transition-colors mt-1"
                          >
                            View on {network === "evm" ? "Teloscan" : "Telos Explorer"} →
                          </a>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="py-16 text-center text-gray-600 text-sm">No transaction data available</div>
            )
          )}
        </div>
      </div>
    </Layout>
  );
}

function DetailRow({ label, value, copyId, copied, copy, mono }: {
  label: string;
  value: string;
  copyId?: string;
  copied?: string | null;
  copy?: (t: string, i: string) => void;
  mono?: boolean;
}) {
  return (
    <div className="flex items-start gap-2">
      <span className="text-xs text-gray-500 w-24 shrink-0 pt-0.5">{label}</span>
      <span className={`text-xs text-gray-200 flex-1 min-w-0 break-all ${mono ? "font-mono" : ""}`}>{value}</span>
      {copyId && copy && (
        <CopyBtn text={value} id={copyId} copied={copied ?? null} copy={copy} />
      )}
    </div>
  );
}
