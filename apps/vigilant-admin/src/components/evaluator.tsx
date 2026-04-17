import React, { useState, ChangeEvent } from "react";
import { useInterview  } from "@/hooks/use-interview";
import { CreateInterviewFeedbackPayload } from "@/hooks/types";

interface EvaluationData {
  technicalSkills: number;
  communication: number;
  problemSolving: number;
  culturalFit: number;
}

interface ScoreEvaluatorProps {
  interviewSessionId: string;
}

const RECOMMENDATIONS = [
  { value: "hire", label: "Hire" },
  { value: "consider", label: "Consider" },
  { value: "no_hire", label: "No hire" },
] as const;

type Recommendation = (typeof RECOMMENDATIONS)[number]["value"] | "";

const ScoreEvaluator: React.FC<ScoreEvaluatorProps> = ({ interviewSessionId }) => {
  const { submitFeedbackAsync, isSubmittingFeedback, feedbackError } = useInterview();

  const [scores, setScores] = useState<EvaluationData>({
    technicalSkills: 85,
    communication: 90,
    problemSolving: 80,
    culturalFit: 88,
  });
  const [notes, setNotes] = useState("");
  const [recommendation, setRecommendation] = useState<Recommendation>("");
  const [submitSuccess, setSubmitSuccess] = useState(false);

  const handleSliderChange = (key: keyof EvaluationData, value: string): void => {
    setScores((prev) => ({ ...prev, [key]: parseInt(value, 10) }));
  };

  const overallScore: number = Math.round(
    Object.values(scores).reduce((a, b) => a + b, 0) / Object.keys(scores).length,
  );
  


  const handleSubmit = async () => {
    setSubmitSuccess(false);
    const payload: CreateInterviewFeedbackPayload = {
      interview_session_id: interviewSessionId,
      technical_skills_score: scores.technicalSkills,
      communication_score: scores.communication,
      problem_solving_score: scores.problemSolving,
      cultural_fit_score: scores.culturalFit,
      comments: notes.trim() || undefined,
      recommendation: recommendation || undefined,
    };
    try {
      await submitFeedbackAsync(payload);
      setSubmitSuccess(true);
    } catch {
    }
  };

  interface SliderProps {
    label: string;
    value: number;
    stateKey: keyof EvaluationData;
  }

  const ScoreSlider: React.FC<SliderProps> = ({ label, value, stateKey }) => (
    <div className="mb-6">
      <div className="flex justify-between mb-2">
        <span className="text-gray-300 font-medium">{label}</span>
        <span className="text-cyan-400 font-bold">{value}%</span>
      </div>
      <input
        type="range"
        min="0"
        max="100"
        step="1"
        value={value}
        onChange={(e: ChangeEvent<HTMLInputElement>) =>
          handleSliderChange(stateKey, e.target.value)
        }
        className="w-full h-1.5 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-cyan-500 hover:accent-cyan-400 transition-all"
      />
    </div>
  );

  return (
    <div className="bg-[#0f172a] p-8 rounded-xl w-full shadow-2xl border border-gray-800 font-sans">
      <h2 className="text-xl font-semibold text-white mb-8">Evaluation scores</h2>

      <ScoreSlider
        label="Technical skills"
        value={scores.technicalSkills}
        stateKey="technicalSkills"
      />
      <ScoreSlider label="Communication" value={scores.communication} stateKey="communication" />
      <ScoreSlider
        label="Problem solving"
        value={scores.problemSolving}
        stateKey="problemSolving"
      />
      <ScoreSlider label="Cultural fit" value={scores.culturalFit} stateKey="culturalFit" />

      <hr className="border-gray-800 my-6" />

      <div className="flex justify-between items-center mb-8">
        <span className="text-white font-bold text-lg uppercase tracking-wider">Overall score</span>
        <span className="text-cyan-400 text-3xl font-black">
          {overallScore}
          <span className="text-gray-500 text-xl ml-1">/100</span>
        </span>
      </div>

      <hr className="border-gray-800 my-6" />

      <div className="mb-6">
        <p className="text-gray-400 text-sm mb-3">Recommendation</p>
        <div className="flex gap-3">
          {RECOMMENDATIONS.map(({ value, label }) => (
            <button
              key={value}
              onClick={() => setRecommendation(value)}
              className={`flex-1 py-2 rounded-lg border text-sm font-medium transition-all ${
                recommendation === value
                  ? value === "hire"
                    ? "border-emerald-500 bg-emerald-500/10 text-emerald-400"
                    : value === "consider"
                      ? "border-amber-500 bg-amber-500/10 text-amber-400"
                      : "border-red-500 bg-red-500/10 text-red-400"
                  : "border-gray-700 text-gray-400 hover:border-gray-500"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Notes */}
      <div className="mb-6">
        <p className="text-gray-400 text-sm mb-2">Notes</p>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Add observations, strengths, areas of concern…"
          rows={4}
          className="w-full bg-gray-900 border border-gray-700 rounded-lg p-3 text-gray-200 text-sm placeholder-gray-600 resize-none focus:outline-none focus:border-cyan-500 transition-colors"
        />
      </div>

      {/* Feedback */}
      {feedbackError && <p className="text-red-400 text-sm mb-4">{feedbackError}</p>}
      {submitSuccess && (
        <p className="text-emerald-400 text-sm mb-4">Feedback submitted successfully.</p>
      )}

      <button
        onClick={handleSubmit}
        disabled={isSubmittingFeedback}
        className="w-full py-3 rounded-lg bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold text-sm transition-colors"
      >
        {isSubmittingFeedback ? "Submitting…" : "Submit feedback"}
      </button>
    </div>
  );
};

export default ScoreEvaluator;
