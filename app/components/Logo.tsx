'use client';

import Image from 'next/image';

interface LogoProps {
  className?: string;
  width?: number;
  height?: number;
}

export default function Logo({ className = '', width = 180, height = 40 }: LogoProps) {
  return (
    <Image
      src="/thinkdigital-logo.png"
      alt="thinkdigital"
      width={width}
      height={height}
      className={className}
      priority
      unoptimized
    />
  );
}


