import axios from "axios";

const isLocal = ["localhost", "127.0.0.1"].includes(window.location.hostname);
const fallback = isLocal
  ? "http://localhost:8000"
  : "https://ai-powered-pcb-defects-detection-production.up.railway.app";

export const API_BASE_URL = (import.meta.env.VITE_API_URL || fallback).replace(/\/+$/, "");

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 120000,
});

export function resolveResultImageUrl(path) {
  return new URL(path, `${API_BASE_URL}/`).href;
}

export default api;
