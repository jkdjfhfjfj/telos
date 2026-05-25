import { useEffect, useRef } from "react";
import { ClerkProvider, SignIn, SignUp, Show, useClerk, useAuth } from '@clerk/react';
import { publishableKeyFromHost } from '@clerk/react/internal';
import { shadcn } from '@clerk/themes';
import { Switch, Route, useLocation, Router as WouterRouter, Redirect } from 'wouter';
import { QueryClient, QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useSyncUser, useGetMe } from "@workspace/api-client-react";

import LandingPage from "./pages/landing";
import DashboardPage from "./pages/dashboard";
import SettingsPage from "./pages/settings";
import TransactionsPage from "./pages/transactions";
import ExplorerPage from "./pages/explorer";
import AdminDashboardPage from "./pages/admin/dashboard";
import AdminUserDetailPage from "./pages/admin/user-detail";
import AdminWalletsPage from "./pages/admin/wallets";
import AdminWithdrawalsPage from "./pages/admin/withdrawals";
import AdminTransactionsPage from "./pages/admin/transactions";
import AdminUsersPage from "./pages/admin/users";
import AdminLoginPage from "./pages/admin/login";
import CreateWalletPage from "./pages/wallets/create";
import WalletDetailPage from "./pages/wallets/detail";
import WalletSendPage from "./pages/wallets/send";
import WalletReceivePage from "./pages/wallets/receive";
import NotFound from "./pages/not-found";

const queryClient = new QueryClient();

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

const clerkPubKey = publishableKeyFromHost(
  window.location.hostname,
  import.meta.env.VITE_CLERK_PUBLISHABLE_KEY,
);

const clerkProxyUrl = import.meta.env.VITE_CLERK_PROXY_URL;

function stripBase(path: string): string {
  return basePath && path.startsWith(basePath)
    ? path.slice(basePath.length) || "/"
    : path;
}

if (!clerkPubKey) {
  throw new Error('Missing VITE_CLERK_PUBLISHABLE_KEY in .env file');
}

const clerkAppearance = {
  theme: shadcn,
  cssLayerName: "clerk",
  options: {
    logoPlacement: "inside" as const,
    logoLinkUrl: basePath || "/",
    logoImageUrl: `${window.location.origin}${basePath}/logo.svg`,
  },
  variables: {
    colorPrimary: "hsl(191 80% 45%)",
    colorBackground: "hsl(220 30% 8%)",
    colorForeground: "hsl(210 40% 98%)",
    fontFamily: "Inter, sans-serif"
  },
  elements: {
    rootBox: "w-full flex justify-center",
    cardBox: "w-[440px] max-w-full bg-slate-900 border border-slate-700 shadow-xl",
    card: "!shadow-none !border-0 !bg-transparent !rounded-none",
    footer: "!shadow-none !border-0 !bg-transparent !rounded-none",
    headerTitle: "text-white",
    headerSubtitle: "text-slate-400",
    socialButtonsBlockButtonText: "text-white",
    formFieldLabel: "text-slate-300",
    footerActionLink: "text-teal-400",
    footerActionText: "text-slate-400",
    dividerText: "text-slate-500"
  },
};

function SignInPage() {
  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-background px-4">
      <SignIn routing="path" path={`${basePath}/sign-in`} signUpUrl={`${basePath}/sign-up`} />
    </div>
  );
}

function AdminSignInPage() {
  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-cyan-400 to-purple-600 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-cyan-500/20">
            <span className="text-white text-2xl font-bold">T</span>
          </div>
          <h1 className="text-2xl font-bold text-white mb-1">Admin Portal</h1>
          <p className="text-gray-400 text-sm">Sign in with your admin credentials</p>
        </div>
        <SignIn
          routing="path"
          path={`${basePath}/admin/sign-in`}
          signUpUrl={`${basePath}/sign-up`}
          forceRedirectUrl={`${basePath}/admin`}
        />
      </div>
    </div>
  );
}

function SignUpPage() {
  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-background px-4">
      <SignUp routing="path" path={`${basePath}/sign-up`} signInUrl={`${basePath}/sign-in`} />
    </div>
  );
}

function ClerkQueryClientCacheInvalidator() {
  const { addListener } = useClerk();
  const queryClient = useQueryClient();
  const prevUserIdRef = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    const unsubscribe = addListener(({ user }) => {
      const userId = user?.id ?? null;
      if (
        prevUserIdRef.current !== undefined &&
        prevUserIdRef.current !== userId
      ) {
        queryClient.clear();
      }
      prevUserIdRef.current = userId;
    });
    return unsubscribe;
  }, [addListener, queryClient]);

  return null;
}

function SyncUser() {
  const { isSignedIn } = useAuth();
  const syncUser = useSyncUser();
  const hasSynced = useRef(false);

  useEffect(() => {
    if (isSignedIn && !hasSynced.current) {
      hasSynced.current = true;
      syncUser.mutate();
    }
  }, [isSignedIn, syncUser]);

  return null;
}

function HomeRedirect() {
  return (
    <>
      <Show when="signed-in">
        <Redirect to="/dashboard" />
      </Show>
      <Show when="signed-out">
        <LandingPage />
      </Show>
    </>
  );
}

function ProtectedRoute({ component: Component }: { component: any }) {
  const { isLoaded, isSignedIn } = useAuth();
  
  if (!isLoaded) return null;
  if (!isSignedIn) return <Redirect to="/sign-in" />;
  
  return <Component />;
}

function AdminRoute({ component: Component }: { component: any }) {
  const { isLoaded, isSignedIn } = useAuth();
  const { data: user, isLoading: userLoading } = useGetMe({ query: { enabled: isSignedIn } as any });
  
  if (!isLoaded || (isSignedIn && userLoading)) return null;
  if (!isSignedIn) return <Redirect to="/admin/sign-in" />;
  if (user && user.role !== "admin") return <Redirect to="/admin/login" />;
  if (!user) return null;
  
  return <Component />;
}

function ClerkProviderWithRoutes() {
  const [, setLocation] = useLocation();

  return (
    <ClerkProvider
      publishableKey={clerkPubKey}
      proxyUrl={clerkProxyUrl}
      appearance={clerkAppearance}
      signInUrl={`${basePath}/sign-in`}
      signUpUrl={`${basePath}/sign-up`}
      routerPush={(to) => setLocation(stripBase(to))}
      routerReplace={(to) => setLocation(stripBase(to), { replace: true })}
    >
      <QueryClientProvider client={queryClient}>
        <ClerkQueryClientCacheInvalidator />
        <SyncUser />
        <Switch>
          <Route path="/" component={HomeRedirect} />
          <Route path="/sign-in/*?" component={SignInPage} />
          <Route path="/sign-up/*?" component={SignUpPage} />
          
          <Route path="/dashboard" component={() => <ProtectedRoute component={DashboardPage} />} />
          <Route path="/settings" component={() => <ProtectedRoute component={SettingsPage} />} />
          <Route path="/transactions" component={() => <ProtectedRoute component={TransactionsPage} />} />
          <Route path="/explorer" component={ExplorerPage} />
          
          <Route path="/wallets/create" component={() => <ProtectedRoute component={CreateWalletPage} />} />
          <Route path="/wallets/:id/receive" component={() => <ProtectedRoute component={WalletReceivePage} />} />
          <Route path="/wallets/:id/send" component={() => <ProtectedRoute component={WalletSendPage} />} />
          <Route path="/wallets/:id" component={() => <ProtectedRoute component={WalletDetailPage} />} />

          <Route path="/admin/sign-in/*?" component={AdminSignInPage} />
          <Route path="/admin/login" component={AdminLoginPage} />
          <Route path="/admin" component={() => <AdminRoute component={AdminDashboardPage} />} />
          <Route path="/admin/wallets" component={() => <AdminRoute component={AdminWalletsPage} />} />
          <Route path="/admin/withdrawals" component={() => <AdminRoute component={AdminWithdrawalsPage} />} />
          <Route path="/admin/transactions" component={() => <AdminRoute component={AdminTransactionsPage} />} />
          <Route path="/admin/users" component={() => <AdminRoute component={AdminUsersPage} />} />
          <Route path="/admin/users/:id" component={() => <AdminRoute component={AdminUserDetailPage} />} />
          
          <Route component={NotFound} />
        </Switch>
      </QueryClientProvider>
    </ClerkProvider>
  );
}

function App() {
  return (
    <TooltipProvider>
      <WouterRouter base={basePath}>
        <ClerkProviderWithRoutes />
      </WouterRouter>
      <Toaster />
    </TooltipProvider>
  );
}

export default App;
