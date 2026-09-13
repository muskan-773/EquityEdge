import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/axiosInstance';

/**
 * LOGIN COMPONENT
 *
 * Controlled form pattern:
 * - React state mirrors every input field (controlled inputs)
 * - On submit: call POST /api/auth/login
 * - On success: call login() from AuthContext, redirect to dashboard
 * - On error: display server error message
 *
 * Interview Q: "What is a controlled vs uncontrolled input?"
 * A: Controlled: React state drives the input value via `value` prop and
 *    `onChange` handler. React is the "single source of truth."
 *    Uncontrolled: DOM drives the value; React reads it via refs.
 *    Controlled is preferred in React — predictable, testable, validates on change.
 */
const Login = () => {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [formData, setFormData] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    // Computed property name: { [e.target.name]: e.target.value }
    // This handles ALL inputs with a single handler instead of
    // one handler per field — more scalable.
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    setError(''); // Clear error when user starts typing
  };

  const handleSubmit = async (e) => {
    e.preventDefault(); // Prevent default form submission (page reload)
    setLoading(true);
    setError('');

    try {
      const { data } = await api.post('/auth/login', formData);
      // data = { success: true, token: '...', data: { user: {...} } }
      login(data.data.user, data.token);
      navigate('/dashboard'); // Redirect to dashboard after login
    } catch (err) {
      // err.response.data is our server's JSON error response
      setError(
        err.response?.data?.message || 'Login failed. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container-fluid vh-100 d-flex align-items-center justify-content-center bg-light">
      <div className="card shadow-sm" style={{ width: '100%', maxWidth: '420px' }}>
        <div className="card-body p-4">
          {/* Logo / Brand */}
          <div className="text-center mb-4">
            <h4 className="fw-bold text-primary">EquityEdge</h4>
            <p className="text-muted small">Sign in to your trading account</p>
          </div>

          {/* Error Alert */}
          {error && (
            <div className="alert alert-danger py-2 small" role="alert">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate>
            {/* Email */}
            <div className="mb-3">
              <label htmlFor="email" className="form-label fw-medium">
                Email address
              </label>
              <input
                id="email"
                type="email"
                name="email"
                className="form-control"
                placeholder="you@example.com"
                value={formData.email}
                onChange={handleChange}
                required
                autoComplete="email"
              />
            </div>

            {/* Password */}
            <div className="mb-4">
              <label htmlFor="password" className="form-label fw-medium">
                Password
              </label>
              <input
                id="password"
                type="password"
                name="password"
                className="form-control"
                placeholder="Enter your password"
                value={formData.password}
                onChange={handleChange}
                required
                autoComplete="current-password"
              />
            </div>

            <button
              type="submit"
              className="btn btn-primary w-100"
              disabled={loading}
            >
              {loading ? (
                <>
                  <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true" />
                  Signing in...
                </>
              ) : (
                'Sign In'
              )}
            </button>
          </form>

          <hr className="my-3" />
          <p className="text-center text-muted small mb-0">
            Don't have an account?{' '}
            <a href="http://localhost:3000/signup" className="text-primary text-decoration-none">
              Sign up on EquityEdge
            </a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
