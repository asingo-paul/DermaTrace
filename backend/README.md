# DermaTrace Backend

FastAPI backend for the DermaTrace skincare reaction tracking application.

## Stack

- **Framework**: FastAPI
- **Database**: PostgreSQL via Supabase + SQLAlchemy (async)
- **Migrations**: Alembic
- **Auth**: JWT (HS256) + bcrypt
- **Payments**: Stripe + PayPal
- **AI**: Pandas + Scikit-learn

## Setup

```bash
python -m venv .venv
source .venv/bin/activate
pip install -e ".[dev]"
cp .env.example .env
# Fill in .env values
```

## Running

```bash
uvicorn app.main:app --reload
```

## Testing

```bash
pytest
```
