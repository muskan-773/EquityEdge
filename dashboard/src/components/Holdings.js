import React, { useState, useEffect, useCallback } from 'react';
import api from '../api/axiosInstance';

/**
 * HOLDINGS COMPONENT — Upgraded from hardcoded data to real API
 *
 * Previously: hardcoded array of 2 fake stocks, key={index} anti-pattern
 * Now:
 * - Fetches from GET /api/portfolio/holdings
 * - Real P&L calculations from backend
 * - Proper loading/error/empty states
 * - key={stock.symbol} instead of key={index}
 * - Currency formatted with Intl.NumberFormat
 *
 * Interview Q: "Why use Intl.NumberFormat instead of toFixed(2)?"
 * A: Intl.NumberFormat produces locale-aware formatting. For Indian users,
 *    ₹12,34,567.89 (Indian numbering system with lakh grouping) instead
 *    of $1,234,567.89. It handles currency symbol, decimal separator,
 *    and thousand separators automatically per locale.
 */
const Holdings = () => {
  const [holdings, setHoldings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const formatINR = (amount) =>
    new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 2,
    }).format(amount);

  const fetchHoldings = useCallback(async () => {
    try {
      setLoading(true);
      const { data } = await api.get('/portfolio/holdings');
      setHoldings(data.data.holdings);
      setError('');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load holdings');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHoldings();
  }, [fetchHoldings]);

  if (loading) {
    return (
      <div className="d-flex justify-content-center py-5">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading holdings...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="alert alert-danger" role="alert">
        {error}
        <button className="btn btn-sm btn-outline-danger ms-3" onClick={fetchHoldings}>
          Retry
        </button>
      </div>
    );
  }

  if (holdings.length === 0) {
    return (
      <div className="text-center py-5 text-muted">
        <h5>No holdings yet</h5>
        <p>Buy stocks from the market to see them here.</p>
      </div>
    );
  }

  // Compute totals for summary row
  const totalInvested = holdings.reduce((sum, h) => sum + h.investedValue, 0);
  const totalCurrent = holdings.reduce((sum, h) => sum + (h.currentValue || 0), 0);
  const totalPL = totalCurrent - totalInvested;
  const totalPLPercent = totalInvested > 0 ? (totalPL / totalInvested) * 100 : 0;

  return (
    <div>
      {/* Summary strip */}
      <div className="row g-3 mb-4">
        <div className="col-md-3">
          <div className="card border-0 bg-white shadow-sm p-3">
            <div className="text-muted small">Total Invested</div>
            <div className="fw-bold fs-6">{formatINR(totalInvested)}</div>
          </div>
        </div>
        <div className="col-md-3">
          <div className="card border-0 bg-white shadow-sm p-3">
            <div className="text-muted small">Current Value</div>
            <div className="fw-bold fs-6">{formatINR(totalCurrent)}</div>
          </div>
        </div>
        <div className="col-md-3">
          <div className="card border-0 bg-white shadow-sm p-3">
            <div className="text-muted small">Total P&L</div>
            <div className={`fw-bold fs-6 ${totalPL >= 0 ? 'text-success' : 'text-danger'}`}>
              {totalPL >= 0 ? '+' : ''}{formatINR(totalPL)}
            </div>
          </div>
        </div>
        <div className="col-md-3">
          <div className="card border-0 bg-white shadow-sm p-3">
            <div className="text-muted small">Return</div>
            <div className={`fw-bold fs-6 ${totalPLPercent >= 0 ? 'text-success' : 'text-danger'}`}>
              {totalPLPercent >= 0 ? '+' : ''}{totalPLPercent.toFixed(2)}%
            </div>
          </div>
        </div>
      </div>

      {/* Holdings table */}
      <div className="card border-0 shadow-sm">
        <div className="card-header bg-white border-bottom">
          <h6 className="mb-0 fw-semibold">
            Holdings <span className="text-muted fw-normal">({holdings.length})</span>
          </h6>
        </div>
        <div className="table-responsive">
          <table className="table table-hover mb-0">
            <thead className="table-light">
              <tr>
                <th className="small text-muted fw-medium">Instrument</th>
                <th className="small text-muted fw-medium text-end">Qty</th>
                <th className="small text-muted fw-medium text-end">Avg. Cost</th>
                <th className="small text-muted fw-medium text-end">LTP</th>
                <th className="small text-muted fw-medium text-end">Cur. Value</th>
                <th className="small text-muted fw-medium text-end">P&L</th>
                <th className="small text-muted fw-medium text-end">Net Chg.</th>
                <th className="small text-muted fw-medium text-end">Day Chg.</th>
              </tr>
            </thead>
            <tbody>
              {holdings.map((stock) => {
                const pl = stock.profitLoss ?? 0;
                const plPct = stock.profitLossPercent ?? 0;
                const dayChg = stock.dayChangePercent ?? 0;
                const isProfit = pl >= 0;
                const isDayPositive = dayChg >= 0;

                return (
                  // KEY: use symbol (unique business identifier), not array index
                  // Using index as key causes React to incorrectly reuse DOM nodes
                  // when items are reordered or removed.
                  <tr key={stock.symbol}>
                    <td>
                      <div className="fw-semibold small">{stock.symbol}</div>
                      <div className="text-muted" style={{ fontSize: '11px' }}>{stock.stockName}</div>
                    </td>
                    <td className="text-end small">{stock.quantity}</td>
                    <td className="text-end small">₹{stock.averageBuyPrice?.toFixed(2)}</td>
                    <td className="text-end small">₹{stock.currentPrice?.toFixed(2) ?? '—'}</td>
                    <td className="text-end small">{formatINR(stock.currentValue ?? 0)}</td>
                    <td className={`text-end small fw-medium ${isProfit ? 'text-success' : 'text-danger'}`}>
                      {isProfit ? '+' : ''}{formatINR(pl)}
                      <div style={{ fontSize: '10px' }}>
                        ({isProfit ? '+' : ''}{plPct.toFixed(2)}%)
                      </div>
                    </td>
                    <td className={`text-end small ${isProfit ? 'text-success' : 'text-danger'}`}>
                      {isProfit ? '+' : ''}{plPct.toFixed(2)}%
                    </td>
                    <td className={`text-end small ${isDayPositive ? 'text-success' : 'text-danger'}`}>
                      {isDayPositive ? '+' : ''}{dayChg.toFixed(2)}%
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Holdings;
