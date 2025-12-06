import { useState, useEffect } from "react";
import { ArrowDown, Settings, ChevronDown, Wallet, Info, RefreshCw, Search, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
  DialogDescription,
} from "@/components/ui/dialog";
import { motion, AnimatePresence } from "framer-motion";

const TOKENS = [
  { symbol: "USDC", name: "USD Coin", icon: "$ " },
  { symbol: "ETH", name: "Ethereum", icon: "⟠" },
  { symbol: "WBTC", name: "Wrapped BTC", icon: "₿" },
  { symbol: "USDT", name: "Tether", icon: "₮" },
  { symbol: "DAI", name: "Dai", icon: "◈" },
];

const ARC_TESTNET_PARAMS = {
  chainId: '0x4ceec2', // 5042002 in hex
  chainName: 'Arc Testnet',
  nativeCurrency: {
    name: 'USDC',
    symbol: 'USDC',
    decimals: 18,
  },
  rpcUrls: ['https://rpc.testnet.arc.network'],
  blockExplorerUrls: ['https://testnet.arcscan.app'],
};

export default function SwapInterface() {
  const [inputAmount, setInputAmount] = useState("");
  const [outputAmount, setOutputAmount] = useState("");
  const [fromToken, setFromToken] = useState(TOKENS[0]); // USDC (Native currency of Arc)
  const [toToken, setToToken] = useState(TOKENS[1]); // ETH
  const [isSwapping, setIsSwapping] = useState(false);
  const [walletConnected, setWalletConnected] = useState(false);
  const [slippage, setSlippage] = useState("0.5");

  // Mock exchange rate calculation
  useEffect(() => {
    if (!inputAmount) {
      setOutputAmount("");
      return;
    }
    const num = parseFloat(inputAmount);
    if (isNaN(num)) return;

    // Mock rates
    const rate = fromToken.symbol === "USDC" && toToken.symbol === "ETH" ? 0.0005 : 
                 fromToken.symbol === "ETH" && toToken.symbol === "USDC" ? 2000 : 
                 Math.random() * 2 + 0.5;
    
    setOutputAmount((num * rate).toFixed(6));
  }, [inputAmount, fromToken, toToken]);

  const connectWallet = async () => {
    const ethereum = (window as any).ethereum;
    if (typeof ethereum !== 'undefined') {
      try {
        // Request account access
        await ethereum.request({ method: 'eth_requestAccounts' });
        
        // Switch to Arc Testnet
        try {
          await ethereum.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: ARC_TESTNET_PARAMS.chainId }],
          });
        } catch (switchError: any) {
          // This error code indicates that the chain has not been added to MetaMask.
          if (switchError.code === 4902) {
            try {
              await ethereum.request({
                method: 'wallet_addEthereumChain',
                params: [ARC_TESTNET_PARAMS],
              });
            } catch (addError) {
              console.error(addError);
            }
          }
        }
        setWalletConnected(true);
      } catch (error) {
        console.error(error);
      }
    } else {
      // Fallback for demo purposes if no wallet is installed
      setWalletConnected(true);
    }
  };

  const handleSwap = () => {
    if (!walletConnected) {
      connectWallet();
      return;
    }
    
    setIsSwapping(true);
    setTimeout(() => {
      setIsSwapping(false);
      setInputAmount("");
      setOutputAmount("");
      // Flip tokens for fun
      const temp = fromToken;
      setFromToken(toToken);
      setToToken(temp);
    }, 1500);
  };

  const TokenSelector = ({ selected, onSelect }: { selected: typeof TOKENS[0], onSelect: (t: typeof TOKENS[0]) => void }) => {
    const [search, setSearch] = useState("");
    const filteredTokens = TOKENS.filter(t => 
      t.symbol.toLowerCase().includes(search.toLowerCase()) || 
      t.name.toLowerCase().includes(search.toLowerCase())
    );

    return (
      <Dialog>
        <DialogTrigger asChild>
          <Button variant="outline" className="flex items-center gap-2 rounded-full bg-secondary border-transparent hover:bg-secondary/80 text-foreground font-semibold px-3 py-1 h-auto min-w-[100px] justify-between transition-all hover:scale-105">
            <div className="flex items-center gap-2">
              <span className="text-lg">{selected.icon}</span>
              <span>{selected.symbol}</span>
            </div>
            <ChevronDown className="w-4 h-4 opacity-50" />
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-md border-border bg-card/95 backdrop-blur-xl p-0 gap-0 overflow-hidden">
          <DialogHeader className="p-4 pb-2">
            <DialogTitle>Select a token</DialogTitle>
            <DialogDescription className="hidden">
              Select a token from the list to swap
            </DialogDescription>
          </DialogHeader>
          <div className="px-4 pb-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input 
                placeholder="Search name or paste address" 
                className="w-full bg-secondary/50 border border-transparent focus:border-primary rounded-xl py-3 pl-9 pr-4 outline-none text-sm transition-all"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
          <div className="grid gap-1 p-2 max-h-[300px] overflow-y-auto">
            {filteredTokens.map((token) => (
              <DialogClose asChild key={token.symbol}>
                <Button
                  variant="ghost"
                  className="w-full justify-start gap-3 h-16 hover:bg-secondary/50 rounded-xl px-4"
                  onClick={() => onSelect(token)}
                >
                  <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center text-lg">
                    {token.icon}
                  </div>
                  <div className="flex flex-col items-start">
                    <span className="font-bold">{token.symbol}</span>
                    <span className="text-xs text-muted-foreground">{token.name}</span>
                  </div>
                  {selected.symbol === token.symbol && (
                    <div className="ml-auto text-primary text-sm">Selected</div>
                  )}
                </Button>
              </DialogClose>
            ))}
            {filteredTokens.length === 0 && (
               <div className="py-8 text-center text-muted-foreground text-sm">No tokens found</div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    );
  };

  const SettingsModal = () => (
    <Dialog>
      <DialogTrigger asChild>
         <Button variant="ghost" size="icon" className="w-8 h-8 rounded-full hover:bg-secondary text-muted-foreground hover:text-foreground hover:rotate-90 transition-all duration-300">
           <Settings className="w-4 h-4" />
         </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-sm border-border bg-card/95 backdrop-blur-xl">
        <DialogHeader>
          <DialogTitle>Transaction Settings</DialogTitle>
          <DialogDescription className="hidden">
            Adjust your transaction settings like slippage tolerance and deadline
          </DialogDescription>
        </DialogHeader>
        <div className="py-4 space-y-4">
           <div className="space-y-2">
             <div className="flex justify-between text-sm">
               <span className="text-muted-foreground">Slippage tolerance</span>
               <span className="text-primary font-medium">{slippage}%</span>
             </div>
             <div className="flex gap-2">
               <Button 
                variant={slippage === "0.5" ? "secondary" : "outline"} 
                size="sm" 
                className={`rounded-full flex-1 ${slippage === "0.5" ? "bg-primary/20 text-primary hover:bg-primary/30" : "border-secondary bg-transparent hover:bg-secondary"}`}
                onClick={() => setSlippage("0.5")}
               >
                 0.5%
               </Button>
               <Button 
                variant={slippage === "1.0" ? "secondary" : "outline"} 
                size="sm" 
                className={`rounded-full flex-1 ${slippage === "1.0" ? "bg-primary/20 text-primary hover:bg-primary/30" : "border-secondary bg-transparent hover:bg-secondary"}`}
                onClick={() => setSlippage("1.0")}
               >
                 1.0%
               </Button>
               <Button 
                variant={slippage === "2.0" ? "secondary" : "outline"} 
                size="sm" 
                className={`rounded-full flex-1 ${slippage === "2.0" ? "bg-primary/20 text-primary hover:bg-primary/30" : "border-secondary bg-transparent hover:bg-secondary"}`}
                onClick={() => setSlippage("2.0")}
               >
                 2.0%
               </Button>
             </div>
           </div>
           <div className="space-y-2">
             <div className="flex justify-between text-sm">
               <span className="text-muted-foreground">Transaction deadline</span>
               <span className="text-muted-foreground">20m</span>
             </div>
           </div>
        </div>
      </DialogContent>
    </Dialog>
  );

  return (
    <div className="min-h-screen w-full bg-background text-foreground flex flex-col font-sans relative overflow-hidden selection:bg-primary/30">
      {/* Background Gradients */}
      <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] bg-primary/15 blur-[150px] rounded-full pointer-events-none animate-pulse" style={{animationDuration: '8s'}} />
      <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] bg-cyan-600/10 blur-[150px] rounded-full pointer-events-none" />

      {/* Navbar */}
      <nav className="w-full max-w-7xl mx-auto p-4 flex justify-between items-center z-10 relative">
        <div className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity">
          <div className="w-10 h-10 bg-gradient-to-br from-primary to-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-primary/20">
            <span className="text-white font-black text-xl italic">eM</span>
          </div>
          <span className="text-xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-white/60">eMadness Swap</span>
        </div>
        
        <div className="flex items-center gap-4">
          <a 
            href="https://faucet.circle.com" 
            target="_blank" 
            rel="noopener noreferrer"
            className="hidden md:flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-primary transition-colors px-3 py-1.5 rounded-full hover:bg-primary/10"
          >
            <span>USDC Faucet</span>
            <ExternalLink className="w-3 h-3" />
          </a>
          
          <Button 
            variant={walletConnected ? "outline" : "secondary"} 
            className={`rounded-full font-semibold gap-2 transition-all ${walletConnected ? 'border-primary/50 text-primary bg-primary/10' : ''}`}
            onClick={connectWallet}
          >
            <Wallet className="w-4 h-4" />
            {walletConnected ? "0x12...4F8A" : "Connect to Arc"}
          </Button>
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center p-4 z-10">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-[480px]"
        >
          <Card className="w-full border-white/5 bg-card/60 backdrop-blur-xl shadow-2xl p-2 rounded-3xl ring-1 ring-white/10">
            <div className="p-4 flex justify-between items-center mb-2">
              <div className="flex items-center gap-4">
                <span className="font-semibold text-foreground text-lg">Swap</span>
              </div>
              <SettingsModal />
            </div>

            {/* FROM Input */}
            <div className="bg-black/20 rounded-2xl p-4 mb-1 transition-colors hover:bg-black/30 group border border-transparent hover:border-white/5">
              <div className="flex justify-between mb-2">
                <span className="text-xs font-medium text-muted-foreground">You pay</span>
                <span className="text-xs font-medium text-muted-foreground">Balance: {walletConnected ? "100.00" : "0"}</span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <input
                  type="text"
                  placeholder="0"
                  className="bg-transparent text-4xl font-medium text-foreground placeholder:text-muted-foreground/30 outline-none w-full font-sans tracking-tight"
                  value={inputAmount}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (/^\d*\.?\d*$/.test(val)) setInputAmount(val);
                  }}
                />
                <TokenSelector selected={fromToken} onSelect={setFromToken} />
              </div>
              <div className="flex justify-between mt-2 h-5">
                 <span className="text-sm text-muted-foreground font-medium">{inputAmount ? `$${(parseFloat(inputAmount) * 1).toFixed(2)}` : '$0.00'}</span>
              </div>
            </div>

            {/* Swap Arrow */}
            <div className="relative h-2 flex items-center justify-center z-10">
              <div className="absolute bg-card p-2 rounded-xl border-[4px] border-background cursor-pointer hover:scale-110 hover:rotate-180 transition-all duration-300 shadow-sm group" onClick={() => {
                 const t = fromToken; setFromToken(toToken); setToToken(t);
                 const a = inputAmount; setInputAmount(outputAmount); setOutputAmount(a);
              }}>
                <ArrowDown className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" strokeWidth={3} />
              </div>
            </div>

            {/* TO Input */}
            <div className="bg-black/20 rounded-2xl p-4 mt-1 transition-colors hover:bg-black/30 group border border-transparent hover:border-white/5">
              <div className="flex justify-between mb-2">
                <span className="text-xs font-medium text-muted-foreground">You receive</span>
                <span className="text-xs font-medium text-muted-foreground">Balance: {walletConnected ? "0.00" : "0"}</span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <input
                  type="text"
                  placeholder="0"
                  readOnly
                  className="bg-transparent text-4xl font-medium text-foreground placeholder:text-muted-foreground/30 outline-none w-full font-sans tracking-tight cursor-default"
                  value={outputAmount}
                />
                <TokenSelector selected={toToken} onSelect={setToToken} />
              </div>
              <div className="flex justify-between mt-2 h-5">
                 <span className="text-sm text-muted-foreground font-medium">{outputAmount ? `$${(parseFloat(outputAmount) * (toToken.symbol === 'USDC' ? 1 : 2000)).toFixed(2)}` : '$0.00'}</span>
              </div>
            </div>

            {/* Info Accordion (Simplified) */}
            <AnimatePresence>
              {inputAmount && (
                <motion.div 
                  initial={{ height: 0, opacity: 0 }} 
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="px-4 py-3 flex justify-between items-center text-xs text-primary font-medium overflow-hidden"
                >
                  <div className="flex items-center gap-1">
                    <Info className="w-3 h-3" />
                    <span>1 {fromToken.symbol} = {(parseFloat(outputAmount)/parseFloat(inputAmount) || 0).toFixed(6)} {toToken.symbol}</span>
                    <span className="text-muted-foreground ml-1">($0.00)</span>
                  </div>
                  <div className="flex items-center gap-1 cursor-pointer hover:opacity-80 bg-primary/10 px-2 py-0.5 rounded-md">
                     <span className="text-primary">Slippage: {slippage}%</span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Action Button */}
            <div className="p-1 mt-2">
              <Button 
                className={`w-full h-14 text-lg font-bold rounded-2xl transition-all shadow-lg ${
                  !walletConnected 
                    ? 'bg-primary/20 text-primary hover:bg-primary/30' 
                    : 'bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 hover:opacity-90 shadow-primary/25 hover:scale-[1.01] active:scale-[0.99]'
                }`}
                onClick={handleSwap}
                disabled={walletConnected && (!inputAmount || isSwapping)}
              >
                {isSwapping ? (
                  <div className="flex items-center gap-2">
                    <RefreshCw className="w-5 h-5 animate-spin" />
                    <span>Swapping...</span>
                  </div>
                ) : (
                  !walletConnected ? "Connect to Arc" :
                  !inputAmount ? "Enter an amount" : "Swap"
                )}
              </Button>
            </div>
          </Card>
          
          <div className="mt-6 text-center">
            <p className="text-xs text-muted-foreground/50 font-medium">Powered by eMadness</p>
          </div>
        </motion.div>
      </main>
    </div>
  );
}
