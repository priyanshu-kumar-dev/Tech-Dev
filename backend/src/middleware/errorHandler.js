
export function errorHandler(err, req, res, next) {
  if (res.headersSent) {
    return next(err);
  }

  console.error("\n========== BACKEND ERROR ==========");
  console.error("Message:", err.message);
  console.error("Status:", err.status || err.statusCode || err.response?.status || "unknown");
  console.error("URL:", req.method, req.originalUrl);

  if (err.response?.data) {
    console.error("External API response:", err.response.data);
  }

  console.error("===================================\n");

  if (err.code === "LIMIT_FILE_SIZE") {
    return res.status(413).json({
      success: false,
      message: "Image is too large. Maximum allowed size is 10 MB.",
    });
  }

  if (err.code === "LIMIT_UNEXPECTED_FILE") {
  return res.status(400).json({
    success: false,
    message: `Unexpected file field: "${err.field}". Expected "image".`,
  });
}

if (err.code === "LIMIT_FILE_COUNT") {
  return res.status(400).json({
    success: false,
    message: "Only one image can be uploaded per request.",
  });
}

  const status = err.status || err.statusCode || 500;

  res.status(status).json({
    success: false,
    message: err.message || "Internal server error.",
  });
}
