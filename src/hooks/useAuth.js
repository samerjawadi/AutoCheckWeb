// src/hooks/useAuth.js
import { useState } from "react";
import { login } from "../services/authService";

export default function useAuth() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const loginUser = async (data) => {
    setLoading(true);
    setError(null);
    try {
      const response = await login(data);
      localStorage.setItem("token", response.data.token);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  };

  return { loginUser, loading, error };
}