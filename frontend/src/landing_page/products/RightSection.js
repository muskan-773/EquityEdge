import React from 'react'

function RightSection({imageURL,
  productName,
  productDesription,
  learnMore,}) {
  return ( 
    <div className="container">
      <div className="row">
        <div className="col-6 p-5">
          <img src={imageURL}></img>
        </div>
        <div className="col-6 p-5 mt-5">
          <h1>{productName}</h1>
          <p>{productDesription}</p>
          <div className="">
            <a href={learnMore} style={{marginLeft:"50px", textDecoration:"none"}}>Learn More<i className="fa fa-long-arrow-right ms-2" aria-hidden="true"></i></a>
          </div>
        </div>
      </div>
    </div>
   );
}

export default RightSection;