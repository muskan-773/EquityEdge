import React from "react";

function Hero() {
  return (
    <div className="container border-bottom mb-5">
      <div className="row p-5 mt-5 mb-5">

        <h1 className="fs-3 text-center">
          Zerodha Products
        </h1>

        <h3 className="fs-5 text-center text-muted mt-3">
          Sleek, modern, and intuitive trading platforms
        </h3>

        <p className="text-center mt-3 mb-5">
          Check out our{" "}
          <a
            href="#"
            style={{ textDecoration: "none", color: "#387ed1" }}
          >
            investment offerings
            <i className="fa fa-long-arrow-right ms-2" aria-hidden="true"></i>
          </a>
        </p>

      </div>
    </div>
  );
}

export default Hero;