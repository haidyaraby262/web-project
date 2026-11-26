import React from 'react';

// Stroke icons (24x24). Keys are also stored in Clinics.Icon.
const P = {
  stethoscope: <><path d="M6 3v6a4 4 0 0 0 8 0V3" /><path d="M10 13v2a5 5 0 0 0 10 0v-2" /><circle cx="20" cy="11" r="2" /><path d="M4 3h4M12 3h4" /></>,
  baby: <><circle cx="12" cy="12" r="8" /><path d="M9 10h.01M15 10h.01M9.5 15a3.5 3.5 0 0 0 5 0M12 4c0-1 1-2 2-2" /></>,
  tooth: <path d="M7 3c-2.5 0-4 2-4 4.5 0 2 1 3 1.5 5 .6 2.4.9 8.5 3 8.5 1.6 0 1.5-4 3.5-4s1.900 4 3.500 4c2.100 0 2.400-6.100 3-8.500.500-2 1.500-3 1.500-5C20 5 18.500 3 16 3c-1.800 0-2.500 1-4 1S8.800 3 7 3z" />,
  heart: <path d="M12 21s-8-5.200-8-11a4.500 4.500 0 0 1 8-2.800A4.500 4.500 0 0 1 20 10c0 5.800-8 11-8 11z" />,
  skin: <><path d="M12 3s6 6.500 6 11a6 6 0 0 1-12 0c0-4.500 6-11 6-11z" /><path d="M9 15a3 3 0 0 0 3 3" /></>,
  bone: <path d="M17 3a2.500 2.500 0 0 0-2.400 3.200L7.200 13.600A2.500 2.500 0 1 0 3 16a2.500 2.500 0 0 0 3.200 2.400 2.500 2.500 0 1 0 4.400-1.800l7.400-7.400A2.500 2.500 0 1 0 21 6a2.500 2.500 0 0 0-2.400-3.200L17 3z" />,
  calendar: <><rect x="3" y="5" width="18" height="16" rx="3" /><path d="M3 10h18M8 3v4M16 3v4" /></>,
  bell: <><path d="M6 9a6 6 0 0 1 12 0c0 6 2 7 2 7H4s2-1 2-7z" /><path d="M10 20a2 2 0 0 0 4 0" /></>,
  phone: <path d="M5 4h4l2 5-2.500 1.500a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z" />,
  mail: <><rect x="3" y="5" width="18" height="14" rx="3" /><path d="M3 7l9 6 9-6" /></>,
  pin: <><path d="M12 21s7-6 7-11a7 7 0 0 0-14 0c0 5 7 11 7 11z" /><circle cx="12" cy="10" r="2.500" /></>,
  clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
  check: <><circle cx="12" cy="12" r="9" /><path d="M8 12.500l3 3 5-6" /></>,
  menu: <path d="M4 6h16M4 12h16M4 18h16" />,
};
export const ICON_KEYS = ['stethoscope', 'baby', 'tooth', 'heart', 'skin', 'bone'];

export default function Icon({ name, size = 20 }) {
  return (
    <svg className="svg-ico" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {P[name] || P.stethoscope}
    </svg>
  );
}
