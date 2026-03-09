import React from "react";

function Universe() {
  return (
    <div className="container mt-5">
      <div className="row text-center">

        <h1 className="mb-3">The Zerodha Universe</h1>

        <p className="text-muted">
          Extend your trading and investment experience even further with our
          partner platforms
        </p>

        {/* Zerodha Fundhouse */}
        <div className="col-md-4 p-4 mt-4">
          <img
            src="/media/image/zerodhaFundhouse.png"
            alt="Zerodha Fundhouse"
            className="img-fluid mb-3"
          />
          <p className="small text-muted">Thematic investment platform</p>
        </div>

        {/* Sensibull */}
        <div className="col-md-4 p-4 mt-4">
          <img
            src="/media/image/sensibull-logo.svg"
            alt="Sensibull"
            className="img-fluid mb-3"
          />
          <p className="small text-muted">Options trading platform</p>
        </div>

        {/* Tijori */}
        <div className="col-md-4 p-4 mt-4">
          <img
            src="/media/image/tijori.svg"
            alt="Tijori"
            className="img-fluid mb-3"
          />
          <p className="small text-muted">Investment research platform</p>
        </div>

        {/* Streak */}
        <div className="col-md-4 p-4 mt-4">
          <img
            src="/media/image/streakLogo.png"
            alt="Streak"
            className="img-fluid mb-3"
          />
          <p className="small text-muted">Algo trading without coding</p>
        </div>

        {/* Smallcase */}
        <div className="col-md-4 p-4 mt-4">
          <img
            src="/media/image/smallcaseLogo.png"
            alt="Smallcase"
            className="img-fluid mb-3"
          />
          <p className="small text-muted">Basket investing platform</p>
        </div>

        {/* Ditto */}
        <div className="col-md-4 p-4 mt-4">
          <img
            src="/media/image/dittoLogo.png"
            alt="Ditto"
            className="img-fluid mb-3"
          />
          <p className="small text-muted">Insurance advisory platform</p>
        </div>

        {/* Signup Button */}
        <div className="d-flex justify-content-center mt-5">
          <button className="btn btn-primary px-4 py-2 fs-5">
            Signup Now
          </button>
        </div>

      </div>
    </div>
  );
}

export default Universe;