# 🚀 Quick Start Guide - Playwright E2E Tests

## TL;DR - Run Tests Now

```bash
# 1. Setup Playwright (first time only)
cd packages/frontend
./tests/setup-playwright.sh

# 2. Make sure backend is running (separate terminal)
cd packages/backend
uv run uvicorn src.app.main:app --reload --port 8000

# 3. Run the tests
cd packages/frontend
npm run test:e2e
```

## What These Tests Do

✅ Verify share modal opens and displays correctly
✅ Check OG images are generated with real user data (not placeholders)
✅ Test all share buttons (Twitter, LinkedIn, Copy, Download)
✅ Validate social media meta tags for SEO
✅ Ensure complete sharing workflow works end-to-end

## Test Results Location

After running tests:

- **Console Output**: Shows pass/fail for each test
- **HTML Report**: Run `npx playwright show-report` to view detailed results
- **Screenshots**: Failures are captured in `test-results/`

## Troubleshooting

### "Cannot find test user"

→ Create a test user in your database or change the username in the test file:

```typescript
// In tests/sharing-verification.spec.ts
const testUsername = 'your-actual-username';
```

### "Connection refused"

→ Make sure both backend (port 8000) and frontend (port 3000) are running

### "Playwright not found"

→ Run the setup script: `./tests/setup-playwright.sh`

## Next Task (T009)

After running these tests successfully, the next step is to verify everything works and then clean up (T010).

---

📖 For detailed documentation, see [README.md](./README.md)
📊 For implementation details, see [TASK-T008-SUMMARY.md](./TASK-T008-SUMMARY.md)
