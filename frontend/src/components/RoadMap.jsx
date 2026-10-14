import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import { useEffect } from "react";
import SeverityBadge from "./SeverityBadge";

const severityColors = {
  Critical: "#ef4444",
  High: "#f97316",
  Medium: "#eab308",
  Low: "#22c55e",
};

function createMarkerIcon(severity) {
  const color = severityColors[severity] || "#60a5fa";

  return L.divIcon({
    className: "custom-map-marker",
    html: `<div style="
      width: 17px;
      height: 17px;
      background: ${color};
      border: 3px solid white;
      border-radius: 50%;
      box-shadow: 0 1px 8px #0008;
    "></div>`,
    iconSize: [17, 17],
    iconAnchor: [8, 8],
  });
}

function FitMarkers({ points }) {
  const map = useMap();

  useEffect(() => {
    if (points.length === 1) {
      map.setView([points[0].lat, points[0].lng], 15);
    } else if (points.length > 1) {
      map.fitBounds(points.map((point) => [point.lat, point.lng]), {
        padding: [35, 35],
        maxZoom: 15,
      });
    }
  }, [map, points]);

  return null;
}

export default function RoadMap({ reports = [] }) {
  const points = reports.flatMap((report) => {
    const location = report.location;

    if (
      !location ||
      !Number.isFinite(Number(location.latitude)) ||
      !Number.isFinite(Number(location.longitude))
    ) {
      return [];
    }

    return (report.detections || []).map((detection, index) => ({
      id: detection.id || `${report.id}-${index}`,
      lat: Number(location.latitude),
      lng: Number(location.longitude),
      type: detection.type || "Road defect",
      severity: detection.severity || "Medium",
      score: detection.priorityScore,
      repairAction: detection.repairAction,
      simulated: detection.simulated ?? report.isSimulated ?? false,
    }));
  });

  const defaultCenter = [26.9124, 75.7873];

  return (
    <section className="panel map-panel">
      <div className="panel-heading">
        <div>
          <h3>Road Condition Map</h3>
          <p>Defects with available coordinates</p>
        </div>
        <span className="map-count">{points.length} markers</span>
      </div>

      <div className="map-legend">
        {Object.entries(severityColors).map(([severity, color]) => (
          <span key={severity}>
            <i style={{ background: color }} />
            {severity}
          </span>
        ))}
      </div>

      <div className="map-container">
        <MapContainer
          center={defaultCenter}
          zoom={12}
          scrollWheelZoom
          className="leaflet-map"
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          <FitMarkers points={points} />

          {points.map((point) => (
            <Marker
              key={point.id}
              position={[point.lat, point.lng]}
              icon={createMarkerIcon(point.severity)}
            >
              <Popup>
                <strong>{point.type}</strong>
                <br />
                <SeverityBadge severity={point.severity} />
                <p>
                  {point.lat.toFixed(5)}, {point.lng.toFixed(5)}
                </p>
                {point.score != null && <p>Priority: {point.score}/100</p>}
                {point.repairAction && <p>{point.repairAction}</p>}
                {point.simulated && <small>Simulated result</small>}
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>

      {points.length === 0 && (
        <p className="field-hint">
          No geolocated defects yet. Analyze an image and supply GPS coordinates
          to place its defect records on the map. The initial map view is
          centered on Jaipur.
        </p>
      )}
    </section>
  );
}