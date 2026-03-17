const request = require('supertest');
const app = require('./src/app');
const jwt = require('jsonwebtoken');
const moment = require('moment');
const mongoose = require('mongoose');
const { ENV } = require('./src/constants');
require('dotenv').config();

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  const User = require('./src/modules/Users/model');
  
  // Find an existing user
  const user = await User.findOne({ email: 'tanvirabbas64@gmail.com' });
  if (!user) {
    console.log('User not found');
    process.exit(1);
  }

  const expires = moment().add(30, 'minutes');
  const accessToken = jwt.sign({ sub: user.id, iat: moment().unix(), exp: expires.unix(), type: 'access' }, ENV.JWT_SECRET);

  const addressJson = JSON.stringify({
    type: "Point",
    coordinates: [73.0479, 33.6844],
    label: "Islamabad, Pakistan"
  });

  console.log('Sending address as string:', addressJson);

  const res = await request(app)
    .patch('/api/v1/users/me')
    .set('Authorization', `Bearer ${accessToken}`)
    .field('address', addressJson)
    .expect(200);

  console.log('Response Status:', res.status);
  console.log('Response Body:', JSON.stringify(res.body, null, 2));

  await mongoose.connection.close();
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
