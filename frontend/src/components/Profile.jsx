import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabase";

export default function Profile({ onClose }) {

  const { user } = useAuth();

  const [formData, setFormData] = useState({
    name: user?.name || "",
    email: user?.email || "",
    country: "",
    bio: "",
    travel_style: "",
    budget_preference: "",
    interests: ""
  });

  function handleChange(e) {

    const { name, value } = e.target;

    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  }

  async function handleSaveProfile() {

    try {

      const {
        data: { session }
      } = await supabase.auth.getSession();

      if (!session) {
        alert("Please login first");
        return;
      }

      console.log("FORM DATA:", formData);

      const res = await fetch(
        "http://localhost:5000/api/profile",
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

      console.log("PROFILE RESPONSE:", data);

      if (!res.ok) {
        throw new Error(data.message || "Failed to save profile");
      }

      alert("Profile saved successfully!");

      onClose();

    } catch (err) {

      console.error(err);

      alert(err.message || "Failed to save profile");
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

        <h2 className="profile-title">
          Your Travel Profile
        </h2>

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

        <button
          className="save-profile-btn"
          onClick={handleSaveProfile}
        >
          Save Profile
        </button>

      </div>

    </div>
  );
}