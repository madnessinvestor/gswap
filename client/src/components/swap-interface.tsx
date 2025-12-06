import { useState, useEffect } from "react";
import { ArrowDown, Settings, ChevronDown, Wallet, Info, RefreshCw, Search, ExternalLink, ArrowUpRight, History, TrendingUp, Activity } from "lucide-react";
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
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

const TOKENS = [
  { symbol: "USDC", name: "USD Coin", icon: "$", address: "0x3600000000000000000000000000000000000000", decimals: 6 },
  { symbol: "EURC", name: "Euro Coin", icon: "€", address: "0x...", decimals: 6 },
];

const ARC_TESTNET_PARAMS = {
  chainId: '0x4ceec2', // 5042002 in hex
  chainName: 'Arc Testnet',
  nativeCurrency: {
    name: 'USDC',
    symbol: 'USDC',
    decimals: 6,
  },
  rpcUrls: ['https://rpc.testnet.arc.network'],
  blockExplorerUrls: ['https://testnet.arcscan.app'],
};

// Mock Data for Chart
const CHART_DATA = Array.from({ length: 24 }, (_, i) => ({
  time: `${i}:00`,
  price: 1.05 + Math.random() * 0.02 - 0.01,
}));

// Mock Data for Recent Trades
const RECENT_TRADES = [
  { 
    hash: "0x44cb...7e7f", 
    type: "Buy", 
    amountIn: "5.0000", 
    tokenIn: "USDC", 
    amountOut: "4.7619", 
    tokenOut: "EURC", 
    value: "5.0000", 
    time: "13m ago" 
  },
  { 
    hash: "0x8a21...9b3c", 
    type: "Sell", 
    amountIn: "10.0000", 
    tokenIn: "EURC", 
    amountOut: "10.4820", 
    tokenOut: "USDC", 
    value: "10.5000", 
    time: "15m ago" 
  },
  { 
    hash: "0x1d4f...2e8a", 
    type: "Buy", 
    amountIn: "100.0000", 
    tokenIn: "USDC", 
    amountOut: "95.2380", 
    tokenOut: "EURC", 
    value: "100.0000", 
    time: "22m ago" 
  },
  { 
    hash: "0x9c3e...5f1d", 
    type: "Sell", 
    amountIn: "50.0000", 
    tokenIn: "EURC", 
    amountOut: "52.4100", 
    tokenOut: "USDC", 
    value: "52.5000", 
    time: "28m ago" 
  },
  { 
    hash: "0x3b7a...8c4e", 
    type: "Buy", 
    amountIn: "25.0000", 
    tokenIn: "USDC", 
    amountOut: "23.8095", 
    tokenOut: "EURC", 
    value: "25.0000", 
    time: "35m ago" 
  },
];

export default function SwapInterface() {
  const [inputAmount, setInputAmount] = useState("");
  const [outputAmount, setOutputAmount] = useState("");
  const [fromToken, setFromToken] = useState(TOKENS[0]); // USDC
  const [toToken, setToToken] = useState(TOKENS[1]); // EURC
  const [isSwapping, setIsSwapping] = useState(false);
  const [walletConnected, setWalletConnected] = useState(false);
  const [slippage, setSlippage] = useState("0.5");
  const [balances, setBalances] = useState({ USDC: "0.00", EURC: "0.00" });

  // Mock exchange rate calculation (1 EURC ≈ 1.05 USDC)
  useEffect(() => {
    if (!inputAmount) {
      setOutputAmount("");
      return;
    }
    const num = parseFloat(inputAmount);
    if (isNaN(num)) return;

    // Rate: 1 USDC = 0.9523 EURC, 1 EURC = 1.05 USDC
    const rate = fromToken.symbol === "USDC" && toToken.symbol === "EURC" ? 0.9523 : 
                 fromToken.symbol === "EURC" && toToken.symbol === "USDC" ? 1.05 : 1;
    
    setOutputAmount((num * rate).toFixed(4));
  }, [inputAmount, fromToken, toToken]);

  const connectWallet = async () => {
    const ethereum = (window as any).ethereum;
    if (typeof ethereum !== 'undefined') {
      try {
        await ethereum.request({ method: 'eth_requestAccounts' });
        
        try {
          await ethereum.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: ARC_TESTNET_PARAMS.chainId }],
          });
        } catch (switchError: any) {
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
        setBalances({ USDC: "1000.00", EURC: "0.00" }); // Mock initial balance
      } catch (error) {
        console.error(error);
      }
    } else {
      setWalletConnected(true);
      setBalances({ USDC: "1000.00", EURC: "0.00" });
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
      // Swap tokens
      const temp = fromToken;
      setFromToken(toToken);
      setToToken(temp);
      
      // Mock balance update
      if (fromToken.symbol === "USDC") {
        setBalances({ USDC: (parseFloat(balances.USDC) - parseFloat(inputAmount)).toFixed(2), EURC: (parseFloat(balances.EURC) + parseFloat(outputAmount)).toFixed(2) });
      } else {
        setBalances({ EURC: (parseFloat(balances.EURC) - parseFloat(inputAmount)).toFixed(2), USDC: (parseFloat(balances.USDC) + parseFloat(outputAmount)).toFixed(2) });
      }
    }, 1500);
  };

  const TokenSelector = ({ selected, onSelect }: { selected: typeof TOKENS[0], onSelect: (t: typeof TOKENS[0]) => void }) => (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" className="flex items-center gap-2 rounded-full bg-secondary border-transparent hover:bg-secondary/80 text-foreground font-semibold px-3 py-1 h-auto min-w-[100px] justify-between transition-all hover:scale-105">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-sm font-bold">{selected.icon}</div>
            <span>{selected.symbol}</span>
          </div>
          <ChevronDown className="w-4 h-4 opacity-50" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md border-border bg-card/95 backdrop-blur-xl p-0 gap-0 overflow-hidden">
        <DialogHeader className="p-4 pb-2">
          <DialogTitle>Select a token</DialogTitle>
          <DialogDescription className="hidden">Select a token to swap</DialogDescription>
        </DialogHeader>
        <div className="grid gap-1 p-2">
          {TOKENS.map((token) => (
            <DialogClose asChild key={token.symbol}>
              <Button
                variant="ghost"
                className="w-full justify-start gap-3 h-16 hover:bg-secondary/50 rounded-xl px-4"
                onClick={() => onSelect(token)}
              >
                <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center text-lg font-bold text-primary">
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
        </div>
      </DialogContent>
    </Dialog>
  );

  const SettingsModal = () => (
    <Dialog>
      <DialogTrigger asChild>
         <Button variant="ghost" size="icon" className="w-8 h-8 rounded-full hover:bg-secondary text-muted-foreground hover:text-foreground transition-all duration-300">
           <Settings className="w-4 h-4" />
         </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-sm border-border bg-card/95 backdrop-blur-xl">
        <DialogHeader>
          <DialogTitle>Transaction Settings</DialogTitle>
          <DialogDescription className="hidden">Adjust transaction settings</DialogDescription>
        </DialogHeader>
        <div className="py-4 space-y-4">
           <div className="space-y-2">
             <div className="flex justify-between text-sm">
               <span className="text-muted-foreground">Slippage tolerance</span>
               <span className="text-primary font-medium">{slippage}%</span>
             </div>
             <div className="flex gap-2">
               {["0.1", "0.5", "1.0"].map((val) => (
                 <Button 
                  key={val}
                  variant={slippage === val ? "secondary" : "outline"} 
                  size="sm" 
                  className={`rounded-full flex-1 ${slippage === val ? "bg-primary/20 text-primary hover:bg-primary/30" : "border-secondary bg-transparent hover:bg-secondary"}`}
                  onClick={() => setSlippage(val)}
                 >
                   {val}%
                 </Button>
               ))}
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
      <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] bg-primary/15 blur-[150px] rounded-full pointer-events-none" />
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
      <main className="flex-1 w-full max-w-7xl mx-auto p-4 z-10 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Column: Chart & History */}
        <div className="lg:col-span-7 space-y-6 order-2 lg:order-1">
          {/* Chart Card */}
          <Card className="w-full border-white/5 bg-card/40 backdrop-blur-xl p-6 rounded-3xl ring-1 ring-white/10 overflow-hidden relative group">
             <div className="flex justify-between items-center mb-6">
               <div className="flex items-center gap-3">
                 <div className="flex -space-x-2">
                   <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center border-2 border-card z-10 font-bold text-xs">$</div>
                   <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center border-2 border-card font-bold text-xs">€</div>
                 </div>
                 <div>
                   <h3 className="font-bold text-lg flex items-center gap-2">USDC / EURC <span className="text-xs font-normal px-2 py-0.5 rounded-full bg-primary/10 text-primary">0.3%</span></h3>
                   <div className="flex items-center gap-2 text-sm">
                     <span className="font-mono text-xl font-bold">1.0502</span>
                     <span className="text-green-400 flex items-center text-xs font-medium"><TrendingUp className="w-3 h-3 mr-1" /> +0.24%</span>
                   </div>
                 </div>
               </div>
               <div className="flex gap-2">
                 {['1H', '1D', '1W', '1M'].map((period) => (
                   <button key={period} className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${period === '1D' ? 'bg-primary/20 text-primary' : 'text-muted-foreground hover:bg-white/5'}`}>
                     {period}
                   </button>
                 ))}
               </div>
             </div>
             
             <div className="h-[300px] w-full">
               <ResponsiveContainer width="100%" height="100%">
                 <AreaChart data={CHART_DATA}>
                   <defs>
                     <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                       <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                       <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                     </linearGradient>
                   </defs>
                   <Tooltip 
                     contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '12px' }}
                     itemStyle={{ color: 'hsl(var(--foreground))' }}
                     cursor={{ stroke: 'hsl(var(--muted-foreground))', strokeWidth: 1, strokeDasharray: '4 4' }}
                   />
                   <Area 
                     type="monotone" 
                     dataKey="price" 
                     stroke="hsl(var(--primary))" 
                     strokeWidth={2}
                     fillOpacity={1} 
                     fill="url(#colorPrice)" 
                   />
                   <YAxis domain={['dataMin - 0.01', 'dataMax + 0.01']} hide />
                   <XAxis dataKey="time" hide />
                 </AreaChart>
               </ResponsiveContainer>
             </div>
          </Card>

          {/* Trade History */}
          <Card className="w-full border-white/5 bg-card/40 backdrop-blur-xl rounded-3xl ring-1 ring-white/10 overflow-hidden">
            <div className="p-4 border-b border-white/5 flex items-center justify-between">
              <h3 className="font-bold text-sm flex items-center gap-2"><Activity className="w-4 h-4 text-primary" /> Recent Trades</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-muted-foreground bg-white/5 uppercase">
                  <tr>
                    <th className="px-4 py-3 font-medium">Trader</th>
                    <th className="px-4 py-3 font-medium">Type</th>
                    <th className="px-4 py-3 font-medium">Amount In</th>
                    <th className="px-4 py-3 font-medium">Amount Out</th>
                    <th className="px-4 py-3 font-medium text-right">Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {RECENT_TRADES.map((trade, i) => (
                    <tr key={i} className="hover:bg-white/5 transition-colors">
                      <td className="px-4 py-3 font-mono text-primary flex items-center gap-1">
                        {trade.hash} <ExternalLink className="w-3 h-3 opacity-50" />
                      </td>
                      <td className={`px-4 py-3 font-medium ${trade.type === 'Buy' ? 'text-green-400' : 'text-red-400'}`}>
                        {trade.type}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <span className="font-medium">{trade.amountIn}</span>
                          <span className="text-xs text-muted-foreground">{trade.tokenIn}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <span className="font-medium">{trade.amountOut}</span>
                          <span className="text-xs text-muted-foreground">{trade.tokenOut}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right text-muted-foreground">{trade.time}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>

        {/* Right Column: Swap Interface */}
        <div className="lg:col-span-5 order-1 lg:order-2 flex justify-center lg:justify-end">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="w-full max-w-[440px]"
          >
            <Card className="w-full border-white/5 bg-card/60 backdrop-blur-xl shadow-2xl p-2 rounded-3xl ring-1 ring-white/10">
              <div className="p-4 flex justify-between items-center mb-2">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-foreground text-lg">Swap</span>
                </div>
                <SettingsModal />
              </div>

              {/* FROM Input */}
              <div className="bg-black/20 rounded-2xl p-4 mb-1 transition-colors hover:bg-black/30 group border border-transparent hover:border-white/5">
                <div className="flex justify-between mb-2">
                  <span className="text-xs font-medium text-muted-foreground">You pay</span>
                  <span className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                    Balance: <span className="text-primary">{walletConnected ? balances[fromToken.symbol as keyof typeof balances] : "0.00"}</span>
                  </span>
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
                   <span className="text-sm text-muted-foreground font-medium">{inputAmount ? `$${(parseFloat(inputAmount) * (fromToken.symbol === 'USDC' ? 1 : 1.05)).toFixed(2)}` : '$0.00'}</span>
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
                  <span className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                    Balance: <span className="text-primary">{walletConnected ? balances[toToken.symbol as keyof typeof balances] : "0.00"}</span>
                  </span>
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
                   <span className="text-sm text-muted-foreground font-medium">{outputAmount ? `$${(parseFloat(outputAmount) * (toToken.symbol === 'USDC' ? 1 : 1.05)).toFixed(2)}` : '$0.00'}</span>
                </div>
              </div>

              {/* Info Accordion */}
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
                      <span>1 {fromToken.symbol} = {(parseFloat(outputAmount)/parseFloat(inputAmount) || 0).toFixed(4)} {toToken.symbol}</span>
                      <span className="text-muted-foreground ml-1">($0.00)</span>
                    </div>
                    <div className="flex items-center gap-1 cursor-pointer hover:opacity-80 bg-primary/10 px-2 py-0.5 rounded-md">
                       <span className="text-primary flex items-center gap-1"><Settings className="w-3 h-3" /> {slippage}%</span>
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
        </div>
      </main>
    </div>
  );
}
