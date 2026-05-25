import { Layout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { useRoute, useLocation } from "wouter";
import { useGetReceiveInfo } from "@workspace/api-client-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Copy, ArrowLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function WalletReceivePage() {
  const [, params] = useRoute("/wallets/:id/receive");
  const walletId = params?.id ? parseInt(params.id) : 0;
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const { data: receiveInfo, isLoading } = useGetReceiveInfo(walletId, { query: { enabled: !!walletId } });

  const copyToClipboard = (text: string, type: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied!",
      description: `${type} address copied to clipboard.`,
    });
  };

  return (
    <Layout>
      <div className="max-w-xl mx-auto">
        <Button variant="ghost" onClick={() => setLocation(`/wallets/${walletId}`)} className="mb-6 gap-2 -ml-4">
          <ArrowLeft className="w-4 h-4" /> Back to Wallet
        </Button>
        
        <header className="mb-8">
          <h1 className="text-3xl font-bold">Receive Assets</h1>
          <p className="text-muted-foreground mt-2">Send TLOS or supported tokens to these addresses.</p>
        </header>
        
        <div className="bg-card border border-border rounded-xl p-6">
          {isLoading ? (
            <div className="space-y-6">
              <Skeleton className="h-10 w-full" />
              <div className="flex justify-center p-8"><Skeleton className="h-48 w-48 rounded-xl" /></div>
              <Skeleton className="h-16 w-full" />
            </div>
          ) : (
            <Tabs defaultValue="evm" className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-8 h-12">
                <TabsTrigger value="evm" className="text-base">Telos EVM</TabsTrigger>
                <TabsTrigger value="zero" className="text-base">Telos Zero</TabsTrigger>
              </TabsList>
              
              <TabsContent value="evm" className="space-y-8 animate-in fade-in zoom-in-95 duration-200">
                <div className="flex flex-col items-center justify-center p-6 bg-white rounded-2xl w-fit mx-auto border border-border/5 shadow-sm">
                  {receiveInfo?.evmQrData ? (
                    <img src={receiveInfo.evmQrData} alt="EVM QR Code" className="w-56 h-56" />
                  ) : (
                    <div className="w-56 h-56 bg-gray-100 rounded flex items-center justify-center text-gray-400">QR Unavailable</div>
                  )}
                </div>
                
                <div className="space-y-2">
                  <p className="text-sm font-medium text-center text-muted-foreground">EVM Address (0x...)</p>
                  <div className="flex items-center gap-2 bg-muted/50 p-4 rounded-xl border border-border">
                    <p className="font-mono text-sm break-all flex-1 text-center font-bold tracking-tight">
                      {receiveInfo?.evmAddress}
                    </p>
                    <Button variant="secondary" size="icon" className="shrink-0 rounded-lg" onClick={() => copyToClipboard(receiveInfo?.evmAddress || "", "EVM")}>
                      <Copy className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
                
                <div className="bg-primary/10 text-primary p-4 rounded-lg text-sm text-center">
                  Only send assets on the <strong>Telos EVM</strong> network to this address.
                </div>
              </TabsContent>
              
              <TabsContent value="zero" className="space-y-8 animate-in fade-in zoom-in-95 duration-200">
                <div className="flex flex-col items-center justify-center p-6 bg-white rounded-2xl w-fit mx-auto border border-border/5 shadow-sm">
                  {receiveInfo?.zeroQrData ? (
                    <img src={receiveInfo.zeroQrData} alt="Zero QR Code" className="w-56 h-56" />
                  ) : (
                    <div className="w-56 h-56 bg-gray-100 rounded flex items-center justify-center text-gray-400">QR Unavailable</div>
                  )}
                </div>
                
                <div className="space-y-2">
                  <p className="text-sm font-medium text-center text-muted-foreground">Native Account Name</p>
                  <div className="flex items-center gap-2 bg-muted/50 p-4 rounded-xl border border-border">
                    <p className="font-mono text-xl text-center flex-1 font-bold tracking-widest">
                      {receiveInfo?.zeroAddress}
                    </p>
                    <Button variant="secondary" size="icon" className="shrink-0 rounded-lg" onClick={() => copyToClipboard(receiveInfo?.zeroAddress || "", "Zero")}>
                      <Copy className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
                
                <div className="bg-primary/10 text-primary p-4 rounded-lg text-sm text-center">
                  Only send assets on the <strong>Telos Zero (Native)</strong> network to this account.
                </div>
              </TabsContent>
            </Tabs>
          )}
        </div>
      </div>
    </Layout>
  );
}
