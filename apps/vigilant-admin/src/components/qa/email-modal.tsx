'use client'

import { useState, useEffect } from 'react'
import { Send, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useInterview } from '@/hooks/use-interview'
import { toast } from 'sonner'

interface EmailModalProps {
  isOpen: boolean
  onClose: () => void
  candidateId: string
  candidateName: string
  candidateEmail: string
}

export function EmailModal({
  isOpen,
  onClose,
  candidateId,
  candidateName,
  candidateEmail,
}: EmailModalProps) {
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')

  const { sendEmailAsync, isSendingEmail } = useInterview(candidateId)

  useEffect(() => {
    if (!isOpen) {
      setSubject('')
      setBody('')
    }
  }, [isOpen])

  const handleSend = async () => {
    if (!subject.trim() || !body.trim()) {
      toast.error('Subject and message are required')
      return
    }

    try {
      await sendEmailAsync({
        to_email: candidateEmail,
        candidate_name: candidateName,
        subject,
        message: body,
      })
      toast.success(`Email sent to ${candidateName}`)
      onClose()
    } catch (err: any) {
      toast.error(err?.message ?? 'Failed to send email')
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-[#1a1f2e] border-gray-800 text-white max-w-2xl">
        <DialogHeader>
          <DialogTitle>Send Email to {candidateName}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          <div>
            <Label className="text-gray-300">To</Label>
            <Input
              value={candidateEmail}
              className="bg-[#0f1419] border-gray-700 text-white mt-1"
              disabled
            />
          </div>

          <div>
            <Label className="text-gray-300">Subject</Label>
            <Input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Email subject"
              className="bg-[#0f1419] border-gray-700 text-white mt-1"
              disabled={isSendingEmail}
            />
          </div>

          <div>
            <Label className="text-gray-300">Message</Label>
            <Textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Write your message here..."
              className="min-h-40 bg-[#0f1419] border-gray-700 text-white mt-1"
              disabled={isSendingEmail}
            />
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              className="flex-1 bg-cyan-400 hover:bg-cyan-500 text-[#1a1f2e]"
              onClick={handleSend}
              disabled={isSendingEmail}
            >
              {isSendingEmail ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Send className="h-4 w-4 mr-2" />
              )}
              {isSendingEmail ? 'Sending...' : 'Send Email'}
            </Button>
            <Button
              variant="outline"
              className="flex-1 border-gray-700 text-gray-300"
              onClick={onClose}
              disabled={isSendingEmail}
            >
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}