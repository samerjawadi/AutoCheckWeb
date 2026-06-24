import { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { HiLockClosed, HiEye, HiEyeOff } from "react-icons/hi";
import { useLanguage } from "../context/LanguageContext";

const PIN_KEY   = "ac_finance_pin";
const SESSION_KEY = "ac_finance_unlocked";

const getPin       = ()  => localStorage.getItem(PIN_KEY);       // null = not set yet
const setPin       = (p) => localStorage.setItem(PIN_KEY, p);
const isSession    = ()  => sessionStorage.getItem(SESSION_KEY) === "1";
const grantSession = ()  => sessionStorage.setItem(SESSION_KEY, "1");
const revokeSession= ()  => sessionStorage.removeItem(SESSION_KEY);

export { revokeSession };

export default function PinLock({ children }) {
  const { lang } = useLanguage();
  const fr = lang === "fr";
  const location = useLocation();

  const [unlocked, setUnlocked]     = useState(isSession);
  const [input, setInput]           = useState("");
  const [error, setError]           = useState("");
  const [showPin, setShowPin]       = useState(false);

  // First-time setup state (no PIN stored yet)
  const [setting, setSetting]       = useState(() => !getPin());
  const [setupPin, setSetupPin]     = useState("");
  const [setupConfirm, setSetupConfirm] = useState("");
  const [setupErr, setSetupErr]     = useState("");

  // Change-PIN state

  // Lock whenever the route changes away from /finance
  useEffect(() => {
    if (!location.pathname.startsWith("/finance")) {
      const id = setTimeout(() => {
        revokeSession();
        setUnlocked(false);
        setInput("");
      }, 0);
      return () => clearTimeout(id);
    }
  }, [location.pathname]);

  const setupSubmit = (e) => {
    e.preventDefault();
    if (setupPin.length < 4)          return setSetupErr(fr ? "Minimum 4 chiffres" : "Minimum 4 digits");
    if (setupPin !== setupConfirm)    return setSetupErr(fr ? "Les codes ne correspondent pas" : "PINs do not match");
    setPin(setupPin);
    grantSession();
    setSetting(false);
    setUnlocked(true);
  };

  const unlock = (e) => {
    e.preventDefault();
    if (input === getPin()) {
      grantSession();
      setUnlocked(true);
      setError("");
    } else {
      setError(fr ? "Code incorrect" : "Incorrect PIN");
      setInput("");
    }
  };

  // First-time: no PIN set yet — show setup screen
  if (setting) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-neutral-950">
        <form onSubmit={setupSubmit}
          className="bg-neutral-900 border border-neutral-800 rounded-2xl p-8 w-full max-w-xs flex flex-col items-center gap-6 shadow-2xl">
          <div className="p-4 bg-yellow-500/10 rounded-2xl">
            <HiLockClosed className="w-8 h-8 text-yellow-400" />
          </div>
          <div className="text-center">
            <h2 className="text-lg font-bold text-neutral-100">{fr ? "Créer un code PIN" : "Create a PIN"}</h2>
            <p className="text-xs text-neutral-500 mt-1">{fr ? "Ce code protège l'espace Finance." : "This PIN protects the Finance area."}</p>
          </div>
          <input type="password" inputMode="numeric" maxLength={8} autoFocus
            autoComplete="off" data-lpignore="true" data-1p-ignore
            placeholder={fr ? "Nouveau code (min. 4)" : "New PIN (min. 4)"}
            value={setupPin} onChange={(e) => { setSetupPin(e.target.value); setSetupErr(""); }}
            className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-4 py-3 text-center text-2xl tracking-[0.5em] text-neutral-100 focus:outline-none focus:ring-2 focus:ring-yellow-400"
          />
          <input type="password" inputMode="numeric" maxLength={8}
            autoComplete="off" data-lpignore="true" data-1p-ignore
            placeholder={fr ? "Confirmer" : "Confirm PIN"}
            value={setupConfirm} onChange={(e) => { setSetupConfirm(e.target.value); setSetupErr(""); }}
            className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-4 py-3 text-center text-2xl tracking-[0.5em] text-neutral-100 focus:outline-none focus:ring-2 focus:ring-yellow-400"
          />
          {setupErr && <p className="text-sm text-red-400 -mt-4">{setupErr}</p>}
          <button type="submit"
            className="w-full py-3 bg-yellow-600 hover:bg-yellow-500 text-white font-medium rounded-xl transition-colors cursor-pointer">
            {fr ? "Créer et accéder" : "Create & Unlock"}
          </button>
        </form>
      </div>
    );
  }

  if (unlocked) {
    return <>{children}</>;
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-neutral-950 px-4">
      <form onSubmit={unlock}
        className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 w-full max-w-xs flex flex-col items-center gap-4 shadow-2xl">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-yellow-500/10 rounded-xl">
            <HiLockClosed className="w-5 h-5 text-yellow-400" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-neutral-100">{fr ? "Zone protégée" : "Protected Area"}</h2>
            <p className="text-xs text-neutral-500">{fr ? "Entrez votre code PIN" : "Enter your PIN"}</p>
          </div>
        </div>

        <div className="w-full">
          <input
            type={showPin ? "text" : "password"}
            inputMode="numeric"
            maxLength={8}
            autoFocus
            autoComplete="off"
            data-lpignore="true"
            data-1p-ignore
            value={input}
            onChange={(e) => { setInput(e.target.value); setError(""); }}
            className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-4 py-2.5 text-center text-xl tracking-[0.5em] text-neutral-100 focus:outline-none focus:ring-2 focus:ring-yellow-400"
            placeholder="••••"
          />
        </div>
        <div className="flex items-center gap-2 -mt-2">
          <button type="button" onClick={() => setShowPin((s) => !s)}
            className="flex items-center gap-1 text-xs text-neutral-500 hover:text-neutral-300 cursor-pointer transition-colors">
            {showPin ? <HiEyeOff className="w-3.5 h-3.5" /> : <HiEye className="w-3.5 h-3.5" />}
            {showPin ? (fr ? "Masquer" : "Hide") : (fr ? "Afficher" : "Show")}
          </button>
        </div>

        {error && <p className="text-xs text-red-400 -mt-1">{error}</p>}

        <button type="submit"
          className="w-full py-2.5 bg-yellow-600 hover:bg-yellow-500 text-white text-sm font-medium rounded-xl transition-colors cursor-pointer">
          {fr ? "Déverrouiller" : "Unlock"}
        </button>
      </form>
    </div>
  );
}
