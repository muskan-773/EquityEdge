import React from 'react';

function OpenAccount() {
  return ( 
    <div className='container text-center py-5'>

      <div className='row justify-content-center'>
        <div className='col-lg-8'>

          <h1 className='fw-semibold mb-3'>
            Open a Zerodha account
          </h1>

          <p className='text-muted fs-5 mb-4'>
            Modern platforms and apps, ₹0 investments, and flat ₹20 intraday and F&amp;O trades.
          </p>

          <button 
            className='btn btn-primary px-5 py-2 fs-5'
          >
            Sign up for free
          </button>

        </div>
      </div>

    </div>
  );
}

export default OpenAccount;