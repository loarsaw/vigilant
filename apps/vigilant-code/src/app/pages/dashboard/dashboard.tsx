'use client'

import { useState } from 'react'
import { Briefcase, Loader2, AlertCircle, CheckCircle2, ChevronLeft, ChevronRight } from 'lucide-react'
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'
import JobCard from '@/components/job-card'
import { useHiringPositions } from '@/hooks/use-hiring'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'

export default function Dashboard() {
  const [applyingToId, setApplyingToId] = useState<string | null>(null)
  const [coverLetter, setCoverLetter] = useState('')
  
 
  const [currentPage, setCurrentPage] = useState(1)
  const pageSize = 9 

  const {
    positions,
    pagination, 
    isLoadingPositions,
    isFetchError,
    fetchErrorMessage,
    applyForPosition,
    isApplying,
  } = useHiringPositions({ 
    page: currentPage, 
    limit: pageSize,
    is_active: true 
  })

  const appliedPositionIds = new Set(
    positions.filter((p) => !!p.application_id).map((p) => p.id)
  )

  const selectedPosition = positions.find((p) => p.id === applyingToId)


  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleOpenApplyDialog = (jobId: string) => {
    setCoverLetter('')
    setApplyingToId(jobId)
  }

  const handleCloseDialog = () => {
    if (isApplying) return
    setApplyingToId(null)
    setCoverLetter('')
  }

  const handleConfirmApply = () => {
    if (!applyingToId) return

    applyForPosition(
      { positionId: applyingToId, payload: { cover_letter: coverLetter } },
      {
        onSuccess: () => {
          toast.success(`Applied to ${selectedPosition?.position_title ?? 'position'} successfully!`)
          setApplyingToId(null)
          setCoverLetter('')
        },
        onError: (err) => {
          toast.error(err.message ?? 'Failed to apply. Please try again.')
        },
      }
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-cyan-500/10 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 w-full">
        {/* Header */}
        <div className="border-b border-slate-700/50 bg-slate-950/30 backdrop-blur-sm sticky top-0 z-20">
          <div className="max-w-6xl mx-auto px-4 py-6">
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem>
                  <BreadcrumbLink href="/" className="text-slate-300 hover:text-white">
                    Home
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator className="text-slate-600" />
                <BreadcrumbItem>
                  <BreadcrumbPage className="text-white flex items-center gap-2">
                    <Briefcase className="w-4 h-4" />
                    Job Openings
                  </BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-6xl mx-auto px-4 py-12">
          {/* Page Header */}
          <div className="mb-12">
            <div className="flex items-center gap-3 mb-4">
              <div className="relative inline-flex items-center justify-center w-12 h-12 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500 shadow-lg">
                <Briefcase className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-4xl font-bold text-white">Job Opportunities</h1>
                <p className="text-slate-400 mt-1">Explore and apply for open positions</p>
              </div>
            </div>
          </div>

          {/* Stats Bar */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <div className="bg-gradient-to-br from-slate-800/50 to-blue-900/30 border border-slate-700/50 rounded-lg p-4">
              <p className="text-slate-400 text-sm font-medium mb-1">Total Roles Available</p>
              <p className="text-2xl font-bold text-white">{pagination.total}</p>
            </div>
            <div className="bg-gradient-to-br from-slate-800/50 to-blue-900/30 border border-slate-700/50 rounded-lg p-4">
              <p className="text-slate-400 text-sm font-medium mb-1">Current Page</p>
              <p className="text-2xl font-bold text-emerald-400">
                {pagination.currentPage} <span className="text-sm font-normal text-slate-500">of {pagination.totalPages}</span>
              </p>
            </div>
            <div className="bg-gradient-to-br from-slate-800/50 to-blue-900/30 border border-slate-700/50 rounded-lg p-4">
              <p className="text-slate-400 text-sm font-medium mb-1">Your Applications</p>
              <p className="text-2xl font-bold text-cyan-400">{appliedPositionIds.size}</p>
            </div>
          </div>

          {/* Job Cards Grid */}
          <div className="space-y-6">
            <div className="flex justify-between items-end mb-6">
               <h2 className="text-2xl font-bold text-white">Available Jobs</h2>
               <p className="text-slate-500 text-sm">Showing {positions.length} positions</p>
            </div>

            {isLoadingPositions && (
              <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                <Loader2 className="w-10 h-10 animate-spin mb-4 text-blue-500" />
                <p>Fetching latest opportunities...</p>
              </div>
            )}

            {isFetchError && (
              <div className="flex items-center gap-3 p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400">
                <AlertCircle className="w-5 h-5" />
                <p>Error loading jobs: {fetchErrorMessage ?? 'Please try again later.'}</p>
              </div>
            )}

            {!isLoadingPositions && !isFetchError && (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 min-h-[400px]">
                  {positions.length > 0 ? (
                    positions.map((job) => (
                      <div key={job.id} className="relative">
                        <JobCard
                          {...job}
                          isApplied={appliedPositionIds.has(job.id)}
                          applicationStatus={job.application_status}
                          interview={job.interview}
                          onApply={() => handleOpenApplyDialog(job.id)}
                        />
                      </div>
                    ))
                  ) : (
                    <div className="col-span-full text-center py-12 bg-slate-900/50 border border-dashed border-slate-700 rounded-xl">
                      <p className="text-slate-500">No open positions found at the moment.</p>
                    </div>
                  )}
                </div>

                {/* --- Pagination Controls --- */}
                {pagination.totalPages > 1 && (
                  <div className="mt-12 flex items-center justify-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePageChange(currentPage - 1)}
                      disabled={currentPage === 1}
                      className="border-slate-700 bg-slate-900/50 text-slate-300 hover:text-white"
                    >
                      <ChevronLeft className="w-4 h-4 mr-1" />
                      Previous
                    </Button>
                    
                    <div className="flex items-center gap-1 mx-4">
                      {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map((pageNum) => (
                        <Button
                          key={pageNum}
                          variant={currentPage === pageNum ? "default" : "ghost"}
                          size="sm"
                          onClick={() => handlePageChange(pageNum)}
                          className={
                            currentPage === pageNum 
                              ? "bg-blue-600 hover:bg-blue-500" 
                              : "text-slate-400 hover:text-white hover:bg-slate-800"
                          }
                        >
                          {pageNum}
                        </Button>
                      ))}
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePageChange(currentPage + 1)}
                      disabled={currentPage === pagination.totalPages}
                      className="border-slate-700 bg-slate-900/50 text-slate-300 hover:text-white"
                    >
                      Next
                      <ChevronRight className="w-4 h-4 ml-1" />
                    </Button>
                  </div>
                )}
              </>
            )}
          </div>

          <div className="mt-16 text-center">
            <p className="text-slate-400">
              {appliedPositionIds.size > 0
                ? `You've applied to ${appliedPositionIds.size} position${appliedPositionIds.size !== 1 ? 's' : ''}. Good luck!`
                : 'Ready to join our team? Start applying to positions today!'}
            </p>
          </div>
        </div>
      </div>

      {/* Apply Dialog remains the same */}
      <Dialog open={!!applyingToId} onOpenChange={handleCloseDialog}>
        <DialogContent className="bg-slate-900 border border-slate-700 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="text-white text-xl">
              Apply for {selectedPosition?.position_title}
            </DialogTitle>
            <DialogDescription className="text-slate-400">
              {selectedPosition?.department} · {selectedPosition?.location}
            </DialogDescription>
          </DialogHeader>

          <div className="py-2 space-y-3">
            <label className="text-sm text-slate-300 font-medium">
              Cover Letter{' '}
              <span className="text-slate-500 font-normal">(optional)</span>
            </label>
            <Textarea
              value={coverLetter}
              onChange={(e) => setCoverLetter(e.target.value)}
              placeholder="Tell us why you're a great fit for this role..."
              className="bg-slate-800 border-slate-600 text-white placeholder:text-slate-500 resize-none min-h-[120px] focus:border-blue-500"
              disabled={isApplying}
            />
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="ghost"
              onClick={handleCloseDialog}
              disabled={isApplying}
              className="text-slate-400 hover:text-white hover:bg-slate-800"
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirmApply}
              disabled={isApplying}
              className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white"
            >
              {isApplying ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  Submitting...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Confirm Application
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}