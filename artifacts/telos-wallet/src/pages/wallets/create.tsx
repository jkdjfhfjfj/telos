import { useState } from "react";
import { useLocation } from "wouter";
import { Layout } from "@/components/layout";
import { useToast } from "@/hooks/use-toast";
import { useCreateWallet, getListWalletsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Copy, CheckCircle2, ArrowLeft, AlertTriangle, Eye, EyeOff, Zap, Globe } from "lucide-react";

type Step = "form" | "keys";

export default function CreateWalletPage() {
  const [step, setStep] = useState<Step>("form");
  const [accountName, setAccountName] = useState("");
  const [selectedNetwork, setSelectedNetwork] = useState<"zero" | "evm">("zero");
  const [nameError, setNameError] = useState("");
  const [hasCopied, setHasCopied] = useState(false);
  const [captchaChecked, setCaptchaChecked] = useState(false);
  const [showPrivateKey, setShowPrivateKey] = useState(false);
  const [createdWallet, setCreatedWallet] = useState<{
    id: number; label: string; zeroAddress: string; evmAddress: string;
    publicKey: string; privateKey: string; zeroPublicKey: string; zeroPrivateKey: string;
  } | null>(null);
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const createWallet = useCreateWallet({
    mutation: {
      onSuccess: (data: any) => {
        queryClient.invalidateQueries({ queryKey: getListWalletsQueryKey() });
        setCreatedWallet(data);
        setStep("keys");
      },
      onError: (err: any) => {
        toast({ title: "Failed to create wallet", description: err.message || "An error occurred", variant: "destructive" });
      }
    }
  });

  const validateName = (v: string) => {
    const clean = v.toLowerCase();
    if (!/^[a-z1-5]*$/.test(clean)) return "Only letters a–z and numbers 1–5 allowed";
    if (clean.length > 12) return "Maximum 12 characters";
    return "";
  };

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value.toLowerCase().replace(/[^a-z1-5]/g, "").slice(0, 12);
    setAccountName(v);
    setNameError(validateName(v));
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    const err = validateName(accountName);
    if (err) { setNameError(err); return; }
    if (accountName.length < 1) { setNameError("Account name is required"); return; }
    createWallet.mutate({ data: { label: accountName, network: "mainnet" } });
  };

  const copyText = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: `${label} copied!` });
    setHasCopied(true);
  };

  const handleContinue = () => {
    if (!hasCopied || !captchaChecked) {
      toast({ title: "Please confirm", description: "Copy your keys and complete the checkbox before continuing.", variant: "destructive" });
      return;
    }
    setLocation("/dashboard");
  };

  if (step === "form") {
    return (
      <Layout>
        <div className="px-5 pt-5 pb-6">
          <button onClick={() => setLocation("/dashboard")} className="flex items-center gap-1.5 text-gray-400 text-sm mb-6 hover:text-white transition-colors">
            <ArrowLeft className="w-4 h-4" /> Back
          </button>

          <h1 className="text-2xl font-bold mb-1">Create Address</h1>
          <p className="text-gray-500 text-sm mb-8">Set up a new wallet address on the Telos network</p>

          <form onSubmit={handleCreate} className="space-y-6">
            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Account Name</label>
              <input
                value={accountName}
                onChange={handleNameChange}
                placeholder="e.g. myaccount1"
                className="w-full bg-[#1a1a1a] border border-white/10 rounded-xl px-4 py-3.5 text-white text-base outline-none focus:border-cyan-500/60 transition-colors placeholder-gray-600"
              />
              <div className="flex items-center justify-between mt-2">
                <p className="text-xs text-gray-500">Alphanumeric a–z, 1–5 only</p>
                <p className={`text-xs font-mono ${accountName.length >= 12 ? "text-yellow-400" : "text-gray-500"}`}>
                  {accountName.length}/12
                </p>
              </div>
              {nameError && (
                <p className="text-xs text-red-400 mt-1 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" /> {nameError}
                </p>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Network</label>
              <div className="space-y-2.5">
                <button
                  type="button"
                  onClick={() => setSelectedNetwork("zero")}
                  className={`w-full flex items-center gap-4 p-4 rounded-xl border transition-all text-left ${
                    selectedNetwork === "zero"
                      ? "border-cyan-500/50 bg-cyan-500/8"
                      : "border-white/10 bg-[#1a1a1a] hover:border-white/20"
                  }`}
                >
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${selectedNetwork === "zero" ? "bg-cyan-500/20" : "bg-white/5"}`}>
                    <Zap className={`w-5 h-5 ${selectedNetwork === "zero" ? "text-cyan-400" : "text-gray-500"}`} />
                  </div>
                  <div className="flex-1">
                    <p className={`font-semibold text-sm ${selectedNetwork === "zero" ? "text-white" : "text-gray-300"}`}>Telos Zero</p>
                    <p className="text-xs text-gray-500 mt-0.5">Native · 12-character account name</p>
                  </div>
                  <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${selectedNetwork === "zero" ? "border-cyan-400" : "border-gray-600"}`}>
                    {selectedNetwork === "zero" && <div className="w-2 h-2 rounded-full bg-cyan-400" />}
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedNetwork("evm")}
                  className={`w-full flex items-center gap-4 p-4 rounded-xl border transition-all text-left ${
                    selectedNetwork === "evm"
                      ? "border-purple-500/50 bg-purple-500/8"
                      : "border-white/10 bg-[#1a1a1a] hover:border-white/20"
                  }`}
                >
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${selectedNetwork === "evm" ? "bg-purple-500/20" : "bg-white/5"}`}>
                    <Globe className={`w-5 h-5 ${selectedNetwork === "evm" ? "text-purple-400" : "text-gray-500"}`} />
                  </div>
                  <div className="flex-1">
                    <p className={`font-semibold text-sm ${selectedNetwork === "evm" ? "text-white" : "text-gray-300"}`}>Telos EVM</p>
                    <p className="text-xs text-gray-500 mt-0.5">Ethereum-compatible · 0x address</p>
                  </div>
                  <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${selectedNetwork === "evm" ? "border-purple-400" : "border-gray-600"}`}>
                    {selectedNetwork === "evm" && <div className="w-2 h-2 rounded-full bg-purple-400" />}
                  </div>
                </button>
              </div>
            </div>

            <div className="bg-yellow-500/8 border border-yellow-500/20 rounded-xl px-4 py-3 flex gap-3">
              <AlertTriangle className="w-4 h-4 text-yellow-400 shrink-0 mt-0.5" />
              <p className="text-xs text-yellow-300/80 leading-relaxed">
                Store your private keys safely after creation. They will not be saved for you.
              </p>
            </div>

            <button
              type="submit"
              disabled={createWallet.isPending || !!nameError || accountName.length < 1}
              className="w-full py-4 rounded-xl bg-gradient-to-r from-cyan-500 to-cyan-600 text-white font-bold text-base disabled:opacity-40 hover:from-cyan-400 hover:to-cyan-500 transition-all shadow-lg shadow-cyan-500/20"
            >
              {createWallet.isPending ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Creating...
                </span>
              ) : "Create Address"}
            </button>
          </form>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="px-5 pt-5 pb-8">
        <div className="text-center mb-6">
          <div className="w-12 h-12 rounded-2xl bg-green-500/10 border border-green-500/20 flex items-center justify-center mx-auto mb-3">
            <CheckCircle2 className="w-6 h-6 text-green-400" />
          </div>
          <h1 className="text-xl font-bold mb-1">Address Created</h1>
          <p className="text-red-400 text-xs font-medium">Save your keys now — they will not be stored</p>
        </div>

        <div className="space-y-3 mb-6">
          <KeyRow
            label="EVM Address (Public)"
            value={createdWallet?.evmAddress ?? createdWallet?.publicKey ?? ""}
            onCopy={() => copyText(createdWallet?.evmAddress ?? "", "EVM Address")}
          />
          <KeyRow
            label="Telos Zero Address"
            value={createdWallet?.zeroAddress ?? ""}
            monoBold
            onCopy={() => copyText(createdWallet?.zeroAddress ?? "", "Zero Address")}
          />
          <KeyRow
            label="Private Key"
            value={createdWallet?.privateKey ?? ""}
            secret
            showSecret={showPrivateKey}
            onToggleSecret={() => setShowPrivateKey(p => !p)}
            onCopy={() => copyText(createdWallet?.privateKey ?? "", "Private Key")}
          />
        </div>

        <div className="space-y-3 mb-6">
          <label
            className="flex items-center gap-3 p-3.5 bg-[#1a1a1a] rounded-xl border border-white/10 cursor-pointer"
            onClick={() => setHasCopied(p => !p)}
          >
            <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-colors ${hasCopied ? "bg-cyan-500 border-cyan-500" : "border-gray-600"}`}>
              {hasCopied && <CheckCircle2 className="w-3 h-3 text-white" />}
            </div>
            <span className="text-sm text-gray-300">I have saved my keys somewhere safe</span>
          </label>

          <div
            className="flex items-center justify-between p-3.5 bg-[#1a1a1a] rounded-xl border border-white/10 cursor-pointer"
            onClick={() => setCaptchaChecked(p => !p)}
          >
            <div className="flex items-center gap-3">
              <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-colors ${captchaChecked ? "bg-green-500 border-green-500" : "border-gray-600"}`}>
                {captchaChecked && <CheckCircle2 className="w-3 h-3 text-white" />}
              </div>
              <span className="text-sm text-gray-300">I'm not a robot</span>
            </div>
            <div className="flex flex-col items-end">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-700 rounded flex items-center justify-center">
                <span className="text-white text-xs font-bold">rC</span>
              </div>
            </div>
          </div>
        </div>

        <button
          onClick={handleContinue}
          disabled={!hasCopied || !captchaChecked}
          className="w-full py-4 rounded-xl bg-gradient-to-r from-cyan-500 to-cyan-600 text-white font-bold text-base disabled:opacity-30 hover:from-cyan-400 hover:to-cyan-500 transition-all"
        >
          Continue to Dashboard
        </button>
      </div>
    </Layout>
  );
}

function KeyRow({
  label, value, monoBold, secret, showSecret, onCopy, onToggleSecret,
}: {
  label: string;
  value: string;
  monoBold?: boolean;
  secret?: boolean;
  showSecret?: boolean;
  onCopy: () => void;
  onToggleSecret?: () => void;
}) {
  return (
    <div className="bg-[#1a1a1a] border border-white/10 rounded-xl p-4">
      <p className="text-xs text-gray-500 mb-2">{label}</p>
      <div className="flex items-start gap-3">
        <p className={`flex-1 font-mono text-sm break-all leading-relaxed ${monoBold ? "text-lg font-bold text-cyan-400 tracking-wider" : "text-gray-200"}`}>
          {secret && !showSecret ? "•".repeat(32) : value}
        </p>
        <div className="flex gap-1.5 shrink-0">
          {secret && (
            <button
              onClick={onToggleSecret}
              className="w-8 h-8 bg-white/5 rounded-lg flex items-center justify-center hover:bg-white/10 transition-colors"
            >
              {showSecret ? <EyeOff className="w-3.5 h-3.5 text-gray-400" /> : <Eye className="w-3.5 h-3.5 text-gray-400" />}
            </button>
          )}
          <button
            onClick={onCopy}
            className="w-8 h-8 bg-cyan-500/20 rounded-lg flex items-center justify-center hover:bg-cyan-500/30 transition-colors"
          >
            <Copy className="w-3.5 h-3.5 text-cyan-400" />
          </button>
        </div>
      </div>
    </div>
  );
}
