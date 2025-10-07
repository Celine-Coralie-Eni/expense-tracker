'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { useSession } from '@/lib/auth-client'
import { authClient } from '@/lib/auth-client'
import QRCode from 'qrcode'

interface User {
  id: string
  email: string
  name?: string
  twoFactorEnabled: boolean
}

interface Account {
  providerId: string
}

export default function SettingsPage() {
  const { data: session, isPending } = useSession()
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  
  // 2FA Setup State
  const [isSettingUp2FA, setIsSettingUp2FA] = useState(false)
  const [verificationCode, setVerificationCode] = useState('')
  const [backupCodes, setBackupCodes] = useState<string[]>([])
  const [showBackupCodes, setShowBackupCodes] = useState(false)
  const [secret, setSecret] = useState('')
  const [qrCodeUrl, setQrCodeUrl] = useState('')
  
  // Password prompt for 2FA setup
  const [showPasswordPrompt, setShowPasswordPrompt] = useState(false)
  const [currentPassword, setCurrentPassword] = useState('')
  

  useEffect(() => {
    if (!isPending && !session) {
      router.push('/login')
      return
    }
    
    if (session) {
      fetchUserSettings()
    }
  }, [session, isPending, router])


  const fetchUserSettings = async () => {
    try {
      const response = await fetch('/api/user/settings', {
        credentials: 'include', // Include cookies for Better Auth
      })
      if (response.ok) {
        const userData = await response.json()
        setUser(userData)
      } else {
        setError('Failed to fetch user settings')
      }
    } catch (error) {
      setError('Failed to fetch user settings')
    } finally {
      setIsLoading(false)
    }
  }

  const isGoogleOAuthUser = () => {
    // Check if user signed in with Google OAuth
    const hasGoogleImage = session?.user?.image?.includes('googleusercontent.com')
    const hasGmailEmail = session?.user?.email?.includes('gmail.com')
    
    return hasGoogleImage || hasGmailEmail
  }

  const initiate2FASetup = async () => {
    try {
      setError('')
      
      // Check if user is Google OAuth user
      const isGoogle = isGoogleOAuthUser()
      
      if (isGoogle) {
        // Show error message for Google OAuth users
        setError('2FA is only available for email/password accounts.')
        return
      }
      
      // Show password prompt for email/password users
      setShowPasswordPrompt(true)
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : 'Failed to initiate 2FA setup')
    }
  }



  const enable2FAWithPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      setError('')
      setIsSettingUp2FA(true)
      
      const result = await authClient.twoFactor.enable({
        password: currentPassword,
      })
      
      if (result.data) {
        // Better Auth returns totpURI and backupCodes
        setSecret(result.data.totpURI || '')
        
        // Handle backup codes - they might be a string or array
        const codes = result.data.backupCodes as string | string[] | undefined
        if (typeof codes === 'string') {
          try {
            setBackupCodes(JSON.parse(codes))
          } catch {
            setBackupCodes(codes.split(',').map((code: string) => code.trim()))
          }
        } else if (Array.isArray(codes)) {
          setBackupCodes(codes)
        } else {
          setBackupCodes([])
        }
        
        // Generate QR code
        const qrCodeDataUrl = await QRCode.toDataURL(result.data.totpURI)
        setQrCodeUrl(qrCodeDataUrl)
        setShowPasswordPrompt(false)
        setCurrentPassword('')
      } else if (result.error) {
        // Check if it's an invalid password error (Google OAuth users)
        if (result.error.code === 'INVALID_PASSWORD' || result.error.message?.includes('Invalid password')) {
          setIsSettingUp2FA(false)
          setShowPasswordPrompt(false)
          setError('2FA is only available for email/password accounts.')
          return
        } else {
          setError(result.error.message || 'Failed to enable 2FA')
          setIsSettingUp2FA(false)
          setShowPasswordPrompt(false)
        }
      } else {
        setError('No 2FA data received from server')
        setIsSettingUp2FA(false)
        setShowPasswordPrompt(false)
      }
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : 'Failed to enable 2FA')
      setIsSettingUp2FA(false)
      setShowPasswordPrompt(false)
    }
  }

  const verify2FASetup = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    
    try {
      const result = await authClient.twoFactor.verifyTotp({
        code: verificationCode,
      })
      
      if (result.data) {
        setSuccess('2FA has been successfully enabled!')
        setShowBackupCodes(true)
        setUser(prev => prev ? { ...prev, twoFactorEnabled: true } : null)
        setVerificationCode('')
      } else if (result.error) {
        setError(result.error.message || 'Invalid verification code')
      }
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : 'Failed to verify 2FA')
    }
  }

  const disable2FA = async () => {
    if (!confirm('Are you sure you want to disable 2FA? This will make your account less secure.')) {
      return
    }
    
    try {
      setError('')
      
      const result = await authClient.twoFactor.disable({
        password: '', // Better Auth handles this internally
      })
      
      if (result.data) {
        setSuccess('2FA has been disabled')
        setUser(prev => prev ? { ...prev, twoFactorEnabled: false } : null)
        setIsSettingUp2FA(false)
        setQrCodeUrl('')
        setSecret('')
        setBackupCodes([])
        setShowBackupCodes(false)
      }
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : 'Failed to disable 2FA')
    }
  }

  const downloadBackupCodes = () => {
    const content = backupCodes.join('\n')
    const blob = new Blob([content], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'expense-tracker-backup-codes.txt'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  if (isPending || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-slate-800 to-gray-900">
        <div className="text-lg text-white">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-slate-800 to-gray-900">
      <div className="bg-gray-800 shadow-lg border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <Link href="/dashboard" className="text-3xl font-bold text-white hover:text-blue-400 transition-colors">
              Expense Tracker
            </Link>
            <div className="flex items-center space-x-4">
              <Link 
                href="/dashboard"
                className="text-gray-300 hover:text-white transition-colors"
              >
                Back to Dashboard
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="bg-gray-800 overflow-hidden shadow rounded-lg border border-gray-700">
            <div className="px-4 py-5 sm:p-6">
              <h1 className="text-2xl font-bold text-white mb-6">Account Settings</h1>
              
              {error && (
                <div className="mb-4 text-red-400 text-sm bg-red-900/20 border border-red-800 rounded p-3">
                  {error}
                </div>
              )}
              
              {success && (
                <div className="mb-4 text-green-400 text-sm bg-green-900/20 border border-green-800 rounded p-3">
                  {success}
                </div>
              )}

              {/* User Info */}
              <div className="mb-8">
                <h2 className="text-lg font-medium text-white mb-4">Profile Information</h2>
                <div className="space-y-2">
                  <p className="text-gray-300">
                    <span className="font-medium">Email:</span> {user?.email}
                  </p>
                  {user?.name && (
                    <p className="text-gray-300">
                      <span className="font-medium">Name:</span> {user.name}
                    </p>
                  )}
                </div>
              </div>



              {/* 2FA Section */}
              <div className="border-t border-gray-700 pt-8">
                <h2 className="text-lg font-medium text-white mb-4">Two-Factor Authentication</h2>
                

                {/* Password prompt for 2FA setup */}
                {showPasswordPrompt && (
                  <div className="space-y-4">
                    <h3 className="text-md font-medium text-white">Confirm Your Password</h3>
                    <p className="text-gray-300">
                      Please enter your account password to enable 2FA.
                    </p>
                    
                    <form onSubmit={enable2FAWithPassword} className="space-y-4 max-w-md">
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1">
                          Password
                        </label>
                        <input
                          type="password"
                          value={currentPassword}
                          onChange={(e) => setCurrentPassword(e.target.value)}
                          className="block w-full border-gray-600 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm px-3 py-2 border bg-gray-700 text-white placeholder-gray-400"
                          placeholder="Enter your account password"
                          required
                        />
                      </div>
                      <div className="flex space-x-3">
                        <button
                          type="submit"
                          disabled={isSettingUp2FA}
                          className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors disabled:opacity-50"
                        >
                          {isSettingUp2FA ? 'Setting up 2FA...' : 'Continue'}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setShowPasswordPrompt(false)
                            setCurrentPassword('')
                            setError('')
                          }}
                          className="bg-gray-600 hover:bg-gray-500 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    </form>
                  </div>
                )}

                {!user?.twoFactorEnabled && !isSettingUp2FA && !showPasswordPrompt && (
                  <div className="space-y-4">
                    <p className="text-gray-300">
                      Add an extra layer of security to your account by enabling two-factor authentication.
                    </p>
                    <button
                      onClick={initiate2FASetup}
                      className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
                    >
                      Enable 2FA
                    </button>
                  </div>
                )}

                {isSettingUp2FA && !showBackupCodes && !showPasswordPrompt && (
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-md font-medium text-white mb-2">Step 1: Scan QR Code</h3>
                      <p className="text-gray-300 mb-4">
                        Scan this QR code with your authenticator app
                      </p>
                      {qrCodeUrl ? (
                        <div className="bg-white p-4 rounded-lg inline-block">
                          <Image src={qrCodeUrl} alt="2FA QR Code" width={192} height={192} className="w-48 h-48" />
                        </div>
                      ) : (
                        <div className="bg-gray-700 p-4 rounded-lg inline-block">
                          <div className="w-48 h-48 flex items-center justify-center text-gray-400">
                            Loading QR Code...
                          </div>
                        </div>
                      )}
                    </div>
                    
                    <div>
                      <h3 className="text-md font-medium text-white mb-2">Step 2: Enter Verification Code</h3>
                      <form onSubmit={verify2FASetup} className="space-y-4">
                        <div>
                          <input
                            type="text"
                            placeholder="Enter 6-digit code"
                            value={verificationCode}
                            onChange={(e) => setVerificationCode(e.target.value)}
                            className="block w-full max-w-xs border-gray-600 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm px-3 py-2 border bg-gray-700 text-white placeholder-gray-400"
                            maxLength={6}
                            required
                          />
                        </div>
                        <div className="flex space-x-3">
                          <button
                            type="submit"
                            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
                          >
                            Verify & Enable
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setIsSettingUp2FA(false)
                              setQrCodeUrl('')
                              setSecret('')
                              setVerificationCode('')
                            }}
                            className="bg-gray-600 hover:bg-gray-500 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
                          >
                            Cancel
                          </button>
                        </div>
                      </form>
                    </div>
                  </div>
                )}

                {showBackupCodes && backupCodes.length > 0 && (
                  <div className="space-y-4">
                    <div className="bg-yellow-900/20 border border-yellow-800 rounded p-4">
                      <h3 className="text-md font-medium text-yellow-400 mb-2">Important: Save Your Backup Codes</h3>
                      <p className="text-yellow-300 text-sm mb-4">
                        Store these backup codes in a safe place. You can use them to access your account if you lose your authenticator device.
                      </p>
                      <div className="bg-gray-900 p-3 rounded font-mono text-sm text-gray-300 mb-4">
                        {backupCodes.map((code, index) => (
                          <div key={index}>{code}</div>
                        ))}
                      </div>
                      <button
                        onClick={downloadBackupCodes}
                        className="bg-yellow-600 hover:bg-yellow-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
                      >
                        Download Backup Codes
                      </button>
                    </div>
                    <button
                      onClick={() => {
                        setShowBackupCodes(false)
                        setIsSettingUp2FA(false)
                        setSuccess('')
                      }}
                      className="bg-gray-600 hover:bg-gray-500 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
                    >
                      Done
                    </button>
                  </div>
                )}

                {user?.twoFactorEnabled && !isSettingUp2FA && (
                  <div className="space-y-4">
                    <div className="flex items-center space-x-2">
                      <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                      <span className="text-green-400 font-medium">2FA is enabled</span>
                    </div>
                    <p className="text-gray-300">
                      Your account is protected with two-factor authentication.
                    </p>
                    <button
                      onClick={disable2FA}
                      className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
                    >
                      Disable 2FA
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
