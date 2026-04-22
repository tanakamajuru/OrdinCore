import React from 'react';
import { FormControl, InputLabel, Select, MenuItem, Box, Typography } from '@mui/material';

// --- Pattern Concern Selector ---
export const PatternConcernSelector = ({ value, onChange }: { value: string, onChange: (val: string) => void }) => {
  return (
    <FormControl fullWidth size="small">
      <InputLabel>Pattern Concern</InputLabel>
      <Select value={value} label="Pattern Concern" onChange={(e) => onChange(e.target.value)}>
        <MenuItem value="None">None</MenuItem>
        <MenuItem value="Repeat Occurrence">Repeat Occurrence (Same Room/Staff)</MenuItem>
        <MenuItem value="Systemic Trend">Systemic Trend (Across House)</MenuItem>
        <MenuItem value="Cultural Factor">Cultural Factor (Behavioral)</MenuItem>
        <MenuItem value="Env Hazard">Environmental Hazard</MenuItem>
      </Select>
    </FormControl>
  );
};

// --- Escalation Selector ---
export const EscalationSelector = ({ value, onChange }: { value: string, onChange: (val: string) => void }) => {
  return (
    <FormControl fullWidth size="small">
      <InputLabel>Escalation Path</InputLabel>
      <Select value={value} label="Escalation Path" onChange={(e) => onChange(e.target.value)}>
        <MenuItem value="None">None (Internal Management)</MenuItem>
        <MenuItem value="Director">Director Oversight</MenuItem>
        <MenuItem value="Responsible Individual">Responsible Individual (RI)</MenuItem>
        <MenuItem value="Medication Lead">Medication Lead / Pharmacist</MenuItem>
        <MenuItem value="Safeguarding Board">Safeguarding Board (External)</MenuItem>
      </Select>
    </FormControl>
  );
};
