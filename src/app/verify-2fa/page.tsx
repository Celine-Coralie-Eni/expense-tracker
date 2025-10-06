'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { authClient } from '@/lib/auth-client'

export default function Verify2FAPage() {
  const router = useRouter()
  const _searchParams = useSearchParams()
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [useBackupCode, setUseBackupCode] = useState(false)

  useEffect(() => {
    // Check if user is already authenticated
    const checkAuth = async () => {
      try {
        const session = await authClient.getSession()
        if (session.data) {
          router.push('/dashboard')
        }
      } catch {
        // User not authenticated, which is expected on this page
      }
    }
    
    checkAuth()
  }, [router])

  const handleVerification = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    try {
      if (useBackupCode) {
        // Verify backup code
        const result = await authClient.twoFactor.verifyBackupCode({
          code: code.trim(),
        })
        
        if (result.data) {
          router.push('/dashboard')
        }
      } else {
        // Verify TOTP code
        const result = await authClient.twoFactor.verifyTotp({
          code: code.trim(),
        })
        
        if (result.data) {
          router.push('/dashboard')
        }
      }
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : 'Invalid verification code')
    } finally {
      setIsLoading(false)
    }
  }

  const handleBackToLogin = () => {
    router.push('/login')
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-white">
            Two-Factor Authentication
          </h2>
          <p className="mt-2 text-center text-sm text-gray-400">
            {useBackupCode 
              ? 'Enter one of your backup codes'
              : 'Enter the 6-digit code from your authenticator app'
            }
          </p>
        </div>

        {error && (
          <div className="text-red-400 text-sm text-center bg-red-900/20 border border-red-800 rounded-md p-3">
            {error}
          </div>
        )}

        <form onSubmit={handleVerification} className="space-y-6">
          <div>
            <label htmlFor="code" className="sr-only">
              {useBackupCode ? 'Backup Code' : 'Verification Code'}
            </label>
            <input
              id="code"
              name="code"
              type="text"
              required
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="appearance-none rounded-md relative block w-full px-3 py-3 border border-gray-600 placeholder-gray-400 text-white bg-gray-800 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm text-center text-lg tracking-widest"
              placeholder={useBackupCode ? 'Enter backup code' : '000000'}
              maxLength={useBackupCode ? 10 : 6}
              autoComplete="off"
            />
          </div>

          <div>
            <button
              type="submit"
              disabled={isLoading || code.length < (useBackupCode ? 8 : 6)}
              className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isLoading ? 'Verifying...' : 'Verify'}
            </button>
          </div>

          <div className="flex flex-col space-y-2">
            <button
              type="button"
              onClick={() => {
                setUseBackupCode(!useBackupCode)
                setCode('')
                setError('')
              }}
              className="text-indigo-400 hover:text-indigo-300 text-sm transition-colors"
            >
              {useBackupCode 
                ? 'Use authenticator app instead' 
                : 'Use backup code instead'
              }
            </button>
            
            <button
              type="button"
              onClick={handleBackToLogin}
              className="text-gray-400 hover:text-gray-300 text-sm transition-colors"
            >
              Back to login
            </button>
          </div>
        </form>

        <div className="text-center">
          <p className="text-xs text-gray-500">
            Having trouble? Contact support for assistance.
          </p>
        </div>
      </div>
    </div>
  )
}
