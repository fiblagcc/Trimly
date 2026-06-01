import { TrimlyLogo } from '@/components/TrimlyLogo'

export function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-sand">
      <div className="editorial-card w-full max-w-md space-y-8 p-8">
        <div className="flex justify-center">
          <TrimlyLogo size="auth" />
        </div>
        <p className="text-center text-ink/60">
          Auth coming in Step 2
        </p>
      </div>
    </div>
  )
}
