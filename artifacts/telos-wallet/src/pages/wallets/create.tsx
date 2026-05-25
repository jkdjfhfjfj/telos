import { useState } from "react";
import { useLocation } from "wouter";
import { Layout } from "@/components/layout";
import { useToast } from "@/hooks/use-toast";
import { useCreateWallet, getListWalletsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Copy, CheckCircle2, ArrowLeft, AlertTriangle, Eye, EyeOff } from "lucide-react";

type Step = "form" | "keys";

export default function CreateWalletPage() {
  const [step, setStep] = useState<Step>("form");
  const [accountName, setAccountName] = useState("");
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
    if (!/^[a-z1-5]*$/.test(clean)) return "Only letters a-z and numbers 1-5 allowed";
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
  };

  const handleContinue = () => {
    if (!hasCopied || !captchaChecked) {
      toast({ title: "Please confirm", description: "Copy your keys and complete the checkbox before continuing.", variant: "destructive" });
      return;
    }
    setLocation("/dashboard");
  };

  // Step 1: Form
  if (step === "form") {
    return (
      <div className="min-h-[100dvh] bg-white flex flex-col max-w-[430px] mx-auto">
        <div className="px-6 pt-6">
          <button onClick={() => setLocation("/dashboard")} className="flex items-center gap-1 text-gray-500 text-sm mb-6">
            <ArrowLeft className="w-4 h-4" /> Back
          </button>
          <h1 className="text-2xl font-bold text-[#333] mb-8 text-center">Create an Account</h1>
        </div>

        <form onSubmit={handleCreate} className="px-6 flex-1">
          <div className="mb-6">
            <input
              value={accountName}
              onChange={handleNameChange}
              placeholder="Account name"
              className="w-full border border-gray-300 rounded-lg px-4 py-3.5 text-[#333] text-base outline-none focus:border-purple-500 transition-colors"
            />
            <p className="text-xs text-gray-400 mt-2">12 characters, alphanumeric a-z, 1-5</p>
            {nameError && <p className="text-xs text-red-500 mt-1">{nameError}</p>}
          </div>

          <div className="bg-white border-t border-b border-gray-100 py-6 mb-6 -mx-6 px-6">
            <p className="text-sm text-blue-600 font-medium mb-4 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-blue-500" />
              Select a network to create your account on
            </p>
            <div className="space-y-3">
              <label className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg cursor-pointer">
                <input type="radio" name="network" defaultChecked className="accent-purple-600" />
                <div>
                  <p className="font-semibold text-sm text-[#333]">Telos Zero (Native)</p>
                  <p className="text-xs text-gray-400">12-character account name</p>
                </div>
              </label>
              <label className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg cursor-pointer">
                <input type="radio" name="network" className="accent-purple-600" />
                <div>
                  <p className="font-semibold text-sm text-[#333]">Telos EVM</p>
                  <p className="text-xs text-gray-400">Ethereum-compatible 0x address</p>
                </div>
              </label>
            </div>
          </div>

          <button
            type="submit"
            disabled={createWallet.isPending || !!nameError || accountName.length < 1}
            className="w-full py-4 rounded-xl bg-purple-700 text-white font-bold text-base disabled:opacity-50"
          >
            {createWallet.isPending ? "Creating..." : "CONTINUE"}
          </button>
        </form>
      </div>
    );
  }

  // Step 2: Key backup
  return (
    <div className="min-h-[100dvh] bg-white flex flex-col max-w-[430px] mx-auto">
      <div className="px-6 pt-6 pb-4">
        <h1 className="text-2xl font-bold text-[#333] text-center mb-1">Create an Account</h1>
        <p className="text-red-500 text-sm text-center font-medium mb-6">Save your keys somewhere safe. They will not be stored for you.</p>
      </div>

      <div className="px-6 flex-1 space-y-4">
        {/* Public Key */}
        <div className="border-b border-dashed border-gray-200 pb-4">
          <p className="text-xs text-gray-400 mb-2">Public Key (EVM Address)</p>
          <div className="flex items-start gap-2">
            <p className="flex-1 font-mono text-sm text-[#333] break-all leading-relaxed">
              {createdWallet?.evmAddress ?? createdWallet?.publicKey}
            </p>
            <button
              onClick={() => copyText(createdWallet?.evmAddress ?? "", "Public Key")}
              className="shrink-0 w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center"
            >
              <Copy className="w-3.5 h-3.5 text-white" />
            </button>
          </div>
        </div>

        {/* Zero Address */}
        <div className="border-b border-dashed border-gray-200 pb-4">
          <p className="text-xs text-gray-400 mb-2">Telos Zero Address</p>
          <div className="flex items-start gap-2">
            <p className="flex-1 font-mono text-xl font-bold text-[#333] tracking-widest">
              {createdWallet?.zeroAddress}
            </p>
            <button
              onClick={() => copyText(createdWallet?.zeroAddress ?? "", "Zero Address")}
              className="shrink-0 w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center"
            >
              <Copy className="w-3.5 h-3.5 text-white" />
            </button>
          </div>
        </div>

        {/* Private Key */}
        <div className="border-b border-dashed border-gray-200 pb-4">
          <p className="text-xs text-gray-400 mb-2">Private Key</p>
          <div className="flex items-start gap-2">
            <p className="flex-1 font-mono text-sm text-[#333] break-all leading-relaxed">
              {showPrivateKey ? (createdWallet?.privateKey ?? "N/A") : "•".repeat(40)}
            </p>
            <div className="flex flex-col gap-2">
              <button
                onClick={() => setShowPrivateKey(p => !p)}
                className="shrink-0 w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center"
              >
                {showPrivateKey ? <EyeOff className="w-3.5 h-3.5 text-gray-600" /> : <Eye className="w-3.5 h-3.5 text-gray-600" />}
              </button>
              <button
                onClick={() => copyText(createdWallet?.privateKey ?? "", "Private Key")}
                className="shrink-0 w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center"
              >
                <Copy className="w-3.5 h-3.5 text-white" />
              </button>
            </div>
          </div>
        </div>

        {/* Checkboxes */}
        <label className="flex items-center gap-3 cursor-pointer py-2">
          <div
            onClick={() => setHasCopied(p => !p)}
            className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${hasCopied ? "bg-purple-600 border-purple-600" : "border-gray-400"}`}
          >
            {hasCopied && <CheckCircle2 className="w-3 h-3 text-white" />}
          </div>
          <span className="text-sm text-[#333]">I have copied my keys somewhere safe</span>
        </label>

        {/* Fake CAPTCHA */}
        <div className="border border-gray-200 rounded-lg p-4 flex items-center justify-between">
          <label className="flex items-center gap-3 cursor-pointer">
            <div
              onClick={() => setCaptchaChecked(p => !p)}
              className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${captchaChecked ? "bg-green-500 border-green-500" : "border-gray-400"}`}
            >
              {captchaChecked && <CheckCircle2 className="w-3 h-3 text-white" />}
            </div>
            <span className="text-sm text-[#333]">I'm not a robot</span>
          </label>
          <div className="text-right">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-700 rounded flex items-center justify-center">
              <span className="text-white text-xs font-bold">rC</span>
            </div>
            <p className="text-[9px] text-gray-400 mt-1">reCAPTCHA</p>
          </div>
        </div>

        <p className="text-xs text-gray-400 text-center pb-2">Copy both keys to a safe place before continuing</p>

        <button
          onClick={handleContinue}
          disabled={!hasCopied || !captchaChecked}
          className="w-full py-4 rounded-xl bg-purple-700 text-white font-bold text-base disabled:opacity-40 mb-6"
        >
          CONTINUE
        </button>
      </div>
    </div>
  );
}
