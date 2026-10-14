export function errorHandler(err, req, res, next) {
  if (res.headersSent) {
    return next(err);
  }

  console.error("[Backend Error]", err.message);

  if (err.code === "LIMIT_FILE_SIZE") {
    return res.status(413).json({
      success: false,
      message: "Image is too large. Maximum allowed size is 10 MB.",
    });
  }

  if (err.code === "LIMIT_UNEXPECTED_FILE") {
    return res.status(400).json({
      success: false,
      message: "Unexpected upload field. Use the field name 'image'.",
    });
  }

  res.status(err.status || 500).json({
    success: false,
    message: err.status ? err.message : "Internal server error.",
  });
}