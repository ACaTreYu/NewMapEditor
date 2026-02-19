/**
 * Custom SVG icon components for game object tools.
 * Uses currentColor so icons adapt to the current theme (light/dark/terminal).
 * Matches the react-icons API: accepts size prop, renders as inline SVG.
 */
import React from 'react';

interface IconProps {
  size?: number;
}

/** Bunker: L-shaped corner bracket (fortification wall section) */
export const BunkerIcon: React.FC<IconProps> = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 3 L3 13 L13 13" />
    <path d="M6 6 L6 10 L10 10" />
  </svg>
);

/** Conveyor: Two right-pointing chevrons */
export const ConveyorIcon: React.FC<IconProps> = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 4 L7 8 L3 12" />
    <path d="M9 4 L13 8 L9 12" />
  </svg>
);

/** Flag: Pennant flag on a pole */
export const FlagIcon: React.FC<IconProps> = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 2 L4 14" />
    <path d="M4 2 L12 4.5 L4 7" fill="currentColor" fillOpacity="0.3" />
  </svg>
);

/** Switch: Circle with dot in center (pressure switch) */
export const SwitchIcon: React.FC<IconProps> = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
    <circle cx="8" cy="8" r="5.5" />
    <circle cx="8" cy="8" r="1.5" fill="currentColor" />
  </svg>
);

/** Turret: Cross/asterisk shape (weapon turret) */
export const TurretIcon: React.FC<IconProps> = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
    <path d="M8 2 L8 14" />
    <path d="M2 8 L14 8" />
    <path d="M4 4 L12 12" />
    <path d="M12 4 L4 12" />
  </svg>
);
