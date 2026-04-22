import React, { useState, useEffect } from 'react';
import { 
  Box, Grid, Paper, Typography, Button, Divider, 
  CircularProgress, Alert, Container 
} from '@mui/material';
import { CheckCircleOutline, History } from '@mui/icons-material';
import { 
  HighPrioritySection, 
  PatternSignalsSection, 
  RiskTouchpointSection, 
  ActionsPanelSection 
} from '../components/oversight/OversightSections';

export const DailyOversightBoard: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchFeed();
  }, []);

  const fetchFeed = async () => {
    try {
      // Logic would actually fetch from API
      // const res = await axios.get('/api/v1/pulses/dashboard/feed');
      // setData(res.data.data);
      
      // Mock for demonstration (simulating backend response)
      setTimeout(() => {
        setData({
          highPriority: [],
          pattern_signals: [],
          risk_candidates: [],
          actions: []
        });
        setLoading(false);
      }, 800);
    } catch (err) {
      setError('Failed to load oversight feed.');
      setLoading(false);
    }
  };

  const handleCompleteReview = async () => {
    // Logic to call POST /api/v1/daily-governance/complete
    alert('Daily Governance Review Completed Successfully (LOCKED)');
  };

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 10 }}><CircularProgress /></Box>;

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 800, color: 'primary.main' }}>
            Daily Oversight Board
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Today's Governance Routine • 3-Click Decision Logic Enabled
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button variant="outlined" startIcon={<History />}>View History</Button>
          <Button 
            variant="contained" 
            color="success" 
            startIcon={<CheckCircleOutline />}
            onClick={handleCompleteReview}
          >
            Complete Daily Review
          </Button>
        </Box>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

      <Grid container spacing={3}>
        {/* Section A: High Priority */}
        <Grid item xs={12} md={3}>
          <Paper sx={{ p: 2, height: '70vh', overflowY: 'auto', borderTop: '4px solid #d32f2f' }}>
            <HighPrioritySection signals={data.highPriority} onSelect={(s) => {}} />
          </Paper>
        </Grid>

        {/* Section B: Patterns */}
        <Grid item xs={12} md={3}>
          <Paper sx={{ p: 2, height: '70vh', overflowY: 'auto', borderTop: '4px solid #1976d2' }}>
            <PatternSignalsSection clusters={data.pattern_signals} onSelect={(c) => {}} />
          </Paper>
        </Grid>

        {/* Section C: Risk Touchpoints */}
        <Grid item xs={12} md={3}>
          <Paper sx={{ p: 2, height: '70vh', overflowY: 'auto', borderTop: '4px solid #ed6c02' }}>
            <RiskTouchpointSection candidates={data.risk_candidates} onSelect={(c) => {}} />
          </Paper>
        </Grid>

        {/* Section D: Actions */}
        <Grid item xs={12} md={3}>
          <Paper sx={{ p: 2, height: '70vh', overflowY: 'auto', borderTop: '4px solid #9c27b0' }}>
            <ActionsPanelSection actions={data.actions} onSelect={(a) => {}} />
          </Paper>
        </Grid>
      </Grid>
    </Container>
  );
};
