import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { Client } from '@microsoft/microsoft-graph-client'

interface InvoiceData {
  date: string
  invoice_number: string
  customer_id: string
  customer_name: string
  products: {
    name: string
    quantity: number
    unit_price: number
    total: number
  }[]
  total_amount: number
  supplier: string
  email_subject: string
}

// Parse invoice content from email body
function parseInvoiceContent(content: string, subject: string, receivedDate: string): Partial<InvoiceData> | null {
  const invoice: Partial<InvoiceData> = {
    products: [],
    email_subject: subject
  }

  // Clean up HTML if present
  const textContent = content
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')

  // Extract invoice number
  const invoiceMatch = textContent.match(/invoice\s*(?:no|number|#|:)?[\s:]*([A-Z0-9/-]+)/i)
  if (invoiceMatch) {
    invoice.invoice_number = invoiceMatch[1].trim()
  }

  // Extract date from content or use received date
  const dateMatch = textContent.match(/(?:date|dated?)[:\s]*(\d{1,2}[-\/]\w{3,9}[-\/]\d{2,4}|\d{1,2}[-\/]\d{1,2}[-\/]\d{2,4})/i)
  if (dateMatch) {
    invoice.date = dateMatch[1]
  } else {
    // Use email received date
    invoice.date = new Date(receivedDate).toISOString().split('T')[0]
  }

  // Extract total amount - look for various patterns
  const totalPatterns = [
    /(?:grand\s*)?total[:\s]*[£$€]?\s*([\d,]+\.?\d*)/i,
    /amount\s*(?:due|payable)?[:\s]*[£$€]?\s*([\d,]+\.?\d*)/i,
    /[£$€]\s*([\d,]+\.\d{2})\s*(?:total|due)/i,
  ]

  for (const pattern of totalPatterns) {
    const match = textContent.match(pattern)
    if (match) {
      invoice.total_amount = parseFloat(match[1].replace(/,/g, ''))
      break
    }
  }

  // Try to extract product lines
  // Pattern: Product name, quantity, price, total
  const lines = textContent.split(/[\n\r]+/)
  for (const line of lines) {
    // Look for lines with product info: name qty price total
    const productMatch = line.match(/([A-Za-z][A-Za-z0-9\s.]+?)\s+(\d+)\s+[£$€]?([\d.]+)\s+[£$€]?([\d.]+)/)
    if (productMatch) {
      const [, name, qty, price, total] = productMatch
      const productName = name.trim()
      // Skip if it looks like a header or total row
      if (!productName.match(/^(subtotal|total|vat|tax|delivery|shipping|qty|quantity|price|description)/i)) {
        invoice.products!.push({
          name: productName,
          quantity: parseInt(qty),
          unit_price: parseFloat(price),
          total: parseFloat(total)
        })
      }
    }
  }

  // Detect supplier from subject or content
  const supplierPatterns = [
    { pattern: /fresco/i, name: 'Fresco Food Services' },
    { pattern: /booker/i, name: 'Booker' },
    { pattern: /bidfood/i, name: 'Bidfood' },
    { pattern: /brakes/i, name: 'Brakes' },
    { pattern: /jj\s*food/i, name: 'JJ Foodservice' },
  ]

  for (const { pattern, name } of supplierPatterns) {
    if (pattern.test(subject) || pattern.test(textContent)) {
      invoice.supplier = name
      break
    }
  }

  return invoice.invoice_number || invoice.total_amount ? invoice : null
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const supplier = searchParams.get('supplier') || 'fresco'
  const months = parseInt(searchParams.get('months') || '18')

  try {
    const cookieStore = await cookies()
    const tokenCookie = cookieStore.get('outlook_token')

    if (!tokenCookie) {
      return NextResponse.json({
        success: false,
        error: 'Outlook not connected. Please connect your Outlook account first.',
        needsAuth: true
      }, { status: 401 })
    }

    // Create Microsoft Graph client
    const client = Client.init({
      authProvider: (done) => {
        done(null, tokenCookie.value)
      },
    })

    // Calculate date range
    const startDate = new Date()
    startDate.setMonth(startDate.getMonth() - months)
    const afterDate = startDate.toISOString()

    // Search for emails from the supplier
    // Using $search for better text matching
    const searchQuery = `from:${supplier} OR subject:${supplier}`

    const response = await client
      .api('/me/messages')
      .filter(`receivedDateTime ge ${afterDate}`)
      .search(searchQuery)
      .select('id,subject,from,receivedDateTime,body')
      .top(500)
      .orderby('receivedDateTime desc')
      .get()

    const messages = response.value || []
    const invoices: InvoiceData[] = []

    // Parse each message
    for (const message of messages) {
      try {
        const subject = message.subject || ''
        const body = message.body?.content || ''
        const receivedDate = message.receivedDateTime || ''
        const fromEmail = message.from?.emailAddress?.address || ''

        // Skip if not from the right supplier
        const supplierLower = supplier.toLowerCase()
        if (!subject.toLowerCase().includes(supplierLower) &&
            !fromEmail.toLowerCase().includes(supplierLower) &&
            !body.toLowerCase().includes(supplierLower)) {
          continue
        }

        // Parse invoice data
        const invoiceData = parseInvoiceContent(body, subject, receivedDate)
        if (invoiceData) {
          invoices.push({
            date: invoiceData.date || new Date(receivedDate).toISOString().split('T')[0],
            invoice_number: invoiceData.invoice_number || `INV-${message.id?.slice(0, 8)}`,
            customer_id: 'TASTEPIZZA',
            customer_name: 'Taste Pizza',
            products: invoiceData.products || [],
            total_amount: invoiceData.total_amount || 0,
            supplier: invoiceData.supplier || supplier,
            email_subject: subject,
          })
        }
      } catch (err) {
        console.error('Error parsing message:', err)
      }
    }

    // Get account info
    const accountCookie = cookieStore.get('outlook_account')
    const account = accountCookie ? JSON.parse(accountCookie.value) : null

    return NextResponse.json({
      success: true,
      emails_found: messages.length,
      invoices_parsed: invoices.length,
      invoices,
      account,
      date_range: {
        from: startDate.toISOString().split('T')[0],
        to: new Date().toISOString().split('T')[0]
      }
    })
  } catch (err: any) {
    console.error('Outlook fetch error:', err)

    // Check if token expired
    if (err.statusCode === 401 || err.code === 'InvalidAuthenticationToken') {
      return NextResponse.json({
        success: false,
        error: 'Outlook session expired. Please reconnect.',
        needsAuth: true
      }, { status: 401 })
    }

    return NextResponse.json({
      success: false,
      error: err.message || 'Failed to fetch invoices'
    }, { status: 500 })
  }
}
