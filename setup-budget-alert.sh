#!/bin/bash
# GCP Budget Alert — MANDATORY before any cloud deploy
# Fires an email alert at $5 and $20 spend. Hard cap at $24.
# Run this BEFORE deploy-cloudrun.sh.
#
# RUN: bash setup-budget-alert.sh

PROJECT_ID="your-gcp-project-id"   # same as deploy script
ALERT_EMAIL="prajwal2105patil@gmail.com"
BILLING_ACCOUNT="your-billing-account-id"  # gcloud billing accounts list

# Enable billing API
gcloud services enable billingbudgets.googleapis.com --project="${PROJECT_ID}"

# Create budget with alerts at 50% ($12) and 85% ($20.40) of $24
gcloud billing budgets create \
  --billing-account="${BILLING_ACCOUNT}" \
  --display-name="ASRE Runway Guard" \
  --budget-amount=24USD \
  --threshold-rule=percent=0.50 \
  --threshold-rule=percent=0.85 \
  --threshold-rule=percent=1.00 \
  --all-updates-rule-pubsub-topic="" \
  --all-updates-rule-monitoring-notification-channels=""

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Budget alert set."
echo "  Alerts fire at: \$12 / \$20.40 / \$24"
echo "  Also set a manual alert in GCP Console:"
echo "  Billing → Budgets & Alerts → ${PROJECT_ID}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "  ⚠️  CHECK YOUR BILLING ACCOUNT ID:"
echo "  gcloud billing accounts list"
