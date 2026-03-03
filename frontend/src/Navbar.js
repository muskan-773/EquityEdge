import React from "react";

function Navbar() {
  return (
    <nav 
      className="navbar navbar-expand-lg border-bottom"
      style={{ backgroundColor: "#fff" }}
    >
      <div className="container">

        {/* Logo */}
        <a className="navbar-brand" href="#">
          <img 
            src="/media/image/logo.svg" 
            alt="logo" 
            style={{ width: "150px" }}
          />
        </a>

        {/* Toggle button (mobile) */}
        <button
          className="navbar-toggler"
          type="button"
          data-bs-toggle="collapse"
          data-bs-target="#navbarNav"
        >
          <span className="navbar-toggler-icon"></span>
        </button>

        {/* Right side links */}
        <div className="collapse navbar-collapse justify-content-end" id="navbarNav">
          <ul className="navbar-nav gap-4">

            <li className="nav-item">
              <a className="nav-link" href="#">Signup</a>
            </li>

            <li className="nav-item">
              <a className="nav-link" href="#">About</a>
            </li>

            <li className="nav-item">
              <a className="nav-link" href="#">Products</a>
            </li>

            <li className="nav-item">
              <a className="nav-link" href="#">Pricing</a>
            </li>

            <li className="nav-item">
              <a className="nav-link" href="#">Support</a>
            </li>

          </ul>
        </div>

      </div>
    </nav>
  );
}

export default Navbar;