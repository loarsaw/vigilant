import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface AddCandidateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdd: (data: any, options: { onSuccess: () => void }) => void;
  isLoading: boolean;
}

export function AddCandidateDialog({ open, onOpenChange, onAdd, isLoading }: AddCandidateDialogProps) {
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    password: '',
  });

  const handleSubmit = () => {
    if (!formData.full_name || !formData.email || !formData.password) return;
    
    onAdd(formData, {
      onSuccess: () => {
        setFormData({ full_name: '', email: '', password: '' });
        onOpenChange(false);
      },
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-[#1a1f2e] border-gray-800 text-white">
        <DialogHeader>
          <DialogTitle>Add New Candidate</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-4">
          <div>
            <Label>Full Name</Label>
            <Input
              placeholder="John Doe"
              value={formData.full_name}
              onChange={e => setFormData({ ...formData, full_name: e.target.value })}
              className="bg-[#0f1419] border-gray-700 mt-1"
            />
          </div>
          <div>
            <Label>Email</Label>
            <Input
              type="email"
              placeholder="john@example.com"
              value={formData.email}
              onChange={e => setFormData({ ...formData, email: e.target.value })}
              className="bg-[#0f1419] border-gray-700 mt-1"
            />
          </div>
          <div>
            <Label>Password</Label>
            <Input
              type="password"
              placeholder="••••••••"
              value={formData.password}
              onChange={e => setFormData({ ...formData, password: e.target.value })}
              className="bg-[#0f1419] border-gray-700 mt-1"
            />
          </div>
          <div className="flex gap-3 pt-4">
            <Button
              className="flex-1 bg-cyan-400 hover:bg-cyan-500 text-[#1a1f2e]"
              onClick={handleSubmit}
              disabled={isLoading || !formData.full_name || !formData.email}
            >
              {isLoading ? <Loader2 className="animate-spin h-4 w-4" /> : 'Create Candidate'}
            </Button>
            <Button
              variant="outline"
              className="flex-1 border-gray-700 text-white"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}