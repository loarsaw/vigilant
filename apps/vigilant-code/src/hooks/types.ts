import { SandpackTemplateType } from "@/types/types";
import { Room, ConnectionState } from "livekit-client";

export interface LoginCredentials {
  username: string;
  password: string;
}

export interface AuthUser {
  candidate_id: number;
  email: string;
  full_name: string;
  session_id: number;
  onboarding_complete: boolean;
}

export interface LoginResponse {
  candidate_id: number;
  email: string;
  expires_at: string;
  full_name: string;
  logged_in_at: string;
  session_id: number;
  token: string;
  onboarding_complete: boolean;
}

export interface SetupStatus {
  assigned: boolean;
  setupPath?: string;
}

export interface HiringPosition {
  id: string;
  position_title: string;
  department: string;
  location: string;
  employment_type: string;
  experience_required: string;
  salary_range_min: number | null;
  salary_range_max: number | null;
  salary_range_text: string;
  number_of_openings: number;
  job_description: string;
  requirements: string;
  status: "active" | "inactive";
  is_active: boolean;
  created_at: string;
  updated_at: string;
  application_id?: string;
  application_status?:
  | "applied"
  | "screening"
  | "interviewing"
  | "offered"
  | "hired"
  | "rejected"
  | "withdrawn";
  applied_at?: string;
  interview?: {
    scheduled_at: string;
    interview_url: string;
    status: string;
  };
}

export interface PaginatedPositionResponse {
  data: HiringPosition[];
  limit: number;
  page: number;
  total: number;
  total_pages: number;
}

export interface PositionFilters {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  department?: string;
  location?: string;
  is_active?: boolean;
}

export interface CreateJobApplicationPayload {
  cover_letter?: string;
}

export interface JobApplication {
  id: string;
  candidate_id: string;
  position_id: string;
  status: "applied" | "screening" | "interviewing" | "offered" | "hired" | "rejected" | "withdrawn";
  applied_at: string;
  updated_at: string;
  cover_letter?: string;
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

export interface OnboardingPayload {
  phone_number: string;
  github_id: string;
  resume_link: string;
  skills: string[];
  experience_years: number;
}

// export interface CreateInterviewResponse {
//   id: number;
//   session_id: string;
//   candidate_id: string;
//   candidate_session_id: string;
//   status: string;
//   created_at: string;
// }

export interface SessionResponse {
  session_id: string;
}

export interface SessionAuthUser {
  candidate_id: number;
  email: string;
  full_name: string;
  session_id: string;
}

export interface ProcessPayload {
  pid: number;
  name: string;
  isElectron: boolean;
  isUnknown: boolean;
  memory: number;
  commnad: string;
}

export interface ProcessReportPayload {
  session_id: string;
  processes: ProcessPayload[];
}

export interface UseSSEOptions<T> {
  path?: string;
  type: string;
  handler: (payload: T) => void;
  enabled?: boolean;
}

export interface LoadedTemplate {
  files: Record<string, string>;
  template: SandpackTemplateType;
}

export interface UseTemplateLoaderResult {
  data: LoadedTemplate | null;
  loading: boolean;
  error: string | null;
}

export interface CandidateProfile {
  id: string;
  email: string;
  full_name: string;
  resume_url: string;
  github_url: string;
  skills: string;
  phone_number: string;
  experience_years: number;
  is_active: boolean;
  onboarding_complete: boolean;
  last_login: string;
  created_at: string;
  updated_at: string;
}

export interface UpdateProfilePayload {
  full_name?: string;
  github_url?: string;
  phone_number?: string;
  resume_url?: string;
  skills?: string;
  experience_years?: number;
}

export interface InterviewSessionResponse {
  // interview_id: string;
  session_id: string;
}

export interface Process {
  pid: number;
  name: string;
  cmd: string;
  memory: number;
  category: string;
  confidence?: number;
  username: string;
  isGuiApp?: boolean;
  path?: string;
}

export interface PayloadProcess {
  pid: number;
  name: string;
  isElectron: boolean;
  isUnknown: boolean;
  memory: number;
  commnad: string;
}


export interface InterviewCallContextValue {
  room: Room;
  connectionState: ConnectionState;
  disconnect: () => void;
  reconnect: () => void;
  roomPath: string | null;
}