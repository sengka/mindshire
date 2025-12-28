// utils/slugHelper.js
// Utility functions for generating and ensuring unique slugs
const slugify = require('slugify');

/**
 * Generate a URL-safe slug from text
 * @param {string} text - The text to slugify
 * @returns {string} - URL-safe slug
 */
function generateSlug(text) {
    if (!text) return '';

    return slugify(text, {
        lower: true,      // Convert to lowercase
        strict: true,     // Strip special characters
        trim: true,       // Trim whitespace
        locale: 'tr'      // Turkish locale for proper character handling
    });
}

/**
 * Ensure slug is unique by appending numbers if needed
 * @param {Model} Model - Mongoose model to check against
 * @param {string} baseSlug - The base slug to check
 * @param {string} excludeId - Optional ID to exclude from uniqueness check (for updates)
 * @returns {Promise<string>} - Unique slug
 */
async function ensureUniqueSlug(Model, baseSlug, excludeId = null) {
    let slug = baseSlug;
    let counter = 2;

    while (true) {
        const query = { slug };
        if (excludeId) {
            query._id = { $ne: excludeId };
        }

        const existing = await Model.findOne(query);

        if (!existing) {
            return slug;
        }

        slug = `${baseSlug}-${counter}`;
        counter++;
    }
}

module.exports = {
    generateSlug,
    ensureUniqueSlug
};
