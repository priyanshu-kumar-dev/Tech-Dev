
import { v2 as cloudinary } from "cloudinary";

export async function uploadMedia(filePath, resourceType = "auto") {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME?.trim();
  const apiKey = process.env.CLOUDINARY_API_KEY?.trim();
  const apiSecret = process.env.CLOUDINARY_API_SECRET?.trim();

  if (!cloudName || !apiKey || !apiSecret) {
    throw new Error(
      "Cloudinary credentials missing. Check backend/.env."
    );
  }

  cloudinary.config({
    cloud_name: cloudName,
    api_key: apiKey,
    api_secret: apiSecret,
    secure: true,
  });

  try {
    const result = await cloudinary.uploader.upload(filePath, {
      folder: "roadshield/reports",
      resource_type: resourceType,
    });

    return {
      url: result.secure_url,
      publicId: result.public_id,
      resourceType: result.resource_type,
      format: result.format,
      bytes: result.bytes,
    };
  } catch (error) {
    const details =
      error.error?.message ||
      error.message ||
      "Unknown Cloudinary error";

    console.error("[Cloudinary Upload Error]", {
      message: details,
      httpCode: error.http_code || error.httpCode || error.status,
    });

    const uploadError = new Error(`Cloudinary: ${details}`);
    uploadError.status =
      error.http_code || error.httpCode || error.status || 502;

    throw uploadError;
  }
}

export default cloudinary;
