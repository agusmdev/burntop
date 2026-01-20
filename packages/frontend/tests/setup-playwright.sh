#!/bin/bash

# Playwright E2E Test Setup Script
# This script installs Playwright and required browsers for testing

set -e

echo "🎭 Setting up Playwright for E2E testing..."

# Navigate to frontend directory
cd "$(dirname "$0")/.."

echo ""
echo "📦 Installing Playwright browsers..."
npx playwright install chromium

echo ""
echo "📦 Installing system dependencies for Playwright..."
npx playwright install-deps chromium

echo ""
echo "✅ Playwright setup complete!"
echo ""
echo "You can now run tests with:"
echo "  npm run test:e2e              # Run all tests"
echo "  npm run test:e2e:ui           # Run in UI mode"
echo "  npm run test:e2e:debug        # Run in debug mode"
echo ""
echo "Or manually:"
echo "  npx playwright test                    # Run all tests"
echo "  npx playwright test --headed           # See the browser"
echo "  npx playwright test --ui               # Interactive mode"
echo "  npx playwright show-report             # View test report"
echo ""
