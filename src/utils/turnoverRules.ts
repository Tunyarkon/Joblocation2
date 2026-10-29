// Single source of truth for Turnover (T/O) gate rules.
// Used by BOTH the Turnover Workspace (Sign / Punch List tabs) and the T/O Dashboard
// so that an action in the Workspace is reflected identically on the Dashboard.

export interface PunchLike {
  status?: string;
  punchStatus?: string;
  isContractorClosed?: boolean;
  isVerified?: boolean;
  category?: string;
}

export interface JobLike {
  signatures?: { decision: string }[];
  punchList?: PunchLike[];
  acceptanceStatus?: string;
}

export type AcceptanceState = 'Pending' | 'Accepted' | 'Not Accepted' | 'Pending Re-Accept';

/** A punch is closed when cancelled, closed/resolved, or closed by Contractor AND verified by Job Lead. */
export const isPunchItemOpen = (p: PunchLike): boolean => {
  if (
    p.punchStatus === 'Closed' ||
    p.punchStatus === 'Cancel' ||
    p.status === 'Resolved' ||
    p.status === 'Closed' ||
    p.status === 'Cancel' ||
    (p.isContractorClosed && p.isVerified)
  ) {
    return false;
  }
  return true;
};

/** Acceptance state of a job, as decided on the Sign tab. */
export const getAcceptanceStatus = (job: JobLike): AcceptanceState => {
  if (job.acceptanceStatus) return job.acceptanceStatus as AcceptanceState;
  if (!job.signatures || job.signatures.length === 0) return 'Pending';
  const lastSig = job.signatures[job.signatures.length - 1];
  if (lastSig.decision === 'Accept') return 'Accepted';
  const punches = job.punchList || [];
  if (punches.length > 0 && punches.every(p => !isPunchItemOpen(p))) return 'Pending Re-Accept';
  return 'Not Accepted';
};
