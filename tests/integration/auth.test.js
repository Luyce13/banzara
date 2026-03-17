const request = require('supertest');
const httpStatusObj = require('http-status');
const httpStatus = httpStatusObj.status || httpStatusObj;
const app = require('../../src/app');
const setupTestDB = require('../utils/setupTestDB');
const User = require('../../src/modules/Users/model');
const { sendEmail } = require('../../src/utils/email');

setupTestDB();

jest.mock('../../src/utils/email', () => ({
  sendEmail: jest.fn(),
}));

describe('Auth routes', () => {
  describe('POST /api/v1/auth/register', () => {
    let newUser;
    beforeEach(() => {
      newUser = {
        email: 'testuser@example.com',
        password: 'password123',
        name: 'Test User',
      };
    });

    test('should return 201 and successfully register user if data is ok', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send(newUser)
        .expect(httpStatus.CREATED);

      expect(res.body).toEqual({
        success: true,
        message: expect.any(String),
        data: expect.objectContaining({
          user: expect.objectContaining({
            email: newUser.email,
            name: newUser.name,
          }),
        }),
      });

      const dbUser = await User.findOne({ email: newUser.email });
      expect(dbUser).toBeDefined();
      expect(dbUser.password).not.toBe(newUser.password);
      expect(sendEmail).toHaveBeenCalledWith(newUser.email, expect.any(String), expect.any(String));
    });

    test('should return 400 error if email is invalid', async () => {
      newUser.email = 'invalid-email';

      await request(app)
        .post('/api/v1/auth/register')
        .send(newUser)
        .expect(httpStatus.BAD_REQUEST);
    });

    test('should return 400 error if email is already used', async () => {
      await request(app).post('/api/v1/auth/register').send(newUser);
      await request(app)
        .post('/api/v1/auth/register')
        .send(newUser)
        .expect(httpStatus.BAD_REQUEST);
    });

    test('should return 400 error if password length is less than 8 characters', async () => {
      newUser.password = 'short';

      await request(app)
        .post('/api/v1/auth/register')
        .send(newUser)
        .expect(httpStatus.BAD_REQUEST);
    });
  });

  describe('POST /api/v1/auth/login', () => {
    let user;
    beforeEach(async () => {
      user = {
        email: 'testuser@example.com',
        password: 'password123',
        name: 'Test User',
      };
      await request(app).post('/api/v1/auth/register').send(user);
      // Manually verify email for successful login tests
      await User.findOneAndUpdate({ email: user.email }, { isEmailVerified: true });
    });

    test('should return 403 error if email is not verified', async () => {
      const unverifiedUser = {
        email: 'unverified@example.com',
        password: 'password123',
        name: 'Unverified User',
      };
      await request(app).post('/api/v1/auth/register').send(unverifiedUser);

      await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: unverifiedUser.email,
          password: unverifiedUser.password,
        })
        .expect(httpStatus.FORBIDDEN);
    });

    test('should return 200 and login tokens if email and password are correct', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: user.email,
          password: user.password,
        })
        .expect(httpStatus.OK);

      expect(res.body).toEqual({
        success: true,
        message: expect.any(String),
        data: expect.objectContaining({
          user: expect.objectContaining({
            email: user.email,
          }),
        }),
      });
      
      // Tokens should be in cookies (based on instructions.md)
      expect(res.headers['set-cookie']).toBeDefined();
      const cookies = res.headers['set-cookie'].join(';');
      expect(cookies).toContain('accessToken');
      expect(cookies).toContain('refreshToken');
    });

    test('should return 401 error if email is not found', async () => {
      await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'wrong@example.com', password: user.password })
        .expect(httpStatus.UNAUTHORIZED);
    });

    test('should return 401 error if password is wrong', async () => {
      await request(app)
        .post('/api/v1/auth/login')
        .send({ email: user.email, password: 'wrongpassword' })
        .expect(httpStatus.UNAUTHORIZED);
    });
  });
});
