import React from 'react';
import { Card, CardContent, Typography, Box, Chip, Divider } from '@mui/material';
import { Layers, Warning } from '@mui/icons-material';

interface ClusterCardProps {
  cluster: any;
  onClick?: () => void;
}

export const ClusterCard: React.FC<ClusterCardProps> = ({ cluster, onClick }) => {
  const isHighPriority = cluster.signal_count >= 3 || cluster.cluster_status === 'Escalated';

  return (
    <Card 
      sx={{ 
        mb: 2, 
        cursor: onClick ? 'pointer' : 'default',
        borderLeft: isHighPriority ? '4px solid #d32f2f' : '1px solid #e0e0e0',
        '&:hover': { boxShadow: 3 }
      }}
      onClick={onClick}
    >
      <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Layers color="action" fontSize="small" />
            <Typography variant="subtitle2" component="span" sx={{ fontWeight: 700 }}>
              {cluster.risk_domain}
            </Typography>
          </Box>
          <Chip 
            label={`${cluster.signal_count} signals`} 
            size="small" 
            color={isHighPriority ? 'error' : 'default'} 
            variant="outlined" 
          />
        </Box>
        
        <Typography variant="body2" color="text.secondary" gutterBottom>
          {cluster.cluster_label || `Identified pattern in ${cluster.risk_domain}`}
        </Typography>

        <Divider sx={{ my: 1 }} />

        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="caption" sx={{ color: 'text.secondary', display: 'flex', alignItems: 'center', gap: 0.5 }}>
            Status: <strong>{cluster.cluster_status}</strong>
          </Typography>
          {cluster.linked_risk_id && (
            <Chip label="Risk Linked" size="small" color="success" variant="filled" sx={{ height: 20, fontSize: '0.65rem' }} />
          )}
        </Box>
      </CardContent>
    </Card>
  );
};
