import {
  BrowserRouter,
  Routes,
  Route,
} from 'react-router-dom';

import App from '../App';

import Login from '../pages/Login';
import Signup from '../pages/Signup';
import Dashboard from '../pages/Dashboard';
import SavedTrips from "../pages/SavedTrips";
import ForgotPassword from '../pages/ForgotPassword';
import UpdatePassword from '../pages/UpdatePassword';

import ProtectedRoute from '../components/ProtectedRoute';

const AppRoutes = () => {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<App />} />

        <Route
          path="/login"
          element={<Login />}
        />

        <Route
          path="/signup"
          element={<Signup />}
        />

        <Route
          path="/forgot-password"
          element={<ForgotPassword />}
        />

        <Route
          path="/update-password"
          element={<UpdatePassword />}
        />

        {/* Protected Route */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />

        {/* Saved Trips */}
        <Route
          path="/saved-trips"
          element={
            <ProtectedRoute>
              <SavedTrips />
            </ProtectedRoute>
          }
        />
      </Routes>
    </BrowserRouter>
  );
};

export default AppRoutes;