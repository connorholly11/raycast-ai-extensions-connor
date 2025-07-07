# API Usage & Subscription Tracker - Implementation Plan

## Overview
A Raycast extension to track API usage, costs, and all your subscriptions in one place. Eliminates the need to log into multiple dashboards and helps prevent overage charges.

## Core Features

### 1. API Usage Tracking
**Commands:**
- `api usage` - Show all API usage/costs at a glance
- `api add [service] [api-key]` - Add new API service
- `api remove [service]` - Remove API service
- `api limits` - Show usage vs limits with warnings

**Supported APIs (Phase 1):**
- OpenAI (GPT-4, DALL-E, Whisper)
- Anthropic (Claude)
- Google (Gemini, Maps, Cloud)
- Polygon.io (Market Data)
- Supabase
- Vercel
- AWS (basic services)

### 2. Subscription Manager
**Commands:**
- `sub add [name] [cost] [billing-cycle]` - Add subscription
- `sub list` - List all subscriptions with renewal dates
- `sub remove [name]` - Remove subscription
- `sub total` - Show monthly/yearly totals

**Features:**
- Renewal reminders
- Cost breakdown by category
- Monthly/yearly view toggle
- Export to CSV

## Technical Architecture

### Data Storage
```typescript
// Use SQLite for local storage
interface APIService {
  id: string
  name: string
  apiKey: string (encrypted)
  endpoint: string
  usageEndpoint?: string
  costPerUnit: number
  unit: 'token' | 'request' | 'gb' | 'compute'
}

interface Subscription {
  id: string
  name: string
  cost: number
  billingCycle: 'monthly' | 'yearly' | 'weekly'
  nextRenewal: Date
  category: string
  notes?: string
}

interface UsageRecord {
  serviceId: string
  date: Date
  usage: number
  cost: number
}
```

### Implementation Steps

#### Phase 1: Core Structure (2-3 hours)
1. Set up Raycast extension boilerplate
2. Create SQLite database schema
3. Implement secure key storage (use Raycast password API)
4. Build basic CRUD commands for APIs and subscriptions

#### Phase 2: API Integrations (4-5 hours)
1. Create API adapter pattern:
   ```typescript
   interface APIAdapter {
     fetchUsage(): Promise<UsageData>
     fetchLimits(): Promise<LimitData>
     calculateCost(usage: UsageData): number
   }
   ```
2. Implement adapters for each service:
   - OpenAI: `/v1/usage` endpoint
   - Anthropic: Usage API
   - Polygon.io: Account endpoint
   - Others: Service-specific endpoints

#### Phase 3: Smart Features (2-3 hours)
1. Usage predictions based on trends
2. Cost alerts when approaching limits
3. Weekly/monthly summary notifications
4. Quick actions for most expensive services

#### Phase 4: UI Polish (1-2 hours)
1. Beautiful list view with icons
2. Color-coded warnings (green/yellow/red)
3. Charts for usage trends
4. Quick filters and search

## Example Usage Flow

```bash
# First time setup
> api add openai sk-abc123...
✓ Added OpenAI (fetching current usage...)

> api add anthropic ant-key-xyz...
✓ Added Anthropic

> sub add "GitHub Copilot" 10 monthly
✓ Added subscription (renews Jan 15)

# Daily usage
> api usage
┌─────────────┬────────────┬───────────┬─────────┐
│ Service     │ Usage      │ Cost      │ Status  │
├─────────────┼────────────┼───────────┼─────────┤
│ OpenAI      │ 1.2M/5M    │ $24/$100  │ ✅      │
│ Anthropic   │ 450K/1M    │ $9/$20    │ ⚠️ 45%  │
│ Polygon.io  │ 10K/50K    │ $0/$15    │ ✅      │
└─────────────┴────────────┴───────────┴─────────┘
Total this month: $33/$135 (24%)

> sub total
Monthly subscriptions: $187
- GitHub Copilot: $10 (renews in 3 days)
- Vercel Pro: $20
- ChatGPT Plus: $20
...
```

## Advanced Features (Future)

### Cost Optimization Assistant
- Suggest cheaper alternatives
- Identify unused subscriptions
- Recommend usage patterns to save money

### Team Features
- Share usage across team
- Department budgets
- Approval workflows

### Integrations
- Export to QuickBooks
- Sync with Notion database
- Weekly email reports

## Development Tips

1. **Start Simple**: Get basic tracking working first
2. **Use Raycast's Built-ins**: 
   - Password manager for API keys
   - Preferences API for settings
   - Local storage for data
3. **Error Handling**: APIs fail - handle gracefully
4. **Rate Limiting**: Don't hammer APIs, cache results
5. **Security**: Never log API keys, encrypt at rest

## Estimated Time: 10-12 hours total
- Phase 1: 2-3 hours ✅ (High impact, low effort)
- Phase 2: 4-5 hours (Most value here)
- Phase 3: 2-3 hours (Nice to have)
- Phase 4: 1-2 hours (Polish)

Start with Phase 1 and you'll have immediate value. Can iterate from there.