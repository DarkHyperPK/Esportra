/** The Esportra mark (triangle A with wordmark), white on transparent; turns dark on paper. */
export function BrandMark({ className = 'h-16' }: { className?: string }) {
  return <img src="/proposals/esportra-mark.png" alt="Esportra" className={`pd-logo w-auto ${className}`} />;
}
