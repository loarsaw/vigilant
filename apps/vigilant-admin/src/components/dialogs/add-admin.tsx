import { useState } from "react";
import { Loader2 } from "lucide-react";
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

interface AddAdminDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdd: (data: any, options: { onSuccess: () => void }) => void;
  isLoading: boolean;
}

export function AddAdminDialog({ open, onOpenChange, onAdd, isLoading }: AddAdminDialogProps) {
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    full_name: "",
    role: "hr" as "hr" | "interviewer",
    department: "",
    designation: "",
    phone_number: "",
  });

  const handleSubmit = () => {
    if (!formData.full_name || !formData.email || formData.password.length < 8) return;

    onAdd(formData, {
      onSuccess: () => {
        setFormData({
          email: "",
          password: "",
          full_name: "",
          role: "hr",
          department: "",
          designation: "",
          phone_number: "",
        });
        onOpenChange(false);
      },
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-[#1a1f2e] border-gray-800 text-white max-w-2xl">
        <DialogHeader>
          <DialogTitle>Add New Admin User</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Full Name *</Label>
              <Input
                placeholder="John Doe"
                value={formData.full_name}
                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                className="bg-[#0f1419] border-gray-700 mt-1"
              />
            </div>
            <div>
              <Label>Email *</Label>
              <Input
                type="email"
                placeholder="john@company.com"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="bg-[#0f1419] border-gray-700 mt-1"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Password *</Label>
              <Input
                type="password"
                placeholder="••••••••"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="bg-[#0f1419] border-gray-700 mt-1"
              />
              <p className="text-xs text-gray-500 mt-1">Minimum 8 characters</p>
            </div>
            <div>
              <Label>Role *</Label>
              <Select
                value={formData.role}
                onValueChange={(v) => setFormData({ ...formData, role: v as "hr" | "interviewer" })}
              >
                <SelectTrigger className="bg-[#0f1419] border-gray-700 text-white mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="hr">HR</SelectItem>
                  <SelectItem value="interviewer">Interviewer</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Department</Label>
              <Input
                placeholder="e.g., Engineering"
                value={formData.department}
                onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                className="bg-[#0f1419] border-gray-700 mt-1"
              />
            </div>
            <div>
              <Label>Designation</Label>
              <Input
                placeholder="e.g., Senior Manager"
                value={formData.designation}
                onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
                className="bg-[#0f1419] border-gray-700 mt-1"
              />
            </div>
          </div>

          <div>
            <Label>Phone Number</Label>
            <Input
              placeholder="+1-555-0123"
              value={formData.phone_number}
              onChange={(e) => setFormData({ ...formData, phone_number: e.target.value })}
              className="bg-[#0f1419] border-gray-700 mt-1"
            />
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              className="flex-1 bg-cyan-400 hover:bg-cyan-500 text-[#1a1f2e]"
              onClick={handleSubmit}
              disabled={
                isLoading || !formData.full_name || !formData.email || formData.password.length < 8
              }
            >
              {isLoading ? <Loader2 className="animate-spin h-4 w-4" /> : "Create Admin User"}
            </Button>
            <Button
              variant="outline"
              className="flex-1 border-gray-700 text-white"
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
