import { NextRequest, NextResponse } from 'next/server'
import { google } from 'googleapis'
import { cookies } from 'next/headers'

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.NEXTAUTH_URL + '/api/gmail/callback'
)

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
}

// Parse invoice content from email body or attachment
function parseInvoiceContent(content: string, subject: string): Partial<InvoiceData> | null {
  // Try to extract invoice data from email content
  const invoice: Partial<InvoiceData> = {
    products: []
  }

  // Extract invoice number
  const invoiceMatch = content.match(/invoice\s*(?:no|number|#)?[:\s]*([A-Z0-9-]+)/i)
  if (invoiceMatch) {
    invoice.invoice_number = invoiceMatch[1]
  }

  // Extract date
  const dateMatch = content.match(/(?:date|dated?)[:\s]*(\d{1,2}[-\/]\w{3,9}[-\/]\d{2,4}|\d{1,2}[-\/]\d{1,2}[-\/]\d{2,4})/i)
  if (dateMatch) {
    invoice.date = dateMatch[1]
  }

  // Extract total amount
  const totalMatch = content.match(/(?:total|amount|grand total)[:\s]*[£$]?\s*([\d,]+\.?\d*)/i)
  if (totalMatch) {
    invoice.total_amount = parseFloat(totalMatch[1].replace(/,/g, ''))
  }

  // Extract product lines (simplified pattern)
  const productPattern = /(.+?)\s+(\d+)\s+[£$]?([\d.]+)\s+[£$]?([\d.]+)/g
  let match
  while ((match = productPattern.exec(content)) !== null) {
    const [, name, qty, price, total] = match
    if (name && !name.match(/^(subtotal|total|vat|tax|delivery)/i)) {
      invoice.products!.push({
        name: name.trim(),
        quantity: parseInt(qty),
        unit_price: parseFloat(price),
        total: parseFloat(total)
      })
    }
  }

  // Set supplier from subject line
  if (subject.toLowerCase().includes('fresco')) {
    invoice.supplier = 'Fresco Food Services'
  }

  return invoice.invoice_number || invoice.products!.length > 0 ? invoice : null
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const supplier = searchParams.get('supplier') || 'fresco'
  const months = parseInt(searchParams.get('months') || '18')

  try {
    const cookieStore = await cookies()
    const tokensCookie = cookieStore.get('gmail_tokens')

    if (!tokensCookie) {
      return NextResponse.json({
        success: false,
        error: 'Gmail not connected. Please connect your Gmail first.',
        needsAuth: true
      }, { status: 401 })
    }

    const tokens = JSON.parse(tokensCookie.value)
    oauth2Client.setCredentials(tokens)

    const gmail = google.gmail({ version: 'v1', auth: oauth2Client })

    // Calculate date range
    const startDate = new Date()
    startDate.setMonth(startDate.getMonth() - months)
    const afterDate = startDate.toISOString().split('T')[0].replace(/-/g, '/')

    // Search for emails from Fresco
    const query = `from:${supplier} after:${afterDate} (invoice OR order OR statement)`

    const response = await gmail.users.messages.list({
      userId: 'me',
      q: query,
      maxResults: 500,
    })

    const messages = response.data.messages || []
    const invoices: InvoiceData[] = []

    // Fetch and parse each message
    for (const message of messages.slice(0, 100)) { // Limit to 100 for performance
      try {
        const msg = await gmail.users.messages.get({
          userId: 'me',
          id: message.id!,
          format: 'full',
        })

        const headers = msg.data.payload?.headers || []
        const subject = headers.find(h => h.name === 'Subject')?.value || ''
        const date = headers.find(h => h.name === 'Date')?.value || ''
        const from = headers.find(h => h.name === 'From')?.value || ''

        // Get email body
        let body = ''
        const payload = msg.data.payload

        if (payload?.body?.data) {
          body = Buffer.from(payload.body.data, 'base64').toString('utf-8')
        } else if (payload?.parts) {
          for (const part of payload.parts) {
            if (part.mimeType === 'text/plain' && part.body?.data) {
              body += Buffer.from(part.body.data, 'base64').toString('utf-8')
            }
          }
        }

        // Parse invoice data
        const invoiceData = parseInvoiceContent(body, subject)
        if (invoiceData) {
          invoices.push({
            date: invoiceData.date || new Date(date).toISOString().split('T')[0],
            invoice_number: invoiceData.invoice_number || `INV-${message.id?.slice(0, 8)}`,
            customer_id: 'TASTEPIZZA',
            customer_name: 'Taste Pizza',
            products: invoiceData.products || [],
            total_amount: invoiceData.total_amount || 0,
            supplier: invoiceData.supplier || supplier,
          } as InvoiceData)
        }
      } catch (err) {
        console.error('Error parsing message:', err)
      }
    }

    return NextResponse.json({
      success: true,
      emails_found: messages.length,
      invoices_parsed: invoices.length,
      invoices,
      date_range: {
        from: afterDate,
        to: new Date().toISOString().split('T')[0]
      }
    })
  } catch (err: any) {
    console.error('Gmail fetch error:', err)

    // Check if token expired
    if (err.code === 401 || err.message?.includes('invalid_grant')) {
      return NextResponse.json({
        success: false,
        error: 'Gmail token expired. Please reconnect.',
        needsAuth: true
      }, { status: 401 })
    }

    return NextResponse.json({
      success: false,
      error: err.message || 'Failed to fetch invoices'
    }, { status: 500 })
  }
}
