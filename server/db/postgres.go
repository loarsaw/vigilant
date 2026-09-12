package db

import (
	"database/sql"
	"fmt"
	"log"

	"vigilant/config"

	_ "github.com/lib/pq"
)

var DB *sql.DB

func InitDB(cfg *config.Config) (*sql.DB, error) {
	dsn := cfg.GetDSN()

	db, err := sql.Open("postgres", dsn)
	if err != nil {
		return nil, fmt.Errorf("failed to open database: %w", err)
	}

	if err := db.Ping(); err != nil {
		return nil, fmt.Errorf("failed to ping database: %w", err)
	}

	_, err = db.Exec("SET TIME ZONE 'UTC'")
	if err != nil {
		return nil, fmt.Errorf("failed to set time zone to UTC: %w", err)
	}

	db.SetMaxOpenConns(25)
	db.SetMaxIdleConns(25)

	log.Println("✅ Database connection established and set to UTC")

	DB = db
	return db, nil
}

func RunMigrations(db *sql.DB) error {
	log.Println("Running database migrations...")

	migrations := []string{
		// ========================================
		// MIGRATION 1: Enable pgcrypto extension
		// Enables gen_random_uuid() for UUID generation
		// ========================================
		`CREATE EXTENSION IF NOT EXISTS pgcrypto`,

		// ========================================
		// MIGRATION 2: Administrators table
		// HR/interviewer user accounts. Must be created first for
		// foreign key references from almost every other table.
		// ========================================
		`CREATE TABLE IF NOT EXISTS administrators (
			id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
			email VARCHAR(255) UNIQUE NOT NULL,
			password_hash VARCHAR(255) NOT NULL,
			full_name VARCHAR(255) NOT NULL,
			phone_number VARCHAR(512),

			role VARCHAR(50) NOT NULL DEFAULT 'interviewer',
			-- 'hr' → can create sessions, assign interviewers, move application stages
			-- 'interviewer' → can only view and conduct assigned sessions

			department VARCHAR(255),
			designation VARCHAR(255),

			is_active BOOLEAN DEFAULT TRUE,
			last_login TIMESTAMPTZ,

			created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
			updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
			created_by UUID REFERENCES administrators(id) ON DELETE SET NULL
		)`,
		`CREATE INDEX IF NOT EXISTS idx_administrators_email ON administrators(email)`,
		`CREATE INDEX IF NOT EXISTS idx_administrators_role ON administrators(role)`,
		`CREATE INDEX IF NOT EXISTS idx_administrators_is_active ON administrators(is_active)`,

		// ========================================
		// MIGRATION 3: Administrators updated_at trigger
		// ========================================
		`CREATE OR REPLACE FUNCTION update_administrators_updated_at()
		RETURNS TRIGGER AS $$
		BEGIN
			NEW.updated_at = CURRENT_TIMESTAMP;
			RETURN NEW;
		END;
		$$ LANGUAGE plpgsql`,
		`DROP TRIGGER IF EXISTS administrators_updated_at_trigger ON administrators`,
		`CREATE TRIGGER administrators_updated_at_trigger
			BEFORE UPDATE ON administrators
			FOR EACH ROW
			EXECUTE FUNCTION update_administrators_updated_at()`,

		// ========================================
		// MIGRATION 4: Candidates table
		// Primary user table for job applicants
		// ========================================
		`CREATE TABLE IF NOT EXISTS candidates (
		id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
		email VARCHAR(255) UNIQUE NOT NULL,
		full_name VARCHAR(255),
		phone_number VARCHAR(512),

		is_active BOOLEAN DEFAULT TRUE,
		onboarding_complete BOOLEAN DEFAULT FALSE,
		last_login TIMESTAMPTZ,

		created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
		updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
	);`,

		`CREATE INDEX IF NOT EXISTS idx_candidates_email ON candidates(email);`,
		`CREATE INDEX IF NOT EXISTS idx_candidates_created ON candidates(created_at DESC);`,
		`CREATE INDEX IF NOT EXISTS idx_candidates_is_active ON candidates(is_active);`,

		// ========================================
		// MIGRATION 5: Candidates updated_at trigger
		// ========================================
		`CREATE OR REPLACE FUNCTION update_candidates_updated_at()
		RETURNS TRIGGER AS $$
		BEGIN
			NEW.updated_at = CURRENT_TIMESTAMP;
			RETURN NEW;
		END;
		$$ LANGUAGE plpgsql`,
		`DROP TRIGGER IF EXISTS candidates_updated_at_trigger ON candidates`,
		`CREATE TRIGGER candidates_updated_at_trigger
			BEFORE UPDATE ON candidates
			FOR EACH ROW
			EXECUTE FUNCTION update_candidates_updated_at()`,

		// ========================================
		// MIGRATION 6: Candidate sessions table
		// Tracks login sessions with device/location info
		// ========================================
		`CREATE TABLE IF NOT EXISTS candidate_sessions (
			id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
			candidate_id UUID NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
			session_token TEXT UNIQUE NOT NULL,

			logged_in_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
			logged_out_at TIMESTAMPTZ,
			last_activity TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,

			system_type VARCHAR(50),
			os_version VARCHAR(100),
			ip_address INET,
			user_agent TEXT,
			country VARCHAR(100),
			city VARCHAR(100),

			is_active BOOLEAN DEFAULT TRUE,
			created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
		)`,
		`CREATE INDEX IF NOT EXISTS idx_sessions_candidate ON candidate_sessions(candidate_id)`,
		`CREATE INDEX IF NOT EXISTS idx_sessions_token ON candidate_sessions(session_token)`,
		`CREATE INDEX IF NOT EXISTS idx_sessions_active ON candidate_sessions(is_active, logged_in_at DESC)`,
		`CREATE INDEX IF NOT EXISTS idx_sessions_ip ON candidate_sessions(ip_address)`,

		// ========================================
		// MIGRATION 7: Hiring positions table
		// Job postings with salary and requirements
		// ========================================
		`CREATE TABLE IF NOT EXISTS hiring_positions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    position_title VARCHAR(255) NOT NULL,
    department VARCHAR(255) NOT NULL,
    location VARCHAR(255) NOT NULL,
    employment_type VARCHAR(50) NOT NULL,
    experience_required VARCHAR(100) NOT NULL,

    salary_range_min INTEGER,
    salary_range_max INTEGER,
    salary_range_text VARCHAR(100),
    number_of_openings INTEGER NOT NULL DEFAULT 1,

    job_description TEXT NOT NULL,
    requirements TEXT NOT NULL,


    status VARCHAR(50) DEFAULT 'active',
    is_active BOOLEAN DEFAULT TRUE,

    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES administrators(id) ON DELETE SET NULL,
    updated_by UUID REFERENCES administrators(id) ON DELETE SET NULL
)`,
		`CREATE INDEX IF NOT EXISTS idx_hiring_positions_status ON hiring_positions(status)`,
		`CREATE INDEX IF NOT EXISTS idx_hiring_positions_department ON hiring_positions(department)`,
		`CREATE INDEX IF NOT EXISTS idx_hiring_positions_location ON hiring_positions(location)`,
		`CREATE INDEX IF NOT EXISTS idx_hiring_positions_created_at ON hiring_positions(created_at DESC)`,
		`CREATE INDEX IF NOT EXISTS idx_hiring_positions_is_active ON hiring_positions(is_active)`,

		// ========================================
		// MIGRATION 8: Hiring positions updated_at trigger
		// ========================================
		`CREATE OR REPLACE FUNCTION update_hiring_positions_updated_at()
		RETURNS TRIGGER AS $$
		BEGIN
			NEW.updated_at = CURRENT_TIMESTAMP;
			RETURN NEW;
		END;
		$$ LANGUAGE plpgsql`,
		`DROP TRIGGER IF EXISTS hiring_positions_updated_at_trigger ON hiring_positions`,
		`CREATE TRIGGER hiring_positions_updated_at_trigger
			BEFORE UPDATE ON hiring_positions
			FOR EACH ROW
			EXECUTE FUNCTION update_hiring_positions_updated_at()`,

		// ========================================
		// MIGRATION 9: Assignments table
		// Coding/take-home assignments (AI-generated or manual) that
		// get attached to a hiring position or a specific application.
		// Created before job_applications because job_applications has
		// an inline FK to assignments(id) — Postgres requires the target
		// table to already exist at CREATE TABLE time.
		// ========================================
		`CREATE TABLE IF NOT EXISTS assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    instructions TEXT,
    resource_links TEXT[],
    duration_minutes INTEGER,
    passing_score INTEGER,

    difficulty_level VARCHAR(20),
    generated_by_ai BOOLEAN NOT NULL DEFAULT FALSE,
    ai_notes TEXT,
    starter_readme TEXT,

    status VARCHAR(50) DEFAULT 'active',
    is_active BOOLEAN DEFAULT TRUE,

    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES administrators(id) ON DELETE SET NULL,
    updated_by UUID REFERENCES administrators(id) ON DELETE SET NULL
)`,
		`CREATE INDEX IF NOT EXISTS idx_assignments_is_active ON assignments(is_active)`,
		`CREATE INDEX IF NOT EXISTS idx_assignments_difficulty ON assignments(difficulty_level)`,

		`ALTER TABLE hiring_positions ADD COLUMN IF NOT EXISTS assignment_id UUID REFERENCES assignments(id) ON DELETE SET NULL`,
		`CREATE INDEX IF NOT EXISTS idx_hiring_positions_assignment_id ON hiring_positions(assignment_id)`,

		// ========================================
		// MIGRATION 10: Job applications table
		// Links candidates to positions with status tracking
		// Prevents duplicate applications via unique constraint
		// ========================================
		`CREATE TABLE IF NOT EXISTS job_applications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    candidate_id UUID NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
    position_id UUID NOT NULL REFERENCES hiring_positions(id) ON DELETE CASCADE,
    assignment_id UUID REFERENCES assignments(id) ON DELETE SET NULL,
    -- per-application override of the position's default assignment, used
    -- when an AI-generated, difficulty-specific assignment is created for
    -- this candidate. Falls back to hiring_positions.assignment_id when NULL.
 
    full_name VARCHAR(255),
    phone_number VARCHAR(512),
    resume_url VARCHAR(512),
    github_urls VARCHAR(512)[] NOT NULL,
    skills VARCHAR(512),
    experience_years SMALLINT CHECK (experience_years >= 0 AND experience_years <= 50),
 
    status VARCHAR(50) DEFAULT 'applied',
    -- applied → screening → interviewing → offered → hired / rejected / withdrawn
 
    cover_letter TEXT,
    notes TEXT,
 
    analyzed BOOLEAN NOT NULL DEFAULT FALSE,
    overall_score DOUBLE PRECISION,
    overall_tier VARCHAR(20),
 
    is_qualified BOOLEAN NOT NULL DEFAULT FALSE,
    is_shortlisted BOOLEAN NOT NULL DEFAULT FALSE,
 
    github_repo_name VARCHAR(255),
    github_repo_url VARCHAR(512),
    github_invite_status VARCHAR(20),
    -- NULL → pending / invited / accepted / failed
    github_invited_at TIMESTAMPTZ,
    github_repo_deleted_at TIMESTAMPTZ,
    -- set by the daily cleanup cron once the assignment repo has been
    -- deleted from GitHub, RepoRetentionPeriod (7 days) after
    -- github_invited_at. NULL means the repo (if any) is still live.
 
    assignment_overall_score DOUBLE PRECISION,
    assignment_overall_tier VARCHAR(20),
    assignment_last_scored_at TIMESTAMPTZ,
    -- populated by the daily assignment-scoring cron once the candidate has
    -- pushed commits to their assignment repo; is_shortlisted only ever
    -- becomes true once this score clears AssignmentPassThreshold
 
    assignment_email_sent_at TIMESTAMPTZ,
 
    applied_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
 
    -- one application per candidate PER POSITION -- a candidate can apply
    -- to multiple different job postings, just not twice to the same one.
    CONSTRAINT idx_job_applications_one_per_candidate_position UNIQUE(candidate_id, position_id),
    CONSTRAINT chk_job_applications_github_urls_count CHECK (
        array_length(github_urls, 1) IS NOT NULL
        AND array_length(github_urls, 1) BETWEEN 1 AND 3
    )
);`,

		`CREATE INDEX IF NOT EXISTS idx_job_applications_candidate ON job_applications(candidate_id);`,
		`CREATE INDEX IF NOT EXISTS idx_job_applications_position ON job_applications(position_id);`,
		`CREATE INDEX IF NOT EXISTS idx_job_applications_assignment_id ON job_applications(assignment_id);`,
		`CREATE INDEX IF NOT EXISTS idx_job_applications_status ON job_applications(status);`,
		`CREATE INDEX IF NOT EXISTS idx_job_applications_applied_at ON job_applications(applied_at DESC);`,
		`CREATE INDEX IF NOT EXISTS idx_job_applications_analyzed ON job_applications(analyzed);`,
		`CREATE INDEX IF NOT EXISTS idx_job_applications_qualified ON job_applications(is_qualified);`,
		`CREATE INDEX IF NOT EXISTS idx_job_applications_shortlisted ON job_applications(is_shortlisted);`,
		`CREATE INDEX IF NOT EXISTS idx_job_applications_github_invite_status ON job_applications(github_invite_status);`,
		`CREATE INDEX IF NOT EXISTS idx_job_applications_github_repo_deleted_at ON job_applications(github_repo_deleted_at);`,

		// ========================================
		// MIGRATION 11: Job applications updated_at trigger
		// ========================================
		`CREATE OR REPLACE FUNCTION update_job_applications_updated_at()
		RETURNS TRIGGER AS $$
		BEGIN
			NEW.updated_at = CURRENT_TIMESTAMP;
			RETURN NEW;
		END;
		$$ LANGUAGE plpgsql`,
		`DROP TRIGGER IF EXISTS job_applications_updated_at_trigger ON job_applications`,
		`CREATE TRIGGER job_applications_updated_at_trigger
			BEFORE UPDATE ON job_applications
			FOR EACH ROW
			EXECUTE FUNCTION update_job_applications_updated_at()`,

		// ========================================
		// MIGRATION 12: Interview sessions table
		// Scheduled and active interview tracking
		// Links to applications and candidate sessions
		// ========================================
		`CREATE TABLE IF NOT EXISTS interview_sessions (
			id SERIAL PRIMARY KEY,
			session_id VARCHAR(255) UNIQUE NOT NULL,
			candidate_id UUID NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
			candidate_session_id UUID REFERENCES candidate_sessions(id) ON DELETE SET NULL,
			application_id UUID REFERENCES job_applications(id) ON DELETE SET NULL,

			interviewer_id UUID REFERENCES administrators(id) ON DELETE SET NULL,
			position VARCHAR(255),
			interview_type VARCHAR(50),
			interview_platform SMALLINT DEFAULT 0 CHECK (interview_platform IN (0, 1)), 
			interview_url TEXT,

			scheduled_at TIMESTAMPTZ,
			started_at TIMESTAMPTZ,
			ended_at TIMESTAMPTZ,
			scheduled_duration INTEGER,

			status VARCHAR(50) DEFAULT 'scheduled',
			metadata JSONB,
			notes TEXT,

			created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
			updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
		)`,
		`CREATE INDEX IF NOT EXISTS idx_interview_sessions_id ON interview_sessions(session_id)`,
		`CREATE INDEX IF NOT EXISTS idx_interview_sessions_candidate ON interview_sessions(candidate_id)`,
		`CREATE INDEX IF NOT EXISTS idx_interview_sessions_candidate_session ON interview_sessions(candidate_session_id)`,
		`CREATE INDEX IF NOT EXISTS idx_interview_sessions_application ON interview_sessions(application_id)`,
		`CREATE INDEX IF NOT EXISTS idx_interview_sessions_interviewer ON interview_sessions(interviewer_id)`,
		`CREATE INDEX IF NOT EXISTS idx_interview_sessions_started ON interview_sessions(started_at DESC)`,
		`CREATE INDEX IF NOT EXISTS idx_interview_sessions_status ON interview_sessions(status)`,
		`CREATE INDEX IF NOT EXISTS idx_interview_sessions_platform ON interview_sessions(interview_platform)`,

		// ========================================
		// MIGRATION 13: Interview sessions updated_at trigger
		// ========================================
		`CREATE OR REPLACE FUNCTION update_interview_sessions_updated_at()
		RETURNS TRIGGER AS $$
		BEGIN
			NEW.updated_at = CURRENT_TIMESTAMP;
			RETURN NEW;
		END;
		$$ LANGUAGE plpgsql`,
		`DROP TRIGGER IF EXISTS interview_sessions_updated_at_trigger ON interview_sessions`,
		`CREATE TRIGGER interview_sessions_updated_at_trigger
			BEFORE UPDATE ON interview_sessions
			FOR EACH ROW
			EXECUTE FUNCTION update_interview_sessions_updated_at()`,

		// ========================================
		// MIGRATION 14: Process reports table
		// Proctoring snapshots — a JSONB blob of the candidate's running
		// processes reported periodically during an interview session,
		// plus derived alert counters used by the admin dashboard.
		// (Replaces an earlier normalized process_logs/alert_summary
		// design that was removed as dead weight — never populated.)
		// ========================================
		`CREATE TABLE IF NOT EXISTS process_reports (
			id BIGSERIAL PRIMARY KEY,
			session_id VARCHAR(255) NOT NULL REFERENCES interview_sessions(session_id) ON DELETE CASCADE,

			processes JSONB,
			alert_count INTEGER DEFAULT 0,
			high_memory_alerts INTEGER DEFAULT 0,
			unknown_electron_alerts INTEGER DEFAULT 0,

			reported_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
			created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
		)`,
		`CREATE INDEX IF NOT EXISTS idx_process_reports_session ON process_reports(session_id)`,
		`CREATE INDEX IF NOT EXISTS idx_process_reports_reported ON process_reports(reported_at DESC)`,

		// ========================================
		// MIGRATION 15: Code judge submissions table
		// Stores code execution results for testing
		// ========================================
		`CREATE TABLE IF NOT EXISTS judge_submissions (
			id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
			language TEXT NOT NULL,
			code TEXT NOT NULL,

			stdout TEXT NOT NULL DEFAULT '',
			stderr TEXT NOT NULL DEFAULT '',
			exit_code INT NOT NULL DEFAULT 0,
			time_ms BIGINT NOT NULL DEFAULT 0,
			memory_kb BIGINT NOT NULL DEFAULT 0,

			status TEXT NOT NULL DEFAULT 'pending',
			created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
		)`,
		`CREATE INDEX IF NOT EXISTS idx_judge_submissions_lang ON judge_submissions(language)`,
		`CREATE INDEX IF NOT EXISTS idx_judge_submissions_status ON judge_submissions(status)`,
		`CREATE INDEX IF NOT EXISTS idx_judge_submissions_created ON judge_submissions(created_at DESC)`,

		// ========================================
		// MIGRATION 16: Email configuration table
		// AWS SES credentials (encrypted before storage)
		// Single row configuration
		// ========================================
		`CREATE TABLE IF NOT EXISTS email_config (
			id SERIAL PRIMARY KEY,
			aws_region TEXT NOT NULL,
			aws_access_key_id TEXT NOT NULL,
			aws_secret_access_key TEXT NOT NULL,
			ses_from_email TEXT NOT NULL,
			ses_login_url TEXT NOT NULL,

			created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
			updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
		)`,

		// ========================================
		// MIGRATION 17: Email jobs queue
		// Queued email sending with retry logic
		// ========================================
		`CREATE TABLE IF NOT EXISTS email_jobs (
			id BIGSERIAL PRIMARY KEY,

			-- Routing
			to_email TEXT NOT NULL,
			to_name TEXT,
			from_email TEXT NOT NULL,
			reply_to TEXT,

			-- Content
			subject TEXT NOT NULL,
			body_html TEXT NOT NULL,
			body_text TEXT,
			template VARCHAR(100),
			template_data JSONB,

			-- Context (traceability)
			entity_type VARCHAR(50),
			entity_id TEXT,
			triggered_by TEXT,

			-- Queue management
			status VARCHAR(20) DEFAULT 'pending',
			priority SMALLINT DEFAULT 0,
			attempts SMALLINT DEFAULT 0,
			max_attempts SMALLINT DEFAULT 3,
			scheduled_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,

			-- Result
			sent_at TIMESTAMPTZ,
			failed_at TIMESTAMPTZ,
			error TEXT,
			provider_message_id TEXT,

			-- Audit
			created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
			updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
		)`,
		`CREATE INDEX IF NOT EXISTS idx_email_jobs_status ON email_jobs(status, scheduled_at) WHERE status = 'pending'`,
		`CREATE INDEX IF NOT EXISTS idx_email_jobs_entity ON email_jobs(entity_type, entity_id)`,
		`CREATE INDEX IF NOT EXISTS idx_email_jobs_created ON email_jobs(created_at DESC)`,

		// ========================================
		// MIGRATION 18: Email send logs
		// Immutable record of every send attempt
		// ========================================
		`CREATE TABLE IF NOT EXISTS email_logs (
			id BIGSERIAL PRIMARY KEY,
			job_id BIGINT REFERENCES email_jobs(id) ON DELETE SET NULL,

			-- Snapshot at send time
			to_email TEXT NOT NULL,
			from_email TEXT NOT NULL,
			subject TEXT NOT NULL,
			body_html TEXT NOT NULL,

			-- Result
			status VARCHAR(20) NOT NULL,
			provider_message_id TEXT,
			error TEXT,
			attempt SMALLINT NOT NULL,

			sent_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
		)`,
		`CREATE INDEX IF NOT EXISTS idx_email_logs_job ON email_logs(job_id)`,
		`CREATE INDEX IF NOT EXISTS idx_email_logs_to ON email_logs(to_email)`,
		`CREATE INDEX IF NOT EXISTS idx_email_logs_sent ON email_logs(sent_at DESC)`,

		// ========================================
		// MIGRATION 19: Google credentials table
		// Service account and OAuth credentials for Google APIs
		// ========================================
		`CREATE TABLE IF NOT EXISTS google_credentials (
			id SERIAL PRIMARY KEY,
			credential_name VARCHAR(255) NOT NULL UNIQUE,

			service_account_email VARCHAR(255) NOT NULL,
			project_id VARCHAR(255) NOT NULL,
			private_key_id VARCHAR(255) NOT NULL,
			private_key TEXT NOT NULL,
			client_email VARCHAR(255) NOT NULL,
			client_id VARCHAR(255) NOT NULL,

			access_token TEXT,
			refresh_token TEXT,
			token_expiry TIMESTAMPTZ,
			scopes TEXT[],
			credentials_json JSONB,

			credential_type VARCHAR(50) DEFAULT 'service_account',
			is_active BOOLEAN DEFAULT TRUE,
			is_default BOOLEAN DEFAULT FALSE,

			delegated_admin_email VARCHAR(255),
			subject_email VARCHAR(255),

			created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
			updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
			created_by UUID REFERENCES administrators(id) ON DELETE SET NULL,
			last_used_at TIMESTAMPTZ
		)`,
		`CREATE INDEX IF NOT EXISTS idx_google_credentials_active ON google_credentials(is_active)`,
		`CREATE INDEX IF NOT EXISTS idx_google_credentials_default ON google_credentials(is_default) WHERE is_default = TRUE`,
		`CREATE INDEX IF NOT EXISTS idx_google_credentials_type ON google_credentials(credential_type)`,

		// ========================================
		// MIGRATION 20: Google credentials updated_at trigger
		// ========================================
		`CREATE OR REPLACE FUNCTION update_google_credentials_updated_at()
		RETURNS TRIGGER AS $$
		BEGIN
			NEW.updated_at = CURRENT_TIMESTAMP;
			RETURN NEW;
		END;
		$$ LANGUAGE plpgsql`,
		`DROP TRIGGER IF EXISTS trigger_update_google_credentials_timestamp ON google_credentials`,
		`CREATE TRIGGER trigger_update_google_credentials_timestamp
			BEFORE UPDATE ON google_credentials
			FOR EACH ROW
			EXECUTE FUNCTION update_google_credentials_updated_at()`,

		// ========================================
		// MIGRATION 21: Interview feedback table
		// Per-interviewer scorecard for an interview session (technical,
		// communication, problem solving, culture fit). One row per
		// interviewer per session; overall_score is auto-computed.
		// ========================================
		`CREATE TABLE IF NOT EXISTS interview_feedback (
		id SERIAL PRIMARY KEY,
		interview_session_id INTEGER NOT NULL REFERENCES interview_sessions(id) ON DELETE CASCADE,
		interviewer_id UUID NOT NULL REFERENCES administrators(id) ON DELETE SET NULL,
		technical_skills_score SMALLINT CHECK (technical_skills_score BETWEEN 0 AND 100),
		communication_score SMALLINT CHECK (communication_score BETWEEN 0 AND 100),
		problem_solving_score SMALLINT CHECK (problem_solving_score BETWEEN 0 AND 100),
		cultural_fit_score SMALLINT CHECK (cultural_fit_score BETWEEN 0 AND 100),
		overall_score NUMERIC(5, 2) GENERATED ALWAYS AS (
			(technical_skills_score + communication_score + problem_solving_score + cultural_fit_score) / 4.0
		) STORED,
		comments TEXT,
		recommendation VARCHAR(50),
		created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
		updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
		UNIQUE(interview_session_id, interviewer_id)
	);`,

		`CREATE INDEX IF NOT EXISTS idx_feedback_session ON interview_feedback(interview_session_id);`,
		`CREATE INDEX IF NOT EXISTS idx_feedback_interviewer ON interview_feedback(interviewer_id);`,

		// ========================================
		// MIGRATION 22: Admin sessions table
		// Login-session tracking for administrators/interviewers,
		// mirrors candidate_sessions for the admin side of the app.
		// ========================================
		`CREATE TABLE IF NOT EXISTS admin_sessions (
		id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
		admin_id UUID NOT NULL REFERENCES administrators(id) ON DELETE CASCADE,
		session_token TEXT UNIQUE NOT NULL,

		logged_in_at  TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
		logged_out_at TIMESTAMPTZ,
		last_activity TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,

		ip_address INET,
		user_agent TEXT,
		is_active  BOOLEAN DEFAULT TRUE
	);`,

		`CREATE INDEX IF NOT EXISTS idx_admin_sessions_admin  ON admin_sessions(admin_id);`,
		`CREATE INDEX IF NOT EXISTS idx_admin_sessions_token  ON admin_sessions(session_token);`,
		`CREATE INDEX IF NOT EXISTS idx_admin_sessions_active ON admin_sessions(is_active, logged_in_at DESC);`,

		// ========================================
		// MIGRATION 23: Interview reminders table
		// Tracks which reminder emails (e.g. "24h before") have already
		// been sent for a session, so the cron job doesn't double-send.
		// ========================================
		`
		CREATE TABLE IF NOT EXISTS interview_reminders (
		id          BIGSERIAL PRIMARY KEY,
		session_id  VARCHAR(255) NOT NULL REFERENCES interview_sessions(session_id) ON DELETE CASCADE,
		reminder_type   VARCHAR(50) NOT NULL DEFAULT '24h',
		sent_to     TEXT NOT NULL,
		sent_at     TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
		email_job_id BIGINT REFERENCES email_jobs(id) ON DELETE SET NULL,
		created_at  TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
		UNIQUE(session_id, reminder_type)
)`,

		`CREATE INDEX IF NOT EXISTS idx_interview_reminders_session  ON interview_reminders(session_id)`,
		`CREATE INDEX IF NOT EXISTS idx_interview_reminders_sent_at  ON interview_reminders(sent_at DESC)`,
		`CREATE INDEX IF NOT EXISTS idx_interview_reminders_type     ON interview_reminders(reminder_type)`,

		// ========================================
		// MIGRATION 24: Audit log table
		// General-purpose audit trail for admin/candidate actions
		// across the platform (login, edits, deletions, etc).
		// ========================================
		`CREATE TABLE IF NOT EXISTS audit_log (
		id BIGSERIAL PRIMARY KEY,

		candidate_id UUID REFERENCES candidates(id) ON DELETE SET NULL,
		admin_id     UUID REFERENCES administrators(id) ON DELETE SET NULL,

		action      VARCHAR(100) NOT NULL,
		entity_type VARCHAR(50),
		entity_id   VARCHAR(255),
		description TEXT,
		metadata    JSONB,

		ip_address INET,
		user_agent TEXT,
		created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
	)`,
		`CREATE INDEX IF NOT EXISTS idx_audit_log_candidate ON audit_log(candidate_id)`,
		`CREATE INDEX IF NOT EXISTS idx_audit_log_admin     ON audit_log(admin_id)`,
		`CREATE INDEX IF NOT EXISTS idx_audit_log_action    ON audit_log(action)`,
		`CREATE INDEX IF NOT EXISTS idx_audit_log_entity    ON audit_log(entity_type, entity_id)`,
		`CREATE INDEX IF NOT EXISTS idx_audit_log_created   ON audit_log(created_at DESC)`,

		// ========================================
		// MIGRATION 25: Twilio config table
		// Single-row Twilio account credentials used to place calls
		// to candidates from the admin panel.
		// ========================================
		`CREATE TABLE IF NOT EXISTS twilio_config (
		id         BIGSERIAL PRIMARY KEY,
		account_sid     TEXT NOT NULL,
		api_key_sid     TEXT NOT NULL,
		api_key_secret  TEXT NOT NULL,
		twiml_app_sid   TEXT NOT NULL,
		from_number     TEXT NOT NULL,
		created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
		updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
	)`,

		// ========================================
		// MIGRATION 26: Call logs table
		// Record of outbound Twilio calls made to candidates,
		// with status/duration updated as the call progresses.
		// ========================================
		`CREATE TABLE IF NOT EXISTS call_logs (
    id          BIGSERIAL PRIMARY KEY,
    admin_id    UUID REFERENCES administrators(id) ON DELETE SET NULL,
    candidate_id UUID REFERENCES candidates(id) ON DELETE SET NULL,
    to_number   VARCHAR(50) NOT NULL,
    call_sid    VARCHAR(100),
    status      VARCHAR(50) DEFAULT 'initiated',
    duration    INTEGER DEFAULT 0,
    created_at  TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    ended_at    TIMESTAMPTZ
)`,
		`CREATE INDEX IF NOT EXISTS idx_call_logs_admin     ON call_logs(admin_id)`,
		`CREATE INDEX IF NOT EXISTS idx_call_logs_candidate ON call_logs(candidate_id)`,
		`CREATE INDEX IF NOT EXISTS idx_call_logs_created   ON call_logs(created_at DESC)`,

		// ========================================
		// MIGRATION 27: LiveKit config table
		// Single-row LiveKit server credentials used for video
		// interview rooms.
		// ========================================
		`CREATE TABLE IF NOT EXISTS livekit_configs(
           id SERIAL PRIMARY KEY,
           host VARCHAR(255) NOT NULL,
           api_key VARCHAR(255) NOT NULL,
           api_secret VARCHAR(255) NOT NULL,
           is_active BOOLEAN DEFAULT TRUE,
           created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
           updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        )`,

		// ========================================
		// MIGRATION 28: Job application repos table
		// GitHub assignment repos created per application, keyed so a
		// position+repo_url pair is only ever created once.
		// ========================================
		`CREATE TABLE IF NOT EXISTS job_application_repos (
    repo_url       VARCHAR(512) NOT NULL,
    position_id    UUID NOT NULL REFERENCES hiring_positions(id) ON DELETE CASCADE,
    application_id UUID NOT NULL REFERENCES job_applications(id) ON DELETE CASCADE,
    PRIMARY KEY (position_id, repo_url)
);`,

		// ========================================
		// MIGRATION 29: AI provider configs table
		// Credentials/default model per AI provider (openai/gemini/claude)
		// used for assignment generation and repo review.
		// ========================================
		`CREATE TABLE IF NOT EXISTS ai_provider_configs (
    provider    VARCHAR(20) PRIMARY KEY,          -- 'openai' | 'gemini' | 'claude'
    api_key     TEXT NOT NULL,
    model       VARCHAR(100) NOT NULL,             -- default model for this provider
    base_url    TEXT,                              -- optional override, e.g. self-hosted proxy
    is_active   BOOLEAN NOT NULL DEFAULT true,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT chk_ai_provider CHECK (provider IN ('openai', 'gemini', 'claude'))
);
`,

		// ========================================
		// MIGRATION 30: AI scenarios table
		// Named AI prompt/config presets (e.g. "technical_interview")
		// that reference a provider from ai_provider_configs.
		// ========================================
		`CREATE TABLE IF NOT EXISTS ai_scenarios (
    scenario_key   VARCHAR(50) PRIMARY KEY,        -- e.g. 'technical_interview'
    name           VARCHAR(100) NOT NULL,
    description    TEXT,
    provider       VARCHAR(20) NOT NULL REFERENCES ai_provider_configs(provider),
    model          VARCHAR(100),                   -- overrides provider's default model if set
    system_prompt  TEXT NOT NULL,
    temperature    NUMERIC(3,2) NOT NULL DEFAULT 0.70,
    max_tokens     INT NOT NULL DEFAULT 1024,
    is_active      BOOLEAN NOT NULL DEFAULT true,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);
`,
		`CREATE INDEX IF NOT EXISTS idx_ai_scenarios_provider ON ai_scenarios(provider);`,

		// ========================================
		// MIGRATION 31: Assignment submissions table
		// A candidate's submitted answer(s) for an assignment attached to
		// their application. Multiple attempts are kept (attempt_number).
		// ========================================
		`CREATE TABLE IF NOT EXISTS assignment_submissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_application_id UUID NOT NULL REFERENCES job_applications(id) ON DELETE CASCADE,
    assignment_id UUID NOT NULL REFERENCES assignments(id) ON DELETE RESTRICT,

    attempt_number INTEGER NOT NULL DEFAULT 1,

    submission_text TEXT,
    submission_files TEXT[],
    submission_links TEXT[],

    status VARCHAR(50) NOT NULL DEFAULT 'submitted',
    score INTEGER,
    feedback TEXT,

    submitted_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    reviewed_at TIMESTAMPTZ,
    reviewed_by UUID REFERENCES administrators(id) ON DELETE SET NULL,

    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,

    UNIQUE(job_application_id, assignment_id, attempt_number)
)`,
		`CREATE INDEX IF NOT EXISTS idx_submissions_application ON assignment_submissions(job_application_id)`,
		`CREATE INDEX IF NOT EXISTS idx_submissions_assignment ON assignment_submissions(assignment_id)`,
		`CREATE INDEX IF NOT EXISTS idx_submissions_status ON assignment_submissions(status)`,
		`CREATE INDEX IF NOT EXISTS idx_submissions_submitted_at ON assignment_submissions(submitted_at DESC)`,

		// ========================================
		// MIGRATION 32: Candidate access links table
		// Passwordless magic-link tokens emailed to candidates so they
		// can access their application/assignment without a full login.
		// ========================================
		`CREATE TABLE IF NOT EXISTS candidate_access_links (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    candidate_id UUID REFERENCES candidates(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    position_id UUID REFERENCES hiring_positions(id) ON DELETE SET NULL,

    token_hash TEXT NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL DEFAULT (CURRENT_TIMESTAMP + INTERVAL '10 days'),
    revoked_at TIMESTAMPTZ,
    last_used_at TIMESTAMPTZ,
    use_count INTEGER NOT NULL DEFAULT 0,

    created_by UUID REFERENCES administrators(id) ON DELETE SET NULL,
    ip_address INET,
    user_agent TEXT,

    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);`,

		`CREATE UNIQUE INDEX IF NOT EXISTS idx_access_links_token_hash ON candidate_access_links(token_hash);`,
		`CREATE INDEX IF NOT EXISTS idx_access_links_email ON candidate_access_links(email);`,
		`CREATE INDEX IF NOT EXISTS idx_access_links_candidate ON candidate_access_links(candidate_id);`,
		`CREATE INDEX IF NOT EXISTS idx_access_links_expires ON candidate_access_links(expires_at);`,

		// ========================================
		// MIGRATION 33: Repo analyses table
		// One-off commit-history analysis of a candidate's assignment
		// repo (message quality, atomicity, cadence, etc).
		// ========================================
		`CREATE TABLE IF NOT EXISTS repo_analyses (
    id SERIAL PRIMARY KEY,
    job_application_id UUID NOT NULL REFERENCES job_applications(id) ON DELETE CASCADE,
    candidate_id UUID NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
 
    repo_url VARCHAR(512) NOT NULL,
 
    total_score DOUBLE PRECISION NOT NULL,
    message_score DOUBLE PRECISION NOT NULL,
    atomicity_score DOUBLE PRECISION NOT NULL,
    cadence_score DOUBLE PRECISION NOT NULL,
    author_score DOUBLE PRECISION NOT NULL,
    semantic_score DOUBLE PRECISION,
 
    tier VARCHAR(20) NOT NULL,
    commit_count INTEGER NOT NULL DEFAULT 0,
    avg_lines_per_commit DOUBLE PRECISION NOT NULL DEFAULT 0,
 
    details JSONB,
 
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);`,

		`CREATE INDEX IF NOT EXISTS idx_repo_analyses_job_application ON repo_analyses(job_application_id);`,
		`CREATE INDEX IF NOT EXISTS idx_repo_analyses_candidate ON repo_analyses(candidate_id);`,
		`CREATE INDEX IF NOT EXISTS idx_repo_analyses_tier ON repo_analyses(tier);`,

		// ========================================
		// MIGRATION 34: Assignment scores table
		// One row per daily scoring attempt on a candidate's assignment
		// repo — keeps history if scored multiple times (e.g. resubmission
		// after a low first score, before the shortlist threshold is hit).
		// ========================================
		`CREATE TABLE IF NOT EXISTS assignment_scores (
    id SERIAL PRIMARY KEY,
    job_application_id UUID NOT NULL REFERENCES job_applications(id) ON DELETE CASCADE,

    total_score DOUBLE PRECISION NOT NULL,
    -- combined score: (CommitScoreWeight * commit_score) + (AIScoreWeight * ai_score)
    message_score DOUBLE PRECISION NOT NULL,
    atomicity_score DOUBLE PRECISION NOT NULL,
    cadence_score DOUBLE PRECISION NOT NULL,
    author_score DOUBLE PRECISION NOT NULL,

    commit_score DOUBLE PRECISION NOT NULL DEFAULT 0,
    -- the commit-history-only sub-score (same as total_score used to be
    -- before AI review was combined in)
    ai_score DOUBLE PRECISION NOT NULL DEFAULT 0,
    ai_summary TEXT,

    tier VARCHAR(20) NOT NULL,
    commit_count INTEGER NOT NULL DEFAULT 0,
    avg_lines_per_commit DOUBLE PRECISION NOT NULL DEFAULT 0,

    details JSONB,

    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);`,
		`CREATE INDEX IF NOT EXISTS idx_assignment_scores_application ON assignment_scores(job_application_id);`,
		`CREATE INDEX IF NOT EXISTS idx_assignment_scores_tier ON assignment_scores(tier);`,

		// ========================================
		// MIGRATION 35: GitHub credentials table
		// Single-row (id always 1) org PAT used to create/invite
		// candidates to assignment repos.
		// ========================================
		`CREATE TABLE IF NOT EXISTS github_credentials (
    id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
org_name VARCHAR(255) NOT NULL,
    pat_encrypted TEXT NOT NULL,
    created_by UUID,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);`,

		// ========================================
		// MIGRATION 36: Admin notifications table
		// In-app notification feed for admins/HR (new applications,
		// shortlisting, failed jobs, suspicious activity, etc). NULL
		// admin_id means broadcast to all admins.
		// ========================================
		`CREATE TABLE IF NOT EXISTS admin_notifications (
    id BIGSERIAL PRIMARY KEY,

    -- NULL admin_id = broadcast to all admins/HR. Set it to target one person
    -- (e.g. the interviewer assigned to a session).
    admin_id UUID REFERENCES administrators(id) ON DELETE CASCADE,

    type VARCHAR(50) NOT NULL,
    -- 'candidate_shortlisted' | 'candidate_qualified' | 'github_invite_failed' |
    -- 'assignment_generation_failed' | 'ai_review_failed' | 'email_job_failed' |
    -- 'interview_scheduled' | 'interview_no_show' | 'stale_assignment' |
    -- 'suspicious_activity' | 'new_application' ...

    title VARCHAR(255) NOT NULL,
    message TEXT,

    entity_type VARCHAR(50),
    entity_id VARCHAR(255),
    metadata JSONB,

    severity VARCHAR(20) NOT NULL DEFAULT 'info',
    -- 'info' | 'success' | 'warning' | 'critical'

    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    read_at TIMESTAMPTZ,

    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);`,

		`CREATE INDEX IF NOT EXISTS idx_admin_notifications_admin ON admin_notifications(admin_id, is_read, created_at DESC);`,
		`CREATE INDEX IF NOT EXISTS idx_admin_notifications_type ON admin_notifications(type);`,
		`CREATE INDEX IF NOT EXISTS idx_admin_notifications_entity ON admin_notifications(entity_type, entity_id);`,
		`CREATE INDEX IF NOT EXISTS idx_admin_notifications_unread ON admin_notifications(is_read) WHERE is_read = FALSE;`,

		// ========================================
		// MIGRATION 37: Interview room passcodes table
		// One-time passcodes candidates use to join a LiveKit interview
		// room, scoped to a session and an expiry window.
		// ========================================
		`CREATE TABLE IF NOT EXISTS interview_room_passcodes (
    id           BIGSERIAL PRIMARY KEY,
	session_id   VARCHAR(255) NOT NULL REFERENCES interview_sessions(session_id) ON DELETE CASCADE,
    passcode     VARCHAR(12) NOT NULL,
    room_token   TEXT NOT NULL,
    room_host    TEXT,
    expires_at   TIMESTAMPTZ NOT NULL,
    used_at      TIMESTAMPTZ,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (passcode)
);`,
		`ALTER TABLE interview_room_passcodes ADD COLUMN IF NOT EXISTS interview_starts_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`,

		`CREATE INDEX IF NOT EXISTS idx_interview_room_passcodes_session_id ON interview_room_passcodes(session_id);`,

		// ========================================
		// MIGRATION 38: Interview question sets table
		// AI-generated (or manual) question sets tied to a specific
		// interview_sessions row. Each regeneration attempt is a new row
		// (attempt_number increments) rather than overwriting the previous set.
		// ========================================
		`CREATE TABLE IF NOT EXISTS interview_question_sets (
    id SERIAL PRIMARY KEY,
    interview_session_id INTEGER NOT NULL REFERENCES interview_sessions(id) ON DELETE CASCADE,
    attempt_number INTEGER NOT NULL DEFAULT 1,

    difficulty_level VARCHAR(20) NOT NULL,
    category VARCHAR(50) DEFAULT 'mixed',
    questions JSONB NOT NULL,

    generated_by_ai BOOLEAN NOT NULL DEFAULT FALSE,
    notes TEXT,

    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    generated_by UUID REFERENCES administrators(id) ON DELETE SET NULL,

    UNIQUE(interview_session_id, attempt_number)
)`,
		`CREATE INDEX IF NOT EXISTS idx_interview_question_sets_session ON interview_question_sets(interview_session_id)`,
		`CREATE INDEX IF NOT EXISTS idx_interview_question_sets_created ON interview_question_sets(created_at DESC)`,

		`CREATE OR REPLACE FUNCTION update_interview_question_sets_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql`,
		`DROP TRIGGER IF EXISTS interview_question_sets_updated_at_trigger ON interview_question_sets`,
		`CREATE TRIGGER interview_question_sets_updated_at_trigger
    BEFORE UPDATE ON interview_question_sets
    FOR EACH ROW
    EXECUTE FUNCTION update_interview_question_sets_updated_at()`,
	}

	for i, migration := range migrations {
		if _, err := db.Exec(migration); err != nil {
			return fmt.Errorf("migration %d failed: %w", i+1, err)
		}
	}

	log.Println("✅ Database migrations completed")
	return nil
}
