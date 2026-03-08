"""
API Blueprint — all /api/* REST endpoints.
Core endpoints: matches, teams, league standings.
Each endpoint returns JSON and handles errors gracefully.
"""

import logging
from flask import Blueprint, jsonify, request
from services.football_api import (
    get_competitions,
    get_matches_by_competition,
    get_matches_by_team,
    get_match_detail,
    get_standings,
    get_team_info,
    get_teams_in_competition,
    get_team_form,
    get_comparison,
)

logger = logging.getLogger(__name__)
api = Blueprint("api", __name__, url_prefix="/api")


def _error(message: str, status: int = 500):
    logger.error(message)
    return jsonify({"error": message}), status


# ---------------------------------------------------------------------------
# Competitions
# ---------------------------------------------------------------------------

@api.route("/competitions")
def competitions():
    """Return the list of supported competitions."""
    return jsonify(get_competitions())


# ---------------------------------------------------------------------------
# Matches — GET /api/matches
# ---------------------------------------------------------------------------

@api.route("/matches")
def matches():
    """
    GET /api/matches?competition=<id>[&team=<id>]
    Returns up to 10 recent finished matches.
    """
    competition_id = request.args.get("competition", type=int)
    team_id = request.args.get("team", type=int)

    if not competition_id:
        return _error("competition parameter is required", 400)

    try:
        data = get_matches_by_competition(competition_id)
        if team_id:
            data = [
                m for m in data
                if m["homeTeamId"] == team_id or m["awayTeamId"] == team_id
            ]
        return jsonify(data)
    except RuntimeError as e:
        return _error(str(e))


# ---------------------------------------------------------------------------
# League standings — GET /api/standings/<competition_id>
# ---------------------------------------------------------------------------

@api.route("/standings/<int:competition_id>")
def standings(competition_id):
    """
    GET /api/standings/<competition_id>
    Returns the full TOTAL standings table.
    """
    try:
        return jsonify(get_standings(competition_id))
    except RuntimeError as e:
        return _error(str(e))


# ---------------------------------------------------------------------------
# Teams — GET /api/teams/<competition_id>, GET /api/team/<team_id>
# ---------------------------------------------------------------------------

@api.route("/teams/<int:competition_id>")
def teams(competition_id):
    """
    GET /api/teams/<competition_id>
    Returns a list of teams in the given competition.
    """
    try:
        return jsonify(get_teams_in_competition(competition_id))
    except RuntimeError as e:
        return _error(str(e))


@api.route("/team/<int:team_id>")
def team(team_id):
    """
    GET /api/team/<team_id>
    Returns profile info for a single team.
    """
    try:
        return jsonify(get_team_info(team_id))
    except RuntimeError as e:
        return _error(str(e))


# ---------------------------------------------------------------------------
# Team Form
# ---------------------------------------------------------------------------

@api.route("/form/<int:team_id>")
def form(team_id):
    """
    GET /api/form/<team_id>
    Returns the last 5 results and goal data for charts.
    """
    try:
        return jsonify(get_team_form(team_id))
    except RuntimeError as e:
        return _error(str(e))


# ---------------------------------------------------------------------------
# Team Comparison
# ---------------------------------------------------------------------------

@api.route("/comparison")
def comparison():
    """
    GET /api/comparison?team_a=<id>&team_b=<id>
    Returns aggregated stats for two teams side-by-side.
    """
    team_a = request.args.get("team_a", type=int)
    team_b = request.args.get("team_b", type=int)

    if not team_a or not team_b:
        return _error("team_a and team_b parameters are required", 400)

    try:
        return jsonify(get_comparison(team_a, team_b))
    except RuntimeError as e:
        return _error(str(e))


# ---------------------------------------------------------------------------
# Match Detail
# ---------------------------------------------------------------------------

@api.route("/match/<int:match_id>")
def match_detail(match_id):
    """
    GET /api/match/<match_id>
    Returns full detail for a single match.
    """
    try:
        return jsonify(get_match_detail(match_id))
    except RuntimeError as e:
        return _error(str(e))
