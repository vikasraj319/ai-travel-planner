import { useState } from "react";
import { useAuth } from "../context/useAuth";
import { supabase } from "../lib/supabase";
import { apiUrl } from "../lib/api";

export default function Profile({ onClose }) {

  const { user } = useAuth();

  const [formData, setFormData] = useState({
    name: user?.user_metadata?.full_name || "",
    email: user?.email || "",
    country: "",
    bio: "",
    travel_style: "",
    budget_preference: "",
    interests: ""
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  function handleChange(e) {

    const { name, value } = e.target;

    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  }

  async function handleSaveProfile(e) {
    e.preventDefault();

    try {
      setSaving(true);
      setError("");
      setSuccess("");

      const {
        data: { session }
      } = await supabase.auth.getSession();

      if (!session) {
        setError("Please login first.");
        return;
      }

      const res = await fetch(
        apiUrl("/api/profile"),
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`
          },
          body: JSON.stringify({
            username: formData.name,
            full_name: formData.name,
            bio: formData.bio,
            country: formData.country,
            travel_style: formData.travel_style,
            budget_preference: formData.budget_preference,
            interests: formData.interests
          })
        }
      );

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "Failed to save profile");
      }

      setSuccess("Profile saved successfully.");

      window.setTimeout(() => {
        onClose();
      }, 500);

    } catch (err) {

      console.error(err);

      setError(err.message || "Failed to save profile");
    } finally {
      setSaving(false);
    }
  }

  return (

    <div className="profile-overlay">

      <div className="profile-modal">

        <button
          className="close-profile"
          onClick={onClose}
        >
          ✕
        </button>

        <form className="profile-form" onSubmit={handleSaveProfile}>
          <h2 className="profile-title">
            Your Travel Profile
          </h2>

          {error && (
            <div className="profile-message profile-message-error">
              {error}
            </div>
          )}

          {success && (
            <div className="profile-message profile-message-success">
              {success}
            </div>
          )}

          <div className="profile-grid">

            <div className="profile-card">
              <span className="profile-card-label">Name</span>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
              />
            </div>

            <div className="profile-card">
              <span className="profile-card-label">Email</span>
              <input
                type="email"
                value={formData.email}
                readOnly
                className="profile-readonly"
              />
            </div>

            <div className="profile-card">
              <span className="profile-card-label">Country</span>
              <input
                type="text"
                name="country"
                value={formData.country}
                onChange={handleChange}
              />
            </div>

            <div className="profile-card">
              <span className="profile-card-label">Travel Style</span>
              <select
                name="travel_style"
                value={formData.travel_style}
                onChange={handleChange}
              >
                <option value="">Select Style</option>
                <option value="Budget">Budget</option>
                <option value="Luxury">Luxury</option>
                <option value="Adventure">Adventure</option>
              </select>
            </div>

          </div>

          <div className="profile-card profile-wide">
            <span className="profile-card-label">Budget Preference</span>
            <input
              type="text"
              name="budget_preference"
              value={formData.budget_preference}
              onChange={handleChange}
            />
          </div>

          <div className="profile-card profile-wide">
            <span className="profile-card-label">Bio</span>
            <textarea
              name="bio"
              value={formData.bio}
              onChange={handleChange}
            />
          </div>

          <div className="profile-card profile-wide">
            <span className="profile-card-label">Interests</span>
            <textarea
              name="interests"
              value={formData.interests}
              onChange={handleChange}
            />
          </div>

          <div className="profile-actions">
            <button
              className="save-profile-btn"
              type="submit"
              disabled={saving}
            >
              {saving ? "Saving..." : "Save Profile"}
            </button>
          </div>
        </form>

      </div>

    </div>
  );
}
