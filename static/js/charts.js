/**
 * charts.js
 * Reusable Chart.js factory functions.
 * Each function destroys any existing chart on the canvas before drawing a new one.
 */

// Colour palette
const PALETTE = {
    blue:       "rgba(0, 102, 204, 0.85)",
    blueLight:  "rgba(0, 102, 204, 0.25)",
    red:        "rgba(204, 0, 51, 0.85)",
    redLight:   "rgba(204, 0, 51, 0.25)",
    green:      "rgba(0, 153, 76, 0.85)",
    orange:     "rgba(255, 140, 0, 0.85)",
    grey:       "rgba(150, 150, 150, 0.65)",
    multiLine: [
        "#0066cc", "#cc0033", "#009900", "#ff8c00",
        "#7b2fbe", "#00b4d8", "#e63946", "#2dc653",
    ],
};

// Destroy a chart instance stored on a canvas element
function destroyChart(canvasId) {
    const canvas = document.getElementById(canvasId);
    if (canvas && canvas._chartInstance) {
        canvas._chartInstance.destroy();
        canvas._chartInstance = null;
    }
}

// Save chart instance to canvas element for later cleanup
function saveChart(canvasId, chart) {
    const canvas = document.getElementById(canvasId);
    if (canvas) canvas._chartInstance = chart;
    return chart;
}

/**
 * drawFormChart — bar chart showing goals scored (green) and conceded (red)
 * for the last 5 matches of a team.
 * Used by the dashboard to visualise recent performance at a glance.
 * @param {string} canvasId
 * @param {string[]} labels   — opponent names
 * @param {number[]} scored
 * @param {number[]} conceded
 */
function drawFormChart(canvasId, labels, scored, conceded) {
    destroyChart(canvasId);
    const ctx = document.getElementById(canvasId);
    if (!ctx) return;
    return saveChart(canvasId, new Chart(ctx, {
        type: "bar",
        data: {
            labels,
            datasets: [
                {
                    label: "Goals Scored",
                    data: scored,
                    backgroundColor: PALETTE.green,
                },
                {
                    label: "Goals Conceded",
                    data: conceded,
                    backgroundColor: PALETTE.red,
                },
            ],
        },
        options: {
            responsive: true,
            plugins: { legend: { position: "top" } },
            scales: {
                x: { title: { display: true, text: "Opponent" } },
                y: { title: { display: true, text: "Goals" }, beginAtZero: true, ticks: { stepSize: 1 } },
            },
        },
    }));
}

/**
 * drawGoalsChart — horizontal bar comparing goals scored vs conceded for the
 * selected team's last 5 matches combined.
 * This is a quick summary metric used in the dashboard overview.
 * @param {string} canvasId
 * @param {number} scored
 * @param {number} conceded
 * @param {string} teamName
 */
function drawGoalsChart(canvasId, scored, conceded, teamName) {
    destroyChart(canvasId);
    const ctx = document.getElementById(canvasId);
    if (!ctx) return;
    return saveChart(canvasId, new Chart(ctx, {
        type: "bar",
        data: {
            labels: [teamName || "Team"],
            datasets: [
                {
                    label: "Goals Scored",
                    data: [scored],
                    backgroundColor: PALETTE.green,
                },
                {
                    label: "Goals Conceded",
                    data: [conceded],
                    backgroundColor: PALETTE.red,
                },
            ],
        },
        options: {
            indexAxis: "y",
            responsive: true,
            plugins: { legend: { position: "top" } },
            scales: {
                x: { beginAtZero: true, ticks: { stepSize: 1 } },
            },
        },
    }));
}

/**
 * drawPointsChart — multi-line chart showing cumulative points over game-weeks
 * for the top N teams from the standings table.
 * @param {string} canvasId
 * @param {object[]} standings — full standings table rows
 * @param {number} topN
 */
function drawPointsChart(canvasId, standings, topN = 5) {
    destroyChart(canvasId);
    const ctx = document.getElementById(canvasId);
    if (!ctx) return;

    const top = standings.slice(0, topN);

    // Approximate: distribute points evenly across games played
    const maxGames = Math.max(...top.map(t => t.playedGames));
    const labels = Array.from({ length: maxGames }, (_, i) => `GW ${i + 1}`);

    const datasets = top.map((team, idx) => {
        const ptsPerGame = team.playedGames > 0 ? team.points / team.playedGames : 0;
        const data = Array.from({ length: maxGames }, (_, i) =>
            i < team.playedGames ? Math.round(ptsPerGame * (i + 1)) : null
        );
        return {
            label: team.team,
            data,
            borderColor: PALETTE.multiLine[idx % PALETTE.multiLine.length],
            backgroundColor: "transparent",
            borderWidth: 2,
            pointRadius: 2,
            tension: 0.3,
            spanGaps: false,
        };
    });

    return saveChart(canvasId, new Chart(ctx, {
        type: "line",
        data: { labels, datasets },
        options: {
            responsive: true,
            plugins: { legend: { position: "top" } },
            scales: {
                x: { title: { display: true, text: "Gameweek" } },
                y: { title: { display: true, text: "Points" }, beginAtZero: true },
            },
        },
    }));
}

/**
 * drawComparisonChart — grouped bar chart comparing two teams across
 * wins, draws, losses, goals scored, goals conceded.
 * @param {string} canvasId
 * @param {object} teamA  — { teamName, wins, draws, losses, goalsScored, goalsConceded }
 * @param {object} teamB
 */
function drawComparisonChart(canvasId, teamA, teamB) {
    destroyChart(canvasId);
    const ctx = document.getElementById(canvasId);
    if (!ctx) return;

    const labels = ["Wins", "Draws", "Losses", "Goals Scored", "Goals Conceded"];
    const aData = [teamA.wins, teamA.draws, teamA.losses, teamA.goalsScored, teamA.goalsConceded];
    const bData = [teamB.wins, teamB.draws, teamB.losses, teamB.goalsScored, teamB.goalsConceded];

    return saveChart(canvasId, new Chart(ctx, {
        type: "bar",
        data: {
            labels,
            datasets: [
                { label: teamA.teamName, data: aData, backgroundColor: PALETTE.blue },
                { label: teamB.teamName, data: bData, backgroundColor: PALETTE.red },
            ],
        },
        options: {
            responsive: true,
            plugins: { legend: { position: "top" } },
            scales: {
                y: { beginAtZero: true, ticks: { stepSize: 1 } },
            },
        },
    }));
}

/**
 * drawTimelineChart — step-line chart showing the cumulative score per team
 * across the match timeline (constructed from goal events).
 * @param {string} canvasId
 * @param {string} homeTeam
 * @param {string} awayTeam
 * @param {object[]} events    — array of { minute, type, team }
 * @param {number}   finalHome
 * @param {number}   finalAway
 */
function drawTimelineChart(canvasId, homeTeam, awayTeam, events, finalHome, finalAway) {
    destroyChart(canvasId);
    const ctx = document.getElementById(canvasId);
    if (!ctx) return;

    // Build cumulative goal arrays across minutes 0–90
    const minutes = [0, 15, 30, 45, 60, 75, 90];
    let homeGoals = 0, awayGoals = 0;
    const homeData = [], awayData = [];

    for (const minute of minutes) {
        const goalsAtMinute = events.filter(
            e => e.type === "GOAL" && e.minute <= minute
        );
        homeGoals = goalsAtMinute.filter(e => e.team === homeTeam).length;
        awayGoals = goalsAtMinute.filter(e => e.team === awayTeam).length;
        homeData.push(homeGoals);
        awayData.push(awayGoals);
    }

    // If no events available, use final scores as flat line
    if (events.length === 0) {
        const hData = minutes.map(() => finalHome ?? 0);
        const aData = minutes.map(() => finalAway ?? 0);
        homeData.splice(0, homeData.length, ...hData);
        awayData.splice(0, awayData.length, ...aData);
    }

    return saveChart(canvasId, new Chart(ctx, {
        type: "line",
        data: {
            labels: minutes.map(m => `${m}'`),
            datasets: [
                {
                    label: homeTeam,
                    data: homeData,
                    borderColor: PALETTE.blue,
                    backgroundColor: PALETTE.blueLight,
                    stepped: true,
                    fill: true,
                    tension: 0,
                    pointRadius: 4,
                },
                {
                    label: awayTeam,
                    data: awayData,
                    borderColor: PALETTE.red,
                    backgroundColor: PALETTE.redLight,
                    stepped: true,
                    fill: true,
                    tension: 0,
                    pointRadius: 4,
                },
            ],
        },
        options: {
            responsive: true,
            plugins: { legend: { position: "top" } },
            scales: {
                x: { title: { display: true, text: "Match Minute" } },
                y: { title: { display: true, text: "Goals" }, beginAtZero: true, ticks: { stepSize: 1 } },
            },
        },
    }));
}
