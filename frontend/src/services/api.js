
import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:5000/api",
  timeout: 180000,
});

function getErrorMessage(error, fallback) {
  return (
    error.response?.data?.message ||
    error.response?.data?.detail ||
    error.response?.data?.error ||
    error.message ||
    fallback
  );
}

export async function checkBackend() {
  try {
    const response = await api.get("/health");
    return response.data;
  } catch (error) {
    throw new Error(
      getErrorMessage(error, "Backend is not reachable.")
    );
  }
}

export async function analyzeRoadImage({
  image,
  latitude,
  longitude,
}) {
  if (!image) {
    throw new Error("Please select a road image.");
  }

  const formData = new FormData();
  formData.append("image", image);

  if (latitude !== "" && latitude != null &&
      longitude !== "" && longitude != null) {
    formData.append("latitude", String(latitude));
    formData.append("longitude", String(longitude));
  }

  try {
    const response = await api.post("/analyze", formData);
    return response.data;
  } catch (error) {
    throw new Error(
      getErrorMessage(error, "Image analysis failed.")
    );
  }
}

export async function analyzeRoadVideo({
  video,
  latitude,
  longitude,
}) {
  if (!video) {
    throw new Error("Please select a road video.");
  }

  const formData = new FormData();
  formData.append("video", video);

  if (latitude !== "" && latitude != null &&
      longitude !== "" && longitude != null) {
    formData.append("latitude", String(latitude));
    formData.append("longitude", String(longitude));
  }

  try {
    const response = await api.post("/analyze-video", formData);
    return response.data;
  } catch (error) {
    throw new Error(
      getErrorMessage(error, "Video analysis failed.")
    );
  }
}

export async function fetchReports() {
  try {
    const response = await api.get("/reports");

    if (!response.data?.success) {
      throw new Error(
        response.data?.message || "Could not load reports."
      );
    }

    return response.data;
  } catch (error) {
    throw new Error(
      getErrorMessage(error, "Could not load reports.")
    );
  }
}

export async function fetchReportById(id) {
  try {
    const response = await api.get(
      `/reports/${encodeURIComponent(id)}`
    );
    return response.data;
  } catch (error) {
    throw new Error(
      getErrorMessage(error, "Could not load this report.")
    );
  }
}

export async function updateReportStatus(id, data) {
  try {
    const response = await api.patch(
      `/reports/${encodeURIComponent(id)}/status`,
      data
    );
    return response.data;
  } catch (error) {
    throw new Error(
      getErrorMessage(error, "Could not update repair workflow.")
    );
  }
}

export async function uploadRepairPhoto(id, { photo, type, note = "" }) {
  if (!photo) {
    throw new Error("Please select a repair photo.");
  }

  if (!["before", "after"].includes(type)) {
    throw new Error("Photo type must be before or after.");
  }

  const formData = new FormData();
  formData.append("photo", photo);
  formData.append("type", type);
  formData.append("note", note);

  try {
    const response = await api.post(
      `/reports/${encodeURIComponent(id)}/repair-photos`,
      formData
    );

    return response.data;
  } catch (error) {
    throw new Error(
      getErrorMessage(error, "Could not upload repair photo.")
    );
  }
}

export default api;
