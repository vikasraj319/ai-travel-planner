import { useState } from 'react';

import {
  useNavigate,
} from 'react-router-dom';

import { supabase } from '../lib/supabase';
import ThemeToggle from '../components/ThemeToggle';

const UpdatePassword = () => {

  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    password: '',
    confirmPassword: '',
  });

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    setError('');

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);

    try {
      // Recovery link tokens are captured from the URL by supabase-js
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        setError('Reset link is invalid or expired. Please request a new one.');
        setLoading(false);
        return;
      }

      const { error: updateError } = await supabase.auth.updateUser({
        password: formData.password,
      });

      if (updateError) {
        setError(updateError.message);
        setLoading(false);
        return;
      }

      navigate('/dashboard', { replace: true });
    } catch (err) {
      setError(err.message || 'Failed to update password');
      setLoading(false);
    }
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
            Secure Your Account
          </p>

          <h1 className="login-title">
            New <em>Password</em>
          </h1>

          <p className="login-subtitle">
            Choose a new password for your account.
          </p>

        </div>

        {/* Error */}
        {error && (
          <div className="login-error">
            {error}
          </div>
        )}

        {/* Form */}
        <form
          onSubmit={handleSubmit}
          className="login-form"
        >

          {/* Password */}
          <div className="form-group">

            <label className="form-label">
              New Password
            </label>

            <input
              type="password"
              name="password"
              placeholder="Enter new password"
              value={formData.password}
              onChange={handleChange}
              className="form-input"
              minLength={6}
              required
            />

          </div>

          {/* Confirm Password */}
          <div className="form-group">

            <label className="form-label">
              Confirm Password
            </label>

            <input
              type="password"
              name="confirmPassword"
              placeholder="Repeat new password"
              value={formData.confirmPassword}
              onChange={handleChange}
              className="form-input"
              minLength={6}
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
              ? 'Updating...'
              : 'Update Password'}
          </button>

        </form>

      </div>

    </div>
  );
};

export default UpdatePassword;
