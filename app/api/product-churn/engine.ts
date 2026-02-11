/**
 * Product-Level Churn Detection Engine (TypeScript)
 * =================================================
 * Detects when B2B customers stop buying specific individual products
 * while still ordering others — signals competitor pricing or switching.
 *
 * Use Case: Supplier like Fresco detecting that a takeaway stopped ordering
 * Irn Bru (now buying from Booker) but still orders Coca Cola.
 */

export interface Order {
  [key: string]: any  // Accept any column names
}

// Smart column detection patterns (order matters - more specific first)
const COLUMN_PATTERNS = {
  customer: /customer[_\s]?id|account[_\s]?id|client[_\s]?id|customer|account|client|buyer|party|entity|company/i,
  product: /product[_\s]?name|product[_\s]?description|item[_\s]?name|description|product|item|sku|goods|material|service/i,
  quantity: /quantity|qty|units|count|pieces|pcs/i,
  value: /net[_\s]?amount|total[_\s]?amount|gross[_\s]?amount|value|amount|total|price|cost|net|gross|sum|revenue|sales/i,
  date: /invoice[_\s]?date|order[_\s]?date|transaction[_\s]?date|created[_\s]?at|date|created|ordered/i,
}

// Columns to exclude from product detection (codes, IDs)
const PRODUCT_EXCLUDE_PATTERNS = /_code$|_id$|_number$|_num$|_sku$|^code$|^id$|^sku$/i

export interface CategoryAlert {
  customer_id: string
  product_name: string  // The actual product name
  category: string      // Derived category for display/grouping
  products: string[]    // Kept for backward compatibility
  signal_type: 'stopped' | 'declining' | 'irregular'
  severity: 'critical' | 'warning' | 'watch'
  baseline_quantity: number
  current_quantity: number
  drop_percentage: number
  weeks_since_last_order: number
  estimated_lost_revenue: number
  competitor_likely: boolean
  churn_reason: 'competitor' | 'product_switch' | 'business_decline' | 'unknown'
  recommended_discount: number
  recommended_action: string
}

export interface CustomerCategoryProfile {
  customer_id: string
  category: string
  baseline_weekly_qty: number
  baseline_weekly_value: number
  current_weekly_qty: number
  current_weekly_value: number
  last_order_date: string | null
  trend: 'stable' | 'growing' | 'declining' | 'stopped'
  volatility: number
}

export interface RetentionStrategy {
  priority: number
  customer_id: string
  product_name: string
  category: string
  action: string
  discount: number
  potential_save: number
  competitor_type: string
  win_back_probability: number
}

export interface CustomerActionSummary {
  customer_id: string
  priority_score: number          // 0-100, higher = call first
  priority_rank: number           // 1, 2, 3...
  total_monthly_loss: number      // Total £ at risk from this customer
  competitor_loss: number         // £ lost specifically to competitors
  customer_monthly_spend: number  // Current total monthly spend
  customer_health: 'healthy' | 'declining' | 'stopped'
  spend_change_pct: number        // Overall spend change %
  alerts_count: number
  competitor_alerts: number
  top_lost_products: string[]     // Top 3 products lost to competitors
  recommended_action: string      // One-line action summary
  urgency: 'call_today' | 'call_this_week' | 'monitor'
}

export interface AnalysisResult {
  alerts: CategoryAlert[]
  customer_profiles: Record<string, Record<string, CustomerCategoryProfile>>
  action_list: CustomerActionSummary[]  // Prioritised customer call list
  summary: {
    total_customers: number
    customers_with_alerts: number
    total_alerts: number
    critical_alerts: number
    warning_alerts: number
    watch_alerts: number
    total_estimated_monthly_loss: number
    categories_at_risk: string[]
    competitor_signals: number
  }
  recommendations: RetentionStrategy[]
}

// Category synonyms for normalization (used for display and competitor inference)
const CATEGORY_SYNONYMS: Record<string, string[]> = {
  chicken: ['chicken', 'poultry', 'wings', 'breast', 'thighs', 'nuggets', 'popcorn chicken'],
  drinks: ['drinks', 'beverages', 'soft drinks', 'cola', 'water', 'juice', 'fizzy', 'pepsi', 'coca cola', 'coke', 'fanta', 'sprite', 'irn bru', 'red bull', 'energy drink', 'fruit shoot', 'diet coke', 'lemonade', 'lucozade', 'tango', 'dr pepper', 'still water', 'sparkling'],
  cheese: ['cheese', 'dairy', 'cheddar', 'mozzarella', 'parmesan', 'shredded', 'mozz ched', 'grated red'],
  dips: ['dips', 'dip pots', 'sauce', 'condiments', 'mayo', 'mayonnaise', 'ketchup', 'garlic spread', 'garlic parsley', 'sriracha', 'bbq sauce', 'brown sauce', 'hot stuff', 'curry sauce', 'tikka paste', 'dressing', 'tomato sauce', 'peri peri', 'sour cream', 'chilli sauce'],
  produce: ['vegetables', 'produce', 'salad', 'lettuce', 'tomato', 'onion', 'mushroom', 'sweetcorn', 'jalapeno', 'peppers green', 'pineapple'],
  meat: ['meat', 'beef', 'lamb', 'pork', 'mince', 'pepperoni', 'salami', 'doner', 'kebab', 'chorizo', 'sausage', 'meatball'],
  frozen: ['frozen', 'chips', 'fries', 'crunch', 'onion rings', 'mozzarella sticks', 'mac n cheese', 'macaroni bites', 'cheese nuggets', 'select fries', 'fast food'],
  packaging: ['packaging', 'boxes', 'containers', 'bags', 'napkins', 'pizza box', 'carrier bag', 'meal box', 'cups+lids', 'cups lids', 'satco', 'tripod', 'spacer', 'paper bag', 'lids', 'bagasse', 'compartment', 'epp boxes', 'chicken boxes', 'side order', 'appetizer'],
  oil: ['rapeseed oil', 'vegetable oil', 'olive oil', 'oil blend', 'pomace'],
  sundries: ['till roll', 'thermal', 'centre feed', 'blue centre', 'fork', 'spoon', 'wooden', 'birchwood', 'nutella', 'flour', 'semolina', 'yeast'],
}

// Competitor type patterns
const COMPETITOR_PATTERNS: Record<string, {
  typical_advantage: number
  categories: string[]
}> = {
  cash_and_carry: {
    typical_advantage: 15,
    categories: ['drinks', 'frozen', 'packaging', 'oil', 'sundries'],
  },
  wholesaler: {
    typical_advantage: 10,
    categories: ['chicken', 'meat', 'produce', 'cheese', 'dips'],
  },
  direct_manufacturer: {
    typical_advantage: 20,
    categories: ['drinks', 'packaging', 'oil'],
  },
  online: {
    typical_advantage: 12,
    categories: ['packaging', 'sundries'],
  },
}

// Product frequency types for smarter thresholds
type ProductFrequency = 'core' | 'regular' | 'occasional'

// Dynamic thresholds based on product frequency
const FREQUENCY_THRESHOLDS: Record<ProductFrequency, {
  stopped_weeks: number
  decline_pct: number
  critical_decline_pct: number
  min_orders: number  // Minimum orders in baseline to flag
}> = {
  core: {      // Products ordered weekly/bi-weekly
    stopped_weeks: 4,
    decline_pct: 50,
    critical_decline_pct: 75,
    min_orders: 4,
  },
  regular: {   // Products ordered monthly
    stopped_weeks: 8,
    decline_pct: 60,
    critical_decline_pct: 85,
    min_orders: 3,
  },
  occasional: { // Products ordered every few months
    stopped_weeks: 16,
    decline_pct: 75,
    critical_decline_pct: 95,
    min_orders: 2,
  }
}

export class ProductLevelChurnEngine {
  private lookbackWeeks: number
  private baselineWeeks: number
  private thresholds: {
    stopped_weeks: number
    decline_pct: number
    critical_decline_pct: number
  }
  private detectedSchema: {
    customer: string | null
    product: string | null
    quantity: string | null
    value: string | null
    date: string | null
  } | null = null

  constructor(lookbackWeeks = 52, baselineMonths = 5) {
    this.lookbackWeeks = lookbackWeeks
    this.baselineWeeks = baselineMonths * 4  // approx weeks
    this.thresholds = {
      stopped_weeks: 6,
      decline_pct: 50,
      critical_decline_pct: 80,
    }
  }

  // Calculate average days between orders to classify product frequency
  private classifyProductFrequency(orders: Order[]): ProductFrequency {
    if (orders.length < 2) return 'occasional'

    const sortedOrders = [...orders].sort((a, b) =>
      (a.date || '').localeCompare(b.date || '')
    )

    const gaps: number[] = []
    for (let i = 1; i < sortedOrders.length; i++) {
      const prevDate = this.parseDate(sortedOrders[i - 1].date || '')
      const currDate = this.parseDate(sortedOrders[i].date || '')
      if (prevDate && currDate) {
        const daysDiff = (currDate.getTime() - prevDate.getTime()) / (24 * 60 * 60 * 1000)
        if (daysDiff > 0) gaps.push(daysDiff)
      }
    }

    if (gaps.length === 0) return 'occasional'

    const avgGap = gaps.reduce((a, b) => a + b, 0) / gaps.length

    if (avgGap <= 14) return 'core'
    if (avgGap <= 45) return 'regular'
    return 'occasional'
  }

  // Auto-detect column names from data
  private detectSchema(orders: Order[]): void {
    if (orders.length === 0) return

    const firstRow = orders[0]
    const columns = Object.keys(firstRow)

    this.detectedSchema = {
      customer: null,
      product: null,
      quantity: null,
      value: null,
      date: null,
    }

    for (const col of columns) {
      const colLower = col.toLowerCase()

      if (!this.detectedSchema.customer && COLUMN_PATTERNS.customer.test(colLower)) {
        this.detectedSchema.customer = col
      }

      if (COLUMN_PATTERNS.product.test(colLower)) {
        if (PRODUCT_EXCLUDE_PATTERNS.test(colLower)) continue
        if (COLUMN_PATTERNS.customer.test(colLower) && !colLower.includes('product')) continue
        if (!this.detectedSchema.product ||
            colLower.includes('name') ||
            colLower.includes('description')) {
          this.detectedSchema.product = col
        }
      }

      if (!this.detectedSchema.quantity && COLUMN_PATTERNS.quantity.test(colLower)) {
        if (!colLower.includes('price') && !colLower.includes('total') && !colLower.includes('net')) {
          this.detectedSchema.quantity = col
        }
      }

      if (COLUMN_PATTERNS.value.test(colLower)) {
        if (!this.detectedSchema.value ||
            colLower.includes('net') ||
            colLower.includes('total') ||
            colLower.includes('amount')) {
          this.detectedSchema.value = col
        }
      }

      if (COLUMN_PATTERNS.date.test(colLower)) {
        if (colLower.includes('number') || colLower.includes('num') || colLower.includes('no')) continue
        if (!this.detectedSchema.date || colLower.includes('date')) {
          this.detectedSchema.date = col
        }
      }
    }

    console.log('Detected schema:', this.detectedSchema)
  }

  // Get value from order using detected or fallback column names
  private getField(order: Order, fieldType: 'customer' | 'product' | 'quantity' | 'value' | 'date'): any {
    if (this.detectedSchema && this.detectedSchema[fieldType]) {
      const val = order[this.detectedSchema[fieldType]!]
      if (val !== undefined && val !== null && val !== '') return val
    }

    const fallbacks: Record<string, string[]> = {
      customer: ['customer_id', 'customer', 'account', 'client', 'buyer', 'customer_name', 'account_id', 'client_id'],
      product: ['product', 'product_name', 'item', 'sku', 'description', 'category', 'goods', 'service'],
      quantity: ['quantity', 'qty', 'units', 'count', 'pieces', 'pcs'],
      value: ['net_amount', 'value', 'amount', 'total', 'price', 'net', 'gross', 'revenue', 'sales', 'unit_price'],
      date: ['date', 'invoice_date', 'order_date', 'transaction_date', 'created_at', 'created'],
    }

    for (const fallback of fallbacks[fieldType]) {
      if (order[fallback] !== undefined) return order[fallback]
      const key = Object.keys(order).find(k => k.toLowerCase() === fallback.toLowerCase())
      if (key && order[key] !== undefined) return order[key]
    }

    return null
  }

  // Normalize product name for consistent grouping
  private normalizeProductName(raw: string): string {
    if (!raw) return ''
    return String(raw).replace(/\s+/g, ' ').trim()
  }

  // Derive a category from product name for display and competitor inference
  // Uses longest-match-first to avoid "onion" matching produce when "onion rings" should match frozen
  private deriveCategory(productName: string): string {
    if (!productName) return 'other'
    const lower = String(productName).toLowerCase().replace(/\s+/g, ' ').trim()
    if (!lower || lower.length <= 2) return 'other'

    let bestMatch: { category: string; length: number } | null = null
    for (const [category, synonyms] of Object.entries(CATEGORY_SYNONYMS)) {
      for (const syn of synonyms) {
        if (lower.includes(syn) && (!bestMatch || syn.length > bestMatch.length)) {
          bestMatch = { category, length: syn.length }
        }
      }
    }
    return bestMatch ? bestMatch.category : 'other'
  }

  // Parse date from various formats
  private normalizeDateString(dateVal: any): string {
    if (!dateVal) return ''

    let dateStr = String(dateVal)

    // Handle DD-MMM-YYYY format (01-JAN-2025)
    if (dateStr.match(/^\d{2}-[A-Z]{3}-\d{4}$/i)) {
      const months: Record<string, string> = {
        'JAN': '01', 'FEB': '02', 'MAR': '03', 'APR': '04',
        'MAY': '05', 'JUN': '06', 'JUL': '07', 'AUG': '08',
        'SEP': '09', 'OCT': '10', 'NOV': '11', 'DEC': '12'
      }
      const parts = dateStr.toUpperCase().split('-')
      const month = months[parts[1]] || '01'
      return `${parts[2]}-${month}-${parts[0]}`
    }

    if (dateStr.match(/^\d{2}\/\d{2}\/\d{4}$/)) {
      const parts = dateStr.split('/')
      return `${parts[2]}-${parts[1]}-${parts[0]}`
    }

    if (dateStr.match(/^\d{1,2}\/\d{1,2}\/\d{4}$/)) {
      const parts = dateStr.split('/')
      return `${parts[2]}-${parts[0].padStart(2, '0')}-${parts[1].padStart(2, '0')}`
    }

    if (dateStr.includes('T')) {
      return dateStr.split('T')[0]
    }

    return dateStr
  }

  // Store original product name for each normalized key per customer
  private productDisplayNames: Map<string, Map<string, string>> = new Map()

  // Group orders by customer → product_name → orders[]
  private parseOrders(orders: Order[]): Map<string, Map<string, Order[]>> {
    this.detectSchema(orders)

    const grouped = new Map<string, Map<string, Order[]>>()
    this.productDisplayNames = new Map()

    for (const order of orders) {
      const customerId = this.getField(order, 'customer')
      const rawProduct = this.getField(order, 'product')

      if (!customerId || !rawProduct) continue

      const productName = this.normalizeProductName(String(rawProduct))
      if (!productName || productName.length <= 2) continue

      const customerKey = String(customerId)
      const productKey = productName.toLowerCase()

      if (!grouped.has(customerKey)) {
        grouped.set(customerKey, new Map())
        this.productDisplayNames.set(customerKey, new Map())
      }

      const customerMap = grouped.get(customerKey)!
      const displayNames = this.productDisplayNames.get(customerKey)!

      if (!customerMap.has(productKey)) {
        customerMap.set(productKey, [])
        // Store the first-seen version as the display name
        displayNames.set(productKey, productName)
      }

      const dateVal = this.getField(order, 'date')
      const dateStr = this.normalizeDateString(dateVal)

      const quantity = Number(this.getField(order, 'quantity')) || 1
      const unitValue = Number(this.getField(order, 'value')) || 0

      // The value column might be unit price (not line total)
      // Compute actual line total = quantity × unit value
      const lineTotal = quantity * unitValue

      customerMap.get(productKey)!.push({
        date: dateStr,
        quantity: quantity,
        value: lineTotal,
      } as Order)
    }

    return grouped
  }

  private getDisplayName(customerId: string, productKey: string): string {
    const names = this.productDisplayNames.get(customerId)
    return names?.get(productKey) || productKey
  }

  private parseDate(dateStr: string): Date | null {
    try {
      return new Date(dateStr)
    } catch {
      return null
    }
  }

  // Find the global earliest date across all orders for a customer
  // so baseline window is consistent per customer, not per product
  private customerEarliestDates: Map<string, Date> = new Map()

  private getBaselineEnd(customerId: string): Date {
    const earliest = this.customerEarliestDates.get(customerId)
    if (!earliest) return new Date()
    const baselineEnd = new Date(earliest)
    baselineEnd.setMonth(baselineEnd.getMonth() + 5) // First 5 months
    return baselineEnd
  }

  private calculateBaseline(
    orders: Order[],
    referenceDate: Date,
    customerId: string
  ): { qty: number; value: number; orderCount: number; monthlyQty: number; monthlyValue: number } {
    const sortedOrders = [...orders].sort((a, b) =>
      (a.date || '').localeCompare(b.date || '')
    )

    const earliest = this.customerEarliestDates.get(customerId)
    if (!earliest) {
      return { qty: 0, value: 0, orderCount: 0, monthlyQty: 0, monthlyValue: 0 }
    }

    const baselineEnd = this.getBaselineEnd(customerId)

    const baselineOrders = sortedOrders.filter(o => {
      const orderDate = this.parseDate(o.date || '')
      return orderDate && orderDate >= earliest && orderDate <= baselineEnd
    })

    if (baselineOrders.length === 0) {
      return { qty: 0, value: 0, orderCount: 0, monthlyQty: 0, monthlyValue: 0 }
    }

    const totalQty = baselineOrders.reduce((sum, o) => sum + (o.quantity || 0), 0)
    const totalValue = baselineOrders.reduce((sum, o) => sum + (o.value || 0), 0)

    // Use the ACTIVE ordering span for this product to calculate monthly rate
    // e.g. if they ordered from Jun 14 to Jul 12 (28 days), that's ~1 month
    const firstOrderDate = this.parseDate(baselineOrders[0].date || '')
    const lastOrderDate = this.parseDate(baselineOrders[baselineOrders.length - 1].date || '')

    let activeMonths: number
    if (firstOrderDate && lastOrderDate && baselineOrders.length > 1) {
      const activeDays = (lastOrderDate.getTime() - firstOrderDate.getTime()) / (24 * 60 * 60 * 1000)
      // Add average gap to account for the period after last order
      const avgGap = activeDays / (baselineOrders.length - 1)
      activeMonths = Math.max(1, (activeDays + avgGap) / 30)
    } else {
      // Single order — treat as 1 month of activity
      activeMonths = 1
    }

    return {
      qty: totalQty,
      value: totalValue,
      orderCount: baselineOrders.length,
      monthlyQty: totalQty / activeMonths,
      monthlyValue: totalValue / activeMonths,
    }
  }

  private calculateCurrent(
    orders: Order[],
    referenceDate: Date,
    customerId: string
  ): { qty: number; value: number; lastOrder: string | null; monthlyQty: number; monthlyValue: number } {
    const baselineEnd = this.getBaselineEnd(customerId)

    // "Current" = last 3 months of data for a fair comparison
    const currentStart = new Date(referenceDate)
    currentStart.setMonth(currentStart.getMonth() - 3)

    const currentOrders = orders.filter(o => {
      const orderDate = this.parseDate(o.date || '')
      return orderDate && orderDate >= currentStart && orderDate <= referenceDate
    })

    let lastOrderDate: string | null = null
    for (const order of orders) {
      if (!lastOrderDate || (order.date && order.date > lastOrderDate)) {
        lastOrderDate = order.date || null
      }
    }

    const totalQty = currentOrders.reduce((sum, o) => sum + (o.quantity || 0), 0)
    const totalValue = currentOrders.reduce((sum, o) => sum + (o.value || 0), 0)

    return {
      qty: totalQty,
      value: totalValue,
      lastOrder: lastOrderDate,
      monthlyQty: totalQty / 3,  // 3 months
      monthlyValue: totalValue / 3,
    }
  }

  private detectTrendWithThresholds(
    baselineQty: number,
    currentQty: number,
    lastOrderDate: string | null,
    referenceDate: Date,
    thresholds: { stopped_weeks: number; decline_pct: number; critical_decline_pct: number }
  ): 'stable' | 'growing' | 'declining' | 'stopped' {
    if (lastOrderDate) {
      const lastDate = this.parseDate(lastOrderDate)
      if (lastDate) {
        const weeksSince = (referenceDate.getTime() - lastDate.getTime()) / (7 * 24 * 60 * 60 * 1000)
        if (weeksSince >= thresholds.stopped_weeks) {
          return 'stopped'
        }
      }
    }

    if (baselineQty === 0) {
      return currentQty === 0 ? 'stable' : 'growing'
    }

    const changePct = ((currentQty - baselineQty) / baselineQty) * 100

    if (changePct <= -thresholds.critical_decline_pct) return 'stopped'
    if (changePct <= -thresholds.decline_pct) return 'declining'
    if (changePct >= 20) return 'growing'
    return 'stable'
  }

  private inferCompetitorType(category: string): { type: string; advantage: number } {
    for (const [compType, info] of Object.entries(COMPETITOR_PATTERNS)) {
      if (info.categories.includes(category)) {
        return { type: compType, advantage: info.typical_advantage }
      }
    }
    return { type: 'unknown', advantage: 10 }
  }

  private generateRecommendation(
    severity: string,
    dropPct: number,
    productName: string,
    category: string,
    competitorType: string
  ): { discount: number; action: string } {
    let discount: number
    let action: string

    if (severity === 'critical') {
      discount = Math.min(25, 10 + dropPct / 10)

      if (competitorType === 'cash_and_carry') {
        action = `URGENT: Customer likely buying ${productName} from cash & carry (Booker/Costco). Call immediately and offer ${discount.toFixed(0)}% bulk pricing match + free delivery.`
      } else if (competitorType === 'wholesaler') {
        action = `URGENT: Lost ${productName} to competing wholesaler. Call and offer ${discount.toFixed(0)}% discount plus quality guarantee.`
      } else {
        action = `URGENT: Call customer immediately. Offer ${discount.toFixed(0)}% discount on ${productName} for next 4 weeks.`
      }
    } else if (severity === 'warning') {
      discount = Math.min(15, 5 + dropPct / 20)
      action = `Schedule call within 48hrs. Offer ${discount.toFixed(0)}% loyalty discount on ${productName} or bundle with regular items.`
    } else {
      discount = 5
      action = `Monitor closely. Consider ${productName} samples in next delivery or promotional pricing.`
    }

    return { discount, action }
  }

  private calculateWinBackProbability(
    signalStrength: number,
    weeksSinceLoss: number,
    competitorAdvantage: number
  ): number {
    let prob = 0.7
    prob -= (signalStrength / 100) * 0.3
    prob -= Math.min(0.3, weeksSinceLoss * 0.03)
    prob -= (competitorAdvantage / 100) * 0.2
    return Math.max(0.1, Math.min(0.9, prob))
  }

  analyze(orders: Order[], referenceDate?: string): AnalysisResult {
    this.detectSchema(orders)

    // Auto-detect reference date from data
    let refDate: Date
    if (referenceDate) {
      refDate = new Date(referenceDate)
    } else {
      let latestDate: Date | null = null
      for (const order of orders) {
        const dateVal = this.getField(order, 'date')
        if (dateVal) {
          const dateStr = this.normalizeDateString(dateVal)
          const orderDate = this.parseDate(dateStr)
          if (orderDate && (!latestDate || orderDate > latestDate)) {
            latestDate = orderDate
          }
        }
      }
      refDate = latestDate || new Date()
      console.log('Auto-detected reference date:', refDate.toISOString().split('T')[0])
    }

    // Group by customer → individual product → orders
    const grouped = this.parseOrders(orders)

    // Pre-compute earliest order date per customer (for consistent baseline window)
    this.customerEarliestDates = new Map()
    for (const [customerId, products] of grouped) {
      let earliest: Date | null = null
      for (const [, productOrders] of products) {
        for (const o of productOrders) {
          const d = this.parseDate(o.date || '')
          if (d && (!earliest || d < earliest)) {
            earliest = d
          }
        }
      }
      if (earliest) {
        this.customerEarliestDates.set(customerId, earliest)
        const baselineEnd = this.getBaselineEnd(customerId)
        console.log(`Customer ${customerId}: data from ${earliest.toISOString().split('T')[0]}, baseline ends ${baselineEnd.toISOString().split('T')[0]}`)
      }
    }

    // Compute customer-level health: is their TOTAL spend declining?
    // If total spend drops significantly, it's likely business decline, not competitor
    const customerHealth: Map<string, { baselineMonthly: number; currentMonthly: number; dropPct: number; status: 'healthy' | 'declining' | 'stopped' }> = new Map()

    for (const [customerId, products] of grouped) {
      const earliest = this.customerEarliestDates.get(customerId)
      if (!earliest) continue

      const baselineEnd = this.getBaselineEnd(customerId)
      const currentStart = new Date(refDate)
      currentStart.setMonth(currentStart.getMonth() - 3)

      let baselineTotal = 0
      let currentTotal = 0

      for (const [, productOrders] of products) {
        for (const o of productOrders) {
          const d = this.parseDate(o.date || '')
          if (!d) continue
          const val = (o.value || 0)
          if (d >= earliest && d <= baselineEnd) {
            baselineTotal += val
          }
          if (d >= currentStart && d <= refDate) {
            currentTotal += val
          }
        }
      }

      // Baseline: total over 5 months → per month
      const baselineMonthly = baselineTotal / 5
      // Current: total over 3 months → per month
      const currentMonthly = currentTotal / 3

      const dropPct = baselineMonthly > 0 ? ((baselineMonthly - currentMonthly) / baselineMonthly) * 100 : 0

      let status: 'healthy' | 'declining' | 'stopped' = 'healthy'
      if (currentMonthly === 0) status = 'stopped'
      else if (dropPct >= 30) status = 'declining'

      customerHealth.set(customerId, { baselineMonthly, currentMonthly, dropPct, status })
      console.log(`Customer ${customerId} health: baseline £${baselineMonthly.toFixed(0)}/mo → current £${currentMonthly.toFixed(0)}/mo (${dropPct > 0 ? '-' : '+'}${Math.abs(dropPct).toFixed(0)}%) → ${status}`)
    }

    const alerts: CategoryAlert[] = []
    const profiles: Record<string, Record<string, CustomerCategoryProfile>> = {}

    // First pass: build per-product current spend so we can detect product switches
    // A product switch = stopped product X but started a SIMILAR product Y
    const productCurrentData: Map<string, Map<string, { monthlyValue: number; firstOrder: string | null; baselineOrders: number }>> = new Map()

    for (const [customerId, products] of grouped) {
      profiles[customerId] = {}
      productCurrentData.set(customerId, new Map())
      const custData = productCurrentData.get(customerId)!

      for (const [productKey, productOrders] of products) {
        const current = this.calculateCurrent(productOrders, refDate, customerId)
        const baseline = this.calculateBaseline(productOrders, refDate, customerId)

        // Find first order date for this product
        let firstOrder: string | null = null
        for (const o of productOrders) {
          if (!firstOrder || (o.date && o.date < firstOrder)) {
            firstOrder = o.date || null
          }
        }

        custData.set(productKey, {
          monthlyValue: current.monthlyValue,
          firstOrder,
          baselineOrders: baseline.orderCount,
        })
      }
    }

    // Second pass: generate alerts with product switch detection
    for (const [customerId, products] of grouped) {
      profiles[customerId] = {}
      const custData = productCurrentData.get(customerId)!

      for (const [productKey, productOrders] of products) {
        productOrders.sort((a, b) => (b.date || '').localeCompare(a.date || ''))

        const displayName = this.getDisplayName(customerId, productKey)
        const category = this.deriveCategory(productKey)

        // Classify how frequently this product was ordered during baseline
        const frequency = this.classifyProductFrequency(productOrders)
        const thresholds = FREQUENCY_THRESHOLDS[frequency]

        const baseline = this.calculateBaseline(productOrders, refDate, customerId)
        const current = this.calculateCurrent(productOrders, refDate, customerId)

        // Compare baseline monthly rate vs current monthly rate
        const trend = this.detectTrendWithThresholds(
          baseline.monthlyQty, current.monthlyQty, current.lastOrder, refDate, thresholds
        )

        // Build profile
        const profile: CustomerCategoryProfile = {
          customer_id: customerId,
          category: displayName,
          baseline_weekly_qty: Math.round(baseline.monthlyQty * 100) / 100,
          baseline_weekly_value: Math.round(baseline.monthlyValue * 100) / 100,
          current_weekly_qty: Math.round(current.monthlyQty * 100) / 100,
          current_weekly_value: Math.round(current.monthlyValue * 100) / 100,
          last_order_date: current.lastOrder,
          trend,
          volatility: 0,
        }
        profiles[customerId][productKey] = profile

        // Skip if not enough orders in baseline (prevents false positives)
        if (baseline.orderCount < thresholds.min_orders) {
          continue
        }

        // Generate alerts for products that are declining or stopped
        if (trend === 'stopped' || trend === 'declining') {
          const dropPct = baseline.monthlyQty > 0
            ? ((baseline.monthlyQty - current.monthlyQty) / baseline.monthlyQty) * 100
            : 0

          let weeksSince = 0
          if (current.lastOrder) {
            const lastDate = this.parseDate(current.lastOrder)
            if (lastDate) {
              weeksSince = Math.floor(
                (refDate.getTime() - lastDate.getTime()) / (7 * 24 * 60 * 60 * 1000)
              )
            }
          }

          let severity: 'critical' | 'warning' | 'watch'
          if (trend === 'stopped' && weeksSince >= thresholds.stopped_weeks) {
            severity = dropPct >= thresholds.critical_decline_pct ? 'critical' : 'warning'
          } else if (dropPct >= thresholds.critical_decline_pct) {
            severity = 'critical'
          } else if (dropPct >= thresholds.decline_pct) {
            severity = 'warning'
          } else {
            severity = 'watch'
          }

          if (frequency === 'occasional' && severity === 'critical') {
            severity = 'warning'
          }

          // Check if this is a product switch — look for a VERY SIMILAR product
          // that is currently being ordered (same core product, different brand/size/variant)
          // e.g. "KTC RAPESEED OIL 20LTR" → "Plastic KTC Vegetable Oil 20L" = YES (both cooking oil)
          //      "GARLIC PARSLEY SPREAD 1.5KG" → "GARLIC PARSLEY SPREAD 1KG" = YES (same product, smaller)
          //      "DICED CHICKEN 2.5KG" → "Chicken Popcorn 1KG" = NO (completely different products)
          //      "BLUE CENTRE FEED ROLLS 6PCS" → "Active Blue Centre feed Roll x 6pcs" = YES (same product)
          let isProductSwitch = false
          let replacementProduct = ''

          // Strip numbers, sizes, weights, brand prefixes to get the CORE product identity
          const coreIdentity = (name: string): string => {
            return name
              .replace(/\d+(\.\d+)?\s*(kg|ltr|liter|litre|ml|g|pcs|x|mm|oz|pack|case|pc)\b/gi, '')
              .replace(/\b(small|medium|large|gb|eu|pack|case|premium|classic|original|new)\b/gi, '')
              .replace(/[^a-z ]/gi, '')
              .replace(/\s+/g, ' ')
              .trim()
              .split(/\s+/)
              .map(w => w.replace(/s$/, '')) // normalize plurals: rolls→roll, boxes→boxe(ok), cans→can
              .join(' ')
          }

          const stoppedCore = coreIdentity(productKey)

          for (const [otherKey, otherData] of custData) {
            if (otherKey === productKey) continue
            if (otherData.monthlyValue <= 0) continue

            const otherCore = coreIdentity(otherKey)

            // Check if one core name contains the other (high similarity)
            // e.g. "garlic parsley spread" contains "garlic parsley spread"
            // "blue centre feed rolls" ~ "active blue centre feed roll"
            // "grated red cheddar" ~ "grated red cheddar"
            // "sliced doner kebab meat" ~ "cooked sliced doner kebab meat"
            const shorter = stoppedCore.length <= otherCore.length ? stoppedCore : otherCore
            const longer = stoppedCore.length > otherCore.length ? stoppedCore : otherCore

            // The shorter core name must be substantially contained in the longer one
            // and the shorter name must be meaningful (at least 2 words)
            const shorterWords = shorter.split(/\s+/).filter(w => w.length > 2)
            const longerWords = longer.split(/\s+/).filter(w => w.length > 2)

            if (shorterWords.length < 2) continue

            // Count how many of the shorter product's words appear in the longer one
            const matchCount = shorterWords.filter(w => longerWords.includes(w)).length
            const matchRatio = matchCount / shorterWords.length

            // Need 80%+ of the shorter name's words to match
            // This catches: "rapeseed oil" (2 words) needs both → "vegetable oil" only shares "oil" = 50% → NO
            // "garlic parsley spread" (3 words) needs 3 → "garlic parsley spread" = 100% → YES
            // "blue centre feed rolls" (4 words) needs 4 → "active blue centre feed roll" has all 4 → YES
            // "diced chicken" (2 words) needs both → "crispy chicken strips" has "chicken" = 50% → NO
            // "sliced doner kebab meat" (4 words) needs 4 → "cooked sliced doner kebab meat" has all → YES
            if (matchRatio >= 0.8) {
              isProductSwitch = true
              replacementProduct = this.getDisplayName(customerId, otherKey)
              break
            }
          }

          // Determine churn reason based on evidence
          const health = customerHealth.get(customerId)
          let churnReason: 'competitor' | 'product_switch' | 'business_decline' | 'unknown' = 'unknown'

          if (isProductSwitch) {
            churnReason = 'product_switch'
            severity = 'watch'
          } else if (health && health.status === 'stopped') {
            // Customer stopped ordering everything — shop closed / owner changed
            churnReason = 'business_decline'
          } else if (health && health.status === 'declining') {
            // Customer's TOTAL spend is down 30%+ — could be business decline
            // But if they stopped specific products while keeping others, it's mixed
            // If this product dropped MORE than the overall business, competitor is likely
            if (dropPct > health.dropPct + 20) {
              // Product dropped much more than overall business → competitor
              churnReason = 'competitor'
            } else {
              // Product drop is in line with overall decline → business decline
              churnReason = 'business_decline'
              // Don't downgrade severity — still worth knowing, but different action needed
            }
          } else {
            // Customer overall spend is healthy but stopped this product → competitor
            churnReason = 'competitor'
          }

          // Estimated monthly loss = baseline monthly value - current monthly value
          const estimatedLoss = baseline.monthlyValue - current.monthlyValue
          const competitor = this.inferCompetitorType(category)
          const competitorLikely = churnReason === 'competitor'
          const { discount, action } = this.generateRecommendation(
            severity, dropPct, displayName, category, competitor.type
          )

          let recommendedAction: string
          if (isProductSwitch) {
            recommendedAction = `Product switch: customer replaced ${displayName} with ${replacementProduct}. Monitor — likely preference change.`
          } else if (churnReason === 'business_decline') {
            recommendedAction = `Business decline: customer's overall spend is down ${Math.round(health?.dropPct || 0)}%. ${displayName} drop may be due to lower sales volume, not competitor. Check if business is still active.`
          } else {
            recommendedAction = action
          }

          alerts.push({
            customer_id: customerId,
            product_name: displayName,
            category,
            products: [displayName],
            signal_type: trend as 'stopped' | 'declining',
            severity,
            baseline_quantity: Math.round(baseline.monthlyQty * 100) / 100,
            current_quantity: Math.round(current.monthlyQty * 100) / 100,
            drop_percentage: Math.round(dropPct * 10) / 10,
            weeks_since_last_order: weeksSince,
            estimated_lost_revenue: Math.round(estimatedLoss * 100) / 100,
            competitor_likely: competitorLikely,
            churn_reason: churnReason,
            recommended_discount: Math.round(discount * 10) / 10,
            recommended_action: recommendedAction,
          })
        }
      }
    }

    // Sort alerts by severity and lost revenue
    const severityOrder = { critical: 0, warning: 1, watch: 2 }
    alerts.sort((a, b) => {
      const sevDiff = severityOrder[a.severity] - severityOrder[b.severity]
      return sevDiff !== 0 ? sevDiff : b.estimated_lost_revenue - a.estimated_lost_revenue
    })

    // Build recommendations
    const recommendations: RetentionStrategy[] = alerts.slice(0, 10).map((alert, idx) => {
      const competitor = this.inferCompetitorType(alert.category)
      return {
        priority: idx + 1,
        customer_id: alert.customer_id,
        product_name: alert.product_name,
        category: alert.category,
        action: alert.recommended_action,
        discount: alert.recommended_discount,
        potential_save: alert.estimated_lost_revenue,
        competitor_type: competitor.type,
        win_back_probability: this.calculateWinBackProbability(
          alert.drop_percentage,
          alert.weeks_since_last_order,
          competitor.advantage
        ),
      }
    })

    // Build prioritised customer action list
    // Group alerts by customer, calculate priority score
    const customerAlerts = new Map<string, CategoryAlert[]>()
    for (const alert of alerts) {
      if (!customerAlerts.has(alert.customer_id)) {
        customerAlerts.set(alert.customer_id, [])
      }
      customerAlerts.get(alert.customer_id)!.push(alert)
    }

    const actionList: CustomerActionSummary[] = []
    for (const [custId, custAlerts] of customerAlerts) {
      const health = customerHealth.get(custId)
      const competitorAlerts = custAlerts.filter(a => a.churn_reason === 'competitor')
      const totalLoss = custAlerts.reduce((sum, a) => sum + a.estimated_lost_revenue, 0)
      const competitorLoss = competitorAlerts.reduce((sum, a) => sum + a.estimated_lost_revenue, 0)

      // Priority score (0-100):
      // - Competitor loss amount (biggest factor — money on the table)
      // - Recency (recent losses are more winnable)
      // - Customer value (bigger customers matter more)
      // - Reason (competitor > business_decline > product_switch)

      let score = 0

      // 1. Competitor loss amount (0-40 points)
      // £500+/mo = 40pts, £100/mo = 20pts, £0 = 0pts
      score += Math.min(40, (competitorLoss / 500) * 40)

      // 2. Recency — how recently did the losses happen? (0-25 points)
      // Recent losses (< 8 weeks) are winnable, old losses (> 52 weeks) are harder
      const minWeeks = Math.min(...competitorAlerts.map(a => a.weeks_since_last_order).filter(w => w > 0), 999)
      if (minWeeks <= 4) score += 25
      else if (minWeeks <= 8) score += 20
      else if (minWeeks <= 16) score += 15
      else if (minWeeks <= 26) score += 10
      else if (minWeeks <= 52) score += 5
      // > 52 weeks = 0 points

      // 3. Customer current value (0-20 points)
      const currentSpend = health?.currentMonthly || 0
      // £3000+/mo = 20pts, scaling down
      score += Math.min(20, (currentSpend / 3000) * 20)

      // 4. Number of competitor alerts (0-15 points)
      // More products lost = more urgent pattern
      score += Math.min(15, competitorAlerts.length * 3)

      // Penalty: if business is declining or stopped, reduce priority
      if (health?.status === 'stopped') score *= 0.1  // Barely worth calling
      else if (health?.status === 'declining') score *= 0.6

      // Skip if no competitor alerts (only product switches)
      if (competitorAlerts.length === 0) {
        score *= 0.2 // Very low priority
      }

      const topProducts = competitorAlerts
        .sort((a, b) => b.estimated_lost_revenue - a.estimated_lost_revenue)
        .slice(0, 3)
        .map(a => a.product_name)

      // Determine urgency
      let urgency: 'call_today' | 'call_this_week' | 'monitor' = 'monitor'
      if (score >= 50 && competitorAlerts.length > 0) urgency = 'call_today'
      else if (score >= 25 && competitorAlerts.length > 0) urgency = 'call_this_week'

      // Build one-line action summary
      let actionSummary: string
      if (health?.status === 'stopped') {
        actionSummary = `Business may be closed — overall spend dropped to £0. Verify if still trading.`
      } else if (competitorAlerts.length === 0) {
        actionSummary = `Product switches only — no competitor action needed. Monitor.`
      } else if (competitorAlerts.length === 1) {
        actionSummary = `Lost ${topProducts[0]} to competitor (£${Math.round(competitorLoss)}/mo). Offer discount to win back.`
      } else {
        actionSummary = `Lost ${competitorAlerts.length} products to competitors (£${Math.round(competitorLoss)}/mo). Top: ${topProducts.slice(0, 2).join(', ')}. Call to discuss pricing.`
      }

      actionList.push({
        customer_id: custId,
        priority_score: Math.round(score),
        priority_rank: 0,  // Set after sorting
        total_monthly_loss: Math.round(totalLoss * 100) / 100,
        competitor_loss: Math.round(competitorLoss * 100) / 100,
        customer_monthly_spend: Math.round((health?.currentMonthly || 0) * 100) / 100,
        customer_health: health?.status || 'healthy',
        spend_change_pct: Math.round(health?.dropPct || 0),
        alerts_count: custAlerts.length,
        competitor_alerts: competitorAlerts.length,
        top_lost_products: topProducts,
        recommended_action: actionSummary,
        urgency,
      })
    }

    // Sort by priority score descending and assign ranks
    actionList.sort((a, b) => b.priority_score - a.priority_score)
    actionList.forEach((item, idx) => { item.priority_rank = idx + 1 })

    // Summary
    const summary = {
      total_customers: grouped.size,
      customers_with_alerts: new Set(alerts.map(a => a.customer_id)).size,
      total_alerts: alerts.length,
      critical_alerts: alerts.filter(a => a.severity === 'critical').length,
      warning_alerts: alerts.filter(a => a.severity === 'warning').length,
      watch_alerts: alerts.filter(a => a.severity === 'watch').length,
      total_estimated_monthly_loss: Math.round(
        alerts.reduce((sum, a) => sum + a.estimated_lost_revenue, 0) * 100
      ) / 100,
      categories_at_risk: [...new Set(alerts.map(a => a.category))],
      competitor_signals: alerts.filter(a => a.competitor_likely).length,
    }

    return { alerts, customer_profiles: profiles, action_list: actionList, summary, recommendations }
  }
}
