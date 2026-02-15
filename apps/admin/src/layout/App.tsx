import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

interface LoginPageProps {
  onLoginSuccess: () => void
}

export default function LoginPage({ onLoginSuccess }: LoginPageProps) {
  const [employerData, setEmployerData] = useState({ workspaceName: '', email: '', password: '' })
  const [error, setError] = useState('')

  const handleEmployerLogin = (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (employerData.workspaceName && employerData.email && employerData.password) {
      setEmployerData({ workspaceName: '', email: '', password: '' })
      onLoginSuccess()
    } else {
      setError('Please fill in all fields')
    }
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-background via-background to-secondary/20">
      <Card className="w-full max-w-md border-border/50 shadow-2xl animate-fade-in">
        <CardHeader className="text-center space-y-2">
          <div className="flex items-center justify-center mb-2">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center">
              <span className="text-sm font-bold text-primary-foreground">RC</span>
            </div>
          </div>
          <CardTitle className="text-3xl font-bold text-primary">Recruit</CardTitle>
          <CardDescription className="text-muted-foreground">Employer Dashboard</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleEmployerLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="employer-workspace" className="text-foreground">Workspace Name</Label>
              <Input
                id="employer-workspace"
                placeholder="Enter your workspace name"
                value={employerData.workspaceName}
                onChange={(e) => setEmployerData({ ...employerData, workspaceName: e.target.value })}
                className="bg-secondary/50 border-border text-foreground placeholder:text-muted-foreground focus:ring-primary"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="employer-email" className="text-foreground">Email</Label>
              <Input
                id="employer-email"
                type="email"
                placeholder="your.email@company.com"
                value={employerData.email}
                onChange={(e) => setEmployerData({ ...employerData, email: e.target.value })}
                className="bg-secondary/50 border-border text-foreground placeholder:text-muted-foreground focus:ring-primary"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="employer-password" className="text-foreground">Passphrase</Label>
              <Input
                id="employer-password"
                type="password"
                placeholder="Enter your passphrase"
                value={employerData.password}
                onChange={(e) => setEmployerData({ ...employerData, password: e.target.value })}
                className="bg-secondary/50 border-border text-foreground placeholder:text-muted-foreground focus:ring-primary"
                required
              />
            </div>
            {error && (
              <div className="p-3 bg-destructive/10 border border-destructive/30 rounded-md animate-shake">
                <p className="text-sm text-destructive">{error}</p>
              </div>
            )}
            <Button
              type="submit"
              className="w-full bg-primary text-primary-foreground hover:bg-primary/90 font-semibold py-2 mt-6 transition-all"
            >
              Login
            </Button>
          </form>
          <p className="text-xs text-muted-foreground text-center mt-4">
            Secure employer portal for candidate management
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
