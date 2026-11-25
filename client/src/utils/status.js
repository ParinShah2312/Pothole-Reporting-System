// Report statuses (IMPLEMENTATION_PLAN Appendix B) with display labels and map colours.
export const STATUS = {
  pending_verification: { label: 'Pending verification', color: '#7a8594' },
  under_review: { label: 'Under review', color: '#b7791f' },
  rejected: { label: 'Rejected', color: '#8c3b3b' },
  active: { label: 'Active', color: '#d64545' },
  assigned: { label: 'Assigned', color: '#dd6b20' },
  in_progress: { label: 'Repair in progress', color: '#d69e2e' },
  repair_completed: { label: 'Repair completed', color: '#3182ce' },
  solved: { label: 'Solved', color: '#2f855a' },
};

// Statuses shown on public / government maps (verified reports only)
export const MAP_STATUSES = ['active', 'assigned', 'in_progress', 'repair_completed', 'solved'];

export const statusLabel = (s) => STATUS[s]?.label ?? s;
export const statusColor = (s) => STATUS[s]?.color ?? '#7a8594';
