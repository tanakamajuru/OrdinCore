// Support Worker nested stacks — kept inside their tabs so the bottom bar stays visible
// on the detail/timeline/raise screens (matching the mobile comp).
export type SWSignalsStackParams = {
  SWSignals: undefined;
  SWRaiseSignal: undefined;
  SWSignalDetail: { id: string };
  SWSignalTimeline: { id: string };
  SWSignalUpdate: { id: string; current?: string };
};

export type SWActionsStackParams = {
  SWActions: undefined;
  ActionDetail: { action: any };
};

export type RootStackParams = {
  Tabs: undefined;
  // Team Leader screens reached from the tab hub
  TLEscalations: undefined;
  TLDocuments: undefined;
  TLNotes: undefined;
  TLMyActions: undefined;
  TLDailyReview: undefined;
  TLTeamOverview: undefined;
  // Registered Manager hub screens
  RMEscalations: undefined;
  RMGovernanceReview: undefined;
  RMHouseOverview: undefined;
  RMCompliance: undefined;
  RMMyActions: undefined;
  // Director hub screens
  DirectorGovernance: undefined;
  DirectorReports: undefined;
  // Responsible Individual hub screens
  RINarrative: undefined;
  RIBoardReports: undefined;
  RaiseSignal: undefined;
  SignalDetail: { id: string };
  RiskDetail: { risk?: any; id?: string };
  ReportDetail: { type: string; title: string };
  SWEscalations: undefined;
  Promote: { cluster: any };
  CloseRisk: { risk: { id: string; title?: string } };
  ValidateReview: { review: any };
  Profile: undefined;
  MyWork: undefined;
  RateEffectiveness: { action: { id: string; risk_id?: string; title: string } };
  ActionDetail: { action: any };
};
