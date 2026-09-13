import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import Menu from './Menu';
import api from '../api/axiosInstance';
import { io } from 'socket.io-client';

/**
 * TOPBAR COMPONENT
 *
 * Displays:
 * - Simulated NIFTY50 and SENSEX indices (derived from portfolio stocks)
 * - Navigation menu
 * - User name + cash balance + logout button
 *
 * The "index" values here are simplified — we use TCS and RELIANCE as
 * proxy stocks to represent NIFTY50/SENSEX movement. In a real system,
 * you'd compute a weighted average of index constituents.
 * We label this clearly as "simulated" data.
 *
 * Socket.IO integration:
 * - On mount: connect to backend, join user's personal room
 * - Listen to 'prices:update' event → update index display
 * - Listen to 'portfolio:updated' event → refresh cash balance
 * - On unmount: disconnect (cleanup prevents memory leaks)
 *
 * Interview Q: "Why disconnect the socket in useEffect cleanup?"
 * A: Without cleanup, every re-render creates a new socket connection
 *    and the old one keeps running — memory leak + duplicate event listeners.
 *    The cleanup function in useEffect (the returned function) runs when
 *    the component unmounts OR before the effect re-runs.
 */
const TopBar = () => {
  const { user, logout, refreshUser } = useAuth();

  // Proxy index values (simulated from 2 benchmark stocks)
  const [indices, setIndices] = useState({
    NIFTY50: { value: 22456.80, change: 0, changePercent: 0 },
    SENSEX: { value: 73847.15, change: 0, changePercent: 0 },
  });

  useEffect(() => {
    const SOCKET_URL = process.env.REACT_APP_SOCKET_URL || 'http://localhost:5000';
    const socket = io(SOCKET_URL, { transports: ['websocket', 'polling'] });

    // Join personal room for portfolio events
    const storedUser = JSON.parse(localStorage.getItem('user') || '{}');
    if (storedUser._id) {
      socket.emit('join', storedUser._id);
    }

    // Listen for price updates from the simulator
    socket.on('prices:update', (priceMap) => {
      // Use RELIANCE as SENSEX proxy, TCS as NIFTY proxy
      const niftyProxy = priceMap['TCS'];
      const sensexProxy = priceMap['RELIANCE'];

      setIndices((prev) => ({
        NIFTY50: niftyProxy
          ? {
              value: parseFloat((prev.NIFTY50.value * (1 + niftyProxy.dayChangePercent / 100)).toFixed(2)),
              change: niftyProxy.dayChange,
              changePercent: niftyProxy.dayChangePercent,
            }
          : prev.NIFTY50,
        SENSEX: sensexProxy
          ? {
              value: parseFloat((prev.SENSEX.value * (1 + sensexProxy.dayChangePercent / 100)).toFixed(2)),
              change: sensexProxy.dayChange,
              changePercent: sensexProxy.dayChangePercent,
            }
          : prev.SENSEX,
      }));
    });

    // Listen for portfolio updates (after a buy/sell)
    socket.on('portfolio:updated', (data) => {
      refreshUser(); // Refresh user data to get updated cashBalance
    });

    return () => {
      socket.disconnect();
    };
  }, [refreshUser]);

  const formatINR = (amount) =>
    new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 2,
    }).format(amount);

  const IndexDisplay = ({ label, value, changePercent }) => {
    const isPositive = changePercent >= 0;
    return (
      <div className="me-4">
        <span className="text-muted small me-1">{label}</span>
        <span className="fw-semibold">{value.toLocaleString('en-IN')}</span>
        <span className={`ms-1 small ${isPositive ? 'text-success' : 'text-danger'}`}>
          {isPositive ? '▲' : '▼'} {Math.abs(changePercent).toFixed(2)}%
        </span>
      </div>
    );
  };

  return (
    <div
      className="topbar-container d-flex justify-content-between align-items-center px-3 py-2 border-bottom bg-white"
      style={{ position: 'sticky', top: 0, zIndex: 100 }}
    >
      {/* Left: Market indices (simulated) */}
      <div className="d-flex align-items-center">
        <IndexDisplay
          label="NIFTY 50*"
          value={indices.NIFTY50.value}
          changePercent={indices.NIFTY50.changePercent}
        />
        <IndexDisplay
          label="SENSEX*"
          value={indices.SENSEX.value}
          changePercent={indices.SENSEX.changePercent}
        />
        <span className="text-muted" style={{ fontSize: '10px' }}>*Simulated</span>
      </div>

      {/* Center: Navigation Menu */}
      <Menu />

      {/* Right: User info + logout */}
      <div className="d-flex align-items-center gap-3">
        {user && (
          <>
            <div className="text-end">
              <div className="fw-semibold small">{user.name}</div>
              <div className="text-success small fw-medium">
                {formatINR(user.cashBalance)}
              </div>
            </div>
            <button
              className="btn btn-outline-secondary btn-sm"
              onClick={logout}
            >
              Logout
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default TopBar;
