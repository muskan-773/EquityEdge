import React, { useState } from 'react';
import { Link } from 'react-router-dom';

/**
 * SIGNUP COMPONENT — Built from scratch
 * Previously: <h1>Signup</h1>
 * Now: Real registration form that calls POST /api/auth/register
 *
 * After successful registration, redirects user to the dashboard app.
 * (The dashboard runs on a different port — localhost:3001)
 *
 * Form state management: controlled inputs
 * Error handling: server errors displayed inline
 * Loading state: button shows spinner during API call
 * Password strength: validated with a regex (uppercase + lowercase + number)
 */
const Signup = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    // Clear field-level error when user starts correcting it
    setErrors((prev) => ({ ...prev, [e.target.name]: '' }));
    setServerError('');
  };

  // Client-side validation (UX only — server validates too)
  const validateForm = () => {
    const newErrors = {};

    if (!formData.name.trim() || formData.name.trim().length < 2) {
      newErrors.name = 'Name must be at least 2 characters';
    }
    if (!formData.email || !/^\S+@\S+\.\S+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }
    if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }
    if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(formData.password)) {
      newErrors.password = 'Password must have uppercase, lowercase, and a number';
    }
    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setLoading(true);
    setServerError('');

    try {
      const response = await fetch('http://localhost:5000/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name.trim(),
          email: formData.email.trim().toLowerCase(),
          password: formData.password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        // Handle validation errors array from backend
        if (data.errors && data.errors.length > 0) {
          const fieldErrors = {};
          data.errors.forEach((err) => {
            fieldErrors[err.field] = err.message;
          });
          setErrors(fieldErrors);
        } else {
          setServerError(data.message || 'Registration failed');
        }
        return;
      }

      // Success — store token and redirect to dashboard
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.data.user));
      setSuccess(true);

      // Redirect to dashboard after 1.5s so user sees the success message
      setTimeout(() => {
        window.location.href = 'http://localhost:3001';
      }, 1500);
    } catch (err) {
      setServerError('Cannot connect to server. Please make sure the backend is running.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="container py-5">
        <div className="row justify-content-center">
          <div className="col-md-6 text-center">
            <div className="alert alert-success">
              <h5>Account created successfully! 🎉</h5>
              <p className="mb-0">Redirecting you to the dashboard...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container py-5">
      <div className="row justify-content-center">
        <div className="col-md-6 col-lg-5">
          <div className="card shadow-sm border-0">
            <div className="card-body p-4">
              <h4 className="fw-bold mb-1">Create your account</h4>
              <p className="text-muted small mb-4">
                Start paper trading with ₹10,00,000 in simulated funds.
              </p>

              {serverError && (
                <div className="alert alert-danger py-2 small" role="alert">
                  {serverError}
                </div>
              )}

              <form onSubmit={handleSubmit} noValidate>
                {/* Name */}
                <div className="mb-3">
                  <label htmlFor="name" className="form-label fw-medium small">
                    Full Name
                  </label>
                  <input
                    id="name"
                    type="text"
                    name="name"
                    className={`form-control ${errors.name ? 'is-invalid' : ''}`}
                    placeholder="Ritesh Kumar"
                    value={formData.name}
                    onChange={handleChange}
                    autoComplete="name"
                    required
                  />
                  {errors.name && (
                    <div className="invalid-feedback">{errors.name}</div>
                  )}
                </div>

                {/* Email */}
                <div className="mb-3">
                  <label htmlFor="email" className="form-label fw-medium small">
                    Email Address
                  </label>
                  <input
                    id="email"
                    type="email"
                    name="email"
                    className={`form-control ${errors.email ? 'is-invalid' : ''}`}
                    placeholder="you@example.com"
                    value={formData.email}
                    onChange={handleChange}
                    autoComplete="email"
                    required
                  />
                  {errors.email && (
                    <div className="invalid-feedback">{errors.email}</div>
                  )}
                </div>

                {/* Password */}
                <div className="mb-3">
                  <label htmlFor="password" className="form-label fw-medium small">
                    Password
                  </label>
                  <input
                    id="password"
                    type="password"
                    name="password"
                    className={`form-control ${errors.password ? 'is-invalid' : ''}`}
                    placeholder="Min. 6 chars, uppercase + number"
                    value={formData.password}
                    onChange={handleChange}
                    autoComplete="new-password"
                    required
                  />
                  {errors.password && (
                    <div className="invalid-feedback">{errors.password}</div>
                  )}
                </div>

                {/* Confirm Password */}
                <div className="mb-4">
                  <label htmlFor="confirmPassword" className="form-label fw-medium small">
                    Confirm Password
                  </label>
                  <input
                    id="confirmPassword"
                    type="password"
                    name="confirmPassword"
                    className={`form-control ${errors.confirmPassword ? 'is-invalid' : ''}`}
                    placeholder="Re-enter your password"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    autoComplete="new-password"
                    required
                  />
                  {errors.confirmPassword && (
                    <div className="invalid-feedback">{errors.confirmPassword}</div>
                  )}
                </div>

                <button
                  type="submit"
                  className="btn btn-primary w-100"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <span
                        className="spinner-border spinner-border-sm me-2"
                        role="status"
                        aria-hidden="true"
                      />
                      Creating account...
                    </>
                  ) : (
                    'Create Free Account'
                  )}
                </button>
              </form>

              <hr className="my-3" />
              <p className="text-center text-muted small mb-0">
                Already have an account?{' '}
                <a
                  href="http://localhost:3001/login"
                  className="text-primary text-decoration-none"
                >
                  Sign in to dashboard
                </a>
              </p>
            </div>
          </div>

          <p className="text-center text-muted small mt-3">
            <small>
              ⚠️ EquityEdge is a paper trading platform for educational purposes only.
              No real money is involved.
            </small>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Signup;
