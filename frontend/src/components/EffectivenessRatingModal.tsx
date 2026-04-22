import React, { useState } from 'react';
import { 
  Dialog, DialogTitle, DialogContent, DialogActions, 
  Button, Typography, RadioGroup, FormControlLabel, Radio, 
  TextField, Box, Alert
} from '@mui/material';
import { CheckCircle, HelpOutline, Warning } from '@mui/icons-material';

interface EffectivenessRatingModalProps {
  open: boolean;
  onClose: () => void;
  onRate: (rating: 'Effective' | 'Neutral' | 'Ineffective', note: string) => void;
  actionTitle: string;
}

export const EffectivenessRatingModal: React.FC<EffectivenessRatingModalProps> = ({ open, onClose, onRate, actionTitle }) => {
  const [rating, setRating] = useState<'Effective' | 'Neutral' | 'Ineffective'>('Effective');
  const [note, setNote] = useState('');

  const handleConfirm = () => {
    onRate(rating, note);
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ bgcolor: 'primary.main', color: 'white' }}>
        Rate Action Effectiveness
      </DialogTitle>
      <DialogContent sx={{ mt: 2 }}>
        <Typography variant="subtitle1" gutterBottom>
          How effective was the following action in mitigating risk?
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3, p: 1, bgcolor: 'grey.100', borderRadius: 1 }}>
          "{actionTitle}"
        </Typography>

        <RadioGroup value={rating} onChange={(e) => setRating(e.target.value as any)}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            <FormControlLabel 
              value="Effective" 
              control={<Radio color="success" />} 
              label={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <CheckCircle color="success" fontSize="small" />
                  <Typography>Effective (Hazard fully controlled)</Typography>
                </Box>
              } 
            />
            <FormControlLabel 
              value="Neutral" 
              control={<Radio color="info" />} 
              label={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <HelpOutline color="info" fontSize="small" />
                  <Typography>Neutral (Risk remains present)</Typography>
                </Box>
              } 
            />
            <FormControlLabel 
              value="Ineffective" 
              control={<Radio color="error" />} 
              label={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Warning color="error" fontSize="small" />
                  <Typography>Ineffective (Hazard persists or increased)</Typography>
                </Box>
              } 
            />
          </Box>
        </RadioGroup>

        <TextField
          fullWidth
          multiline
          rows={3}
          margin="normal"
          label="Governance Note"
          placeholder="Describe the clinical/operational impact observed..."
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />

        {rating === 'Ineffective' && (
          <Alert severity="warning" sx={{ mt: 2 }}>
            Rating this action as Ineffective may trigger a trajectory change to 'Deteriorating'.
          </Alert>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={handleConfirm} variant="contained" color="primary">
          Confirm Rating
        </Button>
      </DialogActions>
    </Dialog>
  );
};
