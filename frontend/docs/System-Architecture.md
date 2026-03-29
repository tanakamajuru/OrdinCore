# System Architecture Overview - Ordin Core Governance SaaS Platform

## Architecture Summary

The Ordin Core Governance SaaS Platform is built as a modern Single Page Application (SPA) using React 18 with TypeScript. The architecture follows a component-based design pattern with clear separation of concerns between UI components, business logic, and data management.

## Core Governance Philosophy

Ordin Core operates on a **Structured Oversight Model** that documents leadership behavior over time, not just compliance data. The platform captures the dual trajectory of **Risk Signals** and **Oversight Activity** to provide leadership with actionable insights into governance effectiveness.

### Dual Trajectory Model
1. **Risk Trajectory**: Shows how risk is moving across the organization (Increasing/Stable/Improving)
2. **Oversight Trajectory**: Shows leadership response activity (Active/Weak)

This creates meaningful insights that answer critical questions:
- Is risk increasing?
- Is governance responding appropriately?
- Where is attention required?

### Governance Rhythm
The system operates on a structured weekly rhythm:
- **3× Weekly Governance Pulses** (Mon/Wed/Fri) - Early warning signals
- **Risk Register Updates** - Continuous risk tracking
- **Escalation Discipline** - Leadership attention mechanisms
- **Weekly Governance Review** - Leadership oversight record
- **Monthly Oversight Narrative** - Executive governance summary

## Technology Stack

### Frontend Technologies
- **React 18.3.1**: Core UI framework with hooks and concurrent features
- **TypeScript**: Type safety and enhanced developer experience
- **Vite 6.3.5**: Fast build tool and development server
- **React Router 7.13.0**: Client-side routing and navigation
- **TailwindCSS 4.1.12**: Utility-first CSS framework with custom black/white theme

### UI Component Libraries
- **Radix UI**: Accessible component primitives (dialogs, dropdowns, forms, etc.)
- **Lucide React 0.487.0**: Consistent icon system
- **Recharts 2.15.2**: Data visualization and charting
- **React Hook Form 7.55.0**: Form validation and state management

### Development Tools
- **ESLint**: Code quality and linting
- **PostCSS**: CSS processing and optimization
- **pnpm**: Package management with efficient dependency handling

## Application Structure

```
Governance SaaS Application/
├── docs/                          # Documentation
│   ├── HLD.md                    # High-Level Design
│   ├── LLD.md                    # Low-Level Design
│   └── System-Architecture.md    # This file
├── src/
│   ├── app/
│   │   ├── App.tsx               # Main application component with routing
│   │   └── components/           # Application components
│   │       ├── Login.tsx         # Authentication screen
│   │       ├── Dashboard.tsx     # Main dashboard
│   │       ├── GovernancePulse.tsx # Daily governance forms
│   │       ├── WeeklyReview.tsx  # Weekly governance review
│   │       ├── RiskRegister.tsx  # Risk management
│   │       ├── RiskDetail.tsx    # Risk details view
│   │       ├── EscalationLog.tsx # Immutable escalation records
│   │       ├── Trends.tsx        # Analytics dashboard
│   │       ├── Profile.tsx       # User management
│   │       ├── MonthlyReport.tsx # Report generation
│   │       ├── Reports.tsx       # Additional reports
│   │       ├── Navigation.tsx    # Application navigation
│   │       └── ui/               # Reusable UI components
│   ├── main.tsx                  # Application entry point
│   └── styles/                   # Global styles and theme
├── index.html                     # HTML template
├── package.json                   # Dependencies and scripts
├── vite.config.ts                # Vite configuration
└── postcss.config.mjs            # PostCSS configuration
```

## User Roles & Responsibilities

### Governance Hierarchy

| Role | Primary Responsibilities | Technical Level | Usage Pattern |
|------|------------------------|-----------------|---------------|
| System Administrator | User setup, house configuration, role assignment, system monitoring and support | Expert | Setup phase / As needed |
| Director / Owner | Executive governance oversight, review of monthly structured reports, strategic reflection | Advanced | Monthly / Quarterly |
| Responsible Individual (RI) | Cross-site oversight, escalation review, weekly approval, regulatory accountability | Advanced | Weekly reviews, escalation responses |
| Registered Manager / Team Leader | House-level governance pulse entries, risk updates, escalation initiation | Intermediate | 3× per week (configured governance days) |

### Role-Based Access Control

#### System Administrator
- **Permissions**: Full system access, user management, configuration
- **Screens**: All screens with admin privileges
- **Key Features**: User creation, role assignment, system settings, audit logs

#### Director / Owner
- **Permissions**: Executive oversight, report access, strategic review
- **Screens**: Dashboard, Trends, Monthly Report, Profile
- **Key Features**: Monthly report review, trend analysis, strategic governance

#### Responsible Individual (RI)
- **Permissions**: Cross-site oversight, escalation management, weekly review approval
- **Screens**: Dashboard, Weekly Review, Escalation Log, Risk Register, Trends
- **Key Features**: Weekly review approval, escalation oversight, multi-site risk monitoring

#### Registered Manager / Team Leader
- **Permissions**: House-level governance, risk management, escalation initiation
- **Screens**: Dashboard, Governance Pulse, Risk Register, Risk Detail, Profile
- **Key Features**: Daily pulse completion, risk management, escalation creation

## Component Architecture

### Screen Components (10 Core Screens)
1. **Login**: Authentication and session management
2. **Home Dashboard**: Role-based task queue and governance rhythm status
3. **Governance Pulse**: 5-minute daily governance check-in (3× per week)
4. **Risk Register**: Cross-house risk tracking with trajectory visibility
5. **Risk Detail**: Individual risk with activity log and oversight history
6. **Escalations Inbox**: Role-based escalation review and response
7. **Weekly Governance Review**: Auto-compiled leadership oversight record
8. **Monthly Oversight Narrative**: Executive governance summary
9. **Governance Archive**: Inspection-ready locked records
10. **Incident Reconstruction**: Serious incident governance timeline

### Critical Success Screens
- **Governance Pulse**: Most critical - must be completed in < 5 minutes
- **Weekly Review**: Leadership oversight bridge between signals and actions
- **Risk Register**: Cross-house trajectory visibility
- **Escalations Inbox**: Discipline and response tracking

### Shared Components
- **Navigation**: Application header and navigation menu
- **UI Components**: Reusable form inputs, buttons, modals, tables
- **Chart Components**: Line charts, bar charts for data visualization

## Data Flow Architecture

### Governance Signal Flow
The system follows a structured signal flow that captures leadership oversight:

```
Governance Pulses (3×/week) → Risk Register Updates → Escalation Discipline → 
Weekly Governance Review → Monthly Oversight Narrative → Governance Archive
```

### Dual Trajectory Calculation
- **Risk Signals**: Pulse flags + Risk severity increases + Escalations
- **Oversight Signals**: Leadership reviews + Escalation reviews + Risk updates + Follow-up actions
- **Trajectory Analysis**: Current week vs. previous week comparison
- **Governance Drift Detection**: Alerts when risk increases but oversight doesn't

### State Management Pattern
- **Local State**: useState for component-level state
- **Form State**: React Hook Form for pulse and review forms
- **Session State**: User authentication and provider context
- **Derived State**: Risk trajectories and oversight metrics

### Data Flow
1. **Governance Pulse** → Risk signal capture → Risk register update
2. **Risk Movement** → Escalation trigger → Leadership notification
3. **Weekly Review** → Auto-compilation → Leadership interpretation
4. **Monthly Report** → Weekly rollup → Executive narrative
5. **Incident Reconstruction** → Timeline generation → Oversight evidence

## Security Architecture

### Authentication & Authorization
- **Session-based Authentication**: JWT token management (placeholder)
- **Route Protection**: Private routes with authentication checks
- **Role-based Access Control**: User permissions and role management

### Data Security
- **Multi-tenant Isolation**: Provider-level data filtering
- **Immutable Records**: Escalation logs and locked reviews
- **Input Validation**: Client-side form validation and sanitization
- **XSS Prevention**: React's built-in XSS protection

## Performance Architecture

### Optimization Strategies
- **Code Splitting**: Lazy loading of components
- **Bundle Optimization**: Vite's tree-shaking and minification
- **Component Memoization**: React.memo for expensive renders
- **Debounced Search**: Optimized search functionality
- **Virtual Scrolling**: For large data sets (future enhancement)

### Caching Strategy
- **Browser Caching**: Static asset caching
- **Component Caching**: Memoized computed values
- **Form Drafts**: localStorage for draft data persistence

## Responsive Design Architecture

### Breakpoint Strategy
- **Mobile**: < 640px (sm)
- **Tablet**: 640px - 1024px (md)
- **Desktop**: > 1024px (lg)

### Layout Patterns
- **Mobile-First**: Progressive enhancement approach
- **Flexible Grid**: Tailwind's responsive grid system
- **Component Adaptation**: Different layouts per screen size

## Integration Architecture

### Current Integration Points
- **UI Components**: Radix UI primitives
- **Styling**: TailwindCSS with custom theme
- **Charts**: Recharts for data visualization
- **Icons**: Lucide React icon system

### Future Backend Integration
- **REST API**: CRUD operations for all entities
- **Authentication Service**: User authentication and sessions
- **Database**: Multi-tenant data storage
- **File Storage**: Document uploads and report generation
- **Email Service**: Notifications and report distribution

## Deployment Architecture

### Build Process
```bash
# Development
npm run dev          # Vite dev server with HMR

# Production
npm run build        # Optimized build for production
```

### Deployment Strategy
- **Static Hosting**: CDN deployment for frontend assets
- **Environment Configuration**: Environment-specific settings
- **Asset Optimization**: Minified and compressed assets
- **SSL/TLS**: HTTPS enforcement

## Monitoring & Observability

### Frontend Monitoring
- **Error Tracking**: Client-side error logging
- **Performance Metrics**: Page load times and interaction metrics
- **User Analytics**: Feature usage tracking
- **Accessibility Monitoring**: WCAG compliance checking

### Quality Assurance
- **TypeScript**: Compile-time type checking
- **ESLint**: Code quality and consistency
- **Component Testing**: Unit tests for critical components
- **Integration Testing**: End-to-end workflow testing

## Scalability Considerations

### Horizontal Scaling
- **Stateless Design**: Easy horizontal scaling
- **Load Balancing**: CDN and application load balancers
- **Database Scaling**: Read replicas for reporting queries

### Vertical Scaling
- **Resource Optimization**: Efficient component rendering
- **Memory Management**: Proper cleanup and garbage collection
- **CPU Optimization**: Efficient algorithms and data structures

## Development Workflow

### Local Development
1. **Setup**: `pnpm install` to install dependencies
2. **Development**: `pnpm dev` to start development server
3. **Building**: `pnpm build` to create production build
4. **Testing**: Component testing and integration testing

### Code Organization
- **Component-Based**: Modular, reusable components
- **Type Safety**: TypeScript interfaces and types
- **Consistent Styling**: TailwindCSS utility classes
- **Documentation**: Inline comments and external docs

## Future Enhancements

### Backend Integration
- **API Integration**: RESTful API endpoints
- **Real-time Updates**: WebSocket connections
- **Offline Support**: Service workers and caching
- **Data Synchronization**: Conflict resolution strategies

### Advanced Features
- **Advanced Analytics**: Machine learning insights
- **Automated Reporting**: Scheduled report generation
- **Integration APIs**: Third-party system integration
- **Mobile Application**: React Native mobile app

This architecture provides a solid foundation for the Ordin Core Governance SaaS Platform, ensuring scalability, maintainability, and alignment with modern web development best practices.
