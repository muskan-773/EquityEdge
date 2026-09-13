import React from 'react';

/**
 * POSITIONS COMPONENT
 *
 * In real trading, "positions" refers to intraday trades (opened and closed
 * within the same day). In paper trading we simulate only delivery (holdings).
 *
 * This component is intentionally minimal but functional — it clearly
 * communicates scope rather than being an empty stub.
 */
const Positions = () => {
  return (
    <div className="card border-0 shadow-sm">
      <div className="card-header bg-white border-bottom">
        <h6 className="mb-0 fw-semibold">Positions</h6>
      </div>
      <div className="card-body text-center py-5 text-muted">
        <h6>No open positions</h6>
        <p className="small">
          EquityEdge supports delivery-based paper trading.
          Intraday positions are not tracked in this version.
        </p>
      </div>
    </div>
  );
};

export default Positions;
