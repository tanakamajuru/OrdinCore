import { useState, useEffect } from "react";
import { RoleBasedNavigation } from "./RoleBasedNavigation";
import { WeeklyReviewStepNav } from "../../components/WeeklyReviewStepNav";
import { useNavigate, useParams } from "react-router";
import { toast } from "sonner";
import apiClient from "@/services/apiClient";

export function WeeklyReview() {
  const navigate = useNavigate();
  const { id } = useParams();

  const [currentStep, setCurrentStep] = useState(0);
  const [completedStep, setCompletedStep] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [previewData, setPreviewData] = useState<any>(null);
  const [formData, setFormData] = useState<any>({});
  const [status, setStatus] = useState<"Draft" | "Submitted" | "Locked">("Draft");

  useEffect(() => {
    loadReviewData();
  }, [id]);

  const loadReviewData = async () => {
    try {
      setIsLoading(true);
      // Fetch preview data and the review itself
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      const houseId = user.assigned_house_id || '1'; // Fallback
      
      const previewRes = await apiClient.get(`/weekly-reviews/preview?house_id=${houseId}&week_ending=${new Date().toISOString().split('T')[0]}`);
      setPreviewData(previewRes.data?.data || previewRes.data || {});
      
      if (id && id !== 'new') {
        const reviewRes = await apiClient.get(`/weekly-reviews/${id}`);
        const reviewData = reviewRes.data?.data || reviewRes.data;
        setFormData(reviewData.data || {});
        setCurrentStep(reviewData.step_reached || 0);
        setCompletedStep(reviewData.step_reached || 0);
        setStatus(reviewData.status || 'Draft');
      }
    } catch (error) {
      console.error('Failed to load review:', error);
      toast.error('Failed to load review data');
    } finally {
      setIsLoading(false);
    }
  };

  const handleNextStep = async () => {
    if (currentStep < 12) {
      const nextStep = currentStep + 1;
      setIsSaving(true);
      try {
        if (id && id !== 'new') {
          await apiClient.patch(`/weekly-reviews/${id}`, {
            step_reached: nextStep > completedStep ? nextStep : completedStep,
            data: formData
          });
        }
        setCurrentStep(nextStep);
        if (nextStep > completedStep) {
          setCompletedStep(nextStep);
        }
        window.scrollTo(0, 0);
      } catch (error) {
        toast.error('Failed to save progress');
      } finally {
        setIsSaving(false);
      }
    }
  };

  const handlePrevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
      window.scrollTo(0, 0);
    }
  };

  const handleSubmitAndLock = async () => {
    setIsSaving(true);
    try {
      if (id && id !== 'new') {
        await apiClient.post(`/weekly-reviews/${id}/complete`, {
          data: formData
        });
        toast.success('Review submitted and locked');
        navigate('/reports');
      } else {
         toast.success('Simulation: Review submitted and locked');
         navigate('/reports');
      }
    } catch (error) {
      toast.error('Failed to lock review');
    } finally {
      setIsSaving(false);
    }
  };

  const renderStepContent = () => {
    switch(currentStep) {
      case 0:
        return (
          <div className="bg-white border-2 border-black p-6 shadow-sm">
            <h2 className="text-xl font-black uppercase italic text-primary mb-4">Step 1: Scope & Executive Overview</h2>
            <p className="text-muted-foreground font-medium mb-4">Review the overarching scope of this week's governance.</p>
            <textarea
              value={formData.executiveSummary || ''}
              onChange={(e) => setFormData({...formData, executiveSummary: e.target.value})}
              className="w-full h-32 px-4 py-3 bg-white border-2 border-black focus:outline-none focus:ring-0 text-lg font-medium resize-none shadow-[4px_4px_0px_rgba(0,0,0,1)]"
              placeholder="Enter executive summary..."
            />
          </div>
        );
      case 1:
      case 2:
      case 3:
      case 4:
      case 5:
      case 6:
      case 7:
      case 8:
      case 9:
      case 10:
      case 11:
        return (
          <div className="bg-white border-2 border-black p-6 shadow-sm">
            <h2 className="text-xl font-black uppercase italic text-primary mb-4">Step {currentStep + 1}: Data Review</h2>
            <p className="font-bold text-sm mb-4">Review backend governance data populated automatically.</p>
            
            <div className="bg-primary/5 p-4 mb-6 border-l-4 border-primary">
                <pre className="text-xs overflow-auto font-mono text-muted-foreground">
                    {JSON.stringify(previewData || { status: 'mocking preview data for step ' + (currentStep+1) }, null, 2)}
                </pre>
            </div>
            
            <label className="block mb-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Findings & Notes</label>
            <textarea
              value={formData[`step_${currentStep}_notes`] || ''}
              onChange={(e) => setFormData({...formData, [`step_${currentStep}_notes`]: e.target.value})}
              className="w-full h-32 px-4 py-3 bg-white border-2 border-black focus:outline-none focus:ring-0 text-lg font-medium resize-none shadow-[4px_4px_0px_rgba(0,0,0,1)]"
              placeholder="Document your findings..."
            />
          </div>
        );
      case 12:
        return (
          <div className="bg-white border-2 border-black p-6 shadow-sm">
            <h2 className="text-xl font-black uppercase italic text-primary mb-4">Step 13: Sign-off & Lock</h2>
            <div className="mb-6 p-4 border-l-4 border-destructive bg-destructive/10">
              <p className="font-bold text-sm">I confirm that I have reviewed all active risks, safeguarding concerns and governance controls for this reporting period.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block mb-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Digital Signature</label>
                <input
                  type="text"
                  value={formData.digitalSignature || ''}
                  onChange={(e) => setFormData({...formData, digitalSignature: e.target.value})}
                  placeholder="Type your name to sign"
                  className="w-full px-4 py-3 bg-white border-2 border-black focus:outline-none focus:ring-0 text-lg font-medium shadow-[4px_4px_0px_rgba(0,0,0,1)]"
                />
              </div>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 font-bold text-sm uppercase tracking-widest text-muted-foreground">Loading review data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <RoleBasedNavigation />
      <div className="p-6 w-full pt-24 max-w-5xl mx-auto">
        <div className="mb-12 text-center">
          <h1 className="text-4xl font-black uppercase italic tracking-tighter text-primary">Weekly Governance Review</h1>
          <p className="text-sm font-bold uppercase tracking-widest text-muted-foreground mt-2">Step-Locked 13-Phase Verification</p>
        </div>

        <WeeklyReviewStepNav activeStep={currentStep} completedStep={completedStep} />

        <div className="mb-12 mt-8">
          {renderStepContent()}
        </div>

        <div className="flex justify-between items-center mt-8 pt-6 border-t-4 border-black">
          <button
            onClick={handlePrevStep}
            disabled={currentStep === 0 || isSaving}
            className="py-3 px-8 bg-white text-black border-2 border-black hover:bg-gray-100 transition-colors font-black uppercase tracking-widest disabled:opacity-50"
          >
            Previous Step
          </button>
          
          {currentStep < 12 ? (
            <button
              onClick={handleNextStep}
              disabled={isSaving || status === 'Locked'}
              className="py-3 px-8 bg-black text-white hover:bg-primary transition-all font-black uppercase tracking-widest disabled:opacity-50 shadow-[4px_4px_0px_rgba(0,0,0,1)] hover:shadow-[2px_2px_0px_rgba(0,0,0,1)] hover:translate-y-[2px]"
            >
              {isSaving ? 'Saving...' : 'Save & Next Step'}
            </button>
          ) : (
            <button
              onClick={handleSubmitAndLock}
              disabled={isSaving || status === 'Locked' || !formData.digitalSignature}
              className="py-3 px-8 bg-destructive text-white hover:bg-black transition-all font-black uppercase tracking-widest disabled:opacity-50 shadow-[4px_4px_0px_rgba(0,0,0,1)] hover:shadow-[2px_2px_0px_rgba(0,0,0,1)] hover:translate-y-[2px]"
            >
              {isSaving ? 'Locking...' : 'SUBMIT & LOCK REVIEW'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
