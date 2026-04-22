import React from 'react';
import { 
  Box, Typography, List, ListItem, ListItemText, 
  Checkbox, Paper, Chip 
} from '@mui/material';

interface SignalTimelineSelectorProps {
  pulses: any[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
}

export const SignalTimelineSelector: React.FC<SignalTimelineSelectorProps> = ({ pulses, selectedIds, onChange }) => {
  const handleToggle = (id: string) => {
    const currentIndex = selectedIds.indexOf(id);
    const newSelected = [...selectedIds];

    if (currentIndex === -1) {
      newSelected.push(id);
    } else {
      newSelected.splice(currentIndex, 1);
    }

    onChange(newSelected);
  };

  return (
    <Paper variant="outlined" sx={{ maxHeight: 300, overflow: 'auto', p: 1 }}>
      <List dense>
        {pulses.map((pulse) => (
          <ListItem key={pulse.id} divider onClick={() => handleToggle(pulse.id)} sx={{ cursor: 'pointer' }}>
            <Checkbox
              edge="start"
              checked={selectedIds.indexOf(pulse.id) !== -1}
              tabIndex={-1}
              disableRipple
            />
            <ListItemText
              primary={`${pulse.signal_type} (${pulse.severity})`}
              secondary={`${new Date(pulse.entry_date).toLocaleDateString()} - ${pulse.description.substring(0, 60)}...`}
            />
            <Chip label={pulse.risk_domain} size="small" variant="outlined" />
          </ListItem>
        ))}
        {pulses.length === 0 && <Typography variant="body2" sx={{ p: 2, textAlign: 'center' }}>No pulses found for this house/period.</Typography>}
      </List>
    </Paper>
  );
};
