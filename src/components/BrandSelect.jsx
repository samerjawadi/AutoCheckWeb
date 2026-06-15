import { useState, useRef, useEffect } from "react";
import { TbCar } from "react-icons/tb";
import { CAR_BRANDS } from "../utils/carBrands";

const inputCls =
  "w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-neutral-100 placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-violet-500 text-sm";

export function BrandLogo({ manufacturer, size = 20, className = "" }) {
  const [err, setErr] = useState(false);
  const src = CAR_BRANDS.find(
    (b) => b.name.toLowerCase().replace(/[^a-z0-9]/g, "") ===
           (manufacturer ?? "").toLowerCase().replace(/[^a-z0-9]/g, "")
  )?.logo;

  if (!src || err) {
    return <TbCar style={{ width: size, height: size }} className={`text-neutral-500 ${className}`} />;
  }
  return (
    <img
      src={src}
      alt={manufacturer}
      width={size}
      height={size}
      onError={() => setErr(true)}
      className={`object-contain ${className}`}
      style={{ width: size, height: size }}
    />
  );
}

export default function BrandSelect({ value, onChange, placeholder = "Search manufacturer..." }) {
  const [query, setQuery] = useState(value ?? "");
  const [open, setOpen]   = useState(false);
  const ref               = useRef(null);

  // Sync when value changes externally (e.g. form reset)
  useEffect(() => { setQuery(value ?? ""); }, [value]);

  // Close on outside click
  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const filtered = CAR_BRANDS.filter((b) =>
    b.name.toLowerCase().includes(query.toLowerCase())
  );

  const select = (brand) => {
    setQuery(brand.name);
    onChange(brand.name);
    setOpen(false);
  };

  const handleInput = (e) => {
    setQuery(e.target.value);
    onChange(e.target.value);
    setOpen(true);
  };

  return (
    <div ref={ref} className="relative">
      <div className="relative flex items-center">
        <div className="absolute left-2.5 flex items-center pointer-events-none">
          <BrandLogo manufacturer={query} size={18} />
        </div>
        <input
          type="text"
          value={query}
          onChange={handleInput}
          onFocus={() => setOpen(true)}
          placeholder={placeholder}
          className={`${inputCls} pl-9`}
          autoComplete="off"
        />
      </div>

      {open && filtered.length > 0 && (
        <ul className="absolute z-50 mt-1 w-full bg-neutral-800 border border-neutral-700 rounded-xl shadow-xl max-h-56 overflow-y-auto py-1">
          {filtered.map((brand) => (
            <li key={brand.name}>
              <button
                type="button"
                onClick={() => select(brand)}
                className="flex items-center gap-2.5 w-full px-3 py-2 text-sm text-neutral-200 hover:bg-neutral-700 transition-colors cursor-pointer"
              >
                <img
                  src={brand.logo}
                  alt={brand.name}
                  width={20}
                  height={20}
                  className="object-contain shrink-0"
                  onError={(e) => { e.currentTarget.style.display = "none"; }}
                />
                {brand.name}
              </button>
            </li>
          ))}
          {/* Allow typing a custom brand not in the list */}
          {query && !CAR_BRANDS.some((b) => b.name.toLowerCase() === query.toLowerCase()) && (
            <li>
              <button
                type="button"
                onClick={() => { onChange(query); setOpen(false); }}
                className="flex items-center gap-2 w-full px-3 py-2 text-sm text-neutral-400 hover:bg-neutral-700 transition-colors cursor-pointer italic"
              >
                <TbCar className="w-4 h-4 shrink-0" /> Use "{query}"
              </button>
            </li>
          )}
        </ul>
      )}
    </div>
  );
}
