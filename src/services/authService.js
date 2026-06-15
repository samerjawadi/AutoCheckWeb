import api from "../config/axios";

export const login = (data) => {
  return api.post("/login", data);
};
