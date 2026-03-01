import { Button } from '@/components/ui/button'
import { useSSE } from '@/hooks/use-sse'
import { useQueryClient } from '@tanstack/react-query'
import { Loader2, Clock } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

interface WaitingSetupProps {
  workspace: string
  username: string
}

interface SessionConfig {
  framework: string
  level: string
}

export default function WaitingSetup() {
  const [dots, setDots] = useState('.')
  const queryClient = useQueryClient()
  const router = useNavigate()

  const sessionMeta = queryClient.getQueryData<{ workspace: string; setupPath: string }>(['auth', 'session-meta'])
  const authUser = queryClient.getQueryData<{ full_name: string }>(['auth', 'me'])

  const workspace = sessionMeta?.workspace ?? ''
  const setupPath = sessionMeta?.setupPath ?? ''
  const username = authUser?.full_name ?? ''
const [sessionConfig, setSessionConfig] = useState<SessionConfig | null>(null)
  const [received, setReceived] = useState(false)

  useEffect(() => {
    const interval = setInterval(() => {
      setDots(prev => (prev.length >= 3 ? '.' : prev + '.'))
    }, 600)

    return () => clearInterval(interval)
  }, [])


    useSSE<SessionConfig>({
      type: 'session_config',
      handler: (payload) => {
        setSessionConfig(payload)
        console.log(payload , "pay")
        setReceived(true)
        router(`/code/${payload.framework.toLowerCase()}`)
      },
    })

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900 relative overflow-hidden">
 <div className="relative z-10 w-full max-w-md px-4 flex items-center justify-center">

    <div className="w-full animate-fade-in">
      <div className="text-center space-y-8">
        <div className="flex justify-center">
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full blur-2xl opacity-30 animate-pulse"></div>
            <div className="relative inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 shadow-lg">
              <Loader2 className="w-8 h-8 text-white animate-spin" />
            </div>
          </div>
        </div>

        <div>
          <h2 className="text-4xl font-bold text-white mb-3 text-balance">
            Setup Assignment
          </h2>

          <p className="text-lg text-slate-300 font-light">
            Waiting for admin to assign your role{dots}
          </p>
        </div>

        <div className="bg-gradient-to-br from-slate-800/50 to-blue-900/30 border border-slate-700/50 rounded-xl p-6 space-y-4">
          <div className="flex items-start gap-3">
            <Clock className="w-5 h-5 text-blue-400 mt-0.5 flex-shrink-0" />
            <div className="text-left">
              <p className="text-sm font-semibold text-blue-400 mb-1">Username</p>
              <p className="text-slate-300">{username}</p>
            </div>
          </div>

          <div className="w-px h-px bg-slate-700 mx-0 my-3"></div>

          <div className="flex items-start gap-3">
            <Clock className="w-5 h-5 text-cyan-400 mt-0.5 flex-shrink-0" />
            <div className="text-left">
              <p className="text-sm font-semibold text-cyan-400 mb-1">Workspace</p>
              <p className="text-slate-300">{workspace}</p>
            </div>
          </div>
        </div>

        <div className="text-center space-y-2">
          <p className="text-sm text-slate-400">
            The admin will review your credentials and assign an appropriate setup path
          </p>
          <p className="text-xs text-slate-500">
            This typically takes a few seconds
          </p>

           <Button
              // onClick={() => router('/code')}
              disabled={true}
              className="w-full py-3 text-base font-semibold rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 text-white hover:from-emerald-600 hover:to-cyan-600 transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed disabled:scale-100"
            >
              {received ? 'Proceed to Dashboard' : 'Waiting for session config...'}
            </Button>
        </div>
      </div>
    </div>
    </div>
 </div>

  )
}