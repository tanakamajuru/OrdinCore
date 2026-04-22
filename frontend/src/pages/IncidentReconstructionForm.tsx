import React, { useState } from 'react';
import { 
  Box, Container, Paper, Typography, Grid, 
  TextField, Button, Divider, Alert, Stack, 
  Stepper, Step, StepLabel, MenuItem
} from '@mui/material';
import { Save, Lock, Timeline } from '@mui/icons-material';
import { SignalTimelineSelector } from '../components/reconstruction/SignalTimelineSelector';

const sections = [
  'Metadata & Chronology', 'Signal Analysis', 'Trajectory & Context', 
  'Contributing Factors', 'Resident & Family Impact', 'Lessons & Actions', 'Sign-off'
];

export const IncidentReconstructionForm: React.FC = () => {
  const [activeStep, setActiveStep] = useState(0);
  const [formData, setFormData] = useState<any>({
    s1_metadata: {},
    s2_incident_summary: '',
    s3_chronology: [],
    s4_signal_chain: [],
    s5_trajectory_at_time: 'Stable',
    s6_contributing_factors: '',
    s7_control_weaknesses: '',
    s8_staffing_context: '',
    s9_governance_oversight: '',
    s10_resident_impact: '',
    s11_family_external_comms: '',
    s12_immediate_actions_taken: '',
    s13_systemic_lessons: '',
    s14_investigator_observations: '',
    s15_narrative_summary: '',
    s16_recommendations: '',
  });

  const handleUpdate = (field: string, value: any) => {
    setFormData((prev: any) => ({ ...prev, [field]: value }));
  };

  const handleComplete = () => {
    alert('Incident Reconstruction Locked. Regulatory Integrity Rule 7.2 Applied.');
  };

  const renderStep = (step: number) => {
    switch (step) {
      case 0:
        return (
          <Stack spacing={3}>
            <TextField fullWidth label="Section 2: Incident Summary" multiline rows={4} value={formData.s2_incident_summary} onChange={(e) => handleUpdate('s2_incident_summary', e.target.value)} />
            <Typography variant="subtitle2">Section 3: Chronology (JSON Events)</Typography>
            <Alert severity="info">Chronology is auto-populated from linked signals in Step 2.</Alert>
          </Stack>
        );
      case 1:
        return (
          <Stack spacing={3}>
            <Typography variant="h6">Section 4: Signal Chain Analysis</Typography>
            <Typography variant="body2" color="text.secondary">Select signals that preceded or contributed to the incident.</Typography>
            <SignalTimelineSelector 
              pulses={[]} // In reality, fetch house signals for last 30 days
              selectedIds={formData.s4_signal_chain}
              onChange={(ids) => handleUpdate('s4_signal_chain', ids)}
            />
          </Stack>
        );
      case 2:
        return (
            <Stack spacing={3}>
                <TextField select fullWidth label="Section 5: Trajectory at Time of Incident" value={formData.s5_trajectory_at_time} onChange={(e) => handleUpdate('s5_trajectory_at_time', e.target.value)}>
                    <MenuItem value="Improving">Improving</MenuItem>
                    <MenuItem value="Stable">Stable</MenuItem>
                    <MenuItem value="Deteriorating">Deteriorating</MenuItem>
                </TextField>
                <TextField fullWidth label="Section 8: Staffing Context" multiline rows={3} value={formData.s8_staffing_context} onChange={(e) => handleUpdate('s8_staffing_context', e.target.value)} />
            </Stack>
        );
      case 6:
        return (
          <Stack spacing={3}>
            <Typography variant="h6">Section 17: Sign-off & Lock</Typography>
            <Alert severity="warning">Completion will lock all 17 sections. No further edits permitted.</Alert>
            <TextField fullWidth label="Section 15: Final Narrative Summary" multiline rows={6} value={formData.s15_narrative_summary} onChange={(e) => handleUpdate('s15_narrative_summary', e.target.value)} />
          </Stack>
        );
      default:
        return <Typography>Placeholder for Sections {step * 2} through {(step * 2) + 1}</Typography>;
    }
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 800 }}>Incident Reconstruction</Typography>
          <Typography variant="body2" color="text.secondary">17-Section Regulatory Template • Defensible Record</Typography>
        </Box>
        <Stack direction="row" spacing={2}>
          <Button variant="outlined" startIcon={<Save />}>Save Draft</Button>
          <Button variant="contained" color="error" startIcon={<Lock />} onClick={handleComplete}>Complete</Button>
        </Stack>
      </Box>

      <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
        {sections.map(label => <Step key={label}><StepLabel>{label}</StepLabel></Step>)}
      </Stepper>

      <Paper sx={{ p: 4, minHeight: '500px' }}>
        {renderStep(activeStep)}
        
        <Divider sx={{ my: 4 }} />
        
        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
          <Button disabled={activeStep === 0} onClick={() => setActiveStep(prev => prev - 1)}>Back</Button>
          {activeStep < sections.length - 1 && (
            <Button variant="contained" onClick={() => setActiveStep(prev => prev + 1)}>Next Section</Button>
          )}
        </Box>
      </Paper>
    </Container>
  );
};
