"""
Football Match Insights Dashboard
Entry point — creates the Flask application and registers blueprints.
Modular architecture: routes/ (API + dashboard pages), services/ (football API).
Run with: python app.py
"""

import logging
import time
from flask import Flask, g, request
from routes.dashboard import dashboard
from routes.api import api

# Configure application-wide logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)

app = Flask(__name__)

# Register blueprints
app.register_blueprint(dashboard)
app.register_blueprint(api)


@app.before_request
def _api_request_timer_start():
    """Record start time for /api/* requests (performance observation)."""
    if request.path.startswith("/api"):
        g._api_t0 = time.perf_counter()


@app.after_request
def _api_request_timer_header(response):
    """Add X-Response-Time-Ms header for API routes (server-side timing)."""
    if request.path.startswith("/api"):
        t0 = getattr(g, "_api_t0", None)
        if t0 is not None:
            elapsed = time.perf_counter() - t0
            ms = int(elapsed * 1000)
            response.headers["X-Response-Time-Ms"] = str(ms)
            logger.debug("API %s %s completed in %.3fs", request.method, request.path, elapsed)
    return response

if __name__ == "__main__":
    app.run(debug=True)
