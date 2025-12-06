import { useState, useEffect } from "react";
import { ArrowDown, ArrowRight, Settings, ChevronDown, Wallet, Info, RefreshCw, ExternalLink, TrendingUp, Activity, AlertCircle, Ghost, Lock } from "lucide-react";
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
import { createWalletClient, custom, parseUnits, encodeFunctionData, formatUnits, encodeAbiParameters } from 'viem';
import logoImage from '@assets/d0bbfa09-77e9-4527-a95a-3ec275fefad8_1765059425973.png';
import arcSymbol from '@assets/download_1765062780027.png';
// import { arc } from 'viem/chains'; // Removed as we define custom chain

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
const POOL_ADDRESS = "0x18eAE2e870Ec4Bc31a41B12773c4F5c40Bf19aCD";

const USDC_ADDRESS = "0x3600000000000000000000000000000000000000";

// Token Definitions
const TOKENS = [
  { 
    symbol: "USDC", 
    name: "USD Coin", 
    icon: "$", 
    address: USDC_ADDRESS, 
    decimals: 6,
    isNative: false
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
    name: 'WETH',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'address' }]
  },
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

// Chart Data matching the user's image (High ~8.45, Drop to ~7.60)
const CHART_DATA = [
  ...Array.from({ length: 16 }, (_, i) => ({
    time: `${i}:00`,
    price: 8.45 + Math.random() * 0.02 - 0.01,
  })),
  { time: '16:00', price: 8.42 },
  { time: '17:00', price: 7.80 },
  ...Array.from({ length: 7 }, (_, i) => ({
    time: `${17 + i + 1}:00`,
    price: 7.6055 + Math.random() * 0.005 - 0.0025,
  }))
];

// Initial trades with realistic data
const INITIAL_TRADES = [
  {
    trader: "0x8795...241d",
    fullTrader: "0x8795F7a1b3C4e5d6F7a1b3C4e5d6F7a1b3C4241d",
    type: "Buy",
    tokenAmount: "7.5225",
    tokenSymbol: "EURC",
    usdcAmount: "9.3200",
    time: "1m ago",
    // Using a real transaction hash provided by user for demonstration
    hash: "0x0929...3e31",
    fullHash: "0x092971a645209be2b43dcfff24733e477cddcbc0029354236a2d91054bd93e31"
  },
  {
    trader: "0xeca1...0347",
    fullTrader: "0xeca1F7a1b3C4e5d6F7a1b3C4e5d6F7a1b3C40347",
    type: "Sell",
    tokenAmount: "15.0000",
    tokenSymbol: "EURC",
    usdcAmount: "18.4731",
    time: "5m ago",
    hash: "0x7e8f...1a2b",
    fullHash: "0x7e8f9a0b1c2d3e4f567890123456789abcdef0123456789abcdef012341a2b"
  },
  {
    trader: "0xb141...afa2",
    fullTrader: "0xb141F7a1b3C4e5d6F7a1b3C4e5d6F7a1b3C4afa2",
    type: "Sell",
    tokenAmount: "10.0000",
    tokenSymbol: "EURC",
    usdcAmount: "12.3160",
    time: "12m ago",
    hash: "0x5c6d...3e4f",
    fullHash: "0x5c6d7e8f9a0b1c2d3e4f567890123456789abcdef0123456789abcdef03e4f"
  },
  {
    trader: "0xb063...b7c1",
    fullTrader: "0xb063F7a1b3C4e5d6F7a1b3C4e5d6F7a1b3C4b7c1",
    type: "Buy",
    tokenAmount: "4.0354",
    tokenSymbol: "EURC",
    usdcAmount: "5.0000",
    time: "25m ago",
    hash: "0x9a0b...5c6d",
    fullHash: "0x9a0b1c2d3e4f567890123456789abcdef0123456789abcdef0123456785c6d"
  }
];

// Chart generation helpers
const generateChartData = (basePrice: number, volatility: number) => {
  return [
    ...Array.from({ length: 16 }, (_, i) => ({
      time: `${i}:00`,
      price: basePrice + (Math.random() * volatility * 2 - volatility),
    })),
    { time: '16:00', price: basePrice * 0.99 },
    { time: '17:00', price: basePrice * 0.95 },
    ...Array.from({ length: 7 }, (_, i) => ({
      time: `${17 + i + 1}:00`,
      price: (basePrice * 0.92) + (Math.random() * volatility - volatility/2),
    }))
  ];
};

// Helper for random hex string
const randomHex = (length: number) => {
  let result = '';
  const characters = '0123456789abcdef';
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * 16));
  }
  return result;
};

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
  const [trades, setTrades] = useState(INITIAL_TRADES);
  const [myTrades, setMyTrades] = useState<any[]>([]); // Store all user trades
  const [chartTimeframe, setChartTimeframe] = useState("1D");
  const [showMyTrades, setShowMyTrades] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  // Load My Trades from LocalStorage and generate mock history on account change
  useEffect(() => {
    if (!account) {
      setMyTrades([]);
      return;
    }

    // 1. Load locally saved trades (real trades made in this app)
    const savedTradesKey = `arc_trades_${account.toLowerCase()}`;
    const savedTrades = JSON.parse(localStorage.getItem(savedTradesKey) || '[]');

    // 2. Generate deterministic mock history for this wallet (to simulate past on-chain activity)
    // Use address characters to seed the random generation so it's consistent for the same wallet
    const mockHistory = [];
    let seed = account.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    
    const seededRandom = () => {
        const x = Math.sin(seed++) * 10000;
        return x - Math.floor(x);
    };

    // Generate between 5 and 15 historical trades
    const numHistoricalTrades = Math.floor(seededRandom() * 10) + 5;
    
    for (let i = 0; i < numHistoricalTrades; i++) {
        const isBuy = seededRandom() > 0.5;
        const amount = (seededRandom() * 500 + 10).toFixed(4); // EURC Amount
        // Consistent rate: 1 EURC = ~7.56 USDC (High volatility testnet rate)
        // Regardless of direction, USDC amount is EURC * Rate
        const usdcAmt = (parseFloat(amount) * 7.56).toFixed(4);
        
        // Generate a stable hash based on index and seed
        const hashSeed = Math.floor(seededRandom() * 1000000).toString(16);
        const hash = `0x${hashSeed.padStart(64, '0')}`; // Simplified hash generation
        
        // Time: random time between 1h and 7 days ago
        const timeAgoMins = Math.floor(seededRandom() * 10000) + 60; 
        const timeDisplay = timeAgoMins > 1440 
            ? `${Math.floor(timeAgoMins / 1440)}d ago` 
            : `${Math.floor(timeAgoMins / 60)}h ago`;

        mockHistory.push({
            trader: `${account.slice(0,6)}...${account.slice(-4)}`,
            fullTrader: account,
            type: isBuy ? 'Buy' : 'Sell',
            tokenAmount: amount,
            tokenSymbol: 'EURC',
            usdcAmount: usdcAmt,
            time: timeDisplay,
            hash: `${hash.slice(0,6)}...${hash.slice(-4)}`,
            fullHash: hash
        });
    }

    // Sort combined trades by "recency" (mock logic: saved trades are 'Just now' or recent, mock are older)
    // Actually, just put saved trades first
    setMyTrades([...savedTrades, ...mockHistory]);

  }, [account]);

  // Filter trades based on selection
  // Ensure we only show trades for the CURRENT connected account in "My Trades"
  // This strict filtering prevents any "mixing" if state updates are pending
  const userTrades = myTrades.filter(t => 
    t.fullTrader && account && t.fullTrader.toLowerCase() === account.toLowerCase()
  );
  
  const sourceTrades = showMyTrades && account ? userTrades : trades;
  const totalPages = Math.ceil(sourceTrades.length / itemsPerPage);
  
  const displayedTrades = sourceTrades.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Reset page when switching tabs
  useEffect(() => {
    setCurrentPage(1);
  }, [showMyTrades]);
  
  // Calculate current exchange rate
  const currentRate = fromToken.symbol === "EURC" && toToken.symbol === "USDC" ? 7.56 : 
                      fromToken.symbol === "USDC" && toToken.symbol === "EURC" ? (1 / 7.6055) : 1;

  // Dynamic Chart Data based on pair
  const chartData = generateChartData(currentRate, currentRate * 0.005);
  const priceChange = fromToken.symbol === "EURC" ? -0.32 : 0.005;
  const priceChangePercent = fromToken.symbol === "EURC" ? 4.15 : 3.8;
  const isPositive = priceChange >= 0;

  // Validation: Minimum 5 USDC value
  const usdValue = fromToken.symbol === 'USDC' 
    ? parseFloat(inputAmount || "0") 
    : parseFloat(inputAmount || "0") * 7.6055;
  
  const isAmountTooLow = parseFloat(inputAmount || "0") > 0 && usdValue < 5;

  // Initialize Viem Client

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
      // 1. Fetch Native Balance (Gas) - usually 18 decimals
      let usdcGasFormatted = "0.00";
      try {
        const nativeBal = await (client as any).request({
          method: 'eth_getBalance',
          params: [userAddress as `0x${string}`, 'latest']
        });
        usdcGasFormatted = formatUnits(BigInt(nativeBal), 18);
      } catch (e) {
        console.warn("Failed to fetch Native Gas balance", e);
      }

      // 2. Fetch USDC ERC20 Balance - 6 decimals
      let usdcTokenFormatted = "0.00";
      try {
        const encodedBalanceOfUSDC = encodeFunctionData({
            abi: ERC20_ABI,
            functionName: 'balanceOf',
            args: [userAddress]
        });
         const tokenBalUSDC = await (client as any).request({
          method: 'eth_call',
          params: [{
            to: USDC_ADDRESS,
            data: encodedBalanceOfUSDC
          }, 'latest']
        });
        usdcTokenFormatted = formatUnits(BigInt(tokenBalUSDC), 6);
      } catch (e) {
         console.warn("Failed to fetch USDC ERC20 balance", e);
      }

      // 3. Fetch EURC ERC20 Balance - 6 decimals
      let eurcFormatted = "0.00";
      try {
        const encodedBalanceOfEURC = encodeFunctionData({
            abi: ERC20_ABI,
            functionName: 'balanceOf',
            args: [userAddress]
        });
        const tokenBalEURC = await (client as any).request({
          method: 'eth_call',
          params: [{
            to: TOKENS[1].address as `0x${string}`,
            data: encodedBalanceOfEURC
          }, 'latest']
        });
        eurcFormatted = formatUnits(BigInt(tokenBalEURC), 6);
      } catch (e) {
        console.warn("Failed to fetch EURC ERC20 balance", e);
      }

      // 4. Update State
      setBalances({
        USDC: parseFloat(usdcTokenFormatted) > 0 ? parseFloat(usdcTokenFormatted).toFixed(4) : parseFloat(usdcGasFormatted).toFixed(4),
        EURC: parseFloat(eurcFormatted).toFixed(4)
      });

    } catch (error) {
      console.error("Error fetching balances", error);
    }
  };

  const checkAllowance = async () => {
    if (!account) {
      setNeedsApproval(false);
      return;
    }

    const client = getWalletClient();
    if (!client) return;

    try {
        const encodedAllowance = encodeFunctionData({
            abi: ERC20_ABI,
            functionName: 'allowance',
            args: [account, POOL_ADDRESS]
        });

        console.log(`Checking allowance for ${fromToken.symbol} (${fromToken.address})`);
        
        const allowanceResult = await (client as any).request({
            method: 'eth_call',
            params: [{
                to: fromToken.address as `0x${string}`,
                data: encodedAllowance
            }, 'latest']
        });
        
        const currentAllowance = BigInt(allowanceResult);
        const amountToSpend = parseUnits(inputAmount || "0", fromToken.decimals);
        
        console.log(`Allowance: ${formatUnits(currentAllowance, fromToken.decimals)}, Required: ${inputAmount}`);

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
        localStorage.setItem('arc_wallet_connected', 'true'); // Persist connection state
        fetchBalances(address);
        
        toast({ title: "Connected", description: `Wallet connected: ${address.slice(0,6)}...` });
        
        // Listeners would go here (simplified for brevity)

    } catch (error: any) {
        console.error(error);
        toast({ title: "Connection Failed", description: error.message, variant: "destructive" });
    }
  };

  const disconnectWallet = () => {
    setAccount("");
    setWalletConnected(false);
    localStorage.removeItem('arc_wallet_connected');
    toast({ title: "Disconnected", description: "Wallet disconnected" });
  };

  // Auto-connect effect
  useEffect(() => {
    const checkConnection = async () => {
        const shouldConnect = localStorage.getItem('arc_wallet_connected') === 'true';
        if (!shouldConnect) return;

        const client = getWalletClient();
        if (!client) return;

        try {
            // Check if we have permissions already
            const accounts = await (client as any).request({ method: 'eth_accounts' });
            if (accounts && accounts.length > 0) {
                const address = accounts[0];
                setAccount(address);
                setWalletConnected(true);
                fetchBalances(address);
                
                // Try to ensure chain is correct silently
                try {
                    await client.switchChain({ id: arcTestnet.id });
                } catch (e) {
                    console.warn("Auto-switch chain failed", e);
                }
            }
        } catch (e) {
            console.error("Auto-connect failed", e);
        }
    };
    
    checkConnection();
  }, []);

  // Exchange Rate Logic
  useEffect(() => {
    if (!inputAmount) {
      setOutputAmount("");
      return;
    }
    const num = parseFloat(inputAmount);
    if (isNaN(num)) return;
    
    setOutputAmount((num * currentRate).toFixed(4));
  }, [inputAmount, fromToken, toToken, currentRate]);

  useEffect(() => {
    // Simulate live market trades
    const interval = setInterval(() => {
      // 30% chance to add a new trade every 5 seconds
      if (Math.random() > 0.7) {
        const isBuy = Math.random() > 0.5;
        const amount = (Math.random() * 100 + 1).toFixed(4); // EURC Amount
        // Consistent rate: 1 EURC = ~7.56 USDC
        const usdcAmt = (parseFloat(amount) * 7.56).toFixed(4);
        
        const hashHex = randomHex(64);
        const fullHash = `0x${hashHex}`;
        
        const traderHex = randomHex(40);
        const fullTrader = `0x${traderHex}`;

        const randomTrade = {
            trader: `0x${traderHex.slice(0, 4)}...${traderHex.slice(-4)}`,
            fullTrader: fullTrader,
            type: isBuy ? 'Buy' : 'Sell',
            tokenAmount: amount,
            tokenSymbol: 'EURC', // Simplified to assume EURC/USDC pair primarily
            usdcAmount: usdcAmt, 
            time: "Just now",
            hash: `0x${hashHex.slice(0, 4)}...${hashHex.slice(-4)}`,
            fullHash: fullHash
        };
        
        // Keep only last 40 global trades
        setTrades(prev => {
            const newTrades = [randomTrade, ...prev];
            return newTrades.slice(0, 40);
        });
      }
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const handleApprove = async () => {
      const client = getWalletClient();
      if (!client || !account) return;
      
      setIsApproving(true);
      try {
          const amountToApprove = parseUnits(inputAmount, fromToken.decimals);
          const data = encodeFunctionData({
              abi: ERC20_ABI,
              functionName: 'approve',
              args: [POOL_ADDRESS, amountToApprove]
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
          
          // Use POOL_ADDRESS for the swap, not Router
          const targetAddress = POOL_ADDRESS;

          // Determine correct function selector based on swap direction
          // USDC -> EURC: 0x84b065d3
          // EURC -> USDC: 0x99d96739
          const selector = fromToken.symbol === "USDC" ? "0x84b065d3" : "0x99d96739";
          
          const encodedParams = encodeAbiParameters(
            [
              { type: 'uint256' },
              { type: 'uint256' },
              { type: 'address' }
            ],
            [amountIn, amountOutMin, account as `0x${string}`]
          );
          
          const data = selector + encodedParams.slice(2); // Remove 0x from params to concatenate

          console.log("Sending Transaction to Pool:", targetAddress);
          console.log("Direction:", fromToken.symbol, "->", toToken.symbol);
          console.log("Selector:", selector);
          console.log("Data:", data);

          const hash = await client.sendTransaction({
              account: account as `0x${string}`,
              to: targetAddress,
              data: data as `0x${string}`,
              value: BigInt(0)
          });

          toast({ title: "Swap Submitted", description: "Transaction sent to network." });
          
          setTimeout(() => {
              setIsSwapping(false);
              setInputAmount("");
              setOutputAmount("");
              fetchBalances(account);
              
              // Add to trades
              const isBuy = fromToken.symbol === 'USDC';
              const newTrade = {
                trader: `${account.slice(0,6)}...${account.slice(-4)}`,
                fullTrader: account,
                type: isBuy ? 'Buy' : 'Sell',
                tokenAmount: isBuy ? parseFloat(outputAmount).toFixed(4) : parseFloat(inputAmount).toFixed(4),
                tokenSymbol: isBuy ? toToken.symbol : fromToken.symbol,
                usdcAmount: isBuy ? parseFloat(inputAmount).toFixed(4) : parseFloat(outputAmount).toFixed(4),
                time: "Just now",
                hash: `${hash.slice(0,6)}...${hash.slice(-4)}`,
                fullHash: hash
              };
              
              // Add to global trades (limited to 40)
              setTrades(prev => [newTrade, ...prev].slice(0, 40));
              
              // Add to my trades (unlimited for session, filtered by account view)
              setMyTrades(prev => {
                const updated = [newTrade, ...prev];
                // Save to LocalStorage
                if (account) {
                    // Only save the "real" new trades, not the entire state which might include mocks
                    // We need to separate them. But for simplicity, we can just append to LS
                    const savedTradesKey = `arc_trades_${account.toLowerCase()}`;
                    const currentSaved = JSON.parse(localStorage.getItem(savedTradesKey) || '[]');
                    localStorage.setItem(savedTradesKey, JSON.stringify([newTrade, ...currentSaved]));
                }
                return updated;
              });

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
                  <span className="text-xs text-muted-foreground font-mono">
                    {token.address.slice(0, 6)}...{token.address.slice(-4)}
                  </span>
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
          <div className="w-14 h-14 bg-primary/20 rounded-xl flex items-center justify-center shadow-lg shadow-primary/20 overflow-hidden border border-primary/20">
            <img src={logoImage} alt="Arc Swap Logo" className="w-full h-full object-cover" />
          </div>
          <div className="flex flex-col">
            <span className="text-2xl font-bold tracking-tight leading-none">Arc Swap</span>
            <span className="text-xs text-muted-foreground uppercase tracking-widest font-bold">Testnet</span>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" asChild className="hidden sm:flex gap-2 text-muted-foreground">
            <a href="https://faucet.circle.com" target="_blank" rel="noopener noreferrer">
              USDC Faucet <ExternalLink className="w-3 h-3" />
            </a>
          </Button>
          
          {/* Network Selector */}
          <div className="hidden sm:flex items-center gap-2 bg-secondary/40 hover:bg-secondary/60 transition-colors rounded-full px-3 py-1.5 border border-border/50 cursor-pointer">
             <div className="w-4 h-4 rounded-full bg-transparent flex items-center justify-center overflow-hidden">
                <img src={arcSymbol} alt="Arc" className="w-full h-full object-contain" />
             </div>
             <span className="text-sm font-medium">ARC TESTNET</span>
             <ChevronDown className="w-3 h-3 text-muted-foreground opacity-50" />
          </div>
          
          {walletConnected && account ? (
            <div 
                className="flex items-center gap-2 bg-secondary/40 rounded-full p-1 pl-3 border border-border/50 cursor-pointer hover:bg-red-500/10 hover:border-red-500/30 transition-all group"
                onClick={disconnectWallet}
                title="Click to disconnect"
            >
               <div className="flex items-center gap-2 text-sm font-medium border-r border-border/50 pr-3 group-hover:border-red-500/30 transition-colors">
                 <span className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)] group-hover:bg-red-500 group-hover:shadow-[0_0_8px_rgba(239,68,68,0.5)] transition-colors" />
                 <span className="group-hover:text-red-500 transition-colors">Disconnect</span>
               </div>
               <div className="flex items-center gap-2 pr-2">
                 <span className="text-sm font-semibold group-hover:opacity-50 transition-opacity">{balances.USDC} USDC</span>
                 <div className="w-6 h-6 rounded-full bg-gradient-to-br from-orange-400 to-red-500 group-hover:opacity-50 transition-opacity" />
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
      <main className="flex-1 w-full max-w-7xl mx-auto p-4 lg:p-8 space-y-8">
        
        {/* Top Section: Swap and Chart */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
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

                    {/* Detailed Info Section */}
                    {inputAmount && (
                      <div className="bg-background/40 rounded-xl p-3 space-y-2 mt-2 border border-border/40">
                        <div className="flex justify-between text-xs">
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <Info className="w-3 h-3" /> Rate
                          </div>
                          <div className="font-medium">
                            1 {fromToken.symbol} = {(parseFloat(outputAmount)/parseFloat(inputAmount) || 0).toFixed(6)} {toToken.symbol}
                          </div>
                        </div>
                        <div className="flex justify-between text-xs">
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <Info className="w-3 h-3" /> Price impact
                          </div>
                          <div className="font-medium text-green-500">
                            0.302%
                          </div>
                        </div>
                        <div className="flex justify-between text-xs">
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <Settings className="w-3 h-3" /> Max slippage
                          </div>
                          <div className="font-medium">
                            {slippage}%
                          </div>
                        </div>
                        <div className="flex justify-between text-xs">
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <Info className="w-3 h-3" /> Receive at least
                          </div>
                          <div className="font-medium">
                            {(parseFloat(outputAmount) * (1 - parseFloat(slippage)/100)).toFixed(6)} {toToken.symbol}
                          </div>
                        </div>
                      </div>
                    )}
                    
                    {/* Min Amount Warning */}
                    {isAmountTooLow && (
                       <div className="mt-2 p-3 bg-red-500/10 border border-red-500/20 rounded-xl flex items-start gap-2">
                          <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
                          <div>
                            <p className="text-xs font-bold text-red-500">Transaction Failed</p>
                            <p className="text-[10px] text-red-500/80">Minimum value is $5 USDC. Current value: ${usdValue.toFixed(2)} USDC</p>
                          </div>
                       </div>
                    )}
                  </div>

                  <div className="p-4 pt-0">
                    {needsApproval ? (
                         <Button 
                            className="w-full h-14 text-lg font-bold rounded-xl bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20"
                            onClick={handleApprove}
                            disabled={!walletConnected || !inputAmount || isApproving || isAmountTooLow}
                          >
                            {isApproving ? (
                              <div className="flex items-center gap-2"><RefreshCw className="animate-spin w-5 h-5"/> Approving...</div>
                            ) : `Approve ${fromToken.symbol}`}
                          </Button>
                    ) : (
                        <Button 
                          className={`w-full h-14 text-lg font-bold rounded-xl shadow-lg ${!walletConnected ? 'bg-secondary text-muted-foreground' : 'bg-primary hover:bg-primary/90 shadow-primary/20'}`}
                          onClick={handleSwap}
                          disabled={walletConnected && (!inputAmount || isSwapping || isAmountTooLow)}
                        >
                          {isSwapping ? (
                            <div className="flex items-center gap-2"><RefreshCw className="animate-spin w-5 h-5"/> Swapping...</div>
                          ) : !walletConnected ? "Connect Wallet" : !inputAmount ? "Enter Amount" : isAmountTooLow ? "Amount too low" : "Swap"}
                        </Button>
                    )}
                    
                    <div className="mt-4 flex items-center justify-center gap-2 text-xs text-muted-foreground">
                        <Info className="w-3 h-3" />
                        <span>No price impact (Testnet)</span>
                    </div>
                  </div>
                </Card>
            </div>

            {/* Right Column (Chart) */}
            <div className="lg:col-span-7 order-2 flex flex-col gap-6">
                <Card className="w-full min-h-[500px] bg-card/50 backdrop-blur-md border-border/50 shadow-xl rounded-[24px] overflow-hidden flex flex-col">
                     <div className="p-6 border-b border-border/50 bg-card/30 flex justify-between items-center">
                       <div>
                         <div className="flex items-baseline gap-2">
                           <h2 className="text-3xl font-bold text-foreground">1.00 {fromToken.symbol}</h2>
                           <span className="text-sm text-muted-foreground"> = {currentRate.toFixed(4)} {toToken.symbol}</span>
                         </div>
                         <div className="flex items-center gap-2 mt-1">
                           <span className={`text-sm font-medium ${isPositive ? 'text-green-500' : 'text-red-500'} flex items-center gap-1`}>
                             {isPositive ? <TrendingUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />} 
                             {isPositive ? '+' : ''}{priceChange} ({priceChangePercent}%)
                           </span>
                           <span className="text-xs text-muted-foreground">Past {chartTimeframe}</span>
                         </div>
                       </div>
                       <div className="flex gap-2">
                         {["1H", "1D", "1W", "1M"].map(period => (
                           <Button 
                            key={period} 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => setChartTimeframe(period)}
                            className={`h-8 px-3 rounded-lg text-xs font-semibold ${chartTimeframe === period ? 'bg-secondary text-primary' : 'text-muted-foreground hover:text-foreground'}`}
                           >
                             {period}
                           </Button>
                         ))}
                       </div>
                     </div>
                     
                     <div className="flex-1 w-full min-h-[350px] p-4 relative">
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={chartData}>
                            <defs>
                              <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor={isPositive ? "#22c55e" : "#ef4444"} stopOpacity={0.3}/>
                                <stop offset="95%" stopColor={isPositive ? "#22c55e" : "#ef4444"} stopOpacity={0}/>
                              </linearGradient>
                            </defs>
                            <XAxis 
                              dataKey="time" 
                              axisLine={false}
                              tickLine={false}
                              tick={{ fill: '#6B7280', fontSize: 12 }}
                              dy={10}
                            />
                            <YAxis 
                              domain={['dataMin', 'dataMax']} 
                              axisLine={false}
                              tickLine={false}
                              tick={{ fill: '#6B7280', fontSize: 12 }}
                              dx={-10}
                              tickFormatter={(value) => value.toFixed(4)}
                            />
                            <Tooltip 
                              contentStyle={{ 
                                backgroundColor: 'rgba(17, 24, 39, 0.9)', 
                                border: '1px solid rgba(75, 85, 99, 0.4)',
                                borderRadius: '12px',
                                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                              }}
                              itemStyle={{ color: '#fff' }}
                              labelStyle={{ color: '#9CA3AF', marginBottom: '4px' }}
                              formatter={(value: number) => [value.toFixed(4), toToken.symbol]}
                            />
                            <Area 
                              type="monotone" 
                              dataKey="price" 
                              stroke={isPositive ? "#22c55e" : "#ef4444"} 
                              strokeWidth={3}
                              fillOpacity={1} 
                              fill="url(#colorPrice)" 
                            />
                          </AreaChart>
                        </ResponsiveContainer>
                     </div>
                </Card>
            </div>
        </div>

            {/* Trade History (Full Width Below) */}
            <Card className="w-full bg-card/50 backdrop-blur-md border-border/50 shadow-xl rounded-[24px] overflow-hidden col-span-1 lg:col-span-12">
                <div className="p-5 border-b border-border/50 bg-card/30 flex items-center justify-between">
                   <div className="flex flex-col gap-1">
                     <h3 className="font-bold text-base text-foreground">Trade History & Trades</h3>
                     <span className="text-xs text-muted-foreground">
                       {showMyTrades ? "Showing your recent trades" : "Showing all recent trades"}
                     </span>
                   </div>
                   
                   <div className="flex bg-secondary/30 rounded-lg p-1 gap-1">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => setShowMyTrades(false)}
                        className={`h-7 px-3 text-xs rounded-md transition-all ${!showMyTrades ? 'bg-background shadow-sm text-foreground font-semibold' : 'text-muted-foreground hover:text-foreground'}`}
                      >
                        All Trades
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => setShowMyTrades(true)}
                        disabled={!account}
                        className={`h-7 px-3 text-xs rounded-md transition-all ${showMyTrades ? 'bg-background shadow-sm text-foreground font-semibold' : 'text-muted-foreground hover:text-foreground'}`}
                      >
                        My Trades
                      </Button>
                   </div>
                </div>
                <div className="overflow-x-auto">
                    {displayedTrades.length === 0 ? (
                      <div className="p-12 flex flex-col items-center justify-center text-center gap-3">
                        <div className="w-12 h-12 rounded-full bg-secondary/30 flex items-center justify-center text-muted-foreground">
                          <Activity className="w-6 h-6 opacity-50" />
                        </div>
                        <div className="flex flex-col gap-1">
                          <span className="text-foreground font-medium">No trades found</span>
                          <span className="text-muted-foreground text-sm">
                            {showMyTrades && !account 
                              ? "Connect your wallet to see your trades" 
                              : "No recent trades to display"}
                          </span>
                        </div>
                      </div>
                    ) : (
                    <>
                    <table className="w-full text-sm text-left border-collapse">
                    <thead className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider border-b border-border/50">
                        <tr>
                        <th className="px-6 py-4">Trader</th>
                        <th className="px-6 py-4">Type</th>
                        <th className="px-6 py-4">Token Amount</th>
                        <th className="px-6 py-4">USDC Amount</th>
                        <th className="px-6 py-4">Time</th>
                        <th className="px-6 py-4 text-right">Tx</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border/30">
                        {displayedTrades.map((trade, i) => (
                        <tr key={i} className="hover:bg-secondary/20 transition-colors group">
                            <td className="px-6 py-4 font-semibold text-foreground">
                                <div className="flex items-center gap-2">
                                  {showMyTrades ? (
                                      trade.trader.includes('Router') ? 'Router' : (
                                          <a href={`${arcTestnet.blockExplorers.default.url}/address/${(trade as any).fullTrader || trade.trader}`} target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors flex items-center gap-2">
                                            {trade.trader}
                                            <ExternalLink className="w-3 h-3 text-orange-500/70 hover:text-orange-500 cursor-pointer" />
                                          </a>
                                      )
                                  ) : (
                                      <span className="text-muted-foreground italic flex items-center gap-2 opacity-70">
                                        <Ghost className="w-4 h-4" />
                                        Anonymous
                                      </span>
                                  )}
                                </div>
                            </td>
                            <td className="px-6 py-4">
                                <span className={`px-2 py-1 rounded-md text-xs font-bold uppercase tracking-wide flex items-center gap-1 w-fit ${
                                  trade.type === 'Buy' 
                                    ? 'bg-green-500/10 text-green-500' 
                                    : 'bg-red-500/10 text-red-500'
                                }`}>
                                  {trade.type === 'Buy' ? <TrendingUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}
                                  {trade.type}
                                </span>
                            </td>
                            <td className="px-6 py-4">
                                <div className="flex items-center gap-3 text-sm font-medium">
                                  {trade.type === 'Buy' ? (
                                    <>
                                      <div className="flex items-center gap-2">
                                         <div className="w-5 h-5 rounded-full bg-blue-500 text-white flex items-center justify-center text-[10px] font-bold">$</div>
                                         <span className="text-foreground font-bold">{trade.usdcAmount}</span>
                                         <span className="text-muted-foreground text-xs">USDC</span>
                                      </div>
                                      <ArrowRight className="w-3 h-3 text-muted-foreground/50" />
                                      <div className="flex items-center gap-2">
                                         <div className="w-5 h-5 rounded-full bg-yellow-400 text-yellow-900 flex items-center justify-center text-[10px] font-bold">€</div>
                                         <span className="text-foreground font-bold">{trade.tokenAmount}</span>
                                         <span className="text-muted-foreground text-xs">{trade.tokenSymbol}</span>
                                      </div>
                                    </>
                                  ) : (
                                    <>
                                      <div className="flex items-center gap-2">
                                         <div className="w-5 h-5 rounded-full bg-yellow-400 text-yellow-900 flex items-center justify-center text-[10px] font-bold">€</div>
                                         <span className="text-foreground font-bold">{trade.tokenAmount}</span>
                                         <span className="text-muted-foreground text-xs">{trade.tokenSymbol}</span>
                                      </div>
                                      <ArrowRight className="w-3 h-3 text-muted-foreground/50" />
                                      <div className="flex items-center gap-2">
                                         <div className="w-5 h-5 rounded-full bg-blue-500 text-white flex items-center justify-center text-[10px] font-bold">$</div>
                                         <span className="text-foreground font-bold">{trade.usdcAmount}</span>
                                         <span className="text-muted-foreground text-xs">USDC</span>
                                      </div>
                                    </>
                                  )}
                                </div>
                            </td>
                            <td className="px-6 py-4 font-bold text-foreground">
                                {trade.usdcAmount} <span className="text-muted-foreground text-xs font-normal">USDC</span>
                            </td>
                            <td className="px-6 py-4 text-muted-foreground text-xs font-medium">{trade.time}</td>
                            <td className="px-6 py-4 text-right">
                                <div className="flex justify-end">
                                    {showMyTrades ? (
                                        <a href={`${arcTestnet.blockExplorers.default.url}/tx/${(trade as any).fullHash || trade.hash}`} target="_blank" rel="noopener noreferrer">
                                            <ExternalLink className="w-4 h-4 text-orange-500/70 hover:text-orange-500 cursor-pointer transition-colors" />
                                        </a>
                                    ) : (
                                        <div className="flex items-center gap-1 text-muted-foreground/50 text-xs italic">
                                            <Lock className="w-3 h-3" />
                                            <span>Private</span>
                                        </div>
                                    )}
                                </div>
                            </td>
                        </tr>
                        ))}
                    </tbody>
                    </table>
                    
                    {/* Pagination Controls */}
                    {totalPages > 1 && (
                      <div className="flex items-center justify-between px-6 py-4 border-t border-border/30 bg-card/20">
                         <div className="text-xs text-muted-foreground">
                            Showing <span className="font-medium text-foreground">{(currentPage - 1) * itemsPerPage + 1}</span> to <span className="font-medium text-foreground">{Math.min(currentPage * itemsPerPage, sourceTrades.length)}</span> of <span className="font-medium text-foreground">{sourceTrades.length}</span> results
                         </div>
                         <div className="flex items-center gap-2">
                            <Button 
                              variant="outline" 
                              size="sm" 
                              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                              disabled={currentPage === 1}
                              className="h-8 px-3 text-xs bg-background/50 border-border/50"
                            >
                              Previous
                            </Button>
                            <div className="flex items-center gap-1">
                              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                                 // Simple logic to show first few pages or window around current
                                 // For simplicity in mockup, just showing first 5 or logic to shift
                                 let p = i + 1;
                                 if (totalPages > 5 && currentPage > 3) {
                                    p = currentPage - 2 + i;
                                    // Adjust if near end
                                    if (p > totalPages) p = totalPages - (4 - i);
                                 }
                                 
                                 return (
                                   <Button
                                     key={p}
                                     variant={currentPage === p ? "secondary" : "ghost"}
                                     size="sm"
                                     onClick={() => setCurrentPage(p)}
                                     className={`h-8 w-8 p-0 text-xs ${currentPage === p ? "bg-primary/20 text-primary font-bold" : "text-muted-foreground"}`}
                                   >
                                     {p}
                                   </Button>
                                 );
                              })}
                            </div>
                            <Button 
                              variant="outline" 
                              size="sm" 
                              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                              disabled={currentPage === totalPages}
                              className="h-8 px-3 text-xs bg-background/50 border-border/50"
                            >
                              Next
                            </Button>
                         </div>
                      </div>
                    )}
                    </>
                    )}
                </div>
            </Card>
      </main>
    </div>
  );
}