# Playwright E2E Tests

This directory contains end-to-end tests for the burntop.dev frontend application using Playwright.

## Setup

### Install Playwright and Browsers

```bash
# From the frontend directory
cd packages/frontend

# Install Playwright and its dependencies
npx playwright install --with-deps chromium
```

## Running Tests

### Run All Tests

```bash
# From the frontend directory
npx playwright test
```

### Run Specific Test File

```bash
npx playwright test tests/sharing-verification.spec.ts
```

### Run Tests in UI Mode (Interactive)

```bash
npx playwright test --ui
```

### Run Tests in Debug Mode

```bash
npx playwright test --debug
```

### Run Tests with Headed Browser (See the Browser)

```bash
npx playwright test --headed
```

## Test Configuration

The Playwright configuration is in `playwright.config.ts`. Key settings:

- **Base URL**: `http://localhost:3000`
- **Test Directory**: `./tests`
- **Browser**: Chromium (can be extended to Firefox, WebKit)
- **Web Server**: Automatically starts the dev server before tests

## Prerequisites

Before running the tests, ensure:

1. **Backend is running**: The tests expect the FastAPI backend to be running at `http://localhost:8000`
   ```bash
   cd packages/backend
   uv run uvicorn src.app.main:app --reload --port 8000
   ```

2. **Test data exists**: The tests use a test user (default: `testuser`). Make sure this user exists in your database with some stats data.

3. **Environment variables**: Ensure your `.env` file is configured correctly for the frontend to communicate with the backend.

## Test Coverage

### `sharing-verification.spec.ts`

Tests the social media sharing feature:

- ✅ Profile page loads successfully
- ✅ Share button is visible
- ✅ Share modal opens and displays correctly
- ✅ OG image is displayed in share modal
- ✅ OG image loads successfully (not a placeholder)
- ✅ OG image contains user stats
- ✅ All share buttons are visible (Twitter, LinkedIn, Copy, Download)
- ✅ Copy link functionality works
- ✅ Twitter share opens correct URL
- ✅ LinkedIn share opens correct URL
- ✅ OG meta tags are present in HTML
- ✅ Modal can be closed
- ✅ OG image endpoints return correct responses

## Customizing Tests

To test with a different username, update the `testUsername` variable in the test file:

```typescript
const testUsername = 'your-username-here';
```

## Troubleshooting

### Tests fail with "page.goto: timeout"

- Make sure the frontend dev server is running
- Check that the backend API is accessible
- Verify the `baseURL` in `playwright.config.ts` matches your dev server URL

### Tests fail with "User not found"

- Ensure the test user exists in the database
- Create test data using the backend API or database seeding

### Share modal doesn't open

- Check browser console for errors
- Verify the share button selector matches your component
- Check that JavaScript is enabled

## Viewing Test Reports

After running tests, view the HTML report:

```bash
npx playwright show-report
```

## CI/CD Integration

To run tests in CI:

```bash
# Install dependencies
npx playwright install --with-deps chromium

# Run tests
npx playwright test

# Tests will run in headless mode by default in CI
```

## Cleanup

After verification is complete, you can delete this test file as specified in the task plan (T010).
