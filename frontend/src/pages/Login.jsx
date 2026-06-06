import { useState } from 'react';

import {
  Link,
  useNavigate,
} from 'react-router-dom';

import { useAuth } from '../context/AuthContext';

const Login = () => {
  const navigate = useNavigate();

  const { login } = useAuth();

  const [formData, setFormData] = useState({
    email: '',
    password: '',
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

    setLoading(true);
    setError('');

    const res = await login(
      formData.email,
      formData.password
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
            Private Concierge Access
          </p>

          <h1 className="login-title">
            Welcome <em>Back</em>
          </h1>

          <p className="login-subtitle">
            Continue planning extraordinary journeys
            with AI-crafted luxury travel experiences.
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
              placeholder="Enter your password"
              value={formData.password}
              onChange={handleChange}
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
              ? 'Entering...'
              : 'Enter Experience'}
          </button>

        </form>

        {/* Footer */}
        <div className="login-footer">

          <p>
            New to the platform?
          </p>

          <Link to="/signup">
            Create Account
          </Link>

        </div>

      </div>

    </div>
  );
};

export default Login;