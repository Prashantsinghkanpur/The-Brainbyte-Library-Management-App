export default function SkeletonBlock({ className = "" }) {
  return <div className={`app-skeleton ${className}`.trim()} aria-hidden="true" />;
}
