
import { useEffect, useState } from "react";
import {
  ImagePlus,
  MapPin,
  Upload,
  X,
  ScanSearch,
  Video,
} from "lucide-react";

const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
const VIDEO_TYPES = [
  "video/mp4",
  "video/webm",
  "video/quicktime",
  "video/x-msvideo",
  "video/x-matroska",
];

const IMAGE_MAX_SIZE = 10 * 1024 * 1024;
const VIDEO_MAX_SIZE = 100 * 1024 * 1024;

export default function UploadForm({ onAnalyze, loading }) {
  const [file, setFile] = useState(null);
  const [mediaType, setMediaType] = useState("image");
  const [preview, setPreview] = useState("");
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const [city, setCity] = useState("");
  const [ward, setWard] = useState("");
  const [error, setError] = useState("");
  const [isLocating, setIsLocating] = useState(false);

  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  function selectMediaType(type) {
    setMediaType(type);
    setFile(null);
    setPreview("");
    setError("");
  }

  function selectFile(event) {
    const selected = event.target.files?.[0];
    event.target.value = "";

    if (!selected) return;

    const isImage = mediaType === "image";
    const allowedTypes = isImage ? IMAGE_TYPES : VIDEO_TYPES;
    const maxSize = isImage ? IMAGE_MAX_SIZE : VIDEO_MAX_SIZE;

    if (!allowedTypes.includes(selected.type)) {
      setError(
        isImage
          ? "Please select a JPG, PNG or WEBP image."
          : "Please select an MP4, WEBM, MOV, AVI or MKV video."
      );
      return;
    }

    if (selected.size > maxSize) {
      setError(
        isImage
          ? "Image size must be 10 MB or less."
          : "Video size must be 100 MB or less."
      );
      return;
    }

    setError("");
    setFile(selected);
    setPreview(URL.createObjectURL(selected));
  }

  function removeFile() {
    setFile(null);
    setPreview("");
    setError("");
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
      setError(
        mediaType === "image"
          ? "Please select a road image first."
          : "Please select a road video first."
      );
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
        [mediaType]: file,
        mediaType,
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
<<<<<<< HEAD
          <h3>Citizen road report</h3>
          <p>Upload a clear photo and add GPS coordinates for the repair team.</p>
=======
          <h3>Upload Road {mediaType === "image" ? "Image" : "Video"}</h3>
          <p>
            Analyze road damage from a photo or video recording.
          </p>
>>>>>>> 7dcba19d2d2fea1813801286954f60f945d7aa70
        </div>
        <div className="panel-heading-icon">
          {mediaType === "image" ? (
            <ImagePlus size={20} />
          ) : (
            <Video size={20} />
          )}
        </div>
      </div>

      <div className="media-type-switch">
        <button
          type="button"
          className={
            mediaType === "image"
              ? "secondary-button media-option active"
              : "secondary-button media-option"
          }
          onClick={() => selectMediaType("image")}
          disabled={loading}
        >
          <ImagePlus size={17} />
          Image
        </button>

        <button
          type="button"
          className={
            mediaType === "video"
              ? "secondary-button media-option active"
              : "secondary-button media-option"
          }
          onClick={() => selectMediaType("video")}
          disabled={loading}
        >
          <Video size={17} />
          Video
        </button>
      </div>

      {!preview ? (
        <label className="upload-zone">
          <input
            type="file"
            accept={
              mediaType === "image"
                ? "image/jpeg,image/png,image/webp"
                : "video/mp4,video/webm,video/quicktime,video/x-msvideo,video/x-matroska,.mp4,.webm,.mov,.avi,.mkv"
            }
            onChange={selectFile}
            disabled={loading}
            hidden
          />

          <div className="upload-icon">
            <Upload size={25} />
          </div>
          <strong>
            Choose a road {mediaType === "image" ? "image" : "video"}
          </strong>
          <span>
            {mediaType === "image"
              ? "JPG, PNG or WEBP · Maximum 10 MB"
              : "MP4, WEBM, MOV, AVI or MKV · Maximum 100 MB"}
          </span>
          <span className="upload-browse">Browse files</span>
        </label>
      ) : (
        <div className="image-preview">
          {mediaType === "image" ? (
            <img src={preview} alt="Selected road for analysis" />
          ) : (
            <video
              src={preview}
              controls
              preload="metadata"
              style={{
                display: "block",
                width: "100%",
                maxHeight: "320px",
                background: "#111",
                borderRadius: "8px",
              }}
            />
          )}

          <button
            type="button"
            className="remove-image"
            onClick={removeFile}
            aria-label="Remove selected file"
            disabled={loading}
          >
            <X size={18} />
          </button>

          <div className="image-file-name">
            {file?.name}
            {file && (
              <span>
                {" "}({(file.size / (1024 * 1024)).toFixed(2)} MB)
              </span>
            )}
          </div>
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
              disabled={loading}
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
              disabled={loading}
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
<<<<<<< HEAD
          disabled={isLocating}
=======
          disabled={loading}
>>>>>>> 7dcba19d2d2fea1813801286954f60f945d7aa70
        >
          <MapPin size={16} />
          {isLocating ? "Finding location..." : "Use my current location"}
        </button>

        <p className="field-hint">
          Manual coordinates override metadata when supported by the backend.
          Otherwise, available GPS metadata may be used.
        </p>
      </div>

      {error && <div className="error-message" role="alert">{error}</div>}

      <button
        type="submit"
        className="primary-button analyze-button"
        disabled={loading || !file}
      >
        <ScanSearch size={18} />
<<<<<<< HEAD
        {loading ? "Analyzing and saving report..." : "Analyze & Submit Report"}
=======
        {loading
          ? `Analyzing ${mediaType}...`
          : `Analyze Road ${mediaType === "image" ? "Image" : "Video"}`}
>>>>>>> 7dcba19d2d2fea1813801286954f60f945d7aa70
      </button>

      <p className="privacy-note">
        Upload only media you are authorized to use. Do not upload sensitive
        personal information.
      </p>
    </form>
  );
}
