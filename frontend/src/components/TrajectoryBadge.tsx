import React from 'react';
import { Chip } from '@mui/material';
import { TrendingUp, TrendingDown, Remove, Warning } from '@mui/icons-material';

type Trajectory = 'Improving' | 'Stable' | 'Deteriorating' | 'Critical';

const trajectoryConfig: Record<string, { color: 'success' | 'info' | 'warning' | 'error'; icon: any; label: string }> = {
  Improving: { color: 'success', icon: <TrendingUp />, label: 'Improving' },
  Stable: { color: 'info', icon: <Remove />, label: 'Stable' },
  Deteriorating: { color: 'warning', icon: <TrendingDown />, label: 'Deteriorating' },
  Critical: { color: 'error', icon: <Warning />, label: 'Critical' },
};

interface TrajectoryBadgeProps {
  trajectory: string;
  size?: 'small' | 'medium';
}

export const TrajectoryBadge: React.FC<TrajectoryBadgeProps> = ({ trajectory, size = 'small' }) => {
  const config = trajectoryConfig[trajectory] || trajectoryConfig.Stable;
  
  return (
    <Chip 
      icon={config.icon} 
      label={config.label} 
      color={config.color} 
      size={size} 
      variant="outlined"
      style={{ fontWeight: 600, borderRadius: '4px' }}
    />
  );
};
