import { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { Loader2, CheckCircle } from 'lucide-react';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { TECH_SKILLS } from '@/lib/constants';
import { OnboardingFormData, validateForm } from '@/lib/validation';
import { useOnboarding } from '@/hooks/use-onboarding';

export default function OnboardingForm() {
  const router = useNavigate();
  const [success, setSuccess] = useState(false);
  const { completeOnboarding, isSubmitting } = useOnboarding();

  const {
    register,
    handleSubmit,
    control,
    setValue,
    watch,
    setError,
    clearErrors,
    formState: { errors },
  } = useForm<OnboardingFormData>({
    defaultValues: {
      phoneNumber: '',
      githubId: '',
      resumeLink: '',
      skills: [],
      experienceYears: 0,
    },
    resolver: async (values) => {
      const validationErrors = validateForm(values);
      if (validationErrors.length === 0) return { values, errors: {} };

      return {
        values: {},
        errors: validationErrors.reduce((acc, err) => ({
          ...acc,
          [err.field]: { type: 'manual', message: err.message }
        }), {}),
      };
    }
  });

  const watchedSkills = watch('skills');

  const handleSkillToggle = (skill: string) => {
    const currentSkills = watchedSkills;
    const updatedSkills = currentSkills.includes(skill)
      ? currentSkills.filter((s) => s !== skill)
      : [...currentSkills, skill];
    
    setValue('skills', updatedSkills, { shouldValidate: true });
  };

  const onSubmit = async (data: OnboardingFormData) => {
    try {
      await completeOnboarding({
        phone_number: data.phoneNumber,
        github_id: data.githubId,
        resume_link: data.resumeLink,
        skills: data.skills,
        experience_years: data.experienceYears,
      });
      setSuccess(true);
      setTimeout(() => router('/dashboard'), 1500);
    } catch (err) {
      console.error("Submission failed", err);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900 relative overflow-hidden px-4 py-12">
      {/* Background blobs */}
      <div className="absolute top-10 left-10 w-80 h-80 bg-blue-600 rounded-full mix-blend-multiply filter blur-3xl opacity-15 animate-pulse" />
      <div className="absolute bottom-10 right-10 w-96 h-96 bg-cyan-600 rounded-full mix-blend-multiply filter blur-3xl opacity-15 animate-pulse" style={{ animationDelay: '2s' }} />

      <div className="relative z-10 w-full max-w-2xl">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Complete Your Profile</h1>
          <p className="text-slate-400 font-light">Provide your information to get started</p>
        </div>

        <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-700/50 rounded-2xl shadow-2xl p-8">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            
            {/* Phone Number */}
            <div className="space-y-2">
              <Label htmlFor="phoneNumber" className="text-slate-300 font-medium text-sm">
                Phone Number <span className="text-red-400">*</span>
              </Label>
              <Input
                {...register('phoneNumber')}
                id="phoneNumber"
                type="tel"
                placeholder="+1 (555) 000-0000"
                disabled={success || isSubmitting}
                className={`bg-slate-800/50 border text-white placeholder:text-slate-500 focus:ring-2 focus:ring-blue-500 rounded-xl h-11 ${
                  errors.phoneNumber ? 'border-red-500/70' : 'border-slate-700'
                }`}
              />
              {errors.phoneNumber && <p className="text-xs text-red-400">{errors.phoneNumber.message}</p>}
            </div>

            {/* GitHub ID */}
            <div className="space-y-2">
              <Label htmlFor="githubId" className="text-slate-300 font-medium text-sm">
                GitHub ID <span className="text-red-400">*</span>
              </Label>
              <Input
                {...register('githubId')}
                id="githubId"
                placeholder="your-github-username"
                disabled={success || isSubmitting}
                className={`bg-slate-800/50 border text-white placeholder:text-slate-500 focus:ring-2 focus:ring-blue-500 rounded-xl h-11 ${
                  errors.githubId ? 'border-red-500/70' : 'border-slate-700'
                }`}
              />
              {errors.githubId && <p className="text-xs text-red-400">{errors.githubId.message}</p>}
            </div>

            {/* Resume Link */}
            <div className="space-y-2">
              <Label htmlFor="resumeLink" className="text-slate-300 font-medium text-sm">
                Resume Link <span className="text-red-400">*</span>
              </Label>
              <Input
                {...register('resumeLink')}
                id="resumeLink"
                type="url"
                disabled={success || isSubmitting}
                className={`bg-slate-800/50 border text-white placeholder:text-slate-500 focus:ring-2 focus:ring-blue-500 rounded-xl h-11 ${
                  errors.resumeLink ? 'border-red-500/70' : 'border-slate-700'
                }`}
              />
              {errors.resumeLink && <p className="text-xs text-red-400">{errors.resumeLink.message}</p>}
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
                    disabled={success || isSubmitting}
                    className={`px-3 py-2 rounded-xl border font-medium text-sm transition-all duration-200 ${
                      watchedSkills.includes(skill)
                        ? 'bg-blue-600/30 border-blue-500 text-blue-300'
                        : 'bg-slate-800/50 border-slate-700 text-slate-400 hover:border-slate-500'
                    } ${(success || isSubmitting) ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                  >
                    {skill}
                  </button>
                ))}
              </div>
              {errors.skills && <p className="text-xs text-red-400">{errors.skills.message}</p>}
            </div>

            {/* Experience Years */}
            <div className="space-y-2">
              <Label htmlFor="experienceYears" className="text-slate-300 font-medium text-sm">
                Years of Experience <span className="text-red-400">*</span>
              </Label>
              <Input
                {...register('experienceYears', { valueAsNumber: true })}
                id="experienceYears"
                type="number"
                placeholder="5"
                disabled={success || isSubmitting}
                className={`bg-slate-800/50 border text-white placeholder:text-slate-500 focus:ring-2 focus:ring-blue-500 rounded-xl h-11 ${
                  errors.experienceYears ? 'border-red-500/70' : 'border-slate-700'
                }`}
              />
              {errors.experienceYears && <p className="text-xs text-red-400">{errors.experienceYears.message}</p>}
            </div>

            {/* Submit */}
            <Button
              type="submit"
              disabled={isSubmitting || success}
              className="w-full py-3 h-auto text-base font-semibold rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 text-white hover:from-blue-600 hover:to-blue-700 transition-all duration-300 shadow-lg"
            >
              {success ? (
                <span className="flex items-center justify-center gap-2">
                  <CheckCircle className="w-4 h-4" /> Profile Complete
                </span>
              ) : isSubmitting ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" /> Submitting...
                </span>
              ) : (
                'Complete Profile'
              )}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}