import { useState, useEffect } from "react";
import { Loader2, AlertCircle, RotateCcw, Sparkles } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";
import { RichTextEditor } from "@/components/rich-text-editor";
import { CreatePositionPayload, HiringPosition } from "@/hooks/types";
import { useDraftPersistence } from "@/hooks/use-draft";
import { useGenerateJobDescription } from "@/hooks/use-generate-job-desc";

interface PositionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingPosition: HiringPosition | null;
  onSave: (payload: CreatePositionPayload) => void;
  isLoading: boolean;
}

const EMPTY_FORM: CreatePositionPayload = {
  position_title: "",
  department: "",
  location: "",
  employment_type: "full-time",
  experience_required: "",
  salary_range_min: 0,
  salary_range_max: 0,
  salary_range_text: "",
  number_of_openings: 1,
  job_description: "",
  requirements: "",
};

const CURRENCY_OPTIONS = [
  { code: "INR", symbol: "₹" },
  { code: "USD", symbol: "$" },
  { code: "EUR", symbol: "€" },
  { code: "GBP", symbol: "£" },
];

const TONE_OPTIONS = [
  { value: "professional", label: "Professional" },
  { value: "casual", label: "Casual" },
  { value: "enthusiastic", label: "Enthusiastic" },
];

const DRAFT_KEY = "hiring:new-position-draft";

function formatAmount(value: number, currencyCode: string) {
  if (!value) return "0";
  const locale = currencyCode === "INR" ? "en-IN" : "en-US";
  return new Intl.NumberFormat(locale).format(value);
}

export function PositionDialog({
  open,
  onOpenChange,
  editingPosition,
  onSave,
  isLoading,
}: PositionDialogProps) {
  const [formData, setFormData] = useState<CreatePositionPayload>(EMPTY_FORM);
  const [currency, setCurrency] = useState<string>("INR");
  const [draftBanner, setDraftBanner] = useState<"none" | "offered">("none");

  // Auto-generate popover state
  const [aiPopoverOpen, setAiPopoverOpen] = useState(false);
  const [tone, setTone] = useState("professional");
  const [aiNotes, setAiNotes] = useState("");

  const isDraftable = open && !editingPosition;

  const { loadDraft, clearDraft } = useDraftPersistence({
    key: DRAFT_KEY,
    data: formData,
    enabled: isDraftable,
  });

  const {
    generateJobDescriptionAsync,
    isGeneratingDescription,
    generateDescriptionError,
    resetGenerateDescription,
  } = useGenerateJobDescription();

  // Sync form data when editingPosition changes or dialog opens
  useEffect(() => {
    if (editingPosition) {
      setFormData({
        position_title: editingPosition.position_title,
        department: editingPosition.department,
        location: editingPosition.location,
        employment_type: editingPosition.employment_type,
        experience_required: editingPosition.experience_required,
        salary_range_min: editingPosition.salary_range_min,
        salary_range_max: editingPosition.salary_range_max,
        salary_range_text: editingPosition.salary_range_text,
        number_of_openings: editingPosition.number_of_openings,
        job_description: editingPosition.job_description,
        requirements: editingPosition.requirements,
      });
      setDraftBanner("none");
    } else if (open) {
      const draft = loadDraft();
      if (draft) {
        setFormData(draft);
        setDraftBanner("offered");
      } else {
        setFormData(EMPTY_FORM);
        setDraftBanner("none");
      }
    }
    if (open) resetGenerateDescription();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editingPosition, open]);

  const currencySymbol = CURRENCY_OPTIONS.find((c) => c.code === currency)?.symbol ?? "₹";

  const salaryError =
    formData.salary_range_min > 0 &&
    formData.salary_range_max > 0 &&
    formData.salary_range_max < formData.salary_range_min
      ? "Max salary can't be less than min salary."
      : null;

  const isValid =
    !!formData.position_title &&
    !!formData.department &&
    !!formData.location &&
    !!formData.job_description &&
    formData.job_description !== "<p></p>" &&
    !salaryError;

  const applySuggestedSalaryText = () => {
    if (!formData.salary_range_min && !formData.salary_range_max) return;
    if (salaryError) return;
    const min = formatAmount(formData.salary_range_min, currency);
    const max = formatAmount(formData.salary_range_max, currency);
    setFormData((prev) => ({
      ...prev,
      salary_range_text: `${currencySymbol}${min} – ${currencySymbol}${max}`,
    }));
  };

  const discardDraft = () => {
    clearDraft();
    setFormData(EMPTY_FORM);
    setDraftBanner("none");
  };

  const handleSave = () => onSave(formData);

  // const canGenerate = !!formData.position_title && !isGeneratingDescription;

  const handleGenerate = async () => {
    try {
      const result = await generateJobDescriptionAsync({
        position_title: formData.position_title,
        department: formData.department,
        location: formData.location,
        employment_type: formData.employment_type,
        experience_required: formData.experience_required,
        requirements: formData.requirements,
      });
      setFormData((prev) => ({ ...prev, job_description: result.job_description }));
    } catch {
      // error surfaces via generateDescriptionError below the editor
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="bg-card border-border/60 text-foreground max-w-2xl max-h-[90vh] overflow-y-auto
          [&::-webkit-scrollbar]:w-2
          [&::-webkit-scrollbar-track]:bg-transparent
          [&::-webkit-scrollbar-thumb]:bg-border
          [&::-webkit-scrollbar-thumb]:rounded-full
          [&::-webkit-scrollbar-thumb]:hover:bg-muted-foreground/40
          [scrollbar-width:thin]
          [scrollbar-color:hsl(var(--border))_transparent]"
      >
        <DialogHeader>
          <DialogTitle className="font-display tracking-wide">
            {editingPosition ? "Edit Position" : "Add New Position"}
          </DialogTitle>
        </DialogHeader>

        {draftBanner === "offered" && (
          <div className="flex items-center justify-between gap-3 rounded-lg border border-primary/30 bg-primary/10 px-3 py-2 text-sm">
            <span className="text-foreground/90">Restored an unsaved draft from earlier.</span>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-muted-foreground hover:text-foreground shrink-0"
              onClick={discardDraft}
            >
              <RotateCcw className="h-3.5 w-3.5 mr-1.5" /> Discard draft
            </Button>
          </div>
        )}

        <div className="space-y-4 mt-4">
          <div>
            <Label>Position Title *</Label>
            <Input
              placeholder="Backend Engineer"
              value={formData.position_title}
              onChange={(e) => setFormData({ ...formData, position_title: e.target.value })}
              className="bg-input border-border mt-1"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Department *</Label>
              <Input
                placeholder="Engineering"
                value={formData.department}
                onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                className="bg-input border-border mt-1"
              />
            </div>
            <div>
              <Label>Location *</Label>
              <Input
                placeholder="Remote"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                className="bg-input border-border mt-1"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Employment Type *</Label>
              <select
                value={formData.employment_type}
                onChange={(e) => setFormData({ ...formData, employment_type: e.target.value })}
                className="w-full mt-1 px-4 py-2 bg-input border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="full-time">Full-time</option>
                <option value="part-time">Part-time</option>
                <option value="contract">Contract</option>
                <option value="internship">Internship</option>
              </select>
            </div>
            <div>
              <Label>Experience Required *</Label>
              <Input
                placeholder="3-5 years"
                value={formData.experience_required}
                onChange={(e) => setFormData({ ...formData, experience_required: e.target.value })}
                className="bg-input border-border mt-1"
              />
            </div>
          </div>

          <div>
            <Label>Currency</Label>
            <Select value={currency} onValueChange={setCurrency}>
              <SelectTrigger className="w-full mt-1 bg-input border-border text-foreground">
                <SelectValue placeholder="Currency" />
              </SelectTrigger>
              <SelectContent>
                {CURRENCY_OPTIONS.map((c) => (
                  <SelectItem key={c.code} value={c.code}>
                    {c.symbol} {c.code}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label>Min Salary ({currencySymbol})</Label>
              <div className="relative mt-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                  {currencySymbol}
                </span>
                <Input
                  type="number"
                  placeholder="120000"
                  value={formData.salary_range_min || ""}
                  onChange={(e) =>
                    setFormData({ ...formData, salary_range_min: Number(e.target.value) })
                  }
                  onBlur={applySuggestedSalaryText}
                  className={`bg-input pl-7 ${
                    salaryError ? "border-[hsl(var(--destructive))]" : "border-border"
                  }`}
                />
              </div>
            </div>
            <div>
              <Label>Max Salary ({currencySymbol})</Label>
              <div className="relative mt-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                  {currencySymbol}
                </span>
                <Input
                  type="number"
                  placeholder="160000"
                  value={formData.salary_range_max || ""}
                  onChange={(e) =>
                    setFormData({ ...formData, salary_range_max: Number(e.target.value) })
                  }
                  onBlur={applySuggestedSalaryText}
                  className={`bg-input pl-7 ${
                    salaryError ? "border-[hsl(var(--destructive))]" : "border-border"
                  }`}
                />
              </div>
            </div>
            <div>
              <Label>Salary Display Text</Label>
              <Input
                placeholder={`${currencySymbol}1,20,000 – ${currencySymbol}1,60,000`}
                value={formData.salary_range_text}
                onChange={(e) => setFormData({ ...formData, salary_range_text: e.target.value })}
                className="bg-input border-border mt-1"
              />
            </div>
          </div>

          {salaryError ? (
            <p className="flex items-center gap-1.5 text-sm text-[hsl(var(--destructive))] -mt-2">
              <AlertCircle className="h-3.5 w-3.5 shrink-0" /> {salaryError}
            </p>
          ) : (
            <p className="text-xs text-muted-foreground -mt-2">
              Salary text auto-fills from min/max when you leave those fields — edit freely after.
            </p>
          )}

          <div>
            <Label>Number of Openings *</Label>
            <Input
              type="number"
              min="1"
              value={formData.number_of_openings}
              onChange={(e) =>
                setFormData({ ...formData, number_of_openings: parseInt(e.target.value) || 1 })
              }
              className="bg-input border-border mt-1"
            />
          </div>

          {/* Job Description with inline auto-generate */}
          {/* Job Description with inline auto-generate */}
          <div>
            <div className="flex items-center justify-between">
              <Label>Job Description *</Label>

              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 gap-1.5 text-xs text-primary hover:text-primary hover:bg-primary/10"
                onClick={handleGenerate}
                disabled={!formData.position_title || isGeneratingDescription}
              >
                {isGeneratingDescription ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" /> Generating…
                  </>
                ) : (
                  <>
                    <Sparkles className="h-3.5 w-3.5" /> Auto-generate
                  </>
                )}
              </Button>
            </div>

            <div className="mt-1">
              <RichTextEditor
                value={formData.job_description}
                onChange={(html) => setFormData({ ...formData, job_description: html })}
                placeholder="Describe the role and responsibilities…"
              />
            </div>

            {generateDescriptionError && (
              <p className="flex items-center gap-1.5 text-xs text-[hsl(var(--destructive))] mt-1.5">
                <AlertCircle className="h-3.5 w-3.5 shrink-0" /> {generateDescriptionError}
              </p>
            )}
          </div>

          <div>
            <Label>Requirements (comma-separated) *</Label>
            <Textarea
              placeholder="React, TypeScript, Node.js, AWS"
              value={formData.requirements}
              onChange={(e) => setFormData({ ...formData, requirements: e.target.value })}
              className="bg-input border-border mt-1"
            />
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              className="flex-1 font-display font-semibold tracking-wide"
              onClick={handleSave}
              disabled={isLoading || !isValid}
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Saving…
                </>
              ) : editingPosition ? (
                "Update Position"
              ) : (
                "Add Position"
              )}
            </Button>
            <Button
              variant="outline"
              className="flex-1 font-display font-semibold tracking-wide"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
