import { useState } from "react";
import { NavLink, Outlet } from "react-router-dom";
import { HiHome, HiMenu, HiUsers } from "react-icons/hi";
import { TbLayoutSidebarLeftCollapse, TbCar, TbTool, TbBuildingStore } from "react-icons/tb";
import { useLanguage } from "../context/LanguageContext";

const navLinks = [
  { to: "/",          labelKey: "nav_home",      icon: HiHome,         end: true },
  { to: "/customers", labelKey: "nav_customers", icon: HiUsers },
  { to: "/cars",      labelKey: "nav_cars",      icon: TbCar },
  { to: "/jobs",      labelKey: "nav_jobs",      icon: TbTool },
  { to: "/suppliers", labelKey: "nav_suppliers", icon: TbBuildingStore },
];

export default function Layout() {
  const [expanded, setExpanded] = useState(true);
  const { lang, setLanguage, t } = useLanguage();

  return (
    <div className="flex min-h-screen bg-neutral-950 text-neutral-100">
      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 h-full z-40 bg-neutral-900 border-r border-neutral-800 flex flex-col transition-[width] duration-300 ease-in-out ${
          expanded ? "w-56" : "w-16"
        }`}
      >
        {/* Toggle button — shows brand name when expanded */}
        <button
          onClick={() => setExpanded((prev) => !prev)}
          aria-label="Toggle navigation"
          aria-expanded={expanded}
          className={`flex items-center h-14 border-b border-neutral-800 hover:bg-neutral-800 transition-[background-color] duration-200 shrink-0 overflow-hidden cursor-pointer group ${
            expanded ? "justify-between px-4" : "justify-center"
          }`}
        >
          <span
            className={`text-sm font-bold tracking-wide transition-all duration-300 whitespace-nowrap ${
              expanded ? "opacity-100 w-auto" : "opacity-0 w-0"
            }`}
          >
            <span className="text-yellow-400 text-xl">Auto</span>
            <span className="text-white text-xl">Check</span>
          </span>
          {expanded ? (
            <TbLayoutSidebarLeftCollapse className="w-5 h-5 text-neutral-400 shrink-0 transition-transform duration-200 group-hover:scale-110" />
          ) : (
            <HiMenu className="w-5 h-5 text-neutral-400 shrink-0 transition-transform duration-200 group-hover:scale-110" />
          )}
        </button>

        {/* Nav links */}
        <nav className={`flex flex-col gap-1 p-2 mt-2 flex-1 ${expanded ? "items-start" : "items-center"}`}>
          {navLinks.map(({ to, labelKey, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex items-center transition-all duration-200 overflow-hidden whitespace-nowrap w-full group/link rounded-lg text-sm font-medium ${
                  expanded ? "gap-3 px-3" : "justify-center px-0"
                } py-2.5 ${
                  isActive
                    ? "bg-violet-600 text-white shadow-[0_0_12px_rgba(124,58,237,0.4)]"
                    : "text-neutral-300 hover:bg-neutral-800 hover:text-white hover:translate-x-0.5"
                }`
              }
            >
              <Icon className="w-5 h-5 shrink-0 transition-transform duration-200 group-hover/link:scale-110" />
              <span
                className={`transition-all duration-300 ${
                  expanded ? "opacity-100 w-auto" : "opacity-0 w-0"
                }`}
              >
                {t(labelKey)}
              </span>
            </NavLink>
          ))}
        </nav>

        {/* Language toggle */}
        <div className={`border-t border-neutral-800 p-2 flex ${expanded ? "gap-2" : "flex-col gap-1 items-center"}`}>
          {["en", "fr"].map((l) => (
            <button
              key={l}
              onClick={() => setLanguage(l)}
              className={`flex items-center justify-center rounded-lg text-xs font-bold uppercase transition-colors cursor-pointer ${
                expanded ? "flex-1 py-2" : "w-10 py-2"
              } ${
                lang === l
                  ? "bg-violet-600 text-white"
                  : "text-neutral-500 hover:bg-neutral-800 hover:text-white"
              }`}
            >
              {l === "en" ? "🇬🇧 EN" : "🇫🇷 FR"}
            </button>
          ))}
        </div>
      </aside>

      {/* Page content — offset by sidebar width */}
      <main
        className={`flex-1 transition-[margin] duration-300 ease-in-out ${
          expanded ? "ml-56" : "ml-16"
        }`}
      >
        <div className="page-enter" key={expanded}>
          <Outlet />
        </div>
      </main>
    </div>
  );
}
