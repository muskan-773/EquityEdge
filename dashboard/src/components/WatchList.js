import React, { useState, useEffect, useCallback } from 'react';
import { io } from 'socket.io-client';
import api from '../api/axiosInstance';

/**
 * WATCHLIST COMPONENT — Fully Implemented
 *
 * Previously: returned <h1></h1> (empty stub)
 * Now:
 * - Fetches user's watchlist from GET /api/watchlist
 * - Updates prices in real-time via Socket.IO 'prices:update' event
 * - Add stock: POST /api/watchlist
 * - Remove stock: DELETE /api/watchlist/:symbol
 *
 * Real-time update pattern:
 * 1. Component mounts → fetch initial watchlist from API
 * 2. Socket.IO connects → listens for 'prices:update'
 * 3. On price event → update only the stocks in our watchlist
 *    (don't re-render the whole list, just update the prices)
 *
 * Interview Q: "Why not refetch the watchlist from the API on every price update?"
 * A: That would be a GET /api/watchlist request every 5 seconds — 12 DB queries
 *    per minute per user. Instead, the initial fetch gives us the stock list,
 *    and Socket.IO gives us just the price changes. We merge them in state.
 *    This is the correct architecture: REST for initial data, WebSocket for updates.
 */
const WatchList = () => {
  const [stocks, setStocks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [addSymbol, setAddSymbol] = useState('');
  const [addError, setAddError] = useState('');
  const [addLoading, setAddLoading] = useState(false);

  // Fetch initial watchlist from API
  const fetchWatchlist = useCallback(async () => {
    try {
      setLoading(true);
      const { data } = await api.get('/watchlist');
      setStocks(data.data.stocks);
      setError('');
    } catch (err) {
      setError('Failed to load watchlist');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchWatchlist();
  }, [fetchWatchlist]);

  // Socket.IO: update prices for watched stocks
  useEffect(() => {
    const SOCKET_URL = process.env.REACT_APP_SOCKET_URL || 'http://localhost:5000';
    const socket = io(SOCKET_URL, { transports: ['websocket', 'polling'] });

    socket.on('prices:update', (priceMap) => {
      setStocks((prevStocks) =>
        prevStocks.map((stock) => {
          const update = priceMap[stock.symbol];
          if (!update) return stock;
          return {
            ...stock,
            currentPrice: update.currentPrice,
            dayChange: update.dayChange,
            dayChangePercent: update.dayChangePercent,
          };
        })
      );
    });

    return () => socket.disconnect();
  }, []);

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!addSymbol.trim()) return;
    setAddLoading(true);
    setAddError('');

    try {
      await api.post('/watchlist', { symbol: addSymbol.trim().toUpperCase() });
      setAddSymbol('');
      fetchWatchlist(); // Refresh to get the newly added stock
    } catch (err) {
      setAddError(err.response?.data?.message || 'Failed to add stock');
    } finally {
      setAddLoading(false);
    }
  };

  const handleRemove = async (symbol) => {
    try {
      await api.delete(`/watchlist/${symbol}`);
      setStocks((prev) => prev.filter((s) => s.symbol !== symbol));
    } catch {
      // Silent failure — the stock will still show until next refresh
    }
  };

  return (
    <div className="watchlist p-2" style={{ height: '100%', overflowY: 'auto' }}>
      <div className="d-flex justify-content-between align-items-center px-2 py-2 border-bottom">
        <span className="fw-semibold text-muted small text-uppercase">Watchlist</span>
        <span className="badge bg-secondary rounded-pill">{stocks.length}</span>
      </div>

      {/* Add stock form */}
      <form onSubmit={handleAdd} className="p-2">
        <div className="input-group input-group-sm">
          <input
            type="text"
            className="form-control"
            placeholder="Add symbol (e.g. TCS)"
            value={addSymbol}
            onChange={(e) => {
              setAddSymbol(e.target.value.toUpperCase());
              setAddError('');
            }}
            maxLength={10}
            aria-label="Stock symbol to add"
          />
          <button
            type="submit"
            className="btn btn-outline-primary"
            disabled={addLoading}
            aria-label="Add to watchlist"
          >
            {addLoading ? '...' : '+'}
          </button>
        </div>
        {addError && <div className="text-danger small mt-1">{addError}</div>}
      </form>

      {/* Loading state */}
      {loading && (
        <div className="text-center py-4">
          <div className="spinner-border spinner-border-sm text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
        </div>
      )}

      {/* Error state */}
      {error && !loading && (
        <div className="text-danger small px-2">{error}</div>
      )}

      {/* Empty state */}
      {!loading && !error && stocks.length === 0 && (
        <div className="text-center text-muted py-4 small px-2">
          <p>Your watchlist is empty.</p>
          <p>Add stocks using their NSE symbol (e.g. TCS, INFY)</p>
        </div>
      )}

      {/* Stock list */}
      {stocks.map((stock) => {
        const isPositive = stock.dayChangePercent >= 0;
        return (
          <div
            key={stock.symbol}
            className="watchlist-item d-flex justify-content-between align-items-center px-2 py-2 border-bottom"
            style={{ cursor: 'pointer' }}
          >
            <div>
              <div className="fw-semibold small">{stock.symbol}</div>
              <div className="text-muted" style={{ fontSize: '11px' }}>{stock.name}</div>
            </div>
            <div className="text-end">
              <div className="fw-medium small">
                ₹{stock.currentPrice?.toFixed(2) ?? '—'}
              </div>
              <div
                className={`small ${isPositive ? 'text-success' : 'text-danger'}`}
                style={{ fontSize: '11px' }}
              >
                {isPositive ? '▲' : '▼'} {Math.abs(stock.dayChangePercent ?? 0).toFixed(2)}%
              </div>
            </div>
            <button
              className="btn btn-link btn-sm text-muted p-0 ms-2"
              onClick={() => handleRemove(stock.symbol)}
              aria-label={`Remove ${stock.symbol} from watchlist`}
              title="Remove"
            >
              ×
            </button>
          </div>
        );
      })}
    </div>
  );
};

export default WatchList;
