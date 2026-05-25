import { useRoute, useLocation } from "wouter";
import { useGetReceiveInfo } from "@workspace/api-client-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Copy, ChevronLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { Layout } from "@/components/layout";
import QRCode from "qrcode";
import { useEffect } from "react";

function QRDisplay({ data, size = 200 }: { data: string; size?: number }) {
  const [qrUrl, setQrUrl] = useState("");
  useEffect(() => {
    if (!data) return;
    QRCode.toDataURL(data, { width: size, margin: 1, color: { dark: "#000000", light: "#ffffff" } })
      .then(setQrUrl)
      .catch(() => setQrUrl(""));
  }, [data, size]);
  if (!qrUrl) return <div style={{ width: size, height: size }} className="bg-gray-200 rounded-xl animate-pulse" />;
  return <img src={qrUrl} alt="QR Code" style={{ width: size, height: size }} className="rounded-xl" />;
}

export default function WalletReceivePage() {
  const [, params] = useRoute("/wallets/:id/receive");
  const walletId = params?.id ? parseInt(params.id) : 0;
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<"evm" | "zero">("evm");

  const { data: receiveInfo, isLoading } = useGetReceiveInfo(walletId, { query: { enabled: !!walletId } as any });

  const copy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: `${label} copied!` });
  };

  const activeAddress = activeTab === "evm" ? receiveInfo?.evmAddress : receiveInfo?.zeroAddress;
  const qrData = activeTab === "evm"
    ? `ethereum:${receiveInfo?.evmAddress}@40`
    : `telos:${receiveInfo?.zeroAddress}`;

  return (
    <Layout>
      {/* Header */}
      <div className="flex items-center gap-3 px-4 pt-6 pb-4">
        <button onClick={() => setLocation(`/wallets/${walletId}`)} className="text-gray-400">
          <ChevronLeft className="w-6 h-6" />
        </button>
        <h1 className="text-lg font-bold">Receive Assets</h1>
      </div>

      {/* Tab selector */}
      <div className="mx-4 mb-6">
        <div className="flex bg-[#1a1a1a] rounded-2xl p-1">
          {(["evm", "zero"] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                activeTab === tab ? "bg-gradient-to-r from-cyan-500 to-purple-600 text-white" : "text-gray-500"
              }`}
            >
              {tab === "evm" ? "Telos EVM" : "Telos Zero"}
            </button>
          ))}
        </div>
      </div>

      {/* QR Code */}
      <div className="flex flex-col items-center px-4 mb-6">
        {isLoading ? (
          <Skeleton className="w-52 h-52 rounded-2xl bg-white/10" />
        ) : (
          <div className="bg-white p-4 rounded-2xl shadow-lg">
            <QRDisplay data={qrData} size={192} />
          </div>
        )}
        <p className="text-xs text-gray-500 mt-4">
          {activeTab === "evm" ? "Only send Telos EVM assets to this address" : "Only send Telos Zero (Native) assets"}
        </p>
      </div>

      {/* Address display */}
      <div className="mx-4">
        <div className="bg-[#1a1a1a] rounded-2xl p-4">
          <p className="text-xs text-gray-500 mb-3">{activeTab === "evm" ? "EVM Address (0x...)" : "Native Account Name"}</p>
          {isLoading ? (
            <Skeleton className="h-6 w-full bg-white/10" />
          ) : (
            <div className="flex items-center gap-3">
              <p className={`flex-1 font-mono break-all leading-relaxed ${activeTab === "zero" ? "text-xl font-bold tracking-widest" : "text-sm"}`}>
                {activeAddress}
              </p>
              <button
                onClick={() => copy(activeAddress ?? "", activeTab === "evm" ? "EVM address" : "Zero address")}
                className="shrink-0 w-10 h-10 bg-gradient-to-br from-cyan-500 to-purple-600 rounded-full flex items-center justify-center"
              >
                <Copy className="w-4 h-4 text-white" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Warning */}
      <div className="mx-4 mt-4 bg-cyan-500/10 border border-cyan-500/20 rounded-2xl p-4">
        <p className="text-xs text-cyan-400 text-center">
          {activeTab === "evm"
            ? "Send only TLOS and EVM-compatible tokens on the Telos EVM network"
            : "Send only native TLOS on the Telos Zero network to this account"}
        </p>
      </div>
    </Layout>
  );
}
