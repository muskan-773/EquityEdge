import React from 'react'

function CreateTicket() {
  return ( 
    <div className="container mt-5">
      <div className="row">

        {/* LEFT SIDE - SUPPORT CATEGORIES */}
        <div className="col-md-8">

          <div className="accordion" id="supportAccordion">

            <div className="accordion-item mb-3">
              <h2 className="accordion-header">
                <button className="accordion-button collapsed" data-bs-toggle="collapse" data-bs-target="#acc1">
                <i class="fa fa-plus-circle fa-lg" aria-hidden="true"></i> Account Opening
                </button>
              </h2>
              <div id="acc1" className="accordion-collapse collapse">
                <div className="accordion-body">
                  Help related to account opening.
                </div>
              </div>
            </div>

            <div className="accordion-item mb-3">
              <h2 className="accordion-header">
                <button className="accordion-button collapsed" data-bs-toggle="collapse" data-bs-target="#acc2">
                <i class="fa fa-user-circle fa-lg" aria-hidden="true"></i>Your Zerodha Account
                </button>
              </h2>
              <div id="acc2" className="accordion-collapse collapse">
                <div className="accordion-body">
                  Manage your Zerodha account settings.
                </div>
              </div>
            </div>

            <div className="accordion-item mb-3">
              <h2 className="accordion-header">
                <button className="accordion-button collapsed" data-bs-toggle="collapse" data-bs-target="#acc3">
                  Kite
                </button>
              </h2>
              <div id="acc3" className="accordion-collapse collapse">
                <div className="accordion-body">
                  Learn how to use the Kite trading platform.
                </div>
              </div>
            </div>

            <div className="accordion-item mb-3">
              <h2 className="accordion-header">
                <button className="accordion-button collapsed" data-bs-toggle="collapse" data-bs-target="#acc4">
                <i class="fa fa-inr" aria-hidden="true"></i>Funds
                </button>
              </h2>
              <div id="acc4" className="accordion-collapse collapse">
                <div className="accordion-body">
                  Deposit and withdraw funds.
                </div>
              </div>
            </div>

            <div className="accordion-item mb-3">
              <h2 className="accordion-header">
                <button className="accordion-button collapsed" data-bs-toggle="collapse" data-bs-target="#acc5">
                  Console
                </button>
              </h2>
              <div id="acc5" className="accordion-collapse collapse">
                <div className="accordion-body">
                  Portfolio and reports related help.
                </div>
              </div>
            </div>

            <div className="accordion-item mb-3">
              <h2 className="accordion-header">
                <button className="accordion-button collapsed" data-bs-toggle="collapse" data-bs-target="#acc6">
                  Coin
                </button>
              </h2>
              <div id="acc6" className="accordion-collapse collapse">
                <div className="accordion-body">
                  Mutual fund investment help.
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* RIGHT SIDE PANEL */}
        <div className="col-md-4">

          {/* ANNOUNCEMENTS */}
          <div className="p-3 mb-4" style={{background:"#f7efe5", borderLeft:"4px solid orange"}}>
            <ul>
              <li>
                <a href="#">Revision in commodity market trading hours from March 09, 2026</a>
              </li>
              <li>
                <a href="#">Surveillance measure on scrips - March 2026</a>
              </li>
            </ul>
          </div>

          {/* QUICK LINKS */}
          <div className="card">
            <div className="card-header">
              Quick links
            </div>

            <ul className="list-group list-group-flush">
              <li className="list-group-item">1. Track account opening</li>
              <li className="list-group-item">2. Track segment activation</li>
              <li className="list-group-item">3. Intraday margins</li>
              <li className="list-group-item">4. Kite user manual</li>
              <li className="list-group-item">5. Learn how to create a ticket</li>
            </ul>
          </div>

        </div>

      </div>
    </div>
  );
}


export default CreateTicket;