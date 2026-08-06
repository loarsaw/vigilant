export interface OnboardingFormData {
  phoneNumber: string;
  githubId: string;
  resumeLink: string;
  skills: string[];
  experienceYears: number;
}

export interface ValidationError {
  field: keyof OnboardingFormData;
  message: string;
}

export const validatePhoneNumber = (phone: string): string | null => {
  if (!phone.trim()) return "Phone number is required";
  const phoneRegex = /^[\d\s\-\+\(\)]{10,}$/;
  if (!phoneRegex.test(phone)) return "Enter a valid phone number";
  return null;
};

export const validateGithubId = (githubId: string): string | null => {
  if (!githubId.trim()) return "GitHub ID is required";
  const githubRegex = /^[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,37}[a-zA-Z0-9])?$/;
  if (!githubRegex.test(githubId)) return "GitHub ID must be valid";
  return null;
};

export const validateResumeLink = (link: string): string | null => {
  if (!link.trim()) return "Resume link is required";
  try {
    new URL(link);
    return null;
  } catch {
    return "Enter a valid URL";
  }
};

export const validateSkills = (skills: string[]): string | null => {
  if (skills.length === 0) return "Select at least one skill";
  return null;
};

export const validateExperienceYears = (years: number): string | null => {
  if (years < 0) return "Experience years cannot be negative";
  if (years > 60) return "Enter a realistic experience value";
  if (isNaN(years)) return "Experience years is required";
  return null;
};

export const validateForm = (data: OnboardingFormData): ValidationError[] => {
  const errors: ValidationError[] = [];

  const phoneError = validatePhoneNumber(data.phoneNumber);
  if (phoneError) errors.push({ field: "phoneNumber", message: phoneError });

  const githubError = validateGithubId(data.githubId);
  if (githubError) errors.push({ field: "githubId", message: githubError });

  const resumeError = validateResumeLink(data.resumeLink);
  if (resumeError) errors.push({ field: "resumeLink", message: resumeError });

  const skillsError = validateSkills(data.skills);
  if (skillsError) errors.push({ field: "skills", message: skillsError });

  const experienceError = validateExperienceYears(data.experienceYears);
  if (experienceError) errors.push({ field: "experienceYears", message: experienceError });

  return errors;
};
