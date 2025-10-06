import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const createExpenseSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  amount: z.number().positive('Amount must be positive'),
  category: z.string().min(1, 'Category is required'),
  date: z.string().datetime(),
})

// GET /api/expenses - Get user's expenses
export async function GET(request: NextRequest) {
  try {
    let userId: string | null = null
    let sessionSource = 'none'

    // Try Better Auth session first
    try {
      const session = await auth.api.getSession({
        headers: request.headers,
      })
      if (session) {
        userId = session.user.id
        sessionSource = 'better-auth'
        console.log('🔍 GET /api/expenses - Better Auth session found:', {
          userId: userId,
          userEmail: session.user.email,
          userName: session.user.name
        })
      }
    } catch {
      console.log('🔍 GET /api/expenses - Better Auth session not found')
    }

    // Fallback to Google OAuth cookie (REMOVE THIS - it's causing the security issue)
    if (!userId) {
      console.log('🔍 GET /api/expenses - No session found, returning 401')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('🔍 GET /api/expenses - Fetching expenses for userId:', userId, 'source:', sessionSource)

    const expenses = await prisma.expense.findMany({
      where: {
        userId: userId,
      },
      orderBy: {
        date: 'desc',
      },
    })

    console.log('🔍 GET /api/expenses - Found', expenses.length, 'expenses for user', userId)
    return NextResponse.json(expenses)
  } catch (error) {
    console.error('Error fetching expenses:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST /api/expenses - Create new expense
export async function POST(request: NextRequest) {
  try {
    let userId: string | null = null

    // Try Better Auth session first
    try {
      const session = await auth.api.getSession({
        headers: request.headers,
      })
      if (session) {
        userId = session.user.id
        console.log('🔍 POST /api/expenses - Better Auth session found:', {
          userId: userId,
          userEmail: session.user.email,
          userName: session.user.name
        })
      }
    } catch {
      console.log('🔍 POST /api/expenses - Better Auth session not found')
    }

    // Remove fallback to cookies - security issue
    if (!userId) {
      console.log('🔍 POST /api/expenses - No session found, returning 401')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const validatedData = createExpenseSchema.parse(body)

    const expense = await prisma.expense.create({
      data: {
        title: validatedData.title,
        amount: validatedData.amount,
        category: validatedData.category,
        date: new Date(validatedData.date),
        userId: userId,
      },
    })

    return NextResponse.json(expense, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }

    console.error('Error creating expense:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
