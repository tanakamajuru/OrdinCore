import React from 'react';
import { Box, Typography, Card, CardContent, Divider, Stack } from '@mui/material';
import { ErrorOutline, GroupWork, TrackChanges, Assignment } from '@mui/icons-material';
import { ClusterCard } from '../ClusterCard';

// --- Section A: High Priority Signals ---
export const HighPrioritySection = ({ signals, onSelect }: { signals: any[], onSelect: (s: any) => void }) => (
  <Box>
    <Typography variant="h6" color="error" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
      <ErrorOutline /> Section A: High Priority Signals
    </Typography>
    <Stack spacing={1}>
      {signals.map(s => (
        <Card key={s.id} sx={{ cursor: 'pointer', '&:hover': { bgcolor: 'error.50' } }} onClick={() => onSelect(s)}>
          <CardContent sx={{ py: 1 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Typography variant="subtitle2">{s.signal_type}</Typography>
              <Typography variant="caption" color="error.main" sx={{ fontWeight: 700 }}>{s.severity}</Typography>
            </Box>
            <Typography variant="body2" noWrap>{s.description}</Typography>
          </CardContent>
        </Card>
      ))}
      {signals.length === 0 && <Typography variant="body2" color="text.secondary">No high priority signals needing triage.</Typography>}
    </Stack>
  </Box>
);

// --- Section B: Pattern Signals ---
export const PatternSignalsSection = ({ clusters, onSelect }: { clusters: any[], onSelect: (c: any) => void }) => (
  <Box>
    <Typography variant="h6" color="primary" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
      <GroupWork /> Section B: Active Patterns
    </Typography>
    {clusters.map(c => (
      <ClusterCard key={c.id} cluster={c} onClick={() => onSelect(c)} />
    ))}
    {clusters.length === 0 && <Typography variant="body2" color="text.secondary">No active signal patterns identified.</Typography>}
  </Box>
);

// --- Section C: Risk Touchpoint ---
export const RiskTouchpointSection = ({ candidates, onSelect }: { candidates: any[], onSelect: (c: any) => void }) => (
  <Box>
    <Typography variant="h6" color="warning.main" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
      <TrackChanges /> Section C: Risk Touchpoints
    </Typography>
    <Typography variant="caption" color="text.secondary" gutterBottom display="block">Clusters with 3+ signals requiring formal risk vinculation.</Typography>
    {candidates.map(c => (
      <ClusterCard key={c.id} cluster={c} onClick={() => onSelect(c)} />
    ))}
    {candidates.length === 0 && <Typography variant="body2" color="text.secondary">No risk candidates detected today.</Typography>}
  </Box>
);

// --- Section D: Actions Panel ---
export const ActionsPanelSection = ({ actions, onSelect }: { actions: any[], onSelect: (a: any) => void }) => (
  <Box>
    <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
      <Assignment /> Section D: Actions Panel
    </Typography>
    <Stack spacing={1}>
      {actions.map(a => (
        <Card key={a.id} sx={{ cursor: 'pointer' }} onClick={() => onSelect(a)}>
          <CardContent sx={{ py: 1 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Typography variant="subtitle2" noWrap>{a.title}</Typography>
              <Typography variant="caption" color={a.status === 'Overdue' ? 'error' : 'primary'}>{a.status}</Typography>
            </Box>
            <Typography variant="caption" color="text.secondary">Due: {new Date(a.due_date).toLocaleDateString()}</Typography>
          </CardContent>
        </Card>
      ))}
      {actions.length === 0 && <Typography variant="body2" color="text.secondary">All actions are currently up to date.</Typography>}
    </Stack>
  </Box>
);
