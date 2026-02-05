#!/usr/bin/env python3
"""
Product-Level Churn Detection Engine
=====================================
Detects when B2B customers stop buying specific product categories
while still ordering others (partial churn / category leakage).

Use Case: Supplier like Fresco detecting that a takeaway stopped ordering
chicken (now buying from Booker) but still orders cheese dips.

Author: Built for ROSI9979/churn-detection
"""

import json
import sys
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple
from dataclasses import dataclass, asdict
from collections import defaultdict
import statistics


@dataclass
class CategoryAlert:
    """Alert for a specific product category showing churn signals"""
    customer_id: str
    category: str
    signal_type: str  # 'stopped', 'declining', 'irregular'
    severity: str  # 'critical', 'warning', 'watch'
    baseline_quantity: float
    current_quantity: float
    drop_percentage: float
    weeks_since_last_order: int
    estimated_lost_revenue: float
    competitor_likely: bool
    recommended_discount: float
    recommended_action: str


@dataclass
class CustomerCategoryProfile:
    """Tracks a customer's purchasing pattern for one category"""
    customer_id: str
    category: str
    order_history: List[dict]  # [{date, quantity, value}]
    baseline_weekly_qty: float
    baseline_weekly_value: float
    current_weekly_qty: float
    current_weekly_value: float
    last_order_date: Optional[str]
    trend: str  # 'stable', 'growing', 'declining', 'stopped'
    volatility: float


class ProductLevelChurnEngine:
    """
    Detects partial churn at the product/category level.

    Unlike customer-level churn (whole customer leaves), this detects
    when customers shift specific product categories to competitors
    while maintaining their overall relationship.
    """

    def __init__(self, lookback_weeks: int = 12, baseline_weeks: int = 8):
        self.lookback_weeks = lookback_weeks
        self.baseline_weeks = baseline_weeks

        # Thresholds (configurable per industry)
        self.thresholds = {
            'stopped_weeks': 4,        # No orders for X weeks = stopped
            'decline_pct': 40,         # >40% drop = significant decline
            'critical_decline_pct': 70, # >70% drop = critical
            'volatility_threshold': 0.5, # CV > 0.5 = irregular ordering
        }

        # Industry-specific category mappings
        self.category_synonyms = {
            'chicken': ['chicken', 'poultry', 'wings', 'breast', 'thighs'],
            'drinks': ['drinks', 'beverages', 'soft drinks', 'cola', 'water', 'juice'],
            'cheese': ['cheese', 'dairy', 'cheddar', 'mozzarella'],
            'dips': ['dips', 'sauce', 'condiments', 'mayo', 'ketchup'],
            'produce': ['vegetables', 'produce', 'salad', 'lettuce', 'tomato'],
        }

    def normalize_category(self, raw_category: str) -> str:
        """Map product names to standardized categories"""
        raw_lower = raw_category.lower()
        for category, synonyms in self.category_synonyms.items():
            if any(syn in raw_lower for syn in synonyms):
                return category
        return raw_category.lower()

    def parse_orders(self, orders: List[dict]) -> Dict[str, Dict[str, List[dict]]]:
        """
        Group orders by customer and category.

        Input format expected:
        [
            {"customer_id": "TAKEAWAY_001", "product": "Chicken Wings",
             "quantity": 50, "value": 150.00, "date": "2024-01-15"},
            ...
        ]
        """
        grouped = defaultdict(lambda: defaultdict(list))

        for order in orders:
            customer_id = order.get('customer_id') or order.get('customer') or order.get('account')
            product = order.get('product') or order.get('item') or order.get('category')

            if not customer_id or not product:
                continue

            category = self.normalize_category(product)

            grouped[customer_id][category].append({
                'date': order.get('date') or order.get('order_date'),
                'quantity': float(order.get('quantity', 0) or order.get('qty', 0) or 1),
                'value': float(order.get('value', 0) or order.get('amount', 0) or order.get('total', 0)),
            })

        return grouped

    def calculate_baseline(self, orders: List[dict], reference_date: datetime) -> Tuple[float, float]:
        """Calculate baseline weekly average from historical orders"""
        baseline_start = reference_date - timedelta(weeks=self.lookback_weeks)
        baseline_end = reference_date - timedelta(weeks=self.lookback_weeks - self.baseline_weeks)

        baseline_orders = []
        for order in orders:
            try:
                order_date = datetime.fromisoformat(order['date'].replace('Z', '+00:00'))
                if baseline_start <= order_date <= baseline_end:
                    baseline_orders.append(order)
            except (ValueError, TypeError, KeyError):
                continue

        if not baseline_orders:
            # Use all historical data if no orders in baseline window
            baseline_orders = orders[:len(orders)//2] if len(orders) > 4 else orders

        total_qty = sum(o['quantity'] for o in baseline_orders)
        total_value = sum(o['value'] for o in baseline_orders)
        weeks = max(1, self.baseline_weeks)

        return total_qty / weeks, total_value / weeks

    def calculate_current(self, orders: List[dict], reference_date: datetime) -> Tuple[float, float, Optional[str]]:
        """Calculate current weekly average from recent orders"""
        recent_start = reference_date - timedelta(weeks=4)

        recent_orders = []
        last_order_date = None

        for order in orders:
            try:
                order_date = datetime.fromisoformat(order['date'].replace('Z', '+00:00'))
                if order_date >= recent_start:
                    recent_orders.append(order)
                if last_order_date is None or order_date > datetime.fromisoformat(last_order_date.replace('Z', '+00:00')):
                    last_order_date = order['date']
            except (ValueError, TypeError, KeyError):
                continue

        total_qty = sum(o['quantity'] for o in recent_orders)
        total_value = sum(o['value'] for o in recent_orders)

        return total_qty / 4, total_value / 4, last_order_date

    def calculate_volatility(self, orders: List[dict]) -> float:
        """Calculate coefficient of variation for order quantities"""
        quantities = [o['quantity'] for o in orders if o['quantity'] > 0]
        if len(quantities) < 2:
            return 0.0

        mean = statistics.mean(quantities)
        if mean == 0:
            return 0.0

        stdev = statistics.stdev(quantities)
        return stdev / mean

    def detect_trend(self, baseline_qty: float, current_qty: float,
                     last_order_date: Optional[str], reference_date: datetime) -> str:
        """Determine the trend for a category"""

        # Check if stopped ordering
        if last_order_date:
            try:
                last_date = datetime.fromisoformat(last_order_date.replace('Z', '+00:00'))
                weeks_since = (reference_date - last_date).days / 7
                if weeks_since >= self.thresholds['stopped_weeks']:
                    return 'stopped'
            except (ValueError, TypeError):
                pass

        if baseline_qty == 0:
            return 'stable' if current_qty == 0 else 'growing'

        change_pct = ((current_qty - baseline_qty) / baseline_qty) * 100

        if change_pct <= -self.thresholds['critical_decline_pct']:
            return 'stopped'
        elif change_pct <= -self.thresholds['decline_pct']:
            return 'declining'
        elif change_pct >= 20:
            return 'growing'
        else:
            return 'stable'

    def generate_recommendation(self, alert: dict) -> Tuple[float, str]:
        """Generate discount recommendation and action based on alert severity"""

        severity = alert['severity']
        drop_pct = alert['drop_percentage']
        category = alert['category']

        if severity == 'critical':
            # Aggressive retention needed
            discount = min(25, 10 + (drop_pct / 10))
            action = f"URGENT: Call customer immediately. Offer {discount:.0f}% discount on {category} for next 4 weeks to win back business."

        elif severity == 'warning':
            # Moderate intervention
            discount = min(15, 5 + (drop_pct / 20))
            action = f"Schedule call within 48hrs. Offer {discount:.0f}% loyalty discount on {category} or bundle deal with their regular items."

        else:  # watch
            discount = 5
            action = f"Monitor closely. Consider including {category} samples in next delivery or promotional pricing."

        return discount, action

    def detect_competitor_signal(self, profile: CustomerCategoryProfile) -> bool:
        """
        Heuristic: If customer stopped/declined ONE category but others stable,
        they likely found a competitor for that specific product.
        """
        # This will be enhanced when we have multi-category context
        if profile.trend in ['stopped', 'declining']:
            if profile.baseline_weekly_qty > 0 and profile.current_weekly_qty < profile.baseline_weekly_qty * 0.3:
                return True
        return False

    def analyze(self, orders: List[dict], reference_date: Optional[str] = None) -> dict:
        """
        Main analysis function.

        Returns:
        {
            "alerts": [...],  # Category-level churn alerts
            "customer_profiles": {...},  # Full profiles by customer
            "summary": {...},  # Aggregate stats
            "recommendations": [...]  # Prioritized actions
        }
        """

        if reference_date:
            ref_date = datetime.fromisoformat(reference_date.replace('Z', '+00:00'))
        else:
            ref_date = datetime.now()

        # Group orders by customer and category
        grouped = self.parse_orders(orders)

        alerts: List[CategoryAlert] = []
        profiles: Dict[str, Dict[str, CustomerCategoryProfile]] = {}

        # Analyze each customer's categories
        for customer_id, categories in grouped.items():
            profiles[customer_id] = {}

            for category, cat_orders in categories.items():
                # Sort orders by date
                cat_orders.sort(key=lambda x: x.get('date', ''), reverse=True)

                # Calculate metrics
                baseline_qty, baseline_value = self.calculate_baseline(cat_orders, ref_date)
                current_qty, current_value, last_order = self.calculate_current(cat_orders, ref_date)
                volatility = self.calculate_volatility(cat_orders)
                trend = self.detect_trend(baseline_qty, current_qty, last_order, ref_date)

                # Build profile
                profile = CustomerCategoryProfile(
                    customer_id=customer_id,
                    category=category,
                    order_history=cat_orders[-20:],  # Last 20 orders
                    baseline_weekly_qty=baseline_qty,
                    baseline_weekly_value=baseline_value,
                    current_weekly_qty=current_qty,
                    current_weekly_value=current_value,
                    last_order_date=last_order,
                    trend=trend,
                    volatility=volatility
                )
                profiles[customer_id][category] = profile

                # Generate alerts for problematic trends
                if trend in ['stopped', 'declining']:
                    drop_pct = 0
                    if baseline_qty > 0:
                        drop_pct = ((baseline_qty - current_qty) / baseline_qty) * 100

                    weeks_since = 0
                    if last_order:
                        try:
                            last_date = datetime.fromisoformat(last_order.replace('Z', '+00:00'))
                            weeks_since = int((ref_date - last_date).days / 7)
                        except (ValueError, TypeError):
                            pass

                    # Determine severity
                    if trend == 'stopped' or drop_pct >= self.thresholds['critical_decline_pct']:
                        severity = 'critical'
                    elif drop_pct >= self.thresholds['decline_pct']:
                        severity = 'warning'
                    else:
                        severity = 'watch'

                    estimated_loss = (baseline_value - current_value) * 4  # Monthly loss
                    competitor_likely = self.detect_competitor_signal(profile)

                    alert_dict = {
                        'customer_id': customer_id,
                        'category': category,
                        'signal_type': trend,
                        'severity': severity,
                        'baseline_quantity': round(baseline_qty, 2),
                        'current_quantity': round(current_qty, 2),
                        'drop_percentage': round(drop_pct, 1),
                        'weeks_since_last_order': weeks_since,
                        'estimated_lost_revenue': round(estimated_loss, 2),
                        'competitor_likely': competitor_likely,
                    }

                    discount, action = self.generate_recommendation(alert_dict)
                    alert_dict['recommended_discount'] = discount
                    alert_dict['recommended_action'] = action

                    alerts.append(CategoryAlert(**alert_dict))

        # Sort alerts by severity and lost revenue
        severity_order = {'critical': 0, 'warning': 1, 'watch': 2}
        alerts.sort(key=lambda a: (severity_order[a.severity], -a.estimated_lost_revenue))

        # Build summary
        summary = {
            'total_customers': len(grouped),
            'customers_with_alerts': len(set(a.customer_id for a in alerts)),
            'total_alerts': len(alerts),
            'critical_alerts': sum(1 for a in alerts if a.severity == 'critical'),
            'warning_alerts': sum(1 for a in alerts if a.severity == 'warning'),
            'watch_alerts': sum(1 for a in alerts if a.severity == 'watch'),
            'total_estimated_monthly_loss': round(sum(a.estimated_lost_revenue for a in alerts), 2),
            'categories_at_risk': list(set(a.category for a in alerts)),
            'competitor_signals': sum(1 for a in alerts if a.competitor_likely),
        }

        # Top recommendations
        recommendations = []
        for alert in alerts[:10]:  # Top 10 priority actions
            recommendations.append({
                'priority': len(recommendations) + 1,
                'customer_id': alert.customer_id,
                'category': alert.category,
                'action': alert.recommended_action,
                'discount': alert.recommended_discount,
                'potential_save': alert.estimated_lost_revenue,
            })

        return {
            'alerts': [asdict(a) for a in alerts],
            'customer_profiles': {
                cid: {cat: asdict(p) for cat, p in cats.items()}
                for cid, cats in profiles.items()
            },
            'summary': summary,
            'recommendations': recommendations,
        }


def main():
    """CLI interface for the product-level churn engine"""
    if len(sys.argv) < 2:
        print("Usage: python product_level_churn.py <orders.json> [reference_date]")
        print("\nExpected JSON format:")
        print('[{"customer_id": "X", "product": "Chicken", "quantity": 10, "value": 50, "date": "2024-01-15"}, ...]')
        sys.exit(1)

    input_file = sys.argv[1]
    reference_date = sys.argv[2] if len(sys.argv) > 2 else None

    with open(input_file, 'r') as f:
        orders = json.load(f)

    engine = ProductLevelChurnEngine()
    results = engine.analyze(orders, reference_date)

    print(json.dumps(results, indent=2, default=str))


if __name__ == '__main__':
    main()
