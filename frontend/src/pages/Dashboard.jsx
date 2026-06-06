import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useState } from 'react';
import Profile from "../components/Profile";
const Dashboard = () => {
  const navigate = useNavigate();
  const [showProfile, setShowProfile] = useState(false);

  const {
    user,
    logout,
  } = useAuth();

  // =========================
  // Handle Logout
  // =========================

  const handleLogout = async () => {
    const res = await logout();

    if (res.success) {
      navigate('/login');
    }
  };


  return (
    <div className="dashboard-page">

      {/* Background Glow */}
      <div className="dashboard-bg" />

      {/* Main Content */}
      <div className="dashboard-container">

        {/* Header */}
        <div className="dashboard-header">

          <div>

            <p className="dashboard-eyebrow">
              Luxury Travel Workspace
            </p>

            <h1 className="dashboard-title">
              Welcome{' '}
              <em>
                {user?.user_metadata?.full_name ||
                  'Traveler'}
              </em>
            </h1>

            <p className="dashboard-subtitle">
              Manage your curated journeys,
              premium itineraries, and AI-powered
              travel experiences.
            </p>

          </div>

          {/* Logout */}
          <button
            onClick={handleLogout}
            className="dashboard-btn"
          >
            Logout
          </button>

        </div>

        {/* Dashboard Grid */}
        <div className="dashboard-grid">

          {/* Saved Trips */}
          <div className="dashboard-card dashboard-clickable"
           onClick={() => navigate('/saved-trips')}>

            <p className="card-label">
              Collection
            </p>

            <h2 className="card-title">
              Saved Trips
            </h2>

            <p className="card-text">
              Access all your curated journeys
              and previously generated itineraries.
            </p>

          </div>

          {/* AI Planner */}
          <div className="dashboard-card dashboard-clickable"
           onClick={() => navigate('/')}>

            <p className="card-label">
              Intelligence
            </p>

            <h2 className="card-title">
              AI Planner
            </h2>

            <p className="card-text">
              Generate luxury travel experiences
              crafted intelligently for your style.
            </p>

          </div>

          {/* Profile */}
          <div className="dashboard-card"
           onClick={() => setShowProfile(true)}>
            <p className="card-label">
              Identity
            </p>

            <h2 className="card-title">
              Profile
            </h2>

            <p className="card-text">
              Manage your preferences,
              destinations, and account settings.
            </p>

          </div>

        </div>
        {
              showProfile && (
                <Profile
                  onClose={() => setShowProfile(false)}
                />
              )
            }

        {/* User Information */}
        <div className="dashboard-info">

          <p className="dashboard-eyebrow">
            Account Information
          </p>

          <div className="info-row">
            <span>Email</span>
            <span>{user?.email}</span>
          </div>

          <div className="info-row">
            <span>User ID</span>
            <span>{user?.id}</span>
          </div>

        </div>

      </div>

    </div>
  );
};

export default Dashboard;