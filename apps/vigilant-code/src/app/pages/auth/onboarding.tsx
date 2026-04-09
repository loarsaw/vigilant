import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { TECH_SKILLS } from '@/lib/constants';
import { OnboardingFormData, validateForm } from '@/lib/validation';
import { useNavigate } from 'react-router-dom';
import { Loader2, CheckCircle } from 'lucide-react';
import { useOnboarding } from '@/hooks/use-onboarding';

export default function OnboardingForm() {
  const router = useNavigate();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

const { completeOnboarding, isSubmitting, submitError } = useOnboarding()

  const [formData, setFormData] = useState<OnboardingFormData>({
    phoneNumber: '',
    githubId: '',
    resumeLink: '',
    skills: [],
    experienceYears: 0,
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === 'experienceYears' ? (value ? parseInt(value, 10) : 0) : value,
    }));
    if (fieldErrors[name]) {
      setFieldErrors((prev) => {
        const updated = { ...prev };
        delete updated[name];
        return updated;
      });
    }
  };

  const handleSkillToggle = (skill: string) => {
    setFormData((prev) => {
      const updated = prev.skills.includes(skill)
        ? prev.skills.filter((s) => s !== skill)
        : [...prev.skills, skill];
      return { ...prev, skills: updated };
    });
    if (fieldErrors.skills) {
      setFieldErrors((prev) => {
        const updated = { ...prev };
        delete updated.skills;
        return updated;
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
     e.preventDefault()
  setFieldErrors({})

  const errors = validateForm(formData)
  if (errors.length > 0) {
    const errorMap = errors.reduce((acc, err) => ({ ...acc, [err.field]: err.message }), {} as Record<string, string>)
    setFieldErrors(errorMap)
    return
  }

  try {
    await completeOnboarding({
      phone_number:     formData.phoneNumber,
      github_id:        formData.githubId,
      resume_link:      formData.resumeLink,
      skills:           formData.skills,      
      experience_years: formData.experienceYears,
    })
    setSuccess(true)
    setTimeout(() => router('/dashboard'), 500)
  } catch {}
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900 relative overflow-hidden px-4 py-12">
      {/* Background blobs */}
      <div className="absolute top-10 left-10 w-80 h-80 bg-blue-600 rounded-full mix-blend-multiply filter blur-3xl opacity-15 animate-pulse" />
      <div
        className="absolute bottom-10 right-10 w-96 h-96 bg-cyan-600 rounded-full mix-blend-multiply filter blur-3xl opacity-15 animate-pulse"
        style={{ animationDelay: '2s' }}
      />
      <div
        className="absolute top-1/2 right-1/4 w-72 h-72 bg-blue-700 rounded-full mix-blend-multiply filter blur-3xl opacity-10 animate-pulse"
        style={{ animationDelay: '1s' }}
      />

      <div className="relative z-10 w-full max-w-2xl">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Complete Your Profile</h1>
          <p className="text-slate-400 font-light">
            Provide your information to get started and join upcoming interviews
          </p>
        </div>

        {/* Card */}
        <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-700/50 rounded-2xl shadow-2xl p-8">
          <form onSubmit={handleSubmit} className="space-y-6">

            {/* Phone Number */}
            <div className="space-y-2">
              <Label htmlFor="phoneNumber" className="text-slate-300 font-medium text-sm">
                Phone Number <span className="text-red-400">*</span>
              </Label>
              <Input
                id="phoneNumber"
                name="phoneNumber"
                type="tel"
                placeholder="+1 (555) 000-0000"
                value={formData.phoneNumber}
                onChange={handleInputChange}
                disabled={success}
                className={`bg-slate-800/50 border text-white placeholder:text-slate-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent rounded-xl h-11 ${
                  fieldErrors.phoneNumber ? 'border-red-500/70' : 'border-slate-700'
                }`}
              />
              {fieldErrors.phoneNumber && (
                <p className="text-xs text-red-400">{fieldErrors.phoneNumber}</p>
              )}
            </div>

            {/* GitHub ID */}
            <div className="space-y-2">
              <Label htmlFor="githubId" className="text-slate-300 font-medium text-sm">
                GitHub ID <span className="text-red-400">*</span>
              </Label>
              <Input
                id="githubId"
                name="githubId"
                placeholder="your-github-username"
                value={formData.githubId}
                onChange={handleInputChange}
                disabled={success}
                className={`bg-slate-800/50 border text-white placeholder:text-slate-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent rounded-xl h-11 ${
                  fieldErrors.githubId ? 'border-red-500/70' : 'border-slate-700'
                }`}
              />
              {fieldErrors.githubId && (
                <p className="text-xs text-red-400">{fieldErrors.githubId}</p>
              )}
            </div>

            {/* Resume Link */}
            <div className="space-y-2">
              <Label htmlFor="resumeLink" className="text-slate-300 font-medium text-sm">
                Resume Link <span className="text-red-400">*</span>
              </Label>
              <Input
                id="resumeLink"
                name="resumeLink"
                type="url"
                placeholder="https://example.com/resume.pdf"
                value={formData.resumeLink}
                onChange={handleInputChange}
                disabled={success}
                className={`bg-slate-800/50 border text-white placeholder:text-slate-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent rounded-xl h-11 ${
                  fieldErrors.resumeLink ? 'border-red-500/70' : 'border-slate-700'
                }`}
              />
              {fieldErrors.resumeLink && (
                <p className="text-xs text-red-400">{fieldErrors.resumeLink}</p>
              )}
            </div>

            {/* Skills */}
            <div className="space-y-3">
              <Label className="text-slate-300 font-medium text-sm">
                Skills <span className="text-red-400">*</span>
              </Label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {TECH_SKILLS.map((skill) => (
                  <button
                    key={skill}
                    type="button"
                    onClick={() => handleSkillToggle(skill)}
                    disabled={success}
                    className={`px-3 py-2 rounded-xl border font-medium text-sm transition-all duration-200 ${
                      formData.skills.includes(skill)
                        ? 'bg-blue-600/30 border-blue-500 text-blue-300'
                        : 'bg-slate-800/50 border-slate-700 text-slate-400 hover:border-slate-500 hover:text-slate-300'
                    } ${success ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                  >
                    {skill}
                  </button>
                ))}
              </div>
              {fieldErrors.skills && (
                <p className="text-xs text-red-400">{fieldErrors.skills}</p>
              )}
            </div>

            {/* Experience Years */}
            <div className="space-y-2">
              <Label htmlFor="experienceYears" className="text-slate-300 font-medium text-sm">
                Years of Experience <span className="text-red-400">*</span>
              </Label>
              <Input
                id="experienceYears"
                name="experienceYears"
                type="number"
                min="0"
                max="60"
                placeholder="5"
                value={formData.experienceYears || ''}
                onChange={handleInputChange}
                disabled={success}
                className={`bg-slate-800/50 border text-white placeholder:text-slate-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent rounded-xl h-11 ${
                  fieldErrors.experienceYears ? 'border-red-500/70' : 'border-slate-700'
                }`}
              />
              {fieldErrors.experienceYears && (
                <p className="text-xs text-red-400">{fieldErrors.experienceYears}</p>
              )}
            </div>

            {/* Submit */}
            <Button
              type="submit"
              disabled={loading || success}
              className="w-full py-3 h-auto text-base font-semibold rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 text-white hover:from-blue-600 hover:to-blue-700 transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
            >
              {success ? (
                <span className="flex items-center justify-center gap-2">
                  <CheckCircle className="w-4 h-4" />
                  Profile Complete
                </span>
              ) : loading ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Submitting...
                </span>
              ) : (
                'Complete Profile'
              )}
            </Button>

            {success && (
              <p className="text-center text-sm text-emerald-400 font-medium">
                Redirecting to interviews...
              </p>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}