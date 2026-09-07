// src/hooks/types.ts

export interface SESConfigPayload {
  aws_region: string;
  aws_access_key_id: string;
  aws_secret_access_key: string;
  ses_from_email: string;
  ses_login_url: string;
}

export interface SESConfigResponse {
  aws_region: string;
  aws_access_key_id: string;
  ses_from_email: string;
  ses_login_url: string;
}

export interface GoogleCredentialPayload {
  credential_name: string;
  organization_id?: string;
  user_id?: string;
  credentials_json: string;
  is_default: boolean;
  delegated_admin_email?: string;
  subject_email?: string;
  scopes?: string[];
}

export interface GoogleCredentialResponse {
  id: number;
  credential_name: string;
  client_email: string;
  project_id: string;
  is_default: boolean;
  is_active: boolean;
  created_at: string;
}

export interface Admin {
  id: string;
  email: string;
  full_name: string;
  role: "hr" | "interviewer";
  department: string;
  designation: string;
  phone_number: string;
  is_active: boolean;
  last_login: string | null;
  created_at: string;
}

export interface AdminsResponse {
  admins: Admin[];
}

export interface CreateAdminPayload {
  email: string;
  password: string;
  full_name: string;
  role: "hr" | "interviewer";
  department?: string;
  designation?: string;
  phone_number?: string;
}

export interface UpdateAdminPayload {
  full_name?: string;
  department?: string;
  designation?: string;
  phone_number?: string;
}

export interface ResetPasswordPayload {
  new_password: string;
}

export interface SessionFeedback {
  id: number;
  interviewer_id: string | null;
  technical_skills_score: number | null;
  communication_score: number | null;
  problem_solving_score: number | null;
  cultural_fit_score: number | null;
  overall_score: number | null;
  comments: string | null;
  recommendation: string | null;
  created_at: string;
}

export interface InterviewSessionWithFeedback {
  id: number;
  session_id: string;
  candidate_id: string;
  application_id: string | null;
  interviewer_id: string | null;
  position: string;
  interview_type: string;
  interview_url: string;
  scheduled_at: string;
  scheduled_duration: number;
  status: string;
  created_at: string;
  started_at: string | null;
  ended_at: string | null;
  metadata: string;
  is_upcoming: boolean;
  feedback: SessionFeedback | null;
}

export interface ApplicationInterviewFeedbackResponse {
  application_id: string;
  total: number;
  data: InterviewSessionWithFeedback[];
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface TokenCredentials {
  token: string;
}

export interface AdminUser {
  id: string;
  email: string;
  full_name: string;
  role: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface LoginResponse {
  id: string;
  email: string;
  full_name: string;
  role: string;
  token: string;
}

export interface Candidate {
  id: string;
  email: string;
  full_name: string;
  phone_number?: string;
  resume_url?: string;
  github_url?: string;
  skills?: string;
  experience_years?: number;
  is_online?: boolean;
  is_active: boolean;
  onboarding_complete: boolean;
  created_at: string;
  updated_at: string;
}

export interface PaginatedResponse {
  data: Candidate[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
}

export interface CandidateQueryParams {
  page: number;
  limit: number;
  search: string;
  filter?: string;
}

export interface UpdateCandidatePayload {
  full_name?: string;
  is_active?: boolean;
  password?: string;
}

export interface ActiveUsersResponse {
  active_users: string[];
  count: number;
}

export interface UploadResponse {
  count: number;
  data: any[];
  success: boolean;
}

export interface InterviewItem {
  session_id: string;
  scheduled_at: string;
  status: string;
  candidate_name: string;
  interviewer_name: string;
  position: string;
  candidate_id: string;
}

export interface Pipeline {
  applied?: number;
  screening?: number;
  interviewing?: number;
  offered?: number;
  hired?: number;
  rejected?: number;
  withdrawn?: number;
}

export interface DashboardStats {
  total_candidates?: number;
  open_positions?: number;
  active_interviews?: number;
  upcoming_interviews?: number;
  applications_today?: number;
  pipeline?: Pipeline;
  high_risk_sessions?: number;
  upcoming_list?: InterviewItem[];

  // superadmin only
  total_admins?: number;
  email_pending?: number;
  email_failed_today?: number;
  suspicious_processes_today?: number;

  // interviewer only
  total_interviews_assigned?: number;
}

export interface SendCustomEmailPayload {
  to_email: string;
  candidate_name: string;
  subject: string;
  message: string;
}

export interface HiringPosition {
  id: string;
  position_title: string;
  department: string;
  location: string;
  employment_type: string;
  experience_required: string;
  salary_range_min: number;
  salary_range_max: number;
  salary_range_text: string;
  number_of_openings: number;
  job_description: string;
  requirements: string;
  status: "active" | "inactive";
  is_active: boolean;
  created_at: string;
  updated_at: string;
  created_by?: string;
  updated_by?: string;
}

export interface PaginatedPositionResponse {
  data: HiringPosition[];
  limit: number;
  page: number;
  total: number;
  total_pages: number;
}

export interface PositionFilters {
  search?: string;
  status?: "active" | "inactive";
  department?: string;
  location?: string;
  is_active?: boolean;
  page?: number;
  limit?: number;
}

export interface CreatePositionPayload {
  position_title: string;
  department: string;
  location: string;
  employment_type: string;
  experience_required: string;
  salary_range_min: number;
  salary_range_max: number;
  salary_range_text: string;
  number_of_openings: number;
  job_description: string;
  requirements: string;
}

export type UpdatePositionPayload = Partial<CreatePositionPayload> & {
  status?: "active" | "inactive";
};

export interface ImportCandidate {
  full_name: string;
  email: string;
  password: string;
}

export interface ImportResult {
  success: boolean;
  total_parsed: number;
  inserted: number;
  skipped: number;
  emails_sent: number;
  failed_count: number;
  failed_emails: { email: string; error: string }[];
  timestamp: string;
}

export interface InterviewSessionDetails {
  id: number;
  session_id: string;
  candidate_id: string;
  application_id: string | null;
  interviewer_id: string | null;
  position: string;
  interview_type: string;
  interview_url: string;
  scheduled_at: string;
  scheduled_duration: number;
  status: string;
  created_at: string;
  started_at: string | null;
  ended_at: string | null;
  metadata: string;
  feedback: InterviewFeedbackDetails | null;
}

export interface InterviewFeedbackDetails {
  id: number;
  interviewer_id: string | null;
  technical_skills_score: number | null;
  communication_score: number | null;
  problem_solving_score: number | null;
  cultural_fit_score: number | null;
  overall_score: number | null;
  comments: string | null;
  recommendation: string | null;
  created_at: string;
}

export interface InterviewSessionDetailsResponse {
  data: InterviewSessionDetails;
}

export interface Interview {
  id: string;
  candidate_id: string;
  candidate_name: string;
  interview_type: string;
  scheduled_date: string;
  scheduled_time: string;
  status: "scheduled" | "in-progress" | "completed" | "cancelled";
}

export interface InterviewSession {
  id: number;
  session_id: string;
  candidate_id: string;
  application_id: string | null;
  interviewer_id: string | null;
  position: string;
  interview_type: string;
  interview_url: string;
  scheduled_at: string;
  scheduled_duration: number;
  status: string;
  created_at: string;
  metadata: string;
  is_upcoming: boolean;
}

export interface InterviewSessionsResponse {
  data: InterviewSession[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
  filter: string;
}

export interface InterviewSessionsParams {
  candidate_id?: string;
  application_id?: string;
  filter?: "all" | "upcoming" | "past";
  status?: string;
  page?: number;
  limit?: number;
}

export interface StartEndInterviewResponse {
  id: number;
  session_id: string;
  started_at?: string;
  ended_at?: string;
  status: string;
  updated_at: string;
}

export interface CandidateApplication {
  application_id: string;
  application_status: string;
  applied_at: string;
  position_id: string;
  position_title: string;
  candidate_name: string;
  candidate_email: string;
  interview_url?: string;
}

export interface CandidateApplicationsResponse {
  candidate_id: string;
  data: CandidateApplication[];
  total: number;
}

export interface CreateInterviewPayload {
  candidate_id: string;
  application_id: string;
  interviewer_id: string;
  position: string;
  interview_type: string;
  scheduled_at: string;
  scheduled_duration: number;
  interview_url: string;
  timezone: string;
}
export interface SendCustomEmailPayload {
  to_email: string;
  candidate_name: string;
  subject: string;
  message: string;
}

export interface CreateInterviewFeedbackPayload {
  interview_session_id: string;
  technical_skills_score: number;
  communication_score: number;
  problem_solving_score: number;
  cultural_fit_score: number;
  comments?: string;
  recommendation?: string;
}

export interface InterviewFeedback {
  id: number;
  interview_session_id: number;
  interviewer_id: string;
  technical_skills_score: number;
  communication_score: number;
  problem_solving_score: number;
  cultural_fit_score: number;
  overall_score: number;
  comments: string;
  recommendation: string;
  created_at: string;
  updated_at: string;
}

export interface Interviewer {
  interviewer_id: string;
  email: string;
  full_name: string;
}

export interface InterviewersResponse {
  interviewers: Interviewer[];
}

export interface InterviewSessionStatusResponse {
  session_id: string;
  status: string;
}

export type ApplicationStatus =
  | "applied"
  | "screening"
  | "interviewing"
  | "offered"
  | "hired"
  | "rejected"
  | "withdrawn";

export interface JobApplicationStatusResponse {
  application_id: string;
  status: ApplicationStatus;
}

export interface JobApplication {
  id: string;
  candidate_id: string;
  candidate_email: string;
  candidate_name: string;
  candidate_phone: string;
  resume_url: string;
  skills: string;
  experience_years: number;
  position_id: string;
  position_title: string;
  department: string;
  location: string;
  status: ApplicationStatus;
  cover_letter: string;
  notes: string;
  applied_at: string;
  updated_at: string;
  overall_score?: number;
  overall_tier?: string;
  assignment_overall_score?: number;
  assignment_overall_tier?: string;
  is_shortlisted?: boolean;
  github_invite_status?: string;
  github_repo_url?: string;
}
export interface PositionDetails {
  id: string;
  title: string;
  department: string;
  location: string;
  status: string;
}

export interface StatusBreakdown {
  applied?: number;
  screening?: number;
  interviewing?: number;
  offered?: number;
  hired?: number;
  rejected?: number;
  withdrawn?: number;
}

export interface ApplicationStatistics {
  total_applications: number;
  status_breakdown: StatusBreakdown;
}

export interface Pagination {
  current_page: number;
  per_page: number;
  total_count: number;
  total_pages: number;
  has_next: boolean;
  has_prev: boolean;
}

export type SortBy = "applied_at" | "updated_at" | "candidate_name" | "position_title" | "status";

export type SortOrder = "asc" | "desc";

export interface JobApplicationsFilters {
  status?: ApplicationStatus;
  position_id?: string;
  candidate_id?: string;
  department?: string;
  page?: number;
  limit?: number;
  sort_by?: SortBy;
  sort_order?: SortOrder;
  include_position?: boolean;
  include_stats?: boolean;
}

export interface JobApplicationsResponse {
  applications: JobApplication[];
  filters: {
    status: string;
    position_id: string;
    candidate_id: string;
    department: string;
  };
  pagination: Pagination;
  sort: {
    sort_by: string;
    sort_order: string;
  };
  position?: PositionDetails;
  statistics?: ApplicationStatistics;
}

export interface UpdateApplicationStatusPayload {
  status: ApplicationStatus;
  notes?: string;
}

export interface Language {
  id: string;
  name: string;
  example: string;
}

export interface LanguagesResponse {
  languages: Language[];
}

export interface Submission {
  id: string;
  language: string;
  code: string;
  stdout: string;
  stderr: string;
  exit_code: number;
  time_ms: number;
  memory_kb: number;
  status: "accepted" | "error" | "timeout";
  created_at: string;
}

export interface ExecuteRequest {
  language: string;
  code_b64: string;
}

export interface UseSSEOptions<T> {
  path?: string;
  type: string;
  handler: (payload: T) => void;
  enabled?: boolean;
}


export interface SendEmailPayload {
  email_type: "start" | "reminder";
}

export interface SendEmailResponse {
  message: string;
  session_id: string;
  email_type: string;
}


export interface TwilioConfigResponse {
  account_sid: string;
  api_key_sid: string;
  twiml_app_sid: string;
  from_number: string;
}

export interface SaveTwilioConfigPayload {
  account_sid: string;
  api_key_sid: string;
  api_key_secret: string;
  twiml_app_sid: string;
  from_number: string;
}


export interface LiveKitConfigResponse {
  id: number;
  host: string;
  api_key: string;
  api_secret: string;
  is_active: boolean;
}

export interface SaveLiveKitConfigPayload {
  host: string;
  api_key: string;
  api_secret: string;
}

export interface LiveKitConfigForm {
  host: string;
  apiKey: string;
  apiSecret: string;
}


export interface AIProviderConfigResponse {
  provider: "openai" | "gemini" | "claude";
  model: string;
  base_url?: string;
  is_active: boolean;
}

export interface SaveAIProviderConfigPayload {
  provider: "openai" | "gemini" | "claude";
  api_key: string;
  model: string;
  base_url?: string;
}

export interface AIProviderConfigForm {
  apiKey: string;
  model: string;
  baseUrl: string;
}



export interface GithubConfigResponse {
  configured: boolean;
  org_name?: string;
  has_token?: boolean;
  updated_at?: string;
}

export interface SaveGithubCredentialsPayload {
  org_name: string;
  token: string;
}



export type InterviewRecommendation = "hire" | "consider" | "no_hire";


export interface InterviewFeedbackDetail {
  id: number;
  interviewer_id: string | null;
  technical_skills_score: number | null;
  communication_score: number | null;
  problem_solving_score: number | null;
  cultural_fit_score: number | null;
  overall_score: number | null;
  comments: string | null;
  recommendation: InterviewRecommendation | null;
  created_at: string;
  updated_at?: string;
}



export interface CreateInterviewFeedbackResponse {
  id: number;
  interview_session_id: number;
  interviewer_id: string;
  technical_skills_score: number;
  communication_score: number;
  problem_solving_score: number;
  cultural_fit_score: number;
  overall_score: number;
  comments: string | null;
  recommendation: InterviewRecommendation | null;
  created_at: string;
  updated_at: string;
}

export interface InterviewFeedbackListResponse {
  application_id: string;
  total: number;
  data: InterviewSessionWithFeedback[]; 
}