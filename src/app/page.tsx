'use client'

import Link from "next/link";
import { useEffect, useState } from "react";
import { useSession } from "@/lib/auth-client";

export default function Home() {
  const { data: session, isPending } = useSession()
  const [isLoggedIn, setIsLoggedIn] = useState(false)

  useEffect(() => {
    // Check for Better Auth session or Google OAuth cookies
    const userEmail = document.cookie
      .split('; ')
      .find(row => row.startsWith('user-email='))
      ?.split('=')[1]
    
    setIsLoggedIn(!!session || !!userEmail)
  }, [session])
  const handleSignOut = async () => {
    try {
      // Clear Google OAuth cookies
      document.cookie = 'user-id=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;'
      document.cookie = 'user-email=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;'
      document.cookie = 'user-name=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;'
      
      // Reload page to update state
      window.location.reload()
    } catch (error) {
      console.log('Sign out error:', error)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-slate-800 to-gray-900">
      {/* Header with sign out option when logged in */}
      {isLoggedIn && (
        <div className="absolute top-0 right-0 p-6">
          <div className="flex items-center space-x-4">
            <span className="text-sm text-gray-300">
              Welcome back!
            </span>
            <button
              onClick={handleSignOut}
              className="text-sm text-blue-400 hover:text-blue-300 transition-colors"
            >
              Sign Out
            </button>
          </div>
        </div>
      )}
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center justify-center min-h-screen py-12">
          <div className="text-center">
            <h1 className="text-4xl font-bold sm:text-5xl md:text-6xl">
              <span className="block text-white">
              </span>
              <span className="block text-blue-400 mt-2">
                Made Simple
              </span>
            </h1>
            <p className="text-xl text-gray-300 mb-8">
              Take control of your finances with our intuitive expense tracking app. 
              Monitor your spending, categorize expenses, and gain insights into your financial habits.
              Sign in with Google to get started instantly.
            </p>
            <div className="mt-5 max-w-md mx-auto sm:flex sm:justify-center md:mt-8">
              {isLoggedIn ? (
                // Show dashboard button if logged in
                <div className="rounded-md shadow">
                  <Link
                    href="/dashboard"
                    className="w-full flex items-center justify-center px-8 py-3 border border-transparent text-base font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 md:py-4 md:text-lg md:px-10 transition-colors duration-200 shadow-lg"
                  >
                    Go to Dashboard
                  </Link>
                </div>
              ) : (
                // Show sign up/sign in buttons if not logged in
                <>
                  <div className="rounded-md shadow">
                    <Link
                      href="/register"
                      className="w-full flex items-center justify-center px-8 py-3 border border-transparent text-base font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 md:py-4 md:text-lg md:px-10 transition-colors duration-200 shadow-lg"
                    >
                      Get Started
                    </Link>
                  </div>
                  <div className="mt-3 rounded-md shadow sm:mt-0 sm:ml-3">
                    <Link
                      href="/login"
                      className="w-full flex items-center justify-center px-8 py-3 border border-gray-600 text-base font-medium rounded-lg text-gray-300 bg-gray-800 hover:bg-gray-700 hover:text-white md:py-4 md:text-lg md:px-10 transition-colors duration-200 shadow-lg"
                    >
                      Sign In
                    </Link>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
