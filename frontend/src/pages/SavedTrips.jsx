import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";

export default function SavedTrips() {

  const navigate = useNavigate();
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {

    fetchTrips();

  }, []);

  async function fetchTrips() {
    try {
      const {
      data: { session }
    } = await supabase.auth.getSession();

    const token =
      session?.access_token;

    // Fetch protected route
    const res = await fetch(
      "http://localhost:5000/api/trips",
      {

        headers: {
          Authorization:
            `Bearer ${token}`
        }

      }
    );
      const data = await res.json();
      console.log("FETCHED:", data);
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
  }

  return (
    <div className="saved-trips-page">

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