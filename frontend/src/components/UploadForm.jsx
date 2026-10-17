import { useState } from "react";
import { ImagePlus, MapPin, Upload, X, ScanSearch } from "lucide-react";

export default function UploadForm({ onAnalyze, loading }) {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState("");
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const [city, setCity] = useState("");
  const [ward, setWard] = useState("");
  const [error, setError] = useState("");
  const [isLocating, setIsLocating] = useState(false);

  function selectFile(event) {
    const selected = event.target.files?.[0];

    if (!selected) return;

    if (!["image/jpeg", "image/png", "image/webp"].includes(selected.type)) {
      setError("Please select a JPG, PNG or WEBP image.");
      return;
    }

    if (selected.size > 10 * 1024 * 1024) {
      setError("Image size must be 10 MB or less.");
      return;
    }

    setError("");
    setFile(selected);
    setPreview(URL.createObjectURL(selected));
  }

  function removeFile() {
    if (preview) URL.revokeObjectURL(preview);
    setFile(null);
    setPreview("");
  }

  function useCurrentLocation() {
    if (!navigator.geolocation) {
      setError("Geolocation is not supported by this browser.");
      return;
    }

    setError("");
    setIsLocating(true);

    const applyPosition = (position) => {
      if (
        !Number.isFinite(position.coords.latitude) ||
        !Number.isFinite(position.coords.longitude)
      ) {
        setError("Your device returned an invalid location. Enter coordinates manually.");
        setIsLocating(false);
        return;
      }

      setLatitude(position.coords.latitude.toFixed(6));
      setLongitude(position.coords.longitude.toFixed(6));
      setIsLocating(false);
    };

    const handleLocationError = (locationError) => {
      const messages = {
        1: "Location access is blocked. Allow location for this site in your browser settings, then retry, or enter coordinates manually.",
        2: "Your device couldn't determine your location. Check that device location services are on, or enter coordinates manually.",
        3: "Getting your location took too long. Try again or enter coordinates manually.",
      };

      setError(
        messages[locationError.code] ||
          "Unable to get your location. Enter coordinates manually."
      );
      setIsLocating(false);
    };

    const requestLocation = (options, retryWithLowAccuracy = true) => {
      try {
        navigator.geolocation.getCurrentPosition(
          applyPosition,
          (locationError) => {
            if (
              retryWithLowAccuracy &&
              (locationError.code === 2 || locationError.code === 3)
            ) {
              requestLocation(
                {
                  enableHighAccuracy: false,
                  timeout: 20000,
                  maximumAge: 60000,
                },
                false
              );
              return;
            }

            handleLocationError(locationError);
          },
          options
        );
      } catch {
        setError(
          "Unable to request your location. Enter coordinates manually."
        );
        setIsLocating(false);
      }
    };

    requestLocation({ enableHighAccuracy: true, timeout: 15000, maximumAge: 0 });
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");

    if (!file) {
      setError("Please select a road image first.");
      return;
    }

    if ((latitude === "") !== (longitude === "")) {
      setError("Enter both latitude and longitude, or leave both empty.");
      return;
    }

    if (latitude !== "" || longitude !== "") {
      const lat = Number(latitude);
      const lng = Number(longitude);

      if (
        !Number.isFinite(lat) ||
        !Number.isFinite(lng) ||
        Math.abs(lat) > 90 ||
        Math.abs(lng) > 180
      ) {
        setError("Enter valid latitude and longitude coordinates.");
        return;
      }
    }

    try {
      await onAnalyze({
        image: file,
        latitude,
        longitude,
        city,
        ward,
      });
    } catch (err) {
      setError(
        err.response?.data?.message ||
          err.response?.data?.detail ||
          (err.response?.status === 503
            ? "Analysis service is temporarily unavailable (503). Please try again shortly."
            : err.message) ||
          "Analysis failed. Please try again."
      );
    }
  }

  return (
    <form className="panel upload-panel" onSubmit={handleSubmit}>
      <div className="panel-heading">
        <div>
          <h3>Citizen road report</h3>
          <p>Upload a clear photo and add GPS coordinates for the repair team.</p>
        </div>
        <div className="panel-heading-icon">
          <ImagePlus size={20} />
        </div>
      </div>

      {!preview ? (
        <label className="upload-zone">
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={selectFile}
            hidden
          />
          <div className="upload-icon">
            <Upload size={25} />
          </div>
          <strong>Choose a road image</strong>
          <span>JPG, PNG or WEBP · Maximum 10 MB</span>
          <span className="upload-browse">Browse files</span>
        </label>
      ) : (
        <div className="image-preview">
          <img src={preview} alt="Selected road for analysis" />
          <button
            type="button"
            className="remove-image"
            onClick={removeFile}
            aria-label="Remove selected image"
          >
            <X size={18} />
          </button>
          <div className="image-file-name">{file?.name}</div>
        </div>
      )}

      <div className="location-section">
        <div className="location-title">
          <MapPin size={17} />
          <strong>Road Location</strong>
          <span>Optional</span>
        </div>

        <div className="coordinate-grid">
          <label>
            Latitude
            <input
              type="number"
              step="any"
              min="-90"
              max="90"
              value={latitude}
              onChange={(e) => setLatitude(e.target.value)}
              placeholder="26.9124"
            />
          </label>
          <label>
            Longitude
            <input
              type="number"
              step="any"
              min="-180"
              max="180"
              value={longitude}
              onChange={(e) => setLongitude(e.target.value)}
              placeholder="75.7873"
            />
          </label>
        </div>

        <div className="coordinate-grid area-grid">
          <label>
            City
            <input
              value={city}
              onChange={(event) => setCity(event.target.value)}
              maxLength={100}
              placeholder="Jaipur"
            />
          </label>
          <label>
            Ward
            <input
              value={ward}
              onChange={(event) => setWard(event.target.value)}
              maxLength={100}
              placeholder="Ward 12"
            />
          </label>
        </div>

        <button
          type="button"
          className="secondary-button location-button"
          onClick={useCurrentLocation}
          disabled={isLocating}
        >
          <MapPin size={16} />
          {isLocating ? "Finding location..." : "Use my current location"}
        </button>
        <p className="field-hint">
          Current GPS or manually entered coordinates are used. Image EXIF
          extraction must be supported by the backend to read photo metadata.
        </p>
      </div>

      {error && <div className="error-message" role="alert">{error}</div>}

      <button className="primary-button analyze-button" disabled={loading}>
        <ScanSearch size={18} />
        {loading ? "Analyzing and saving report..." : "Analyze & Submit Report"}
      </button>

      <p className="privacy-note">
        Upload only images you are authorized to use. Do not upload sensitive
        personal information.
      </p>
    </form>
  );
}