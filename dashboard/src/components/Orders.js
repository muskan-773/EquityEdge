import React, { useState, useEffect, useCallback } from 'react';
import api from '../api/axiosInstance';

/**
 * ORDERS COMPONENT
 * Previously: empty <h1></h1>
 * Now: Paginated order history with status badges and buy/sell form
 */
const STATUS_COLORS = {
  EXECUTED: 'success',
  PENDING: 'warning',
  REJECTED: 'danger',
  CANCELLED: 'secondary',
};

const Orders = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [total, setTotal] = useState(0);

  // Buy/sell form state
  const [form, setForm] = useState({ symbol: '', orderType: 'BUY', quantity: 1 });
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchOrders = useCallback(async () => {
    try {
      setLoading(true);
      const { data } = await api.get('/orders?limit=20');
      setOrders(data.data.orders);
      setTotal(data.total);
      setError('');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load orders');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const handleFormChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    setFormError('');
    setFormSuccess('');
  };

  const handlePlaceOrder = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setFormError('');
    setFormSuccess('');

    try {
      const { data } = await api.post('/orders', {
        symbol: form.symbol.trim().toUpperCase(),
        orderType: form.orderType,
        quantity: parseInt(form.quantity, 10),
      });
      setFormSuccess(data.message);
      setForm({ symbol: '', orderType: 'BUY', quantity: 1 });
      fetchOrders(); // Refresh order list
    } catch (err) {
      setFormError(err.response?.data?.message || 'Order failed');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = async (orderId) => {
    try {
      await api.delete(`/orders/${orderId}`);
      fetchOrders();
    } catch (err) {
      alert(err.response?.data?.message || 'Could not cancel order');
    }
  };

  return (
    <div>
      {/* Place Order Form */}
      <div className="card border-0 shadow-sm mb-4">
        <div className="card-header bg-white border-bottom">
          <h6 className="mb-0 fw-semibold">Place Order</h6>
        </div>
        <div className="card-body">
          {formError && <div className="alert alert-danger py-2 small">{formError}</div>}
          {formSuccess && <div className="alert alert-success py-2 small">{formSuccess}</div>}
          <form onSubmit={handlePlaceOrder} className="row g-3 align-items-end">
            <div className="col-md-3">
              <label className="form-label small fw-medium">Symbol</label>
              <input
                type="text"
                name="symbol"
                className="form-control form-control-sm"
                placeholder="e.g. TCS"
                value={form.symbol}
                onChange={handleFormChange}
                required
              />
            </div>
            <div className="col-md-3">
              <label className="form-label small fw-medium">Type</label>
              <select
                name="orderType"
                className="form-select form-select-sm"
                value={form.orderType}
                onChange={handleFormChange}
              >
                <option value="BUY">BUY</option>
                <option value="SELL">SELL</option>
              </select>
            </div>
            <div className="col-md-3">
              <label className="form-label small fw-medium">Quantity</label>
              <input
                type="number"
                name="quantity"
                className="form-control form-control-sm"
                min="1"
                value={form.quantity}
                onChange={handleFormChange}
                required
              />
            </div>
            <div className="col-md-3">
              <button
                type="submit"
                className={`btn btn-sm w-100 ${form.orderType === 'BUY' ? 'btn-success' : 'btn-danger'}`}
                disabled={submitting}
              >
                {submitting ? 'Placing...' : `Place ${form.orderType}`}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Order History */}
      <div className="card border-0 shadow-sm">
        <div className="card-header bg-white border-bottom d-flex justify-content-between align-items-center">
          <h6 className="mb-0 fw-semibold">
            Order History <span className="text-muted fw-normal small">({total})</span>
          </h6>
          <button className="btn btn-sm btn-outline-secondary" onClick={fetchOrders}>
            Refresh
          </button>
        </div>

        {loading ? (
          <div className="text-center py-4">
            <div className="spinner-border spinner-border-sm text-primary" role="status" />
          </div>
        ) : error ? (
          <div className="p-3"><div className="alert alert-danger mb-0 small">{error}</div></div>
        ) : orders.length === 0 ? (
          <div className="text-center text-muted py-5 small">No orders placed yet</div>
        ) : (
          <div className="table-responsive">
            <table className="table table-hover mb-0">
              <thead className="table-light">
                <tr>
                  <th className="small text-muted fw-medium">Symbol</th>
                  <th className="small text-muted fw-medium">Type</th>
                  <th className="small text-muted fw-medium text-end">Qty</th>
                  <th className="small text-muted fw-medium text-end">Price</th>
                  <th className="small text-muted fw-medium text-end">Value</th>
                  <th className="small text-muted fw-medium">Status</th>
                  <th className="small text-muted fw-medium">Time</th>
                  <th className="small text-muted fw-medium">Action</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => (
                  <tr key={order._id}>
                    <td>
                      <div className="fw-semibold small">{order.symbol}</div>
                      <div className="text-muted" style={{ fontSize: '11px' }}>{order.stockName}</div>
                    </td>
                    <td>
                      <span className={`badge ${order.orderType === 'BUY' ? 'bg-success-subtle text-success' : 'bg-danger-subtle text-danger'}`}>
                        {order.orderType}
                      </span>
                    </td>
                    <td className="text-end small">{order.quantity}</td>
                    <td className="text-end small">₹{order.price?.toFixed(2)}</td>
                    <td className="text-end small">₹{order.totalValue?.toFixed(2)}</td>
                    <td>
                      <span className={`badge bg-${STATUS_COLORS[order.status] || 'secondary'}`}>
                        {order.status}
                      </span>
                    </td>
                    <td className="small text-muted">
                      {new Date(order.createdAt).toLocaleString('en-IN', {
                        month: 'short', day: 'numeric',
                        hour: '2-digit', minute: '2-digit',
                      })}
                    </td>
                    <td>
                      {order.status === 'PENDING' && (
                        <button
                          className="btn btn-sm btn-outline-danger"
                          onClick={() => handleCancel(order._id)}
                        >
                          Cancel
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default Orders;
