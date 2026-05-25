import { useGetMe } from "@workspace/api-client-react";
import { useClerk } from "@clerk/react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";

export function Layout({ children }: { children: React.ReactNode }) {
  const { data: user } = useGetMe();
  const { signOut } = useClerk();
  const [location] = useLocation();

  const isAdmin = user?.role === "admin";

  const navItems = [
    { href: "/dashboard", label: "Dashboard" },
    { href: "/transactions", label: "Transactions" },
    { href: "/explorer", label: "Explorer" },
    { href: "/settings", label: "Settings" },
  ];

  if (isAdmin) {
    navItems.push({ href: "/admin", label: "Admin Panel" });
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex">
      <aside className="w-64 border-r border-border bg-card p-6 flex flex-col gap-6">
        <div className="flex items-center gap-2 mb-8">
          <div className="w-8 h-8 rounded bg-primary flex items-center justify-center text-primary-foreground font-bold">
            T
          </div>
          <span className="font-bold text-xl tracking-tight">TelosWallet</span>
        </div>
        
        <nav className="flex flex-col gap-2">
          {navItems.map((item) => (
            <Link 
              key={item.href} 
              href={item.href} 
              className={`px-4 py-2 rounded font-medium transition-colors ${
                location.startsWith(item.href) 
                  ? "bg-primary/10 text-primary" 
                  : "hover:bg-muted text-muted-foreground hover:text-foreground"
              }`}
            >
              {item.label}
            </Link>
          ))}
        </nav>
        
        <div className="mt-auto">
          <Button variant="outline" className="w-full justify-start" onClick={() => signOut()}>
            Sign Out
          </Button>
        </div>
      </aside>

      <main className="flex-1 p-8 overflow-auto">
        {children}
      </main>
    </div>
  );
}
