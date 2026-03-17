const request = require('supertest');
const httpStatusObj = require('http-status');
const httpStatus = httpStatusObj.status || httpStatusObj;
const jwt = require('jsonwebtoken');
const moment = require('moment');
const mongoose = require('mongoose');
const app = require('../../src/app');
const setupTestDB = require('../utils/setupTestDB');
const User = require('../../src/modules/Users/model');
const Category = require('../../src/modules/Categories/model');
const Listing = require('../../src/modules/Listings/model');
const { ENV } = require('../../src/constants');

setupTestDB();

describe('Listings routes', () => {
  let user;
  let otherUser;
  let accessToken;
  let otherAccessToken;
  let category;

  beforeAll(async () => {
    // Ensure indexes are created for search and nearby tests
    await Listing.ensureIndexes();
  });

  beforeEach(async () => {
    user = await User.create({
      name: 'Seller User',
      email: 'seller@example.com',
      password: 'password123',
      isEmailVerified: true,
    });

    otherUser = await User.create({
      name: 'Other User',
      email: 'other@example.com',
      password: 'password123',
      isEmailVerified: true,
    });

    const expires = moment().add(30, 'minutes');
    accessToken = jwt.sign({ sub: user.id, iat: moment().unix(), exp: expires.unix(), type: 'access' }, ENV.JWT_SECRET);
    otherAccessToken = jwt.sign({ sub: otherUser.id, iat: moment().unix(), exp: expires.unix(), type: 'access' }, ENV.JWT_SECRET);

    category = await Category.create({
      name: 'Electronics',
      slug: 'electronics',
    });
  });

  describe('POST /api/v1/listings', () => {
    let newListing;

    beforeEach(() => {
      newListing = {
        title: 'iPhone 15 Pro',
        description: 'Brand new iPhone',
        category: category.id,
        type: 'product',
        price: 999,
        location: {
          type: 'Point',
          coordinates: [73.0479, 33.6844],
          label: 'Islamabad',
        },
      };
    });

    test('should return 201 and create listing if data is ok', async () => {
      const res = await request(app)
        .post('/api/v1/listings')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(newListing)
        .expect(httpStatus.CREATED);

      expect(res.body.success).toBe(true);
      expect(res.body.data.title).toBe(newListing.title);
      expect(res.body.data.seller._id).toBe(user.id);

      const dbListing = await Listing.findById(res.body.data._id);
      expect(dbListing).toBeDefined();
      expect(dbListing.slug).toContain('iphone-15-pro');
    });

    test('should return 403 if listing quota is exceeded', async () => {
       // Create 3 listings for the user (Free plan limit)
       for (let i = 0; i < 3; i++) {
         await Listing.create({ 
           ...newListing, 
           title: `Listing ${i}`, 
           seller: user.id,
           status: 'active'
         });
       }

       await request(app)
         .post('/api/v1/listings')
         .set('Authorization', `Bearer ${accessToken}`)
         .send(newListing)
         .expect(httpStatus.FORBIDDEN);
    });

    test('should return 400 if category is invalid', async () => {
      newListing.category = new mongoose.Types.ObjectId();

      await request(app)
        .post('/api/v1/listings')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(newListing)
        .expect(httpStatus.BAD_REQUEST);
    });

    test('should return 401 if not authenticated', async () => {
      await request(app)
        .post('/api/v1/listings')
        .send(newListing)
        .expect(httpStatus.UNAUTHORIZED);
    });
  });

  describe('GET /api/v1/listings', () => {
    test('should return 200 and list active listings', async () => {
      await Listing.create({
        title: 'Active Item',
        category: category.id,
        seller: user.id,
        type: 'product',
        status: 'active'
      });

      await Listing.create({
        title: 'Draft Item',
        category: category.id,
        seller: user.id,
        type: 'product',
        status: 'draft'
      });

      const res = await request(app)
        .get('/api/v1/listings')
        .expect(httpStatus.OK);

      expect(res.body.success).toBe(true);
      expect(res.body.data.listings).toHaveLength(1);
      expect(res.body.data.listings[0].title).toBe('Active Item');
    });
  });

  describe('GET /api/v1/listings/slug/:slug', () => {
    test('should return 200 and the listing object', async () => {
      const listing = await Listing.create({
        title: 'Unique Item',
        category: category.id,
        seller: user.id,
        type: 'product',
        status: 'active'
      });

      const res = await request(app)
        .get(`/api/v1/listings/slug/${listing.slug}`)
        .expect(httpStatus.OK);

      expect(res.body.success).toBe(true);
      expect(res.body.data._id).toBe(listing.id);
    });

    test('should return 404 if listing not found', async () => {
      await request(app)
        .get('/api/v1/listings/slug/non-existent-slug')
        .expect(httpStatus.NOT_FOUND);
    });
  });

  describe('PATCH /api/v1/listings/:id', () => {
    test('should return 200 and update listing if user is owner', async () => {
      const listing = await Listing.create({
        title: 'Old Title',
        category: category.id,
        seller: user.id,
        type: 'product'
      });

      const updateBody = { title: 'New Title' };

      const res = await request(app)
        .patch(`/api/v1/listings/${listing.id}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send(updateBody)
        .expect(httpStatus.OK);

      expect(res.body.success).toBe(true);
      expect(res.body.data.title).toBe(updateBody.title);
      
      const dbListing = await Listing.findById(listing.id);
      expect(dbListing.title).toBe(updateBody.title);
    });

    test('should return 403 if user is not the owner', async () => {
      const listing = await Listing.create({
        title: 'Other Listing',
        category: category.id,
        seller: otherUser.id,
        type: 'product'
      });

      await request(app)
        .patch(`/api/v1/listings/${listing.id}`)
        .set('Authorization', `Bearer ${accessToken}`) // Authenticated as 'user', but listing belongs to 'otherUser'
        .send({ title: 'Hacked' })
        .expect(httpStatus.FORBIDDEN);
    });
  });

  describe('DELETE /api/v1/listings/:id', () => {
    test('should return 200 and soft delete if user is owner', async () => {
      const listing = await Listing.create({
        title: 'To Delete',
        category: category.id,
        seller: user.id,
        type: 'product'
      });

      await request(app)
        .delete(`/api/v1/listings/${listing.id}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(httpStatus.OK);

      const dbListing = await Listing.findById(listing.id).setOptions({ includeDeleted: true });
      expect(dbListing.isDeleted).toBe(true);
      expect(dbListing.status).toBe('expired');
    });
  });

  describe('Specialized Searches', () => {
     beforeEach(async () => {
        // Create some listings with locations and text
        await Listing.create([
          {
            title: 'Gaming Laptop',
            description: 'Powerful machine for gamers',
            category: category.id,
            seller: user.id,
            type: 'product',
            status: 'active',
            location: { type: 'Point', coordinates: [73.0, 33.0] } // Islamabad approx
          },
          {
            title: 'Kitchen Mixer',
            description: 'Perfect for baking',
            category: category.id,
            seller: user.id,
            type: 'product',
            status: 'active',
            location: { type: 'Point', coordinates: [67.0, 24.8] } // Karachi approx
          }
        ]);
        // Give some time for indexes if needed, though MongoMemoryServer is generally fast
     });

     test('GET /search should find listings by text query', async () => {
        const res = await request(app)
          .get('/api/v1/listings/search?q=gaming')
          .expect(httpStatus.OK);

        expect(res.body.data.listings).toHaveLength(1);
        expect(res.body.data.listings[0].title).toBe('Gaming Laptop');
     });

     test('GET /nearby should find listings within radius', async () => {
        // Search near Islamabad coord [73.0, 33.0]
        const res = await request(app)
          .get('/api/v1/listings/nearby?lng=73.02&lat=33.01&radius=50')
          .expect(httpStatus.OK);

        expect(res.body.data).toHaveLength(1);
        expect(res.body.data[0].title).toBe('Gaming Laptop');
     });
  });
});
