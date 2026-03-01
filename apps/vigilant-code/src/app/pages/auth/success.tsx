import { CheckCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {useNavigate} from "react-router-dom"
interface SuccessProps {
  workspace: string
  username: string
  onProceed: () => void
}

export default function Success({ workspace, username, onProceed }: SuccessProps) {
  const router = useNavigate()
  return (
    <div className="w-full animate-fade-in">
      <div className="text-center space-y-8">
        <div className="flex justify-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-emerald-400 to-cyan-500 shadow-lg animate-pulse">
            <CheckCircle className="w-8 h-8 text-white" />
          </div>
        </div>

        <div>
          <h2 className="text-4xl font-bold text-white mb-3 text-balance">
            Welcome, {username}
          </h2>

          <p className="text-lg text-slate-300 font-light">
            You have successfully logged in to <span className="font-semibold text-blue-400">{workspace}</span>
          </p>
        </div>

        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
          <p className="text-slate-300 text-sm leading-relaxed">
            You are now authenticated and can access your workspace resources and data securely.
          </p>
        </div>

        <Button
          onClick={()=>{
            router("/wait")
          }}
          className="w-full py-3 text-base font-semibold rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 text-white hover:from-blue-600 hover:to-blue-700 transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-95"
        >
          Wait for Admin Setup Assignment
        </Button>
      </div>
    </div>
  )
}