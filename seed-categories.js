/**
 * Category Seed for BazaarnaZone
 * 
 * Sets up the 6 main sections as top-level categories.
 */

const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Category = require('./src/modules/Categories/model');

dotenv.config();

const categories = [
  {
    name: 'Marketplace',
    slug: 'marketplace',
    parent: null,
  },
  {
    name: 'Real Estate',
    slug: 'real-estate',
    parent: null,
  },
  {
    name: 'Cars & Vehicles',
    slug: 'cars-and-vehicles',
    parent: null,
  },
  {
    name: 'Services',
    slug: 'services',
    parent: null,
  },
  {
    name: 'Jobs & Freelancing',
    slug: 'jobs-and-freelancing',
    parent: null,
  },
  {
    name: 'Business Directory',
    slug: 'business-directory',
    parent: null,
  },
];

const seedCategories = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URL || 'mongodb://localhost:27017/banzara');
    console.log('Connected to MongoDB');

    for (const cat of categories) {
      const exists = await Category.findOne({ slug: cat.slug });
      if (!exists) {
        await Category.create(cat);
        console.log(`Created category: ${cat.name}`);
      } else {
        console.log(`Category already exists: ${cat.name}`);
      }
    }

    console.log('Category seeding completed');
    process.exit(0);
  } catch (error) {
    console.error('Seeding error:', error);
    process.exit(1);
  }
};

seedCategories();
