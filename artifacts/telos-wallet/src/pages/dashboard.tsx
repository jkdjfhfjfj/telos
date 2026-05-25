import { useGetMe, useListWallets, useGetWalletBalance } from "@workspace/api-client-react";
import { Link, useLocation } from "wouter";
import { Layout } from "@/components/layout";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowUpRight, ArrowDownLeft, ScanLine, ChevronRight, Info } from "lucide-react";
import { useState } from "react";

const TLOS_USD_PRICE = 0.18;

function TelosIcon({ size = 36 }: { size?: number }) {
  return (
    <div style={{ width: size, height: size }} className="rounded-full bg-gradient-to-br from-cyan-400 to-purple-600 flex items-center justify-center text-white font-bold text-xs shrink-0">T</div>
  );
}

function EvmBadge({ rightArrow }: { rightArrow?: boolean }) {
  return (
    <span className={`inline-flex items-center gap-0.5 bg-[#222] border border-white/10 rounded-full px-2 py-0.5 text-[10px] font-semibold text-gray-300 ${rightArrow ? "flex-row-reverse" : ""}`}>
      {rightArrow ? ">>> EVM" : "EVM >>>"}
    </span>
  );
}

export default function DashboardPage() {
  const [, setLocation] = useLocation();
  const { data: user } = useGetMe();
  const { data: wallets, isLoading: walletsLoading } = useListWallets();
  const [activeTab, setActiveTab] = useState<"coins" | "collectables">("coins");
  const [selectedWalletIdx, setSelectedWalletIdx] = useState(0);

  const selectedWallet = wallets?.[selectedWalletIdx];

  const { data: balance, isLoading: balanceLoading } = useGetWalletBalance(
    selectedWallet?.id ?? 0,
    { query: { enabled: !!selectedWallet?.id } as any }
  );

  const tlosBalance = parseFloat((balance as any)?.balanceTlos ?? (selectedWallet as any)?.balanceTlos ?? "0");
  const usdBalance = parseFloat((balance as any)?.balanceUsd ?? (selectedWallet as any)?.balanceUsd ?? "0") || tlosBalance * TLOS_USD_PRICE;

  if (walletsLoading) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center min-h-[80dvh] gap-4">
          <Skeleton className="h-8 w-40 bg-white/10" />
          <Skeleton className="h-16 w-48 bg-white/10" />
          <Skeleton className="h-12 w-full bg-white/10" />
        </div>
      </Layout>
    );
  }

  if (!wallets || wallets.length === 0) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center min-h-[80dvh] px-6 text-center">
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-cyan-400/20 to-purple-600/20 flex items-center justify-center mb-6">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-cyan-400 to-purple-600 flex items-center justify-center text-white font-bold text-xl">T</div>
          </div>
          <h2 className="text-2xl font-bold mb-2">Welcome to TelosWallet</h2>
          <p className="text-gray-400 mb-8 text-sm">Create your first wallet to get started with Telos Zero and EVM.</p>
          <Link href="/wallets/create">
            <button className="w-full py-4 rounded-2xl bg-gradient-to-r from-cyan-500 to-purple-600 text-white font-bold text-lg">
              Create Account
            </button>
          </Link>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      {/* Header */}
      <div className="px-4 pt-6 pb-2">
        {wallets.length > 1 ? (
          <div className="flex items-center justify-center gap-1 mb-1">
            <select
              className="bg-transparent text-white text-center font-semibold text-sm outline-none cursor-pointer"
              value={selectedWalletIdx}
              onChange={e => setSelectedWalletIdx(parseInt(e.target.value))}
            >
              {wallets.map((w, i) => (
                <option key={w.id} value={i} className="bg-[#111]">{w.zeroAddress}</option>
              ))}
            </select>
            <ChevronRight className="w-4 h-4 text-gray-500 rotate-90" />
          </div>
        ) : (
          <p className="text-center text-sm font-semibold text-white/80 mb-1 tracking-wide">{selectedWallet?.zeroAddress}</p>
        )}
      </div>

      {/* Balance */}
      <div className="flex flex-col items-center py-4 px-6">
        <div className="flex items-center gap-2">
          {balanceLoading ? (
            <Skeleton className="h-14 w-40 bg-white/10" />
          ) : (
            <span className="text-5xl font-light tracking-tight">${usdBalance.toFixed(2)}</span>
          )}
          <button className="text-gray-500"><Info className="w-4 h-4" /></button>
        </div>
        <p className="text-gray-400 text-sm mt-1">{balanceLoading ? "..." : `${tlosBalance.toFixed(4)} TLOS`}</p>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center justify-center gap-3 px-6 mb-6">
        <Link href={`/wallets/${selectedWallet?.id}/send`} className="flex-1">
          <button className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-cyan-500/80 to-cyan-600/80 text-white font-bold text-base active:scale-95 transition-transform">
            Send
          </button>
        </Link>
        <Link href={`/wallets/${selectedWallet?.id}/receive`}>
          <button className="w-12 h-12 rounded-full bg-[#222] border border-white/10 flex items-center justify-center active:scale-95 transition-transform">
            <ScanLine className="w-5 h-5 text-gray-300" />
          </button>
        </Link>
        <Link href={`/wallets/${selectedWallet?.id}/receive`} className="flex-1">
          <button className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-purple-600/80 to-cyan-500/80 text-white font-bold text-base active:scale-95 transition-transform">
            Receive
          </button>
        </Link>
      </div>

      {/* Purchase */}
      <div className="px-4 mb-4">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-300">Purchase</span>
          <Link href="/wallets/create">
            <button className="w-7 h-7 rounded-full bg-purple-600 flex items-center justify-center text-white font-bold text-lg leading-none">+</button>
          </Link>
        </div>
      </div>

      {/* Tabs */}
      <div className="px-4 mb-2">
        <div className="flex border-b border-white/10">
          {(["coins", "collectables"] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-3 text-sm font-semibold capitalize transition-colors ${
                activeTab === tab
                  ? "text-white border-b-2 border-cyan-400 -mb-px"
                  : "text-gray-500"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Coin List */}
      {activeTab === "coins" ? (
        <div className="px-4 space-y-1">
          {/* Telos Zero row */}
          <div className="flex items-center gap-3 py-3 active:bg-white/5 rounded-xl px-2 transition-colors cursor-pointer" onClick={() => setLocation(`/wallets/${selectedWallet?.id}`)}>
            <TelosIcon size={40} />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-sm">Telos</span>
                <EvmBadge rightArrow />
              </div>
              <p className="text-xs text-gray-500">TLOS</p>
            </div>
            <div className="text-right">
              <p className="text-sm font-semibold">{tlosBalance.toFixed(4)} TLOS</p>
              <p className="text-xs text-gray-500">${usdBalance.toFixed(2)}</p>
            </div>
          </div>

          {/* Telos EVM row */}
          <div className="flex items-center gap-3 py-3 active:bg-white/5 rounded-xl px-2 transition-colors cursor-pointer" onClick={() => setLocation(`/wallets/${selectedWallet?.id}`)}>
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-cyan-400 flex items-center justify-center text-white font-bold text-xs shrink-0">E</div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-sm">Telos...</span>
                <EvmBadge />
              </div>
              <p className="text-xs text-gray-500">TLOS</p>
            </div>
            <div className="text-right">
              <p className="text-sm font-semibold">{tlosBalance.toFixed(4)} TLOS</p>
              <p className="text-xs text-gray-500">${usdBalance.toFixed(2)}</p>
            </div>
          </div>
        </div>
      ) : (
        <div className="px-4 py-8 text-center">
          <p className="text-gray-500 text-sm">No collectables yet</p>
        </div>
      )}
    </Layout>
  );
}
