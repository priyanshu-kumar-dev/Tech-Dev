import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  CircleMarker,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import { useEffect, useMemo, useState } from "react";
import SeverityBadge from "./SeverityBadge";
import { hasValidLocation } from "../utils/riskScore";

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

function formatConfidence(confidence) {
  if (confidence === null || confidence === undefined || confidence === "") {
    return "Not provided";
  }
  const value = Number(confidence);
  if (!Number.isFinite(value)) return "Not provided";
  return `${Math.round(value <= 1 ? value * 100 : value)}%`;
}

export default function RoadMap({ reports = [] }) {
  const [locationLevel, setLocationLevel] = useState("ward");
  const points = reports.flatMap((report) => {
    const location = report.location;

    if (!hasValidLocation(location)) return [];

    const detections = Array.isArray(report.detections) ? report.detections : [];
    const mapItems = detections.length ? detections : [null];

    return mapItems.map((detection, index) => ({
      id: detection?.id || `${report.id}-${index}`,
      lat: Number(location.latitude),
      lng: Number(location.longitude),
      type: detection?.type || "Report location",
      severity: detection?.severity,
      confidence: detection?.confidence,
      score: detection?.priorityScore,
      repairAction: detection?.repairAction,
      simulated: detection?.simulated ?? report.isSimulated ?? false,
      locationSource: location.source,
      hasDetection: Boolean(detection),
    }));
  });
  const concentrations = useMemo(() => {
    const areas = new Map();

    reports.forEach((report) => {
      if (!hasValidLocation(report.location)) return;
      const latitude = Number(report.location.latitude);
      const longitude = Number(report.location.longitude);

      const areaName =
        locationLevel === "ward"
          ? report.ward || report.city
          : report.city;
      const key = areaName
        ? `${locationLevel}:${areaName.toLowerCase()}`
        : `coordinates:${latitude.toFixed(2)}:${longitude.toFixed(2)}`;
      const existing = areas.get(key) || {
        label: areaName || "Unassigned area",
        latitudeTotal: 0,
        longitudeTotal: 0,
        reportCount: 0,
        defectCount: 0,
      };

      existing.latitudeTotal += latitude;
      existing.longitudeTotal += longitude;
      existing.reportCount += 1;
      existing.defectCount += (report.detections || []).length;
      areas.set(key, existing);
    });

    return [...areas.values()].map((area) => ({
      ...area,
      latitude: area.latitudeTotal / area.reportCount,
      longitude: area.longitudeTotal / area.reportCount,
    }));
  }, [reports, locationLevel]);
  const highestConcentration = Math.max(
    1,
    ...concentrations.map((area) => area.defectCount || area.reportCount)
  );

  const defaultCenter = [26.9124, 75.7873];

  return (
    <section className="panel map-panel">
      <div className="panel-heading">
        <div>
          <h3>Road Condition Map</h3>
          <p>Damage clusters grouped by city or ward</p>
        </div>
        <label className="map-level-control">
          Group by
          <select
            aria-label="Group damage heatmap by"
            value={locationLevel}
            onChange={(event) => setLocationLevel(event.target.value)}
          >
            <option value="ward">Ward</option>
            <option value="city">City</option>
          </select>
        </label>
        <span className="map-count">
          {concentrations.length} areas · {points.length} defects
        </span>
      </div>

      <div className="map-legend">
        <span><i className="heat-legend low" />Lower concentration</span>
        <span><i className="heat-legend high" />Higher concentration</span>
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

          {concentrations.map((area) => {
            const count = area.defectCount || area.reportCount;
            const intensity = count / highestConcentration;
            const color = `rgb(${Math.round(55 + intensity * 200)}, ${Math.round(
              195 - intensity * 140
            )}, ${Math.round(250 - intensity * 190)})`;

            return (
              <CircleMarker
                key={`${locationLevel}-${area.label}-${area.latitude}`}
                center={[area.latitude, area.longitude]}
                radius={Math.min(32, 10 + count * 3)}
                pathOptions={{
                  color,
                  fillColor: color,
                  fillOpacity: 0.35 + intensity * 0.35,
                  weight: 2,
                }}
              >
                <Popup>
                  <strong>{area.label}</strong>
                  <p>{area.reportCount} reports · {area.defectCount} defects</p>
                </Popup>
              </CircleMarker>
            );
          })}

          {points.map((point) => (
            <Marker
              key={point.id}
              position={[point.lat, point.lng]}
              icon={createMarkerIcon(point.severity)}
            >
              <Popup>
                <strong>{point.type}</strong>
                {point.hasDetection && (
                  <>
                    <br />
                    <SeverityBadge severity={point.severity} />
                  </>
                )}
                {!point.hasDetection ? (
                  <p>
                    {point.simulated
                      ? "DEMO report — not an AI prediction"
                      : "No damage detected by the model"}
                  </p>
                ) : point.simulated ? (
                  <p><strong>DEMO — not an AI prediction</strong></p>
                ) : (
                  <p>Model confidence: {formatConfidence(point.confidence)}</p>
                )}
                <p>
                  {point.lat.toFixed(5)}, {point.lng.toFixed(5)}
                </p>
                {point.locationSource && (
                  <p>
                    GPS source:{" "}
                    {point.locationSource === "image-exif"
                      ? "Photo EXIF"
                      : point.locationSource === "manual-or-browser-gps"
                        ? "Browser or manual entry"
                        : point.locationSource}
                  </p>
                )}
                {point.hasDetection && point.score != null && (
                  <p>Detection priority (prototype): {point.score}/100</p>
                )}
                {point.repairAction && <p>{point.repairAction}</p>}
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>

      {points.length === 0 && (
        <p className="field-hint">
          No geolocated reports yet. Add GPS coordinates and optionally a city
          and ward to see their damage concentration. The initial map view is
          centered on Jaipur.
        </p>
      )}
    </section>
  );
}