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
		// MIGRATION 0: Enable pgcrypto extension
		// Enables gen_random_uuid() for UUID generation
		// ========================================
		`CREATE EXTENSION IF NOT EXISTS pgcrypto`,

		// ========================================
		// MIGRATION 1: Administrators table
		// Must be created first for foreign key references
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
		// MIGRATION 2: Administrators updated_at trigger
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
		// MIGRATION 3: Candidates table
		// Primary user table for job applicants
		// ========================================
		`CREATE TABLE IF NOT EXISTS candidates (
			id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
			email VARCHAR(255) UNIQUE NOT NULL,
			password_hash VARCHAR(255) NOT NULL,
			full_name VARCHAR(255),
			
			resume_url VARCHAR(512),
			github_url VARCHAR(512),
			skills VARCHAR(512),
			phone_number VARCHAR(512),
			experience_years SMALLINT CHECK (experience_years >= 0 AND experience_years <= 50),
			
			is_active BOOLEAN DEFAULT TRUE,
			onboarding_complete BOOLEAN DEFAULT FALSE,
			last_login TIMESTAMPTZ,
			
			created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
			updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
		)`,
		`CREATE INDEX IF NOT EXISTS idx_candidates_email ON candidates(email)`,
		`CREATE INDEX IF NOT EXISTS idx_candidates_created ON candidates(created_at DESC)`,
		`CREATE INDEX IF NOT EXISTS idx_candidates_is_active ON candidates(is_active)`,

		// ========================================
		// MIGRATION 4: Candidates updated_at trigger
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
		// MIGRATION 5: Candidate sessions table
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
		// MIGRATION 6: Hiring positions table
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
		// MIGRATION 7: Hiring positions updated_at trigger
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
		// MIGRATION 8: Job applications table
		// Links candidates to positions with status tracking
		// Prevents duplicate applications via unique constraint
		// ========================================
		`CREATE TABLE IF NOT EXISTS job_applications (
			id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
			candidate_id UUID NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
			position_id UUID NOT NULL REFERENCES hiring_positions(id) ON DELETE CASCADE,
			
			status VARCHAR(50) DEFAULT 'applied',
			-- applied → screening → interviewing → offered → hired / rejected / withdrawn
			
			cover_letter TEXT,
			notes TEXT,
			
			applied_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
			updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
			
			UNIQUE(candidate_id, position_id)
		)`,
		`CREATE INDEX IF NOT EXISTS idx_job_applications_candidate ON job_applications(candidate_id)`,
		`CREATE INDEX IF NOT EXISTS idx_job_applications_position ON job_applications(position_id)`,
		`CREATE INDEX IF NOT EXISTS idx_job_applications_status ON job_applications(status)`,
		`CREATE INDEX IF NOT EXISTS idx_job_applications_applied_at ON job_applications(applied_at DESC)`,

		// ========================================
		// MIGRATION 9: Job applications updated_at trigger
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
		// MIGRATION 10: Interview sessions table
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
			interview_platform SMALLINT DEFAULT 0 CHECK (interview_platform IN (0)), -- 0: Google Meet
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
		// MIGRATION 11: Interview sessions updated_at trigger
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
		// MIGRATION 12: Process logs table
		// Monitoring data from interview sessions
		// Tracks running processes with categorization
		// ========================================
		`CREATE TABLE IF NOT EXISTS process_logs (
			id BIGSERIAL PRIMARY KEY,
			interview_session_id INTEGER NOT NULL REFERENCES interview_sessions(id) ON DELETE CASCADE,
			candidate_session_id UUID REFERENCES candidate_sessions(id) ON DELETE SET NULL,
			
			logged_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
			
			pid INTEGER NOT NULL,
			ppid INTEGER,
			name VARCHAR(255) NOT NULL,
			path TEXT,
			cmd TEXT,
			memory DECIMAL(10, 2),
			cpu_usage DECIMAL(5, 2),
			
			is_user_app BOOLEAN DEFAULT FALSE,
			is_gui_app BOOLEAN DEFAULT FALSE,
			username VARCHAR(255),
			process_type VARCHAR(50),
			category VARCHAR(50),
			confidence DECIMAL(3, 2),
			
			is_unknown BOOLEAN DEFAULT FALSE,
			is_suspicious BOOLEAN DEFAULT FALSE,
			is_electron BOOLEAN DEFAULT FALSE,
			alert_level VARCHAR(20) DEFAULT 'none',
			
			created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
		)`,
		`CREATE INDEX IF NOT EXISTS idx_process_logs_interview ON process_logs(interview_session_id)`,
		`CREATE INDEX IF NOT EXISTS idx_process_logs_timestamp ON process_logs(logged_at DESC)`,
		`CREATE INDEX IF NOT EXISTS idx_process_logs_pid ON process_logs(pid)`,
		`CREATE INDEX IF NOT EXISTS idx_process_logs_name ON process_logs(name)`,
		`CREATE INDEX IF NOT EXISTS idx_process_logs_suspicious ON process_logs(is_suspicious) WHERE is_suspicious = TRUE`,
		`CREATE INDEX IF NOT EXISTS idx_process_logs_unknown ON process_logs(is_unknown) WHERE is_unknown = TRUE`,
		`CREATE INDEX IF NOT EXISTS idx_process_logs_alert ON process_logs(alert_level) WHERE alert_level != 'none'`,

		// ========================================
		// MIGRATION 13: Alert summary table
		// Aggregated metrics per interview session
		// ========================================
		`CREATE TABLE IF NOT EXISTS alert_summary (
			id SERIAL PRIMARY KEY,
			interview_session_id INTEGER UNIQUE NOT NULL REFERENCES interview_sessions(id) ON DELETE CASCADE,
			
			total_processes INTEGER DEFAULT 0,
			unknown_processes INTEGER DEFAULT 0,
			suspicious_processes INTEGER DEFAULT 0,
			high_memory_processes INTEGER DEFAULT 0,
			electron_processes INTEGER DEFAULT 0,
			
			critical_alerts INTEGER DEFAULT 0,
			high_alerts INTEGER DEFAULT 0,
			medium_alerts INTEGER DEFAULT 0,
			low_alerts INTEGER DEFAULT 0,
			
			risk_score DECIMAL(5, 2) DEFAULT 0.0,
			first_alert_at TIMESTAMPTZ,
			last_alert_at TIMESTAMPTZ,
			updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
		)`,
		`CREATE INDEX IF NOT EXISTS idx_alert_summary_interview ON alert_summary(interview_session_id)`,
		`CREATE INDEX IF NOT EXISTS idx_alert_summary_risk ON alert_summary(risk_score DESC)`,

		// ========================================
		// MIGRATION 14: Alert summary auto-update function
		// Trigger on process_logs insert to maintain counts
		// ========================================
		`CREATE OR REPLACE FUNCTION update_alert_summary()
		RETURNS TRIGGER AS $$
		BEGIN
			INSERT INTO alert_summary (
				interview_session_id,
				total_processes,
				unknown_processes,
				suspicious_processes,
				high_memory_processes,
				electron_processes
			)
			VALUES (
				NEW.interview_session_id,
				1,
				CASE WHEN NEW.is_unknown THEN 1 ELSE 0 END,
				CASE WHEN NEW.is_suspicious THEN 1 ELSE 0 END,
				CASE WHEN NEW.memory > 500 THEN 1 ELSE 0 END,
				CASE WHEN NEW.is_electron THEN 1 ELSE 0 END
			)
			ON CONFLICT (interview_session_id) DO UPDATE SET
				total_processes = alert_summary.total_processes + 1,
				unknown_processes = alert_summary.unknown_processes + CASE WHEN NEW.is_unknown THEN 1 ELSE 0 END,
				suspicious_processes = alert_summary.suspicious_processes + CASE WHEN NEW.is_suspicious THEN 1 ELSE 0 END,
				high_memory_processes = alert_summary.high_memory_processes + CASE WHEN NEW.memory > 500 THEN 1 ELSE 0 END,
				electron_processes = alert_summary.electron_processes + CASE WHEN NEW.is_electron THEN 1 ELSE 0 END,
				critical_alerts = alert_summary.critical_alerts + CASE WHEN NEW.alert_level = 'critical' THEN 1 ELSE 0 END,
				high_alerts = alert_summary.high_alerts + CASE WHEN NEW.alert_level = 'high' THEN 1 ELSE 0 END,
				medium_alerts = alert_summary.medium_alerts + CASE WHEN NEW.alert_level = 'medium' THEN 1 ELSE 0 END,
				low_alerts = alert_summary.low_alerts + CASE WHEN NEW.alert_level = 'low' THEN 1 ELSE 0 END,
				last_alert_at = CASE WHEN NEW.is_suspicious OR NEW.is_unknown THEN CURRENT_TIMESTAMP ELSE alert_summary.last_alert_at END,
				updated_at = CURRENT_TIMESTAMP;

			RETURN NEW;
		END;
		$$ LANGUAGE plpgsql`,

		// ========================================
		// MIGRATION 15: Alert summary trigger
		// ========================================
		`DROP TRIGGER IF EXISTS trigger_update_alert_summary ON process_logs`,
		`CREATE TRIGGER trigger_update_alert_summary
			AFTER INSERT ON process_logs
			FOR EACH ROW
			EXECUTE FUNCTION update_alert_summary()`,

		// ========================================
		// MIGRATION 16: Process reports table
		// Snapshot reports of processes at specific times
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
		// MIGRATION 17: Code judge submissions table
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
		// MIGRATION 18: Audit log table
		// Immutable log of all user actions
		// ========================================
		`CREATE TABLE IF NOT EXISTS audit_log (
			id BIGSERIAL PRIMARY KEY,
			candidate_id UUID REFERENCES candidates(id) ON DELETE SET NULL,
			
			action VARCHAR(100) NOT NULL,
			entity_type VARCHAR(50),
			entity_id VARCHAR(255),
			description TEXT,
			metadata JSONB,
			
			ip_address INET,
			user_agent TEXT,
			created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
		)`,
		`CREATE INDEX IF NOT EXISTS idx_audit_log_candidate ON audit_log(candidate_id)`,
		`CREATE INDEX IF NOT EXISTS idx_audit_log_action ON audit_log(action)`,
		`CREATE INDEX IF NOT EXISTS idx_audit_log_entity ON audit_log(entity_type, entity_id)`,
		`CREATE INDEX IF NOT EXISTS idx_audit_log_created ON audit_log(created_at DESC)`,

		// ========================================
		// MIGRATION 19: Email configuration table
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
		// MIGRATION 20: Email jobs queue
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
		// MIGRATION 21: Email send logs
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
		// MIGRATION 22: Google credentials table
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
		// MIGRATION 23: Google credentials updated_at trigger
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
	}

	for i, migration := range migrations {
		if _, err := db.Exec(migration); err != nil {
			return fmt.Errorf("migration %d failed: %w", i+1, err)
		}
	}

	log.Println("✅ Database migrations completed")
	return nil
}
