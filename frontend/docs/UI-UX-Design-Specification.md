# UI/UX Design Specification Document
# Ordin Core Governance SaaS Platform

## Document Information

| **Document Version** | 1.0 |
|---------------------|------|
| **Date** | January 15, 2024 |
| **Author** | Tanaka Majuru |
| **Approved By** | Design Lead |
| **Status** | Final |

## Table of Contents

1. [Design Overview](#1-design-overview)
2. [Design System](#2-design-system)
3. [Component Library](#3-component-library)
4. [Screen Specifications](#4-screen-specifications)
5. [Interaction Patterns](#5-interaction-patterns)
6. [Animation Specifications](#6-animation-specifications)
7. [Error and Empty States](#7-error-and-empty-states)
8. [Responsive Design](#8-responsive-design)
9. [Accessibility Guidelines](#9-accessibility-guidelines)

---

## 1. Design Overview

### 1.1 Design Philosophy

The Ordin Core platform follows a **professional, minimalist design philosophy** with these core principles:

- **Clarity First**: Information hierarchy that guides users naturally
- **Efficiency**: Minimal clicks to complete tasks
- **Consistency**: Unified design language across all screens
- **Accessibility**: WCAG 2.1 AA compliance as baseline
- **Professional Tone**: Black and white color scheme reflecting governance seriousness

### 1.2 Visual Design Language

#### Color Palette
```css
/* Primary Colors */
--color-primary: #000000;        /* Pure Black */
--color-secondary: #FFFFFF;       /* Pure White */
--color-gray-50: #FAFAFA;        /* Lightest Gray */
--color-gray-100: #F5F5F5;       /* Very Light Gray */
--color-gray-200: #E5E5E5;       /* Light Gray */
--color-gray-300: #D4D4D4;       /* Medium Light Gray */
--color-gray-400: #A3A3A3;       /* Medium Gray */
--color-gray-500: #737373;       /* Medium Dark Gray */
--color-gray-600: #525252;       /* Dark Gray */
--color-gray-700: #404040;       /* Very Dark Gray */
--color-gray-800: #262626;       /* Near Black */
--color-gray-900: #171717;       /* Almost Black */

/* Semantic Colors */
--color-success: #059669;         /* Green for success states */
--color-warning: #D97706;         /* Amber for warnings */
--color-error: #DC2626;          /* Red for errors */
--color-info: #2563EB;           /* Blue for information */

/* Background Colors */
--bg-primary: #FFFFFF;            /* Main background */
--bg-secondary: #FAFAFA;         /* Secondary background */
--bg-tertiary: #F5F5F5;         /* Tertiary background */
--bg-overlay: rgba(0, 0, 0, 0.5); /* Modal overlay */
```

#### Typography
```css
/* Font Family */
--font-primary: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
--font-mono: 'JetBrains Mono', 'Fira Code', monospace;

/* Font Sizes */
--text-xs: 0.75rem;      /* 12px */
--text-sm: 0.875rem;     /* 14px */
--text-base: 1rem;       /* 16px */
--text-lg: 1.125rem;     /* 18px */
--text-xl: 1.25rem;      /* 20px */
--text-2xl: 1.5rem;      /* 24px */
--text-3xl: 1.875rem;    /* 30px */
--text-4xl: 2.25rem;     /* 36px */
--text-5xl: 3rem;        /* 48px */

/* Font Weights */
--font-light: 300;
--font-normal: 400;
--font-medium: 500;
--font-semibold: 600;
--font-bold: 700;

/* Line Heights */
--leading-tight: 1.25;
--leading-normal: 1.5;
--leading-relaxed: 1.75;
```

#### Spacing System
```css
/* Base spacing unit: 4px */
--space-1: 0.25rem;   /* 4px */
--space-2: 0.5rem;    /* 8px */
--space-3: 0.75rem;   /* 12px */
--space-4: 1rem;      /* 16px */
--space-5: 1.25rem;   /* 20px */
--space-6: 1.5rem;    /* 24px */
--space-8: 2rem;      /* 32px */
--space-10: 2.5rem;   /* 40px */
--space-12: 3rem;     /* 48px */
--space-16: 4rem;     /* 64px */
--space-20: 5rem;     /* 80px */
--space-24: 6rem;     /* 96px */
```

#### Border Radius
```css
--radius-sm: 0.125rem;   /* 2px */
--radius-base: 0.25rem;  /* 4px */
--radius-md: 0.375rem;   /* 6px */
--radius-lg: 0.5rem;     /* 8px */
--radius-xl: 0.75rem;    /* 12px */
--radius-2xl: 1rem;      /* 16px */
--radius-full: 9999px;
```

#### Shadows
```css
--shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
--shadow-base: 0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06);
--shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
--shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
--shadow-xl: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
```

---

## 2. Design System

### 2.1 Layout System

#### Grid System
- **12-column grid** for desktop layouts
- **8-column grid** for tablet layouts
- **4-column grid** for mobile layouts
- **Container max-width**: 1280px for desktop
- **Gutter width**: 24px (desktop), 16px (tablet), 12px (mobile)

#### Breakpoints
```css
/* Breakpoint Definitions */
--breakpoint-sm: 640px;   /* Small devices */
--breakpoint-md: 768px;   /* Medium devices (tablets) */
--breakpoint-lg: 1024px;   /* Large devices (desktops) */
--breakpoint-xl: 1280px;   /* Extra large devices */
--breakpoint-2xl: 1536px;  /* 2X large devices */
```

#### Container Layouts
```css
/* Container Max Widths */
.container-sm { max-width: 640px; }
.container-md { max-width: 768px; }
.container-lg { max-width: 1024px; }
.container-xl { max-width: 1280px; }
.container-2xl { max-width: 1536px; }
```

### 2.2 Component Principles

#### Consistency Rules
1. **Consistent Spacing**: Use spacing scale consistently
2. **Consistent Typography**: Follow typography hierarchy
3. **Consistent Colors**: Use defined color palette only
4. **Consistent Interactions**: Standard interaction patterns
5. **Consistent States**: Standard hover, focus, active states

#### Component Naming Convention
- **BEM Methodology**: Block__Element--Modifier
- **Descriptive Names**: Clear, semantic naming
- **Consistent Prefixes**: Component-specific prefixes
- **State Modifiers**: Clear state indication

---

## 3. Component Library

### 3.1 Core Components

#### Button Component
```css
/* Base Button Styles */
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-md);
  font-weight: var(--font-medium);
  transition: all 0.2s ease;
  cursor: pointer;
  border: 1px solid transparent;
  text-decoration: none;
  white-space: nowrap;
}

/* Button Sizes */
.btn-sm {
  padding: var(--space-2) var(--space-3);
  font-size: var(--text-sm);
  height: 32px;
}

.btn-base {
  padding: var(--space-3) var(--space-4);
  font-size: var(--text-base);
  height: 40px;
}

.btn-lg {
  padding: var(--space-4) var(--space-6);
  font-size: var(--text-lg);
  height: 48px;
}

/* Button Variants */
.btn-primary {
  background-color: var(--color-primary);
  color: var(--color-secondary);
}

.btn-primary:hover {
  background-color: var(--color-gray-800);
  transform: translateY(-1px);
  box-shadow: var(--shadow-md);
}

.btn-secondary {
  background-color: var(--color-secondary);
  color: var(--color-primary);
  border-color: var(--color-gray-300);
}

.btn-secondary:hover {
  background-color: var(--color-gray-50);
  border-color: var(--color-gray-400);
}

.btn-outline {
  background-color: transparent;
  color: var(--color-primary);
  border-color: var(--color-primary);
}

.btn-outline:hover {
  background-color: var(--color-primary);
  color: var(--color-secondary);
}

/* Button States */
.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  transform: none;
}

.btn:focus {
  outline: 2px solid var(--color-primary);
  outline-offset: 2px;
}
```

#### Input Component
```css
/* Base Input Styles */
.input {
  width: 100%;
  padding: var(--space-3) var(--space-4);
  border: 1px solid var(--color-gray-300);
  border-radius: var(--radius-md);
  font-size: var(--text-base);
  transition: all 0.2s ease;
  background-color: var(--color-secondary);
}

.input:focus {
  outline: none;
  border-color: var(--color-primary);
  box-shadow: 0 0 0 3px rgba(0, 0, 0, 0.1);
}

.input:invalid {
  border-color: var(--color-error);
}

.input:disabled {
  background-color: var(--color-gray-100);
  color: var(--color-gray-500);
  cursor: not-allowed;
}

/* Input Sizes */
.input-sm {
  padding: var(--space-2) var(--space-3);
  font-size: var(--text-sm);
  height: 32px;
}

.input-base {
  padding: var(--space-3) var(--space-4);
  font-size: var(--text-base);
  height: 40px;
}

.input-lg {
  padding: var(--space-4) var(--space-6);
  font-size: var(--text-lg);
  height: 48px;
}
```

#### Card Component
```css
.card {
  background-color: var(--color-secondary);
  border: 1px solid var(--color-gray-200);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-sm);
  overflow: hidden;
  transition: all 0.2s ease;
}

.card:hover {
  box-shadow: var(--shadow-md);
  transform: translateY(-2px);
}

.card-header {
  padding: var(--space-6);
  border-bottom: 1px solid var(--color-gray-200);
  background-color: var(--color-gray-50);
}

.card-body {
  padding: var(--space-6);
}

.card-footer {
  padding: var(--space-6);
  border-top: 1px solid var(--color-gray-200);
  background-color: var(--color-gray-50);
}
```

#### Modal Component
```css
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: var(--bg-overlay);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: var(--space-4);
}

.modal {
  background-color: var(--color-secondary);
  border-radius: var(--radius-xl);
  box-shadow: var(--shadow-xl);
  max-width: 90vw;
  max-height: 90vh;
  overflow: hidden;
  animation: modalSlideIn 0.3s ease;
}

@keyframes modalSlideIn {
  from {
    opacity: 0;
    transform: translateY(-20px) scale(0.95);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

.modal-header {
  padding: var(--space-6);
  border-bottom: 1px solid var(--color-gray-200);
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.modal-body {
  padding: var(--space-6);
  max-height: 60vh;
  overflow-y: auto;
}

.modal-footer {
  padding: var(--space-6);
  border-top: 1px solid var(--color-gray-200);
  display: flex;
  justify-content: flex-end;
  gap: var(--space-3);
}
```

### 3.2 Form Components

#### Form Field
```css
.form-field {
  margin-bottom: var(--space-6);
}

.form-label {
  display: block;
  font-weight: var(--font-medium);
  color: var(--color-gray-700);
  margin-bottom: var(--space-2);
  font-size: var(--text-sm);
}

.form-label.required::after {
  content: " *";
  color: var(--color-error);
}

.form-error {
  color: var(--color-error);
  font-size: var(--text-sm);
  margin-top: var(--space-1);
  display: flex;
  align-items: center;
  gap: var(--space-1);
}

.form-help {
  color: var(--color-gray-500);
  font-size: var(--text-sm);
  margin-top: var(--space-1);
}
```

#### Checkbox Component
```css
.checkbox-group {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.checkbox-item {
  display: flex;
  align-items: center;
  gap: var(--space-3);
}

.checkbox-input {
  width: 20px;
  height: 20px;
  border: 2px solid var(--color-gray-300);
  border-radius: var(--radius-sm);
  background-color: var(--color-secondary);
  cursor: pointer;
  position: relative;
  transition: all 0.2s ease;
}

.checkbox-input:checked {
  background-color: var(--color-primary);
  border-color: var(--color-primary);
}

.checkbox-input:checked::after {
  content: "✓";
  color: var(--color-secondary);
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  font-size: 14px;
  font-weight: bold;
}

.checkbox-label {
  color: var(--color-gray-700);
  cursor: pointer;
  user-select: none;
}
```

#### Radio Group Component
```css
.radio-group {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.radio-item {
  display: flex;
  align-items: center;
  gap: var(--space-3);
}

.radio-input {
  width: 20px;
  height: 20px;
  border: 2px solid var(--color-gray-300);
  border-radius: 50%;
  background-color: var(--color-secondary);
  cursor: pointer;
  position: relative;
  transition: all 0.2s ease;
}

.radio-input:checked {
  border-color: var(--color-primary);
}

.radio-input:checked::after {
  content: "";
  width: 10px;
  height: 10px;
  background-color: var(--color-primary);
  border-radius: 50%;
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
}
```

---

## 4. Screen Specifications

### 4.1 Login Screen

#### Layout Structure
```
┌─────────────────────────────────────┐
│                                     │
│              Logo                   │
│                                     │
│    ┌─────────────────────────────┐    │
│    │        Login Card          │    │
│    │  ┌─────────────────────┐    │    │
│    │  │     Email          │    │    │
│    │  └─────────────────────┘    │    │
│    │  ┌─────────────────────┐    │    │
│    │  │     Password       │    │    │
│    │  └─────────────────────┘    │    │
│    │                             │    │
│    │  [  Remember Me  ]  Forgot?  │    │
│    │                             │    │
│    │      [   Login   ]           │    │
│    └─────────────────────────────┘    │
│                                     │
│         © 2024 Ordin Core           │
└─────────────────────────────────────┘
```

#### Specifications
- **Card Size**: 400px width, centered vertically
- **Logo Size**: 120px width, 40px height
- **Input Fields**: Full width, 40px height
- **Button**: Full width, 48px height
- **Spacing**: 24px between elements
- **Background**: Light gray gradient (#FAFAFA to #F5F5F5)

### 4.2 Dashboard Screen

#### Layout Structure
```
┌─────────────────────────────────────────────────────────────┐
│                    Navigation Header                       │
├─────────────────────────────────────────────────────────────┤
│  Welcome Message                    │  Quick Actions        │
├─────────────────────────────────────┼─────────────────────┤
│  Today's Governance Pulse           │  Weekly Snapshot     │
│  ┌─────────────────────────────┐    │  ┌───────────────┐  │
│  │ Status: Completed ✓        │    │  │ Total Risks   │  │
│  │ Submitted: 9:00 AM        │    │  │ 15            │  │
│  │ [View Details]             │    │  └───────────────┘  │
│  └─────────────────────────────┘    │  ┌───────────────┐  │
├─────────────────────────────────────┼─────────────────────┤
│  Active High Risks                │  Escalations        │
│  ┌─────────────────────────────┐    │  ┌───────────────┐  │
│  │ • Staffing Shortages      │    │  │ 2 Open        │  │
│  │ • Medication Safety      │    │  │ 1 Resolved    │  │
│  │ • Facility Maintenance    │    │  └───────────────┘  │
│  └─────────────────────────────┘    │                     │
├─────────────────────────────────────┼─────────────────────┤
│  Recent Escalations               │  Navigation Grid     │
│  ┌─────────────────────────────┐    │  ┌─────┐ ┌─────┐  │
│  │ Medication Error - Resolved│    │  │Pulse│ │Risk │  │
│  │ Staffing Issue - Open       │    │  └─────┘ └─────┘  │
│  └─────────────────────────────┘    │  ┌─────┐ ┌─────┐  │
│                                   │  │Trend│ │Report│  │
│                                   │  └─────┘ └─────┘  │
└─────────────────────────────────────┴─────────────────────┘
```

#### Responsive Behavior
- **Desktop**: 2-column layout (70% main content, 30% sidebar)
- **Tablet**: Single column, sidebar below main content
- **Mobile**: Stacked cards with full-width elements

### 4.3 Governance Pulse Screen

#### Layout Structure
```
┌─────────────────────────────────────────────────────────────┐
│                    Navigation Header                       │
├─────────────────────────────────────────────────────────────┤
│  Monday, January 15, 2024                                │
│  ┌─────────────────────────────────────────────────────┐    │
│  │              Stability Checks                       │    │
│  │  ☑ Overnight Stability                           │    │
│  │  ☑ Weekend Oversight                             │    │
│  │  ☐ Staffing Adequacy                            │    │
│  │  ☐ Critical Incidents                            │    │
│  │  ☐ Safeguarding Concerns                        │    │
│  │  ☑ Medication Administration                    │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                         │
│  ┌─────────────────────────────────────────────────────┐    │
│  │              House Snapshot                        │    │
│  │  ┌─────┬─────┬─────┬─────┬─────┬─────────┐      │    │
│  │  │House│Occup│Staff│Over │Issues│Actions │      │    │
│  │  │ Name│ancy │On   │night│       │        │      │    │
│  │  ├─────┼─────┼─────┼─────┼─────┼─────────┤      │    │
│  │  │House│ 20  │  4  │  2  │ None │[Edit]  │      │    │
│  │  │ A   │     │     │     │     │        │      │    │
│  │  ├─────┼─────┼─────┼─────┼─────┼─────────┤      │    │
│  │  │House│ 18  │  3  │  2  │ Staff│[Edit]  │      │    │
│  │  │ B   │     │     │     │Short│        │      │    │
│  │  └─────┴─────┴─────┴─────┴─────┴─────────┘      │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                         │
│  ┌─────────────────────────────────────────────────────┐    │
│  │                   Reflection                       │    │
│  │  ┌─────────────────────────────────────────────┐    │    │
│  │  │ Overall stable weekend with adequate       │    │    │
│  │  │ staffing levels. No major incidents...    │    │    │
│  │  └─────────────────────────────────────────────┘    │    │
│  │  Characters: 145/50 minimum                     │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                         │
│              [ Save Draft ]    [ Submit Pulse ]            │
└─────────────────────────────────────────────────────────────┘
```

#### Form Validation States
- **Empty Field**: Red border, error message below
- **Invalid Input**: Red border, shake animation
- **Valid Input**: Green border, checkmark indicator
- **Required Field**: Asterisk (*) next to label

### 4.4 Risk Register Screen

#### Layout Structure
```
┌─────────────────────────────────────────────────────────────┐
│                    Navigation Header                       │
├─────────────────────────────────────────────────────────────┤
│  Risk Register                    [ Add Risk ] [ Export ]   │
├─────────────────────────────────────────────────────────────┤
│  Filters: [Status ▼] [Category ▼] [Likelihood ▼]        │
│  Search: ┌─────────────────────────────────────────────┐    │
│          │ Search risks...                           │    │
│          └─────────────────────────────────────────────┘    │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────┐    │
│  │ Risk Title        │ Category │ Status │ Actions     │    │
│  ├─────────────────────────────────────────────────────┤    │
│  │ Staffing         │ Staffing │ Open   │ [View][Edit]│    │
│  │ Shortages        │          │        │            │    │
│  ├─────────────────────────────────────────────────────┤    │
│  │ Medication       │ Clinical │ Under  │ [View][Edit]│    │
│  │ Safety           │          │ Review │            │    │
│  ├─────────────────────────────────────────────────────┤    │
│  │ Facility         │ Operational│Escalated│[View][Edit]│    │
│  │ Maintenance     │          │        │            │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                         │
│  Showing 1-10 of 15 risks    [ ← Previous ] [ Next → ]   │
└─────────────────────────────────────────────────────────────┘
```

#### Table Specifications
- **Row Height**: 56px
- **Column Widths**: Auto-fit with minimum widths
- **Sort Indicators**: Up/down arrows in headers
- **Hover State**: Light gray background
- **Selected State**: Darker gray background

---

## 5. Interaction Patterns

### 5.1 Navigation Patterns

#### Primary Navigation
- **Desktop**: Horizontal navigation bar with dropdown menus
- **Mobile**: Hamburger menu with slide-out drawer
- **Active State**: Black underline on current item
- **Hover State**: Gray underline on hover

#### Breadcrumb Navigation
```
Home > Governance > Daily Pulse > Monday Pulse
```
- **Separator**: ">" with spaces on both sides
- **Clickable**: All items except current page
- **Style**: Gray text, black on hover

#### Tab Navigation
- **Style**: Underline tabs with smooth transitions
- **Active State**: Black text with black underline
- **Hover State**: Gray text with gray underline
- **Animation**: 0.2s ease transition

### 5.2 Form Interactions

#### Input Field Focus
- **Border Color**: Changes to black
- **Box Shadow**: 0 0 0 3px rgba(0, 0, 0, 0.1)
- **Transition**: 0.2s ease
- **Label**: Moves up and shrinks (floating label pattern)

#### Validation Feedback
- **Real-time**: Validation on blur and change events
- **Error Animation**: Shake animation (0.3s)
- **Success Indicator**: Green checkmark
- **Error Message**: Red text below field

#### Submit Button States
- **Normal**: Black background, white text
- **Hover**: Darker black, slight elevation
- **Active**: Pressed down effect
- **Loading**: Spinner animation, disabled state
- **Disabled**: 50% opacity, no hover effect

### 5.3 Data Display Interactions

#### Table Sorting
- **Click**: Sort column ascending/descending
- **Indicator**: Arrow icon showing sort direction
- **Multi-sort**: Ctrl+click for secondary sort
- **Animation**: Smooth reordering of rows

#### Filtering
- **Dropdown**: Multi-select with checkboxes
- **Search**: Real-time filtering as user types
- **Clear All**: Button to reset all filters
- **Active Filters**: Visual pills with remove option

#### Pagination
- **Page Numbers**: Clickable page numbers
- **Previous/Next**: Arrow buttons
- **Disabled State**: Grayed out when at bounds
- **Jump to Page**: Input for direct navigation

---

## 6. Animation Specifications

### 6.1 Animation Principles

#### Timing Functions
```css
/* Standard Easing */
--ease-in: cubic-bezier(0.4, 0, 1, 1);
--ease-out: cubic-bezier(0, 0, 0.2, 1);
--ease-in-out: cubic-bezier(0.4, 0, 0.2, 1);

/* Duration Standards */
--duration-fast: 0.15s;
--duration-normal: 0.2s;
--duration-slow: 0.3s;
--duration-slower: 0.5s;
```

#### Animation Guidelines
- **Purposeful**: Animations should enhance understanding
- **Consistent**: Use same timing and easing throughout
- **Respectful**: Honor user's motion preferences
- **Performant**: Use transform and opacity for smooth animations

### 6.2 Specific Animations

#### Page Transitions
```css
.page-transition-enter {
  opacity: 0;
  transform: translateX(20px);
}

.page-transition-enter-active {
  opacity: 1;
  transform: translateX(0);
  transition: opacity var(--duration-normal) var(--ease-out),
              transform var(--duration-normal) var(--ease-out);
}

.page-transition-exit {
  opacity: 1;
  transform: translateX(0);
}

.page-transition-exit-active {
  opacity: 0;
  transform: translateX(-20px);
  transition: opacity var(--duration-normal) var(--ease-in),
              transform var(--duration-normal) var(--ease-in);
}
```

#### Modal Animations
```css
.modal-overlay-enter {
  opacity: 0;
}

.modal-overlay-enter-active {
  opacity: 1;
  transition: opacity var(--duration-normal) var(--ease-out);
}

.modal-enter {
  opacity: 0;
  transform: translateY(-20px) scale(0.95);
}

.modal-enter-active {
  opacity: 1;
  transform: translateY(0) scale(1);
  transition: opacity var(--duration-slow) var(--ease-out),
              transform var(--duration-slow) var(--ease-out);
}
```

#### Loading States
```css
@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.loading-spinner {
  animation: spin 1s linear infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

.loading-pulse {
  animation: pulse 1.5s ease-in-out infinite;
}
```

#### Hover Effects
```css
.hover-lift {
  transition: transform var(--duration-fast) var(--ease-out);
}

.hover-lift:hover {
  transform: translateY(-2px);
}

.hover-scale {
  transition: transform var(--duration-fast) var(--ease-out);
}

.hover-scale:hover {
  transform: scale(1.02);
}
```

---

## 7. Error and Empty States

### 7.1 Error States

#### Form Validation Errors
```css
.error-field {
  border-color: var(--color-error);
  animation: shake 0.3s ease-in-out;
}

@keyframes shake {
  0%, 100% { transform: translateX(0); }
  25% { transform: translateX(-5px); }
  75% { transform: translateX(5px); }
}

.error-message {
  color: var(--color-error);
  font-size: var(--text-sm);
  display: flex;
  align-items: center;
  gap: var(--space-1);
  margin-top: var(--space-1);
}

.error-icon {
  width: 16px;
  height: 16px;
  color: var(--color-error);
}
```

#### Network Error States
```
┌─────────────────────────────────────┐
│         ⚠️ Error                  │
│                                 │
│  Unable to connect to server      │
│  Please check your internet       │
│  connection and try again         │
│                                 │
│        [ Try Again ]             │
└─────────────────────────────────────┘
```

#### 404 Error States
```
┌─────────────────────────────────────┐
│         404                      │
│                                 │
│         Page Not Found           │
│                                 │
│  The page you're looking for     │
│  doesn't exist or has been      │
│  moved.                         │
│                                 │
│  [ Go Home ] [ Back ]           │
└─────────────────────────────────────┘
```

### 7.2 Empty States

#### Empty Data States
```
┌─────────────────────────────────────┐
│         📋 No Data               │
│                                 │
│  No risks have been added yet    │
│                                 │
│  Click "Add Risk" to create     │
│  your first risk entry           │
│                                 │
│        [ Add Risk ]             │
└─────────────────────────────────────┘
```

#### Search Results Empty
```
┌─────────────────────────────────────┐
│         🔍 No Results            │
│                                 │
│  No risks found matching         │
│  "search term"                  │
│                                 │
│  Try adjusting your search       │
│  or browse all risks            │
│                                 │
│  [ Clear Search ] [ All Risks ] │
└─────────────────────────────────────┘
```

#### Loading States
```
┌─────────────────────────────────────┐
│         ⏳ Loading               │
│                                 │
│  Loading data...                 │
│                                 │
│         [ Spinner ]              │
│                                 │
│  This should only take a moment  │
└─────────────────────────────────────┘
```

---

## 8. Responsive Design

### 8.1 Breakpoint Strategy

#### Mobile (0-639px)
- **Layout**: Single column, full-width elements
- **Navigation**: Hamburger menu, slide-out drawer
- **Typography**: Smaller base font size (14px)
- **Spacing**: Reduced spacing for smaller screens
- **Touch**: Larger touch targets (44px minimum)

#### Tablet (640-1023px)
- **Layout**: Two-column where appropriate
- **Navigation**: Horizontal navigation with dropdowns
- **Typography**: Base font size (16px)
- **Spacing**: Standard spacing scale
- **Touch**: Mixed touch and mouse interaction

#### Desktop (1024px+)
- **Layout**: Multi-column layouts, sidebars
- **Navigation**: Full horizontal navigation
- **Typography**: Larger font sizes for readability
- **Spacing**: Full spacing scale
- **Interaction**: Mouse-optimized interactions

### 8.2 Responsive Components

#### Responsive Grid
```css
.responsive-grid {
  display: grid;
  gap: var(--space-4);
  grid-template-columns: 1fr;
}

@media (min-width: 768px) {
  .responsive-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (min-width: 1024px) {
  .responsive-grid {
    grid-template-columns: repeat(3, 1fr);
  }
}
```

#### Responsive Typography
```css
.responsive-text {
  font-size: clamp(1rem, 2.5vw, 1.25rem);
  line-height: var(--leading-relaxed);
}

.responsive-heading {
  font-size: clamp(1.5rem, 4vw, 2rem);
  line-height: var(--leading-tight);
}
```

#### Responsive Images
```css
.responsive-image {
  width: 100%;
  height: auto;
  object-fit: cover;
  border-radius: var(--radius-lg);
}
```

---

## 9. Accessibility Guidelines

### 9.1 WCAG 2.1 AA Compliance

#### Color Contrast
- **Normal Text**: 4.5:1 contrast ratio minimum
- **Large Text**: 3:1 contrast ratio minimum
- **Interactive Elements**: 3:1 contrast ratio minimum
- **Color Independence**: Information not conveyed by color alone

#### Keyboard Navigation
- **Tab Order**: Logical tab order through interactive elements
- **Focus Indicators**: Visible focus outlines (2px minimum)
- **Skip Links**: Skip to main content and navigation
- **Keyboard Traps**: No keyboard traps in modals or forms

#### Screen Reader Support
- **Semantic HTML**: Proper use of headings, lists, and landmarks
- **ARIA Labels**: Descriptive labels for interactive elements
- **Live Regions**: Dynamic content announcements
- **Alt Text**: Descriptive alt text for images

### 9.2 Accessibility Implementation

#### Focus Management
```css
.focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: 2px;
}

.skip-link {
  position: absolute;
  top: -40px;
  left: 6px;
  background: var(--color-primary);
  color: var(--color-secondary);
  padding: 8px;
  text-decoration: none;
  border-radius: var(--radius-sm);
  z-index: 1000;
}

.skip-link:focus {
  top: 6px;
}
```

#### ARIA Attributes
```html
<!-- Form Labels -->
<label for="email">Email Address</label>
<input id="email" type="email" aria-required="true" aria-describedby="email-help">

<!-- Error Messages -->
<div id="email-error" role="alert" aria-live="polite">
  Please enter a valid email address
</div>

<!-- Navigation -->
<nav aria-label="Main navigation">
  <ul role="menubar">
    <li role="none">
      <a href="/dashboard" role="menuitem" aria-current="page">Dashboard</a>
    </li>
  </ul>
</nav>
```

#### Screen Reader Announcements
```javascript
// Announce dynamic content changes
const announceToScreenReader = (message) => {
  const announcement = document.createElement('div');
  announcement.setAttribute('role', 'status');
  announcement.setAttribute('aria-live', 'polite');
  announcement.className = 'sr-only';
  announcement.textContent = message;
  
  document.body.appendChild(announcement);
  
  setTimeout(() => {
    document.body.removeChild(announcement);
  }, 1000);
};
```

### 9.3 Motion Preferences

#### Reduced Motion Support
```css
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```

#### High Contrast Mode
```css
@media (prefers-contrast: high) {
  :root {
    --color-primary: #000000;
    --color-secondary: #FFFFFF;
    --color-gray-300: #666666;
    --color-gray-500: #333333;
  }
}
```

---

## Component Usage Guidelines

### Button Usage
- **Primary Actions**: Use `btn-primary` for main actions
- **Secondary Actions**: Use `btn-secondary` for alternative actions
- **Destructive Actions**: Use red styling only for destructive actions
- **Loading States**: Show spinner and disable during async operations

### Form Usage
- **Required Fields**: Mark with asterisk and validate
- **Help Text**: Provide contextual help for complex fields
- **Error Messages**: Be specific and helpful
- **Progress Indicators**: Show progress for multi-step forms

### Data Display
- **Tables**: Use for tabular data with proper headers
- **Cards**: Use for related information grouping
- **Lists**: Use for sequential information
- **Charts**: Use with proper labels and alternatives

This UI/UX Design Specification provides comprehensive guidelines for implementing a consistent, accessible, and professional user interface for the Ordin Core Governance SaaS Platform.
