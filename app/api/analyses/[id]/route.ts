import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { supabase } from '@/lib/supabase'

// GET - Retrieve a specific analysis by ID
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession()

    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data, error } = await supabase
      .from('analyses')
      .select('*')
      .eq('id', params.id)
      .eq('user_id', session.user.email)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Analysis not found' }, { status: 404 })
      }
      console.error('Supabase error:', error)
      return NextResponse.json({ error: 'Failed to fetch analysis' }, { status: 500 })
    }

    return NextResponse.json({ analysis: data })
  } catch (err) {
    console.error('Error fetching analysis:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE - Delete a specific analysis
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession()

    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { error } = await supabase
      .from('analyses')
      .delete()
      .eq('id', params.id)
      .eq('user_id', session.user.email)

    if (error) {
      console.error('Supabase delete error:', error)
      return NextResponse.json({ error: 'Failed to delete analysis' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Error deleting analysis:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
