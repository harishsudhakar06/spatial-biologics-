import axios from "axios";

const api = axios.create({
  baseURL: "/api",
  withCredentials: true,
});

export const searchLigands = (query) =>
  api.get(`/search?q=${encodeURIComponent(query)}`);

export const getLigandById = (cid) =>
  api.get(`/summary/${cid}`);

export default api;