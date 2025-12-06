import { useState, useEffect } from "react";
import { ArrowDown, Settings, ChevronDown, Wallet, Info, RefreshCw, ExternalLink, TrendingUp, Activity, AlertCircle } from "lucide-react";
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
import { useToast } from "@/hooks/use-toast";
import { createWalletClient, custom, parseUnits, encodeFunctionData, formatUnits } from 'viem';
import { arc } from 'viem/chains'; // We might need to define custom chain if arc isn't in viem/chains yet

// Define Arc Testnet Custom Chain for Viem
const arcTestnet = {
  id: 5042002,
  name: 'Arc Testnet',
  network: 'arc-testnet',
  nativeCurrency: {
    decimals: 18,
    name: 'USDC',
    symbol: 'USDC',
  },
  rpcUrls: {
    public: { http: ['https://rpc.testnet.arc.network'] },
    default: { http: ['https://rpc.testnet.arc.network'] },
  },
  blockExplorers: {
    default: { name: 'ArcScan', url: 'https://testnet.arcscan.app' },
  },
} as const;

const ROUTER_ADDRESS = "0x284C5Afc100ad14a458255075324fA0A9dfd66b1";

// Token Definitions
const TOKENS = [
  { 
    symbol: "USDC", 
    name: "USD Coin", 
    icon: "$", 
    address: "0x3600000000000000000000000000000000000000", 
    decimals: 18,
    isNative: true
  },
  { 
    symbol: "EURC", 
    name: "Euro Coin", 
    icon: "€", 
    address: "0x89B50855Aa3bE2F677cD6303Cec089B5F319D72a", 
    decimals: 6,
    isNative: false
  },
];

// ABIs
const ERC20_ABI = [
  {
    name: 'approve',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'spender', type: 'address' }, { name: 'amount', type: 'uint256' }],
    outputs: [{ type: 'bool' }]
  },
  {
    name: 'allowance',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'owner', type: 'address' }, { name: 'spender', type: 'address' }],
    outputs: [{ type: 'uint256' }]
  },
  {
    name: 'balanceOf',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ type: 'uint256' }]
  }
];

const ROUTER_ABI = [
  {
    name: 'swapExactETHForTokens',
    type: 'function',
    stateMutability: 'payable',
    inputs: [
      { name: 'amountOutMin', type: 'uint256' },
      { name: 'path', type: 'address[]' },
      { name: 'to', type: 'address' },
      { name: 'deadline', type: 'uint256' }
    ],
    outputs: [{ type: 'uint256[]' }]
  },
  {
    name: 'swapExactTokensForETH',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'amountIn', type: 'uint256' },
      { name: 'amountOutMin', type: 'uint256' },
      { name: 'path', type: 'address[]' },
      { name: 'to', type: 'address' },
      { name: 'deadline', type: 'uint256' }
    ],
    outputs: [{ type: 'uint256[]' }]
  },
  {
    name: 'swapExactTokensForTokens',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'amountIn', type: 'uint256' },
      { name: 'amountOutMin', type: 'uint256' },
      { name: 'path', type: 'address[]' },
      { name: 'to', type: 'address' },
      { name: 'deadline', type: 'uint256' }
    ],
    outputs: [{ type: 'uint256[]' }]
  }
];

// Chart Data
const CHART_DATA = Array.from({ length: 24 }, (_, i) => ({
  time: `${i}:00`,
  price: 1.05 + Math.random() * 0.02 - 0.01,
}));

export default function SwapInterface() {
  const { toast } = useToast();
  const [inputAmount, setInputAmount] = useState("");
  const [outputAmount, setOutputAmount] = useState("");
  const [fromToken, setFromToken] = useState(TOKENS[0]); // USDC
  const [toToken, setToToken] = useState(TOKENS[1]); // EURC
  const [isSwapping, setIsSwapping] = useState(false);
  const [isApproving, setIsApproving] = useState(false);
  const [walletConnected, setWalletConnected] = useState(false);
  const [account, setAccount] = useState("");
  const [slippage, setSlippage] = useState("0.5");
  const [balances, setBalances] = useState({ USDC: "0.00", EURC: "0.00" });
  const [needsApproval, setNeedsApproval] = useState(false);

  // Initialize Viem Client
  const getWalletClient = () => {
    if (typeof window !== 'undefined' && (window as any).ethereum) {
      return createWalletClient({
        chain: arcTestnet,
        transport: custom((window as any).ethereum)
      });
    }
    return null;
  };

  // Fetch Balances
  const fetchBalances = async (userAddress: string) => {
    const client = getWalletClient();
    if (!client) return;

    try {
      // Native Balance (USDC)
      const nativeBal = await client.request({
        method: 'eth_getBalance',
        params: [userAddress as `0x${string}`, 'latest']
      });
      const usdcFormatted = formatUnits(BigInt(nativeBal), 18);

      // Token Balance (EURC)
      const encodedBalanceOf = encodeFunctionData({
        abi: ERC20_ABI,
        functionName: 'balanceOf',
        args: [userAddress]
      });

      let eurcFormatted = "0.00";
      try {
        const tokenBal = await client.request({
          method: 'eth_call',
          params: [{
            to: TOKENS[1].address as `0x${string}`,
            data: encodedBalanceOf
          }, 'latest']
        });
        eurcFormatted = formatUnits(BigInt(tokenBal), 6);
      } catch (e) {
        console.warn("Failed to fetch ERC20 balance", e);
      }

      setBalances({
        USDC: parseFloat(usdcFormatted).toFixed(4),
        EURC: parseFloat(eurcFormatted).toFixed(4)
      });

    } catch (error) {
      console.error("Error fetching balances", error);
    }
  };

  const checkAllowance = async () => {
    if (!account || fromToken.isNative) {
      setNeedsApproval(false);
      return;
    }

    const client = getWalletClient();
    if (!client) return;

    try {
        const encodedAllowance = encodeFunctionData({
            abi: ERC20_ABI,
            functionName: 'allowance',
            args: [account, ROUTER_ADDRESS]
        });

        const allowanceResult = await client.request({
            method: 'eth_call',
            params: [{
                to: fromToken.address as `0x${string}`,
                data: encodedAllowance
            }, 'latest']
        });
        
        const currentAllowance = BigInt(allowanceResult);
        const amountToSpend = parseUnits(inputAmount || "0", fromToken.decimals);
        
        setNeedsApproval(currentAllowance < amountToSpend);

    } catch (e) {
        console.error("Check allowance failed", e);
    }
  };

  useEffect(() => {
     if (walletConnected && account && inputAmount) {
         checkAllowance();
     }
  }, [walletConnected, account, inputAmount, fromToken]);


  const connectWallet = async () => {
    const client = getWalletClient();
    if (!client) {
        toast({ title: "Wallet not found", description: "Please install MetaMask or Rabby", variant: "destructive" });
        return;
    }

    try {
        const [address] = await client.request({ method: 'eth_requestAccounts' });
        
        try {
            await client.switchChain({ id: arcTestnet.id });
        } catch (e) {
            await client.addChain({ chain: arcTestnet });
        }

        setAccount(address);
        setWalletConnected(true);
        fetchBalances(address);
        
        toast({ title: "Connected", description: `Wallet connected: ${address.slice(0,6)}...` });
        
        // Listeners would go here (simplified for brevity)

    } catch (error: any) {
        console.error(error);
        toast({ title: "Connection Failed", description: error.message, variant: "destructive" });
    }
  };

  // Exchange Rate Logic
  useEffect(() => {
    if (!inputAmount) {
      setOutputAmount("");
      return;
    }
    const num = parseFloat(inputAmount);
    if (isNaN(num)) return;
    const rate = fromToken.symbol === "USDC" && toToken.symbol === "EURC" ? 0.9523 : 
                 fromToken.symbol === "EURC" && toToken.symbol === "USDC" ? 1.05 : 1;
    setOutputAmount((num * rate).toFixed(4));
  }, [inputAmount, fromToken, toToken]);


  const handleApprove = async () => {
      const client = getWalletClient();
      if (!client || !account) return;
      
      setIsApproving(true);
      try {
          const amountToApprove = parseUnits(inputAmount, fromToken.decimals);
          const data = encodeFunctionData({
              abi: ERC20_ABI,
              functionName: 'approve',
              args: [ROUTER_ADDRESS, amountToApprove]
          });
          
          const hash = await client.sendTransaction({
              account: account as `0x${string}`,
              to: fromToken.address as `0x${string}`,
              data: data
          });
          
          toast({ title: "Approval Submitted", description: "Waiting for confirmation..." });
          
          // In a real app we would wait for receipt. For mockup, we assume success after delay
          setTimeout(() => {
              setIsApproving(false);
              setNeedsApproval(false);
              toast({ title: "Approved", description: "You can now swap." });
          }, 3000);
          
      } catch (e: any) {
          console.error(e);
          setIsApproving(false);
          toast({ title: "Approval Failed", description: e.message, variant: "destructive" });
      }
  };

  const handleSwap = async () => {
      const client = getWalletClient();
      if (!client || !account) return;

      setIsSwapping(true);
      try {
          const amountIn = parseUnits(inputAmount, fromToken.decimals);
          const amountOutMinVal = parseFloat(outputAmount) * (1 - parseFloat(slippage)/100);
          const amountOutMin = parseUnits(amountOutMinVal.toFixed(toToken.decimals), toToken.decimals);
          const deadline = Math.floor(Date.now() / 1000) + 60 * 20; // 20 mins
          const path = [fromToken.address, toToken.address];

          let data;
          let value = 0n;

          if (fromToken.isNative) {
              // swapExactETHForTokens
              data = encodeFunctionData({
                  abi: ROUTER_ABI,
                  functionName: 'swapExactETHForTokens',
                  args: [amountOutMin, path, account, deadline]
              });
              value = amountIn;
          } else {
              // swapExactTokensForETH (if to is native) or TokensForTokens
              // Since on Arc USDC is native, EURC -> USDC is TokensForETH
              if (toToken.isNative) {
                   data = encodeFunctionData({
                      abi: ROUTER_ABI,
                      functionName: 'swapExactTokensForETH',
                      args: [amountIn, amountOutMin, path, account, deadline]
                  });
              } else {
                  data = encodeFunctionData({
                      abi: ROUTER_ABI,
                      functionName: 'swapExactTokensForTokens',
                      args: [amountIn, amountOutMin, path, account, deadline]
                  });
              }
          }

          const hash = await client.sendTransaction({
              account: account as `0x${string}`,
              to: ROUTER_ADDRESS,
              data: data,
              value: value
          });

          toast({ title: "Swap Submitted", description: "Transaction sent to network." });
          
          setTimeout(() => {
              setIsSwapping(false);
              setInputAmount("");
              setOutputAmount("");
              fetchBalances(account);
              toast({ title: "Swap Successful", description: "Balances updated." });
          }, 5000);

      } catch (e: any) {
          console.error(e);
          setIsSwapping(false);
          toast({ title: "Swap Failed", description: e.message, variant: "destructive" });
      }
  };


  const TokenSelector = ({ selected, onSelect }: { selected: typeof TOKENS[0], onSelect: (t: typeof TOKENS[0]) => void }) => (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" className="flex items-center gap-2 bg-background border border-border hover:bg-secondary/50 text-foreground rounded-full px-3 py-1 h-10 min-w-[110px] justify-between shadow-sm">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold">{selected.icon}</div>
            <span className="font-semibold">{selected.symbol}</span>
          </div>
          <ChevronDown className="w-4 h-4 opacity-50" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md bg-card border-border">
        <DialogHeader>
          <DialogTitle>Select a token</DialogTitle>
        </DialogHeader>
        <div className="grid gap-1 py-2">
          {TOKENS.map((token) => (
            <DialogClose asChild key={token.symbol}>
              <Button
                variant="ghost"
                className="w-full justify-start gap-3 h-14 hover:bg-secondary/50 px-4"
                onClick={() => onSelect(token)}
              >
                <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center text-lg">
                  {token.icon}
                </div>
                <div className="flex flex-col items-start">
                  <span className="font-bold">{token.symbol}</span>
                  <span className="text-xs text-muted-foreground">{token.name}</span>
                </div>
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
         <Button variant="ghost" size="icon" className="w-8 h-8 text-muted-foreground hover:text-foreground rounded-full">
           <Settings className="w-5 h-5" />
         </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-sm bg-card border-border">
        <DialogHeader>
          <DialogTitle>Settings</DialogTitle>
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
                  className={`flex-1 ${slippage === val ? "bg-primary/10 text-primary border-primary/20" : ""}`}
                  onClick={() => setSlippage(val)}
                 >
                   {val}%
                 </Button>
               ))}
             </div>
           </div>
        </div>
      </DialogContent>
    </Dialog>
  );

  return (
    <div className="min-h-screen w-full bg-background text-foreground flex flex-col font-sans overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))] from-blue-900/20 via-background to-background -z-10" />

      {/* Navbar */}
      <nav className="w-full max-w-7xl mx-auto p-4 flex justify-between items-center z-10">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 bg-primary rounded-xl flex items-center justify-center shadow-lg shadow-primary/20">
            <span className="text-primary-foreground font-bold italic text-lg">eM</span>
          </div>
          <span className="text-xl font-bold tracking-tight">eMadness</span>
        </div>
        
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" asChild className="hidden sm:flex gap-2 text-muted-foreground">
            <a href="https://faucet.circle.com" target="_blank" rel="noopener noreferrer">
              USDC Faucet <ExternalLink className="w-3 h-3" />
            </a>
          </Button>
          
          {walletConnected && account ? (
            <div className="flex items-center gap-2 bg-secondary/40 rounded-full p-1 pl-3 border border-border/50">
               <div className="flex items-center gap-2 text-sm font-medium border-r border-border/50 pr-3">
                 <span className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]" />
                 Arc Testnet
               </div>
               <div className="flex items-center gap-2 pr-2">
                 <span className="text-sm font-semibold">{balances.USDC} USDC</span>
                 <div className="w-6 h-6 rounded-full bg-gradient-to-br from-orange-400 to-red-500" />
               </div>
            </div>
          ) : (
            <Button onClick={connectWallet} className="rounded-full font-semibold bg-primary text-primary-foreground hover:opacity-90">
              Connect Wallet
            </Button>
          )}
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-1 w-full max-w-6xl mx-auto p-4 lg:p-8 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Swap Card (Left) */}
        <div className="lg:col-span-5 order-1">
            <Card className="w-full bg-card/50 backdrop-blur-md border-border/50 shadow-xl rounded-[24px] overflow-hidden">
              <div className="p-5 flex justify-between items-center border-b border-border/50 bg-card/30">
                <div className="flex items-center gap-2">
                  <h2 className="font-bold text-lg">Swap</h2>
                  <span className="px-2 py-0.5 rounded-full bg-orange-500/10 text-orange-500 text-[10px] font-bold uppercase tracking-wide border border-orange-500/20">
                    Arc Testnet Only
                  </span>
                </div>
                <SettingsModal />
              </div>

              <div className="p-4 space-y-1">
                {/* FROM Input */}
                <div className="bg-secondary/30 rounded-[20px] p-4 hover:bg-secondary/40 transition-colors border border-transparent hover:border-border/50 group">
                  <div className="flex justify-between mb-3">
                    <span className="text-xs font-medium text-muted-foreground group-hover:text-foreground transition-colors">From</span>
                    <span className="text-xs font-medium text-muted-foreground">
                      Balance: <span className="text-foreground">{walletConnected ? balances[fromToken.symbol as keyof typeof balances] : "0.00"}</span>
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <input
                      type="text"
                      placeholder="0.0"
                      className="bg-transparent text-3xl font-medium text-foreground placeholder:text-muted-foreground/20 outline-none w-full font-sans"
                      value={inputAmount}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (/^\d*\.?\d*$/.test(val)) setInputAmount(val);
                      }}
                    />
                    <TokenSelector selected={fromToken} onSelect={setFromToken} />
                  </div>
                </div>

                {/* Separator */}
                <div className="relative h-2 z-10 flex justify-center items-center">
                    <div 
                        className="bg-background p-1.5 rounded-full shadow-md border border-border/50 cursor-pointer hover:rotate-180 transition-all duration-500 hover:scale-110"
                        onClick={() => {
                           const t = fromToken; setFromToken(toToken); setToToken(t);
                           const a = inputAmount; setInputAmount(outputAmount); setOutputAmount(a);
                        }}
                    >
                        <ArrowDown className="w-4 h-4 text-primary" />
                    </div>
                </div>

                {/* TO Input */}
                <div className="bg-secondary/30 rounded-[20px] p-4 hover:bg-secondary/40 transition-colors border border-transparent hover:border-border/50 group">
                  <div className="flex justify-between mb-3">
                    <span className="text-xs font-medium text-muted-foreground group-hover:text-foreground transition-colors">To</span>
                    <span className="text-xs font-medium text-muted-foreground">
                      Balance: <span className="text-foreground">{walletConnected ? balances[toToken.symbol as keyof typeof balances] : "0.00"}</span>
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <input
                      type="text"
                      placeholder="0.0"
                      readOnly
                      className="bg-transparent text-3xl font-medium text-foreground placeholder:text-muted-foreground/20 outline-none w-full font-sans cursor-default"
                      value={outputAmount}
                    />
                    <TokenSelector selected={toToken} onSelect={setToToken} />
                  </div>
                </div>
              </div>

              <div className="p-4 pt-0">
                {needsApproval ? (
                     <Button 
                        className="w-full h-14 text-lg font-bold rounded-xl bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20"
                        onClick={handleApprove}
                        disabled={!walletConnected || !inputAmount || isApproving}
                      >
                        {isApproving ? (
                          <div className="flex items-center gap-2"><RefreshCw className="animate-spin w-5 h-5"/> Approving...</div>
                        ) : `Approve ${fromToken.symbol}`}
                      </Button>
                ) : (
                    <Button 
                      className={`w-full h-14 text-lg font-bold rounded-xl shadow-lg ${!walletConnected ? 'bg-secondary text-muted-foreground' : 'bg-primary hover:bg-primary/90 shadow-primary/20'}`}
                      onClick={handleSwap}
                      disabled={walletConnected && (!inputAmount || isSwapping)}
                    >
                      {isSwapping ? (
                        <div className="flex items-center gap-2"><RefreshCw className="animate-spin w-5 h-5"/> Swapping...</div>
                      ) : !walletConnected ? "Connect Wallet" : !inputAmount ? "Enter Amount" : "Swap"}
                    </Button>
                )}
                
                <div className="mt-4 flex items-center justify-center gap-2 text-xs text-muted-foreground">
                    <Info className="w-3 h-3" />
                    <span>No price impact (Testnet)</span>
                </div>
              </div>
            </Card>
        </div>

        {/* Chart Card (Right) */}
        <div className="lg:col-span-7 order-2">
            <Card className="w-full h-full min-h-[500px] bg-card/50 backdrop-blur-md border-border/50 shadow-xl rounded-[24px] p-6 flex flex-col">
                <div className="flex justify-between items-start mb-8">
                    <div>
                        <div className="flex items-center gap-3 mb-1">
                             <div className="flex -space-x-2">
                                <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center z-10 border-2 border-card font-bold text-xs">$</div>
                                <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center border-2 border-card font-bold text-xs text-white">€</div>
                             </div>
                             <h3 className="font-bold text-xl">EURC / USDC</h3>
                        </div>
                        <div className="flex items-baseline gap-3">
                             <span className="text-3xl font-bold tracking-tight">$1.0502</span>
                             <span className="text-red-500 font-medium text-sm flex items-center gap-1">
                                 -0.42% <ArrowDown className="w-3 h-3" />
                             </span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">24h Vol: $12,402</p>
                    </div>
                    <div className="flex bg-secondary/50 p-1 rounded-lg">
                        {['1H', '1D', '1W', '1M'].map(t => (
                            <button key={t} className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${t === '1H' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}>
                                {t}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="flex-1 w-full min-h-[300px] relative">
                     {/* Chart Placeholder Gradient/Line */}
                     <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={CHART_DATA}>
                            <defs>
                                <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.2}/>
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
                            <YAxis domain={['dataMin - 0.005', 'dataMax + 0.005']} hide />
                            <XAxis dataKey="time" hide />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
                
                <div className="mt-4 flex justify-between items-end text-xs text-muted-foreground border-t border-border/30 pt-4">
                    <div className="flex items-center gap-2">
                        <Activity className="w-4 h-4" />
                        <span>Updates in real-time</span>
                    </div>
                    <div className="font-mono opacity-50">
                        19:30 &nbsp;&nbsp; 20:00 &nbsp;&nbsp; 20:30
                    </div>
                </div>
            </Card>
        </div>

      </main>
    </div>
  );
}
