import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { MapPin, Briefcase, Clock, DollarSign, Calendar } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

interface JobCardProps {
  id: string
  position_title: string
  department: string
  location: string
  employment_type: string
  experience_required: string
  salary_range_text: string
  number_of_openings: number
  job_description: string
  requirements: string
  isApplied?: boolean
  interviewDate?: string
  interviewTime?: string
  onApply?: (jobId: string) => void
}

export default function JobCard({
  id,
  position_title,
  department,
  location,
  employment_type,
  experience_required,
  salary_range_text,
  number_of_openings,
  job_description,
  requirements,
  isApplied = false,
  interviewDate,
  interviewTime,
  onApply,
}: JobCardProps) {
  const router = useNavigate()
  return (
    <div className="bg-gradient-to-br from-slate-800/50 to-blue-900/30 border border-slate-700/50 rounded-xl p-6 hover:border-blue-500/50 transition-all duration-300 hover:shadow-lg hover:shadow-blue-500/20 aspect-square flex flex-col justify-between">
      <div className="flex flex-col justify-between h-full">
        {/* Header */}
        <div className="space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <h3 className="text-lg font-bold text-white mb-1 line-clamp-2">{position_title}</h3>
              <p className="text-xs text-slate-400">{department}</p>
            </div>
            {number_of_openings > 0 && !isApplied && (
              <Badge className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs flex-shrink-0">
                {number_of_openings}
              </Badge>
            )}
          </div>

          {/* Job Details - Compact */}
          <div className="space-y-2 text-xs">
            <div className="flex items-center gap-2">
              <MapPin className="w-3 h-3 text-cyan-400 flex-shrink-0" />
              <span className="text-slate-300 truncate">{location}</span>
            </div>
            <div className="flex items-center gap-2">
              <Briefcase className="w-3 h-3 text-blue-400 flex-shrink-0" />
              <span className="text-slate-300 truncate">{employment_type}</span>
            </div>
            <div className="flex items-center gap-2">
              <DollarSign className="w-3 h-3 text-emerald-400 flex-shrink-0" />
              <span className="text-slate-300 truncate">{salary_range_text}</span>
            </div>
          </div>
        </div>

        {/* Description - Truncated */}
        <div className="py-3 border-t border-slate-700/50">
          <p className="text-xs text-slate-300 line-clamp-3">{job_description}</p>
        </div>

        {/* Action Section */}
       {isApplied ? (
  <div className="space-y-2">
    <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-3 space-y-2">
      <p className="text-xs font-semibold text-emerald-400">Interview Scheduled</p>
      <div className="flex items-center gap-2">
        <Calendar className="w-3 h-3 text-emerald-400" />
        <span className="text-xs text-slate-300">{interviewDate || 'Date TBA'}</span>
      </div>
      <div className="flex items-center gap-2">
        <Clock className="w-3 h-3 text-emerald-400" />
        <span className="text-xs text-slate-300">{interviewTime || 'Time TBA'}</span>
      </div>
    </div>
    
    {/* New Join Lobby Button */}
    <Button 
      variant="outline"
      className="w-full py-2 text-xs font-semibold border-emerald-500/50 text-emerald-400 hover:bg-emerald-500/10 transition-all"
      onClick={() =>{
        router("/wait")
      }}
    >
      Join Lobby
    </Button>
  </div>
) : (
  <Button
    onClick={() => onApply?.(id)}
    className="w-full py-2 text-sm font-semibold rounded-lg bg-gradient-to-r from-emerald-500 to-cyan-500 text-white hover:from-emerald-600 hover:to-cyan-600 transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-95"
  >
    Apply
  </Button>
)}
      </div>
    </div>
  )
}
