import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/database/prisma.service';
import { Role } from '@prisma/client';

describe('Authentication (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  const testUser = {
    email: 'test@sunubrt.com',
    password: 'TestPassword123!',
    firstName: 'John',
    lastName: 'Doe',
    phone: '+221701234567',
    role: Role.USER,
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();

    // Apply the same global pipes as in main.ts
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        transformOptions: {
          enableImplicitConversion: true,
        },
      }),
    );

    app.setGlobalPrefix('api/v1');

    prisma = moduleFixture.get<PrismaService>(PrismaService);

    await app.init();
  });

  beforeEach(async () => {
    // Clean up test data
    await prisma.user.deleteMany({
      where: {
        email: testUser.email,
      },
    });
  });

  afterAll(async () => {
    // Clean up test data
    await prisma.user.deleteMany({
      where: {
        email: testUser.email,
      },
    });

    await app.close();
  });

  describe('/api/v1/auth/register (POST)', () => {
    it('should register a new user successfully', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send(testUser)
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('email', testUser.email);
      expect(response.body).toHaveProperty('firstName', testUser.firstName);
      expect(response.body).toHaveProperty('lastName', testUser.lastName);
      expect(response.body).toHaveProperty('phone', testUser.phone);
      expect(response.body).toHaveProperty('role', testUser.role);
      expect(response.body).toHaveProperty('isVerified', false);
      expect(response.body).toHaveProperty('message');
      expect(response.body).not.toHaveProperty('password');
    });

    it('should return validation error for invalid email', async () => {
      const invalidUser = {
        ...testUser,
        email: 'invalid-email',
      };

      await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send(invalidUser)
        .expect(400);
    });

    it('should return validation error for weak password', async () => {
      const invalidUser = {
        ...testUser,
        password: 'weak',
      };

      await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send(invalidUser)
        .expect(400);
    });

    it('should return conflict error for duplicate email', async () => {
      // First registration
      await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send(testUser)
        .expect(201);

      // Second registration with same email
      await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send(testUser)
        .expect(409);
    });

    it('should return validation error for invalid phone number', async () => {
      const invalidUser = {
        ...testUser,
        phone: 'invalid-phone',
      };

      await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send(invalidUser)
        .expect(400);
    });
  });

  describe('/api/v1/auth/login (POST)', () => {
    beforeEach(async () => {
      // Register a user first
      await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send(testUser);

      // Manually verify the user for login tests
      await prisma.user.update({
        where: { email: testUser.email },
        data: { isVerified: true },
      });
    });

    it('should login successfully with valid credentials', async () => {
      const loginData = {
        email: testUser.email,
        password: testUser.password,
      };

      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send(loginData)
        .expect(200);

      expect(response.body).toHaveProperty('accessToken');
      expect(response.body).toHaveProperty('refreshToken');
      expect(response.body).toHaveProperty('user');
      expect(response.body).toHaveProperty('expiresIn');
      expect(response.body).toHaveProperty('message');
      expect(response.body.user).toHaveProperty('email', testUser.email);
      expect(response.body.user).not.toHaveProperty('password');
    });

    it('should return unauthorized for invalid email', async () => {
      const loginData = {
        email: 'wrong@email.com',
        password: testUser.password,
      };

      await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send(loginData)
        .expect(401);
    });

    it('should return unauthorized for invalid password', async () => {
      const loginData = {
        email: testUser.email,
        password: 'wrongpassword',
      };

      await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send(loginData)
        .expect(401);
    });

    it('should return unauthorized for unverified user', async () => {
      // Set user as unverified
      await prisma.user.update({
        where: { email: testUser.email },
        data: { isVerified: false },
      });

      const loginData = {
        email: testUser.email,
        password: testUser.password,
      };

      await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send(loginData)
        .expect(401);
    });

    it('should return validation error for missing fields', async () => {
      const loginData = {
        email: testUser.email,
        // password missing
      };

      await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send(loginData)
        .expect(400);
    });
  });

  describe('/api/v1/auth/profile (GET)', () => {
    let accessToken: string;

    beforeEach(async () => {
      // Register and verify user
      await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send(testUser);

      await prisma.user.update({
        where: { email: testUser.email },
        data: { isVerified: true },
      });

      // Login to get access token
      const loginResponse = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password,
        });

      accessToken = loginResponse.body.accessToken;
    });

    it('should get user profile with valid token', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/auth/profile')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('user');
      expect(response.body).toHaveProperty('message');
      expect(response.body.user).toHaveProperty('email', testUser.email);
      expect(response.body.user).not.toHaveProperty('password');
    });

    it('should return unauthorized without token', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/auth/profile')
        .expect(401);
    });

    it('should return unauthorized with invalid token', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/auth/profile')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);
    });
  });

  describe('/api/v1/auth/validate (GET)', () => {
    let accessToken: string;

    beforeEach(async () => {
      // Register and verify user
      await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send(testUser);

      await prisma.user.update({
        where: { email: testUser.email },
        data: { isVerified: true },
      });

      // Login to get access token
      const loginResponse = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password,
        });

      accessToken = loginResponse.body.accessToken;
    });

    it('should validate token successfully', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/auth/validate')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('valid', true);
      expect(response.body).toHaveProperty('user');
      expect(response.body).toHaveProperty('message');
    });

    it('should return unauthorized for invalid token', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/auth/validate')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);
    });
  });

  describe('/api/v1/auth/change-password (POST)', () => {
    let accessToken: string;

    beforeEach(async () => {
      // Register and verify user
      await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send(testUser);

      await prisma.user.update({
        where: { email: testUser.email },
        data: { isVerified: true },
      });

      // Login to get access token
      const loginResponse = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password,
        });

      accessToken = loginResponse.body.accessToken;
    });

    it('should change password successfully', async () => {
      const changePasswordData = {
        currentPassword: testUser.password,
        newPassword: 'NewPassword123!',
        confirmPassword: 'NewPassword123!',
      };

      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/change-password')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(changePasswordData)
        .expect(200);

      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('timestamp');
    });

    it('should return error for wrong current password', async () => {
      const changePasswordData = {
        currentPassword: 'WrongPassword123!',
        newPassword: 'NewPassword123!',
        confirmPassword: 'NewPassword123!',
      };

      await request(app.getHttpServer())
        .post('/api/v1/auth/change-password')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(changePasswordData)
        .expect(401);
    });

    it('should return error for mismatched new passwords', async () => {
      const changePasswordData = {
        currentPassword: testUser.password,
        newPassword: 'NewPassword123!',
        confirmPassword: 'DifferentPassword123!',
      };

      await request(app.getHttpServer())
        .post('/api/v1/auth/change-password')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(changePasswordData)
        .expect(400);
    });

    it('should return unauthorized without token', async () => {
      const changePasswordData = {
        currentPassword: testUser.password,
        newPassword: 'NewPassword123!',
        confirmPassword: 'NewPassword123!',
      };

      await request(app.getHttpServer())
        .post('/api/v1/auth/change-password')
        .send(changePasswordData)
        .expect(401);
    });
  });

  describe('/api/v1/auth/forgot-password (POST)', () => {
    beforeEach(async () => {
      // Register user for forgot password tests
      await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send(testUser);
    });

    it('should send forgot password email for existing user', async () => {
      const forgotPasswordData = {
        email: testUser.email,
      };

      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/forgot-password')
        .send(forgotPasswordData)
        .expect(200);

      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('email', testUser.email);
    });

    it('should return same response for non-existing user (security)', async () => {
      const forgotPasswordData = {
        email: 'nonexistent@sunubrt.com',
      };

      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/forgot-password')
        .send(forgotPasswordData)
        .expect(200);

      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('email', forgotPasswordData.email);
    });

    it('should return validation error for invalid email', async () => {
      const forgotPasswordData = {
        email: 'invalid-email',
      };

      await request(app.getHttpServer())
        .post('/api/v1/auth/forgot-password')
        .send(forgotPasswordData)
        .expect(400);
    });
  });
});
