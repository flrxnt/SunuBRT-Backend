import { NestFactory } from '@nestjs/core';
import { ValidationPipe, ClassSerializerInterceptor } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import * as bodyParser from 'body-parser';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Security: Apply Helmet to set secure HTTP headers
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'"],
          imgSrc: ["'self'", 'data:', 'https:'],
        },
      },
      crossOriginEmbedderPolicy: false,
    }),
  );

  // Security: Apply rate limiting to prevent brute force attacks
  const limiter = rateLimit({
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes default
    max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS, 10) || 100, // limit each IP to 100 requests per windowMs
    message: 'Trop de requêtes depuis cette IP, veuillez réessayer plus tard.',
    standardHeaders: true,
    legacyHeaders: false,
  });

  // Apply rate limiting to all routes
  app.use(limiter);

  // Stricter rate limiting for authentication endpoints
  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // limit each IP to 5 requests per windowMs
    message:
      'Trop de tentatives de connexion depuis cette IP, veuillez réessayer dans 15 minutes.',
    skipSuccessfulRequests: true,
  });

  app.use('/api/v1/auth/login', authLimiter);
  app.use('/api/v1/auth/register', authLimiter);
  app.use('/api/v1/auth/forgot-password', authLimiter);
  app.use('/api/v1/auth/reset-password', authLimiter);

  // Configure middleware pour les callbacks PayDunya
  // PayDunya envoie les données au format application/x-www-form-urlencoded
  app.use(
    '/api/v1/payments/paydunya/callback',
    bodyParser.urlencoded({ extended: true }),
  );
  app.use(
    '/api/v1/payments/paydunya/callback',
    bodyParser.raw({ type: 'application/x-www-form-urlencoded' }),
  );

  // Enable CORS
  app.enableCors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Origin',
      'X-Requested-With',
      'Content-Type',
      'Accept',
      'Authorization',
      'Cache-Control',
    ],
  });

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // Remove properties that don't have decorators
      forbidNonWhitelisted: true, // Throw error if non-whitelisted properties are present
      transform: true, // Transform payload to DTO instances
      transformOptions: {
        enableImplicitConversion: true, // Allow type conversion
      },
      disableErrorMessages: process.env.NODE_ENV === 'production', // Disable detailed error messages in production
    }),
  );

  // Global class serializer interceptor (respects @Exclude decorators)
  app.useGlobalInterceptors(new ClassSerializerInterceptor(app.get(Reflector)));

  // Global prefix for all routes
  app.setGlobalPrefix('api/v1');

  // Enable Swagger
  if (process.env.NODE_ENV === 'development') {
    const config = new DocumentBuilder()
      .setTitle('SunuBRT Backend')
      .setDescription('The SunuBRT Backend API description')
      .setVersion('1.0')
      .addTag('sunubrt')
      .build();
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api', app, document);
  }

  // Get port from environment or use default
  const port = process.env.PORT || 3000;

  await app.listen(port);

  console.log(
    `🚀 SunuBRT Backend is running on: http://localhost:${port}/api/v1`,
  );
  console.log(`📚 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(
    `🌐 CORS enabled for: ${process.env.FRONTEND_URL || 'http://localhost:3000'}`,
  );
}

bootstrap().catch((error) => {
  console.error('❌ Failed to start the application:', error);
  process.exit(1);
});
