import React from 'react';

function Hero() {
  return ( 
    <div className='container text-center mt-5 mb-5'>
      
      <div className='row justify-content-center'>
        <div className='col-12'>

          {/* Image */}
          <img 
            src='/media/image/landing.svg' 
            className='img-fluid mb-5'
            style={{ maxWidth: '70%' }} 
            alt="Landing"
          />

          {/* Heading */}
          <h1 className='fw-semibold mb-3'>
            Invest in everything
          </h1>

          {/* Subheading */}
          <p className='text-muted fs-5 mb-4'>
            Online platform to invest in stocks, derivatives, mutual funds,
            ETFs, bonds, and more.
          </p>

          {/* Button */}
          <button 
            className="btn btn-primary px-5 py-2 fs-5"
          >
            Sign up for free
          </button>

        </div>
      </div>

    </div>
  );
}

export default Hero;