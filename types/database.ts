export type ApplicationStatus = "New" | "Ready" | "Applied" | "Interview" | "Rejected";
export type JobSource = "Manual" | "SEEK" | "LinkedIn" | "Adzuna" | "Other";
export type GeneratedDocumentType = "tailored_resume" | "cover_letter";
export type GeneratedDocumentFormat = "markdown" | "docx" | "pdf";
export type OrganizationStatus = "active" | "inactive";
export type OrganizationMemberRole = "owner" | "admin" | "employee";
export type EntitlementPlanType = "free" | "sprint_7_day" | "focus_30_day" | "partner_90_day" | "enterprise_90_day";
export type EntitlementStatus = "active" | "expired" | "revoked";
export type EnterpriseRequestStatus = "new" | "contacted" | "approved" | "rejected";
export type EnterpriseInvitationStatus = "pending" | "accepted" | "revoked" | "expired";

export type Profile = {
  id: string;
  name: string;
  email: string;
  phone: string;
  location: string;
  linkedin_url: string;
  target_job_titles: string[];
  preferred_industries: string[];
  salary_range: string;
  preferred_locations: string[];
  avatar_url: string;
  avatar_storage_path: string;
  created_at: string;
  updated_at: string;
};

export type MasterResume = {
  id: string;
  user_id: string;
  file_name: string | null;
  storage_path: string | null;
  resume_text: string;
  created_at: string;
  updated_at: string;
};

export type MasterCoverLetter = {
  id: string;
  user_id: string;
  file_name: string | null;
  storage_path: string | null;
  cover_letter_text: string;
  created_at: string;
  updated_at: string;
};

export type Job = {
  id: string;
  user_id: string;
  title: string;
  company: string;
  location: string;
  salary: string;
  job_url: string;
  description: string;
  source: JobSource;
  created_at: string;
  updated_at: string;
};

export type CachedGrabbedJob = {
  id: string;
  user_id: string;
  external_id: string;
  title: string;
  company: string;
  location: string;
  salary: string;
  salary_min: number | null;
  salary_max: number | null;
  job_url: string;
  description: string;
  match_score: number;
  match_reason: string;
  posted_at: string | null;
  search_query: string;
  source: string;
  fetched_at: string;
  created_at: string;
  updated_at: string;
};

export type Organization = {
  id: string;
  name: string;
  status: OrganizationStatus;
  seat_limit: number;
  created_at: string;
  updated_at: string;
};

export type OrganizationMember = {
  id: string;
  organization_id: string;
  user_id: string;
  role: OrganizationMemberRole;
  created_at: string;
};

export type Entitlement = {
  id: string;
  user_id: string;
  organization_id: string | null;
  plan_type: EntitlementPlanType;
  application_limit: number;
  applications_used: number;
  valid_from: string;
  valid_until: string;
  status: EntitlementStatus;
  created_at: string;
  updated_at: string;
};

export type EnterpriseRequest = {
  id: string;
  company_name: string;
  contact_name: string;
  contact_email: string;
  contact_role: string | null;
  requested_seats: number;
  expected_start_timeframe: string | null;
  notes: string | null;
  status: EnterpriseRequestStatus;
  created_at: string;
  updated_at: string;
};

export type EnterpriseInvitation = {
  id: string;
  organization_id: string;
  email: string;
  role: OrganizationMemberRole;
  status: EnterpriseInvitationStatus;
  invited_by: string | null;
  accepted_by: string | null;
  expires_at: string;
  accepted_at: string | null;
  created_at: string;
  updated_at: string;
};

export type Application = {
  id: string;
  user_id: string;
  job_id: string;
  status: ApplicationStatus;
  match_score: number | null;
  match_explanation: string | null;
  missing_keywords: string[];
  tailored_resume: string | null;
  cover_letter: string | null;
  generated_by: string | null;
  generated_at: string | null;
  applied_at: string | null;
  notes: string | null;
  hiring_manager: string | null;
  location_type: string | null;
  role_summary: string | null;
  other_notes: string | null;
  created_at: string;
  updated_at: string;
};

export type ApplicationWithJob = Application & {
  jobs: Job | null;
};
