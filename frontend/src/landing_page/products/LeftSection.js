import React from "react";

function LeftSection({
  imageURL,
  productName,
  productDesription,
  tryDemo,
  learnMore,
  googlePlayStore,
  AppleAppStore,
}) {
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
            <a href={tryDemo} style={{textDecoration:"none"}}>Try Demo<i className="fa fa-long-arrow-right ms-2" aria-hidden="true"></i></a>
            <a href={learnMore} style={{marginLeft:"50px", textDecoration:"none"}}>Learn More<i className="fa fa-long-arrow-right ms-2" aria-hidden="true"></i></a>
          </div>
          <div className="mt-3">
            <a href={googlePlayStore}>
              <img src="./media/image/googlePlayBadge.svg"></img>
            </a>
            <a href={AppleAppStore} style={{marginLeft:"50px"}} >
              <img src="./media/image/appstoreBadge.svg"></img>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

export default LeftSection;
