import { useEffect, useRef, useState } from "react";
import { createChart, ColorType, IChartApi, AreaSeries, Time } from "lightweight-charts";
import { ethers } from "ethers";

interface PriceChartProps {
    timeframe: string;
}

export default function PriceChart({ timeframe }: PriceChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<any>(null); // To store series reference
  const [currentPrice, setCurrentPrice] = useState<string | null>(null);

  // Helper to get interval seconds
  const getIntervalSeconds = (period: string) => {
      switch(period) {
          case '5s': return 5;
          case '15m': return 15 * 60;
          case '1H': return 3600;
          case '1D': return 86400;
          case '1W': return 604800;
          case '1M': return 2592000; // 30 days
          default: return 60;
      }
  };

  // Function to generate initial data based on timeframe
  const generateInitialData = (basePrice: number, period: string) => {
      const data: any[] = [];
      const now = Math.floor(Date.now() / 1000);
      const interval = getIntervalSeconds(period);
      
      // Align the end time to the grid
      const alignedNow = Math.floor(now / interval) * interval;

      let count = 100;
      // Adjust history count based on timeframe to fill screen nicely
      switch(period) {
          case '5s': count = 100; break;
          case '15m': count = 50; break;
          case '1H': count = 48; break;
          case '1D': count = 30; break;
          case '1W': count = 24; break;
          case '1M': count = 12; break;
      }

      let currentP = basePrice;
      // Generate history up to the *previous* interval
      for (let i = count; i > 0; i--) {
          // Add some volatility
          currentP += (Math.random() - 0.5) * (basePrice * 0.005); 
          data.push({
              time: (alignedNow - (i * interval)) as Time,
              value: currentP
          });
      }
      // Add current open interval with base price (will be updated by tick immediately)
      data.push({
          time: alignedNow as Time,
          value: currentP
      });

      return data;
  };

  useEffect(() => {
    if (!chartContainerRef.current) return;

    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: 'transparent' },
        textColor: '#9CA3AF',
      },
      grid: {
        vertLines: { color: '#3b1f69', style: 2 }, // Dotted
        horzLines: { color: '#3b1f69', style: 2 }, // Dotted
      },
      width: chartContainerRef.current.clientWidth,
      height: 400,
      timeScale: {
        timeVisible: true,
        secondsVisible: timeframe === '5s',
        borderColor: '#3b1f69',
        tickMarkFormatter: (time: number, tickMarkType: any, locale: any) => {
            const date = new Date(time * 1000);
            if (timeframe === '5s') return date.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit', second: '2-digit' });
            if (timeframe === '15m' || timeframe === '1H') return date.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });
            if (timeframe === '1D') return date.toLocaleDateString(locale, { day: 'numeric', month: 'short' });
            return date.toLocaleDateString(locale, { month: 'short', year: '2-digit' });
        },
      },
      rightPriceScale: {
        borderColor: '#3b1f69',
      },
    });

    chartRef.current = chart;

    // Use Area Series for the "Stepped Line" look (approximated with line)
    // V5 Syntax: chart.addSeries(AreaSeries, options)
    const series = chart.addSeries(AreaSeries, {
      lineColor: '#f97316', // Orange-500 to match image
      topColor: 'rgba(249, 115, 22, 0.2)', 
      bottomColor: 'rgba(249, 115, 22, 0.0)',
      lineWidth: 2,
      priceLineVisible: true,
      lastValueVisible: true,
    });
    
    seriesRef.current = series;

    // -------------------------
    // ARC CONFIGURATION
    // -------------------------
    const provider = new ethers.JsonRpcProvider(
      "https://rpc-testnet.arc.network/"
    );

    const poolAddress = "0x284C5Afc100ad14a458255075324fA0A9dfd66b1";

    // Minimal ABI
    const ABI = [
      "function getAmountOut(uint256 amountIn) view returns (uint256)"
    ];

    const pool = new ethers.Contract(poolAddress, ABI, provider);

    async function getPrice() {
      try {
        // 1 EURC (6 decimals) -> USDC (6 decimals)
        const amountIn = ethers.parseUnits("1", 6);
        const out = await pool.getAmountOut(amountIn);
        return Number(out) / 1e6;
      } catch (e) {
        console.warn("Error reading price (using mock for demo if needed):", e);
        // Fallback for demo if contract fails
        // Return a value around 7.56
        return 7.56 + (Math.random() * 0.02 - 0.01);
      }
    }

    // Initial Data Load
    // We'll use a base price around 7.56 to start generating history
    // Ideally we would fetch the current price first, but for speed we can start generating
    // and then correct/append live data.
    const initialData = generateInitialData(7.56, timeframe);
    series.setData(initialData);
    chart.timeScale().fitContent();

    async function tick() {
      const price = await getPrice();
      if (!price) return;

      setCurrentPrice(price.toFixed(4));

      const now = Math.floor(Date.now() / 1000);
      const interval = getIntervalSeconds(timeframe);
      // Align timestamp to the start of the interval (e.g., 00:00, 00:15, 00:30)
      const alignedTime = (Math.floor(now / interval) * interval) as Time;
      
      series.update({ time: alignedTime, value: price });
    }

    // Initial tick
    tick();

    const interval = setInterval(tick, 5000);

    // Handle resize
    const handleResize = () => {
        if (chartContainerRef.current && chartRef.current) {
            chartRef.current.applyOptions({ width: chartContainerRef.current.clientWidth });
        }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      clearInterval(interval);
      window.removeEventListener('resize', handleResize);
      if (chartRef.current) {
        chartRef.current.remove();
      }
    };
  }, [timeframe]); // Re-run when timeframe changes

  return (
    <div className="relative w-full">
        {currentPrice && (
             <div className="absolute top-2 left-2 z-10 flex flex-col bg-[#1c1038]/80 backdrop-blur-md border border-[#3b1f69] p-2 rounded-lg shadow-xl">
                <span className="text-xs text-muted-foreground font-bold uppercase tracking-wider">EURC/USDC</span>
                <span className="text-2xl font-bold text-orange-500">${currentPrice}</span>
             </div>
        )}
        <div ref={chartContainerRef} className="w-full h-[400px]" />
    </div>
  );
}
