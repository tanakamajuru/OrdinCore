import React, { useState, useEffect } from 'react';
import { 
  Box, Container, Paper, Typography, Button, 
  CircularProgress, Alert, Divider, Stack 
} from '@mui/material';
import { NavigateBefore, NavigateNext, Lock } from '@mui/icons-material';
import { WeeklyReviewStepNav } from '../components/WeeklyReviewStepNav';

export const WeeklyReviewWizard: React.FC = () => {
  const [activeStep, setActiveStep] = useState(0);
  const [completedStep, setCompletedStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [reviewData, setReviewData] = useState<any>({});
  const [error, setError] = useState<string | null>(null);

  const totalSteps = 13;

  const handleNext = async () => {
    setLoading(true);
    try {
      // Logic to call PATCH /api/v1/weekly-reviews/:id
      // await axios.patch(`/api/v1/weekly-reviews/${id}`, { step_reached: activeStep + 2, content: { ... } });
      
      setActiveStep(prev => prev + 1);
      if (activeStep + 1 > completedStep) {
        setCompletedStep(activeStep + 1);
      }
      setLoading(false);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to save progress.');
      setLoading(false);
    }
  };

  const handleBack = () => setActiveStep(prev => prev - 1);

  const renderStepContent = (step: number) => {
    switch (step) {
      case 0: return <Typography>Step 1: Scope of Review<br/>Confirming houses and reporting week boundaries.</Typography>;
      case 1: return <Typography>Step 2: Pulse Validation<br/>Reviewing all 15 clinical signals submitted this week.</Typography>;
      case 5: return <Typography>Step 6: Clinical Interpretation<br/>RM's professional assessment of the data trends.</Typography>;
      case 12: return <Typography>Step 13: Final Sign-off<br/>Locking the record for Director/CQC audit.</Typography>;
      default: return <Typography>Step {step + 1} Content placeholder for {activeStep} logic components.</Typography>;
    }
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" gutterBottom sx={{ fontWeight: 800 }}>Weekly Governance Review</Typography>
        <Typography variant="body2" color="text.secondary">Sequence-Locked Wizard • Spec Section 6.2 Compliance</Typography>
      </Box>

      <WeeklyReviewStepNav activeStep={activeStep} completedStep={completedStep} />

      <Paper sx={{ p: 4, mt: 4, minHeight: '400px', display: 'flex', flexDirection: 'column' }}>
        {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

        <Box sx={{ flexGrow: 1 }}>
          {renderStepContent(activeStep)}
        </Box>

        <Divider sx={{ my: 3 }} />

        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
          <Button 
            disabled={activeStep === 0 || loading} 
            onClick={handleBack}
            startIcon={<NavigateBefore />}
          >
            Back
          </Button>
          
          {activeStep === totalSteps - 1 ? (
            <Button 
              variant="contained" 
              color="error" 
              startIcon={<Lock />}
              onClick={() => alert('Wizard Locked. Record is now Defensible.')}
            >
              Complete & Lock Review
            </Button>
          ) : (
            <Button 
              variant="contained" 
              onClick={handleNext} 
              disabled={loading}
              endIcon={loading ? <CircularProgress size={20} /> : <NavigateNext />}
            >
              Confirm & Continue
            </Button>
          )}
        </Box>
      </Paper>
    </Container>
  );
};
