'use client';

import { useState } from 'react';
import { ImageIcon } from 'lucide-react';

interface ProductImageProps {
  src: string | undefined;
  alt: string;
}

/**
 * Composant Image avec état de chargement
 * Styles inline pour forcer le carré 48x48
 */
export function ProductImage({ src, alt }: ProductImageProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  const containerStyle: React.CSSProperties = {
    position: 'relative',
    width: '48px',
    height: '48px',
    minWidth: '48px',
    minHeight: '48px',
    maxWidth: '48px',
    maxHeight: '48px',
    borderRadius: '6px',
    overflow: 'hidden',
    border: '1px solid var(--admin-border-subtle)',
    background: 'var(--admin-bg-tertiary)',
    flexShrink: 0,
  };

  const imageStyle: React.CSSProperties = {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    objectPosition: 'center',
    opacity: isLoading ? 0 : 1,
    transition: 'opacity 0.2s ease',
  };

  const noImageStyle: React.CSSProperties = {
    ...containerStyle,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'var(--admin-text-muted)',
  };

  if (!src || hasError) {
    return <div style={noImageStyle}><ImageIcon size={16} /></div>;
  }

  return (
    <div style={containerStyle}>
      {isLoading && (
        <div className="image-loading">
          <div className="image-spinner" />
        </div>
      )}
      <img
        src={src}
        alt={alt}
        style={imageStyle}
        loading="lazy"
        onLoad={() => setIsLoading(false)}
        onError={() => {
          setIsLoading(false);
          setHasError(true);
        }}
      />
    </div>
  );
}
