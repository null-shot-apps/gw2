'use client';

import { useEffect, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

// Chain configuration
const CHAINS = [
  { id: 'eth', name: 'Ethereum', owlracleId: 'eth', color: '#627EEA', blockTime: 12 },
  { id: 'base', name: 'Base', owlracleId: 'base', color: '#0052FF', blockTime: 2 },
  { id: 'arbitrum', name: 'Arbitrum', owlracleId: 'arb', color: '#28A0F0', blockTime: 0.25 },
  { id: 'optimism', name: 'Optimism', owlracleId: 'optimism', color: '#FF0420', blockTime: 2 },
  { id: 'polygon', name: 'Polygon', owlracleId: 'poly', color: '#8247E5', blockTime: 2 },
  { id: 'zksync', name: 'zkSync Era', owlracleId: 'zksync', color: '#8C8DFC', blockTime: 1 },
];

// Transaction types with estimated gas usage
const TX_TYPES = [
  { id: 'transfer', name: 'Simple Transfer', gas: 21000 },
  { id: 'swap', name: 'Token Swap', gas: 175000 },
  { id: 'mint', name: 'NFT Mint', gas: 400000 },
];

interface GasData {
  low: number;
  average: number;
  high: number;
  timestamp: number;
}

interface ChainGasData {
  [chainId: string]: GasData | null;
}

interface HistoryPoint {
  timestamp: number;
  [chainId: string]: number;
}

export default function GasFeeDashboard() {
  const [gasData, setGasData] = useState<ChainGasData>({});
  const [ethPrice, setEthPrice] = useState<number>(0);
  const [selectedTxType, setSelectedTxType] = useState<string>('swap');
  const [recommendationMode, setRecommendationMode] = useState<'cost' | 'speed'>('cost');
  const [chartTimeframe, setChartTimeframe] = useState<'1h' | '24h'>('24h');
  const [historyData, setHistoryData] = useState<HistoryPoint[]>([]);
  const [lastUpdated, setLastUpdated] = useState<number>(Date.now());
  const [timeSinceUpdate, setTimeSinceUpdate] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Fetch ETH price from CoinGecko
  const fetchEthPrice = async () => {
    try {
      const response = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd');
      const data = await response.json();
      setEthPrice(data.ethereum.usd);
    } catch (error) {
      console.error('Error fetching ETH price:', error);
      setEthPrice(3000); // Fallback price
    }
  };

  // Fetch gas data for a single chain
  const fetchChainGas = async (chain: typeof CHAINS[0]) => {
    try {
      const response = await fetch(`https://api.owlracle.info/v4/${chain.owlracleId}/gas`);
      const data = await response.json();
      
      if (data.speeds && data.speeds.length >= 3) {
        return {
          low: data.speeds[0].gasPrice || 0,
          average: data.speeds[1].gasPrice || 0,
          high: data.speeds[2].gasPrice || 0,
          timestamp: Date.now(),
        };
      }
      return null;
    } catch (error) {
      console.error(`Error fetching gas for ${chain.name}:`, error);
      return null;
    }
  };

  // Fetch all gas data
  const fetchAllGasData = async () => {
    const promises = CHAINS.map(async (chain) => {
      const data = await fetchChainGas(chain);
      return { chainId: chain.id, data };
    });

    const results = await Promise.all(promises);
    const newGasData: ChainGasData = {};
    
    results.forEach(({ chainId, data }) => {
      newGasData[chainId] = data;
    });

    setGasData(newGasData);
    setLastUpdated(Date.now());
    setIsLoading(false);
  };

  // Fetch history data for charts
  const fetchHistoryData = async () => {
    const hoursBack = chartTimeframe === '1h' ? 1 : 24;
    const promises = CHAINS.map(async (chain) => {
      try {
        const response = await fetch(
          `https://api.owlracle.info/v4/${chain.owlracleId}/history?timeframe=${hoursBack * 60}`
        );
        const data = await response.json();
        return { chainId: chain.id, history: data };
      } catch (error) {
        console.error(`Error fetching history for ${chain.name}:`, error);
        return { chainId: chain.id, history: null };
      }
    });

    const results = await Promise.all(promises);
    
    // Process history data into chart format
    const historyMap = new Map<number, any>();
    
    results.forEach(({ chainId, history }) => {
      if (history && history.candles) {
        history.candles.forEach((candle: any) => {
          const timestamp = candle.timestamp * 1000;
          if (!historyMap.has(timestamp)) {
            historyMap.set(timestamp, { timestamp });
          }
          historyMap.get(timestamp)[chainId] = candle.avgGas || 0;
        });
      }
    });

    const sortedHistory = Array.from(historyMap.values()).sort((a, b) => a.timestamp - b.timestamp);
    setHistoryData(sortedHistory);
  };

  // Calculate USD cost for a transaction
  const calculateUsdCost = (gasPrice: number, gasUsed: number): number => {
    // gasPrice is in Gwei, convert to ETH then to USD
    const ethCost = (gasPrice * gasUsed) / 1e9;
    return ethCost * ethPrice;
  };

  // Get recommendation
  const getRecommendation = () => {
    const txType = TX_TYPES.find(t => t.id === selectedTxType);
    if (!txType) return null;

    const chainCosts = CHAINS.map(chain => {
      const data = gasData[chain.id];
      if (!data) return null;

      const usdCost = calculateUsdCost(data.average, txType.gas);
      
      return {
        chain,
        usdCost,
        gasPrice: data.average,
        blockTime: chain.blockTime,
        score: recommendationMode === 'cost' 
          ? usdCost 
          : usdCost * chain.blockTime, // Factor in speed for fastest mode
      };
    }).filter(Boolean);

    if (chainCosts.length === 0) return null;

    chainCosts.sort((a, b) => a!.score - b!.score);
    const best = chainCosts[0]!;
    const worst = chainCosts[chainCosts.length - 1]!;
    
    const savings = ((worst.usdCost - best.usdCost) / worst.usdCost * 100).toFixed(0);

    return {
      chain: best.chain,
      cost: best.usdCost,
      worstChain: worst.chain,
      worstCost: worst.usdCost,
      savings,
      reason: recommendationMode === 'cost' 
        ? `${savings}% cheaper than ${worst.chain.name}`
        : `Fast confirmation (~${best.blockTime}s) at low cost`,
    };
  };

  // Manual refresh
  const handleManualRefresh = () => {
    fetchAllGasData();
    fetchHistoryData();
  };

  // Initial fetch
  useEffect(() => {
    fetchEthPrice();
    fetchAllGasData();
    fetchHistoryData();
  }, []);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      fetchAllGasData();
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  // Refetch history when timeframe changes
  useEffect(() => {
    fetchHistoryData();
  }, [chartTimeframe]);

  // Update "time since update" every second
  useEffect(() => {
    const interval = setInterval(() => {
      setTimeSinceUpdate(Math.floor((Date.now() - lastUpdated) / 1000));
    }, 1000);

    return () => clearInterval(interval);
  }, [lastUpdated]);

  const recommendation = getRecommendation();
  const selectedTx = TX_TYPES.find(t => t.id === selectedTxType);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 text-white">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl md:text-5xl font-bold mb-2 bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
            ⛽ Gas Fee Tracker
          </h1>
          <p className="text-gray-400">Real-time gas prices across major chains</p>
        </div>

        {/* Recommendation Banner */}
        {recommendation && !isLoading && (
          <div className="mb-6 p-6 bg-gradient-to-r from-green-500/20 to-blue-500/20 border border-green-500/30 rounded-xl">
            <div className="flex items-start justify-between flex-wrap gap-4">
              <div>
                <div className="text-sm text-gray-300 mb-1">
                  💡 Best {recommendationMode === 'cost' ? 'Value' : 'Speed'} Right Now
                </div>
                <div className="text-2xl font-bold mb-1">
                  {recommendation.chain.name}: ${recommendation.cost.toFixed(4)}
                </div>
                <div className="text-sm text-gray-300">
                  vs {recommendation.worstChain.name} (${recommendation.worstCost.toFixed(4)}) - {recommendation.reason}
                </div>
              </div>
              <button
                onClick={() => setRecommendationMode(mode => mode === 'cost' ? 'speed' : 'cost')}
                className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors text-sm"
              >
                Switch to {recommendationMode === 'cost' ? 'Fastest' : 'Lowest Cost'}
              </button>
            </div>
          </div>
        )}

        {/* Controls */}
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div className="flex gap-2">
            {TX_TYPES.map(tx => (
              <button
                key={tx.id}
                onClick={() => setSelectedTxType(tx.id)}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  selectedTxType === tx.id
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                }`}
              >
                {tx.name}
              </button>
            ))}
          </div>
          
          <div className="flex items-center gap-4">
            <div className="text-sm text-gray-400">
              Last updated: {timeSinceUpdate}s ago
            </div>
            <button
              onClick={handleManualRefresh}
              className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors text-sm flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Refresh
            </button>
          </div>
        </div>

        {/* Chain Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
          {CHAINS.map(chain => {
            const data = gasData[chain.id];
            const isLowest = recommendation?.chain.id === chain.id;
            
            if (!data) {
              return (
                <div key={chain.id} className="p-6 bg-gray-800/50 rounded-xl border border-gray-700">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: chain.color }} />
                      <h3 className="text-lg font-semibold">{chain.name}</h3>
                    </div>
                  </div>
                  <div className="text-gray-500">Loading...</div>
                </div>
              );
            }

            const usdCost = calculateUsdCost(data.average, selectedTx?.gas || 0);
            const statusColor = usdCost < 0.1 ? '🟢' : usdCost < 1 ? '🟡' : '🔴';

            return (
              <div
                key={chain.id}
                className={`p-6 rounded-xl border transition-all ${
                  isLowest
                    ? 'bg-green-500/10 border-green-500/50 ring-2 ring-green-500/30'
                    : 'bg-gray-800/50 border-gray-700 hover:border-gray-600'
                }`}
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: chain.color }} />
                    <h3 className="text-lg font-semibold">{chain.name}</h3>
                  </div>
                  <span className="text-2xl">{statusColor}</span>
                </div>

                <div className="mb-4">
                  <div className="text-3xl font-bold mb-1">
                    ${usdCost.toFixed(4)}
                  </div>
                  <div className="text-sm text-gray-400">
                    {data.average.toFixed(2)} Gwei
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div>
                    <div className="text-gray-500">Low</div>
                    <div className="font-semibold">{data.low.toFixed(1)}</div>
                  </div>
                  <div>
                    <div className="text-gray-500">Avg</div>
                    <div className="font-semibold">{data.average.toFixed(1)}</div>
                  </div>
                  <div>
                    <div className="text-gray-500">High</div>
                    <div className="font-semibold">{data.high.toFixed(1)}</div>
                  </div>
                </div>

                {isLowest && (
                  <div className="mt-3 pt-3 border-t border-green-500/30 text-xs text-green-400 font-semibold">
                    ⭐ Best Choice
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Chart Section */}
        <div className="bg-gray-800/50 rounded-xl border border-gray-700 p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold">📊 Gas Price Trends</h2>
            <div className="flex gap-2">
              <button
                onClick={() => setChartTimeframe('1h')}
                className={`px-4 py-2 rounded-lg transition-colors text-sm ${
                  chartTimeframe === '1h'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                Last 1h
              </button>
              <button
                onClick={() => setChartTimeframe('24h')}
                className={`px-4 py-2 rounded-lg transition-colors text-sm ${
                  chartTimeframe === '24h'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                Last 24h
              </button>
            </div>
          </div>

          {historyData.length > 0 ? (
            <ResponsiveContainer width="100%" height={400}>
              <LineChart data={historyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis
                  dataKey="timestamp"
                  stroke="#9CA3AF"
                  tickFormatter={(timestamp) => {
                    const date = new Date(timestamp);
                    return chartTimeframe === '1h'
                      ? date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                      : date.toLocaleTimeString([], { hour: '2-digit' });
                  }}
                />
                <YAxis stroke="#9CA3AF" label={{ value: 'Gwei', angle: -90, position: 'insideLeft' }} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #374151', borderRadius: '8px' }}
                  labelFormatter={(timestamp) => new Date(timestamp).toLocaleString()}
                />
                <Legend />
                {CHAINS.map(chain => (
                  <Line
                    key={chain.id}
                    type="monotone"
                    dataKey={chain.id}
                    name={chain.name}
                    stroke={chain.color}
                    strokeWidth={2}
                    dot={false}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[400px] flex items-center justify-center text-gray-500">
              Loading chart data...
            </div>
          )}
        </div>

        {/* Footer Info */}
        <div className="mt-8 text-center text-sm text-gray-500">
          <p>Data updates every 30 seconds • ETH Price: ${ethPrice.toFixed(2)}</p>
          <p className="mt-1">Powered by Owlracle & CoinGecko APIs</p>
        </div>
      </div>
    </div>
  );
}

