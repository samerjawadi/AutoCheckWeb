import { useState } from "react";
import { HiEye, HiEyeOff, HiLockClosed } from "react-icons/hi";
import { useAuth } from "../../context/AuthContext";

export default function LoginPage() {
  const { login } = useAuth();
  const [emailOrName, setEmailOrName] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw]     = useState(false);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    const start = Date.now();
    setError("");
    try {
      await login(emailOrName, password);
    } catch (err) {
      setError(err.message ?? "Login failed");
    } finally {
      const delta = Date.now() - start;
      const minMs = (typeof process !== "undefined" && process.env && process.env.NODE_ENV === "test") ? 0 : 1000;
      const wait = Math.max(0, minMs - delta);
      setTimeout(() => setLoading(false), wait);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen login-logos-bg bg-neutral-950 px-4">
      <form onSubmit={handleSubmit}
        className="w-full max-w-sm bg-neutral-900 border border-neutral-800 rounded-2xl p-8 flex flex-col gap-6 shadow-2xl">

        {/* Brand */}
        <div className="text-center">
          <h1 className="text-3xl font-extrabold">
            <span className="text-yellow-400">Auto</span>
            <span className="text-white">Check</span>
          </h1>
          <p className="text-neutral-500 text-sm mt-1">Garage Management System</p>
        </div>

        {/* Icon */}
        <div className="flex justify-center">
          <div className="p-4 bg-violet-600/10 rounded-2xl">
            <HiLockClosed className="w-8 h-8 text-violet-400" />
          </div>
        </div>

        

        {/* Email or Name */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-neutral-400">Email or Name</label>
          <input
            type="text" required autoFocus
            value={emailOrName} onChange={(e) => setEmailOrName(e.target.value)}
            placeholder="you@example.com or John Doe"
            className="bg-neutral-800 border border-neutral-700 rounded-xl px-4 py-3 text-neutral-100 placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-violet-500 text-sm"
          />
        </div>

        {/* Password */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-neutral-400">Password</label>
          <div className="relative">
            <input
              type={showPw ? "text" : "password"} required
              value={password} onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-4 py-3 text-neutral-100 placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-violet-500 text-sm pr-10"
            />
            <button type="button" onClick={() => setShowPw((s) => !s)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-neutral-300 cursor-pointer">
              {showPw ? <HiEyeOff className="w-4 h-4" /> : <HiEye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {error && (
          <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2">
            {error}
          </p>
        )}

        <button type="submit" disabled={loading}
          className="w-full py-3 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white font-semibold rounded-xl transition-colors cursor-pointer">
          {loading ? "Connexion…" : "Se connecter"}
        </button>
      </form>
    </div>
  );
}
