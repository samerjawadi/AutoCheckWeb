export default function Skeleton({ size = "card", height }) {
  if (size === "small") {
    return <div className="skeleton skeleton--small" />;
  }
  if (size === "inline") {
    return <div className="skeleton skeleton--inline" />;
  }
  if (size === "block") {
    return <div className="skeleton skeleton--block" style={{ height: height || 120 }} />;
  }

  // default: card
  return (
    <div className="skeleton-card">
      <div className="skeleton__image" />
      <div className="skeleton__content">
        <div className="skeleton__title" />
        <div className="skeleton__text" />
      </div>
    </div>
  );
}
