import { useState } from 'react';

import {
  Link,
} from 'react-router-dom';

import { useAuth } from '../context/useAuth';
import ThemeToggle from '../components/ThemeToggle';

const ForgotPassword = () => {

  const { resetPassword } = useAuth();

  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    setLoading(true);
    setError('');
    setSuccess('');

    const res = await resetPassword(email);

    if (!res.success) {
      setError(res.error);
      setLoading(false);
      return;
    }

    setSuccess('Password reset link sent. Check your inbox and spam folder.');
    setLoading(false);
  };

  return (
    <div className="login-page">

      <div className="fixed top-4 right-4 z-[300]">
        <ThemeToggle />
      </div>

      {/* Card */}
      <div className="login-card">

        {/* Header */}
        <div className="login-header">

          <p className="login-eyebrow">
            Account Recovery
          </p>

          <h1 className="login-title">
            Forgot <em>Password</em>
          </h1>

          <p className="login-subtitle">
            Enter your email and we&apos;ll send you a
            link to reset your password.
          </p>

        </div>

        {/* Messages */}
        {error && (
          <div className="login-error">
            {error}
          </div>
        )}

        {success && (
          <div className="login-error" style={{ color: 'green' }}>
            {success}
          </div>
        )}

        {/* Form */}
        <form
          onSubmit={handleSubmit}
          className="login-form"
        >

          {/* Email */}
          <div className="form-group">

            <label className="form-label">
              Email Address
            </label>

            <input
              type="email"
              name="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="form-input"
              required
            />

          </div>

          {/* Button */}
          <button
            type="submit"
            disabled={loading}
            className="login-btn"
          >
            {loading
              ? 'Sending...'
              : 'Send Reset Link'}
          </button>

        </form>

        {/* Footer */}
        <div className="login-footer">

          <p>
            Remembered your password?
          </p>

          <Link to="/login">
            Back to Login
          </Link>

        </div>

      </div>

    </div>
  );
};

export default ForgotPassword;
