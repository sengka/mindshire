// utils/gamification.js

const LEAGUE_THRESHOLDS = {
    Bronze: 0,
    Silver: 1000,
    Gold: 3000,
    Diamond: 8000,
    Legend: 20000
};

/**
 * Calculate the user's league based on their total XP.
 */
function calculateLeague(xp) {
    if (xp >= LEAGUE_THRESHOLDS.Legend) return 'Legend';
    if (xp >= LEAGUE_THRESHOLDS.Diamond) return 'Diamond';
    if (xp >= LEAGUE_THRESHOLDS.Gold) return 'Gold';
    if (xp >= LEAGUE_THRESHOLDS.Silver) return 'Silver';
    return 'Bronze';
}

/**
 * Calculate the user's level.
 * Every 100 XP is 1 level.
 */
function calculateLevel(xp) {
    return Math.floor(xp / 100) + 1;
}

/**
 * Check and award badges based on a completed session.
 * @param {Object} user - The user mongoose document
 * @param {Number} actualSeconds - Length of the session in seconds
 * @param {Date} endedAt - When the session ended
 * @returns {Array} List of newly awarded badges
 */
function evaluateBadges(user, actualSeconds, endedAt) {
    const newBadges = [];
    const currentBadges = user.badges || [];

    // Badge 1: Night Owl (Gece Kuşu) - Completed between 00:00 and 05:00
    if (!currentBadges.includes("night_owl")) {
        const hour = endedAt.getHours();
        if (hour >= 0 && hour < 5) {
            newBadges.push("night_owl");
        }
    }

    // Badge 2: Iron Will (Demir İrade) - Single session >= 60 minutes
    if (!currentBadges.includes("iron_will")) {
        if (actualSeconds >= 3600) {
            newBadges.push("iron_will");
        }
    }

    // Badge 3: First Step (İlk Adım) - Completed first pomodoro
    if (!currentBadges.includes("first_step")) {
        newBadges.push("first_step");
    }

    return newBadges;
}

module.exports = {
    LEAGUE_THRESHOLDS,
    calculateLeague,
    calculateLevel,
    evaluateBadges
};
