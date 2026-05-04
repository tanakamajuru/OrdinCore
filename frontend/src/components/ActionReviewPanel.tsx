import React, { useState, useEffect } from 'react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import apiClient from '@/services/api';
import { toast } from 'sonner';

import { TrajectoryBadge } from './TrajectoryBadge';

export const ActionReviewPanel: React.FC = () => {
  const [actions, setActions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState<string | null>(null);
  const [comments, setComments] = useState<Record<string, string>>({});

  const fetchActions = async () => {
    setLoading(true);
    try {
      // Fetch actions with status 'Completed' but no 'rm_decision'
      const response = await apiClient.getRisksActions({ 
        status: 'Completed', 
        pending_review: 'true' 
      });

      if (response.success) {
        setActions(response.data || []);
      }
    } catch (error) {
      console.error('Failed to fetch actions for review', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchActions();
  }, []);

  const handleReview = async (actionId: string, decision: string) => {
    setSubmitting(actionId);
    try {
      const response = await apiClient.rmReviewAction(actionId, {
        rm_decision: decision,
        rm_comment: comments[actionId] || '',
      });

      if (response.success) {
        toast.success('Review submitted and trajectory updated.');
        setActions(actions.filter((a) => a.id !== actionId));
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to submit review');
    } finally {
      setSubmitting(null);
    }
  };

  if (loading) return <div className="p-8 text-center text-muted-foreground animate-pulse">Loading actions for review...</div>;
  if (actions.length === 0) return <div className="p-8 text-center text-muted-foreground bg-muted/20 rounded-lg border border-dashed border-border">No actions awaiting review.</div>;

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-foreground px-1">Actions Awaiting Review</h3>
      <div className="grid gap-4">
        {actions.map((action) => (
          <Card key={action.id} className="p-5 border-border bg-card hover:shadow-md transition-shadow">
            <div className="flex flex-col md:flex-row justify-between gap-4">
              <div className="space-y-2 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-primary bg-primary/10 px-2 py-0.5 rounded">Action Review</span>
                  <h4 className="font-semibold text-foreground">{action.title}</h4>
                </div>
                <p className="text-sm text-muted-foreground">Linked to Risk: <span className="text-foreground font-medium">{action.risk_title}</span></p>
                
                <div className="mt-4 p-3 rounded-lg bg-muted/30 border border-border/50">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-semibold text-muted-foreground">TL Outcome:</span>
                    <span className="text-xs font-bold text-foreground px-1.5 py-0.5 bg-background rounded border border-border">{action.completion_outcome}</span>
                  </div>
                  <p className="text-sm italic text-foreground/80">"{action.completion_rationale}"</p>
                </div>
              </div>

              <div className="w-full md:w-72 space-y-3">
                <textarea
                  placeholder="Review comments (optional)..."
                  className="w-full h-20 p-2 text-xs rounded border border-border bg-background focus:ring-1 focus:ring-primary focus:outline-none resize-none"
                  value={comments[action.id] || ''}
                  onChange={(e) => setComments({ ...comments, [action.id]: e.target.value })}
                />
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    className="flex-1 bg-green-600 hover:bg-green-700 text-white text-[10px] px-1"
                    onClick={() => handleReview(action.id, 'Confirm improvement')}
                    disabled={!!submitting}
                  >
                    Confirm Improvement
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    className="flex-1 text-[10px] px-1"
                    onClick={() => handleReview(action.id, 'No impact')}
                    disabled={!!submitting}
                  >
                    No Impact
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    className="flex-1 text-[10px] px-1"
                    onClick={() => handleReview(action.id, 'Negative impact')}
                    disabled={!!submitting}
                  >
                    Negative Impact
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};
