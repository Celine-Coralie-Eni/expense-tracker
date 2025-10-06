import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const updateExpenseSchema = z.object({
  title: z.string().min(1, 'Title is required').optional(),
  amount: z.number().positive('Amount must be positive').optional(),
  category: z.string().min(1, 'Category is required').optional(),
  date: z.string().datetime().optional(),
})

// PUT /api/expenses/[id] - Update an expense
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    let userId: string | null = null

    // Try Better Auth session first
    try {
      const session = await auth.api.getSession({
        headers: request.headers,
      })
      if (session) {
        userId = session.user.id
        console.log('🔍 PUT /api/expenses/[id] - Better Auth session found for user:', userId)
      }
    } catch {
      console.log('🔍 PUT /api/expenses/[id] - Better Auth session not found')
    }

    // Remove cookie fallback - security issue
    if (!userId) {
      console.log('🔍 PUT /api/expenses/[id] - No session found, returning 401')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()
    const validatedData = updateExpenseSchema.parse(body)

    // Check if expense exists and belongs to user
    const existingExpense = await prisma.expense.findFirst({
      where: {
        id,
        userId: userId,
      },
    })

    if (!existingExpense) {
      return NextResponse.json(
        { error: 'Expense not found' },
        { status: 404 }
      )
    }

    const updateData: Record<string, unknown> = {}
    if (validatedData.title !== undefined) updateData.title = validatedData.title
    if (validatedData.amount !== undefined) updateData.amount = validatedData.amount
    if (validatedData.category !== undefined) updateData.category = validatedData.category
    if (validatedData.date !== undefined) updateData.date = new Date(validatedData.date)

    const expense = await prisma.expense.update({
      where: { id },
      data: updateData,
    })

    return NextResponse.json(expense)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }

    console.error('Error updating expense:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// DELETE /api/expenses/[id] - Delete an expense
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    let userId: string | null = null

    // Try Better Auth session first
    try {
      const session = await auth.api.getSession({
        headers: request.headers,
      })
      if (session) {
        userId = session.user.id
        console.log('🔍 DELETE /api/expenses/[id] - Better Auth session found for user:', userId)
      }
    } catch {
      console.log('🔍 DELETE /api/expenses/[id] - Better Auth session not found')
    }

    // Remove cookie fallback - security issue
    if (!userId) {
      console.log('🔍 DELETE /api/expenses/[id] - No session found, returning 401')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    // Check if expense exists and belongs to user
    const existingExpense = await prisma.expense.findFirst({
      where: {
        id,
        userId: userId,
      },
    })

    if (!existingExpense) {
      return NextResponse.json(
        { error: 'Expense not found' },
        { status: 404 }
      )
    }

    await prisma.expense.delete({
      where: { id },
    })

    return NextResponse.json({ message: 'Expense deleted successfully' })
  } catch (error) {
    console.error('Error deleting expense:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
