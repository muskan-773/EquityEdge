import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Summary from './Summary';
import Positions from './Positions';
import Holdings from './Holdings';
import Orders from './Orders';
import Funds from './Funds';
import WatchList from './WatchList';

/**
 * DASHBOARD COMPONENT — Fixed
 *
 * Bugs fixed:
 * 1. <watchList /> → <WatchList />  (lowercase JSX = DOM element, not component)
 * 2. /postitions   → /positions     (typo in route path)
 * 3. exact prop removed             (not valid in React Router v6; all routes exact by default)
 * 4. WatchList is now imported and properly rendered
 *
 * Layout:
 * ┌─────────────────────────────────────────────────────────────┐
 * │ TopBar (sticky, rendered in Home.js)                        │
 * ├──────────────┬──────────────────────────────────────────────┤
 * │              │                                              │
 * │  WatchList   │  Content Area (route-dependent)              │
 * │  (sidebar)   │  /dashboard  → Summary                       │
 * │              │  /orders     → Orders                        │
 * │              │  /holdings   → Holdings                      │
 * │              │  /positions  → Positions                     │
 * │              │  /funds      → Funds                         │
 * │              │                                              │
 * └──────────────┴──────────────────────────────────────────────┘
 */
const Dashboard = () => {
  return (
    <div className="dashboard-container d-flex" style={{ minHeight: 'calc(100vh - 56px)' }}>
      {/* Watchlist sidebar */}
      <aside className="watchlist-sidebar border-end bg-white" style={{ width: '280px', minWidth: '280px' }}>
        <WatchList />
      </aside>

      {/* Main content area */}
      <main className="content flex-grow-1 p-4 bg-light">
        <Routes>
          {/* Default route: redirect / to /dashboard */}
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<Summary />} />
          <Route path="orders" element={<Orders />} />
          <Route path="holdings" element={<Holdings />} />
          <Route path="positions" element={<Positions />} />  {/* FIXED: was /postitions */}
          <Route path="funds" element={<Funds />} />
          <Route path="*" element={<Navigate to="dashboard" replace />} />
        </Routes>
      </main>
    </div>
  );
};

export default Dashboard;
