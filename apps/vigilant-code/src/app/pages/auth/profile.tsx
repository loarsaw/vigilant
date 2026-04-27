import { useState } from "react";
import { useProfile } from "@/hooks/use-profile";
import { UpdateProfilePayload } from "@/hooks/types";
import { ChevronLeft } from "lucide-react"; // Ensure lucide-react is installed

function formatDate(iso: string) {
  if (!iso || iso.startsWith("0001")) return "—";
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function Profile() {
  const { profile, isLoading, isError, updateProfile, isUpdating, isUpdateSuccess, updateError } =
    useProfile();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<UpdateProfilePayload>({});

  if (isLoading)
    return (
      <div className="min-h-screen flex items-center justify-center text-blue-400 animate-pulse bg-slate-950">
        Loading profile...
      </div>
    );
  if (isError || !profile)
    return (
      <div className="min-h-screen flex items-center justify-center text-red-400 bg-slate-950">
        Failed to load profile.
      </div>
    );

  function startEdit() {
    setForm({
      full_name: profile!.full_name,
      github_url: profile!.github_url,
      phone_number: profile!.phone_number,
      resume_url: profile!.resume_url,
      skills: profile!.skills,
      experience_years: profile!.experience_years,
    });
    setEditing(true);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    updateProfile(form, { onSuccess: () => setEditing(false) });
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900 relative overflow-hidden p-4">
      {/* Background Accents */}
      <div className="absolute top-10 left-10 w-80 h-80 bg-blue-600 rounded-full mix-blend-multiply filter blur-3xl opacity-10 animate-pulse" />
      <div
        className="absolute bottom-10 right-10 w-96 h-96 bg-cyan-600 rounded-full mix-blend-multiply filter blur-3xl opacity-10 animate-pulse"
        style={{ animationDelay: "2s" }}
      />

      <div className="relative z-10 w-full max-w-2xl bg-white/5 border border-white/10 backdrop-blur-xl rounded-2xl shadow-2xl p-8 space-y-6">
        {/* Navigation & Header */}
        <div className="space-y-6">
          <button
            onClick={() => window.history.back()}
            className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors group"
          >
            <div className="p-1.5 rounded-lg bg-white/5 border border-white/10 group-hover:bg-white/10">
              <ChevronLeft size={16} />
            </div>
            <span className="text-xs font-semibold uppercase tracking-wider">
              Back to Dashboard
            </span>
          </button>

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-6">
            <div>
              <h2 className="text-2xl font-bold text-white tracking-tight">
                {profile.full_name || "Guest User"}
              </h2>
              <p className="text-blue-400/80 text-sm font-medium">{profile.email}</p>
            </div>
            <div className="flex gap-2">
              <Badge
                active={profile.is_active}
                label={profile.is_active ? "Active" : "Inactive"}
                color="green"
              />
              <Badge active={profile.onboarding_complete} label="Onboarded" color="blue" />
            </div>
          </div>
        </div>

        {/* Read View */}
        {!editing ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
            <Field label="Phone Number" value={profile.phone_number} />
            <Field label="GitHub Profile" value={profile.github_url} isLink />
            <Field label="Resume" value={profile.resume_url} isLink />
            <Field
              label="Experience"
              value={
                profile.experience_years != null
                  ? `${profile.experience_years} Year${profile.experience_years !== 1 ? "s" : ""}`
                  : null
              }
            />

            <div className="col-span-full">
              <span className="text-slate-400 text-xs font-semibold uppercase tracking-wider">
                Skills
              </span>
              <div className="mt-3 flex flex-wrap gap-2">
                {profile.skills ? (
                  profile.skills.split(",").map((s) => (
                    <span
                      key={s}
                      className="bg-blue-500/10 border border-blue-500/20 text-blue-300 text-xs px-3 py-1 rounded-md"
                    >
                      {s.trim()}
                    </span>
                  ))
                ) : (
                  <span className="text-slate-500 italic text-sm">No skills listed</span>
                )}
              </div>
            </div>

            <div className="col-span-full pt-4 grid grid-cols-2 gap-4 border-t border-white/5">
              <Field label="Last Login" value={formatDate(profile.last_login)} />
              <Field label="Member Since" value={formatDate(profile.created_at)} />
            </div>

            <button
              onClick={startEdit}
              className="mt-4 col-span-full w-full md:w-max px-8 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-sm font-semibold transition-all shadow-lg shadow-blue-900/20"
            >
              Edit Profile
            </button>
          </div>
        ) : (
          /* Edit Form */
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <EditField
                label="Full Name"
                name="full_name"
                value={form.full_name ?? ""}
                onChange={(e: any) => setForm({ ...form, full_name: e.target.value })}
              />
              <EditField
                label="Phone"
                name="phone_number"
                value={form.phone_number ?? ""}
                onChange={(e: any) => setForm({ ...form, phone_number: e.target.value })}
              />
              <EditField
                label="GitHub URL"
                name="github_url"
                value={form.github_url ?? ""}
                onChange={(e: any) => setForm({ ...form, github_url: e.target.value })}
              />
              <EditField
                label="Resume URL"
                name="resume_url"
                value={form.resume_url ?? ""}
                onChange={(e: any) => setForm({ ...form, resume_url: e.target.value })}
              />
              <EditField
                label="Skills"
                name="skills"
                value={form.skills ?? ""}
                onChange={(e: any) => setForm({ ...form, skills: e.target.value })}
              />
              <EditField
                label="Experience (Years)"
                name="experience_years"
                type="number"
                value={String(form.experience_years ?? "")}
                onChange={(e: any) =>
                  setForm({ ...form, experience_years: Number(e.target.value) })
                }
              />
            </div>

            {updateError && (
              <p className="text-red-400 text-xs bg-red-400/10 p-3 rounded-lg border border-red-400/20">
                {updateError}
              </p>
            )}

            <div className="flex gap-3 pt-4">
              <button
                type="submit"
                disabled={isUpdating}
                className="flex-1 px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-sm font-bold transition-all disabled:opacity-50"
              >
                {isUpdating ? "Saving..." : "Save Profile"}
              </button>
              <button
                type="button"
                onClick={() => setEditing(false)}
                className="px-6 py-3 bg-white/5 hover:bg-white/10 text-slate-300 rounded-xl text-sm font-semibold transition-all border border-white/10"
              >
                Cancel
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

// Sub-components (Field, EditField, Badge) remain the same as previous response...
function Field({
  label,
  value,
  isLink,
}: {
  label: string;
  value: string | null | undefined;
  isLink?: boolean;
}) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-slate-400 text-xs font-semibold uppercase tracking-wider">{label}</span>
      {isLink && value ? (
        <a
          href={value}
          target="_blank"
          rel="noreferrer"
          className="text-blue-400 hover:text-blue-300 transition-colors text-sm truncate"
        >
          {value}
        </a>
      ) : (
        <p className="text-slate-200 text-sm font-medium">{value || "—"}</p>
      )}
    </div>
  );
}

function EditField({ label, name, value, onChange, type = "text" }: any) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-slate-400 text-xs font-semibold uppercase tracking-wider ml-1">
        {label}
      </label>
      <input
        type={type}
        name={name}
        value={value}
        onChange={onChange}
        className="w-full bg-slate-900/50 border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
      />
    </div>
  );
}

function Badge({
  active,
  label,
  color,
}: {
  active: boolean;
  label: string;
  color: "green" | "blue";
}) {
  const styles = {
    green: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    blue: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  };
  return (
    <span
      className={`text-[10px] uppercase tracking-widest px-2.5 py-1 rounded-full border font-bold ${styles[color]}`}
    >
      {label}
    </span>
  );
}
