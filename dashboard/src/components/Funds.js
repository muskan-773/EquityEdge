import React, { useState, useEffect } from 'react';
import api from '../api/axiosInstance';
import { useAuth } from '../context/AuthContext';

/**
 * FUNDS COMPONENT — Fixed
 *
 * Bugs fixed:
 * 1. <Link> without `to` prop → removed Link entirely (not needed here)
 * 2. btn-green / btn-blue (non-Bootstrap classes) → proper Bootstrap classes
 * 3. Hardcoded values → fetched from real portfolio API
 *
 * This shows the user's real paper-trading cash balance from the database.
 */
const Funds = () => {
  const { user } = useAuth();
  const [portfolio, setPortfolio] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPortfolio = async () => {
      try {
        const { data } = await api.get('/portfolio');
        setPortfolio(data.data.summary);
      } catch {
        // Use user context as fallback
      } finally {
        setLoading(false);
      }
    };
    fetchPortfolio();
  }, []);

  const formatINR = (amount) =>
    new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 2,
    }).format(amount ?? 0);

  const cashBalance = portfolio?.cashBalance ?? user?.cashBalance ?? 0;
  const investedValue = portfolio?.investedValue ?? 0;

  return (
    <div>
      <div className="d-flex align-items-center justify-content-between mb-4">
        <div>
          <h5 className="fw-bold mb-0">Funds</h5>
          <p className="text-muted small mb-0">Paper trading balance — simulated funds</p>
        </div>
        {/* Buttons are informational only — no real fund transfer in paper trading */}
        <div className="d-flex gap-2">
          <button className="btn btn-success btn-sm" disabled title="Not available in paper trading">
            Add Funds
          </button>
          <button className="btn btn-primary btn-sm" disabled title="Not available in paper trading">
            Withdraw
          </button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-4">
          <div className="spinner-border spinner-border-sm text-primary" role="status" />
        </div>
      ) : (
        <div className="card border-0 shadow-sm">
          <div className="card-header bg-white border-bottom">
            <span className="fw-semibold small">Equity (Paper Trading)</span>
          </div>
          <div className="card-body">
            {[
              { label: 'Available Cash', value: cashBalance, highlight: true },
              { label: 'Invested in Stocks', value: investedValue, highlight: false },
              { label: 'Used Margin', value: investedValue, highlight: false },
            ].map(({ label, value, highlight }) => (
              <div
                key={label}
                className="d-flex justify-content-between align-items-center py-2 border-bottom"
              >
                <span className="small text-muted">{label}</span>
                <span className={`small fw-semibold ${highlight ? 'text-success' : ''}`}>
                  {formatINR(value)}
                </span>
              </div>
            ))}
            <div className="mt-3 p-3 bg-light rounded">
              <div className="text-muted small">
                💡 This is a paper trading platform. Your starting balance is{' '}
                <strong>₹10,00,000</strong>. No real money is involved.
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Funds;
