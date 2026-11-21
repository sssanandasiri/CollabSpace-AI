import axios from "axios";

export const api = axios.create({
  baseURL: "http://localhost:8000/api",
});

// Runs before every request: attach the saved token automatically
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Token ${token}`;
  }
  return config;
});

export function errorMessage(err: unknown): string {
  if (axios.isAxiosError(err) && err.response?.data) {
    const data = err.response.data;
    if (typeof data === "object" && data !== null) {
      if (typeof data.detail === "string") return data.detail;
      // field errors like { email: ["..."], password: ["..."] }
      return Object.values(data).flat().join(" ");
    }
  }
  return "Something went wrong. Please try again.";
}
