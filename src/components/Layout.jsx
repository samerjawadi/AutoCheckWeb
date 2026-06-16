import { useState, useEffect } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import { HiHome, HiMenu, HiUsers, HiX, HiLogout, HiShieldCheck } from "react-icons/hi";
import { TbLayoutSidebarLeftCollapse, TbCar, TbTool, TbBuildingStore, TbChartBar } from "react-icons/tb";
import { useLanguage } from "../context/LanguageContext";
import { useTheme } from "../context/ThemeContext";
import { useAuth } from "../context/AuthContext";

const navLinks = [
  { to: "/",          labelKey: "nav_home",      icon: HiHome,         end: true },
  { to: "/customers", labelKey: "nav_customers", icon: HiUsers },
  { to: "/cars",      labelKey: "nav_cars",      icon: TbCar },
  { to: "/jobs",      labelKey: "nav_jobs",      icon: TbTool },
  { to: "/suppliers", labelKey: "nav_suppliers", icon: TbBuildingStore },
  { to: "/finance",   labelKey: "nav_finance",   icon: TbChartBar },
];

export default function Layout() {
  const [expanded, setExpanded]   = useState(true);
  const [mobileOpen, setMobile]   = useState(false);
  const { lang, setLanguage, t }  = useLanguage();
  const { dark, toggle }          = useTheme();
  const { user, profile, isAdmin, logout } = useAuth();
  const location                  = useLocation();

  // Close mobile menu on route change
  useEffect(() => { setMobile(false); }, [location.pathname]);

  // Detect mobile (< 768px) and default sidebar to collapsed
  useEffect(() => {
    if (window.innerWidth < 768) setExpanded(false);
  }, []);

  const NavContent = ({ onNav }) => (
    <>
      <nav className={`flex flex-col gap-1 p-2 mt-2 flex-1 ${expanded ? "items-start" : "items-center"}`}>
        {navLinks.map(({ to, labelKey, icon: Icon, end }) => (
          <NavLink
            key={to} to={to} end={end}
            onClick={onNav}
            className={({ isActive }) =>
              `flex items-center transition-all duration-200 overflow-hidden whitespace-nowrap w-full group/link rounded-lg text-sm font-medium ${
                expanded || mobileOpen ? "gap-3 px-3" : "justify-center px-0"
              } py-2.5 ${
                isActive
                  ? "bg-violet-600 text-white shadow-[0_0_12px_rgba(124,58,237,0.4)]"
                  : "text-neutral-300 hover:bg-neutral-800 hover:text-white"
              }`
            }
          >
            <Icon className="w-5 h-5 shrink-0" />
            <span className={`transition-all duration-300 ${(expanded || mobileOpen) ? "opacity-100 w-auto" : "opacity-0 w-0"}`}>
              {t(labelKey)}
            </span>
          </NavLink>
        ))}

        {/* Admin link — only shown to admins */}
        {isAdmin && (
          <NavLink to="/admin" onClick={onNav}
            className={({ isActive }) =>
              `flex items-center transition-all duration-200 overflow-hidden whitespace-nowrap w-full group/link rounded-lg text-sm font-medium ${
                expanded || mobileOpen ? "gap-3 px-3" : "justify-center px-0"
              } py-2.5 ${
                isActive
                  ? "bg-amber-600 text-white"
                  : "text-amber-400 hover:bg-amber-500/10 hover:text-amber-300"
              }`
            }
          >
            <HiShieldCheck className="w-5 h-5 shrink-0" />
            <span className={`transition-all duration-300 ${(expanded || mobileOpen) ? "opacity-100 w-auto" : "opacity-0 w-0"}`}>
              Admin
            </span>
          </NavLink>
        )}
      </nav>

      {/* User info + Language */}
      <div className={`border-t border-neutral-800 p-2 flex flex-col gap-1`}>
        {/* User info + logout */}
        {user && (
          expanded || mobileOpen ? (
            <div className="flex items-center gap-2 px-2 py-1.5">
              <div className="w-7 h-7 rounded-full bg-violet-600 flex items-center justify-center text-xs font-bold text-white shrink-0">
                {(profile?.name ?? user.email ?? "U")[0].toUpperCase()}
              </div>
              <span className="flex-1 text-xs text-neutral-400 truncate">
                {profile?.name || user.email}
              </span>
              <button onClick={logout} title="Logout"
                className="p-1 text-neutral-500 hover:text-red-400 transition-colors cursor-pointer shrink-0">
                <HiLogout className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="flex justify-center py-1.5">
              <div className="w-7 h-7 rounded-full bg-violet-600 flex items-center justify-center text-xs font-bold text-white">
                {(profile?.name ?? user.email ?? "U")[0].toUpperCase()}
              </div>
            </div>
          )
        )}

        {/* Language pills */}
        <div className={`flex ${expanded || mobileOpen ? "gap-2" : "flex-col gap-1 items-center"}`}>
          {["en", "fr"].map((l) => (
            <button key={l} onClick={() => setLanguage(l)}
              className={`flex items-center justify-center rounded-lg text-xs font-bold uppercase transition-colors cursor-pointer ${
                expanded || mobileOpen ? "flex-1 py-2" : "w-10 py-2"
              } ${lang === l ? "bg-violet-600 text-white" : "text-neutral-500 hover:bg-neutral-800 hover:text-white"}`}>
              {l === "en" ? "🇬🇧 EN" : "🇫🇷 FR"}
            </button>
          ))}
        </div>
      </div>
    </>
  );

  return (
    <div className="flex min-h-screen w-full overflow-x-hidden bg-neutral-950 text-neutral-100">

      {/* ── Mobile top bar ─────────────────────────────────────── */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-50 h-14 bg-neutral-900 border-b border-neutral-800 flex items-center px-4 gap-3">
        <button onClick={() => setMobile((o) => !o)} className="p-1.5 text-neutral-400 hover:text-white cursor-pointer">
          <HiMenu className="w-6 h-6" />
        </button>
        <span className="text-lg font-bold"><span className="text-yellow-400">Auto</span><span className="text-white">Check</span></span>
      </div>

      {/* ── Mobile overlay backdrop ─────────────────────────────── */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-40 bg-black/60" onClick={() => setMobile(false)} />
      )}

      {/* ── Mobile drawer ───────────────────────────────────────── */}
      <aside className={`md:hidden fixed top-0 left-0 h-full z-50 w-64 bg-neutral-900 border-r border-neutral-800 flex flex-col transition-transform duration-300 ${mobileOpen ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="flex items-center justify-between h-14 px-4 border-b border-neutral-800 shrink-0">
          <span className="text-lg font-bold"><span className="text-yellow-400">Auto</span><span className="text-white">Check</span></span>
          <button onClick={() => setMobile(false)} className="p-1.5 text-neutral-400 hover:text-white cursor-pointer"><HiX className="w-5 h-5" /></button>
        </div>
        <NavContent onNav={() => setMobile(false)} />
      </aside>

      {/* ── Desktop sidebar ─────────────────────────────────────── */}
      <aside className={`hidden md:flex fixed top-0 left-0 h-full z-40 bg-neutral-900 border-r border-neutral-800 flex-col transition-[width] duration-300 ease-in-out ${expanded ? "w-56" : "w-16"}`}>
        {/* Toggle */}
        <button onClick={() => setExpanded((p) => !p)}
          aria-label="Toggle navigation"
          className={`flex items-center h-14 border-b border-neutral-800 hover:bg-neutral-800 transition-colors shrink-0 overflow-hidden cursor-pointer group ${expanded ? "justify-between px-4" : "justify-center"}`}>
          <span className={`text-sm font-bold tracking-wide transition-all duration-300 whitespace-nowrap ${expanded ? "opacity-100 w-auto" : "opacity-0 w-0"}`}>
            <span className="text-yellow-400 text-xl">Auto</span>
            <span className="text-white text-xl">Check</span>
          </span>
          {expanded
            ? <TbLayoutSidebarLeftCollapse className="w-5 h-5 text-neutral-400 shrink-0 group-hover:scale-110 transition-transform" />
            : <HiMenu className="w-5 h-5 text-neutral-400 shrink-0 group-hover:scale-110 transition-transform" />}
        </button>
        <NavContent onNav={undefined} />
      </aside>

      {/* ── Page content ────────────────────────────────────────── */}
      <main className={`flex-1 min-w-0 overflow-x-hidden transition-[margin] duration-300 ease-in-out pt-14 md:pt-0 ${expanded ? "md:ml-56" : "md:ml-16"}`}>
        <div className="page-enter" key={location.pathname}>
          <Outlet />
        </div>
      </main>
    </div>
  );
}
