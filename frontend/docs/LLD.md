# Low-Level Design (LLD) - Ordin Core Governance SaaS Platform

## 1. Component-Level Architecture

### 1.1 Core Components Structure

#### 1.1.1 Authentication Component (Login.tsx)
```typescript
interface LoginProps {}

interface LoginState {
  email: string;
  password: string;
  isLoading: boolean;
  error: string;
}

// Key Functions:
- validateForm(): boolean
- handleLogin(): Promise<void>
- redirectToDashboard(): void
```

**Implementation Details:**
- Uses React Hook Form for validation
- Email/password validation with regex patterns
- Loading states for async operations
- Error boundary for authentication failures
- Session storage for user tokens

#### 1.1.2 Dashboard Component (Dashboard.tsx)
```typescript
interface DashboardState {
  todayPulse: PulseData | null;
  weeklyStats: WeeklyStats;
  activeRisks: Risk[];
  escalations: Escalation[];
  loading: boolean;
}

// Data Aggregation:
- fetchTodayPulse(): Promise<PulseData>
- fetchWeeklyStats(): Promise<WeeklyStats>
- fetchActiveRisks(): Promise<Risk[]>
- fetchEscalations(): Promise<Escalation[]>
```

**Implementation Details:**
- Real-time data fetching with useEffect
- Error handling for failed API calls
- Responsive grid layout (2-column desktop, 1-column mobile)
- Card-based UI components
- Navigation shortcuts to key features

#### 1.1.3 Governance Pulse Component (GovernancePulse.tsx)
```typescript
interface PulseFormData {
  dayType: 'monday' | 'wednesday' | 'friday';
  stabilityChecks: StabilityChecks;
  escalationReview: EscalationReview;
  trajectoryReview: TrajectoryReview;
  houseSnapshot: HouseSnapshot[];
  reflection: string;
}

interface StabilityChecks {
  overnightStability: boolean;
  weekendOversight: boolean;
  staffingAdequacy: boolean;
  criticalIncidents: boolean;
  safeguardingConcerns: boolean;
  medicationAdministration: boolean;
}
```

**Day-Specific Logic:**
- **Monday**: Stability & Weekend Oversight (6 Yes/No fields)
- **Wednesday**: Escalation & Mitigation Review (5 Yes/No fields)
- **Friday**: Trajectory & Forward Risk Review (3-option selectors)
- Auto-detection using `new Date().getDay()`
- Conditional form rendering based on day

#### 1.1.4 Weekly Review Component (WeeklyReview.tsx)
```typescript
interface WeeklyReviewData {
  executiveOverview: ExecutiveOverview;
  riskRegister: Risk[];
  safeguardingActivity: SafeguardingActivity;
  incidentReflection: IncidentReflection;
  staffingAssurance: StaffingAssurance;
  escalationOversight: EscalationOversight;
  learningActions: LearningAction[];
  reflectiveStatement: string;
  isLocked: boolean;
  submittedAt?: Date;
}
```

**Section Implementation:**
1. **Executive Overview**: Auto-populated from pulse data
2. **Active Risk Register**: Editable table with CRUD operations
3. **Safeguarding Activity**: 7-day review with expandable concerns
4. **Incident Reflection**: 9 incident type checkboxes
5. **Staffing Assurance**: Hours tracking and variance analysis
6. **Escalation Oversight**: Provider escalation tracking
7. **Learning Actions**: Action items with owners and due dates
8. **Reflective Statement**: Text area for governance reflection

### 1.2 Risk Management Components

#### 1.2.1 Risk Register (RiskRegister.tsx)
```typescript
interface Risk {
  id: string;
  title: string;
  description: string;
  category: RiskCategory;
  likelihood: 'Low' | 'Medium' | 'High';
  impact: 'Low' | 'Medium' | 'High';
  status: 'Open' | 'Under Review' | 'Escalated' | 'Closed';
  createdAt: Date;
  updatedAt: Date;
  assignedTo: string;
  actions: RiskAction[];
}

interface RiskRegisterState {
  risks: Risk[];
  filteredRisks: Risk[];
  filters: RiskFilters;
  showAddModal: boolean;
  editingRisk: Risk | null;
}
```

**Key Features:**
- Filterable table (category, status, likelihood, impact)
- Add Risk modal with form validation
- Inline editing capabilities
- Sortable columns
- Pagination for large datasets
- Export functionality

#### 1.2.2 Risk Detail (RiskDetail.tsx)
```typescript
interface RiskDetailProps {
  riskId: string;
}

interface RiskDetailState {
  risk: Risk | null;
  timeline: TimelineEntry[];
  actions: RiskAction[];
  escalationHistory: EscalationRecord[];
  loading: boolean;
}
```

**Timeline Implementation:**
- Chronological display of risk events
- Action items with status tracking
- Escalation history with timestamps
- Document attachments
- Comment threading

### 1.3 Analytics Components

#### 1.3.1 Trends Dashboard (Trends.tsx)
```typescript
interface TrendsData {
  sixWeekData: WeekData[];
  highRiskFrequency: ChartDataPoint[];
  safeguardingFrequency: ChartDataPoint[];
  escalationCount: ChartDataPoint[];
  staffingStability: StaffingMetrics;
}

interface ChartDataPoint {
  week: string;
  value: number;
  trend?: 'up' | 'down' | 'stable';
}
```

**Chart Implementations:**
- **High Risk Frequency**: Line chart (6-week rolling)
- **Safeguarding Frequency**: Bar chart (weekly counts)
- **Escalation Count**: Bar chart (provider breakdown)
- **Staffing Stability**: Arrow indicator + average

#### 1.3.2 Monthly Report (MonthlyReport.tsx)
```typescript
interface MonthlyReportData {
  month: string;
  year: number;
  weeklyReviews: WeeklyReviewData[];
  executiveSummary: ExecutiveSummary;
  riskAnalysis: RiskAnalysis;
  trendsAnalysis: TrendsAnalysis;
  recommendations: Recommendation[];
}
```

**Report Generation:**
- Data aggregation from 4 weekly reviews
- 6-page formal report structure
- PDF generation capability
- Executive summary auto-generation
- Trend analysis with visualizations

## 2. Data Models and Interfaces

### 2.1 Core Data Types

```typescript
// User Management
interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  providerId: string;
  permissions: Permission[];
  lastLogin: Date;
}

interface UserRole {
  id: string;
  name: string;
  permissions: string[];
}

// Provider Management
interface Provider {
  id: string;
  name: string;
  settings: ProviderSettings;
  users: User[];
}

interface ProviderSettings {
  timezone: string;
  reportingFrequency: 'weekly' | 'monthly';
  customFields: CustomField[];
}

// Governance Data
interface PulseData {
  id: string;
  providerId: string;
  date: Date;
  dayType: 'monday' | 'wednesday' | 'friday';
  data: PulseFormData;
  submittedBy: string;
  submittedAt: Date;
  status: 'draft' | 'submitted';
}

interface WeeklyReviewData {
  id: string;
  providerId: string;
  weekStart: Date;
  weekEnd: Date;
  data: WeeklyReviewContent;
  submittedBy: string;
  submittedAt?: Date;
  isLocked: boolean;
}

// Risk Management
interface Risk {
  id: string;
  providerId: string;
  title: string;
  description: string;
  category: RiskCategory;
  likelihood: RiskLevel;
  impact: RiskLevel;
  status: RiskStatus;
  assignedTo: string;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  actions: RiskAction[];
  documents: Document[];
}

interface RiskAction {
  id: string;
  riskId: string;
  description: string;
  assignedTo: string;
  dueDate: Date;
  status: 'Open' | 'In Progress' | 'Completed' | 'Overdue';
  createdAt: Date;
  completedAt?: Date;
}

// Escalation Management
interface EscalationRecord {
  id: string;
  providerId: string;
  riskId?: string;
  type: EscalationType;
  description: string;
  escalatedTo: string;
  escalatedBy: string;
  escalatedAt: Date;
  status: 'Open' | 'Under Review' | 'Resolved';
  resolution?: string;
  resolvedAt?: Date;
  documents: Document[];
}
```

### 2.2 Form Validation Schemas

```typescript
// Login Validation
const loginValidationSchema = {
  email: {
    required: true,
    pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    message: 'Valid email address required'
  },
  password: {
    required: true,
    minLength: 8,
    message: 'Password must be at least 8 characters'
  }
};

// Risk Validation
const riskValidationSchema = {
  title: {
    required: true,
    minLength: 3,
    maxLength: 200,
    message: 'Title must be 3-200 characters'
  },
  description: {
    required: true,
    minLength: 10,
    maxLength: 2000,
    message: 'Description must be 10-2000 characters'
  },
  category: {
    required: true,
    enum: ['Clinical', 'Operational', 'Financial', 'Regulatory', 'Staffing', 'Safeguarding']
  },
  likelihood: {
    required: true,
    enum: ['Low', 'Medium', 'High']
  },
  impact: {
    required: true,
    enum: ['Low', 'Medium', 'High']
  }
};

// Weekly Review Validation
const weeklyReviewValidationSchema = {
  executiveOverview: {
    required: true,
    minLength: 50,
    message: 'Executive overview must be at least 50 characters'
  },
  reflectiveStatement: {
    required: true,
    minLength: 100,
    message: 'Reflective statement must be at least 100 characters'
  }
};
```

## 3. State Management Implementation

### 3.1 Local State Patterns

```typescript
// Custom Hook for Form Management
const useFormState = <T>(initialState: T, validationSchema: ValidationSchema) => {
  const [formData, setFormData] = useState<T>(initialState);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isDirty, setIsDirty] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validateField = (field: keyof T, value: any) => {
    const fieldSchema = validationSchema[field as string];
    if (!fieldSchema) return '';

    if (fieldSchema.required && !value) {
      return fieldSchema.message || `${field} is required`;
    }

    if (fieldSchema.pattern && !fieldSchema.pattern.test(value)) {
      return fieldSchema.message || `Invalid ${field} format`;
    }

    return '';
  };

  const updateField = (field: keyof T, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    const error = validateField(field, value);
    setErrors(prev => ({ ...prev, [field as string]: error }));
    setIsDirty(true);
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    Object.keys(validationSchema).forEach(field => {
      const error = validateField(field as keyof T, formData[field as keyof T]);
      if (error) newErrors[field] = error;
    });
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  return {
    formData,
    errors,
    isDirty,
    isSubmitting,
    updateField,
    validateForm,
    setIsSubmitting
  };
};
```

### 3.2 Data Fetching Patterns

```typescript
// Custom Hook for API Calls
const useApiCall = <T>() => {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const execute = async (apiCall: () => Promise<T>) => {
    try {
      setLoading(true);
      setError(null);
      const result = await apiCall();
      setData(result);
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return { data, loading, error, execute };
};

// Usage Example
const RiskRegister = () => {
  const { data: risks, loading, error, execute } = useApiCall<Risk[]>();

  useEffect(() => {
    execute(() => fetchRisks());
  }, []);

  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorMessage message={error} />;
  if (!risks) return null;

  return <RiskTable risks={risks} />;
};
```

## 4. UI Component Implementation

### 4.1 Reusable UI Components

```typescript
// Button Component
interface ButtonProps {
  variant: 'primary' | 'secondary' | 'outline' | 'ghost';
  size: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  loading?: boolean;
  onClick?: () => void;
  children: React.ReactNode;
}

const Button = ({ variant, size, disabled, loading, onClick, children }: ButtonProps) => {
  const baseClasses = 'font-medium rounded-md transition-colors focus:outline-none focus:ring-2';
  const variantClasses = {
    primary: 'bg-black text-white hover:bg-gray-800 focus:ring-black',
    secondary: 'bg-gray-100 text-black hover:bg-gray-200 focus:ring-gray-400',
    outline: 'border border-black text-black hover:bg-black hover:text-white focus:ring-black',
    ghost: 'text-black hover:bg-gray-100 focus:ring-gray-400'
  };
  const sizeClasses = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-base',
    lg: 'px-6 py-3 text-lg'
  };

  return (
    <button
      className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]}`}
      disabled={disabled || loading}
      onClick={onClick}
    >
      {loading ? <LoadingSpinner size="sm" /> : children}
    </button>
  );
};

// Form Input Component
interface FormInputProps {
  label: string;
  name: string;
  type?: 'text' | 'email' | 'password' | 'textarea';
  value: string;
  onChange: (value: string) => void;
  error?: string;
  required?: boolean;
  placeholder?: string;
}

const FormInput = ({ 
  label, 
  name, 
  type = 'text', 
  value, 
  onChange, 
  error, 
  required, 
  placeholder 
}: FormInputProps) => {
  const InputComponent = type === 'textarea' ? 'textarea' : 'input';

  return (
    <div className="space-y-1">
      <label htmlFor={name} className="block text-sm font-medium text-gray-900">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      <InputComponent
        id={name}
        name={name}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-black ${
          error ? 'border-red-500' : 'border-gray-300'
        }`}
      />
      {error && <p className="text-sm text-red-500">{error}</p>}
    </div>
  );
};
```

### 4.2 Chart Components

```typescript
// Line Chart Component
interface LineChartProps {
  data: ChartDataPoint[];
  xKey: string;
  yKey: string;
  title: string;
  height?: number;
}

const LineChart = ({ data, xKey, yKey, title, height = 300 }: LineChartProps) => {
  return (
    <div className="bg-white p-4 rounded-lg border border-gray-200">
      <h3 className="text-lg font-semibold mb-4">{title}</h3>
      <ResponsiveContainer width="100%" height={height}>
        <RechartsLineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis 
            dataKey={xKey} 
            stroke="#6b7280"
            style={{ fontSize: '12px' }}
          />
          <YAxis 
            stroke="#6b7280"
            style={{ fontSize: '12px' }}
          />
          <Tooltip 
            contentStyle={{ 
              backgroundColor: '#ffffff',
              border: '1px solid #e5e7eb',
              borderRadius: '6px'
            }}
          />
          <Line 
            type="monotone" 
            dataKey={yKey} 
            stroke="#000000" 
            strokeWidth={2}
            dot={{ fill: '#000000', r: 4 }}
            activeDot={{ r: 6 }}
          />
        </RechartsLineChart>
      </ResponsiveContainer>
    </div>
  );
};

// Bar Chart Component
interface BarChartProps {
  data: ChartDataPoint[];
  xKey: string;
  yKey: string;
  title: string;
  height?: number;
}

const BarChart = ({ data, xKey, yKey, title, height = 300 }: BarChartProps) => {
  return (
    <div className="bg-white p-4 rounded-lg border border-gray-200">
      <h3 className="text-lg font-semibold mb-4">{title}</h3>
      <ResponsiveContainer width="100%" height={height}>
        <RechartsBarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis 
            dataKey={xKey} 
            stroke="#6b7280"
            style={{ fontSize: '12px' }}
          />
          <YAxis 
            stroke="#6b7280"
            style={{ fontSize: '12px' }}
          />
          <Tooltip 
            contentStyle={{ 
              backgroundColor: '#ffffff',
              border: '1px solid #e5e7eb',
              borderRadius: '6px'
            }}
          />
          <Bar 
            dataKey={yKey} 
            fill="#000000"
            radius={[4, 4, 0, 0]}
          />
        </RechartsBarChart>
      </ResponsiveContainer>
    </div>
  );
};
```

## 5. Routing and Navigation

### 5.1 Route Configuration

```typescript
// Route Definitions
const routes = [
  {
    path: '/',
    component: Login,
    public: true
  },
  {
    path: '/login',
    component: Login,
    public: true
  },
  {
    path: '/dashboard',
    component: Dashboard,
    public: false,
    permissions: ['dashboard:view']
  },
  {
    path: '/governance-pulse',
    component: GovernancePulse,
    public: false,
    permissions: ['pulse:create', 'pulse:view']
  },
  {
    path: '/weekly-review',
    component: WeeklyReview,
    public: false,
    permissions: ['weekly:create', 'weekly:view']
  },
  {
    path: '/risk-register',
    component: RiskRegister,
    public: false,
    permissions: ['risk:view']
  },
  {
    path: '/risk-register/:id',
    component: RiskDetail,
    public: false,
    permissions: ['risk:view']
  },
  {
    path: '/escalation-log',
    component: EscalationLog,
    public: false,
    permissions: ['escalation:view']
  },
  {
    path: '/trends',
    component: Trends,
    public: false,
    permissions: ['trends:view']
  },
  {
    path: '/profile',
    component: Profile,
    public: false,
    permissions: ['profile:view']
  },
  {
    path: '/monthly-report',
    component: MonthlyReport,
    public: false,
    permissions: ['reports:view']
  },
  {
    path: '/reports',
    component: Reports,
    public: false,
    permissions: ['reports:view']
  }
];

// Protected Route Wrapper
const ProtectedRoute = ({ children, permissions }: { children: React.ReactNode; permissions: string[] }) => {
  const { user, hasPermission } = useAuth();
  
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  
  if (permissions.some(permission => !hasPermission(permission))) {
    return <Navigate to="/dashboard" replace />;
  }
  
  return <>{children}</>;
};
```

### 5.2 Navigation Component

```typescript
interface NavigationItem {
  path: string;
  label: string;
  icon: React.ReactNode;
  permissions: string[];
  badge?: number;
}

const Navigation = () => {
  const { user, hasPermission } = useAuth();
  const location = useLocation();

  const navigationItems: NavigationItem[] = [
    {
      path: '/dashboard',
      label: 'Dashboard',
      icon: <LayoutDashboard size={20} />,
      permissions: ['dashboard:view']
    },
    {
      path: '/governance-pulse',
      label: 'Governance Pulse',
      icon: <Activity size={20} />,
      permissions: ['pulse:view']
    },
    {
      path: '/weekly-review',
      label: 'Weekly Review',
      icon: <FileText size={20} />,
      permissions: ['weekly:view']
    },
    {
      path: '/risk-register',
      label: 'Risk Register',
      icon: <AlertTriangle size={20} />,
      permissions: ['risk:view']
    },
    {
      path: '/escalation-log',
      label: 'Escalation Log',
      icon: <ArrowUpRight size={20} />,
      permissions: ['escalation:view']
    },
    {
      path: '/trends',
      label: 'Trends',
      icon: <TrendingUp size={20} />,
      permissions: ['trends:view']
    },
    {
      path: '/reports',
      label: 'Reports',
      icon: <BarChart3 size={20} />,
      permissions: ['reports:view']
    },
    {
      path: '/profile',
      label: 'Profile',
      icon: <User size={20} />,
      permissions: ['profile:view']
    }
  ];

  const filteredItems = navigationItems.filter(item =>
    item.permissions.every(permission => hasPermission(permission))
  );

  return (
    <nav className="bg-white border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex">
            <div className="flex-shrink-0 flex items-center">
              <h1 className="text-xl font-bold text-black">Ordin Core</h1>
            </div>
            <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
              {filteredItems.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${
                    location.pathname === item.path
                      ? 'border-black text-black'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  {item.icon}
                  <span className="ml-2">{item.label}</span>
                  {item.badge && (
                    <span className="ml-2 bg-red-500 text-white text-xs rounded-full px-2 py-1">
                      {item.badge}
                    </span>
                  )}
                </Link>
              ))}
            </div>
          </div>
          <div className="flex items-center">
            <UserMenu />
          </div>
        </div>
      </div>
    </nav>
  );
};
```

## 6. Error Handling and Validation

### 6.1 Error Boundary Implementation

```typescript
interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<PropsWithChildren<{}>, ErrorBoundaryState> {
  constructor(props: PropsWithChildren<{}>) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
    // Log to external service in production
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="max-w-md w-full bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-center w-12 h-12 mx-auto bg-red-100 rounded-full mb-4">
              <AlertCircle className="w-6 h-6 text-red-600" />
            </div>
            <h2 className="text-xl font-semibold text-center mb-2">Something went wrong</h2>
            <p className="text-gray-600 text-center mb-4">
              We apologize for the inconvenience. Please try refreshing the page.
            </p>
            <div className="text-center">
              <Button onClick={() => window.location.reload()}>
                Refresh Page
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
```

### 6.2 Form Validation Utilities

```typescript
// Validation Rules
export const validationRules = {
  required: (value: any) => !!value || 'This field is required',
  email: (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) || 'Invalid email address',
  minLength: (min: number) => (value: string) => 
    value.length >= min || `Must be at least ${min} characters`,
  maxLength: (max: number) => (value: string) => 
    value.length <= max || `Must be no more than ${max} characters`,
  pattern: (regex: RegExp, message: string) => (value: string) => 
    regex.test(value) || message,
  oneOf: (options: any[]) => (value: any) => 
    options.includes(value) || `Must be one of: ${options.join(', ')}`
};

// Form Validator
export const validateForm = <T extends Record<string, any>>(
  data: T,
  schema: Record<keyof T, ((value: any) => string | true)[]>
): Record<string, string> => {
  const errors: Record<string, string> = {};

  Object.keys(schema).forEach((field) => {
    const fieldValidators = schema[field as keyof T];
    const fieldValue = data[field as keyof T];

    for (const validator of fieldValidators) {
      const result = validator(fieldValue);
      if (result !== true) {
        errors[field] = result;
        break;
      }
    }
  });

  return errors;
};
```

## 7. Performance Optimizations

### 7.1 Component Optimization

```typescript
// Memoized Components
const RiskTable = memo(({ risks, onRiskClick }: RiskTableProps) => {
  const filteredRisks = useMemo(() => {
    return risks.filter(risk => risk.status !== 'Closed');
  }, [risks]);

  const sortedRisks = useMemo(() => {
    return [...filteredRisks].sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }, [filteredRisks]);

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Risk Title
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Category
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Status
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {sortedRisks.map((risk) => (
            <RiskRow key={risk.id} risk={risk} onClick={onRiskClick} />
          ))}
        </tbody>
      </table>
    </div>
  );
});

// Virtual Scrolling for Large Lists
const VirtualizedList = ({ items, itemHeight, containerHeight }: VirtualizedListProps) => {
  const [scrollTop, setScrollTop] = useState(0);
  
  const visibleStart = Math.floor(scrollTop / itemHeight);
  const visibleEnd = Math.min(
    visibleStart + Math.ceil(containerHeight / itemHeight) + 1,
    items.length
  );
  
  const visibleItems = items.slice(visibleStart, visibleEnd);
  
  return (
    <div
      style={{ height: containerHeight, overflow: 'auto' }}
      onScroll={(e) => setScrollTop(e.currentTarget.scrollTop)}
    >
      <div style={{ height: items.length * itemHeight, position: 'relative' }}>
        {visibleItems.map((item, index) => (
          <div
            key={item.id}
            style={{
              position: 'absolute',
              top: (visibleStart + index) * itemHeight,
              height: itemHeight,
              width: '100%'
            }}
          >
            <ListItem item={item} />
          </div>
        ))}
      </div>
    </div>
  );
};
```

### 7.2 Data Optimization

```typescript
// Debounced Search
const useDebounce = <T>(value: T, delay: number): T => {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
};

// Usage in Search Component
const SearchInput = ({ onSearch }: SearchInputProps) => {
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebounce(searchTerm, 300);

  useEffect(() => {
    if (debouncedSearchTerm) {
      onSearch(debouncedSearchTerm);
    }
  }, [debouncedSearchTerm, onSearch]);

  return (
    <input
      type="text"
      value={searchTerm}
      onChange={(e) => setSearchTerm(e.target.value)}
      placeholder="Search risks..."
      className="w-full px-3 py-2 border border-gray-300 rounded-md"
    />
  );
};
```

This LLD provides detailed implementation guidance for the Ordin Core Governance SaaS Platform, covering component architecture, data models, state management, UI implementation, and performance optimizations.
