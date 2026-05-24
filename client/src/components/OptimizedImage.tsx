/**
 * OptimizedImage — drop-in replacement for <img> with:
 * - Lazy loading by default (loading="lazy")
 * - Explicit width/height to prevent CLS
 * - decoding="async" for non-blocking decode
 * - fetchpriority="high" for LCP images
 */
import { useState } from "react";

interface OptimizedImageProps {
  src: string;
  alt: string;
  className?: string;
  width?: number;
  height?: number;
  priority?: boolean; // true = LCP image, eager load + high priority
  style?: React.CSSProperties;
  onError?: () => void;
}

export function OptimizedImage({
  src,
  alt,
  className,
  width,
  height,
  priority = false,
  style,
  onError,
}: OptimizedImageProps) {
  const [errored, setErrored] = useState(false);

  const handleError = () => {
    setErrored(true);
    onError?.();
  };

  if (errored || !src) {
    return (
      <div
        className={`flex items-center justify-center text-gray-300 bg-gray-100 ${className ?? ""}`}
        style={style}
      >
        📦
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      className={className}
      style={style}
      width={width}
      height={height}
      loading={priority ? "eager" : "lazy"}
      decoding={priority ? "sync" : "async"}
      // @ts-expect-error fetchpriority is valid HTML but not yet in TS types
      fetchpriority={priority ? "high" : "auto"}
      onError={handleError}
    />
  );
}

export default OptimizedImage;
