#!/usr/bin/env python3
"""
Competitor Intelligence & Price Sensitivity Module
===================================================
Detects when customers are likely buying from competitors
and calculates price sensitivity to recommend optimal discounts.

Works alongside product_level_churn.py for complete B2B supplier intelligence.

Author: Built for ROSI9979/churn-detection
"""

import json
import sys
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple
from dataclasses import dataclass, asdict
from collections import defaultdict
import statistics
import math


@dataclass
class CompetitorSignal:
    """Signal indicating likely competitor activity"""
    customer_id: str
    category: str
    signal_strength: float  # 0-100
    signal_type: str  # 'price_switch', 'volume_split', 'complete_loss', 'seasonal_shift'
    evidence: List[str]
    likely_competitor_type: str  # 'cash_and_carry', 'wholesaler', 'direct_manufacturer', 'online'
    estimated_competitor_price_advantage: float  # Percentage they're likely beating you by
    win_back_probability: float  # 0-1


@dataclass
class PriceSensitivityProfile:
    """Customer's price sensitivity for a category"""
    customer_id: str
    category: str
    sensitivity_score: float  # 0-100 (100 = extremely price sensitive)
    price_elasticity: float  # How much volume changes with price
    acceptable_premium: float  # Max % above competitor they'd pay for convenience
    historical_price_response: str  # 'positive', 'neutral', 'negative'
    optimal_discount_range: Tuple[float, float]  # Min-max effective discount


class CompetitorIntelligenceEngine:
    """
    Analyzes purchasing patterns to detect competitor activity
    and calculate price sensitivity for retention strategies.
    """

    def __init__(self):
        # Competitor type indicators
        self.competitor_patterns = {
            'cash_and_carry': {
                'indicators': ['bulk_increase', 'frequency_drop', 'value_items_gone'],
                'typical_advantage': 15,  # Usually 15% cheaper
                'categories': ['drinks', 'frozen', 'dry_goods', 'cleaning'],
            },
            'wholesaler': {
                'indicators': ['volume_drop', 'premium_items_kept', 'basics_gone'],
                'typical_advantage': 10,
                'categories': ['chicken', 'meat', 'produce', 'dairy'],
            },
            'direct_manufacturer': {
                'indicators': ['single_category_loss', 'complete_stop', 'high_volume_history'],
                'typical_advantage': 20,
                'categories': ['drinks', 'branded_goods', 'packaging'],
            },
            'online': {
                'indicators': ['gradual_decline', 'small_items_first', 'non_urgent_items'],
                'typical_advantage': 12,
                'categories': ['consumables', 'packaging', 'disposables'],
            },
        }

        # Price sensitivity indicators
        self.sensitivity_indicators = {
            'high_sensitivity': [
                'always_orders_promotions',
                'volume_tracks_price',
                'switches_brands_for_price',
                'bulk_buyer',
                'price_queries_frequent',
            ],
            'medium_sensitivity': [
                'occasional_promotion_response',
                'some_brand_loyalty',
                'mixed_value_premium',
            ],
            'low_sensitivity': [
                'consistent_orders_despite_price',
                'premium_product_preference',
                'convenience_priority',
                'long_term_relationship',
            ],
        }

    def analyze_order_patterns(self, orders: List[dict], category: str) -> Dict:
        """Analyze ordering patterns for competitor signals"""

        if not orders:
            return {'pattern': 'no_data', 'signals': []}

        # Sort by date
        sorted_orders = sorted(orders, key=lambda x: x.get('date', ''))

        # Split into periods
        mid_point = len(sorted_orders) // 2
        early_orders = sorted_orders[:mid_point] if mid_point > 0 else sorted_orders
        recent_orders = sorted_orders[mid_point:] if mid_point > 0 else []

        signals = []

        # Calculate period metrics
        early_qty = sum(o.get('quantity', 0) for o in early_orders)
        recent_qty = sum(o.get('quantity', 0) for o in recent_orders)
        early_value = sum(o.get('value', 0) for o in early_orders)
        recent_value = sum(o.get('value', 0) for o in recent_orders)

        early_avg_price = early_value / early_qty if early_qty > 0 else 0
        recent_avg_price = recent_value / recent_qty if recent_qty > 0 else 0

        # Pattern: Volume drop but still ordering (split sourcing)
        if early_qty > 0 and recent_qty > 0:
            volume_change = (recent_qty - early_qty) / early_qty
            if -0.7 < volume_change < -0.3:
                signals.append({
                    'type': 'volume_split',
                    'description': f'Volume dropped {abs(volume_change)*100:.0f}% but still ordering - likely split sourcing',
                    'strength': min(80, abs(volume_change) * 100),
                })

        # Pattern: Complete stop after consistent ordering
        if early_qty > 0 and recent_qty == 0 and len(early_orders) >= 3:
            signals.append({
                'type': 'complete_loss',
                'description': 'Complete stop after consistent ordering history',
                'strength': 95,
            })

        # Pattern: Order frequency dropped significantly
        if len(early_orders) >= 2 and len(recent_orders) >= 1:
            early_freq = len(early_orders)
            recent_freq = len(recent_orders) * 2  # Normalize to same period
            if recent_freq < early_freq * 0.5:
                signals.append({
                    'type': 'frequency_drop',
                    'description': f'Order frequency dropped significantly',
                    'strength': 70,
                })

        # Pattern: Ordering only during promotions (check if avg price dropped)
        if early_avg_price > 0 and recent_avg_price > 0:
            price_change = (recent_avg_price - early_avg_price) / early_avg_price
            if price_change < -0.1:  # Only ordering cheaper items/during promos
                signals.append({
                    'type': 'promo_only',
                    'description': 'Now only ordering during promotions or cheaper variants',
                    'strength': 60,
                })

        return {
            'early_qty': early_qty,
            'recent_qty': recent_qty,
            'early_value': early_value,
            'recent_value': recent_value,
            'volume_change_pct': ((recent_qty - early_qty) / early_qty * 100) if early_qty > 0 else 0,
            'signals': signals,
        }

    def infer_competitor_type(self, category: str, signals: List[dict]) -> Tuple[str, float]:
        """Infer most likely competitor type based on signals and category"""

        signal_types = [s['type'] for s in signals]

        best_match = 'unknown'
        best_score = 0
        price_advantage = 10  # Default assumption

        for comp_type, comp_info in self.competitor_patterns.items():
            score = 0

            # Category match
            if category in comp_info['categories']:
                score += 30

            # Signal match
            for indicator in comp_info['indicators']:
                if any(indicator in st for st in signal_types):
                    score += 25

            if score > best_score:
                best_score = score
                best_match = comp_type
                price_advantage = comp_info['typical_advantage']

        return best_match, price_advantage

    def calculate_price_sensitivity(self, orders: List[dict], category: str) -> PriceSensitivityProfile:
        """Calculate customer's price sensitivity for a category"""

        if not orders or len(orders) < 2:
            return PriceSensitivityProfile(
                customer_id=orders[0].get('customer_id', 'unknown') if orders else 'unknown',
                category=category,
                sensitivity_score=50,
                price_elasticity=1.0,
                acceptable_premium=10,
                historical_price_response='neutral',
                optimal_discount_range=(5, 15),
            )

        customer_id = orders[0].get('customer_id', 'unknown')

        # Calculate price elasticity
        prices = [o.get('value', 0) / o.get('quantity', 1) for o in orders if o.get('quantity', 0) > 0]
        quantities = [o.get('quantity', 0) for o in orders]

        if len(prices) < 2 or len(set(prices)) < 2:
            elasticity = 1.0
        else:
            # Simple elasticity: correlation between price changes and quantity changes
            price_changes = [prices[i] - prices[i-1] for i in range(1, len(prices))]
            qty_changes = [quantities[i] - quantities[i-1] for i in range(1, len(quantities))]

            if len(price_changes) > 1:
                try:
                    # Negative correlation = price sensitive (price up -> qty down)
                    correlation = self._correlation(price_changes, qty_changes)
                    elasticity = abs(correlation) * 2 if correlation < 0 else 0.5
                except:
                    elasticity = 1.0
            else:
                elasticity = 1.0

        # Score 0-100 based on elasticity
        sensitivity_score = min(100, max(0, elasticity * 50))

        # Determine response type
        if sensitivity_score > 70:
            response = 'highly_sensitive'
            acceptable_premium = 5
            optimal_range = (10, 20)
        elif sensitivity_score > 40:
            response = 'moderately_sensitive'
            acceptable_premium = 10
            optimal_range = (5, 15)
        else:
            response = 'low_sensitivity'
            acceptable_premium = 20
            optimal_range = (0, 10)

        return PriceSensitivityProfile(
            customer_id=customer_id,
            category=category,
            sensitivity_score=round(sensitivity_score, 1),
            price_elasticity=round(elasticity, 2),
            acceptable_premium=acceptable_premium,
            historical_price_response=response,
            optimal_discount_range=optimal_range,
        )

    def _correlation(self, x: List[float], y: List[float]) -> float:
        """Calculate Pearson correlation coefficient"""
        n = len(x)
        if n < 2:
            return 0

        mean_x = sum(x) / n
        mean_y = sum(y) / n

        numerator = sum((x[i] - mean_x) * (y[i] - mean_y) for i in range(n))
        denom_x = math.sqrt(sum((xi - mean_x) ** 2 for xi in x))
        denom_y = math.sqrt(sum((yi - mean_y) ** 2 for yi in y))

        if denom_x * denom_y == 0:
            return 0

        return numerator / (denom_x * denom_y)

    def calculate_win_back_probability(self, signal_strength: float, weeks_since_loss: int,
                                       sensitivity_score: float, competitor_advantage: float) -> float:
        """
        Estimate probability of winning back the business.

        Factors:
        - Signal strength (higher = harder to win back)
        - Time since loss (longer = harder)
        - Price sensitivity (higher = easier with discount)
        - Competitor advantage (higher = harder)
        """

        base_prob = 0.7  # Start optimistic

        # Reduce by signal strength
        base_prob -= (signal_strength / 100) * 0.3

        # Reduce by time (decay)
        time_decay = min(0.3, weeks_since_loss * 0.03)
        base_prob -= time_decay

        # Increase if price sensitive (discount can work)
        if sensitivity_score > 60:
            base_prob += 0.15
        elif sensitivity_score > 40:
            base_prob += 0.08

        # Reduce by competitor advantage
        base_prob -= (competitor_advantage / 100) * 0.2

        return max(0.1, min(0.9, base_prob))

    def analyze(self, orders: List[dict], churn_alerts: Optional[List[dict]] = None) -> dict:
        """
        Main analysis function.

        Parameters:
        - orders: Raw order data
        - churn_alerts: Optional alerts from product_level_churn.py to enhance

        Returns competitor signals and price sensitivity analysis.
        """

        # Group orders by customer and category
        grouped = defaultdict(lambda: defaultdict(list))
        for order in orders:
            customer_id = order.get('customer_id') or order.get('customer')
            category = (order.get('product') or order.get('category', '')).lower()

            # Normalize category
            for cat_name in ['chicken', 'drinks', 'cheese', 'dips', 'produce']:
                if cat_name in category:
                    category = cat_name
                    break

            if customer_id and category:
                grouped[customer_id][category].append(order)

        competitor_signals: List[CompetitorSignal] = []
        sensitivity_profiles: Dict[str, Dict[str, PriceSensitivityProfile]] = {}

        for customer_id, categories in grouped.items():
            sensitivity_profiles[customer_id] = {}

            for category, cat_orders in categories.items():
                # Analyze patterns
                patterns = self.analyze_order_patterns(cat_orders, category)

                # Calculate price sensitivity
                sensitivity = self.calculate_price_sensitivity(cat_orders, category)
                sensitivity_profiles[customer_id][category] = sensitivity

                # Generate competitor signals if patterns detected
                if patterns['signals']:
                    comp_type, price_adv = self.infer_competitor_type(category, patterns['signals'])

                    avg_strength = statistics.mean([s['strength'] for s in patterns['signals']])

                    # Estimate weeks since significant drop
                    weeks_since = 4  # Default
                    if cat_orders:
                        try:
                            last_order = max(o.get('date', '') for o in cat_orders)
                            last_date = datetime.fromisoformat(last_order.replace('Z', '+00:00'))
                            weeks_since = max(1, int((datetime.now() - last_date).days / 7))
                        except:
                            pass

                    win_back = self.calculate_win_back_probability(
                        avg_strength, weeks_since, sensitivity.sensitivity_score, price_adv
                    )

                    signal = CompetitorSignal(
                        customer_id=customer_id,
                        category=category,
                        signal_strength=round(avg_strength, 1),
                        signal_type=patterns['signals'][0]['type'],  # Primary signal
                        evidence=[s['description'] for s in patterns['signals']],
                        likely_competitor_type=comp_type,
                        estimated_competitor_price_advantage=price_adv,
                        win_back_probability=round(win_back, 2),
                    )
                    competitor_signals.append(signal)

        # Sort by signal strength
        competitor_signals.sort(key=lambda s: -s.signal_strength)

        # Build retention strategies
        retention_strategies = []
        for signal in competitor_signals[:15]:  # Top 15
            sensitivity = sensitivity_profiles.get(signal.customer_id, {}).get(signal.category)

            if sensitivity:
                discount_min, discount_max = sensitivity.optimal_discount_range
                # Adjust based on competitor advantage
                recommended_discount = min(discount_max, signal.estimated_competitor_price_advantage + 2)
            else:
                recommended_discount = signal.estimated_competitor_price_advantage

            strategy = {
                'customer_id': signal.customer_id,
                'category': signal.category,
                'competitor_type': signal.likely_competitor_type,
                'win_back_probability': signal.win_back_probability,
                'recommended_discount': round(recommended_discount, 1),
                'strategy': self._generate_strategy(signal, sensitivity),
                'expected_roi': round((signal.win_back_probability * 100) - recommended_discount, 1),
            }
            retention_strategies.append(strategy)

        # Summary
        summary = {
            'total_customers_analyzed': len(grouped),
            'customers_with_competitor_signals': len(set(s.customer_id for s in competitor_signals)),
            'total_signals': len(competitor_signals),
            'signals_by_type': self._count_by_key(competitor_signals, 'signal_type'),
            'signals_by_competitor': self._count_by_key(competitor_signals, 'likely_competitor_type'),
            'avg_win_back_probability': round(
                statistics.mean([s.win_back_probability for s in competitor_signals]) if competitor_signals else 0, 2
            ),
            'categories_most_at_risk': self._get_top_categories(competitor_signals),
        }

        return {
            'competitor_signals': [asdict(s) for s in competitor_signals],
            'price_sensitivity': {
                cid: {cat: asdict(p) for cat, p in profiles.items()}
                for cid, profiles in sensitivity_profiles.items()
            },
            'retention_strategies': retention_strategies,
            'summary': summary,
        }

    def _generate_strategy(self, signal: CompetitorSignal, sensitivity: Optional[PriceSensitivityProfile]) -> str:
        """Generate human-readable retention strategy"""

        comp_type = signal.likely_competitor_type
        win_prob = signal.win_back_probability

        if comp_type == 'cash_and_carry':
            base = f"Customer likely buying {signal.category} from cash & carry (Booker, Costco, etc). "
            if win_prob > 0.6:
                return base + "Offer bulk pricing match + free delivery to win back."
            else:
                return base + "Consider bundle deal with items they still buy from you."

        elif comp_type == 'wholesaler':
            base = f"Customer likely switched {signal.category} to competing wholesaler. "
            if win_prob > 0.6:
                return base + "Match pricing and emphasize service/reliability advantage."
            else:
                return base + "Focus on quality differentiation and relationship."

        elif comp_type == 'direct_manufacturer':
            base = f"Customer may be buying {signal.category} direct from manufacturer. "
            return base + "Compete on convenience - offer consolidated ordering and single invoice."

        else:
            if sensitivity and sensitivity.sensitivity_score > 60:
                return f"Price-sensitive customer - lead with aggressive {signal.category} discount."
            else:
                return f"Focus on service quality and relationship for {signal.category} retention."

    def _count_by_key(self, signals: List[CompetitorSignal], key: str) -> Dict[str, int]:
        """Count signals by a given attribute"""
        counts = defaultdict(int)
        for s in signals:
            val = getattr(s, key, 'unknown')
            counts[val] += 1
        return dict(counts)

    def _get_top_categories(self, signals: List[CompetitorSignal], top_n: int = 5) -> List[str]:
        """Get most at-risk categories"""
        cat_counts = defaultdict(int)
        for s in signals:
            cat_counts[s.category] += 1
        return sorted(cat_counts.keys(), key=lambda c: -cat_counts[c])[:top_n]


def main():
    """CLI interface"""
    if len(sys.argv) < 2:
        print("Usage: python competitor_intelligence.py <orders.json>")
        sys.exit(1)

    with open(sys.argv[1], 'r') as f:
        orders = json.load(f)

    engine = CompetitorIntelligenceEngine()
    results = engine.analyze(orders)

    print(json.dumps(results, indent=2, default=str))


if __name__ == '__main__':
    main()
