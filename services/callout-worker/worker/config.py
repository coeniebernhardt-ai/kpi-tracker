import os
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.environ.get("DATABASE_URL") or os.environ.get("SUPABASE_DB_URL")
WORKER_ID = os.environ.get("WORKER_ID", "callout-worker-1")
POLL_INTERVAL_SEC = float(os.environ.get("POLL_INTERVAL_SEC", "3"))
OPENAI_API_KEY = os.environ.get("OPENAI_API_KEY", "")
ENABLE_AI = os.environ.get("ENABLE_CALLOUT_AI", "true").lower() == "true"
SUPABASE_URL = os.environ.get("SUPABASE_URL") or os.environ.get("NEXT_PUBLIC_SUPABASE_URL", "")
SUPABASE_SERVICE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")
STORAGE_BUCKET = "callout-documents"
EXTRACTOR_VERSION = "1.0.0"
