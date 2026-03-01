  

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

interface WorkspaceEntryProps {
  onSubmit: (workspace: string) => void
}

export default function WorkspaceEntry({ onSubmit }: WorkspaceEntryProps) {
  const [value, setValue] = useState('')
  const [error, setError] = useState('')

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setValue(e.target.value)
    setError('')
  }

  const handleSubmit = () => {
    if (!value.trim()) {
      setError('Please enter your workspace')
      return
    }

    // Basic validation for workspace format
    const workspaceRegex = /^[a-zA-Z0-9._-]+$/
    if (!workspaceRegex.test(value)) {
      setError('Invalid workspace format. Use letters, numbers, dots, hyphens, or underscores.')
      return
    }

    onSubmit(value)
  }

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSubmit()
    }
  }

  return (
    <div className="w-full animate-fade-in">
      <div className="text-center mb-12">
        <div className="mb-8">
          <p className="text-sm font-semibold text-blue-400 tracking-widest uppercase mb-2">
            Vigilant Code
          </p>
          <h1 className="text-3xl font-bold text-white">VC</h1>
        </div>

        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 mb-6 shadow-lg">
          <span className="text-slate-950 text-xl font-bold">→</span>
        </div>

        <h2 className="text-5xl font-bold text-white mb-3 text-balance">
          Welcome back
        </h2>

        <p className="text-lg text-slate-300 font-light">
          Enter your workspace to continue
        </p>
      </div>

      <div className="space-y-6">
        <div className="space-y-2">
          <label className="block text-sm font-medium text-slate-200">
            Workspace
          </label>

          <div className="relative">
            <Input
              type="text"
              placeholder="com.abc.entry"
              value={value}
              onChange={handleChange}
              onKeyPress={handleKeyPress}
              className="px-6 py-3 text-lg border-2 border-slate-700 bg-slate-900 text-white placeholder:text-slate-500 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/30 transition-all duration-200"
            />
          </div>

          {error && (
            <p className="text-sm text-red-500 font-medium animate-shake">
              {error}
            </p>
          )}
        </div>

        <Button
          onClick={handleSubmit}
          className="w-full py-3 text-base font-semibold rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 text-white hover:from-blue-600 hover:to-blue-700 transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-95"
        >
          Continue
        </Button>

        <p className="text-xs text-slate-400 text-center mt-4">
          Your workspace identifier (e.g., company.team.entry)
        </p>
      </div>
    </div>
  )
}
