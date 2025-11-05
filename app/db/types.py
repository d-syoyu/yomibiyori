"""Custom SQLAlchemy column types with cross-dialect compatibility."""

from __future__ import annotations

from sqlalchemy import JSON
from sqlalchemy.ext.compiler import compiles


class JSONBType(JSON):
    """JSON column that renders as JSONB on PostgreSQL and JSON elsewhere."""

    pass


@compiles(JSONBType, "postgresql")
def _compile_jsonb_postgresql(type_: JSONBType, compiler, **kw):  # type: ignore[override]
    return "JSONB"

