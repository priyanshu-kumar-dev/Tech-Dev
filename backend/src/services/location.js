import exifr from "exifr";

export async function extractImageLocation(filePath) {
  try {
    const gps = await exifr.gps(filePath);

    if (
      gps &&
      Number.isFinite(gps.latitude) &&
      Number.isFinite(gps.longitude) &&
      Math.abs(gps.latitude) <= 90 &&
      Math.abs(gps.longitude) <= 180
    ) {
      return {
        latitude: gps.latitude,
        longitude: gps.longitude,
        source: "image-exif",
      };
    }
  } catch (error) {
    console.warn("Image GPS metadata unavailable:", error.message);
  }

  return null;
}

export function parseManualLocation(latitude, longitude) {
  if (
    latitude === undefined ||
    longitude === undefined ||
    latitude === "" ||
    longitude === ""
  ) {
    return null;
  }

  const lat = Number(latitude);
  const lng = Number(longitude);

  if (
    !Number.isFinite(lat) ||
    !Number.isFinite(lng) ||
    Math.abs(lat) > 90 ||
    Math.abs(lng) > 180
  ) {
    const error = new Error("Invalid latitude or longitude.");
    error.status = 400;
    throw error;
  }

  return {
    latitude: lat,
    longitude: lng,
    source: "manual-or-browser-gps",
  };
}