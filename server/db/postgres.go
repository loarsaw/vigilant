package db

import (
	"database/sql"
	"fmt"
	"log"

	_ "github.com/lib/pq"
	"vigilant/config"
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

	log.Println("✅ Database connection established")

	DB = db
	return db, nil
}

func RunMigrations(db *sql.DB) error {
	log.Println("Running database migrations...")

	migrations := []string{
		// ========================================
		// MIGRATION 1: Candidates table
		// ========================================
		`CREATE TABLE IF NOT EXISTS candidates (
			id SERIAL PRIMARY KEY,
			email VARCHAR(255) UNIQUE NOT NULL,
			password_hash VARCHAR(255) NOT NULL,
			full_name VARCHAR(255),
			created_at TIMESTAMP DEFAULT NOW(),
			updated_at TIMESTAMP DEFAULT NOW(),
			is_active BOOLEAN DEFAULT TRUE,
            interview_current_stage VARCHAR(255),
           interview_next_stage VARCHAR(255),
		   current_stage_qualified BOOLEAN DEFAULT FALSE,
		   interview_completed BOOLEAN DEFAULT FALSE,
			last_login TIMESTAMP
		)`,
		`CREATE INDEX IF NOT EXISTS idx_candidates_email ON candidates(email)`,
		`CREATE INDEX IF NOT EXISTS idx_candidates_created ON candidates(created_at DESC)`,

		// ========================================
		// MIGRATION 2: Candidate sessions table
		// ========================================
		`CREATE TABLE IF NOT EXISTS candidate_sessions (
			id SERIAL PRIMARY KEY,
			candidate_id INTEGER NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
			session_token VARCHAR(255) UNIQUE NOT NULL,
			logged_in_at TIMESTAMP DEFAULT NOW(),
			logged_out_at TIMESTAMP,
			last_activity TIMESTAMP DEFAULT NOW(),
			system_type VARCHAR(50),
			os_version VARCHAR(100),
			ip_address INET,
			user_agent TEXT,
			country VARCHAR(100),
			city VARCHAR(100),
			is_active BOOLEAN DEFAULT TRUE,
			created_at TIMESTAMP DEFAULT NOW()
		)`,
		`CREATE INDEX IF NOT EXISTS idx_sessions_candidate ON candidate_sessions(candidate_id)`,
		`CREATE INDEX IF NOT EXISTS idx_sessions_token ON candidate_sessions(session_token)`,
		`CREATE INDEX IF NOT EXISTS idx_sessions_active ON candidate_sessions(is_active, logged_in_at DESC)`,
		`CREATE INDEX IF NOT EXISTS idx_sessions_ip ON candidate_sessions(ip_address)`,

		// ========================================
		// MIGRATION 3: Interview sessions table
		// ========================================
		`CREATE TABLE IF NOT EXISTS interview_sessions (
			id SERIAL PRIMARY KEY,
			session_id VARCHAR(255) UNIQUE NOT NULL,
			candidate_id INTEGER REFERENCES candidates(id) ON DELETE SET NULL,
			candidate_session_id INTEGER REFERENCES candidate_sessions(id) ON DELETE SET NULL,
			interviewer_email VARCHAR(255),
			position VARCHAR(255),
			interview_type VARCHAR(50),
			started_at TIMESTAMP DEFAULT NOW(),
			ended_at TIMESTAMP,
			scheduled_duration INTEGER,
			status VARCHAR(50) DEFAULT 'in_progress',
			metadata JSONB,
			notes TEXT,
			created_at TIMESTAMP DEFAULT NOW()
		)`,
		`CREATE INDEX IF NOT EXISTS idx_interview_sessions_id ON interview_sessions(session_id)`,
		`CREATE INDEX IF NOT EXISTS idx_interview_sessions_candidate ON interview_sessions(candidate_id)`,
		`CREATE INDEX IF NOT EXISTS idx_interview_sessions_started ON interview_sessions(started_at DESC)`,
		`CREATE INDEX IF NOT EXISTS idx_interview_sessions_status ON interview_sessions(status)`,

		// ========================================
		// MIGRATION 4: Process logs table (detailed)
		// ========================================
		`CREATE TABLE IF NOT EXISTS process_logs (
			id BIGSERIAL PRIMARY KEY,
			interview_session_id INTEGER NOT NULL REFERENCES interview_sessions(id) ON DELETE CASCADE,
			candidate_session_id INTEGER REFERENCES candidate_sessions(id) ON DELETE SET NULL,
			logged_at TIMESTAMP DEFAULT NOW(),
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
			created_at TIMESTAMP DEFAULT NOW()
		)`,
		`CREATE INDEX IF NOT EXISTS idx_process_logs_interview ON process_logs(interview_session_id)`,
		`CREATE INDEX IF NOT EXISTS idx_process_logs_timestamp ON process_logs(logged_at DESC)`,
		`CREATE INDEX IF NOT EXISTS idx_process_logs_pid ON process_logs(pid)`,
		`CREATE INDEX IF NOT EXISTS idx_process_logs_name ON process_logs(name)`,
		`CREATE INDEX IF NOT EXISTS idx_process_logs_suspicious ON process_logs(is_suspicious) WHERE is_suspicious = TRUE`,
		`CREATE INDEX IF NOT EXISTS idx_process_logs_unknown ON process_logs(is_unknown) WHERE is_unknown = TRUE`,
		`CREATE INDEX IF NOT EXISTS idx_process_logs_alert ON process_logs(alert_level) WHERE alert_level != 'none'`,

		// ========================================
		// MIGRATION 5: Alert summary table
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
			first_alert_at TIMESTAMP,
			last_alert_at TIMESTAMP,
			updated_at TIMESTAMP DEFAULT NOW()
		)`,
		`CREATE INDEX IF NOT EXISTS idx_alert_summary_interview ON alert_summary(interview_session_id)`,
		`CREATE INDEX IF NOT EXISTS idx_alert_summary_risk ON alert_summary(risk_score DESC)`,

		// ========================================
		// MIGRATION 6: Audit log table
		// ========================================
		`CREATE TABLE IF NOT EXISTS audit_log (
			id BIGSERIAL PRIMARY KEY,
			candidate_id INTEGER REFERENCES candidates(id) ON DELETE SET NULL,
			action VARCHAR(100) NOT NULL,
			entity_type VARCHAR(50),
			entity_id INTEGER,
			description TEXT,
			metadata JSONB,
			ip_address INET,
			user_agent TEXT,
			created_at TIMESTAMP DEFAULT NOW()
		)`,
		`CREATE INDEX IF NOT EXISTS idx_audit_log_candidate ON audit_log(candidate_id)`,
		`CREATE INDEX IF NOT EXISTS idx_audit_log_action ON audit_log(action)`,
		`CREATE INDEX IF NOT EXISTS idx_audit_log_created ON audit_log(created_at DESC)`,

		// ========================================
		// MIGRATION 7: Trigger function for alert summary
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
				last_alert_at = CASE WHEN NEW.is_suspicious OR NEW.is_unknown THEN NOW() ELSE alert_summary.last_alert_at END,
				updated_at = NOW();

			RETURN NEW;
		END;
		$$ LANGUAGE plpgsql`,

		// ========================================
		// MIGRATION 8: Create trigger
		// ========================================
		`DROP TRIGGER IF EXISTS trigger_update_alert_summary ON process_logs`,
		`CREATE TRIGGER trigger_update_alert_summary
			AFTER INSERT ON process_logs
			FOR EACH ROW
			EXECUTE FUNCTION update_alert_summary()`,
	
			// ========================================
		// MIGRATION 9: Process reports table
		// ========================================
			`CREATE TABLE IF NOT EXISTS process_reports (
				id BIGSERIAL PRIMARY KEY,
				session_id VARCHAR(255) NOT NULL REFERENCES interview_sessions(session_id) ON DELETE CASCADE,
				processes JSONB,
				alert_count INTEGER DEFAULT 0,
				high_memory_alerts INTEGER DEFAULT 0,
				unknown_electron_alerts INTEGER DEFAULT 0,
				reported_at TIMESTAMP DEFAULT NOW(),
				created_at TIMESTAMP DEFAULT NOW()
			)`,
			`CREATE INDEX IF NOT EXISTS idx_process_reports_session ON process_reports(session_id)`,
			`CREATE INDEX IF NOT EXISTS idx_process_reports_reported ON process_reports(reported_at DESC)`,
		}



	for i, migration := range migrations {
		if _, err := db.Exec(migration); err != nil {
			return fmt.Errorf("migration %d failed: %w", i+1, err)
		}
	}

	log.Println("✅ Database migrations completed")
	return nil
}
