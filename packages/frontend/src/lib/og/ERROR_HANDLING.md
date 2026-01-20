# OG Image Error Handling

This document describes the comprehensive error handling and fallback system for OG image generation in the burntop.dev frontend.

## Overview

The OG image generation system handles various error scenarios gracefully by rendering user-friendly error cards instead of generic HTTP errors or broken images. This ensures that social media previews always display something meaningful, even when data is unavailable or invalid.

## Error Types

### 1. User Not Found (404)
**Trigger:** User doesn't exist in the database or hasn't created a profile yet.

**Response:**
- HTTP Status: 404
- Error Card: "User Not Found" with 🔍 emoji
- Message: "The user @username doesn't exist or hasn't set up their profile yet."
- Cache: 5 minutes

**Example:**
```
GET /api/og/nonexistent-user/stats
→ Returns PNG with "User Not Found" error card
```

### 2. Private Profile (403)
**Trigger:** User's profile is marked as private and cannot be shared publicly.

**Response:**
- HTTP Status: 403
- Error Card: "Private Profile" with 🔒 emoji
- Message: "@username's profile is private and cannot be shared publicly."
- Cache: 5 minutes

### 3. Server Error (500)
**Trigger:** Backend API error, network failure, or unexpected server issue.

**Response:**
- HTTP Status: 500
- Error Card: "Something Went Wrong" with ⚠️ emoji
- Message: "Unable to generate stats image. Please try again later."
- Cache: 1 minute

### 4. Invalid Data
**Trigger:** User has no activity data, or data fails validation checks.

**Response:**
- HTTP Status: 200 (user exists but has no data) or 500 (validation failed)
- Error Card: "No Data Available" with 📊 emoji
- Message: "@username doesn't have enough activity data to display stats yet."
- Cache: 10 minutes (200) or 5 minutes (500)

## Data Validation

### Stats Data Validation

The `validateStatsData()` function checks:
- ✅ Required fields are present (username, total_tokens, etc.)
- ✅ Numeric fields are non-negative
- ✅ Cache efficiency is in valid range (0-100) if present
- ✅ No NaN or Infinity values

**Example:**
```typescript
const validation = validateStatsData(statsData);
if (!validation.isValid) {
  // Render error card with validation.error message
}
```

### Minimum Activity Check

The `hasMinimumActivityData()` function ensures users have:
- At least 1 token used, OR
- At least 1 unique activity day

**Example:**
```typescript
if (!hasMinimumActivityData(statsData)) {
  // Show "No Data Available" error card
}
```

### Weekly Data Validation

For weekly recap images:
- `validateWeeklyEstimates()`: Ensures weekly tokens don't exceed monthly
- `validateDaysActive()`: Clamps days to 0-7 range

## Error Card Template

The `ErrorCardTemplate` component renders beautiful, branded error states:

**Features:**
- Consistent branding with burntop.dev design system
- Large emoji icon for visual clarity
- Clear error title and message
- Call-to-action to visit burntop.dev
- Matches OG image dimensions (1200x630)

**Usage:**
```typescript
const errorCard = ErrorCardTemplate({
  errorType: 'not_found',
  username: 'testuser',
  message: 'Optional custom message', // Overrides default
});

const pngBuffer = await renderCardToPng(errorCard);
```

## Fallback Hierarchy

The system implements a multi-level fallback approach:

1. **Primary:** Render error card template (branded, user-friendly)
2. **Secondary:** If card rendering fails, return minimal SVG error
3. **Cache Strategy:** Errors are cached with shorter TTL to allow quick recovery

## HTTP Response Headers

All OG image responses include:
- `Content-Type`: `image/png` (or `image/svg+xml` for fallback)
- `Cache-Control`: Appropriate caching based on error type
- `X-Error-Type`: Custom header indicating error category (for debugging)

**Cache Duration:**
- Success: 1 hour (3600s)
- Not Found/Private: 5 minutes (300s)
- Server Error: 1 minute (60s)
- Insufficient Data: 10 minutes (600s)

## Safe Fallback Utilities

### `safeNumber(value, fallback = 0)`
Returns a valid number or fallback value.

```typescript
const cost = safeNumber(statsData.total_cost, 0);
// Returns 0 if total_cost is NaN, Infinity, or invalid
```

### `safeString(value, fallback = '')`
Returns a valid string or fallback value.

```typescript
const username = safeString(statsData.username, 'unknown');
// Returns 'unknown' if username is empty, null, or invalid
```

### `getSafeCacheEfficiency(statsData)`
Returns cache efficiency if valid (0-100) or undefined.

```typescript
const cacheEff = getSafeCacheEfficiency(statsData);
// Returns undefined if null, negative, or > 100
```

## Implementation Examples

### Stats Route Error Handling

```typescript
// Fetch user stats
const statsResponse = await fetch(`${API_BASE_URL}/api/v1/users/${username}/stats`);

if (!statsResponse.ok) {
  // Render appropriate error card based on status code
  const errorCard = ErrorCardTemplate({
    errorType: statsResponse.status === 404 ? 'not_found' :
                statsResponse.status === 403 ? 'private' :
                'server_error',
    username,
  });

  return new Response(await renderCardToPng(errorCard), {
    status: statsResponse.status,
    headers: createImageHeaders(300),
  });
}

// Validate data
const validation = validateStatsData(statsData);
if (!validation.isValid) {
  // Render invalid data error card
}

// Check minimum activity
if (!hasMinimumActivityData(validatedStats)) {
  // Render insufficient data error card
}
```

### Weekly Route Additional Validation

```typescript
// Validate weekly estimates
const weeklyValidation = validateWeeklyEstimates(
  estimatedWeeklyTokens,
  validatedStats.monthly_tokens
);

// Validate days active
const daysValidation = validateDaysActive(rawDaysActive);
```

## Testing

Comprehensive test coverage includes:
- Unit tests for validation functions (`validate-data.test.ts`)
- Component tests for error card template (`error-card-template.test.tsx`)
- Edge cases: negative values, NaN, Infinity, null, undefined
- Boundary conditions: cache efficiency 0-100, days active 0-7

**Run tests:**
```bash
cd packages/frontend
npm test -- src/lib/og/validate-data.test.ts
npm test -- src/lib/og/error-card-template.test.tsx
```

## Debugging

To debug OG image errors:

1. Check server logs for `[OG]` prefix
2. Inspect `X-Error-Type` response header
3. Test error cards directly:
   ```typescript
   const card = ErrorCardTemplate({ errorType: 'not_found', username: 'test' });
   const svg = await renderCardToSvg(card); // For debugging
   console.log(svg);
   ```

## Future Enhancements

Potential improvements:
- [ ] Rate limiting error cards for abuse prevention
- [ ] Telemetry/analytics for error tracking
- [ ] Retry logic with exponential backoff
- [ ] Webhook notifications for critical errors
- [ ] A/B testing different error messages

## Related Files

- `packages/frontend/src/lib/og/error-card-template.tsx` - Error card component
- `packages/frontend/src/lib/og/validate-data.ts` - Validation utilities
- `packages/frontend/src/routes/api/og/$username.stats.ts` - Stats route
- `packages/frontend/src/routes/api/og/$username.weekly.ts` - Weekly route
- `packages/frontend/src/lib/og/render-card.ts` - Card rendering utilities
