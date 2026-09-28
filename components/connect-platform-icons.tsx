import React from 'react';

interface IconProps {
  className?: string;
}

export function WhatsAppIcon({ className = 'w-5 h-5' }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 32 32" fill="none" aria-hidden="true">
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M16 2C8.268 2 2 8.268 2 16c0 2.478.669 4.8 1.835 6.793L2 30l7.394-1.808A13.928 13.928 0 0 0 16 30c7.732 0 14-6.268 14-14S23.732 2 16 2Z"
        fill="currentColor"
      />
      <path
        d="M11.282 9.5c-.31-.008-.643.073-.934.406-.291.332-1.11 1.083-1.11 2.64 0 1.559 1.135 3.063 1.293 3.274.158.21 2.23 3.412 5.456 4.648 3.225 1.237 3.225.826 3.805.774.58-.05 1.871-.765 2.135-1.504.263-.738.263-1.37.184-1.503-.078-.133-.29-.21-.606-.368-.316-.158-1.871-.923-2.16-1.028-.289-.105-.5-.158-.71.158-.21.316-.816 1.028-1.001 1.239-.184.21-.369.236-.685.079-.316-.158-1.333-.49-2.54-1.568-1.52-1.353-2.47-3.024-2.47-3.024-.158-.316-.016-.487.118-.644.12-.14.263-.369.395-.554.132-.184.175-.316.263-.526.088-.21.044-.395-.022-.553-.066-.157-.685-1.712-.952-2.327-.237-.546-.485-.538-.71-.547Z"
        fill="white"
      />
    </svg>
  );
}

export function InstagramIcon({ className = 'w-5 h-5' }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
    </svg>
  );
}

export function FacebookIcon({ className = 'w-5 h-5' }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M13.397 20.997v-8.196h2.765l.411-3.209h-3.176V7.548c0-.926.258-1.56 1.587-1.56h1.684V3.127A22.336 22.336 0 0 0 13.64 3c-2.634 0-4.44 1.608-4.44 4.56v2.548H6.461v3.209h2.739v8.18h4.197z" />
    </svg>
  );
}

export function TikTokIcon({ className = 'w-5 h-5' }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 32 32" fill="none" aria-hidden="true">
      <path
        d="M21 6a5.5 5.5 0 0 0 4.5 4.5v3a9 9 0 0 1-4.5-1.2v6.7a6.5 6.5 0 1 1-5-6.3v3a3.5 3.5 0 1 0 2.5 3.3V6H21Z"
        fill="#EE1D52"
        transform="translate(1.2,0)"
      />
      <path
        d="M21 6a5.5 5.5 0 0 0 4.5 4.5v3a9 9 0 0 1-4.5-1.2v6.7a6.5 6.5 0 1 1-5-6.3v3a3.5 3.5 0 1 0 2.5 3.3V6H21Z"
        fill="#69C9D0"
        transform="translate(-1.2,0)"
      />
      <path
        d="M21 6a5.5 5.5 0 0 0 4.5 4.5v3a9 9 0 0 1-4.5-1.2v6.7a6.5 6.5 0 1 1-5-6.3v3a3.5 3.5 0 1 0 2.5 3.3V6H21Z"
        fill="currentColor"
      />
    </svg>
  );
}

export function YouTubeIcon({ className = 'w-5 h-5' }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814ZM9.545 15.568V8.432L15.818 12l-6.273 3.568Z" />
    </svg>
  );
}

export function MapsIcon({ className = 'w-5 h-5' }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M12 2.5c-3.314 0-6 2.462-6 5.5 0 5.25 6 13.5 6 13.5s6-8.25 6-13.5c0-3.038-2.686-5.5-6-5.5Z"
        fill="currentColor"
      />
      <circle cx="12" cy="8" r="2.4" fill="white" />
    </svg>
  );
}

export function PhoneIcon({ className = 'w-5 h-5' }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2Z" />
    </svg>
  );
}

export function GlobeIcon({ className = 'w-5 h-5' }: IconProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="10" />
      <path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
    </svg>
  );
}

export function MailIcon({ className = 'w-5 h-5' }: IconProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="2.5" y="4.5" width="19" height="15" rx="3" />
      <path d="m3.5 7 7.2 5.2a2.4 2.4 0 0 0 2.6 0L20.5 7" />
    </svg>
  );
}

export function LinkedInIcon({ className = 'w-5 h-5' }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M20.45 20.45h-3.56v-5.57c0-1.33-.02-3.04-1.85-3.04-1.85 0-2.14 1.45-2.14 2.94v5.67H9.35V9h3.41v1.56h.05a3.74 3.74 0 0 1 3.37-1.85c3.6 0 4.27 2.37 4.27 5.46v6.28ZM5.34 7.43a2.06 2.06 0 1 1 0-4.13 2.06 2.06 0 0 1 0 4.13ZM7.12 20.45H3.55V9h3.57v11.45ZM22.22 0H1.77C.79 0 0 .77 0 1.72v20.56C0 23.23.79 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.72V1.72C24 .77 23.2 0 22.22 0Z" />
    </svg>
  );
}

export function XIcon({ className = 'w-5 h-5' }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M18.9 1.15h3.68l-8.04 9.19L24 22.85h-7.41l-5.8-7.58-6.64 7.58H.47l8.6-9.83L0 1.15h7.59l5.24 6.93 6.07-6.93Zm-1.29 19.5h2.04L6.49 3.24H4.3l13.31 17.41Z" />
    </svg>
  );
}

export function TelegramIcon({ className = 'w-5 h-5' }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M21.94 4.3 18.9 19.1c-.23 1.02-.84 1.27-1.7.79l-4.7-3.46-2.27 2.18c-.25.25-.46.46-.95.46l.34-4.79 8.72-7.88c.38-.34-.08-.53-.59-.19l-10.78 6.8-4.64-1.46c-1.01-.31-1.03-1.01.21-1.5l18.13-6.99c.84-.31 1.58.2 1.27 1.5Z" />
    </svg>
  );
}

export function ThreadsIcon({ className = 'w-5 h-5' }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M16.4 11.13a5.9 5.9 0 0 0-1.1-.19c-.3-2.1-1.2-3.2-2.6-3.2-1.14 0-1.99.76-2.6 2.26l1.28.42c.44-1.06.9-1.32 1.31-1.32.32 0 .63.16.87.53-.65.19-1.35.52-1.94 1-1.12.9-1.44 2.2-1.02 3.36.43 1.2 1.4 1.93 2.66 1.93 1.55 0 2.75-.93 3.5-2.52.55-1.16.74-2.73.68-3.9.36.08.7.2.99.37 1.02.61 1.5 1.8 1.3 3.3-.24 1.8-1.25 3.17-2.86 3.85-1.42.6-3.13.55-4.31-.1-1.4-.75-2.32-2.3-2.4-3.7-.05-1.1.28-2.1.85-2.8-.15.06-.3.11-.44.18-2 1-3.33 2.63-3.6 4.6-.02.1-.03.2-.04.3 0 0-.13 2.77 2.06 4.79 1.68 1.56 3.94 2.32 6.55 2.22.3 0 .6-.02.89-.05 2.98-.38 5.29-2.48 5.79-5.83.38-2.5-.78-4.45-3.23-5.43l-.13-.06Zm-4.44 5.35c-1.11 0-1.9-.69-2.1-1.82-.09-.52.08-1.36.63-1.97.38-.43.92-.74 1.5-.83-.02.16-.03.33-.03.51 0 1.19-.33 2.13-.95 2.72-.5.47-1.14.72-1.77.72.42.4 1.03.67 1.72.67Z"
        fill="currentColor"
      />
    </svg>
  );
}

export function PinterestIcon({ className = 'w-5 h-5' }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 0C5.37 0 0 5.37 0 12c0 5.08 3.16 9.43 7.63 11.17-.11-.95-.2-2.41.04-3.45.22-.94 1.4-5.96 1.4-5.96s-.36-.72-.36-1.78c0-1.67.97-2.91 2.17-2.91 1.02 0 1.52.77 1.52 1.69 0 1.03-.66 2.57-1 4-.28 1.19.6 2.16 1.77 2.16 2.12 0 3.76-2.24 3.76-5.47 0-2.86-2.05-4.85-5-4.85-3.4 0-5.4 2.55-5.4 5.19 0 1.03.4 2.13.89 2.73.1.12.11.22.08.34-.09.38-.3 1.19-.34 1.36-.05.22-.18.27-.41.16-1.53-.71-2.49-2.95-2.49-4.75 0-3.87 2.81-7.43 8.1-7.43 4.25 0 7.55 3.03 7.55 7.08 0 4.22-2.66 7.62-6.36 7.62-1.24 0-2.41-.65-2.81-1.41l-.77 2.92c-.28 1.06-1.02 2.4-1.52 3.21 1.15.35 2.36.55 3.63.55 6.63 0 12-5.37 12-12S18.63 0 12 0Z" />
    </svg>
  );
}

export function SnapchatIcon({ className = 'w-5 h-5' }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 2.2c2.9 0 4.76 2.13 4.76 5.02 0 1.3-.14 2.4-.14 2.4s.44.3.94.44c.5.14.72-.5 1.42-.32.7.18.6.82.28 1.1-.32.28-1.2.64-1.66.92-.46.28-.4.74-.28 1.26.4 1.7 2.5 3.9 4.6 4.4.5.1.46.66 0 .8-.46.14-1.6.32-1.84.62-.24.3.06.76-.24 1.06-.5.5-2.1.32-3 .5-.9.18-1.06 1.1-1.24 2-.18.9-.9 1.2-1.9 1.2-1 0-2.1-.1-3.1.5-1 .6-3.1.5-3.1.5s-2.1.1-3.1-.5c-1-.6-2.1-.5-3.1-.5-1 0-1.72-.3-1.9-1.2-.18-.9-.34-1.82-1.24-2-.9-.18-2.5 0-3-.5-.3-.3 0-.76-.24-1.06-.24-.3-1.38-.48-1.84-.62-.46-.14-.5-.7 0-.8 2.1-.5 4.2-2.7 4.6-4.4.12-.52.18-.98-.28-1.26-.46-.28-1.34-.64-1.66-.92-.32-.28-.42-.92.28-1.1.7-.18.92.46 1.42.32.5-.14.94-.44.94-.44s-.14-1.1-.14-2.4C7.24 4.33 9.1 2.2 12 2.2Z" />
    </svg>
  );
}

export function SpotifyIcon({ className = 'w-5 h-5' }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0Zm5.52 17.28a.75.75 0 0 1-1.03.24c-2.82-1.72-6.37-2.11-10.55-1.16a.75.75 0 1 1-.33-1.46c4.57-1.04 8.5-.6 11.67 1.35.35.22.46.68.24 1.03Zm1.47-3.27a.94.94 0 0 1-1.29.31c-3.23-1.98-8.15-2.56-11.96-1.4a.94.94 0 1 1-.54-1.79c4.37-1.32 9.79-.68 13.48 1.6.44.27.58.84.31 1.28Zm.13-3.4C15.23 8.35 8.85 8.13 5.13 9.24a1.12 1.12 0 1 1-.65-2.15C8.74 5.83 15.8 6.1 20.26 8.24a1.12 1.12 0 1 1-1.14 1.93Z" />
    </svg>
  );
}

export function BuildingIcon({ className = 'w-5 h-5' }: IconProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M3 21h18M5 21V5a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v16M13 21V9h5a1 1 0 0 1 1 1v11" />
      <path d="M8 8h2M8 12h2M8 16h2M16 13h1M16 17h1" />
    </svg>
  );
}

export function PrinterIcon({ className = 'w-5 h-5' }: IconProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M7 9V3h10v6M7 19H5a2 2 0 0 1-2-2v-4a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2h-2" />
      <path d="M7 15h10v6H7z" />
    </svg>
  );
}

export function SmartphoneIcon({ className = 'w-5 h-5' }: IconProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="6" y="2" width="12" height="20" rx="2.5" />
      <path d="M11 18.5h2" />
    </svg>
  );
}

export function LinkChainIcon({ className = 'w-5 h-5' }: IconProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M10 13a5 5 0 0 0 7.07 0l3-3a5 5 0 0 0-7.07-7.07l-1.5 1.5" />
      <path d="M14 11a5 5 0 0 0-7.07 0l-3 3a5 5 0 0 0 7.07 7.07l1.5-1.5" />
    </svg>
  );
}

export function ChevronRightIcon({ className = 'w-4 h-4' }: IconProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="m9 5 7 7-7 7" />
    </svg>
  );
}
