/**
 * Product-Level Churn Detection Engine (TypeScript)
 * =================================================
 * Detects when B2B customers stop buying specific product categories
 * while still ordering others (partial churn / category leakage).
 *
 * Use Case: Supplier like Fresco detecting that a takeaway stopped ordering
 * chicken (now buying from Booker) but still orders cheese dips.
 */

export interface Order {
  [key: string]: any  // Accept any column names
}

// Smart column detection patterns (order matters - more specific first)
const COLUMN_PATTERNS = {
  customer: /customer[_\s]?id|account[_\s]?id|client[_\s]?id|customer|account|client|buyer|party|entity|company/i,
  product: /product[_\s]?name|product|item|sku|description|goods|material|service/i,
  quantity: /quantity|qty|units|count|pieces|pcs/i,
  value: /net[_\s]?amount|total[_\s]?amount|gross[_\s]?amount|value|amount|total|price|cost|net|gross|sum|revenue|sales/i,
  date: /invoice[_\s]?date|order[_\s]?date|transaction[_\s]?date|created[_\s]?at|date|created|ordered/i,
}

export interface CategoryAlert {
  customer_id: string
  category: string
  products: string[]  // Actual product names in this category
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

// Category synonyms for normalization
const CATEGORY_SYNONYMS: Record<string, string[]> = {
  chicken: ['chicken', 'poultry', 'wings', 'breast', 'thighs', 'nuggets'],
  drinks: ['drinks', 'beverages', 'soft drinks', 'cola', 'water', 'juice', 'fizzy', 'pepsi', 'coca cola', 'coke', 'fanta', 'sprite', 'cans'],
  cheese: ['cheese', 'dairy', 'cheddar', 'mozzarella', 'parmesan', 'shredded'],
  dips: ['dips', 'sauce', 'condiments', 'mayo', 'mayonnaise', 'ketchup', 'garlic'],
  produce: ['vegetables', 'produce', 'salad', 'lettuce', 'tomato', 'onion'],
  meat: ['meat', 'beef', 'lamb', 'pork', 'mince', 'pepperoni', 'salami'],
  frozen: ['frozen', 'ice', 'chips', 'fries', 'crunch'],
  packaging: ['packaging', 'boxes', 'containers', 'bags', 'napkins', 'pizza box'],
}

// Competitor type patterns
const COMPETITOR_PATTERNS: Record<string, {
  typical_advantage: number
  categories: string[]
}> = {
  cash_and_carry: {
    typical_advantage: 15,
    categories: ['drinks', 'frozen', 'packaging'],
  },
  wholesaler: {
    typical_advantage: 10,
    categories: ['chicken', 'meat', 'produce', 'cheese'],
  },
  direct_manufacturer: {
    typical_advantage: 20,
    categories: ['drinks', 'packaging'],
  },
  online: {
    typical_advantage: 12,
    categories: ['packaging', 'consumables'],
  },
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

  constructor(lookbackWeeks = 12, baselineWeeks = 8) {
    this.lookbackWeeks = lookbackWeeks
    this.baselineWeeks = baselineWeeks
    this.thresholds = {
      stopped_weeks: 4,
      decline_pct: 40,
      critical_decline_pct: 70,
    }
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

    // Find best match for each field type
    for (const col of columns) {
      const colLower = col.toLowerCase()

      // Customer field (prioritize id fields)
      if (!this.detectedSchema.customer && COLUMN_PATTERNS.customer.test(colLower)) {
        this.detectedSchema.customer = col
      }

      // Product field (skip if it looks like a customer field)
      if (!this.detectedSchema.product && COLUMN_PATTERNS.product.test(colLower)) {
        if (!COLUMN_PATTERNS.customer.test(colLower) || colLower.includes('product')) {
          this.detectedSchema.product = col
        }
      }

      // Quantity field
      if (!this.detectedSchema.quantity && COLUMN_PATTERNS.quantity.test(colLower)) {
        // Make sure it's not a value field
        if (!colLower.includes('price') && !colLower.includes('total') && !colLower.includes('net')) {
          this.detectedSchema.quantity = col
        }
      }

      // Value field (prioritize net_amount, total, value)
      if (COLUMN_PATTERNS.value.test(colLower)) {
        // Prefer more specific value columns
        if (!this.detectedSchema.value ||
            colLower.includes('net') ||
            colLower.includes('total') ||
            colLower.includes('amount')) {
          this.detectedSchema.value = col
        }
      }

      // Date field (prefer columns with 'date' in name, not just 'invoice')
      if (COLUMN_PATTERNS.date.test(colLower)) {
        // Skip if it's invoice_number or just contains 'invoice' without 'date'
        if (colLower.includes('number') || colLower.includes('num') || colLower.includes('no')) {
          continue
        }
        // Prefer columns with 'date' explicitly
        if (!this.detectedSchema.date || colLower.includes('date')) {
          this.detectedSchema.date = col
        }
      }
    }

    console.log('Detected schema:', this.detectedSchema)
  }

  // Get value from order using detected or fallback column names
  private getField(order: Order, fieldType: 'customer' | 'product' | 'quantity' | 'value' | 'date'): any {
    // First try detected schema
    if (this.detectedSchema && this.detectedSchema[fieldType]) {
      const val = order[this.detectedSchema[fieldType]!]
      if (val !== undefined && val !== null && val !== '') return val
    }

    // Fallback to common column names
    const fallbacks: Record<string, string[]> = {
      customer: ['customer_id', 'customer', 'account', 'client', 'buyer', 'customer_name', 'account_id', 'client_id'],
      product: ['product', 'product_name', 'item', 'sku', 'description', 'category', 'goods', 'service'],
      quantity: ['quantity', 'qty', 'units', 'count', 'pieces', 'pcs'],
      value: ['net_amount', 'value', 'amount', 'total', 'price', 'net', 'gross', 'revenue', 'sales', 'unit_price'],
      date: ['date', 'invoice_date', 'order_date', 'transaction_date', 'created_at', 'created'],
    }

    for (const fallback of fallbacks[fieldType]) {
      // Try exact match
      if (order[fallback] !== undefined) return order[fallback]
      // Try case-insensitive
      const key = Object.keys(order).find(k => k.toLowerCase() === fallback.toLowerCase())
      if (key && order[key] !== undefined) return order[key]
    }

    return null
  }

  private normalizeCategory(rawCategory: string): string {
    if (!rawCategory) return 'unknown'
    const lower = String(rawCategory).toLowerCase()
    for (const [category, synonyms] of Object.entries(CATEGORY_SYNONYMS)) {
      if (synonyms.some(syn => lower.includes(syn))) {
        return category
      }
    }
    return lower
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

    // Handle DD/MM/YYYY format
    if (dateStr.match(/^\d{2}\/\d{2}\/\d{4}$/)) {
      const parts = dateStr.split('/')
      return `${parts[2]}-${parts[1]}-${parts[0]}`
    }

    // Handle MM/DD/YYYY format (US)
    if (dateStr.match(/^\d{1,2}\/\d{1,2}\/\d{4}$/)) {
      const parts = dateStr.split('/')
      return `${parts[2]}-${parts[0].padStart(2, '0')}-${parts[1].padStart(2, '0')}`
    }

    // Handle timestamp
    if (dateStr.includes('T')) {
      return dateStr.split('T')[0]
    }

    // Already ISO format or return as-is
    return dateStr
  }

  // Track products per customer per category
  private categoryProducts: Map<string, Map<string, Set<string>>> = new Map()

  private parseOrders(orders: Order[]): Map<string, Map<string, Order[]>> {
    // Auto-detect schema from first row
    this.detectSchema(orders)

    const grouped = new Map<string, Map<string, Order[]>>()
    this.categoryProducts = new Map()

    for (const order of orders) {
      const customerId = this.getField(order, 'customer')
      const product = this.getField(order, 'product')

      if (!customerId || !product) continue

      const category = this.normalizeCategory(product)
      const customerKey = String(customerId)

      if (!grouped.has(customerKey)) {
        grouped.set(customerKey, new Map())
        this.categoryProducts.set(customerKey, new Map())
      }

      const customerMap = grouped.get(customerKey)!
      const customerProducts = this.categoryProducts.get(customerKey)!

      if (!customerMap.has(category)) {
        customerMap.set(category, [])
        customerProducts.set(category, new Set())
      }

      // Track the actual product name
      customerProducts.get(category)!.add(String(product))

      const dateVal = this.getField(order, 'date')
      const dateStr = this.normalizeDateString(dateVal)

      const quantity = Number(this.getField(order, 'quantity')) || 1
      const value = Number(this.getField(order, 'value')) || 0

      customerMap.get(category)!.push({
        date: dateStr,
        quantity: quantity,
        value: value,
      } as Order)
    }

    return grouped
  }

  // Get products for a customer's category
  private getProductsForCategory(customerId: string, category: string): string[] {
    const customerProducts = this.categoryProducts.get(customerId)
    if (!customerProducts) return []
    const products = customerProducts.get(category)
    return products ? Array.from(products) : []
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
  ): { qty: number; value: number } {
    const baselineStart = new Date(referenceDate)
    baselineStart.setDate(baselineStart.getDate() - this.lookbackWeeks * 7)

    const baselineEnd = new Date(referenceDate)
    baselineEnd.setDate(baselineEnd.getDate() - (this.lookbackWeeks - this.baselineWeeks) * 7)

    const baselineOrders = orders.filter(o => {
      const orderDate = this.parseDate(o.date || '')
      return orderDate && orderDate >= baselineStart && orderDate <= baselineEnd
    })

    // Fall back to first half of orders if no data in baseline window
    const ordersToUse = baselineOrders.length > 0
      ? baselineOrders
      : orders.slice(0, Math.ceil(orders.length / 2))

    const totalQty = ordersToUse.reduce((sum, o) => sum + (o.quantity || 0), 0)
    const totalValue = ordersToUse.reduce((sum, o) => sum + (o.value || 0), 0)
    const weeks = Math.max(1, this.baselineWeeks)

    return { qty: totalQty / weeks, value: totalValue / weeks }
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

  private detectTrend(
    baselineQty: number,
    currentQty: number,
    lastOrderDate: string | null,
    referenceDate: Date
  ): 'stable' | 'growing' | 'declining' | 'stopped' {
    // Check if stopped ordering
    if (lastOrderDate) {
      const lastDate = this.parseDate(lastOrderDate)
      if (lastDate) {
        const weeksSince = (referenceDate.getTime() - lastDate.getTime()) / (7 * 24 * 60 * 60 * 1000)
        if (weeksSince >= this.thresholds.stopped_weeks) {
          return 'stopped'
        }
      }
    }

    if (baselineQty === 0) {
      return currentQty === 0 ? 'stable' : 'growing'
    }

    const changePct = ((currentQty - baselineQty) / baselineQty) * 100

    if (changePct <= -this.thresholds.critical_decline_pct) return 'stopped'
    if (changePct <= -this.thresholds.decline_pct) return 'declining'
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
    category: string,
    competitorType: string
  ): { discount: number; action: string } {
    let discount: number
    let action: string

    if (severity === 'critical') {
      discount = Math.min(25, 10 + dropPct / 10)

      if (competitorType === 'cash_and_carry') {
        action = `URGENT: Customer likely buying ${category} from cash & carry (Booker/Costco). Call immediately and offer ${discount.toFixed(0)}% bulk pricing match + free delivery.`
      } else if (competitorType === 'wholesaler') {
        action = `URGENT: Lost ${category} to competing wholesaler. Call and offer ${discount.toFixed(0)}% discount plus quality guarantee.`
      } else {
        action = `URGENT: Call customer immediately. Offer ${discount.toFixed(0)}% discount on ${category} for next 4 weeks.`
      }
    } else if (severity === 'warning') {
      discount = Math.min(15, 5 + dropPct / 20)
      action = `Schedule call within 48hrs. Offer ${discount.toFixed(0)}% loyalty discount on ${category} or bundle with regular items.`
    } else {
      discount = 5
      action = `Monitor closely. Consider ${category} samples in next delivery or promotional pricing.`
    }

    return { discount, action }
  }

  private calculateWinBackProbability(
    signalStrength: number,
    weeksSinceLoss: number,
    competitorAdvantage: number
  ): number {
    let prob = 0.7

    // Reduce by signal strength
    prob -= (signalStrength / 100) * 0.3

    // Reduce by time
    prob -= Math.min(0.3, weeksSinceLoss * 0.03)

    // Reduce by competitor advantage
    prob -= (competitorAdvantage / 100) * 0.2

    return Math.max(0.1, Math.min(0.9, prob))
  }

  analyze(orders: Order[], referenceDate?: string): AnalysisResult {
    // First detect schema so we can find dates
    this.detectSchema(orders)

    // Auto-detect reference date from data if not provided
    let refDate: Date
    if (referenceDate) {
      refDate = new Date(referenceDate)
    } else {
      // Find the latest date in the data to use as reference
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
      // Use latest date in data, or current date if no dates found
      refDate = latestDate || new Date()
      console.log('Auto-detected reference date:', refDate.toISOString().split('T')[0])
    }

    const grouped = this.parseOrders(orders)

    const alerts: CategoryAlert[] = []
    const profiles: Record<string, Record<string, CustomerCategoryProfile>> = {}

    for (const [customerId, categories] of grouped) {
      profiles[customerId] = {}

      for (const [category, catOrders] of categories) {
        // Sort by date descending
        catOrders.sort((a, b) => (b.date || '').localeCompare(a.date || ''))

        const baseline = this.calculateBaseline(catOrders, refDate)
        const current = this.calculateCurrent(catOrders, refDate)
        const trend = this.detectTrend(baseline.qty, current.qty, current.lastOrder, refDate)

        // Build profile
        const profile: CustomerCategoryProfile = {
          customer_id: customerId,
          category,
          baseline_weekly_qty: Math.round(baseline.qty * 100) / 100,
          baseline_weekly_value: Math.round(baseline.value * 100) / 100,
          current_weekly_qty: Math.round(current.qty * 100) / 100,
          current_weekly_value: Math.round(current.value * 100) / 100,
          last_order_date: current.lastOrder,
          trend,
          volatility: 0, // Simplified for now
        }
        profiles[customerId][category] = profile

        // Generate alerts for problems
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

          // Determine severity
          let severity: 'critical' | 'warning' | 'watch'
          if (trend === 'stopped' || dropPct >= this.thresholds.critical_decline_pct) {
            severity = 'critical'
          } else if (dropPct >= this.thresholds.decline_pct) {
            severity = 'warning'
          } else {
            severity = 'watch'
          }

          const estimatedLoss = (baseline.value - current.value) * 4 // Monthly
          const competitor = this.inferCompetitorType(category)
          const competitorLikely = trend === 'stopped' || dropPct > 60
          const { discount, action } = this.generateRecommendation(
            severity, dropPct, category, competitor.type
          )

          alerts.push({
            customer_id: customerId,
            category,
            products: this.getProductsForCategory(customerId, category),
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
