import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Area,
  AreaChart,
  ResponsiveContainer,
} from "recharts";
import { useAptos } from "../../../providers/AptosProvider.jsx";
import { Spinner } from "@nextui-org/react";
import dayjs from "dayjs";
import { useEffect, useState } from "react";
import { safeGetJSON, safeSetJSON } from "../../../utils/localStorageUtils.js";

const BALANCE_HISTORY_KEY = 'aptos_balance_history';

// Get balance history from localStorage
function getBalanceHistory(account) {
  if (!account) return [];
  const key = `${BALANCE_HISTORY_KEY}_${account}`;
  return safeGetJSON(key, []);
}

// Save balance history to localStorage
function saveBalanceHistory(account, history) {
  if (!account) return;
  const key = `${BALANCE_HISTORY_KEY}_${account}`;
  safeSetJSON(key, history);
}

// Update balance history with new balance
function updateBalanceHistory(account, newBalance) {
  if (!account || newBalance === undefined || newBalance === null) return [];
  
  const history = getBalanceHistory(account);
  const today = new Date().toISOString().split('T')[0];
  
  // Check if we already have an entry for today
  const todayIndex = history.findIndex(entry => entry.date === today);
  
  // Get yesterday's balance to compare
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split('T')[0];
  const yesterdayEntry = history.find(entry => entry.date === yesterdayStr);
  const previousBalance = yesterdayEntry ? yesterdayEntry.balance : (history.length > 0 ? history[history.length - 1].balance : newBalance);
  
  // Only update if balance actually changed (deposit or withdrawal)
  if (todayIndex >= 0) {
    const oldBalance = history[todayIndex].balance;
    // Update today's balance only if it changed
    if (Math.abs(oldBalance - newBalance) > 0.0001) {
      history[todayIndex].balance = parseFloat(newBalance.toFixed(4));
    }
  } else {
    // Add new entry for today with the new balance
    history.push({
      date: today,
      balance: parseFloat(newBalance.toFixed(4)),
    });
    
    // Keep only last 30 days
    if (history.length > 30) {
      history.shift();
    }
  }
  
  saveBalanceHistory(account, history);
  return history;
}

// Generate chart data from balance history - shows cumulative balance growth over time
function generateChartData(account, currentBalance) {
  let history = getBalanceHistory(account);
  const today = new Date().toISOString().split('T')[0];
  const todayDate = new Date();
  
  // If no history exists, initialize it
  if (history.length === 0) {
    // Initialize past 6 days with 0, today with current balance
    // This creates a baseline - future deposits will show as growth
    for (let i = 6; i >= 0; i--) {
      const date = new Date(todayDate);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      
      const balance = dateStr === today ? (currentBalance || 0) : 0;
      history.push({
        date: dateStr,
        balance: parseFloat(balance.toFixed(4)),
      });
    }
    history.sort((a, b) => new Date(a.date) - new Date(b.date));
    saveBalanceHistory(account, history);
  } else {
    // Check if we need to handle a new day (carry forward yesterday's balance)
    const yesterday = new Date(todayDate);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];
    const yesterdayEntry = history.find(entry => entry.date === yesterdayStr);
    
    const todayIndex = history.findIndex(entry => entry.date === today);
    
    // If it's a new day and we have yesterday's balance, carry it forward
    if (todayIndex < 0 && yesterdayEntry) {
      // New day - start with yesterday's balance, then update to current
      history.push({
        date: today,
        balance: parseFloat((currentBalance || 0).toFixed(4)),
      });
    } else if (todayIndex >= 0) {
      // Update today's balance - this is where growth happens
      // If balance increased, it shows as upward trend
      // If balance decreased, it shows as downward trend
      history[todayIndex].balance = parseFloat((currentBalance || 0).toFixed(4));
    } else {
      // No yesterday data, just add today
      history.push({
        date: today,
        balance: parseFloat((currentBalance || 0).toFixed(4)),
      });
    }
    
    // Clean up old entries (keep last 30 days)
    history.sort((a, b) => new Date(a.date) - new Date(b.date));
    const cutoffDate = new Date(todayDate);
    cutoffDate.setDate(cutoffDate.getDate() - 30);
    history = history.filter(entry => new Date(entry.date) >= cutoffDate);
    
    saveBalanceHistory(account, history);
  }
  
  // Generate data for the last 7 days in chronological order
  const data = [];
  
  for (let i = 6; i >= 0; i--) {
    const date = new Date(todayDate);
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];
    
    // Find balance for this specific date
    const historyEntry = history.find(entry => entry.date === dateStr);
    
    if (historyEntry) {
      // Use the stored balance for this date
      data.push({
        date: dateStr,
        balance: historyEntry.balance,
      });
    } else {
      // No entry for this date - use the most recent previous balance
      // This creates a flat line until the next recorded balance
      let previousBalance = 0;
      
      // Find the most recent balance before this date
      const sortedHistory = [...history].sort((a, b) => new Date(a.date) - new Date(b.date));
      const previousEntry = sortedHistory.filter(e => e.date < dateStr).pop();
      
      if (previousEntry) {
        previousBalance = previousEntry.balance;
      } else if (data.length > 0) {
        // Fallback to last data point we added
        previousBalance = data[data.length - 1].balance;
      }
      
      data.push({
        date: dateStr,
        balance: parseFloat(previousBalance.toFixed(4)),
      });
    }
  }
  
  // Ensure chronological order (oldest to newest)
  data.sort((a, b) => new Date(a.date) - new Date(b.date));
  
  return data;
}

export default function BalanceChart({ balance }) {
  const { account } = useAptos();
  const [chartData, setChartData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (account !== undefined && balance !== undefined) {
      // Generate chart data from balance history
      const data = generateChartData(account, balance);
      setChartData(data);
      setIsLoading(false);
    }
  }, [balance, account]);

  // Listen for balance updates to refresh chart
  useEffect(() => {
    const handleBalanceUpdate = () => {
      if (account !== undefined && balance !== undefined) {
        const data = generateChartData(account, balance);
        setChartData(data);
      }
    };

    window.addEventListener('balance-updated', handleBalanceUpdate);
    return () => {
      window.removeEventListener('balance-updated', handleBalanceUpdate);
    };
  }, [account, balance]);

  if (isLoading) {
    return (
      <div className="w-full h-full flex items-center justify-center min-h-[280px]">
        <Spinner />
      </div>
    );
  }

  const isEmpty = !chartData || chartData.length === 0;

  const displayData = isEmpty ? [] : chartData;
  const maxBalance = Math.max(...(displayData.map(d => d.balance) || [0]), 0);

  return (
    <div className="w-full h-full flex flex-col items-center justify-center overflow-hidden">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={displayData}
          margin={{
            bottom: 10,
            left: 5,
            right: 10,
            top: 10,
          }}
        >
          <defs>
            <linearGradient id="balanceGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#6366f1" stopOpacity={0.4} />
              <stop offset="50%" stopColor="#818cf8" stopOpacity={0.2} />
              <stop offset="100%" stopColor="#a5b4fc" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="balanceStroke" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#6366f1" />
              <stop offset="100%" stopColor="#818cf8" />
            </linearGradient>
          </defs>
          <CartesianGrid 
            strokeDasharray="3 3" 
            stroke="#e5e7eb" 
            vertical={false}
            opacity={0.5}
          />
          <XAxis 
            dataKey="date" 
            tickFormatter={(value) => dayjs(value).format("MMM DD")}
            style={{ fontSize: '11px', fill: '#6b7280' }}
            tickLine={false}
            axisLine={false}
            tickMargin={10}
          />
          <YAxis 
            tickFormatter={(value) => `${value.toFixed(2)}`}
            style={{ fontSize: '11px', fill: '#6b7280' }}
            tickLine={false}
            axisLine={false}
            width={60}
            domain={[0, maxBalance * 1.1 || 'auto']}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#6366f1', strokeWidth: 1, strokeDasharray: '5 5' }} />
          <Area
            type="monotone"
            dataKey="balance"
            stroke="url(#balanceStroke)"
            strokeWidth={2.5}
            fill="url(#balanceGradient)"
            fillOpacity={1}
            dot={{ fill: '#6366f1', strokeWidth: 2, r: 4 }}
            activeDot={{ r: 6, fill: '#6366f1', stroke: '#fff', strokeWidth: 2 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
const CustomTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    const data = payload[0];
    const date = data.payload.date;
    const balance = data.payload.balance;

    return (
      <div className="bg-white border border-gray-200 rounded-2xl p-4 max-w-xl flex flex-col items-start shadow-xl backdrop-blur-sm">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-3 h-3 rounded-full bg-gradient-to-r from-indigo-500 to-indigo-400"></div>
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
            {dayjs(date).format("MMM DD, YYYY")}
          </p>
        </div>
        <div className="flex items-baseline gap-2 mt-1">
          <p className="text-2xl font-bold text-gray-900">{balance.toFixed(4)}</p>
          <p className="text-sm font-semibold text-indigo-600">APT</p>
        </div>
      </div>
    );
  }
  return null;
};
