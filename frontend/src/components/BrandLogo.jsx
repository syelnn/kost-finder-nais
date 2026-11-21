import React from 'react';
import logoImg from '../assets/logo.png';

export default function BrandLogo({
  imgSize,
  text = 'Kos Nais',
  showText = true,
  className = '',
}) {
  return (
    <span className={`brand-logo-inline ${className}`.trim()}>
      <img
        src={logoImg}
        alt="Kos Nais"
        className="brand-logo-img"
        style={imgSize ? { width: `${imgSize}px`, height: `${imgSize}px` } : undefined}
      />
      {showText && text ? <span className="brand-logo-text">{text}</span> : null}
    </span>
  );
}
