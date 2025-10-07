'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useSession, signOut } from '@/lib/auth-client'

interface Expense {
  id: string
  title: string
  amount: number
  category: string
  date: string
  createdAt: string
  updatedAt: string
}

export default function DashboardPage() {
  const { data: session, isPending } = useSession()
  const router = useRouter()
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isAddingExpense, setIsAddingExpense] = useState(false)
  const [editingExpense, setEditingExpense] = useState<string | null>(null)
  const [error, setError] = useState('')
  // Form state
  const [title, setTitle] = useState('')
  const [amount, setAmount] = useState('')
  const [category, setCategory] = useState('')
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  // Delete confirmation modal state
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [expenseToDelete, setExpenseToDelete] = useState<string | null>(null)

  useEffect(() => {
    const checkAuthAndFetch = async () => {
      if (!isPending && !session) {
        // Check for Google OAuth cookie session as fallback
        const userEmail = document.cookie
          .split('; ')
          .find(row => row.startsWith('user-email='))
          ?.split('=')[1]

        if (!userEmail) {
          router.push('/login')
          return
        }
      }
      
      // If we have a session, check if 2FA verification is needed
      if (!isPending && session) {
        try {
          const userResponse = await fetch('/api/user/settings', {
            credentials: 'include',
          })
          
          if (userResponse.ok) {
            const userData = await userResponse.json()
            
            // If user has 2FA enabled, they should have already verified
            // Only redirect if they somehow bypassed 2FA verification
            // For now, let's allow access after successful 2FA verification
          }
        } catch (error) {
          console.error('Error checking 2FA status:', error)
          // If we can't check 2FA status, continue to dashboard
        }
      }
      
      // Fetch expenses if we have any kind of session
      if (!isPending && (session || document.cookie.includes('user-email='))) {
        fetchExpenses()
      }
    }
    
    checkAuthAndFetch()
  }, [session, isPending, router])

  const fetchExpenses = async () => {
    try {
      const response = await fetch('/api/expenses', {
        credentials: 'include', // Include cookies for Better Auth
      })
      if (response.ok) {
        const data = await response.json()
        setExpenses(data)
      } else {
        setError('Failed to fetch expenses')
      }
    } catch (error) {
      setError('Failed to fetch expenses')
    } finally {
      setIsLoading(false)
    }
  }

  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    try {
      const response = await fetch('/api/expenses', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include', // Include cookies for Better Auth
        body: JSON.stringify({
          title,
          amount: parseFloat(amount),
          category,
          date: new Date(date).toISOString(),
        }),
      })

      if (response.ok) {
        const newExpense = await response.json()
        setExpenses([newExpense, ...expenses])
        resetForm()
        setIsAddingExpense(false)
      } else {
        const errorData = await response.json()
        setError(errorData.error || 'Failed to add expense')
      }
    } catch (error) {
      setError('Failed to add expense')
    }
  }

  const handleUpdateExpense = async (id: string) => {
    setError('')

    try {
      const response = await fetch(`/api/expenses/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include', // Include cookies for Better Auth
        body: JSON.stringify({
          title,
          amount: parseFloat(amount),
          category,
          date: new Date(date).toISOString(),
        }),
      })

      if (response.ok) {
        const updatedExpense = await response.json()
        setExpenses(expenses.map(exp => exp.id === id ? updatedExpense : exp))
        resetForm()
        setEditingExpense(null)
      } else {
        const errorData = await response.json()
        setError(errorData.error || 'Failed to update expense')
      }
    } catch (error) {
      setError('Failed to update expense')
    }
  }

  const openDeleteModal = (id: string) => {
    setExpenseToDelete(id)
    setShowDeleteModal(true)
  }

  const closeDeleteModal = () => {
    setExpenseToDelete(null)
    setShowDeleteModal(false)
  }

  const confirmDeleteExpense = async () => {
    if (!expenseToDelete) return

    try {
      const response = await fetch(`/api/expenses/${expenseToDelete}`, {
        method: 'DELETE',
        credentials: 'include', // Include cookies for Better Auth
      })

      if (response.ok) {
        setExpenses(expenses.filter(exp => exp.id !== expenseToDelete))
        closeDeleteModal()
      } else {
        setError('Failed to delete expense')
      }
    } catch (error) {
      setError('Failed to delete expense')
    }
  }

  const startEdit = (expense: Expense) => {
    setTitle(expense.title)
    setAmount(expense.amount.toString())
    setCategory(expense.category)
    setDate(new Date(expense.date).toISOString().split('T')[0])
    setEditingExpense(expense.id)
    setIsAddingExpense(false)
  }

  const resetForm = () => {
    setTitle('')
    setAmount('')
    setCategory('')
    setDate(new Date().toISOString().split('T')[0])
  }

  const handleSignOut = async () => {
    try {
      // Try Better Auth sign out
      await signOut()
    } catch (error) {
      console.log('Better Auth sign out failed, clearing cookies')
    }
    
    // Clear Google OAuth cookies
    document.cookie = 'user-id=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;'
    document.cookie = 'user-email=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;'
    document.cookie = 'user-name=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;'
    
    router.push('/')
  }

  if (isPending || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    )
  }

  const totalExpenses = expenses.reduce((sum, expense) => sum + expense.amount, 0)

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-slate-800 to-gray-900">
      <div className="bg-gray-800 shadow-lg border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <Link href="/" className="text-3xl font-bold text-white hover:text-blue-400 transition-colors">
              Expense Tracker
            </Link>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-300">
                Welcome, {session?.user?.name || session?.user?.email || 
                  document.cookie
                    .split('; ')
                    .find(row => row.startsWith('user-name='))
                    ?.split('=')[1] ||
                  decodeURIComponent(document.cookie
                    .split('; ')
                    .find(row => row.startsWith('user-email='))
                    ?.split('=')[1] || 'User')}
              </span>
              <Link
                href="/settings"
                className="text-gray-300 hover:text-white transition-colors text-sm font-medium"
              >
                Settings
              </Link>
              <button
                onClick={handleSignOut}
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-200 shadow-md"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {/* Summary */}
          <div className="bg-gray-800 overflow-hidden shadow rounded-lg mb-6 border border-gray-700">
            <div className="px-4 py-5 sm:p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="text-2xl font-bold text-white">
                    {totalExpenses.toFixed(0)} CFA
                  </div>
                  <div className="text-sm text-gray-400">Total Expenses</div>
                </div>
                <div className="ml-auto">
                  <button
                    onClick={() => {
                      setIsAddingExpense(true)
                      setEditingExpense(null)
                      resetForm()
                    }}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
                  >
                    Add Expense
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Add/Edit Form */}
          {(isAddingExpense || editingExpense) && (
            <div className="bg-gray-800 overflow-hidden shadow rounded-lg mb-6 border border-gray-700">
              <div className="px-4 py-5 sm:p-6">
                <h3 className="text-lg font-medium text-white mb-4">
                  {editingExpense ? 'Edit Expense' : 'Add New Expense'}
                </h3>
                <form
                  onSubmit={(e) => {
                    e.preventDefault()
                    if (editingExpense) {
                      handleUpdateExpense(editingExpense)
                    } else {
                      handleAddExpense(e)
                    }
                  }}
                  className="space-y-4"
                >
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <label className="block text-sm font-medium text-gray-300">
                        Title
                      </label>
                      <input
                        type="text"
                        required
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        className="mt-1 block w-full border-gray-600 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm px-3 py-2 border bg-gray-700 text-white placeholder-gray-400"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-300">
                        Amount (CFA)
                      </label>
                      <input
                        type="number"
                        step="1"
                        required
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        placeholder="e.g. 5000"
                        className="mt-1 block w-full border-gray-600 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm px-3 py-2 border bg-gray-700 text-white placeholder-gray-400"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-300">
                        Category
                      </label>
                      <select
                        required
                        value={category}
                        onChange={(e) => setCategory(e.target.value)}
                        className="mt-1 block w-full border-gray-600 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm px-3 py-2 border bg-gray-700 text-white"
                      >
                        <option value="">Select category</option>
                        <option value="Food">Food</option>
                        <option value="Transportation">Transportation</option>
                        <option value="Entertainment">Entertainment</option>
                        <option value="Shopping">Shopping</option>
                        <option value="Bills">Bills</option>
                        <option value="Healthcare">Healthcare</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Date
                      </label>
                      <input
                        type="date"
                        required
                        value={date}
                        onChange={(e) => setDate(e.target.value)}
                        className="mt-1 block w-full border-gray-600 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm px-3 py-2 border bg-gray-700 text-white"
                      />
                    </div>
                  </div>
                  {error && (
                    <div className="text-red-400 text-sm bg-red-900/20 border border-red-800 rounded p-2">{error}</div>
                  )}
                  <div className="flex space-x-3">
                    <button
                      type="submit"
                      className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
                    >
                      {editingExpense ? 'Update' : 'Add'} Expense
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsAddingExpense(false)
                        setEditingExpense(null)
                        resetForm()
                        setError('')
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

          {/* Expenses List */}
          <div className="bg-gray-800 shadow overflow-hidden sm:rounded-md border border-gray-700">
            <div className="px-4 py-5 sm:px-6">
              <h3 className="text-lg leading-6 font-medium text-white">
                Recent Expenses
              </h3>
            </div>
            {expenses.length === 0 ? (
              <div className="px-4 py-5 sm:px-6 text-center text-gray-400">
                No expenses yet. Add your first expense above!
              </div>
            ) : (
              <ul className="divide-y divide-gray-700">
                {expenses.map((expense) => (
                  <li key={expense.id} className="px-4 py-4 sm:px-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <div className="flex-shrink-0">
                          <div className="text-sm font-medium text-white">
                            {expense.title}
                          </div>
                          <div className="text-sm text-gray-400">
                            {expense.category} • {new Date(expense.date).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-4">
                        <div className="text-sm font-medium text-white">
                          {expense.amount.toFixed(0)} CFA
                        </div>
                        <div className="flex space-x-2">
                          <button
                            onClick={() => startEdit(expense)}
                            className="text-indigo-400 hover:text-indigo-300 text-sm font-medium"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => openDeleteModal(expense.id)}
                            className="text-red-400 hover:text-red-300 text-sm font-medium"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>

      {/* Custom Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex items-center mb-4">
              <div className="flex-shrink-0">
                <svg className="h-6 w-6 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-lg font-medium text-white">Delete Expense</h3>
              </div>
            </div>
            
            <div className="mb-6">
              <p className="text-gray-300">
                Are you sure you want to delete this expense? This action cannot be undone and will permanently remove the expense from your records.
              </p>
            </div>
            
            <div className="flex justify-end space-x-3">
              <button
                onClick={closeDeleteModal}
                className="px-4 py-2 text-sm font-medium text-gray-300 bg-gray-700 hover:bg-gray-600 rounded-md transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmDeleteExpense}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-md transition-colors"
              >
                Delete Expense
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
