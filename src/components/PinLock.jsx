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
  const [changing, setChanging]     = useState(false);
  const [newPin, setNewPin]         = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [pinMsg, setPinMsg]         = useState("");

  // Lock whenever the route changes away from /finance
  useEffect(() => {
    if (!location.pathname.startsWith("/finance")) {
      revokeSession();
      setUnlocked(false);
      setInput("");
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

  const savePin = (e) => {
    e.preventDefault();
    if (newPin.length < 4)       return setPinMsg(fr ? "Minimum 4 chiffres" : "Minimum 4 digits");
    if (newPin !== confirmPin)   return setPinMsg(fr ? "Les codes ne correspondent pas" : "PINs do not match");
    setPin(newPin);
    setNewPin(""); setConfirmPin("");
    setChanging(false);
    setPinMsg(fr ? "Code modifié ✓" : "PIN changed ✓");
    setTimeout(() => setPinMsg(""), 3000);
  };

  // First-time: no PIN set yet — show setup screen
  if (setting) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-neutral-950">
        <form onSubmit={setupSubmit}
          className="bg-neutral-900 border border-neutral-800 rounded-2xl p-8 w-full max-w-xs flex flex-col items-center gap-6 shadow-2xl">
          <div className="p-4 bg-violet-600/10 rounded-2xl">
            <HiLockClosed className="w-8 h-8 text-violet-400" />
          </div>
          <div className="text-center">
            <h2 className="text-lg font-bold text-neutral-100">{fr ? "Créer un code PIN" : "Create a PIN"}</h2>
            <p className="text-xs text-neutral-500 mt-1">{fr ? "Ce code protège l'espace Finance." : "This PIN protects the Finance area."}</p>
          </div>
          <input type="password" inputMode="numeric" maxLength={8} autoFocus
            placeholder={fr ? "Nouveau code (min. 4)" : "New PIN (min. 4)"}
            value={setupPin} onChange={(e) => { setSetupPin(e.target.value); setSetupErr(""); }}
            className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-4 py-3 text-center text-2xl tracking-[0.5em] text-neutral-100 focus:outline-none focus:ring-2 focus:ring-violet-500"
          />
          <input type="password" inputMode="numeric" maxLength={8}
            placeholder={fr ? "Confirmer" : "Confirm PIN"}
            value={setupConfirm} onChange={(e) => { setSetupConfirm(e.target.value); setSetupErr(""); }}
            className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-4 py-3 text-center text-2xl tracking-[0.5em] text-neutral-100 focus:outline-none focus:ring-2 focus:ring-violet-500"
          />
          {setupErr && <p className="text-sm text-red-400 -mt-4">{setupErr}</p>}
          <button type="submit"
            className="w-full py-3 bg-violet-600 hover:bg-violet-500 text-white font-medium rounded-xl transition-colors cursor-pointer">
            {fr ? "Créer et accéder" : "Create & Unlock"}
          </button>
        </form>
      </div>
    );
  }

  if (unlocked) {
    return (
      <>
        {children}
        {/* Change PIN & Lock button injected at bottom of page via portal-like approach */}
        <div className="fixed bottom-4 right-4 z-40 flex flex-col items-end gap-2">
          {pinMsg && (
            <span className="text-xs text-green-400 bg-neutral-900 border border-neutral-800 px-3 py-1.5 rounded-lg">{pinMsg}</span>
          )}
          {changing ? (
            <form onSubmit={savePin} className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 flex flex-col gap-3 shadow-xl w-64">
              <p className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">{fr ? "Changer le code" : "Change PIN"}</p>
              <input type="password" inputMode="numeric" maxLength={8} placeholder={fr ? "Nouveau code" : "New PIN"}
                value={newPin} onChange={(e) => setNewPin(e.target.value)}
                className="bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-neutral-100 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 tracking-widest"
              />
              <input type="password" inputMode="numeric" maxLength={8} placeholder={fr ? "Confirmer" : "Confirm"}
                value={confirmPin} onChange={(e) => setConfirmPin(e.target.value)}
                className="bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-neutral-100 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 tracking-widest"
              />
              {pinMsg && <p className="text-xs text-red-400">{pinMsg}</p>}
              <div className="flex gap-2">
                <button type="button" onClick={() => { setChanging(false); setPinMsg(""); }}
                  className="flex-1 py-2 text-xs text-neutral-400 hover:text-white bg-neutral-800 rounded-lg transition-colors cursor-pointer">
                  {fr ? "Annuler" : "Cancel"}
                </button>
                <button type="submit"
                  className="flex-1 py-2 text-xs text-white bg-violet-600 hover:bg-violet-500 rounded-lg transition-colors cursor-pointer">
                  {fr ? "Enregistrer" : "Save"}
                </button>
              </div>
            </form>
          ) : (
            <div className="flex gap-2">
              <button onClick={() => setChanging(true)}
                className="text-xs text-neutral-500 hover:text-white bg-neutral-900 border border-neutral-800 px-3 py-1.5 rounded-lg transition-colors cursor-pointer">
                {fr ? "Changer le code" : "Change PIN"}
              </button>
              <button onClick={() => { revokeSession(); setUnlocked(false); setInput(""); }}
                className="flex items-center gap-1.5 text-xs text-neutral-400 hover:text-white bg-neutral-900 border border-neutral-800 px-3 py-1.5 rounded-lg transition-colors cursor-pointer">
                <HiLockClosed className="w-3.5 h-3.5" /> {fr ? "Verrouiller" : "Lock"}
              </button>
            </div>
          )}
        </div>
      </>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-neutral-950">
      <form onSubmit={unlock}
        className="bg-neutral-900 border border-neutral-800 rounded-2xl p-8 w-full max-w-xs flex flex-col items-center gap-6 shadow-2xl">
        <div className="p-4 bg-violet-600/10 rounded-2xl">
          <HiLockClosed className="w-8 h-8 text-violet-400" />
        </div>
        <div className="text-center">
          <h2 className="text-lg font-bold text-neutral-100">{fr ? "Zone protégée" : "Protected Area"}</h2>
          <p className="text-xs text-neutral-500 mt-1">{fr ? "Entrez votre code PIN pour continuer" : "Enter your PIN to continue"}</p>
        </div>

        <div className="relative w-full">
          <input
            type={showPin ? "text" : "password"}
            inputMode="numeric"
            maxLength={8}
            autoFocus
            value={input}
            onChange={(e) => { setInput(e.target.value); setError(""); }}
            className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-4 py-3 text-center text-2xl tracking-[0.5em] text-neutral-100 focus:outline-none focus:ring-2 focus:ring-violet-500"
            placeholder="••••"
          />
          <button type="button" onClick={() => setShowPin((s) => !s)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-neutral-300 cursor-pointer">
            {showPin ? <HiEyeOff className="w-4 h-4" /> : <HiEye className="w-4 h-4" />}
          </button>
        </div>

        {error && <p className="text-sm text-red-400 -mt-2">{error}</p>}

        <button type="submit"
          className="w-full py-3 bg-violet-600 hover:bg-violet-500 text-white font-medium rounded-xl transition-colors cursor-pointer">
          {fr ? "Déverrouiller" : "Unlock"}
        </button>
      </form>
    </div>
  );
}
