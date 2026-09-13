import React from 'react';
import TopBar from './TopBar';
import Dashboard from './Dashboard';

/**
 * HOME COMPONENT — shell that holds TopBar + Dashboard
 * TopBar is sticky at top, Dashboard fills remaining height
 */
const Home = () => {
  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f8f9fa' }}>
      <TopBar />
      <Dashboard />
    </div>
  );
};

export default Home;
