# Yomibiyori Backend (よみびより)

Yomibiyori is a poetic social network where AI generates the **upper verse** (上の句, kami-no-ku, 5-7-5 syllables) and users compose the **lower verse** (下の句, shimo-no-ku, 7-7 syllables) to complete a tanka (短歌, 5-7-5-7-7). This repository contains the FastAPI backend, Redis integrations, and automated jobs that power the experience.

## Core Features
- **Theme Generation**: AI generates daily upper verses (5-7-5 syllables) for users to continue
- **User Submissions**: Users compose lower verses (7-7 syllables) to complete the tanka
- **Supabase Auth**: Integration with local profile sync and password reset
- **Daily Submission Window**: 06:00–22:00 JST, one lower verse per user per category
- **Real-time Ranking**: Backed by Redis (likes, impressions, Wilson score adjustments)
- **Nightly Snapshot**: Rankings persisted to PostgreSQL at 22:00
- **AI-Powered Themes**: XAI Grok / Claude Sonnet 4.5 / OpenAI GPT-4o-mini for theme generation
- **Mobile App**: React Native + Expo with vertical text support and Japanese-style UI
- **Analytics**: PostHog integration for behavior tracking and product analytics

For functional details see `REQUIREMENTS.md`, API contract `OPENAPI.yaml`, and database schema `SCHEMA.sql`.

## Project Structure
```
app/
  core/        # Settings, Redis factory, logging, analytics (PostHog)
  db/          # SQLAlchemy engine and session
  models/      # ORM models (User, Theme, Work, Like, Ranking)
  routes/      # FastAPI routers (auth, works, ranking, themes)
  schemas/     # Pydantic models for request/response
  services/    # Domain services (auth, works, ranking, theme generation, likes)
mobile/
  src/
    components/  # Reusable UI components (VerticalText, CategoryIcon, Toast)
    navigation/  # React Navigation setup
    screens/     # App screens (Login, Composition, Appreciation, Ranking, etc.)
    store/       # Zustand state management
    services/    # API client and auth services
docs/          # Architecture and operational notes
scripts/       # CLI scripts for scheduled jobs (themes, rankings, notifications)
tests/         # Pytest suite with fakeredis + SQLite (13 test files)
.github/       # CI and scheduled workflows (generate_themes, finalize_rankings, notifications)
Procfile       # Railway entrypoint
```

## Requirements

### Backend
- Python 3.11
- Redis 5+ (or Upstash)
- PostgreSQL 14+ (Supabase compatible)
- AI Provider API key (XAI Grok / Claude Sonnet 4.5 / OpenAI GPT-4o-mini)

### Mobile
- Node.js 20+
- Expo CLI
- iOS Simulator (macOS) or Android Emulator
- Expo Go app (for testing on physical devices)

## Setup

### Backend Setup
```bash
python -m venv venv
source venv/bin/activate  # Windows: .\venv\Scripts\activate
pip install -U pip
pip install -e .[dev]
cp env.example .env  # populate with Supabase, Redis, AI provider credentials
uvicorn app.main:app --reload
```
Docs available at `http://localhost:8000/docs`.

### Mobile Setup
```bash
cd mobile
npm install
# Set API endpoint in mobile/src/services/api.ts
npm start  # Start Expo development server
```
Then scan the QR code with Expo Go (iOS/Android) or press `i` for iOS simulator, `a` for Android emulator.

### Windows UTF-8 Configuration
To avoid character encoding issues on Windows, set the following environment variables:
```powershell
$env:PYTHONIOENCODING = "utf-8"
$env:PYTHONUTF8 = "1"
```
Or add to your PowerShell profile:
```powershell
[System.Environment]::SetEnvironmentVariable('PYTHONIOENCODING', 'utf-8', 'User')
[System.Environment]::SetEnvironmentVariable('PYTHONUTF8', '1', 'User')
```

## Tests
```bash
pytest
```
fakeredis is used for Redis-dependent flows; SQLite is used for tests.

## Deployment (Railway example)
1. Connect the GitHub repo to a new Railway service.
2. Configure variables: `DATABASE_URL`, `REDIS_URL`, `OPENAI_API_KEY`, `SUPABASE_PROJECT_REF`, `SUPABASE_SERVICE_ROLE_KEY`, `THEME_CATEGORIES`, etc.
3. Deploy – `Procfile` launches `uvicorn app.main:app --port $PORT`.
4. Add a custom domain (optional).
5. Ensure GitHub Actions secrets mirror production variables so scheduled jobs run successfully.

Detailed steps: `docs/deployment_railway.md`.

## Scheduled Jobs
- `generate_themes.yml` (cron `0 12 * * *` → 21:00 JST): runs `scripts/generate_themes.py` to generate themes for the next day
- `finalize_rankings.yml` (cron `0 13 * * *` → 22:00 JST): runs `scripts/finalize_rankings.py` to finalize today's rankings and save to PostgreSQL
- `send_theme_notifications.yml` (cron `0 21 * * *` → 06:00 JST): runs `scripts/send_theme_release_notifications.py` to send morning Expo Push notifications
- `send_ranking_notifications.yml` (cron `5 13 * * *` → 22:05 JST): runs `scripts/send_ranking_result_notifications.py` to alert users when rankings are ready

Both jobs can also be triggered manually via `workflow_dispatch`.

Required repository secrets:
- `DATABASE_URL`, `REDIS_URL`, `SUPABASE_PROJECT_REF`
- AI Provider: `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, or `XAI_API_KEY`
- `THEME_CATEGORIES` (e.g., `恋愛,季節,日常,ユーモア`)
- Optional: `EXPO_ACCESS_TOKEN` for push notifications

See `docs/actions_secrets_checklist.md` for full list.

## Mobile App Features
- **Screens**: Login, CategorySelection, ActionSelection, Composition, Appreciation, Ranking, MyPoems, PasswordReset
- **Vertical Text**: Traditional Japanese vertical writing support with `VerticalText` component
- **Custom Icons**: Japanese calligraphy-style SVG icons for categories
- **Toast Notifications**: User-friendly feedback system
- **Analytics**: PostHog integration for tracking user behavior and engagement
- **Navigation**: Bottom tab navigation with React Navigation
- **State Management**: Zustand for global state
- **Secure Storage**: Expo SecureStore for authentication tokens

## Reference Documents
- `CLAUDE.md` - Claude agent instructions (Japanese)
- `AGENTS.md` - Development agents and workflows
- `REQUIREMENTS.md` - Functional and non-functional requirements
- `OPENAPI.yaml` - API specification (OpenAPI 3.1)
- `SCHEMA.sql` - Database schema with RLS policies
- `docs/theme_generation_job.md` - Theme generation workflow
- `docs/ranking_finalization_job.md` - Ranking finalization workflow
- `docs/ci_cd_schedule.md` - CI/CD and scheduling documentation
- `docs/deployment_railway.md` - Railway deployment guide
- `docs/actions_secrets_checklist.md` - GitHub Actions secrets reference

## License
Not defined yet – add a license before publishing.
