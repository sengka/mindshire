// utils/migrateCourseSlugs.js
// One-time migration script to add slugs to existing courses

const mongoose = require('mongoose');
require('dotenv').config();

const Course = require('../models/Course');
const { generateSlug, ensureUniqueSlug } = require('./slugHelper');

async function migrateCourseSlugs() {
    try {
        // Connect to database
        await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/mindshire');
        console.log('✅ Connected to database');

        // Find all courses without slugs
        const coursesWithoutSlugs = await Course.find({
            $or: [
                { slug: { $exists: false } },
                { slug: null },
                { slug: '' }
            ]
        });

        console.log(`📊 Found ${coursesWithoutSlugs.length} courses without slugs`);

        if (coursesWithoutSlugs.length === 0) {
            console.log('✨ All courses already have slugs!');
            await mongoose.connection.close();
            return;
        }

        // Generate and save slugs for each course
        let successCount = 0;
        let errorCount = 0;

        for (const course of coursesWithoutSlugs) {
            try {
                const baseSlug = generateSlug(course.name);
                course.slug = await ensureUniqueSlug(Course, baseSlug, course._id);
                await course.save();
                console.log(`✅ Generated slug for "${course.name}": ${course.slug}`);
                successCount++;
            } catch (error) {
                console.error(`❌ Error generating slug for "${course.name}":`, error.message);
                errorCount++;
            }
        }

        console.log('\n📈 Migration Summary:');
        console.log(`   ✅ Success: ${successCount}`);
        console.log(`   ❌ Errors: ${errorCount}`);
        console.log(`   📊 Total: ${coursesWithoutSlugs.length}`);

        await mongoose.connection.close();
        console.log('\n🎉 Migration complete!');

    } catch (error) {
        console.error('❌ Migration failed:', error);
        await mongoose.connection.close();
        process.exit(1);
    }
}

// Run migration if called directly
if (require.main === module) {
    migrateCourseSlugs();
}

module.exports = migrateCourseSlugs;
