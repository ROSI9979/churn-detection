import { NextResponse } from 'next/server'

const mockCustomers = [
  { customer_id: 'CUST_0001', churn_risk_score: 92, days_until_churn: 18, clv: 487000, business_type: 'Restaurant', region: 'London' },
  { customer_id: 'CUST_0002', churn_risk_score: 88, days_until_churn: 32, clv: 431000, business_type: 'Cafe', region: 'Manchester' },
  { customer_id: 'CUST_0003', churn_risk_score: 85, days_until_churn: 25, clv: 427000, business_type: 'Hotel', region: 'Birmingham' },
  { customer_id: 'CUST_0004', churn_risk_score: 82, days_until_churn: 37, clv: 340000, business_type: 'Catering', region: 'Glasgow' },
  { customer_id: 'CUST_0005', churn_risk_score: 81, days_until_churn: 29, clv: 339931, business_type: 'Restaurant', region: 'Leeds' },
  { customer_id: 'CUST_0006', churn_risk_score: 80, days_until_churn: 22, clv: 358795, business_type: 'Fast Food', region: 'Liverpool' },
  { customer_id: 'CUST_0007', churn_risk_score: 79, days_until_churn: 30, clv: 219879, business_type: 'Bakery', region: 'Bristol' },
  { customer_id: 'CUST_0008', churn_risk_score: 78, days_until_churn: 21, clv: 298765, business_type: 'Restaurant', region: 'Edinburgh' },
]

export async function GET(request: Request) {
  try {
    return NextResponse.json(mockCustomers)
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch customers' }, { status: 500 })
  }
}
