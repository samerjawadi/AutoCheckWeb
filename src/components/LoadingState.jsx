import { GiCarWheel } from "react-icons/gi";

export default function LoadingState({ label = "Loading...", inline = false }) {
  if (inline) {
    return (
      <div className="w-full flex items-center justify-center text-center text-neutral-500 py-6">
        <div className="flex flex-col items-center gap-2">
          <GiCarWheel role="status" aria-label={label} className="w-8 h-8 text-violet-400 animate-spin" />
          <p className="text-sm">{label}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center text-center text-neutral-500">
      <div className="flex flex-col items-center gap-3">
        <GiCarWheel role="status" aria-label={label} className="w-12 h-12 text-violet-400 animate-spin" />
        <p className="text-sm">{label}</p>
      </div>
    </div>
  );
}
