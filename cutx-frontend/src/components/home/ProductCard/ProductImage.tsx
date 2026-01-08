import Image from 'next/image';
import { ImageIcon } from 'lucide-react';

interface ProductImageProps {
  imageUrl: string | null | undefined;
  alt: string;
  size: 'sm' | 'md' | 'lg';
  isSponsored?: boolean;
  className?: string;
}

const SIZE_CONFIG = {
  sm: { container: 'w-10 h-10', image: '40px', icon: 'w-4 h-4', badge: 'hidden' },
  md: { container: 'w-24 h-24', image: '96px', icon: 'w-8 h-8', badge: 'px-1.5 py-0.5 text-[10px]' },
  lg: { container: 'w-48 h-48', image: '192px', icon: 'w-16 h-16', badge: 'px-2 py-1 text-xs' },
};

export default function ProductImage({ imageUrl, alt, size, isSponsored, className = '' }: ProductImageProps) {
  const config = SIZE_CONFIG[size];
  const roundedClass = size === 'lg' ? 'rounded-xl' : size === 'md' ? 'rounded-lg' : 'rounded';

  return (
    <div className={`relative flex-shrink-0 ${config.container} bg-[var(--cx-surface-2)] ${roundedClass} overflow-hidden ${className}`}>
      {imageUrl ? (
        <Image src={imageUrl} alt={alt} fill className="object-cover" sizes={config.image} />
      ) : (
        <div className="flex items-center justify-center w-full h-full">
          <ImageIcon className={`${config.icon} text-[var(--cx-text-muted)]`} />
        </div>
      )}
      {isSponsored && config.badge !== 'hidden' && (
        <span className={`absolute top-1 left-1 ${config.badge} font-medium bg-amber-500 text-black ${roundedClass}`}>
          Sponsorisé
        </span>
      )}
    </div>
  );
}
