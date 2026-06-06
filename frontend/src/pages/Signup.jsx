import { useState } from 'react';

import {
  Link,
  useNavigate,
} from 'react-router-dom';

import { useAuth } from '../context/AuthContext';

const Signup = () => {
  const navigate = useNavigate();

  const { signUp } = useAuth();

  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
  });

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // =========================
  // Handle Input Change
  // =========================

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  // =========================
  // Handle Signup
  // =========================

  const handleSubmit = async (e) => {
    e.preventDefault();

    setLoading(true);
    setError('');

    const res = await signUp(
      formData.email,
      formData.password,
      formData.fullName
    );

    if (!res.success) {
      setError(res.error);
      setLoading(false);
      return;
    }

    navigate('/dashboard');
  };

  return (
    <div className="login-page">

      {/* Card */}
      <div className="login-card">

        {/* Header */}
        <div className="login-header">

          <p className="login-eyebrow">
            Begin Your Journey
          </p>

          <h1 className="login-title">
            Create <em>Account</em>
          </h1>

          <p className="login-subtitle">
            Unlock personalized itineraries,
            luxury destinations, and AI-powered
            travel experiences crafted exclusively for you.
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

          {/* Full Name */}
          <div className="form-group">

            <label className="form-label">
              Full Name
            </label>

            <input
              type="text"
              name="fullName"
              placeholder="Enter your full name"
              value={formData.fullName}
              onChange={handleChange}
              className="form-input"
              required
            />

          </div>

          {/* Email */}
          <div className="form-group">

            <label className="form-label">
              Email Address
            </label>

            <input
              type="email"
              name="email"
              placeholder="Enter your email"
              value={formData.email}
              onChange={handleChange}
              className="form-input"
              required
            />

          </div>

          {/* Password */}
          <div className="form-group">

            <label className="form-label">
              Password
            </label>

            <input
              type="password"
              name="password"
              placeholder="Create a password"
              value={formData.password}
              onChange={handleChange}
              className="form-input"
              required
            />

          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="login-btn"
          >
            {loading
              ? 'Creating Account...'
              : 'Create Experience'}
          </button>

        </form>

        {/* Footer */}
        <div className="login-footer">

          <p>
            Already have an account?
          </p>

          <Link to="/login">
            Login
          </Link>

        </div>

      </div>

    </div>
  );
};

export default Signup;