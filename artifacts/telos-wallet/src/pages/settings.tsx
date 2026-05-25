import { useState } from "react";
import { Layout } from "@/components/layout";
import { useGetMe, useSetup2fa, useEnable2fa, useDisable2fa, getGetMeQueryKey } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";

export default function SettingsPage() {
  const { data: user } = useGetMe();
  const [isSettingUp, setIsSettingUp] = useState(false);
  const [code, setCode] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: setupData, refetch: setup2fa } = useSetup2fa({ query: { enabled: false } });
  
  const enableMutation = useEnable2fa({
    mutation: {
      onSuccess: () => {
        toast({ title: "2FA Enabled successfully" });
        setIsSettingUp(false);
        setCode("");
        queryClient.invalidateQueries({ queryKey: getGetMeQueryKey() });
      },
      onError: (err: any) => {
        toast({ title: "Failed to enable 2FA", description: err.message, variant: "destructive" });
      }
    }
  });

  const disableMutation = useDisable2fa({
    mutation: {
      onSuccess: () => {
        toast({ title: "2FA Disabled successfully" });
        setCode("");
        queryClient.invalidateQueries({ queryKey: getGetMeQueryKey() });
      },
      onError: (err: any) => {
        toast({ title: "Failed to disable 2FA", description: err.message, variant: "destructive" });
      }
    }
  });

  const handleStartSetup = () => {
    setIsSettingUp(true);
    setup2fa();
  };

  const handleEnable = () => {
    if (code.length === 6) {
      enableMutation.mutate({ data: { code } });
    }
  };

  const handleDisable = () => {
    if (code.length === 6) {
      disableMutation.mutate({ data: { code } });
    }
  };

  return (
    <Layout>
      <div className="max-w-2xl mx-auto space-y-8">
        <div>
          <h1 className="text-3xl font-bold">Account Settings</h1>
          <p className="text-muted-foreground">Manage your profile and security settings.</p>
        </div>

        <div className="bg-card border border-border rounded-xl p-6">
          <h2 className="text-xl font-bold mb-4">Profile</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground">Email</label>
              <p className="font-medium text-lg mt-1">{user?.email}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Role</label>
              <p className="font-medium text-lg mt-1 capitalize">{user?.role}</p>
            </div>
            <div className="col-span-2">
              <label className="text-sm font-medium text-muted-foreground">Display Name</label>
              <p className="font-medium text-lg mt-1">{user?.displayName || "Not set"}</p>
            </div>
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl p-6">
          <h2 className="text-xl font-bold mb-4">Security</h2>
          <div className="flex items-center justify-between mb-6">
            <div>
              <p className="font-medium text-lg">Two-Factor Authentication (2FA)</p>
              <p className="text-sm text-muted-foreground mt-1">Secure your account with a TOTP authenticator app.</p>
            </div>
            <div className="px-3 py-1 rounded bg-muted font-bold tracking-wide">
              {user?.twoFactorEnabled ? <span className="text-primary">ENABLED</span> : <span className="text-destructive">DISABLED</span>}
            </div>
          </div>

          {!user?.twoFactorEnabled && !isSettingUp && (
            <Button onClick={handleStartSetup} size="lg">Enable 2FA Protection</Button>
          )}

          {!user?.twoFactorEnabled && isSettingUp && setupData && (
            <div className="space-y-6 border border-border p-6 rounded-lg bg-muted/20">
              <div>
                <p className="font-bold mb-3">1. Scan this QR code with your authenticator app</p>
                <div className="bg-white p-4 w-fit rounded-lg shadow-sm mb-3">
                  <img src={setupData.qrCodeDataUrl} alt="2FA QR Code" className="w-48 h-48" />
                </div>
                <p className="text-sm text-muted-foreground">Or enter secret manually:</p>
                <p className="font-mono bg-background p-2 rounded border border-border text-sm w-fit mt-1 select-all">{setupData.secret}</p>
              </div>
              
              <div className="space-y-3 pt-4 border-t border-border">
                <p className="font-bold">2. Enter the 6-digit code</p>
                <div className="flex gap-3">
                  <Input 
                    value={code} 
                    onChange={e => setCode(e.target.value.replace(/[^0-9]/g, ''))} 
                    placeholder="000000" 
                    maxLength={6} 
                    className="w-32 font-mono text-center text-lg tracking-widest h-12" 
                  />
                  <Button onClick={handleEnable} disabled={code.length !== 6 || enableMutation.isPending} className="h-12 px-6">
                    Verify & Enable
                  </Button>
                  <Button variant="ghost" onClick={() => setIsSettingUp(false)} className="h-12">Cancel</Button>
                </div>
              </div>
            </div>
          )}

          {user?.twoFactorEnabled && (
            <div className="space-y-4 border border-destructive/20 p-6 rounded-lg bg-destructive/5">
              <div>
                <p className="font-bold text-destructive">Disable 2FA</p>
                <p className="text-sm text-muted-foreground mt-1">This will reduce the security of your account. Enter a code from your authenticator app to disable.</p>
              </div>
              <div className="flex gap-3">
                <Input 
                  value={code} 
                  onChange={e => setCode(e.target.value.replace(/[^0-9]/g, ''))} 
                  placeholder="000000" 
                  maxLength={6} 
                  className="w-32 font-mono text-center text-lg tracking-widest h-12" 
                />
                <Button variant="destructive" onClick={handleDisable} disabled={code.length !== 6 || disableMutation.isPending} className="h-12 px-6">
                  Disable 2FA
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
