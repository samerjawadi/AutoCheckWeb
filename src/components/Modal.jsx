import { useEffect } from "react";
import { createPortal } from "react-dom";
import { HiX } from "react-icons/hi";

export default function Modal({ title, onClose, children, maxWidthClass = "max-w-lg" }) {
  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-start justify-center bg-black/60 backdrop-blur-sm p-3 sm:p-4 md:items-center"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className={`modal-enter bg-neutral-900 border border-neutral-800 rounded-2xl w-full ${maxWidthClass} shadow-2xl max-h-[92vh] overflow-y-auto mt-12 md:mt-0`}>
        <div className="flex items-center justify-between px-4 py-3 sm:px-6 sm:py-4 border-b border-neutral-800">
          <h2 className="text-lg font-semibold text-neutral-100">{title}</h2>
          <button
            onClick={onClose}
            className="p-1 text-neutral-400 hover:text-white hover:bg-neutral-800 rounded transition-colors cursor-pointer"
          >
            <HiX className="w-5 h-5" />
          </button>
        </div>
        <div className="px-4 py-4 sm:px-6 sm:py-5">{children}</div>
      </div>
    </div>,
    document.body
  );
}
