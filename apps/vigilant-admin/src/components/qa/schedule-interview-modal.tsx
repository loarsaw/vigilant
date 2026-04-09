import { useState } from 'react'
import { Calendar as CalendarIcon, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Calendar as CalendarComponent } from '@/components/ui/calendar'
import { useInterview } from '@/hooks/use-interview'

interface ScheduleModalProps {
  isOpen: boolean
  onClose: () => void
  candidateId: string
  candidateName: string
  onSchedule: (details: any) => void
}

export function ScheduleInterviewModal({
  isOpen,
  onClose,
  candidateId,
  candidateName,
  onSchedule
}: ScheduleModalProps) {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date())
  const [time, setTime] = useState('')
  const [duration, setDuration] = useState('60')
  const [interviewerEmail, setInterviewerEmail] = useState('')
  const [interviewType, setInterviewType] = useState('')
  const [interviewURL, setInterviewURL] = useState('')
  const [timezone, setTimezone] = useState('UTC')
  const [selectedApplicationId, setSelectedApplicationId] = useState('')
  const [notes, setNotes] = useState('')

  const { applicationOptions, isLoading, scheduleInterviewAsync, isScheduling } =
    useInterview(candidateId)

  const selectedApplication = applicationOptions.find(
    (a) => a.application_id === selectedApplicationId
  )



  const handleConfirm = async () => {
    if (!selectedDate || !time || !selectedApplicationId || !interviewerEmail || !interviewURL || !interviewType) {
     alert('Please fill in all required fields')
      return
    }

    // Combine date + time into RFC3339
    const [hours, minutes] = time.split(':')
    const scheduledAt = new Date(selectedDate)
    scheduledAt.setHours(parseInt(hours), parseInt(minutes), 0, 0)

    try {
      await scheduleInterviewAsync({
        candidate_id: candidateId,
        application_id: selectedApplicationId,
        interviewer_email: interviewerEmail,
        position: selectedApplication?.position ?? '',
        interview_type: interviewType,
        scheduled_at: scheduledAt.toISOString(),
        scheduled_duration: parseInt(duration),
        interview_url: interviewURL,
        timezone,
      })
      onClose()
    } catch (err: any) {
      alert(err?.message ?? 'Failed to schedule interview')
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-[#1a1f2e] border-gray-800 text-white max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="mb-4">
          <DialogTitle>Schedule Interview with {candidateName}</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Calendar Side */}
          <div className="bg-[#0f1419] rounded-lg border border-gray-800 p-4 h-fit">
            <h3 className="text-white font-medium mb-3">Select Date</h3>
            <CalendarComponent
              mode="single"
              selected={selectedDate}
              onSelect={setSelectedDate}
              className="rounded-md"
            />
          </div>

          {/* Details Side */}
          <div className="space-y-4">

            {/* Application Select */}
            <div>
              <Label className="text-gray-300">Application / Position</Label>
              <Select
                value={selectedApplicationId}
                onValueChange={setSelectedApplicationId}
                disabled={isLoading}
              >
                <SelectTrigger className="bg-[#0f1419] border-gray-700 text-white mt-1">
                  <SelectValue
                    placeholder={
                      isLoading ? 'Loading...' : 'Select position'
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {applicationOptions.map((app) => (
                    <SelectItem key={app.application_id} value={app.application_id}>
                      {app.position}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-gray-300">Time</Label>
                <Input
                  type="time"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  className="bg-[#0f1419] border-gray-700 text-white mt-1"
                />
              </div>
              <div>
                <Label className="text-gray-300">Duration</Label>
                <Select value={duration} onValueChange={setDuration}>
                  <SelectTrigger className="bg-[#0f1419] border-gray-700 text-white mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="30">30 minutes</SelectItem>
                    <SelectItem value="45">45 minutes</SelectItem>
                    <SelectItem value="60">1 hour</SelectItem>
                    <SelectItem value="90">1.5 hours</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Interview Type */}
            <div>
              <Label className="text-gray-300">Interview Type</Label>
              <Select value={interviewType} onValueChange={setInterviewType}>
                <SelectTrigger className="bg-[#0f1419] border-gray-700 text-white mt-1">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Technical Round">Technical Round</SelectItem>
                  <SelectItem value="Technical Round - System Design">System Design</SelectItem>
                  <SelectItem value="HR Round">HR Round</SelectItem>
                  <SelectItem value="Culture Fit">Culture Fit</SelectItem>
                  <SelectItem value="Final Round">Final Round</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-gray-300">Interviewer Email</Label>
              <Input
                placeholder="interviewer@company.com"
                value={interviewerEmail}
                onChange={(e) => setInterviewerEmail(e.target.value)}
                className="bg-[#0f1419] border-gray-700 text-white mt-1"
              />
            </div>

            <div>
              <Label className="text-gray-300">Meet Link</Label>
              <Input
                placeholder="https://meet.google.com/..."
                value={interviewURL}
                onChange={(e) => setInterviewURL(e.target.value)}
                className="bg-[#0f1419] border-gray-700 text-white mt-1"
              />
            </div>

            <div>
              <Label className="text-gray-300">Timezone</Label>
              <Select value={timezone} onValueChange={setTimezone}>
                <SelectTrigger className="bg-[#0f1419] border-gray-700 text-white mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="UTC">UTC</SelectItem>
                  <SelectItem value="Asia/Kolkata">Asia/Kolkata (IST)</SelectItem>
                  <SelectItem value="America/New_York">America/New_York (EST)</SelectItem>
                  <SelectItem value="America/Los_Angeles">America/Los_Angeles (PST)</SelectItem>
                  <SelectItem value="Europe/London">Europe/London (GMT)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-gray-300">Notes (Optional)</Label>
              <Textarea
                placeholder="Add any additional notes..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="min-h-20 bg-[#0f1419] border-gray-700 text-white mt-1"
              />
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                className="flex-1 bg-cyan-400 hover:bg-cyan-500 text-[#1a1f2e]"
                onClick={handleConfirm}
                disabled={isScheduling}
              >
                {isScheduling ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <CalendarIcon className="h-4 w-4 mr-2" />
                )}
                {isScheduling ? 'Scheduling...' : 'Confirm Schedule'}
              </Button>
              <Button
                variant="outline"
                className="flex-1 border-gray-700 text-gray-300"
                onClick={onClose}
                disabled={isScheduling}
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}