import React from 'react'

function Pricing() {
  return ( 
    <div className='container mb-5'>
      <div className='row'>
        <div className='col-4'>
          
          <h1 className='mb-3 fs-2'>Unbeatable pricing</h1>
          <p>We pioneered the concept of discount broking and price transparency in India. Flat fees and no hidden charges.</p>
          <a href=''className='mx-5' style={{textDecoration:"none"}}>See pricing<i className="fa fa-long-arrow-right" aria-hidden="true"></i></a>
        </div>
        <div className='col-2'></div>
        <div className='col-6'>
          <div className='row text-center'>
            <div className='col p-2 border'>
              <img src='/media/image/pricing-eq.svg' style={{width: '90%'}}/>
              <p>Free account<br/>opening</p>
            </div>
            <div className='col p-2 border'>
            <img src='/media/image/pricing-eq-2.svg' style={{width: '90%'}}/>
              <p>Free equity delivery <br/>
              and direct mutual fund</p>
            </div>
            <div className='col p-2 border'>
            <img src='/media/image/other-trades.svg' style={{width: '90%'}}/>
              <p> Intraday and <br/>
              F&O</p>
            </div>
          </div>
        </div>
      </div>
    </div>
   );
}

export default Pricing;