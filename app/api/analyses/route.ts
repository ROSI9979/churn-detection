import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { supabase } from '@/lib/supabase'

// GET - Retrieve user's analysis history
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession()

    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data, error } = await supabase
      .from('analyses')
      .select('id, created_at, file_name, total_customers, total_alerts, critical_alerts, warning_alerts, watch_alerts, total_monthly_loss, competitor_signals')
      .eq('user_id', session.user.email)
      .order('created_at', { ascending: false })
      .limit(50)

    if (error) {
      console.error('Supabase error:', error)
      return NextResponse.json({ error: 'Failed to fetch analyses' }, { status: 500 })
    }

    return NextResponse.json({ analyses: data || [] })
  } catch (err) {
    console.error('Error fetching analyses:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST - Save a new analysis
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession()

    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()

    const analysisData = {
      user_id: session.user.email,
      file_name: body.file_name || 'Untitled',
      total_customers: body.summary?.total_customers || 0,
      total_alerts: body.summary?.total_alerts || 0,
      critical_alerts: body.summary?.critical_alerts || 0,
      warning_alerts: body.summary?.warning_alerts || 0,
      watch_alerts: body.summary?.watch_alerts || 0,
      total_monthly_loss: body.summary?.total_estimated_monthly_loss || 0,
      competitor_signals: body.summary?.competitor_signals || 0,
      raw_data: body // Store full analysis result as JSON
    }

    const { data, error } = await supabase
      .from('analyses')
      .insert([analysisData])
      .select('id')
      .single()

    if (error) {
      console.error('Supabase insert error:', error)
      return NextResponse.json({ error: 'Failed to save analysis' }, { status: 500 })
    }

    return NextResponse.json({ success: true, analysis_id: data.id })
  } catch (err) {
    console.error('Error saving analysis:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
