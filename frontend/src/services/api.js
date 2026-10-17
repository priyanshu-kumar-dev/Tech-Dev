import axios from "axios";

const api = axios.create({
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
}

export async function checkBackend() {
  try {
    const response = await api.get("/health");
    return response.data;
  } catch (error) {
    throw new Error(
      error.response?.data?.message || "Backend is not reachable."
    );
  }
}

export async function analyzeRoadImage({
  image,
  latitude,
  longitude,
  city,
  ward,
}) {
  const formData = new FormData();
  formData.append("image", image);

  if (latitude !== "" && longitude !== "") {
    formData.append("latitude", String(latitude));
    formData.append("longitude", String(longitude));
  }
  if (city.trim()) formData.append("city", city.trim());
  if (ward.trim()) formData.append("ward", ward.trim());

  const response = await api.post("/analyze", formData);
  return response.data;
}

export async function fetchReports() {
  const response = await api.get("/reports");
  return response.data;
}

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