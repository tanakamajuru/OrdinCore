const fs = require('fs');
const path = 'frontend/src/app/components/SignalCaptureForm.tsx';
let file = fs.readFileSync(path, 'utf8');

// The replacement wrapper text
const newFieldWrapper = `const FieldWrapper = ({ step, title, icon: Icon, children, currentStep, nextStep, validateStep, handleSubmit, isSubmitting }: any) => (
    <div className={\`transition-all duration-500 \${currentStep === step ? 'opacity-100 scale-100' : 'opacity-0 scale-95 pointer-events-none hidden'}\`}>
      <div className="flex items-center gap-3 mb-6">
        <div className="p-3 bg-primary/10 rounded-xl text-primary">
          <Icon size={24} />
        </div>
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Step {step} of 11</span>
          <h2 className="text-2xl font-bold text-foreground">{title}</h2>
        </div>
      </div>
      <div className="bg-card border-2 border-border p-8 shadow-xl">
        {children}
        <div className="mt-8 flex justify-end">
          {step < 11 ? (
             <button 
                onClick={nextStep}
                disabled={!validateStep(step)}
                className="flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-all font-bold"
             >
               Next <ArrowRight size={20} />
             </button>
          ) : (
            <button 
                onClick={handleSubmit}
                disabled={isSubmitting || !validateStep(11)}
                className="flex items-center gap-2 px-8 py-3 bg-success text-white hover:bg-success/90 disabled:opacity-50 transition-all font-bold"
            >
              {isSubmitting ? 'Submitting...' : 'Submit Signal'} <Save size={20} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
  `;

// Remove old FieldWrapper
file = file.replace(/const FieldWrapper = \(\{.*?\}\) => \([\s\S]*?\);\s+/, '');

// Add new FieldWrapper above the main component
file = file.replace('export function SignalCaptureForm() {', newFieldWrapper + '\nexport function SignalCaptureForm() {');

// Replace usages to pass props
file = file.replace(/<FieldWrapper step={(\d+)}/g, '<FieldWrapper currentStep={currentStep} nextStep={nextStep} validateStep={validateStep} handleSubmit={handleSubmit} isSubmitting={isSubmitting} step={$1}');

fs.writeFileSync(path, file);
console.log('Fixed SignalCaptureForm.tsx');
