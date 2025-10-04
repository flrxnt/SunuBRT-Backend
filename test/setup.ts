// Mock Prisma Client for tests
jest.mock('@prisma/client', () => {
  return {
    PrismaClient: jest.fn().mockImplementation(() => ({
      $connect: jest.fn(),
      $disconnect: jest.fn(),
    })),
    Role: {
      USER: 'USER',
      DRIVER: 'DRIVER',
      ADMIN: 'ADMIN',
      SUPER_ADMIN: 'SUPER_ADMIN',
    },
    TicketStatus: {
      ACTIVE: 'ACTIVE',
      USED: 'USED',
      EXPIRED: 'EXPIRED',
      CANCELLED: 'CANCELLED',
      PENDING: 'PENDING',
    },
    PaymentStatus: {
      PENDING: 'PENDING',
      COMPLETED: 'COMPLETED',
      FAILED: 'FAILED',
      REFUNDED: 'REFUNDED',
      CANCELLED: 'CANCELLED',
    },
    TripStatus: {
      SCHEDULED: 'SCHEDULED',
      IN_PROGRESS: 'IN_PROGRESS',
      COMPLETED: 'COMPLETED',
      CANCELLED: 'CANCELLED',
      DELAYED: 'DELAYED',
    },
    TicketType: {
      SINGLE: 'SINGLE',
      RETURN: 'RETURN',
      DAILY: 'DAILY',
      WEEKLY: 'WEEKLY',
      MONTHLY: 'MONTHLY',
      ANNUAL: 'ANNUAL',
    },
    BusStatus: {
      ACTIVE: 'ACTIVE',
      INACTIVE: 'INACTIVE',
      MAINTENANCE: 'MAINTENANCE',
      OUT_OF_SERVICE: 'OUT_OF_SERVICE',
    },
    Direction: {
      OUTBOUND: 'OUTBOUND',
      INBOUND: 'INBOUND',
    },
  };
});

// Mock environment variables
process.env.JWT_SECRET = 'test-jwt-secret';
process.env.JWT_REFRESH_SECRET = 'test-jwt-refresh-secret';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';
process.env.NODE_ENV = 'test';
