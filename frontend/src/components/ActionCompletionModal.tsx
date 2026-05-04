import React, { useState } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Card } from './ui/card';
import apiClient from '@/services/api';
import { toast } from 'sonner';


interface ActionCompletionModalProps {
  actionId: string;
  actionTitle: string;
  onClose: () => void;
  onSuccess: () => void;
}

export const ActionCompletionModal: React.FC<ActionCompletionModalProps> = ({
  actionId,
  actionTitle,
  onClose,
  onSuccess,
}) => {
  const [outcome, setOutcome] = useState('');
  const [rationale, setRationale] = useState('');
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);

  const outcomes = [
    { value: 'No change', label: 'No change' },
    { value: 'Partial improvement', label: 'Partial improvement' },
    { value: 'Risk reduced', label: 'Risk reduced' },
    { value: 'Risk escalated', label: 'Risk escalated' },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!outcome || !rationale) {
      toast.error('Please select an outcome and provide a rationale.');
      return;
    }

    if (rationale.length < 10) {
      toast.error('Rationale must be at least 10 characters.');
      return;
    }

    setLoading(true);
    try {
      const response = await apiClient.completeAction(actionId, {
        completion_outcome: outcome,
        completion_rationale: rationale,
        completion_note: note,
      });

      if (response.success) {
        toast.success('Action completed successfully.');
        onSuccess();
        onClose();
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to complete action');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <Card className="w-full max-w-md p-6 bg-card border-border shadow-xl animate-in fade-in zoom-in duration-200">
        <h2 className="text-xl font-semibold mb-2 text-foreground">Complete Action</h2>
        <p className="text-sm text-muted-foreground mb-6">
          Record the outcome and rationale for: <span className="font-medium text-foreground">{actionTitle}</span>
        </p>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-3">
            <label className="text-sm font-medium text-foreground">Completion Outcome</label>
            <div className="grid grid-cols-2 gap-3">
              {outcomes.map((o) => (
                <div
                  key={o.value}
                  onClick={() => setOutcome(o.value)}
                  className={`
                    cursor-pointer p-3 rounded-lg border text-sm text-center transition-all
                    ${outcome === o.value 
                      ? 'bg-primary/10 border-primary text-primary font-medium' 
                      : 'bg-muted/50 border-border text-muted-foreground hover:bg-muted'}
                  `}
                >
                  {o.label}
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Completion Rationale (Mandatory)</label>
            <textarea
              value={rationale}
              onChange={(e) => setRationale(e.target.value)}
              className="w-full h-24 p-3 rounded-md bg-muted/50 border border-border text-foreground text-sm focus:ring-2 focus:ring-primary focus:outline-none resize-none"
              placeholder="Explain why you chose this outcome (min 10 chars)..."
              required
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Completion Note (Optional)</label>
            <Input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Additional comments..."
            />
          </div>

          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={onClose}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="flex-1"
              disabled={loading || !outcome || rationale.length < 10}
            >
              {loading ? 'Processing...' : 'Complete Action'}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
};
