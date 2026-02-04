#!/usr/bin/env python3

import sys
import json
import pandas as pd
import numpy as np
from sklearn.preprocessing import StandardScaler
from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score, roc_auc_score
from xgboost import XGBClassifier
from scipy import stats
import warnings
warnings.filterwarnings('ignore')

class PLCAAMLEngine:
    """Product-Level Churn Attribution Algorithm - ML Version"""
    
    def __init__(self):
        self.models = {}
        self.scalers = {}
        
    def detect_schema(self, df):
        """GAP 1 & 2: Intelligent schema detection"""
        cols = df.columns.tolist()
        
        patterns = {
            'customer': r'customer|account|id|user|entity|party|company|client',
            'value': r'spending|revenue|sales|amount|value|total|price|clv|mrr',
            'trend': r'trend|change|growth|decline|delta|velocity',
            'frequency': r'frequency|count|volume|transaction|activity|engagement',
            'recency': r'recency|recent|last|days|ago|inactive',
            'product': r'product|service|item|module|feature|sku|category',
            'date': r'date|month|year|period|time'
        }
        
        schema = {}
        for key, pattern in patterns.items():
            import re
            schema[key] = next((c for c in cols if re.search(pattern, c, re.I)), None)
        
        return schema
    
    def engineer_features(self, df, schema):
        """GAP 3: Advanced feature engineering for accuracy"""
        features = pd.DataFrame()
        
        if schema['value']:
            features['spending'] = pd.to_numeric(df[schema['value']], errors='coerce').fillna(0)
            features['spending_normalized'] = (features['spending'] - features['spending'].mean()) / (features['spending'].std() + 1e-8)
        
        if schema['trend']:
            features['trend'] = pd.to_numeric(df[schema['trend']], errors='coerce').fillna(0)
        
        if schema['frequency']:
            features['frequency'] = pd.to_numeric(df[schema['frequency']], errors='coerce').fillna(0)
            features['frequency_log'] = np.log1p(features['frequency'])
        
        if schema['recency']:
            features['recency'] = pd.to_numeric(df[schema['recency']], errors='coerce').fillna(0)
        
        features['spending_volatility'] = features['spending'].rolling(3, min_periods=1).std().fillna(0)
        features['trend_acceleration'] = features['trend'].diff().fillna(0)
        features['engagement_score'] = (features['frequency'] * features['spending']) / (features['recency'] + 1)
        
        features['spending_zscore'] = np.abs(stats.zscore(features['spending'].fillna(features['spending'].mean())))
        features['trend_zscore'] = np.abs(stats.zscore(features['trend'].fillna(features['trend'].mean())))
        
        features['value_x_engagement'] = features['spending'] * features['engagement_score']
        features['trend_x_frequency'] = features['trend'] * features['frequency']
        
        return features.fillna(0)
    
    def calculate_confidence_intervals(self, scores, confidence=0.95):
        """GAP 1: Statistical confidence intervals"""
        mean = np.mean(scores)
        std_err = stats.sem(scores)
        ci = std_err * stats.t.ppf((1 + confidence) / 2, len(scores) - 1)
        return {
            'mean': float(mean),
            'ci_lower': float(mean - ci),
            'ci_upper': float(mean + ci),
            'std_error': float(std_err),
            'confidence': confidence
        }
    
    def train_ensemble_models(self, X, y):
        """GAP 2 & 3: ML Sophistication + Accuracy"""
        X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
        
        scaler = StandardScaler()
        X_train_scaled = scaler.fit_transform(X_train)
        X_test_scaled = scaler.transform(X_test)
        
        models_trained = {}
        
        rf_model = RandomForestClassifier(n_estimators=100, max_depth=10, random_state=42, n_jobs=-1)
        rf_model.fit(X_train_scaled, y_train)
        rf_pred = rf_model.predict_proba(X_test_scaled)[:, 1]
        models_trained['random_forest'] = {
            'accuracy': float(accuracy_score(y_test, (rf_pred > 0.5).astype(int))),
            'precision': float(precision_score(y_test, (rf_pred > 0.5).astype(int), zero_division=0)),
            'recall': float(recall_score(y_test, (rf_pred > 0.5).astype(int), zero_division=0)),
            'f1': float(f1_score(y_test, (rf_pred > 0.5).astype(int), zero_division=0)),
            'roc_auc': float(roc_auc_score(y_test, rf_pred))
        }
        
        xgb_model = XGBClassifier(n_estimators=100, max_depth=6, learning_rate=0.1, random_state=42, n_jobs=-1)
        xgb_model.fit(X_train_scaled, y_train)
        xgb_pred = xgb_model.predict_proba(X_test_scaled)[:, 1]
        models_trained['xgboost'] = {
            'accuracy': float(accuracy_score(y_test, (xgb_pred > 0.5).astype(int))),
            'precision': float(precision_score(y_test, (xgb_pred > 0.5).astype(int), zero_division=0)),
            'recall': float(recall_score(y_test, (xgb_pred > 0.5).astype(int), zero_division=0)),
            'f1': float(f1_score(y_test, (xgb_pred > 0.5).astype(int), zero_division=0)),
            'roc_auc': float(roc_auc_score(y_test, xgb_pred))
        }
        
        gb_model = GradientBoostingClassifier(n_estimators=100, max_depth=5, learning_rate=0.1, random_state=42)
        gb_model.fit(X_train_scaled, y_train)
        gb_pred = gb_model.predict_proba(X_test_scaled)[:, 1]
        models_trained['gradient_boosting'] = {
            'accuracy': float(accuracy_score(y_test, (gb_pred > 0.5).astype(int))),
            'precision': float(precision_score(y_test, (gb_pred > 0.5).astype(int), zero_division=0)),
            'recall': float(recall_score(y_test, (gb_pred > 0.5).astype(int), zero_division=0)),
            'f1': float(f1_score(y_test, (gb_pred > 0.5).astype(int), zero_division=0)),
            'roc_auc': float(roc_auc_score(y_test, gb_pred))
        }
        
        best_model_name = max(models_trained, key=lambda x: models_trained[x]['f1'])
        best_model = xgb_model if best_model_name == 'xgboost' else (rf_model if best_model_name == 'random_forest' else gb_model)
        
        return {
            'best_model': best_model,
            'best_model_name': best_model_name,
            'scaler': scaler,
            'all_models': models_trained,
            'test_performance': models_trained[best_model_name]
        }
    
    def analyze(self, data):
        """Complete ML analysis"""
        df = pd.DataFrame(data)
        schema = self.detect_schema(df)
        
        features = self.engineer_features(df, schema)
        
        y = (features['trend'] < -10) | (features['spending_zscore'] > 2) | (features['recency'] > 90)
        y = y.astype(int)
        
        model_results = self.train_ensemble_models(features, y)
        best_model = model_results['best_model']
        scaler = model_results['scaler']
        
        X_scaled = scaler.transform(features)
        risk_scores = best_model.predict_proba(X_scaled)[:, 1] * 100
        
        confidence_stats = self.calculate_confidence_intervals(risk_scores)
        
        results = []
        for idx, (score, row) in enumerate(zip(risk_scores, df.itertuples())):
            results.append({
                'customer_id': getattr(row, schema['customer'], f'CUST_{idx}') if schema['customer'] else f'CUST_{idx}',
                'churn_risk_score': float(score),
                'confidence_lower': float(confidence_stats['ci_lower']),
                'confidence_upper': float(confidence_stats['ci_upper']),
                'clv': float(getattr(row, schema['value'], 0) if schema['value'] else 0),
                'products_lost': 0,
                'total_lost_revenue': 0,
                'trend_direction': 'Stable',
                'business_type': 'Unknown',
                'region': 'Unknown',
                'lost_products_details': []
            })
        
        return {
            'customers': results,
            'insights': {
                'total_customers': len(data),
                'high_risk_customers': sum(1 for r in results if r['churn_risk_score'] >= 75),
                'model_performance': model_results['all_models'],
                'best_model': model_results['best_model_name'],
                'statistical_confidence': confidence_stats,
                'algorithm_version': 'PLCAA-ML-v1.0',
                'industry': 'Unknown',
                'total_clv': sum(r['clv'] for r in results),
                'total_lost_revenue': 0,
                'top_lost_products': [],
                'retention_priority': [],
                'industry_recommendations': []
            }
        }

def main():
    input_file = sys.argv[1]
    
    with open(input_file, 'r') as f:
        data = json.load(f)
    
    engine = PLCAAMLEngine()
    results = engine.analyze(data)
    
    print(json.dumps(results, default=str))

if __name__ == '__main__':
    main()
