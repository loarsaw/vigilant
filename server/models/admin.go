// server/models/admin.go
package models

import (
	"database/sql"
	"time"

	"github.com/google/uuid"
)

// ========================================
// ADMINISTRATOR MODELS
// ========================================

type Administrator struct {
	ID           string         `json:"id"`
	Email        string         `json:"email"`
	PasswordHash string         `json:"-"`
	FullName     string         `json:"full_name"`
	PhoneNumber  sql.NullString `json:"phone_number,omitempty"`
	Role         string         `json:"role"`
	Department   sql.NullString `json:"department,omitempty"`
	Designation  sql.NullString `json:"designation,omitempty"`
	IsActive     bool           `json:"is_active"`
	LastLogin    sql.NullTime   `json:"last_login,omitempty"`
	CreatedAt    time.Time      `json:"created_at"`
	UpdatedAt    time.Time      `json:"updated_at"`
	CreatedBy    uuid.NullUUID  `json:"created_by,omitempty"`
}

type AdministratorRegister struct {
	Email       string `json:"email" validate:"required,email"`
	Password    string `json:"password" validate:"required,min=8"`
	FullName    string `json:"full_name" validate:"required"`
	Role        string `json:"role" validate:"required,oneof=hr interviewer"`
	Department  string `json:"department,omitempty"`
	Designation string `json:"designation,omitempty"`
	PhoneNumber string `json:"phone_number,omitempty"`
}

type AdminUpdatePasswordRequest struct {
	NewPassword string `json:"new_password" binding:"required,min=8,max=72"`
}
