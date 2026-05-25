import { useState } from "react";
import { Layout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useSendTransaction, useGetWallet } from "@workspace/api-client-react";
import { useRoute, useLocation } from "wouter";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SendInputNetwork } from "@workspace/api-client-react/src/generated/api.schemas";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft } from "lucide-react";

export default function WalletSendPage() {
  const [, params] = useRoute("/wallets/:id/send");
  const walletId = params?.id ? parseInt(params.id) : 0;
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const { data: wallet, isLoading: isWalletLoading } = useGetWallet(walletId, { query: { enabled: !!walletId } });

  const [toAddress, setToAddress] = useState("");
  const [amount, setAmount] = useState("");
  const [memo, setMemo] = useState("");
  const [network, setNetwork] = useState<SendInputNetwork>("evm");
  const [totpCode, setTotpCode] = useState("");

  const sendTx = useSendTransaction({
    mutation: {
      onSuccess: (data) => {
        toast({
          title: "Transaction Sent",
          description: `Successfully sent ${data.amount} ${data.currency}`,
        });
        setLocation(`/wallets/${walletId}`);
      },
      onError: (err: any) => {
        toast({
          title: "Transaction Failed",
          description: err.message || "An error occurred",
          variant: "destructive"
        });
      }
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!toAddress || !amount || !totpCode || totpCode.length !== 6) return;

    sendTx.mutate({
      data: {
        fromWalletId: walletId,
        toAddress,
        amount,
        memo: memo || undefined,
        network,
        totpCode
      }
    });
  };

  return (
    <Layout>
      <div className="max-w-xl mx-auto">
        <Button variant="ghost" onClick={() => setLocation(`/wallets/${walletId}`)} className="mb-6 gap-2 -ml-4">
          <ArrowLeft className="w-4 h-4" /> Back to Wallet
        </Button>
        
        <header className="mb-8">
          <h1 className="text-3xl font-bold">Send TLOS</h1>
          {isWalletLoading ? (
            <Skeleton className="h-6 w-32 mt-2" />
          ) : (
            <p className="text-muted-foreground mt-2">From: {wallet?.label}</p>
          )}
        </header>
        
        <div className="bg-card border border-border rounded-xl p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="network">Network</Label>
              <Select value={network} onValueChange={(v) => setNetwork(v as SendInputNetwork)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select network" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="evm">Telos EVM</SelectItem>
                  <SelectItem value="zero">Telos Zero (Native)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="toAddress">Recipient Address</Label>
              <Input 
                id="toAddress" 
                value={toAddress} 
                onChange={(e) => setToAddress(e.target.value)} 
                placeholder={network === 'evm' ? "0x..." : "12 char account"} 
                className="font-mono text-sm"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="amount">Amount (TLOS)</Label>
              <div className="relative">
                <Input 
                  id="amount" 
                  type="number"
                  step="any"
                  min="0.0001"
                  value={amount} 
                  onChange={(e) => setAmount(e.target.value)} 
                  placeholder="0.00" 
                  className="pr-16 text-lg font-mono"
                  required
                />
                <div className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground font-bold">
                  TLOS
                </div>
              </div>
            </div>

            {network === 'zero' && (
              <div className="space-y-2">
                <Label htmlFor="memo">Memo (Optional)</Label>
                <Input 
                  id="memo" 
                  value={memo} 
                  onChange={(e) => setMemo(e.target.value)} 
                  placeholder="Required by some exchanges" 
                />
              </div>
            )}

            <div className="space-y-2 pt-4 border-t border-border">
              <Label htmlFor="totpCode" className="flex justify-between">
                <span>2FA Code</span>
                <span className="text-muted-foreground font-normal text-xs">Required for all transfers</span>
              </Label>
              <Input 
                id="totpCode" 
                value={totpCode} 
                onChange={(e) => setTotpCode(e.target.value.replace(/[^0-9]/g, ''))} 
                placeholder="000000" 
                maxLength={6}
                className="font-mono text-center tracking-widest text-lg"
                required
              />
            </div>

            <div className="pt-4">
              <Button 
                type="submit" 
                size="lg" 
                className="w-full text-lg h-14" 
                disabled={!toAddress || !amount || totpCode.length !== 6 || sendTx.isPending}
              >
                {sendTx.isPending ? "Sending..." : "Confirm & Send"}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </Layout>
  );
}
