import React from 'react';
import { Link } from 'react-router-dom';

function OpenAccount() {
  return ( 
    <div className='container text-center py-5'>
      <div className='row justify-content-center'>
        <div className='col-lg-8'>
          <h1 className='fw-semibold mb-3'>
            Open an EquityEdge account
          </h1>
          <p className='text-muted fs-5 mb-4'>
            Modern paper-trading platform, ₹0 commissions, and ₹10,00,000 in simulated funds to start.
          </p>
          {/* BUG FIXED: was <button> with no onClick — completely non-functional */}
          <Link to="/signup" className='btn btn-primary px-5 py-2 fs-5'>
            Sign up for free
          </Link>
        </div>
      </div>
    </div>
  );
}

export default OpenAccount;
