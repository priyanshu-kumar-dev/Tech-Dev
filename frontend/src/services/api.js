
import axios from "axios";

const api = axios.create({
<<<<<<< HEAD
  baseURL: (import.meta.env.VITE_API_URL || "http://localhost:5000/api").replace(/\/+$/, "") + "/",
  timeout: 60000,
  withCredentials: true,
});

export async function signUp({ name, email, phoneNumber, password, passwordConfirm }) {
  const response = await api.post("/auth/signup", {
    name,
    email,
    phoneNumber,
    password,
    passwordConfirm,
  });
  return response.data;
}

export async function logIn({ email, password }) {
  const response = await api.post("/auth/login", { email, password });
  return response.data;
}

export async function fetchCurrentUser() {
  try {
    const response = await api.get("/auth/me");
    return response.data.user;
  } catch (error) {
    if (error.response?.status === 401) {
      return null;
    }
    throw error;
  }
}

export async function logOut() {
  const response = await api.post("/auth/logout");
  return response.data;
=======
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
>>>>>>> 7dcba19d2d2fea1813801286954f60f945d7aa70
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
<<<<<<< HEAD
  city,
  ward,
}) {
=======
}) {
  if (!image) {
    throw new Error("Please select a road image.");
  }

>>>>>>> 7dcba19d2d2fea1813801286954f60f945d7aa70
  const formData = new FormData();
  formData.append("image", image);

  if (latitude !== "" && latitude != null &&
      longitude !== "" && longitude != null) {
    formData.append("latitude", String(latitude));
    formData.append("longitude", String(longitude));
  }
  if (city.trim()) formData.append("city", city.trim());
  if (ward.trim()) formData.append("ward", ward.trim());

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

<<<<<<< HEAD
export async function updateMaintenanceStatus(reportId, status, assignedTo) {
  const response = await api.patch(`/reports/${reportId}/status`, {
    status,
    assignedTo,
  });
  return response.data;
}

export async function uploadRepairPhoto(reportId, image) {
  const formData = new FormData();
  formData.append("image", image);
  const response = await api.post(
    `/reports/${reportId}/repair-photo`,
    formData
  );
  return response.data;
}

export async function deleteReport(reportId) {
  const response = await api.delete(`/reports/${reportId}`);
  return response.data;
}

export async function fetchModelPerformance() {
  const response = await api.get("/analytics/model-performance");
  return response.data;
}

export function getAssetUrl(assetPath) {
  const apiOrigin = new URL(api.defaults.baseURL, window.location.origin).origin;
  return new URL(assetPath, apiOrigin).toString();
}

export default api;
=======
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
>>>>>>> 7dcba19d2d2fea1813801286954f60f945d7aa70
