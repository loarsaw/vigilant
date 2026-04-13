import { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { HiringPosition, CreatePositionPayload } from "@/hooks/use-hiring";

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

export function PositionDialog({
  open,
  onOpenChange,
  editingPosition,
  onSave,
  isLoading,
}: PositionDialogProps) {
  const [formData, setFormData] = useState<CreatePositionPayload>(EMPTY_FORM);

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
    } else {
      setFormData(EMPTY_FORM);
    }
  }, [editingPosition, open]);

  const isValid = formData.position_title && formData.department && formData.location;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-[#1a1f2e] border-gray-800 text-white max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editingPosition ? "Edit Position" : "Add New Position"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          <div>
            <Label>Position Title *</Label>
            <Input
              placeholder="Backend Engineer"
              value={formData.position_title}
              onChange={(e) => setFormData({ ...formData, position_title: e.target.value })}
              className="bg-[#0f1419] border-gray-700 mt-1"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Department *</Label>
              <Input
                placeholder="Engineering"
                value={formData.department}
                onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                className="bg-[#0f1419] border-gray-700 mt-1"
              />
            </div>
            <div>
              <Label>Location *</Label>
              <Input
                placeholder="Remote"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                className="bg-[#0f1419] border-gray-700 mt-1"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Employment Type *</Label>
              <select
                value={formData.employment_type}
                onChange={(e) => setFormData({ ...formData, employment_type: e.target.value })}
                className="w-full mt-1 px-4 py-2 bg-[#0f1419] border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-400"
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
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    experience_required: e.target.value,
                  })
                }
                className="bg-[#0f1419] border-gray-700 mt-1"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label>Min Salary ($)</Label>
              <Input
                type="number"
                value={formData.salary_range_min || ""}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    salary_range_min: Number(e.target.value),
                  })
                }
                className="bg-[#0f1419] border-gray-700 mt-1"
              />
            </div>
            <div>
              <Label>Max Salary ($)</Label>
              <Input
                type="number"
                value={formData.salary_range_max || ""}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    salary_range_max: Number(e.target.value),
                  })
                }
                className="bg-[#0f1419] border-gray-700 mt-1"
              />
            </div>
            <div>
              <Label>Salary Display Text</Label>
              <Input
                placeholder="$120k – $160k"
                value={formData.salary_range_text}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    salary_range_text: e.target.value,
                  })
                }
                className="bg-[#0f1419] border-gray-700 mt-1"
              />
            </div>
          </div>

          <div>
            <Label>Job Description *</Label>
            <Textarea
              placeholder="Describe the role..."
              value={formData.job_description}
              onChange={(e) => setFormData({ ...formData, job_description: e.target.value })}
              className="bg-[#0f1419] border-gray-700 mt-1 min-h-24"
            />
          </div>

          <div>
            <Label>Requirements (comma-separated) *</Label>
            <Textarea
              placeholder="React, TypeScript..."
              value={formData.requirements}
              onChange={(e) => setFormData({ ...formData, requirements: e.target.value })}
              className="bg-[#0f1419] border-gray-700 mt-1"
            />
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              className="flex-1 bg-cyan-400 hover:bg-cyan-500 text-[#1a1f2e]"
              onClick={() => onSave(formData)}
              disabled={isLoading || !isValid}
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : editingPosition ? (
                "Update Position"
              ) : (
                "Add Position"
              )}
            </Button>
            <Button
              variant="outline"
              className="flex-1 border-gray-700"
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
