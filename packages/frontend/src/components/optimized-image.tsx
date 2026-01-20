import { cn } from '@/lib/utils';

interface OptimizedImageProps {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  priority?: boolean;
  className?: string;
}

/**
 * OptimizedImage component with built-in performance optimizations:
 * - Lazy loading for non-priority images
 * - Async decoding for better rendering performance
 * - Explicit width/height to prevent layout shift (if provided)
 * - Eager loading for above-the-fold images when priority is true
 */
export function OptimizedImage({
  src,
  alt,
  priority = false,
  className,
  width,
  height,
  ...props
}: OptimizedImageProps) {
  return (
    <img
      src={src}
      alt={alt}
      loading={priority ? 'eager' : 'lazy'}
      decoding="async"
      width={width}
      height={height}
      className={cn(className)}
      {...props}
    />
  );
}
