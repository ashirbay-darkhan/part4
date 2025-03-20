// components/ui/avatar-fallback.tsx
'use client';

import { useEffect, useState } from 'react';

interface AvatarProps {
  src?: string;
  name: string;
  className?: string;
}

export function Avatar({ src, name, className = "w-10 h-10" }: AvatarProps) {
  const [imageError, setImageError] = useState(false);
  const initials = name.split(' ').map(n => n[0]).join('').toUpperCase();

  return (
    <div className={`${className} rounded-full flex items-center justify-center bg-slate-200 text-slate-500`}>
      {src && !imageError ? (
        <img
          src={src}
          alt={name}
          className="w-full h-full rounded-full object-cover"
          onError={() => setImageError(true)}
        />
      ) : (
        <span className="text-sm font-medium">{initials}</span>
      )}
    </div>
  );
}