export default function LoadingState({ label = "Loading..." }) {
  return (
    <div className="py-16 flex flex-col items-center justify-center gap-3 text-center text-neutral-500">
      <div className="w-10 h-10 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
      <p className="text-sm">{label}</p>
    </div>
  );
}
