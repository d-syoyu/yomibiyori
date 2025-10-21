# Yomibiyori Backend

Yomibiyori is a poetic social network where AI suggests the upper verse and users compose the lower verse. This repository contains the FastAPI backend, Redis integrations, and automated jobs that power the experience.

## Core Features
- Supabase Auth integration with local profile sync
- Daily theme submission window (06:00–22:00 JST) with one post per user and category
- Real-time ranking backed by Redis (likes, impressions, Wilson score adjustments)
- Nightly ranking snapshot persisted to PostgreSQL at 22:00
- OpenAI-based daily theme generation

For functional details see `REQUIREMENTS.md`, API contract `OPENAPI.yaml`, and database schema `SCHEMA.sql`.

## Project Structure
```
app/
  core/        # Settings, Redis factory
  db/          # SQLAlchemy engine and session
  models/      # ORM models
  routes/      # FastAPI routers (auth, works, ranking)
  schemas/     # Pydantic models
  services/    # Domain services (auth, works, ranking, theme generation)
docs/          # Architecture and operational notes
scripts/       # CLI scripts for scheduled jobs
tests/         # Pytest suite with fakeredis + SQLite
.github/       # CI and scheduled workflows
Procfile       # Railway entrypoint
```

## Requirements
- Python 3.11
- Redis 5+ (or Upstash)
- PostgreSQL 14+ (Supabase compatible)
- OpenAI API key (`gpt-4o-mini` or similar)
- Node.js 20 (for future React Native work)

## Setup
```bash
python -m venv venv
source venv/bin/activate  # Windows: .\venv\Scripts\activate
pip install -U pip
pip install -e .[dev]
cp env.example .env  # populate with Supabase, Redis, OpenAI credentials
uvicorn app.main:app --reload
```
Docs available at `http://localhost:8000/docs`.

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
- `generate_themes.yml` (cron `0 12 * * *` → 21:00 JST): runs `scripts/generate_themes.py`
- `finalize_rankings.yml` (cron `0 13 * * *` → 22:00 JST): runs `scripts/finalize_rankings.py`

Required repository secrets: see `docs/actions_secrets_checklist.md`.

## Reference Documents
- `AGENTS.md`
- `REQUIREMENTS.md`
- `OPENAPI.yaml`
- `SCHEMA.sql`
- `docs/theme_generation_job.md`
- `docs/ranking_finalization_job.md`
- `docs/ci_cd_schedule.md`
- `docs/deployment_railway.md`
- `docs/actions_secrets_checklist.md`

## License
Not defined yet – add a license before publishing.
