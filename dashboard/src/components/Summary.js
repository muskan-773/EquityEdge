import React, { useState, useEffect, useCallback } from 'react';
import api from '../api/axiosInstance';
import { useAuth } from '../context/AuthContext';

/**
 * SUMMARY / PORTFOLIO DASHBOARD COMPONENT
 * Previously: empty <h1></h1>
 * Now: Full portfolio overview with P&L summary cards
 */
const Summary = () => {
  const { user } = useAuth();
  const [portfolio, setPortfolio] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const formatINR = (amount) =>
    new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 2,
    }).format(amount ?? 0);

  const fetchPortfolio = useCallback(async () => {
    try {
      setLoading(true);
      const { data } = await api.get('/portfolio');
      setPortfolio(data.data.summary);
      setError('');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load portfolio');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPortfolio();
  }, [fetchPortfolio]);

  if (loading) {
    return (
      <div className="d-flex justify-content-center py-5">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="alert alert-danger" role="alert">
        {error}
        <button className="btn btn-sm btn-outline-danger ms-2" onClick={fetchPortfolio}>
          Retry
        </button>
      </div>
    );
  }

  const p = portfolio || {};
  const isProfit = (p.totalProfitLoss ?? 0) >= 0;
  const isTodayProfit = (p.todayProfitLoss ?? 0) >= 0;

  return (
    <div>
      <div className="mb-4">
        <h5 className="fw-bold mb-0">Good day, {user?.name?.split(' ')[0]} 👋</h5>
        <p className="text-muted small mb-0">Here's your portfolio summary</p>
      </div>

      {/* Summary Cards */}
      <div className="row g-3 mb-4">
        <div className="col-md-4">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-body">
              <div className="text-muted small mb-1">Total Portfolio Value</div>
              <div className="fw-bold fs-5">{formatINR(p.totalPortfolioValue)}</div>
              <div className="text-muted small mt-1">
                {formatINR(p.cashBalance)} cash + {formatINR(p.currentValue)} stocks
              </div>
            </div>
          </div>
        </div>

        <div className="col-md-4">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-body">
              <div className="text-muted small mb-1">Total P&L</div>
              <div className={`fw-bold fs-5 ${isProfit ? 'text-success' : 'text-danger'}`}>
                {isProfit ? '+' : ''}{formatINR(p.totalProfitLoss)}
              </div>
              <div className={`small ${isProfit ? 'text-success' : 'text-danger'}`}>
                {isProfit ? '▲' : '▼'} {Math.abs(p.totalPLPercent ?? 0).toFixed(2)}%
              </div>
            </div>
          </div>
        </div>

        <div className="col-md-4">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-body">
              <div className="text-muted small mb-1">Today's P&L</div>
              <div className={`fw-bold fs-5 ${isTodayProfit ? 'text-success' : 'text-danger'}`}>
                {isTodayProfit ? '+' : ''}{formatINR(p.todayProfitLoss)}
              </div>
              <div className="text-muted small">{p.holdingsCount ?? 0} stocks held</div>
            </div>
          </div>
        </div>
      </div>

      {/* Balance breakdown */}
      <div className="card border-0 shadow-sm">
        <div className="card-header bg-white border-bottom">
          <h6 className="mb-0 fw-semibold">Balance Breakdown</h6>
        </div>
        <div className="card-body">
          <div className="row">
            {[
              { label: 'Available Cash', value: p.cashBalance, color: 'text-primary' },
              { label: 'Invested Value', value: p.investedValue, color: 'text-secondary' },
              { label: 'Current Market Value', value: p.currentValue, color: isProfit ? 'text-success' : 'text-danger' },
            ].map(({ label, value, color }) => (
              <div className="col-md-4 mb-2" key={label}>
                <div className="text-muted small">{label}</div>
                <div className={`fw-semibold ${color}`}>{formatINR(value)}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Summary;
