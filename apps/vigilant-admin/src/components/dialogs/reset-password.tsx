import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface ResetPasswordDialogProps {
  adminId: string | null;
  onOpenChange: (open: boolean) => void;
  onReset: (params: { id: string; payload: any }, options: any) => void;
  isLoading: boolean;
}

export function ResetPasswordDialog({
  adminId,
  onOpenChange,
  onReset,
  isLoading,
}: ResetPasswordDialogProps) {
  const [newPassword, setNewPassword] = useState("");

  const handleReset = () => {
    if (!adminId) return;
    onReset(
      { id: adminId, payload: { new_password: newPassword } },
      {
        onSuccess: () => {
          setNewPassword("");
          onOpenChange(false);
        },
      },
    );
  };

  return (
    <Dialog open={!!adminId} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-border text-foreground">
        <DialogHeader>
          <DialogTitle>Reset Password</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-4">
          <div>
            <Label>New Password *</Label>
            <Input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="bg-background border-border mt-1"
            />
          </div>
          <div className="flex gap-3 pt-2">
            <Button
              className="flex-1 bg-primary text-primary-foreground"
              onClick={handleReset}
              disabled={isLoading || newPassword.length < 8}
            >
              {isLoading ? <Loader2 className="animate-spin h-4 w-4" /> : "Reset Password"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
