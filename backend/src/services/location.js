
import exifr from "exifr";
import ffmpeg from "fluent-ffmpeg";
import ffprobePath from "ffprobe-static";

if (ffprobePath) {
  ffmpeg.setFfprobePath(
    typeof ffprobePath === "string"
      ? ffprobePath
      : ffprobePath.path
  );
}

function validateLocation(latitude, longitude, source) {
  const lat = Number(latitude);
  const lng = Number(longitude);

  if (
    !Number.isFinite(lat) ||
    !Number.isFinite(lng) ||
    Math.abs(lat) > 90 ||
    Math.abs(lng) > 180
  ) {
    return null;
  }

  return {
    latitude: lat,
    longitude: lng,
    source,
  };
}

export async function extractImageLocation(filePath) {
  try {
    const gps = await exifr.gps(filePath);

    if (gps) {
      const location = validateLocation(
        gps.latitude,
        gps.longitude,
        "image-exif"
      );

      if (location) return location;
    }
  } catch (error) {
    console.warn("Image GPS metadata unavailable:", error.message);
  }

  return null;
}

export async function extractVideoLocation(filePath) {
  if (!ffprobePath) {
    console.warn("FFprobe unavailable; video GPS skipped.");
    return null;
  }

  try {
    const metadata = await new Promise((resolve, reject) => {
      ffmpeg.ffprobe(filePath, (error, data) => {
        if (error) reject(error);
        else resolve(data);
      });
    });

    const tagGroups = [
      metadata?.format?.tags || {},
      ...(metadata?.streams || []).map(
        (stream) => stream.tags || {}
      ),
    ];

    for (const tags of tagGroups) {
      for (const [key, value] of Object.entries(tags)) {
        const normalizedKey = key.toLowerCase();

        if (
          !normalizedKey.includes("location") &&
          !normalizedKey.includes("gps")
        ) {
          continue;
        }

        // Common video location format: +26.9124+075.7873/
        const match = String(value).match(
          /([+-]\d{1,3}(?:\.\d+)?)([+-]\d{1,3}(?:\.\d+)?)/
        );

        if (match) {
          const location = validateLocation(
            match[1],
            match[2],
            "video-metadata"
          );

          if (location) return location;
        }
      }
    }
  } catch (error) {
    console.warn("Video GPS metadata unavailable:", error.message);
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

  const location = validateLocation(
    latitude,
    longitude,
    "manual-or-browser-gps"
  );

  if (!location) {
    const error = new Error("Invalid latitude or longitude.");
    error.status = 400;
    throw error;
  }

  return location;
}
