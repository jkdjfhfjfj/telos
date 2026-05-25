import { useGetMe } from "@workspace/api-client-react";
import { useClerk } from "@clerk/react";
import { Link, useLocation } from "wouter";
import { Wallet, PlusCircle, Settings, Grid2X2, Search, User, Users } from "lucide-react";

export function Layout({ children }: { children: React.ReactNode }) {
  const { data: user } = useGetMe();
  const { signOut } = useClerk();
  const [location] = useLocation();
  const isAdmin = user?.role === "admin";

  const navItems = [
    { href: "/dashboard", icon: Wallet, label: "Wallet" },
    { href: "/wallets/create", icon: PlusCircle, label: "Add" },
    { href: "/explorer", icon: Search, label: "Explorer" },
    { href: "/transactions", icon: Grid2X2, label: "Activity" },
    { href: "/settings", icon: Settings, label: "Settings" },
  ];

  if (isAdmin) {
    navItems.push({ href: "/admin", icon: Users, label: "Admin" });
  }

  const isActive = (href: string) => {
    if (href === "/dashboard") return location === "/" || location === "/dashboard";
    return location.startsWith(href);
  };

  return (
    <div className="min-h-[100dvh] bg-[#0a0a0a] text-white flex flex-col max-w-[430px] mx-auto relative">
      <main className="flex-1 overflow-auto pb-20">
        {children}
      </main>

      <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] bg-[#111] border-t border-white/10 px-2 py-2 z-50">
        <div className="flex items-center justify-around">
          {navItems.map(({ href, icon: Icon, label }) => (
            <Link key={href} href={href}>
              <button className={`flex flex-col items-center gap-1 px-3 py-1 rounded-xl transition-colors ${
                isActive(href) ? "text-cyan-400" : "text-gray-500 hover:text-gray-300"
              }`}>
                <Icon className="w-5 h-5" strokeWidth={isActive(href) ? 2.5 : 1.8} />
                <span className="text-[10px] font-medium">{label}</span>
              </button>
            </Link>
          ))}
        </div>
      </nav>
    </div>
  );
}

export function AdminLayout({ children }: { children: React.ReactNode }) {
  const { signOut } = useClerk();
  const [location] = useLocation();

  const navItems = [
    { href: "/admin", label: "Dashboard" },
    { href: "/admin/wallets", label: "Wallets" },
    { href: "/admin/withdrawals", label: "Withdrawals" },
    { href: "/admin/transactions", label: "Transactions" },
    { href: "/admin/users", label: "Users" },
  ];

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      <header className="bg-[#111] border-b border-white/10 px-6 py-4 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-400 to-purple-600 flex items-center justify-center font-bold text-sm">T</div>
          <span className="font-bold text-lg">Admin Panel</span>
        </div>
        <button onClick={() => signOut()} className="text-sm text-gray-400 hover:text-white transition-colors">Sign Out</button>
      </header>
      <div className="flex">
        <aside className="w-52 bg-[#111] min-h-[calc(100vh-60px)] p-4 border-r border-white/10 hidden md:block">
          <nav className="space-y-1">
            {navItems.map(({ href, label }) => (
              <Link key={href} href={href}>
                <div className={`px-4 py-2.5 rounded-lg text-sm font-medium cursor-pointer transition-colors ${
                  location === href || (href !== "/admin" && location.startsWith(href))
                    ? "bg-cyan-400/10 text-cyan-400" : "text-gray-400 hover:text-white hover:bg-white/5"
                }`}>{label}</div>
              </Link>
            ))}
          </nav>
        </aside>
        <main className="flex-1 p-6 overflow-auto">{children}</main>
      </div>
    </div>
  );
}
