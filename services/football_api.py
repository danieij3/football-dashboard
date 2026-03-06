"""
Football API Service Layer
Handles all communication with the football-data.org v4 API.
Centralises error handling, data cleaning, and response formatting.
"""

import os
import logging
import requests
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)

BASE_URL = "https://api.football-data.org/v4"
API_KEY = os.getenv("FOOTBALL_API_KEY")

# Tier-one competition IDs available on the free plan
COMPETITIONS = {
    "PL":  {"id": 2021, "name": "Premier League"},
    "BL1": {"id": 2002, "name": "Bundesliga"},
    "SA":  {"id": 2019, "name": "Serie A"},
    "PD":  {"id": 2014, "name": "La Liga"},
    "FL1": {"id": 2015, "name": "Ligue 1"},
    "CL":  {"id": 2001, "name": "Champions League"},
}


def _get(endpoint: str, params: dict = None) -> dict:
    """
    Internal helper: sends an authenticated GET request to the API.
    Raises a RuntimeError with a human-readable message on failure.
    """
    if not API_KEY:
        raise RuntimeError("FOOTBALL_API_KEY is not set in .env")
    url = f"{BASE_URL}{endpoint}"
    headers = {"X-Auth-Token": API_KEY}
    try:
        resp = requests.get(url, headers=headers, params=params, timeout=10)
        resp.raise_for_status()
        return resp.json()
    except requests.exceptions.HTTPError as e:
        logger.error("HTTP error %s for %s", resp.status_code, url)
        raise RuntimeError(f"API error {resp.status_code}: {resp.text}") from e
    except requests.exceptions.RequestException as e:
        logger.error("Request failed: %s", e)
        raise RuntimeError(f"Network error: {str(e)}") from e


# ---------------------------------------------------------------------------
# Competitions
# ---------------------------------------------------------------------------

def get_competitions() -> list:
    """Return the list of supported tier-one competitions."""
    return [{"code": code, "id": v["id"], "name": v["name"]}
            for code, v in COMPETITIONS.items()]


# ---------------------------------------------------------------------------
# Matches
# ---------------------------------------------------------------------------

def _clean_match(match: dict) -> dict:
    """Normalise a single match object from the API into a flat dict."""
    score = match.get("score", {})
    ft = score.get("fullTime", {})
    ht = score.get("halfTime", {})
    return {
        "id":        match["id"],
        "utcDate":   match["utcDate"],
        "status":    match["status"],
        "competition": match.get("competition", {}).get("name", ""),
        "homeTeam":  match["homeTeam"]["name"],
        "homeTeamId": match["homeTeam"]["id"],
        "awayTeam":  match["awayTeam"]["name"],
        "awayTeamId": match["awayTeam"]["id"],
        "homeGoals": ft.get("home"),
        "awayGoals": ft.get("away"),
        "htHomeGoals": ht.get("home"),
        "htAwayGoals": ht.get("away"),
        "winner":    score.get("winner"),
    }


def get_matches_by_competition(competition_id: int) -> list:
    """Fetch the latest matches for a competition (max 10)."""
    data = _get(f"/competitions/{competition_id}/matches",
                params={"limit": 10, "status": "FINISHED"})
    return [_clean_match(m) for m in data.get("matches", [])]


def get_matches_by_team(team_id: int) -> list:
    """Fetch the last 10 finished matches for a team."""
    data = _get(f"/teams/{team_id}/matches",
                params={"status": "FINISHED", "limit": 10})
    return [_clean_match(m) for m in data.get("matches", [])]


def get_match_detail(match_id: int) -> dict:
    """Fetch full detail for a single match (includes head-to-head)."""
    data = _get(f"/matches/{match_id}")
    match = data.get("match") or data  # v4 wraps in 'match' key
    return _clean_match(match)


# ---------------------------------------------------------------------------
# Standings / League Table
# ---------------------------------------------------------------------------

def get_standings(competition_id: int) -> list:
    """Fetch the TOTAL standings table for a competition."""
    data = _get(f"/competitions/{competition_id}/standings")
    for standing in data.get("standings", []):
        if standing.get("type") == "TOTAL":
            return [
                {
                    "position":    row["position"],
                    "team":        row["team"]["name"],
                    "teamId":      row["team"]["id"],
                    "crest":       row["team"].get("crest", ""),
                    "playedGames": row["playedGames"],
                    "won":         row["won"],
                    "draw":        row["draw"],
                    "lost":        row["lost"],
                    "goalsFor":    row["goalsFor"],
                    "goalsAgainst":row["goalsAgainst"],
                    "goalDifference": row["goalDifference"],
                    "points":      row["points"],
                }
                for row in standing["table"]
            ]
    return []


# ---------------------------------------------------------------------------
# Team Info
# ---------------------------------------------------------------------------

def get_team_info(team_id: int) -> dict:
    """Fetch profile information for a team."""
    data = _get(f"/teams/{team_id}")
    return {
        "id":       data["id"],
        "name":     data["name"],
        "shortName": data.get("shortName", data["name"]),
        "crest":    data.get("crest", ""),
        "venue":    data.get("venue", ""),
        "website":  data.get("website", ""),
        "founded":  data.get("founded"),
    }


def get_teams_in_competition(competition_id: int) -> list:
    """Fetch a list of all teams in a competition."""
    data = _get(f"/competitions/{competition_id}/teams")
    return [
        {"id": t["id"], "name": t["name"]}
        for t in data.get("teams", [])
    ]


# ---------------------------------------------------------------------------
# Form (last 5 results for a team)
# ---------------------------------------------------------------------------

def get_team_form(team_id: int) -> dict:
    """
    Returns last 5 finished matches and computed form stats for a team.
    Also provides goals scored / conceded per match for charts.
    """
    data = _get(f"/teams/{team_id}/matches",
                params={"status": "FINISHED", "limit": 5})
    raw = data.get("matches", [])
    matches = [_clean_match(m) for m in raw]

    form = []
    goals_scored = []
    goals_conceded = []
    labels = []

    for m in matches:
        is_home = m["homeTeamId"] == team_id
        scored = m["homeGoals"] if is_home else m["awayGoals"]
        conceded = m["awayGoals"] if is_home else m["homeGoals"]
        opponent = m["awayTeam"] if is_home else m["homeTeam"]

        if scored is None or conceded is None:
            result = "?"
        elif scored > conceded:
            result = "W"
        elif scored == conceded:
            result = "D"
        else:
            result = "L"

        form.append(result)
        goals_scored.append(scored)
        goals_conceded.append(conceded)
        labels.append(opponent[:12])

    return {
        "form":          form,
        "goalsScored":   goals_scored,
        "goalsConceded": goals_conceded,
        "labels":        labels,
        "matches":       matches,
    }


# ---------------------------------------------------------------------------
# Team Comparison
# ---------------------------------------------------------------------------

def get_comparison(team_a_id: int, team_b_id: int) -> dict:
    """
    Compare two teams using their last 5 matches.
    Returns aggregated stats for Chart.js radar/bar comparison.
    """
    def _stats(team_id):
        form = get_team_form(team_id)
        wins  = form["form"].count("W")
        draws = form["form"].count("D")
        losses = form["form"].count("L")
        scored    = sum(x for x in form["goalsScored"]   if x is not None)
        conceded  = sum(x for x in form["goalsConceded"] if x is not None)
        return {
            "wins": wins, "draws": draws, "losses": losses,
            "goalsScored": scored, "goalsConceded": conceded,
            "teamName": form["matches"][0]["homeTeam"] if form["matches"] else str(team_id),
        }

    a = _stats(team_a_id)
    b = _stats(team_b_id)
    return {"teamA": a, "teamB": b}
