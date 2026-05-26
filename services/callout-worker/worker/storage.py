from .config import STORAGE_BUCKET, SUPABASE_SERVICE_KEY, SUPABASE_URL


def download_pdf(storage_path: str) -> bytes:
    if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
        raise RuntimeError("Supabase credentials required for storage download")
    from supabase import create_client
    client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)
    data = client.storage.from_(STORAGE_BUCKET).download(storage_path)
    if isinstance(data, bytes):
        return data
    if hasattr(data, "read"):
        return data.read()
    raise RuntimeError("Failed to download PDF from storage")
