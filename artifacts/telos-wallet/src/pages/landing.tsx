import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col overflow-x-hidden">
      <header className="px-6 py-4 flex items-center justify-between border-b border-border bg-card/50 backdrop-blur sticky top-0 z-50">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded bg-primary flex items-center justify-center text-primary-foreground font-bold text-xl">
            T
          </div>
          <span className="font-bold text-xl tracking-tight">TelosWallet</span>
        </div>
        <nav className="flex items-center gap-4">
          <Link href="/sign-in" className="text-sm font-medium hover:text-primary transition-colors">
            Sign In
          </Link>
          <Link href="/sign-up" className="text-sm font-medium">
            <Button size="sm">Get Started</Button>
          </Link>
        </nav>
      </header>

      <main className="flex-1 flex flex-col">
        <section className="relative py-32 px-6 md:px-12 max-w-6xl mx-auto w-full flex flex-col items-center justify-center min-h-[80vh]">
          {/* Animated Background Concept */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none -z-10 flex items-center justify-center opacity-30">
            <motion.div 
              animate={{ rotate: 360 }}
              transition={{ duration: 100, repeat: Infinity, ease: "linear" }}
              className="w-[800px] h-[800px] rounded-full border border-primary/20 absolute"
            />
            <motion.div 
              animate={{ rotate: -360 }}
              transition={{ duration: 150, repeat: Infinity, ease: "linear" }}
              className="w-[600px] h-[600px] rounded-full border border-secondary/20 absolute"
            />
            <motion.div 
              animate={{ scale: [1, 1.1, 1], opacity: [0.3, 0.6, 0.3] }}
              transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
              className="w-32 h-32 bg-primary/20 rounded-full blur-3xl absolute"
            />
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center z-10"
          >
            <h1 className="text-5xl md:text-7xl lg:text-8xl font-extrabold tracking-tighter mb-6 leading-tight">
              The Swiss Bank of <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-secondary">
                Web3
              </span>
            </h1>
            <p className="text-xl md:text-2xl text-muted-foreground max-w-3xl mx-auto mb-10 leading-relaxed">
              Manage your Telos Zero and EVM assets from a single, beautifully crafted interface. Zero fees, 0.5s block times, one secure home.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Link href="/sign-up">
                <Button size="lg" className="h-14 px-8 text-lg w-full sm:w-auto shadow-lg shadow-primary/20">
                  Create Wallet
                </Button>
              </Link>
              <Link href="/explorer">
                <Button size="lg" variant="outline" className="h-14 px-8 text-lg w-full sm:w-auto backdrop-blur bg-background/50">
                  Explore Network
                </Button>
              </Link>
            </div>
          </motion.div>
        </section>
        
        <section className="py-24 bg-card border-y border-border">
          <div className="max-w-6xl mx-auto px-6 grid md:grid-cols-4 gap-8 text-center divide-y md:divide-y-0 md:divide-x divide-border">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="pt-8 md:pt-0 px-4"
            >
              <p className="text-5xl font-black text-primary mb-2">0.5s</p>
              <p className="text-sm font-medium text-muted-foreground uppercase tracking-widest">Block Time</p>
            </motion.div>
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="pt-8 md:pt-0 px-4"
            >
              <p className="text-5xl font-black text-primary mb-2">15,200+</p>
              <p className="text-sm font-medium text-muted-foreground uppercase tracking-widest">TPS Capacity</p>
            </motion.div>
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
              className="pt-8 md:pt-0 px-4"
            >
              <p className="text-5xl font-black text-primary mb-2">~$0.001</p>
              <p className="text-sm font-medium text-muted-foreground uppercase tracking-widest">Avg Gas Fee</p>
            </motion.div>
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.3 }}
              className="pt-8 md:pt-0 px-4"
            >
              <p className="text-5xl font-black text-primary mb-2">100%</p>
              <p className="text-sm font-medium text-muted-foreground uppercase tracking-widest">EVM Compatible</p>
            </motion.div>
          </div>
        </section>

        <section className="py-32 px-6">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-4xl font-bold mb-4">Two Networks, One Wallet</h2>
              <p className="text-xl text-muted-foreground">The full power of the Telos ecosystem at your fingertips.</p>
            </div>
            
            <div className="grid md:grid-cols-2 gap-8">
              <motion.div 
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                className="p-10 bg-card border border-border rounded-3xl relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />
                <h3 className="text-3xl font-black mb-4 text-primary">Telos Zero</h3>
                <p className="text-muted-foreground text-lg mb-6 leading-relaxed">
                  The foundational EOSIO layer. Human-readable 12-character account names. Zero fees for users, blazing fast finality, and governance built-in.
                </p>
                <ul className="space-y-3 font-medium">
                  <li className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded bg-primary/20 text-primary flex items-center justify-center text-xs">✓</div>
                    Feeless transactions
                  </li>
                  <li className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded bg-primary/20 text-primary flex items-center justify-center text-xs">✓</div>
                    Named accounts (e.g. yourname.tlos)
                  </li>
                  <li className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded bg-primary/20 text-primary flex items-center justify-center text-xs">✓</div>
                    Advanced permissions
                  </li>
                </ul>
              </motion.div>
              
              <motion.div 
                initial={{ opacity: 0, x: 20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                className="p-10 bg-card border border-border rounded-3xl relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 w-64 h-64 bg-secondary/10 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />
                <h3 className="text-3xl font-black mb-4 text-secondary">Telos EVM</h3>
                <p className="text-muted-foreground text-lg mb-6 leading-relaxed">
                  The most powerful Ethereum Virtual Machine. Deploy solidity contracts with no changes. Front-running protection and massive scalability.
                </p>
                <ul className="space-y-3 font-medium">
                  <li className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded bg-secondary/20 text-secondary flex items-center justify-center text-xs">✓</div>
                    0x... Addresses
                  </li>
                  <li className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded bg-secondary/20 text-secondary flex items-center justify-center text-xs">✓</div>
                    Fixed microscopic gas fees
                  </li>
                  <li className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded bg-secondary/20 text-secondary flex items-center justify-center text-xs">✓</div>
                    MEV protection by design
                  </li>
                </ul>
              </motion.div>
            </div>
          </div>
        </section>
        
        <section className="py-32 bg-primary text-primary-foreground text-center px-6">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="max-w-3xl mx-auto"
          >
            <h2 className="text-5xl font-black tracking-tight mb-6">Ready to enter the ecosystem?</h2>
            <p className="text-xl text-primary-foreground/80 mb-10">
              Create your wallet in 30 seconds. Protected by standard TOTP 2FA.
            </p>
            <Link href="/sign-up">
              <Button size="lg" variant="secondary" className="h-16 px-10 text-xl text-primary font-bold shadow-2xl">
                Get Started Now
              </Button>
            </Link>
          </motion.div>
        </section>
      </main>
      
      <footer className="border-t border-border py-12 px-6 text-center text-muted-foreground">
        <div className="flex items-center justify-center gap-2 mb-4">
          <div className="w-6 h-6 rounded bg-primary/20 flex items-center justify-center text-primary font-bold text-sm">
            T
          </div>
          <span className="font-bold text-foreground">TelosWallet</span>
        </div>
        <p className="text-sm">Designed for the fastest EVM on Earth.</p>
      </footer>
    </div>
  );
}
