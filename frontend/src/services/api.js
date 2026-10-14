import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:5000/api",
  timeout: 60000,
});

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

export async function analyzeRoadImage({ image, latitude, longitude }) {
  const formData = new FormData();
  formData.append("image", image);

  if (latitude !== "" && longitude !== "") {
    formData.append("latitude", String(latitude));
    formData.append("longitude", String(longitude));
  }

  const response = await api.post("/analyze", formData);
  return response.data;
}

export async function fetchReports() {
  const response = await api.get("/reports");
  return response.data;
}

export default api;