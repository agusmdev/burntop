# burntop.dev API Documentation

> Comprehensive API reference for burntop.dev platform

**Base URL:** `https://burntop.dev`

---

## Table of Contents

- [Authentication](#authentication)
- [Rate Limits](#rate-limits)
- [Response Format](#response-format)
- [Core APIs](#core-apis)
- [User APIs](#user-apis)
- [Social Features](#social-features)
- [Dashboard APIs](#dashboard-apis)
- [Leaderboard](#leaderboard)
- [Achievements](#achievements)
- [Notifications](#notifications)
- [Real-time](#real-time)
- [Badges](#badges)
- [Open Graph Images](#open-graph-images)
- [Wrapped](#wrapped)
- [Referrals](#referrals)
- [SEO](#seo)

---

## Authentication

Most endpoints require authentication via session cookie or Bearer token.

### Session Cookie

Web app uses session cookies set by Better Auth after OAuth login.

### Bearer Token (CLI)

CLI uses Bearer token authentication:

```bash
Authorization: Bearer <your-api-token>
```

Obtain token via `burntop login` command.

---

## Rate Limits

| Endpoint            | Limit                                    |
| ------------------- | ---------------------------------------- |
| `POST /api/sync`    | 10 requests per minute per user          |
| All other endpoints | No explicit rate limit (fair use policy) |

---

## Response Format

### Success Response

```json
{
  "data": { ... },
  "meta": { ... }
}
```

### Error Response

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable error message"
  }
}
```

### Common Error Codes

- `UNAUTHORIZED` - Authentication required
- `FORBIDDEN` - Insufficient permissions
- `NOT_FOUND` - Resource not found
- `VALIDATION_ERROR` - Invalid request data
- `RATE_LIMIT_EXCEEDED` - Too many requests
- `INTERNAL_ERROR` - Server error

---

## Core APIs

### Health Check

**GET** `/api/health`

Check service health for monitoring.

**Auth:** None

**Response:**

```json
{
  "status": "ok",
  "timestamp": "2024-01-05T12:34:56.789Z",
  "checks": {
    "database": "ok"
  }
}
```

**Status Codes:**

- `200` - Service healthy
- `503` - Service unhealthy

**Cache:** `no-cache`

---

### Sync Usage Data

**POST** `/api/sync`

Upload AI usage data from CLI tool.

**Auth:** Required (Bearer token)

**Rate Limit:** 10 requests per minute

**Request Body:**

```json
{
  "records": [
    {
      "timestamp": "2024-01-05T12:00:00Z",
      "model": "claude-3-5-sonnet-20241022",
      "source": "claude-code",
      "inputTokens": 1000,
      "outputTokens": 500,
      "cacheCreationTokens": 0,
      "cacheReadTokens": 0,
      "requestId": "req_abc123"
    }
  ]
}
```

**Response:**

```json
{
  "success": true,
  "recordsAdded": 1,
  "recordsSkipped": 0,
  "achievements": ["first-sync"],
  "leveledUp": false,
  "newLevel": null
}
```

**Features:**

- Deduplicates records by `requestId`
- Updates user stats (tokens, costs, XP)
- Calculates streak
- Checks for achievement unlocks
- Awards XP for activity

---

## User APIs

### Get User Profile

**GET** `/api/users/:username`

Get public user profile.

**Auth:** None

**Response:**

```json
{
  "id": "user_123",
  "username": "alice",
  "name": "Alice Smith",
  "image": "https://github.com/alice.png",
  "bio": "Full-stack developer",
  "location": "San Francisco, CA",
  "websiteUrl": "https://alice.dev",
  "level": 12,
  "xp": 2450,
  "isPublic": true,
  "createdAt": "2024-01-01T00:00:00Z"
}
```

**Status Codes:**

- `200` - Success
- `404` - User not found
- `403` - Profile is private

---

### Get User Stats

**GET** `/api/users/:username/stats`

Get comprehensive user statistics.

**Auth:** None (public profiles only)

**Response:**

```json
{
  "totalTokens": 1500000,
  "totalCost": 15.5,
  "cacheEfficiency": 0.85,
  "currentStreak": 7,
  "longestStreak": 30,
  "achievementsUnlocked": 12,
  "achievementsTotal": 68,
  "topModels": [
    {
      "model": "claude-3-5-sonnet-20241022",
      "tokens": 1000000,
      "percentage": 66.7
    }
  ],
  "topSources": [
    {
      "source": "cursor",
      "tokens": 800000,
      "percentage": 53.3
    }
  ]
}
```

---

### Get User Level

**GET** `/api/users/:username/level`

Get user's level and XP information.

**Auth:** None (public profiles only)

**Response:**

```json
{
  "level": 12,
  "title": "AI Adept",
  "currentXp": 2450,
  "xpToNextLevel": 500,
  "totalXpForNextLevel": 2950,
  "progress": 0.83
}
```

---

### Get User Achievements

**GET** `/api/users/:username/achievements`

Get all achievements for a user (both locked and unlocked).

**Auth:** None (public profiles only)

**Response:**

```json
{
  "achievements": [
    {
      "id": "first-sync",
      "name": "First Sync",
      "description": "Synced your first usage data",
      "rarity": "common",
      "category": "onboarding",
      "icon": "🎯",
      "unlocked": true,
      "unlockedAt": "2024-01-05T12:00:00Z",
      "pinned": true,
      "progress": null
    },
    {
      "id": "token-millionaire",
      "name": "Token Millionaire",
      "description": "Used 1,000,000 tokens",
      "rarity": "legendary",
      "category": "usage",
      "icon": "💎",
      "unlocked": false,
      "unlockedAt": null,
      "pinned": false,
      "progress": {
        "current": 500000,
        "target": 1000000,
        "percentage": 0.5
      }
    }
  ]
}
```

---

### Update Current User Profile

**PATCH** `/api/users/me`

Update authenticated user's profile.

**Auth:** Required

**Request Body:**

```json
{
  "name": "Alice Smith",
  "bio": "Full-stack developer",
  "location": "San Francisco, CA",
  "websiteUrl": "https://alice.dev",
  "isPublic": true
}
```

**Validation:**

- `name`: 1-50 characters
- `bio`: max 500 characters
- `location`: max 100 characters
- `websiteUrl`: valid URL

**Response:**

```json
{
  "success": true,
  "user": { ... }
}
```

---

### Pin/Unpin Achievement

**PATCH** `/api/users/me/achievements/:id/pin`

Pin or unpin achievement to profile showcase.

**Auth:** Required

**Request Body:**

```json
{
  "pinned": true
}
```

**Constraints:**

- Maximum 6 pinned achievements
- Can only pin unlocked achievements

**Response:**

```json
{
  "success": true,
  "pinned": true
}
```

---

## Social Features

### Follow User

**POST** `/api/users/:username/follow`

Follow a user.

**Auth:** Required

**Response:**

```json
{
  "success": true,
  "following": true
}
```

---

### Unfollow User

**DELETE** `/api/users/:username/follow`

Unfollow a user.

**Auth:** Required

**Response:**

```json
{
  "success": true,
  "following": false
}
```

---

### Get Followers

**GET** `/api/users/:username/followers`

Get list of user's followers.

**Auth:** None (public profiles only)

**Response:**

```json
{
  "followers": [
    {
      "id": "user_456",
      "username": "bob",
      "name": "Bob Jones",
      "image": "https://github.com/bob.png",
      "level": 8
    }
  ],
  "total": 1
}
```

---

### Get Following

**GET** `/api/users/:username/following`

Get list of users this user follows.

**Auth:** None (public profiles only)

**Response:**

```json
{
  "following": [
    {
      "id": "user_789",
      "username": "charlie",
      "name": "Charlie Brown",
      "image": "https://github.com/charlie.png",
      "level": 15
    }
  ],
  "total": 1
}
```

---

### Get Activity Feed

**GET** `/api/feed`

Get activity feed from followed users.

**Auth:** Required

**Query Parameters:**

- `cursor` (number, optional) - Pagination cursor (activity ID)
- `limit` (number, optional) - Results per page (default: 50, max: 100)

**Response:**

```json
{
  "activities": [
    {
      "id": 123,
      "userId": "user_789",
      "username": "charlie",
      "name": "Charlie Brown",
      "image": "https://github.com/charlie.png",
      "type": "achievement_unlocked",
      "data": {
        "achievementId": "streak-7",
        "achievementName": "Week Warrior",
        "achievementIcon": "🔥"
      },
      "timestamp": "2024-01-05T12:00:00Z"
    }
  ],
  "nextCursor": 122,
  "hasMore": true
}
```

**Activity Types:**

- `achievement_unlocked` - User unlocked achievement
- `level_up` - User leveled up
- `leaderboard_rank` - User reached new leaderboard rank
- `streak_milestone` - User reached streak milestone

---

## Dashboard APIs

### Dashboard Overview

**GET** `/api/dashboard/overview`

Get dashboard overview stats for authenticated user.

**Auth:** Required

**Response:**

```json
{
  "allTime": {
    "totalTokens": 1500000,
    "totalCost": 15.5,
    "cacheEfficiency": 0.85
  },
  "thisMonth": {
    "totalTokens": 250000,
    "totalCost": 2.5
  },
  "thisWeek": {
    "totalTokens": 50000,
    "totalCost": 0.5
  },
  "streak": {
    "current": 7,
    "longest": 30
  },
  "level": {
    "level": 12,
    "title": "AI Adept",
    "currentXp": 2450,
    "xpToNextLevel": 500
  }
}
```

---

### Dashboard Trends

**GET** `/api/dashboard/trends`

Get usage trends and comparisons.

**Auth:** Required

**Response:**

```json
{
  "weekOverWeek": {
    "tokens": 0.15,
    "cost": 0.12
  },
  "monthOverMonth": {
    "tokens": 0.25,
    "cost": 0.2
  },
  "usageOverTime": [
    {
      "date": "2024-01-01",
      "tokens": 10000,
      "cost": 0.1
    }
  ],
  "peakHours": [
    {
      "hour": 14,
      "tokens": 50000
    }
  ],
  "dayOfWeek": [
    {
      "day": "Monday",
      "tokens": 100000
    }
  ]
}
```

---

### Dashboard Models

**GET** `/api/dashboard/models`

Get model usage distribution.

**Auth:** Required

**Response:**

```json
{
  "distribution": [
    {
      "model": "claude-3-5-sonnet-20241022",
      "tokens": 1000000,
      "cost": 10.0,
      "percentage": 66.7
    }
  ],
  "overTime": [
    {
      "date": "2024-01-01",
      "model": "claude-3-5-sonnet-20241022",
      "tokens": 10000
    }
  ],
  "newModels": [
    {
      "model": "gpt-4-turbo-2024-04-09",
      "firstUsed": "2024-01-05T12:00:00Z",
      "tokens": 5000
    }
  ]
}
```

---

### Dashboard Tools

**GET** `/api/dashboard/tools`

Get tool/source usage distribution.

**Auth:** Required

**Response:**

```json
{
  "distribution": [
    {
      "source": "cursor",
      "tokens": 800000,
      "cost": 8.0,
      "percentage": 53.3
    }
  ],
  "overTime": [
    {
      "date": "2024-01-01",
      "source": "cursor",
      "tokens": 8000
    }
  ],
  "newTools": [
    {
      "source": "claude-code",
      "firstUsed": "2024-01-05T12:00:00Z",
      "tokens": 10000
    }
  ]
}
```

---

## Leaderboard

### Get Leaderboard

**GET** `/api/leaderboard`

Get global or filtered leaderboard.

**Auth:** Optional (required for `friends` leaderboard)

**Query Parameters:**

- `period` (string, optional) - Time period: `all` | `month` | `week` (default: `all`)
- `type` (string, optional) - Leaderboard type: `global` | `diverse` | `efficient` | `streak` | `rising` | `reasoning` | `friends` (default: `global`)
- `tool` (string, optional) - Filter by source (e.g., `cursor`, `claude-code`)
- `model` (string, optional) - Filter by model (e.g., `claude-3-5-sonnet-20241022`)
- `region` (string, optional) - Filter by region: `NA` | `EU` | `APAC` | `SA` | `AF` | `OCE`
- `cursor` (number, optional) - Pagination cursor (rank)
- `limit` (number, optional) - Results per page (default: 100, max: 100)

**Leaderboard Types:**

- `global` - Total tokens (all-time, month, or week)
- `diverse` - Number of different models used
- `efficient` - Cache hit rate
- `streak` - Current streak length
- `rising` - Biggest gainers (week-over-week)
- `reasoning` - Reasoning tokens used (o1/o3 models)
- `friends` - Leaderboard of followed users (auth required)

**Response:**

```json
{
  "entries": [
    {
      "rank": 1,
      "userId": "user_123",
      "username": "alice",
      "name": "Alice Smith",
      "image": "https://github.com/alice.png",
      "level": 12,
      "score": 1500000,
      "scoreLabel": "1.5M tokens"
    }
  ],
  "nextCursor": 101,
  "hasMore": true,
  "userEntry": {
    "rank": 42,
    "score": 100000
  }
}
```

---

## Achievements

### Get All Achievements

**GET** `/api/achievements`

Get all achievement definitions.

**Auth:** None

**Query Parameters:**

- `category` (string, optional) - Filter by category: `onboarding` | `usage` | `social` | `streaks` | `efficiency` | `diversity` | `milestones` | `special`
- `rarity` (string, optional) - Filter by rarity: `common` | `rare` | `epic` | `legendary`

**Response:**

```json
{
  "achievements": [
    {
      "id": "first-sync",
      "name": "First Sync",
      "description": "Synced your first usage data",
      "rarity": "common",
      "category": "onboarding",
      "icon": "🎯",
      "xpReward": 10
    }
  ],
  "total": 68,
  "byCategory": {
    "onboarding": 5,
    "usage": 15,
    "social": 8,
    "streaks": 10,
    "efficiency": 10,
    "diversity": 8,
    "milestones": 10,
    "special": 2
  },
  "byRarity": {
    "common": 30,
    "rare": 20,
    "epic": 12,
    "legendary": 6
  }
}
```

---

## Notifications

### Get Notifications

**GET** `/api/notifications`

Get user notifications.

**Auth:** Required

**Query Parameters:**

- `limit` (number, optional) - Results per page (default: 50, max: 100)
- `offset` (number, optional) - Pagination offset
- `unreadOnly` (boolean, optional) - Show only unread notifications

**Response:**

```json
{
  "notifications": [
    {
      "id": 1,
      "type": "achievement_unlocked",
      "title": "Achievement Unlocked!",
      "message": "You unlocked the Week Warrior achievement",
      "data": {
        "achievementId": "streak-7",
        "achievementName": "Week Warrior",
        "achievementIcon": "🔥"
      },
      "read": false,
      "createdAt": "2024-01-05T12:00:00Z"
    }
  ],
  "total": 10,
  "unreadCount": 3
}
```

**Notification Types:**

- `achievement_unlocked` - Achievement unlocked
- `level_up` - Level up
- `leaderboard_rank` - New leaderboard rank
- `streak_at_risk` - Streak at risk (22 hours)
- `weekly_summary` - Weekly summary ready
- `followed` - Someone followed you

---

### Mark Notifications as Read

**POST** `/api/notifications`

Mark notifications as read.

**Auth:** Required

**Request Body:**

```json
{
  "notificationIds": [1, 2, 3]
}
```

Or mark all as read:

```json
{
  "markAll": true
}
```

**Response:**

```json
{
  "success": true,
  "markedCount": 3
}
```

---

## Real-time

### Server-Sent Events

**GET** `/api/sse`

Subscribe to real-time activity feed updates.

**Auth:** Required

**Connection:**

```javascript
const eventSource = new EventSource('/api/sse', {
  headers: {
    Authorization: 'Bearer <token>',
  },
});

eventSource.addEventListener('activity', (event) => {
  const activity = JSON.parse(event.data);
  console.log('New activity:', activity);
});

eventSource.addEventListener('keepalive', () => {
  console.log('Connection alive');
});
```

**Event Types:**

- `activity` - New activity from followed users
- `keepalive` - Heartbeat every 30 seconds

**Activity Event Data:**

```json
{
  "id": 123,
  "userId": "user_789",
  "username": "charlie",
  "type": "achievement_unlocked",
  "data": { ... },
  "timestamp": "2024-01-05T12:00:00Z"
}
```

---

## Badges

### Generate User Badge (SVG)

**GET** `/api/badge/:username`

Generate embeddable SVG badge.

**Auth:** None (public profiles only)

**Query Parameters:**

- `variant` (string, optional) - Badge variant: `compact` | `standard` | `detailed` | `streak` | `level` | `heatmap` (default: `standard`)
- `style` (string, optional) - Badge style: `flat` | `flat-square` | `plastic` | `for-the-badge` (default: `flat`)
- `theme` (string, optional) - Color theme: `dark` | `light` (default: `dark`)
- `color` (string, optional) - Custom color (hex without #, e.g., `FF6B00`)

**Response:** SVG image

**Content-Type:** `image/svg+xml`

**Cache:** `public, max-age=900` (15 minutes)

**Embed Example:**

```markdown
![burntop stats](https://burntop.dev/api/badge/alice?variant=standard&style=flat)
```

**Badge Variants:**

- `compact` - Tokens only (110x20)
- `standard` - Tokens + streak + level (320x20)
- `detailed` - Full stats (400x100)
- `streak` - Streak only (150x20)
- `level` - Level only (150x20)
- `heatmap` - Contribution heatmap (600x100)

---

### Generate Demo Badge

**GET** `/api/badge/demo`

Generate demo badge with mock data.

**Auth:** None

**Query Parameters:** Same as `/api/badge/:username`

**Response:** SVG image with sample data

**Cache:** `public, max-age=3600` (1 hour)

---

## Open Graph Images

### User Stats Card

**GET** `/api/og/:username/stats`

Generate stats card OG image (1200x630 PNG).

**Auth:** None (public profiles only)

**Response:** PNG image

**Content-Type:** `image/png`

**Cache:** `public, max-age=3600, stale-while-revalidate=86400` (1 hour + 1 day SWR)

---

### Achievement Unlock Card

**GET** `/api/og/:username/achievement/:id`

Generate achievement unlock OG image.

**Auth:** None (public profiles only)

**Response:** PNG image

**Content-Type:** `image/png`

**Cache:** `public, max-age=3600, stale-while-revalidate=86400`

---

### Weekly Recap Card

**GET** `/api/og/:username/weekly`

Generate weekly recap OG image.

**Auth:** None (public profiles only)

**Response:** PNG image

**Content-Type:** `image/png`

**Cache:** `public, max-age=1800, stale-while-revalidate=3600` (30 minutes + 1 hour SWR)

---

### Wrapped Card

**GET** `/api/og/wrapped/:year`

Generate Wrapped (year in review) OG image.

**Auth:** Required

**Query Parameters:**

- `format` (string, optional) - Image format: `standard` (1200x630) | `story` (1080x1920) | `square` (1080x1080) (default: `standard`)

**Response:** PNG image

**Content-Type:** `image/png`

**Cache:** `public, max-age=900, stale-while-revalidate=1800` (15 minutes + 30 minutes SWR)

---

## Wrapped

### Get Wrapped Data

**GET** `/api/wrapped/:year`

Get year-in-review data.

**Auth:** Required

**Response:**

```json
{
  "year": 2024,
  "totalTokens": 5000000,
  "totalCost": 50.0,
  "daysActive": 300,
  "longestStreak": 45,
  "topModel": {
    "model": "claude-3-5-sonnet-20241022",
    "tokens": 3000000,
    "percentage": 60.0
  },
  "topTool": {
    "source": "cursor",
    "tokens": 2500000,
    "percentage": 50.0
  },
  "achievementsUnlocked": 25,
  "leaderboardHighest": 12,
  "efficiencyScore": 0.85,
  "predictions": {
    "nextYearTokens": 7500000,
    "nextYearCost": 75.0,
    "suggestedGoal": "Reach 10M tokens"
  }
}
```

---

## Referrals

### Get Referral Code

**GET** `/api/referrals/code`

Get current user's referral code and URL.

**Auth:** Required

**Response:**

```json
{
  "code": "ALICE2024",
  "url": "https://burntop.dev?ref=ALICE2024"
}
```

---

### Track Referral Click

**POST** `/api/referrals/click`

Track referral link click (analytics only).

**Auth:** None

**Request Body:**

```json
{
  "referralCode": "ALICE2024"
}
```

**Response:**

```json
{
  "success": true
}
```

---

### Track Referral Signup

**POST** `/api/referrals/track`

Track referral relationship on signup.

**Auth:** Required (new user only)

**Request Body:**

```json
{
  "referralCode": "ALICE2024"
}
```

**Response:**

```json
{
  "success": true,
  "xpAwarded": {
    "level1": 25,
    "level2": 6.25,
    "level3": 2.5
  }
}
```

**XP Rewards:**

- **Level 1** (Direct referral): 25 XP
- **Level 2** (Referral's referral): 6.25 XP
- **Level 3** (Level 2's referral): 2.5 XP

Maximum depth: 3 levels

---

### Get Referral Stats

**GET** `/api/referrals/stats`

Get referral statistics.

**Auth:** Required

**Response:**

```json
{
  "totalReferrals": {
    "level1": 10,
    "level2": 5,
    "level3": 2
  },
  "totalXpEarned": 300,
  "referredUsers": [
    {
      "userId": "user_456",
      "username": "bob",
      "name": "Bob Jones",
      "image": "https://github.com/bob.png",
      "level": 8,
      "joinedAt": "2024-01-05T12:00:00Z",
      "referralLevel": 1
    }
  ],
  "clickStats": {
    "total": 50,
    "converted": 10,
    "conversionRate": 0.2
  }
}
```

---

## SEO

### Sitemap

**GET** `/sitemap.xml`

Generate sitemap for search engines.

**Auth:** None

**Response:** XML sitemap

**Content-Type:** `application/xml`

**Cache:** `public, max-age=3600` (1 hour)

**Includes:**

- Static pages (homepage, login, dashboard, leaderboard, etc.)
- Public user profiles
- Achievement pages

---

## Insights & Analytics

### Get Insights

**GET** `/api/insights`

Get personalized insights comparing user to community benchmarks.

**Auth:** Required

**Query Parameters:**

- `period` (string, optional) - Time period: `all` | `month` | `week` (default: `all`)

**Response:**

```json
{
  "percentiles": {
    "tokens": 0.75,
    "cacheEfficiency": 0.9,
    "streak": 0.6,
    "diversity": 0.85
  },
  "insights": [
    {
      "type": "comparison",
      "title": "Above Average Token Usage",
      "message": "You use 50% more tokens than the average user",
      "sentiment": "neutral"
    },
    {
      "type": "efficiency",
      "title": "Cache Efficiency Champion",
      "message": "Your cache efficiency is in the top 10%",
      "sentiment": "positive"
    },
    {
      "type": "productivity",
      "title": "Peak Productivity",
      "message": "You're most productive on Tuesdays at 2 PM",
      "sentiment": "neutral"
    }
  ],
  "recommendations": [
    {
      "title": "Improve Streak",
      "message": "You're 3 days away from your longest streak record",
      "action": "Keep syncing daily!"
    }
  ]
}
```

**Insight Types:**

- `comparison` - Compare to community average
- `efficiency` - Cache/cost efficiency insights
- `productivity` - Usage patterns and trends
- `achievement` - Achievement progress suggestions

**Sentiment:**

- `positive` - Good performance
- `neutral` - Informational
- `negative` - Area for improvement

---

## Best Practices

### Caching

All API responses include appropriate cache headers:

- **Dynamic user data:** Short cache (5-15 minutes) with `stale-while-revalidate`
- **Static content:** Long cache (1 hour+) with `stale-while-revalidate`
- **Real-time data:** No cache
- **Images (OG/badges):** 15 minutes to 1 hour

### Pagination

Use cursor-based pagination for large result sets:

- `cursor` - Last item's ID/rank from previous page
- `limit` - Results per page (respect max limits)
- `hasMore` - Boolean indicating more results available

### Error Handling

Always check HTTP status codes and handle errors:

- `401` - Redirect to login
- `403` - Show permission error
- `404` - Show not found page
- `429` - Retry with exponential backoff
- `5xx` - Show error message and retry

### Privacy

Respect user privacy settings:

- Public profiles: All data visible
- Private profiles: Only basic info (username, name, avatar) visible to non-followers

---

## Support

For API questions or issues:

- GitHub Issues: https://github.com/agusmdev/burntop/issues
- GitHub Discussions: https://github.com/agusmdev/burntop/discussions

---

**Last Updated:** 2024-01-05
**API Version:** 1.0.0
