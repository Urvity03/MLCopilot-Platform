from celery import Celery
from mlcopilot.core.config import get_settings

settings = get_settings()

celery_app = Celery(
    "mlcopilot",
    broker=settings.redis_url,
    backend=settings.redis_url,
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    # Reliability rules (docs/architecture/12-background-jobs.md)
    task_acks_late=True,
    task_reject_on_worker_lost=True,
)
