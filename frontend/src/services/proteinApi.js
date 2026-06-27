import axios from "axios";

const api = axios.create({
  baseURL: "/api/proteins",
  withCredentials: true,
});

export const searchProteins = (params) =>
  api.get("/search", { params });

export const getProteinById = (id) =>
  api.get(`/${id}`);

export default api;