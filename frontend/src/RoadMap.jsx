import { useEffect } from 'react'
import { MapPin } from 'lucide-react'
import { CircleMarker, MapContainer, Popup, TileLayer, useMap } from 'react-leaflet'

const COLORS = {
  Critical: '#ee675d',
  High: '#eea64b',
  Medium: '#568de5',
  Low: '#4ca987',
}

function MapFocus({ issue }) {
  const map = useMap()

  useEffect(() => {
    if (issue?.location) map.flyTo([issue.location.lat, issue.location.lng], Math.max(map.getZoom(), 14), { duration: 0.7 })
  }, [issue, map])

  return null
}

export default function RoadMap({ issues, selectedIssue, onSelectIssue, mapMode = 'street' }) {
  const locatedIssues = issues.filter((issue) => (
    Number.isFinite(issue.location?.lat) && Number.isFinite(issue.location?.lng)
  ))

  return (
    <div className="map-canvas" aria-label="Map of reported road damage in San Francisco">
      <MapContainer center={[37.7749, -122.4194]} zoom={13} scrollWheelZoom zoomControl>
        <TileLayer
          attribution={mapMode === 'satellite'
            ? 'Tiles &copy; Esri'
            : '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'}
          url={mapMode === 'satellite'
            ? 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
            : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'}
        />
        <MapFocus issue={selectedIssue} />
        {locatedIssues.map((issue) => {
          const color = COLORS[issue.severity] || COLORS.Low
          const isSelected = selectedIssue?.id === issue.id
          return (
            <CircleMarker
              key={issue.id}
              center={[issue.location.lat, issue.location.lng]}
              radius={isSelected ? 10 : 8}
              pathOptions={{ color: '#fff', weight: 2.5, fillColor: color, fillOpacity: 0.95 }}
              eventHandlers={{ click: () => onSelectIssue(issue) }}
            >
              <Popup>
                <div className="map-popup">
                  <span className={`severity-badge badge-${issue.severity?.toLowerCase()}`}><i />{issue.severity}</span>
                  <strong>{issue.type}</strong>
                  <span>{issue.location.address}</span>
                  <small>{issue.confidence}% AI confidence</small>
                </div>
              </Popup>
            </CircleMarker>
          )
        })}
      </MapContainer>
      <div className="map-location-label"><span className="map-location-pin"><MapPin size={14} fill="currentColor" /></span><span><strong>San Francisco</strong><small>{locatedIssues.length} mapped report{locatedIssues.length === 1 ? '' : 's'}</small></span></div>
    </div>
  )
}
