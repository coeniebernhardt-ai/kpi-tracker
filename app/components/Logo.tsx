'use client';

import Image from 'next/image';
import { useState, useEffect } from 'react';

interface LogoProps {
  className?: string;
  width?: number;
  height?: number;
  variant?: 'login' | 'team'; // 'login' for login page, 'team' for dashboard/admin
}

export default function Logo({ className = '', width, height, variant = 'team' }: LogoProps) {
  // Login variant: 2x the default size (400x90 instead of 200x45)
  // Team variant: default size (120x30)
  const dimensions = {
    login: { width: 400, height: 90 },
    team: { width: 120, height: 30 },
  };

  const finalWidth = width ?? dimensions[variant].width;
  const finalHeight = height ?? dimensions[variant].height;

  // Allow different logo files per variant
  // You can replace these with your specific logo files when ready
  const variantLogos = {
    login: '/logo-login.png',
    team: '/logo-team.png',
  };

  const fallbackLogo = '/logo.png';
  const variantLogo = variantLogos[variant];
  const [logoSrc, setLogoSrc] = useState(variantLogo);

  // Check if variant-specific logo exists, fallback to default
  useEffect(() => {
    if (typeof window === 'undefined') return; // Skip SSR
    
    const img = document.createElement('img');
    img.onload = () => setLogoSrc(variantLogo);
    img.onerror = () => setLogoSrc(fallbackLogo);
    img.src = variantLogo;
  }, [variant, variantLogo]);

  return (
    <Image
      src={logoSrc}
      alt="Think-Q"
      width={finalWidth}
      height={finalHeight}
      className={className}
      priority
      unoptimized
    />
  );
}


