import { useState } from 'react';
import {
  Search,
  Plus,
  MoreVertical,
  Trash2,
  Power,
  Edit2,
  Users,
  Briefcase,
  Loader2,
  MapPin,
  Filter,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  useHiringPositions,
  type HiringPosition,
  type CreatePositionPayload,
} from '@/hooks/use-hiring';

const EMPTY_FORM: CreatePositionPayload = {
  position_title: '',
  department: '',
  location: '',
  employment_type: 'full-time',
  experience_required: '',
  salary_range_min: 0,
  salary_range_max: 0,
  salary_range_text: '',
  number_of_openings: 1,
  job_description: '',
  requirements: '',
};

export function HiringPositions() {
  // ── Server-side filters ──────────────────────────────────────────────────
  const [search, setSearch] = useState('');
  const [statusFilter, setStatus] = useState<'all' | 'active' | 'inactive'>(
    'all'
  );
  const [department, setDepartment] = useState('');
  const [location, setLocation] = useState('');
  const [isActiveFilter, setIsActiveFilter] = useState<
    'all' | 'true' | 'false'
  >('all');
  const [page, setPage] = useState(1);
  const [limit] = useState(10);

  const {
    positions,
    pagination,
    isLoadingPositions,
    isFetchError,
    fetchErrorMessage,
    createPosition,
    isCreating,
    updatePosition,
    isUpdating,
    togglePositionActive,
    isToggling,
    deletePosition,
    isDeleting,
  } = useHiringPositions({
    search: search || undefined,
    status: statusFilter === 'all' ? undefined : statusFilter,
    department: department || undefined,
    location: location || undefined,
    is_active: isActiveFilter === 'all' ? undefined : isActiveFilter === 'true',
    page,
    limit,
  });

  // ── Dialog state ─────────────────────────────────────────────────────────
  const [showDialog, setShowDialog] = useState(false);
  const [editingPosition, setEditingPosition] = useState<HiringPosition | null>(
    null
  );
  const [formData, setFormData] = useState<CreatePositionPayload>(EMPTY_FORM);

  const openAdd = () => {
    setEditingPosition(null);
    setFormData(EMPTY_FORM);
    setShowDialog(true);
  };

  const openEdit = (pos: HiringPosition) => {
    setEditingPosition(pos);
    setFormData({
      position_title: pos.position_title,
      department: pos.department,
      location: pos.location,
      employment_type: pos.employment_type,
      experience_required: pos.experience_required,
      salary_range_min: pos.salary_range_min,
      salary_range_max: pos.salary_range_max,
      salary_range_text: pos.salary_range_text,
      number_of_openings: pos.number_of_openings,
      job_description: pos.job_description,
      requirements: pos.requirements,
    });
    setShowDialog(true);
  };

  const closeDialog = () => {
    setShowDialog(false);
    setEditingPosition(null);
  };

  const handleSubmit = () => {
    if (!formData.position_title || !formData.department || !formData.location)
      return;

    if (editingPosition) {
      updatePosition(
        { id: editingPosition.id, payload: formData },
        { onSuccess: closeDialog }
      );
    } else {
      createPosition(formData, { onSuccess: closeDialog });
    }
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Are you sure you want to delete this position?')) {
      deletePosition(id);
    }
  };

  // ── Filter helpers ───────────────────────────────────────────────────────
  const resetFilters = () => {
    setSearch('');
    setStatus('all');
    setDepartment('');
    setLocation('');
    setIsActiveFilter('all');
    setPage(1);
  };

  const hasActiveFilters =
    search ||
    statusFilter !== 'all' ||
    department ||
    location ||
    isActiveFilter !== 'all';

  // ── Badge helpers ────────────────────────────────────────────────────────
  const getTypeBadge = (type: string) => {
    const map: Record<string, string> = {
      'full-time': 'bg-green-400/10  text-green-400  border-green-400/20',
      'part-time': 'bg-blue-400/10   text-blue-400   border-blue-400/20',
      contract: 'bg-purple-400/10 text-purple-400 border-purple-400/20',
      internship: 'bg-orange-400/10 text-orange-400 border-orange-400/20',
    };
    return map[type] ?? map['full-time'];
  };

  const isMutating = isCreating || isUpdating || isToggling || isDeleting;

  return (
    <div className="space-y-6 p-10">
      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-white">Hiring Positions</h2>
          <p className="text-gray-400 mt-1">
            Manage open positions and job listings
          </p>
        </div>
        <Button
          className="bg-cyan-400 hover:bg-cyan-500 text-[#1a1f2e]"
          onClick={openAdd}
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Position
        </Button>
      </div>

      {/* ── Error ── */}
      {isFetchError && (
        <div className="p-4 bg-red-400/10 border border-red-400/20 rounded text-red-400 text-sm">
          {fetchErrorMessage ?? 'Failed to load positions.'}
        </div>
      )}

      {/* ── Stats ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-[#1a1f2e] border-gray-800 p-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-cyan-400/10 rounded-lg flex items-center justify-center">
              <Briefcase className="h-6 w-6 text-cyan-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">
                {pagination.total}
              </p>
              <p className="text-sm text-gray-400">Total Positions</p>
            </div>
          </div>
        </Card>
        <Card className="bg-[#1a1f2e] border-gray-800 p-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-green-400/10 rounded-lg flex items-center justify-center">
              <Plus className="h-6 w-6 text-green-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">
                {positions.reduce(
                  (s, p) => s + (p.is_active ? p.number_of_openings : 0),
                  0
                )}
              </p>
              <p className="text-sm text-gray-400">Active Openings</p>
            </div>
          </div>
        </Card>
        <Card className="bg-[#1a1f2e] border-gray-800 p-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-purple-400/10 rounded-lg flex items-center justify-center">
              <Users className="h-6 w-6 text-purple-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">
                {pagination.totalPages}
              </p>
              <p className="text-sm text-gray-400">Total Pages</p>
            </div>
          </div>
        </Card>
      </div>

      {/* ── Filters ── */}
      <Card className="bg-[#1a1f2e] border-gray-800 p-4">
        <div className="flex flex-col md:flex-row gap-3">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search by title or description…"
              value={search}
              onChange={e => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="pl-10 bg-[#0f1419] border-gray-700 text-white"
            />
          </div>

          {/* Status */}
          <Select
            value={statusFilter}
            onValueChange={v => {
              setStatus(v as any);
              setPage(1);
            }}
          >
            <SelectTrigger className="w-full md:w-40 bg-[#0f1419] border-gray-700 text-white">
              <Filter className="h-4 w-4 mr-2 shrink-0" />
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>

          {/* is_active */}
          <Select
            value={isActiveFilter}
            onValueChange={v => {
              setIsActiveFilter(v as any);
              setPage(1);
            }}
          >
            <SelectTrigger className="w-full md:w-40 bg-[#0f1419] border-gray-700 text-white">
              <Power className="h-4 w-4 mr-2 shrink-0" />
              <SelectValue placeholder="Is Active" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="true">Enabled</SelectItem>
              <SelectItem value="false">Disabled</SelectItem>
            </SelectContent>
          </Select>

          {/* Department */}
          <div className="relative">
            <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Department…"
              value={department}
              onChange={e => {
                setDepartment(e.target.value);
                setPage(1);
              }}
              className="pl-10 w-full md:w-40 bg-[#0f1419] border-gray-700 text-white"
            />
          </div>

          {/* Location */}
          <div className="relative">
            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Location…"
              value={location}
              onChange={e => {
                setLocation(e.target.value);
                setPage(1);
              }}
              className="pl-10 w-full md:w-40 bg-[#0f1419] border-gray-700 text-white"
            />
          </div>

          {/* Clear */}
          {hasActiveFilters && (
            <Button
              variant="outline"
              className="border-gray-700 text-gray-400 hover:text-white shrink-0"
              onClick={resetFilters}
            >
              Clear
            </Button>
          )}
        </div>
      </Card>

      {/* ── List ── */}
      <div className="space-y-4">
        {isLoadingPositions ? (
          <div className="flex items-center justify-center p-12">
            <Loader2 className="h-6 w-6 animate-spin text-cyan-400" />
            <span className="ml-2 text-gray-400">Loading positions…</span>
          </div>
        ) : positions.length === 0 ? (
          <Card className="bg-[#1a1f2e] border-gray-800 p-10 text-center">
            <p className="text-gray-400">No positions found</p>
            {hasActiveFilters && (
              <button
                onClick={resetFilters}
                className="text-cyan-400 text-sm mt-2 hover:underline"
              >
                Clear filters
              </button>
            )}
          </Card>
        ) : (
          positions.map(position => (
            <Card
              key={position.id}
              className={`bg-[#1a1f2e] border-gray-800 p-6 transition-all ${
                !position.is_active ? 'opacity-60' : 'hover:border-cyan-400/30'
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                {/* Left */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-12 h-12 bg-cyan-400/10 rounded-lg flex items-center justify-center shrink-0">
                      <Briefcase className="h-6 w-6 text-cyan-400" />
                    </div>
                    <div>
                      <h3 className="text-xl font-semibold text-white">
                        {position.position_title}
                      </h3>
                      <p className="text-gray-400 text-sm">
                        {position.department}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-3 ml-15">
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-400">
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3.5 w-3.5" /> {position.location}
                      </span>
                      <span>·</span>
                      <span>{position.experience_required}</span>
                      <span>·</span>
                      <span className="text-cyan-400">
                        {position.number_of_openings}{' '}
                        {position.number_of_openings === 1
                          ? 'opening'
                          : 'openings'}
                      </span>
                    </div>

                    <p className="text-gray-300 text-sm line-clamp-2">
                      {position.job_description}
                    </p>

                    {position.requirements && (
                      <div className="flex flex-wrap gap-2">
                        {position.requirements
                          .split(',')
                          .slice(0, 6)
                          .map(r => (
                            <span
                              key={r.trim()}
                              className="text-xs bg-gray-800 px-3 py-1 rounded-full text-gray-300"
                            >
                              {r.trim()}
                            </span>
                          ))}
                        {position.requirements.split(',').length > 6 && (
                          <span className="text-xs text-gray-500 px-2 py-1">
                            +{position.requirements.split(',').length - 6} more
                          </span>
                        )}
                      </div>
                    )}

                    {position.salary_range_text && (
                      <p className="text-sm text-green-400 font-medium">
                        💰 {position.salary_range_text}
                      </p>
                    )}

                    <p className="text-xs text-gray-500">
                      Created{' '}
                      {new Date(position.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>

                {/* Right */}
                <div className="flex flex-col items-end gap-3 shrink-0">
                  <div className="flex items-center gap-2">
                    <Badge className={getTypeBadge(position.employment_type)}>
                      {position.employment_type}
                    </Badge>
                    <Badge
                      className={
                        position.is_active
                          ? 'bg-green-400/10 text-green-400 border-green-400/20'
                          : 'bg-gray-400/10 text-gray-400 border-gray-400/20'
                      }
                    >
                      {position.status}
                    </Badge>
                  </div>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-gray-400 hover:text-white"
                        disabled={isMutating}
                      >
                        {isMutating ? (
                          <Loader2 className="h-5 w-5 animate-spin" />
                        ) : (
                          <MoreVertical className="h-5 w-5" />
                        )}
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="bg-[#1a1f2e] border-gray-800">
                      <DropdownMenuItem
                        onClick={() => openEdit(position)}
                        className="text-gray-300 hover:text-white hover:bg-gray-800 cursor-pointer"
                      >
                        <Edit2 className="h-4 w-4 mr-2" /> Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => togglePositionActive(position.id)}
                        className="text-gray-300 hover:text-white hover:bg-gray-800 cursor-pointer"
                      >
                        <Power className="h-4 w-4 mr-2" />
                        {position.is_active ? 'Disable' : 'Enable'}
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handleDelete(position.id)}
                        className="text-red-400 hover:text-red-300 hover:bg-gray-800 cursor-pointer"
                      >
                        <Trash2 className="h-4 w-4 mr-2" /> Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>

      {/* ── Pagination ── */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between p-4 bg-[#1a1f2e] border border-gray-800 rounded-lg">
          <p className="text-sm text-gray-400">
            Page {pagination.currentPage} of {pagination.totalPages} ·{' '}
            {pagination.total} total
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="border-gray-700"
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1 || isLoadingPositions}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="border-gray-700"
              onClick={() => setPage(p => p + 1)}
              disabled={page === pagination.totalPages || isLoadingPositions}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {/* ── Add / Edit Dialog ── */}
      <Dialog open={showDialog} onOpenChange={closeDialog}>
        <DialogContent className="bg-[#1a1f2e] border-gray-800 text-white max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingPosition ? 'Edit Position' : 'Add New Position'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 mt-4">
            <div>
              <Label>Position Title *</Label>
              <Input
                placeholder="Backend Engineer"
                value={formData.position_title}
                onChange={e =>
                  setFormData({ ...formData, position_title: e.target.value })
                }
                className="bg-[#0f1419] border-gray-700 mt-1"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Department *</Label>
                <Input
                  placeholder="Engineering"
                  value={formData.department}
                  onChange={e =>
                    setFormData({ ...formData, department: e.target.value })
                  }
                  className="bg-[#0f1419] border-gray-700 mt-1"
                />
              </div>
              <div>
                <Label>Location *</Label>
                <Input
                  placeholder="Remote"
                  value={formData.location}
                  onChange={e =>
                    setFormData({ ...formData, location: e.target.value })
                  }
                  className="bg-[#0f1419] border-gray-700 mt-1"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Employment Type *</Label>
                <select
                  value={formData.employment_type}
                  onChange={e =>
                    setFormData({
                      ...formData,
                      employment_type: e.target.value,
                    })
                  }
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
                  onChange={e =>
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
                  placeholder="120000"
                  value={formData.salary_range_min || ''}
                  onChange={e =>
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
                  placeholder="160000"
                  value={formData.salary_range_max || ''}
                  onChange={e =>
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
                  onChange={e =>
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
              <Label>Number of Openings *</Label>
              <Input
                type="number"
                min="1"
                value={formData.number_of_openings}
                onChange={e =>
                  setFormData({
                    ...formData,
                    number_of_openings: parseInt(e.target.value) || 1,
                  })
                }
                className="bg-[#0f1419] border-gray-700 mt-1"
              />
            </div>

            <div>
              <Label>Job Description *</Label>
              <Textarea
                placeholder="Describe the role and responsibilities…"
                value={formData.job_description}
                onChange={e =>
                  setFormData({ ...formData, job_description: e.target.value })
                }
                className="bg-[#0f1419] border-gray-700 mt-1 min-h-24"
              />
            </div>

            <div>
              <Label>Requirements (comma-separated) *</Label>
              <Textarea
                placeholder="React, TypeScript, Node.js, AWS"
                value={formData.requirements}
                onChange={e =>
                  setFormData({ ...formData, requirements: e.target.value })
                }
                className="bg-[#0f1419] border-gray-700 mt-1"
              />
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                className="flex-1 bg-cyan-400 hover:bg-cyan-500 text-[#1a1f2e]"
                onClick={handleSubmit}
                disabled={
                  isCreating ||
                  isUpdating ||
                  !formData.position_title ||
                  !formData.department ||
                  !formData.location
                }
              >
                {isCreating || isUpdating ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Saving…
                  </>
                ) : editingPosition ? (
                  'Update Position'
                ) : (
                  'Add Position'
                )}
              </Button>
              <Button
                variant="outline"
                className="flex-1 border-gray-700"
                onClick={closeDialog}
                disabled={isCreating || isUpdating}
              >
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
