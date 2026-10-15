"""Reject missing credentials and mismatched Supabase projects without logging secrets."""
import os
from urllib.parse import parse_qs, unquote, urlparse

projects = {
    "development": "hdsevwlvtlpxjikynkof",
    "production": "chdnlpkoqoadqnmdpqrx",
}
expected = projects.get(os.environ.get("TARGET_ENVIRONMENT"))
connection = os.environ.get("SUPABASE_DB_URL", "")
if not connection:
    raise SystemExit("Add the SUPABASE_DB_URL secret to this GitHub environment first.")
try:
    url = urlparse(connection)
    direct = url.hostname == f"db.{expected}.supabase.co" and url.username == "postgres"
    pooler = (url.hostname or "").endswith(".pooler.supabase.com") and unquote(url.username or "") == f"postgres.{expected}"
    valid = expected and url.scheme in ("postgres", "postgresql") and url.password and url.path == "/postgres" and url.port == 5432 and (direct or pooler)
    query = parse_qs(url.query)
    valid = valid and set(query).issubset({"sslmode"})
    sslmode = query.get("sslmode", ["require"])
    valid = valid and all(mode in ("require", "verify-ca", "verify-full") for mode in sslmode)
except ValueError:
    valid = False
if not valid:
    raise SystemExit("Use this environment's Supabase direct or session-pooler Postgres URL on port 5432 with TLS; percent-encode the password.")
print("Database target matches the selected environment.")
