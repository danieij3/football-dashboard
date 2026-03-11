/**
 * main.js
 * Dashboard logic — orchestrates data fetching, table rendering, and charts.
 */

// -------------------------------------------------------------------
// Helpers
// -------------------------------------------------------------------

function showLoading(visible) {
    document.getElementById("loading").style.display = visible ? "block" : "none";
}

function showError(msg) {
    const el = document.getElementById("error-banner");
    el.textContent = msg;
    el.style.display = "block";
    setTimeout(() => (el.style.display = "none"), 6000);
}

async function apiFetch(url) {
    const res = await fetch(url);
    const data = await res.json();
    if (data.error) throw new Error(data.error);
    return data;
}

function formatDate(utcString) {
    if (!utcString) return "–";
    const d = new Date(utcString);
    return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

function resultBadge(homeGoals, awayGoals, teamId, homeTeamId) {
    if (homeGoals === null || awayGoals === null) return '<span class="badge badge-grey">?</span>';
    const isHome = homeTeamId === teamId;
    const scored   = isHome ? homeGoals : awayGoals;
    const conceded = isHome ? awayGoals : homeGoals;
    if (scored > conceded) return '<span class="badge badge-green">W</span>';
    if (scored === conceded) return '<span class="badge badge-orange">D</span>';
    return '<span class="badge badge-red">L</span>';
}

// -------------------------------------------------------------------
// Competition and team filters — initial dashboard layout
// -------------------------------------------------------------------

async function populateCompetitions() {
    const select = document.getElementById("comp-select");
    const competitions = await apiFetch("/api/competitions");
    select.innerHTML = competitions
        .map(c => `<option value="${c.id}">${c.name}</option>`)
        .join("");
}

async function populateTeams(competitionId) {
    const teams = await apiFetch(`/api/teams/${competitionId}`);
    const teamSelect = document.getElementById("team-select");
    teamSelect.innerHTML = '<option value="">All teams</option>' +
        teams.map(t => `<option value="${t.id}">${t.name}</option>`).join("");

    // Also fill comparison dropdowns
    const compA = document.getElementById("comp-team-a");
    const compB = document.getElementById("comp-team-b");
    const opts = teams.map(t => `<option value="${t.id}">${t.name}</option>`).join("");
    compA.innerHTML = opts;
    compB.innerHTML = opts;
    // Default to second team for Team B
    if (compB.options.length > 1) compB.selectedIndex = 1;

    return teams;
}

// -------------------------------------------------------------------
// Render matches table
// -------------------------------------------------------------------

function renderMatchesTable(matches, selectedTeamId) {
    const tbody = document.getElementById("matches-tbody");
    if (!matches.length) {
        tbody.innerHTML = '<tr><td colspan="6" class="empty">No finished matches found.</td></tr>';
        return;
    }
    tbody.innerHTML = matches.map(m => {
        const ht = (m.htHomeGoals !== null ? m.htHomeGoals : "?") + " : " +
                   (m.htAwayGoals !== null ? m.htAwayGoals : "?");
        const ft = (m.homeGoals !== null ? m.homeGoals : "?") + " : " +
                   (m.awayGoals !== null ? m.awayGoals : "?");
        const badge = selectedTeamId
            ? resultBadge(m.homeGoals, m.awayGoals, parseInt(selectedTeamId), m.homeTeamId)
            : "";
        return `
        <tr class="match-row" onclick="window.location='/match/${m.id}'" title="Click for match details">
            <td>${formatDate(m.utcDate)}</td>
            <td class="${m.homeTeamId === parseInt(selectedTeamId) ? 'highlight-team' : ''}">${m.homeTeam}</td>
            <td class="center score">${ht}</td>
            <td class="center score bold">${ft} ${badge}</td>
            <td class="${m.awayTeamId === parseInt(selectedTeamId) ? 'highlight-team' : ''}">${m.awayTeam}</td>
            <td><span class="status-pill">${m.status}</span></td>
        </tr>`;
    }).join("");
}

// -------------------------------------------------------------------
// Render league table
// -------------------------------------------------------------------

function renderLeagueTable(standings, selectedTeamId) {
    const tbody = document.getElementById("league-tbody");
    if (!standings.length) {
        tbody.innerHTML = '<tr><td colspan="10" class="empty">No standings available.</td></tr>';
        return;
    }
    tbody.innerHTML = standings.map(row => {
        const isSelected = row.teamId === parseInt(selectedTeamId);
        return `
        <tr class="${isSelected ? 'highlight-row' : ''}">
            <td class="center">${row.position}</td>
            <td class="team-name">${row.team}</td>
            <td class="center">${row.playedGames}</td>
            <td class="center">${row.won}</td>
            <td class="center">${row.draw}</td>
            <td class="center">${row.lost}</td>
            <td class="center">${row.goalsFor}</td>
            <td class="center">${row.goalsAgainst}</td>
            <td class="center">${row.goalDifference}</td>
            <td class="center bold">${row.points}</td>
        </tr>`;
    }).join("");
}

// -------------------------------------------------------------------
// Update summary stat cards (only when a specific team is selected)
// -------------------------------------------------------------------

function renderStatCards(formData, teamStanding) {
    const row = document.getElementById("stats-row");
    row.style.display = "flex";
    document.getElementById("s-played").textContent = teamStanding ? teamStanding.playedGames : formData.matches.length;
    document.getElementById("s-wins").textContent   = teamStanding ? teamStanding.won : formData.form.filter(r => r === "W").length;
    document.getElementById("s-goals").textContent  = teamStanding ? teamStanding.goalsFor : formData.goalsScored.reduce((a, b) => a + (b || 0), 0);
    document.getElementById("s-points").textContent = teamStanding ? teamStanding.points : "–";
}

// -------------------------------------------------------------------
// Main load function — triggered by "Load Data" button
// -------------------------------------------------------------------

async function loadDashboard() {
    const compId = parseInt(document.getElementById("comp-select").value);
    const teamId = document.getElementById("team-select").value;

    showLoading(true);
    document.getElementById("stats-row").style.display = "none";

    try {
        // Fetch matches and standings in parallel
        const [matchesRaw, standings] = await Promise.all([
            apiFetch(`/api/matches?competition=${compId}`),
            apiFetch(`/api/standings/${compId}`),
        ]);

        // Filter matches to selected team if provided
        const matches = teamId
            ? matchesRaw.filter(m => m.homeTeamId === parseInt(teamId) || m.awayTeamId === parseInt(teamId))
            : matchesRaw;

        renderMatchesTable(matches, teamId);
        renderLeagueTable(standings, teamId);
        drawPointsChart("pointsChart", standings, 5);

        // Form + Goals charts only meaningful for a specific team
        if (teamId) {
            const form = await apiFetch(`/api/form/${teamId}`);
            drawFormChart("formChart", form.labels, form.goalsScored, form.goalsConceded);
            const totalScored   = form.goalsScored.reduce((a, b) => a + (b || 0), 0);
            const totalConceded = form.goalsConceded.reduce((a, b) => a + (b || 0), 0);
            const teamName = form.matches.length ? form.matches[0].homeTeam : "Team";
            drawGoalsChart("goalsChart", totalScored, totalConceded, teamName);
            const teamStanding = standings.find(s => s.teamId === parseInt(teamId)) || null;
            renderStatCards(form, teamStanding);
        } else {
            // Show top team from standings as default for form/goals charts
            if (standings.length) {
                const topTeamId = standings[0].teamId;
                const form = await apiFetch(`/api/form/${topTeamId}`);
                drawFormChart("formChart", form.labels, form.goalsScored, form.goalsConceded);
                const ts = form.goalsScored.reduce((a, b) => a + (b || 0), 0);
                const tc = form.goalsConceded.reduce((a, b) => a + (b || 0), 0);
                drawGoalsChart("goalsChart", ts, tc, standings[0].team);
            }
        }

    } catch (err) {
        showError("Failed to load data: " + err.message);
    } finally {
        showLoading(false);
    }
}

// -------------------------------------------------------------------
// Team comparison
// -------------------------------------------------------------------

async function loadComparison() {
    const teamA = document.getElementById("comp-team-a").value;
    const teamB = document.getElementById("comp-team-b").value;
    if (!teamA || !teamB || teamA === teamB) {
        showError("Please select two different teams to compare.");
        return;
    }
    showLoading(true);
    try {
        const data = await apiFetch(`/api/comparison?team_a=${teamA}&team_b=${teamB}`);
        drawComparisonChart("comparisonChart", data.teamA, data.teamB);
    } catch (err) {
        showError("Comparison failed: " + err.message);
    } finally {
        showLoading(false);
    }
}

// -------------------------------------------------------------------
// Initialisation
// -------------------------------------------------------------------

document.addEventListener("DOMContentLoaded", async () => {
    try {
        await populateCompetitions();
        const compId = document.getElementById("comp-select").value;
        await populateTeams(compId);
    } catch (err) {
        showError("Could not load competitions: " + err.message);
    }

    // Reload teams whenever competition changes
    document.getElementById("comp-select").addEventListener("change", async (e) => {
        await populateTeams(e.target.value);
    });

    document.getElementById("load-btn").addEventListener("click", loadDashboard);
    document.getElementById("compare-btn").addEventListener("click", loadComparison);
});
