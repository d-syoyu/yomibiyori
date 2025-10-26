# Yomibiyori Backend (よみびより)

Yomibiyori is a poetic social network where AI generates the **upper verse** (上の句, kami-no-ku, 5-7-5 syllables) and users compose the **lower verse** (下の句, shimo-no-ku, 7-7 syllables) to complete a tanka (短歌, 5-7-5-7-7). This repository contains the FastAPI backend, Redis integrations, and automated jobs that power the experience.

## Core Features
- **Theme Generation**: AI generates daily upper verses (5-7-5 syllables) for users to continue
- **User Submissions**: Users compose lower verses (7-7 syllables) to complete the tanka
- **Supabase Auth**: Integration with local profile sync
- **Daily Submission Window**: 06:00–22:00 JST, one lower verse per user per category
- **Real-time Ranking**: Backed by Redis (likes, impressions, Wilson score adjustments)
- **Nightly Snapshot**: Rankings persisted to PostgreSQL at 22:00
- **AI-Powered Themes**: Claude Sonnet 4.5 / OpenAI GPT-4o-mini for theme generation

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
