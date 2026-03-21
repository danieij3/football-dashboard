"""
Dashboard Blueprint — page routes that render HTML templates.
"""

from flask import Blueprint, render_template

dashboard = Blueprint("dashboard", __name__)


@dashboard.route("/")
def index():
    """Main dashboard page."""
    return render_template("index.html")


@dashboard.route("/match/<int:match_id>")
def match_page(match_id):
    """Match detail page with score timeline and match events. JS fetches from /api/match/<id>."""
    return render_template("match.html", match_id=match_id)
