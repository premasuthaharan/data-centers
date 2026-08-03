import { useState, useEffect } from "react";
import DataCenterCard from "./DataCenterCard";
import "../App.css";

const API = import.meta.env.VITE_API_URL || "http://localhost:8000";

// Minimal iframe-friendly render of a single facility: no toolbar, no map,
// no navigation chrome. Fetches just the one facility (GET
// /api/datacenters/{id}) rather than the full dataset, since this is meant
// to be embedded standalone in an article or blog post.
export default function Embed({ facilityId }) {
  const [dc, setDc] = useState(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    fetch(`${API}/api/datacenters/${facilityId}`)
      .then((r) => {
        if (r.status === 404) {
          setNotFound(true);
          return null;
        }
        return r.json();
      })
      .then((data) => {
        if (data) setDc(data);
      })
      .catch(() => setNotFound(true));
  }, [facilityId]);

  if (notFound) {
    return <div className="embed-message">Facility not found.</div>;
  }

  if (!dc) {
    return <div className="embed-message">Loading…</div>;
  }

  return <DataCenterCard dc={dc} embed />;
}
