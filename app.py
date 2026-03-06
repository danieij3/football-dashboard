"""
Football Match Insights Dashboard
Entry point — creates the Flask application and registers blueprints.
Modular architecture: routes/ (API + dashboard pages), services/ (football API).
Run with: python app.py
"""

import logging
from flask import Flask
from routes.dashboard import dashboard
from routes.api import api

# Configure application-wide logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)

app = Flask(__name__)

# Register blueprints
app.register_blueprint(dashboard)
app.register_blueprint(api)

if __name__ == "__main__":
    app.run(debug=True)
