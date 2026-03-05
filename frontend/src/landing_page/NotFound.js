import React from "react";
import { Link } from "react-router-dom";

function NotFound() {
  return (
    <div className="container py-5">

      <div className="row align-items-center">

        {/* Left Side Text */}
        <div className="col-lg-6">

          <h1 className="fw-semibold mb-3">
            Kiaan couldn’t find that page
          </h1>

          <p className="text-muted fs-5 mb-4">
            We couldn’t find the page you were looking for. Visit Zerodha’s home page.
          </p>

          <Link
            to="/"
            className="btn btn-primary px-5 py-2 fs-5"
          >
            Go Home
          </Link>

        </div>

        {/* Right Side Image */}
        <div className="col-lg-6 text-center">

          <img
            src="/media/image/kiaan404.jpg"
            alt="Page not found"
            className="img-fluid"
            style={{ maxWidth: "450px" }}
          />

        </div>

      </div>

    </div>
  );
}

export default NotFound;