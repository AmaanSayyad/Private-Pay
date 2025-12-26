// TransactionHistory Component
// Displays Aleo transaction history with explorer links

import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardBody, CardHeader, Button, Chip, Tooltip, Select, SelectItem, Input, Pagination } from '@nextui-org/react';
import { ExternalLink, Clock, CheckCircle2, AlertCircle, Search, RefreshCw, Trash2, Copy } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { transactionWrapper, txUtils } from '../../lib/aleo/transactionWrapper';
import toast from 'react-hot-toast';

const OPERATION_FILTERS = [
  { value: 'all', label: 'All Operations' },
  { value: 'dark_pool', label: 'Dark Pool' },
  { value: 'amm', label: 'AMM/Swap' },
  { value: 'lending', label: 'Lending' },
  { value: 'credit', label: 'Credit' },
  { value: 'treasury', label: 'Treasury' },
];

const STATUS_COLORS = {
  confirmed: 'success',
  pending: 'warning',
  failed: 'danger',
  unknown: 'default',
};

export default function TransactionHistory({ limit = 10, showFilters = true, compact = false }) {
  const [transactions, setTransactions] = useState([]);
  const [filter, setFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const itemsPerPage = limit;

  // Load transactions on mount
  useEffect(() => {
    loadTransactions();
  }, []);

  const loadTransactions = () => {
    const history = transactionWrapper.getHistory();
    setTransactions(history);
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    loadTransactions();
    // Check status of pending transactions
    const pending = transactions.filter(tx => tx.status === 'pending');
    for (const tx of pending) {
      try {
        const status = await transactionWrapper.checkTransactionStatus(tx.txHash);
        if (status.status !== 'pending') {
          loadTransactions(); // Reload if status changed
        }
      } catch (error) {
        console.warn('Could not check tx status:', error);
      }
    }
    setTimeout(() => setIsRefreshing(false), 500);
    toast.success('Transaction history refreshed');
  };

  const handleClearHistory = () => {
    if (window.confirm('Are you sure you want to clear all transaction history?')) {
      transactionWrapper.clearHistory();
      setTransactions([]);
      toast.success('Transaction history cleared');
    }
  };

  const copyTxHash = (txHash) => {
    navigator.clipboard.writeText(txHash);
    toast.success('Transaction hash copied!');
  };

  const openExplorer = (explorerLink) => {
    window.open(explorerLink, '_blank', 'noopener,noreferrer');
  };

  // Filter transactions
  const filteredTransactions = useMemo(() => {
    let filtered = [...transactions];

    // Apply operation type filter
    if (filter !== 'all') {
      filtered = filtered.filter(tx => 
        tx.operationType?.toLowerCase().includes(filter.toLowerCase())
      );
    }

    // Apply search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(tx =>
        tx.txHash?.toLowerCase().includes(query) ||
        tx.operationType?.toLowerCase().includes(query) ||
        txUtils.getOperationDisplayName(tx.operationType)?.toLowerCase().includes(query)
      );
    }

    return filtered;
  }, [transactions, filter, searchQuery]);

  // Paginate
  const totalPages = Math.ceil(filteredTransactions.length / itemsPerPage);
  const paginatedTransactions = filteredTransactions.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const formatTimeAgo = (timestamp) => {
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  if (compact) {
    return (
      <div className="space-y-2">
        {paginatedTransactions.length === 0 ? (
          <p className="text-gray-500 text-sm text-center py-4">No transactions yet</p>
        ) : (
          paginatedTransactions.map((tx, index) => (
            <motion.div
              key={tx.txHash}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="flex items-center justify-between p-2 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <div className="flex items-center gap-2">
                <Chip size="sm" color={STATUS_COLORS[tx.status]} variant="flat">
                  {tx.status}
                </Chip>
                <span className="text-sm font-medium">
                  {txUtils.getOperationDisplayName(tx.operationType)}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500">{formatTimeAgo(tx.timestamp)}</span>
                <Tooltip content="View on Explorer">
                  <Button
                    isIconOnly
                    size="sm"
                    variant="light"
                    onClick={() => openExplorer(tx.explorerLink)}
                  >
                    <ExternalLink size={14} />
                  </Button>
                </Tooltip>
              </div>
            </motion.div>
          ))
        )}
      </div>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader className="flex flex-col gap-4 pb-0">
        <div className="flex justify-between items-center w-full">
          <h3 className="text-lg font-semibold">Transaction History</h3>
          <div className="flex gap-2">
            <Tooltip content="Refresh">
              <Button
                isIconOnly
                size="sm"
                variant="light"
                onClick={handleRefresh}
                isLoading={isRefreshing}
              >
                <RefreshCw size={16} className={isRefreshing ? 'animate-spin' : ''} />
              </Button>
            </Tooltip>
            <Tooltip content="Clear History">
              <Button
                isIconOnly
                size="sm"
                variant="light"
                color="danger"
                onClick={handleClearHistory}
              >
                <Trash2 size={16} />
              </Button>
            </Tooltip>
          </div>
        </div>

        {showFilters && (
          <div className="flex gap-3 w-full">
            <Input
              placeholder="Search by TX hash or operation..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              startContent={<Search size={16} className="text-gray-400" />}
              size="sm"
              className="flex-1"
            />
            <Select
              selectedKeys={[filter]}
              onChange={(e) => setFilter(e.target.value)}
              size="sm"
              className="w-40"
            >
              {OPERATION_FILTERS.map((op) => (
                <SelectItem key={op.value} value={op.value}>
                  {op.label}
                </SelectItem>
              ))}
            </Select>
          </div>
        )}
      </CardHeader>

      <CardBody>
        <AnimatePresence mode="wait">
          {paginatedTransactions.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-center py-8"
            >
              <Clock size={48} className="mx-auto text-gray-300 mb-3" />
              <p className="text-gray-500">No transactions found</p>
              <p className="text-gray-400 text-sm">Your transaction history will appear here</p>
            </motion.div>
          ) : (
            <div className="space-y-3">
              {paginatedTransactions.map((tx, index) => (
                <motion.div
                  key={tx.txHash}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ delay: index * 0.05 }}
                  className="border border-gray-200 rounded-xl p-4 hover:border-primary/50 transition-colors"
                >
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center gap-2">
                      {tx.status === 'confirmed' ? (
                        <CheckCircle2 size={18} className="text-success" />
                      ) : tx.status === 'pending' ? (
                        <Clock size={18} className="text-warning animate-pulse" />
                      ) : (
                        <AlertCircle size={18} className="text-danger" />
                      )}
                      <span className="font-semibold">
                        {txUtils.getOperationDisplayName(tx.operationType)}
                      </span>
                      <Chip size="sm" color={STATUS_COLORS[tx.status]} variant="flat">
                        {tx.status}
                      </Chip>
                    </div>
                    <span className="text-sm text-gray-500">
                      {formatTimeAgo(tx.timestamp)}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-sm mb-3">
                    <div>
                      <span className="text-gray-500">TX Hash:</span>
                      <div className="flex items-center gap-1 mt-1">
                        <code className="bg-gray-100 px-2 py-1 rounded text-xs">
                          {txUtils.formatTxHash(tx.txHash)}
                        </code>
                        <Tooltip content="Copy full hash">
                          <Button
                            isIconOnly
                            size="sm"
                            variant="light"
                            onClick={() => copyTxHash(tx.txHash)}
                          >
                            <Copy size={12} />
                          </Button>
                        </Tooltip>
                      </div>
                    </div>
                    <div>
                      <span className="text-gray-500">Block Height:</span>
                      <p className="font-mono mt-1">{tx.blockHeight?.toLocaleString() || 'Pending'}</p>
                    </div>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-400">
                      {txUtils.formatTimestamp(tx.timestamp)}
                    </span>
                    <Button
                      size="sm"
                      color="primary"
                      variant="flat"
                      endContent={<ExternalLink size={14} />}
                      onClick={() => openExplorer(tx.explorerLink)}
                    >
                      View on Explorer
                    </Button>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </AnimatePresence>

        {totalPages > 1 && (
          <div className="flex justify-center mt-4">
            <Pagination
              total={totalPages}
              page={currentPage}
              onChange={setCurrentPage}
              size="sm"
            />
          </div>
        )}
      </CardBody>
    </Card>
  );
}
