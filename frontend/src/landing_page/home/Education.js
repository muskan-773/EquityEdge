import React from 'react';

function Education() {
  return ( 
    <div className='container mt-5'>
      <div className='row'>
        
        {/* Left Side */}
        <div className='col-6 '>
          <img src='/media/image/education.svg' style={{width:"70%"}}></img>
        </div>

        {/* Right Side */}
        <div className='col-6'>
          <h1 className='mb-5 fs-2'>
            Free and open market education
          </h1>

          <p >
            Varsity, the largest online stock market education book in the world 
            covering everything from the basics to advanced trading.
          </p>

          <a 
            href="#" 
            className='d-inline-block mb-4' 
            style={{ textDecoration: "none" }}
          >
            Varsity 
            <i className="fa fa-long-arrow-right ms-2" aria-hidden="true"></i>
          </a>

          <p className='mt-4'>
            TradingQ&amp;A, the most active trading and investment community in 
            India for all your market related queries.
          </p>

          <a 
            href="#" 
            style={{ textDecoration: "none" }}
          >
            TradingQ&amp;A 
            <i className="fa fa-long-arrow-right ms-2" aria-hidden="true"></i>
          </a>
        </div>

      </div>
    </div>
  );
}

export default Education;