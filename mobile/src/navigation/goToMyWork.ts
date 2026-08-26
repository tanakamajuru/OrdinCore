/**
 * navigation/goToMyWork.ts
 * Routes a "My Work" / "requires your attention" row to the right screen inside
 * the current role's navigator, keyed by the my-work item key the API returns
 * (signals, escalations, actions, effectiveness, weekly, post_escalation_review).
 * Every navigate() is wrapped so an unknown route can never crash a tap.
 */
export function goToMyWork(navigation: any, role: string, key: string) {
  const nav = (name: string, params?: any) => {
    try {
      navigation.navigate(name as never, params as never);
    } catch {
      /* unknown route for this role — no-op rather than crash */
    }
  };

  switch (role) {
    case 'REGISTERED_MANAGER':
      switch (key) {
        case 'signals':
        case 'effectiveness':
          return nav('Risks');
        case 'escalations':
        case 'post_escalation_review':
          return nav('Escalations');
        case 'actions':
          return nav('Actions');
        case 'weekly':
          return nav('Actions', { screen: 'WeeklyGovernance' });
        default:
          return;
      }

    case 'TEAM_LEADER':
      switch (key) {
        case 'signals':
          return nav('Signals');
        case 'escalations':
        case 'post_escalation_review':
          return nav('Escalations');
        case 'actions':
          return nav('Actions');
        case 'weekly':
          return nav('Today', { screen: 'GovernanceBrief' });
        default:
          return;
      }

    case 'DIRECTOR':
      switch (key) {
        case 'actions':
          return nav('MyWork');
        case 'signals':
        case 'effectiveness':
        case 'escalations':
        case 'post_escalation_review':
          return nav('Governance');
        default:
          return nav('MyWork');
      }

    case 'RESPONSIBLE_INDIVIDUAL':
      switch (key) {
        case 'actions':
          return nav('MyWork');
        case 'signals':
        case 'effectiveness':
        case 'escalations':
        case 'post_escalation_review':
          return nav('Oversight');
        default:
          return nav('MyWork');
      }

    default:
      return;
  }
}
