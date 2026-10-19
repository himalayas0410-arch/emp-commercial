import React from 'react';
import { QRStatus, IncidentStatus } from '../types/index.js';

interface StatusBadgeProps {
  status: QRStatus | IncidentStatus | string;
  size?: 'sm' | 'md';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, size = 'md' }) => {
  const norm = status.toLowerCase();

  let badgeClass = 'emp-badge-pending';
  let label = status.replace('_', ' ');

  if (norm === 'active' || norm === 'resolved') {
    badgeClass = 'emp-badge-active';
  } else if (norm === 'suspended' || norm === 'acknowledged') {
    badgeClass = 'emp-badge-suspended';
  } else if (norm === 'revoked' || norm === 'triggered' || norm === 'failed') {
    badgeClass = 'emp-badge-revoked';
  }

  return (
    <span className={`emp-badge ${badgeClass} ${size === 'sm' ? 'emp-btn-sm' : ''}`}>
      <span className="emp-badge-dot"></span>
      {label}
    </span>
  );
};
