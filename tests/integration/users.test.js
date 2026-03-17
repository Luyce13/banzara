const request = require('supertest');
const httpStatusObj = require('http-status');
const httpStatus = httpStatusObj.status || httpStatusObj;
const jwt = require('jsonwebtoken');
const moment = require('moment');
const app = require('../../src/app');
const setupTestDB = require('../utils/setupTestDB');
const User = require('../../src/modules/Users/model');
const { ENV } = require('../../src/constants');

setupTestDB();

describe('Users routes', () => {
  let user;
  let accessToken;

  beforeEach(async () => {
    user = await User.create({
      name: 'Test User',
      email: 'testuser@example.com',
      password: 'password123',
      isEmailVerified: true,
      userType: 'business',
    });

    const expires = moment().add(30, 'minutes');
    accessToken = jwt.sign({ sub: user.id, iat: moment().unix(), exp: expires.unix(), type: 'access' }, ENV.JWT_SECRET);
  });

  describe('GET /api/v1/users/me', () => {
    test('should return 200 and the user object if authenticated', async () => {
      const res = await request(app)
        .get('/api/v1/users/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(httpStatus.OK);

      expect(res.body).toEqual({
        success: true,
        message: expect.any(String),
        data: expect.objectContaining({
          email: user.email,
          name: user.name,
        }),
      });
    });

    test('should return 401 if no access token is provided', async () => {
      await request(app)
        .get('/api/v1/users/me')
        .expect(httpStatus.UNAUTHORIZED);
    });
  });

  describe('PATCH /api/v1/users/me', () => {
    test('should return 200 and successfully update user data', async () => {
      const updateBody = {
        name: 'Updated Name',
        address: {
          type: 'Point',
          coordinates: [73.0479, 33.6844],
          label: 'Islamabad, Pakistan',
        },
      };

      const res = await request(app)
        .patch('/api/v1/users/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(updateBody)
        .expect(httpStatus.OK);

      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toBe(updateBody.name);
      expect(res.body.data.address.coordinates).toEqual(updateBody.address.coordinates);

      const dbUser = await User.findById(user.id);
      expect(dbUser.name).toBe(updateBody.name);
    });

    test('should return 400 if address coordinates are malformed (not length 2)', async () => {
      const updateBody = {
        address: {
          type: 'Point',
          coordinates: [73.0479], // Missing one coordinate
        },
      };

      await request(app)
        .patch('/api/v1/users/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(updateBody)
        .expect(httpStatus.BAD_REQUEST);
    });

    test('should return 400 if email is already taken', async () => {
      await User.create({
        name: 'Other User',
        email: 'other@example.com',
        password: 'password123',
      });

      const updateBody = { email: 'other@example.com' };

      await request(app)
        .patch('/api/v1/users/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(updateBody)
        .expect(httpStatus.BAD_REQUEST);
    });
  });

  describe('GET /api/v1/users/directory', () => {
    test('should return 200 and list only business/agent users', async () => {
      await User.create({ name: 'Individual', email: 'ind@example.com', password: 'password123', userType: 'individual' });
      await User.create({ name: 'Agent', email: 'agent@example.com', password: 'password123', userType: 'agent' });

      const res = await request(app)
        .get('/api/v1/users/directory')
        .expect(httpStatus.OK);

      expect(res.body.success).toBe(true);
      expect(res.body.data.users).toHaveLength(2); // Initial 'user' (business) + 'agent'
      res.body.data.users.forEach(u => {
        expect(['business', 'agent']).toContain(u.userType);
      });
    });

    test('should handle pagination correctly', async () => {
      // We already have 1 business user from beforeEach.
      // Create 5 more agents.
      for (let i = 0; i < 5; i++) {
        await User.create({
          name: `Agent ${i}`,
          email: `agent${i}@example.com`,
          password: 'password123',
          userType: 'agent',
          isDeleted: false
        });
      }

      const res = await request(app)
        .get('/api/v1/users/directory?limit=2&page=1')
        .expect(httpStatus.OK);

      expect(res.body.data.users).toHaveLength(2);
      expect(res.body.data.total).toBe(6);
      expect(res.body.data.pages).toBe(3);
    });
  });
});
