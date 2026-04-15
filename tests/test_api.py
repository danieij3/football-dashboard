"""
API endpoint tests using Flask's test client.
External football-data.org calls are mocked where needed so tests run offline.
"""

import pytest


def test_home_returns_200(client):
    response = client.get("/")
    assert response.status_code == 200


def test_match_detail_page_returns_200(client):
    response = client.get("/match/1")
    assert response.status_code == 200


def test_api_competitions_returns_json_list(client):
    response = client.get("/api/competitions")
    assert response.status_code == 200
    data = response.get_json()
    assert isinstance(data, list)
    assert len(data) >= 1
    assert "id" in data[0] and "name" in data[0]


def test_api_matches_without_competition_returns_400(client):
    response = client.get("/api/matches")
    assert response.status_code == 400
    body = response.get_json()
    assert "error" in body


def test_api_matches_with_mocked_service(client, monkeypatch):
    """Avoid real HTTP: stub get_matches_by_competition."""

    def fake_matches(competition_id):
        assert competition_id == 2021
        return [
            {
                "id": 999001,
                "utcDate": "2025-01-01T15:00:00Z",
                "status": "FINISHED",
                "competition": "Test League",
                "homeTeam": "Team A",
                "homeTeamId": 1,
                "awayTeam": "Team B",
                "awayTeamId": 2,
                "homeGoals": 2,
                "awayGoals": 1,
                "htHomeGoals": 1,
                "htAwayGoals": 0,
                "winner": "HOME_TEAM",
            }
        ]

    monkeypatch.setattr("routes.api.get_matches_by_competition", fake_matches)
    response = client.get("/api/matches?competition=2021")
    assert response.status_code == 200
    data = response.get_json()
    assert len(data) == 1
    assert data[0]["homeTeam"] == "Team A"
    assert data[0]["awayGoals"] == 1


def test_api_comparison_missing_params_returns_400(client):
    response = client.get("/api/comparison")
    assert response.status_code == 400
    assert "error" in response.get_json()


def test_api_comparison_with_mock(client, monkeypatch):
    def fake_comparison(a, b):
        return {
            "teamA": {
                "wins": 2,
                "draws": 1,
                "losses": 2,
                "goalsScored": 5,
                "goalsConceded": 4,
                "teamName": "Alpha",
            },
            "teamB": {
                "wins": 3,
                "draws": 0,
                "losses": 2,
                "goalsScored": 6,
                "goalsConceded": 5,
                "teamName": "Beta",
            },
        }

    monkeypatch.setattr("routes.api.get_comparison", fake_comparison)
    response = client.get("/api/comparison?team_a=10&team_b=20")
    assert response.status_code == 200
    data = response.get_json()
    assert data["teamA"]["teamName"] == "Alpha"
    assert data["teamB"]["wins"] == 3


def test_api_includes_response_time_header(client):
    """Server adds X-Response-Time-Ms for /api/* routes."""
    response = client.get("/api/competitions")
    assert response.status_code == 200
    assert "X-Response-Time-Ms" in response.headers
    ms = int(response.headers["X-Response-Time-Ms"])
    assert ms >= 0
