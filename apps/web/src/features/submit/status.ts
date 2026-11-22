// Words for where a submission stands.

const LABELS: Record<string, string> = {
  draft: "Draft",
  submitted: "In review",
  changes_requested: "Changes requested",
  approved: "Published",
  rejected: "Not accepted",
  withdrawn: "Withdrawn",
};

/** The label for a submission status; an unknown status is shown as it is. */
export const statusLabel = (status: string) => LABELS[status] ?? status;
