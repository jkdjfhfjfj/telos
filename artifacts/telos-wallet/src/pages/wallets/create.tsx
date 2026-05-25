import { useState } from "react";
import { useLocation } from "wouter";
import { Layout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useCreateWallet, getListWalletsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { WalletInputNetwork } from "@workspace/api-client-react/src/generated/api.schemas";

export default function CreateWalletPage() {
  const [label, setLabel] = useState("");
  const [network, setNetwork] = useState<WalletInputNetwork>("mainnet");
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const createWallet = useCreateWallet({
    mutation: {
      onSuccess: (data) => {
        queryClient.invalidateQueries({ queryKey: getListWalletsQueryKey() });
        toast({
          title: "Wallet Created",
          description: `Wallet "${data.label}" has been created successfully.`,
        });
        setLocation(`/wallets/${data.id}`);
      },
      onError: (err: any) => {
        toast({
          title: "Failed to create wallet",
          description: err.message || "An unexpected error occurred",
          variant: "destructive"
        });
      }
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!label.trim()) return;
    createWallet.mutate({ data: { label, network } });
  };

  return (
    <Layout>
      <div className="max-w-xl mx-auto">
        <header className="mb-8">
          <h1 className="text-3xl font-bold">Create New Wallet</h1>
          <p className="text-muted-foreground">Provision a new Telos Zero and EVM address pair.</p>
        </header>
        
        <div className="bg-card border border-border rounded-xl p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="label">Wallet Label</Label>
              <Input 
                id="label" 
                value={label} 
                onChange={(e) => setLabel(e.target.value)} 
                placeholder="e.g. Savings, Trading, Main" 
                autoFocus
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="network">Network</Label>
              <Select value={network} onValueChange={(v) => setNetwork(v as WalletInputNetwork)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select network" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="mainnet">Telos Mainnet</SelectItem>
                  <SelectItem value="testnet">Telos Testnet</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="pt-4 flex justify-end gap-3">
              <Button type="button" variant="outline" onClick={() => setLocation("/dashboard")}>Cancel</Button>
              <Button type="submit" disabled={!label.trim() || createWallet.isPending}>
                {createWallet.isPending ? "Creating..." : "Create Wallet"}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </Layout>
  );
}
