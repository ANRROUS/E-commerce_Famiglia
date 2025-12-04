import axiosInstance from "./axiosInstance";

export const twofaAPI = {
  setup: () => axiosInstance.post("/api/auth/perfil/setup"),
  verify2FA: (data) => axiosInstance.post("/api/auth/perfil/login", data),
  verify: (codigo) => axiosInstance.post("/api/auth/perfil/verify", { codigo }),
  disable: () => axiosInstance.post("/api/auth/perfil/disable"),
};
