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

export interface AnalysisResult {
  alerts: CategoryAlert[]
  customer_profiles: Record<string, Record<string, CustomerCategoryProfile>>
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

  constructor(lookbackWeeks = 52, baselineWeeks = 30) {
    this.lookbackWeeks = lookbackWeeks
    this.baselineWeeks = baselineWeeks
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
      const value = Number(this.getField(order, 'value')) || 0

      customerMap.get(productKey)!.push({
        date: dateStr,
        quantity: quantity,
        value: value,
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

  private calculateBaseline(
    orders: Order[],
    referenceDate: Date
  ): { qty: number; value: number; orderCount: number } {
    const sortedOrders = [...orders].sort((a, b) =>
      (a.date || '').localeCompare(b.date || '')
    )

    let earliestDate: Date | null = null
    for (const order of sortedOrders) {
      const d = this.parseDate(order.date || '')
      if (d) {
        earliestDate = d
        break
      }
    }

    if (!earliestDate) {
      return { qty: 0, value: 0, orderCount: 0 }
    }

    // Use first 7 months (210 days) as baseline period
    const baselineEnd = new Date(earliestDate)
    baselineEnd.setDate(baselineEnd.getDate() + 210)

    const baselineOrders = sortedOrders.filter(o => {
      const orderDate = this.parseDate(o.date || '')
      return orderDate && orderDate >= earliestDate! && orderDate <= baselineEnd
    })

    const actualBaselineWeeks = baselineOrders.length > 0 ? 30 : 1

    const totalQty = baselineOrders.reduce((sum, o) => sum + (o.quantity || 0), 0)
    const totalValue = baselineOrders.reduce((sum, o) => sum + (o.value || 0), 0)

    return {
      qty: totalQty / actualBaselineWeeks,
      value: totalValue / actualBaselineWeeks,
      orderCount: baselineOrders.length
    }
  }

  private calculateCurrent(
    orders: Order[],
    referenceDate: Date
  ): { qty: number; value: number; lastOrder: string | null } {
    const recentStart = new Date(referenceDate)
    recentStart.setDate(recentStart.getDate() - 28) // 4 weeks

    const recentOrders = orders.filter(o => {
      const orderDate = this.parseDate(o.date || '')
      return orderDate && orderDate >= recentStart
    })

    let lastOrderDate: string | null = null
    for (const order of orders) {
      if (!lastOrderDate || (order.date && order.date > lastOrderDate)) {
        lastOrderDate = order.date || null
      }
    }

    const totalQty = recentOrders.reduce((sum, o) => sum + (o.quantity || 0), 0)
    const totalValue = recentOrders.reduce((sum, o) => sum + (o.value || 0), 0)

    return { qty: totalQty / 4, value: totalValue / 4, lastOrder: lastOrderDate }
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

    const alerts: CategoryAlert[] = []
    const profiles: Record<string, Record<string, CustomerCategoryProfile>> = {}

    for (const [customerId, products] of grouped) {
      profiles[customerId] = {}

      for (const [productKey, productOrders] of products) {
        productOrders.sort((a, b) => (b.date || '').localeCompare(a.date || ''))

        const displayName = this.getDisplayName(customerId, productKey)
        const category = this.deriveCategory(productKey)

        // Classify how frequently this product was ordered
        const frequency = this.classifyProductFrequency(productOrders)
        const thresholds = FREQUENCY_THRESHOLDS[frequency]

        const baseline = this.calculateBaseline(productOrders, refDate)
        const current = this.calculateCurrent(productOrders, refDate)

        const trend = this.detectTrendWithThresholds(
          baseline.qty, current.qty, current.lastOrder, refDate, thresholds
        )

        // Build profile
        const profile: CustomerCategoryProfile = {
          customer_id: customerId,
          category: displayName,
          baseline_weekly_qty: Math.round(baseline.qty * 100) / 100,
          baseline_weekly_value: Math.round(baseline.value * 100) / 100,
          current_weekly_qty: Math.round(current.qty * 100) / 100,
          current_weekly_value: Math.round(current.value * 100) / 100,
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
          const dropPct = baseline.qty > 0
            ? ((baseline.qty - current.qty) / baseline.qty) * 100
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

          const estimatedLoss = (baseline.value - current.value) * 4 // Monthly
          const competitor = this.inferCompetitorType(category)
          const competitorLikely = trend === 'stopped' && weeksSince >= thresholds.stopped_weeks && dropPct > 80
          const { discount, action } = this.generateRecommendation(
            severity, dropPct, displayName, category, competitor.type
          )

          alerts.push({
            customer_id: customerId,
            product_name: displayName,
            category,
            products: [displayName],
            signal_type: trend as 'stopped' | 'declining',
            severity,
            baseline_quantity: Math.round(baseline.qty * 100) / 100,
            current_quantity: Math.round(current.qty * 100) / 100,
            drop_percentage: Math.round(dropPct * 10) / 10,
            weeks_since_last_order: weeksSince,
            estimated_lost_revenue: Math.round(estimatedLoss * 100) / 100,
            competitor_likely: competitorLikely,
            recommended_discount: Math.round(discount * 10) / 10,
            recommended_action: action,
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

    return { alerts, customer_profiles: profiles, summary, recommendations }
  }
}
