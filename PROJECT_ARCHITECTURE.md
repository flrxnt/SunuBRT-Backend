sunubrt-backend/
├── package.json
├── tsconfig.json
├── .env.example
├── Dockerfile
├── docker-compose.yml
├── prisma/
│   ├── schema.prisma
│   ├── seed.ts
│   └── migrations/
├── src/
│   ├── main.ts
│   ├── app.module.ts
│   ├── common/
│   │   ├── decorators/
│   │   │   ├── public.decorator.ts
│   │   │   └── roles.decorator.ts
│   │   ├── guards/
│   │   │   ├── auth.guard.ts
│   │   │   └── roles.guard.ts
│   │   ├── interceptors/
│   │   │   └── logging.interceptor.ts
│   │   ├── filters/
│   │   │   └── http-exception.filter.ts
│   │   ├── pipes/
│   │   │   └── validation.pipe.ts
│   │   └── utils/
│   │       ├── bcrypt.util.ts
│   │       └── date.util.ts
│   ├── config/
│   │   ├── database.config.ts
│   │   ├── jwt.config.ts
│   │   └── paydunya.config.ts
│   ├── database/
│   │   └── prisma.service.ts
│   ├── auth/
│   │   ├── auth.module.ts
│   │   ├── auth.controller.ts
│   │   ├── auth.service.ts
│   │   ├── dto/
│   │   │   ├── register.dto.ts
│   │   │   ├── login.dto.ts
│   │   │   └── reset-password.dto.ts
│   │   └── strategies/
│   │       └── jwt.strategy.ts
│   ├── users/
│   │   ├── users.module.ts
│   │   ├── users.controller.ts
│   │   ├── users.service.ts
│   │   ├── dto/
│   │   │   ├── create-user.dto.ts
│   │   │   └── update-user.dto.ts
│   │   └── entities/
│   │       └── user.entity.ts
│   ├── buses/
│   │   ├── buses.module.ts
│   │   ├── buses.controller.ts
│   │   ├── buses.service.ts
│   │   ├── dto/
│   │   │   ├── create-bus.dto.ts
│   │   │   ├── update-bus.dto.ts
│   │   │   └── update-position.dto.ts
│   │   └── entities/
│   │       ├── bus.entity.ts
│   │       └── position.entity.ts
│   ├── routes/
│   │   ├── routes.module.ts
│   │   ├── routes.controller.ts
│   │   ├── routes.service.ts
│   │   ├── dto/
│   │   │   ├── create-route.dto.ts
│   │   │   ├── create-trip.dto.ts
│   │   │   └── update-trip.dto.ts
│   │   └── entities/
│   │       ├── route.entity.ts
│   │       └── trip.entity.ts
│   ├── tickets/
│   │   ├── tickets.module.ts
│   │   ├── tickets.controller.ts
│   │   ├── tickets.service.ts
│   │   ├── dto/
│   │   │   ├── create-ticket.dto.ts
│   │   │   └── validate-ticket.dto.ts
│   │   └── entities/
│   │       └── ticket.entity.ts
│   ├── payments/
│   │   ├── payments.module.ts
│   │   ├── payments.controller.ts
│   │   ├── payments.service.ts
│   │   ├── dto/
│   │   │   ├── create-payment.dto.ts
│   │   │   └── paydunya-callback.dto.ts
│   │   └── entities/
│   │       └── payment.entity.ts
│   └── websockets/
│       ├── websockets.module.ts
│       ├── websockets.gateway.ts
│       └── websockets.service.ts
└── test/
    ├── app.e2e-spec.ts
    └── jest-e2e.json
