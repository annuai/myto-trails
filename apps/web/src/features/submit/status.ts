const LABELS: Record<string, string> = {
  draft: "Draft",
  submitted: "In review",
  changes_requested: "Changes requested",
  approved: "Published",
  rejected: "Not accepted",
  withdrawn: "Withdrawn",
};

export const statusLabel = (status: string) => LABELS[status] ?? status;
