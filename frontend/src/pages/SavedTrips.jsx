import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { apiUrl } from "../lib/api";
import ThemeToggle from "../components/ThemeToggle";

export default function SavedTrips() {

  const navigate = useNavigate();
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchTrips = useCallback(async () => {
    try {
      const {
      data: { session }
    } = await supabase.auth.getSession();

    const token =
      session?.access_token;

    if (!token) {
      setTrips([]);
      return;
    }

    // Fetch protected route
    const res = await fetch(
      apiUrl("/api/trips"),
      {

        headers: {
          Authorization:
            `Bearer ${token}`
        }

      }
    );

    if (res.status === 401) {
      // Session expired or revoked - send user to login
      navigate("/login", { replace: true });
      return;
    }

      const data = await res.json();
      setTrips(
        data.trips ||
        data.data ||
        []
      );

    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => {

    fetchTrips();

  }, [fetchTrips]);

  return (
    <div className="saved-trips-page">

      {/* THEME TOGGLE */}
      <div className="fixed top-4 right-4 z-[300]">
        <ThemeToggle />
      </div>

      {/* HEADER */}
      <div className="saved-top">

        <button
          className="back-btn"
          onClick={() => navigate("/dashboard")}
        >
          ← Back
        </button>

        <h1 className="saved-title">
          Saved Trips
        </h1>

      </div>

      {/* LOADING */}
      {
        loading && (
          <p className="saved-loading">
            Loading trips...
          </p>
        )
      }

      {/* EMPTY */}
      {
        !loading &&
        trips.length === 0 && (
          <p className="saved-empty">
            No saved trips yet.
          </p>
        )
      }

      {/* GRID */}
      <div className="saved-grid">

        {
          trips.map((trip) => (

            <div
              key={trip.id}
              className="saved-card"
            >

              <p className="saved-label">
                Destination
              </p>

              <h2>
                {
                  trip.destination ||
                  "Untitled Trip"
                }
              </h2>

              <p>
                Budget:
                {" "}
                {
                  trip.budget ||
                  "Not specified"
                }
              </p>

              <button>
                View Trip
              </button>

            </div>

          ))
        }

      </div>

    </div>
  );
}
