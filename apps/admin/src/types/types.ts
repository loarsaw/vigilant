export interface AppUsage {
  name: string;
  duration: number;
  usageCount: number;
  lastUsed: string;
}

export interface CandidateHistory {
  joinedAt: string;
  interviewStartedAt?: string;
  interviewEndedAt?: string;
  leftAt?: string;
}

export type CandidateLevel = 'Junior' | 'Intern' | 'Senior';
export type Framework = 'React' | 'Nextjs' | 'Vue';
export type TestStatus = 'DSA' | 'React' | 'Nextjs' | 'pending';

export interface CandidateData {
  id: string;
  email: string;
  password: string;
  interviewConducted: boolean;
  shortlisted: boolean;
  createdBy: string;
  createdAt: string;
  confidenceScore: number;
  appsUsed: AppUsage[];
  history: CandidateHistory;
  level: CandidateLevel;
  testStatus: TestStatus;
  framework: Framework;
  frameworkTasks: string;
  loggedInTime: string;
  sessionStartTime?: string;
  runningProcesses: string[];
}
