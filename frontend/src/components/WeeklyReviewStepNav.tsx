import React from 'react';
import { Stepper, Step, StepLabel, Box, Typography } from '@mui/material';

const steps = [
  'Scope', 'Pulses', 'Patterns', 'Escalations', 'Protective', 
  'Interpretation', 'Risks', 'Trajectory', 'Control Failures', 
  'Decisions', 'Actions', 'Position', 'Sign-off'
];

interface WeeklyReviewStepNavProps {
  activeStep: number;
  completedStep: number;
}

export const WeeklyReviewStepNav: React.FC<WeeklyReviewStepNavProps> = ({ activeStep, completedStep }) => {
  return (
    <Box sx={{ width: '100%', mb: 4 }}>
      <Stepper activeStep={activeStep} alternativeLabel>
        {steps.map((label, index) => {
          const stepProps: { completed?: boolean } = {};
          const labelProps: { optional?: React.ReactNode; error?: boolean } = {};
          
          if (index < completedStep) {
            stepProps.completed = true;
          }

          return (
            <Step key={label} {...stepProps}>
              <StepLabel {...labelProps}>
                <Typography variant="caption" sx={{ fontWeight: index === activeStep ? 700 : 400 }}>
                  {label}
                </Typography>
              </StepLabel>
            </Step>
          );
        })}
      </Stepper>
    </Box>
  );
};
