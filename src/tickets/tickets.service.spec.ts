import { Test, TestingModule } from '@nestjs/testing';
import { TicketsService } from './tickets.service';
import { PrismaService } from '../database/prisma.service';
import { PaymentsService } from '../payments/payments.service';
import { WebsocketsGateway } from '../websockets/websockets.gateway';
import {
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { TicketStatus, PaymentStatus, TripStatus } from '@prisma/client';

describe('TicketsService', () => {
  let service: TicketsService;
  let prismaService: PrismaService;
  let paymentsService: PaymentsService;
  let websocketsGateway: WebsocketsGateway;

  const mockUser = {
    id: 'user-1',
    email: 'test@example.com',
    role: 'USER',
  };

  const mockTrip = {
    id: 1,
    status: TripStatus.SCHEDULED,
    route: {
      id: 1,
      line: {
        id: 1,
        name: 'Line 1',
      },
    },
    bus: {
      id: 'bus-1',
      capacity: 50,
    },
  };

  const mockTicket = {
    id: 'ticket-1',
    userId: 'user-1',
    tripId: 1,
    status: TicketStatus.ACTIVE,
    qrCode: 'qr-code-data',
    price: 500,
    purchaseDate: new Date(),
    validFrom: new Date(),
    validUntil: new Date(Date.now() + 86400000),
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockPayment = {
    id: 'payment-1',
    userId: 'user-1',
    amount: 500,
    status: PaymentStatus.COMPLETED,
    provider: 'PAYDUNYA',
  };

  const mockPrismaService = {
    trip: {
      findUnique: jest.fn(),
    },
    ticket: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      update: jest.fn(),
    },
    ticketPricing: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    payment: {
      findUnique: jest.fn(),
    },
  };

  const mockPaymentsService = {
    createPayment: jest.fn(),
    verifyPayment: jest.fn(),
  };

  const mockWebsocketsGateway = {
    emitToUser: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TicketsService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: PaymentsService,
          useValue: mockPaymentsService,
        },
        {
          provide: WebsocketsGateway,
          useValue: mockWebsocketsGateway,
        },
      ],
    }).compile();

    service = module.get<TicketsService>(TicketsService);
    prismaService = module.get<PrismaService>(PrismaService);
    paymentsService = module.get<PaymentsService>(PaymentsService);
    websocketsGateway = module.get<WebsocketsGateway>(WebsocketsGateway);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getAvailablePricing', () => {
    it('should return available pricing for a trip', async () => {
      mockPrismaService.trip.findUnique.mockResolvedValue(mockTrip);
      mockPrismaService.ticketPricing.findMany.mockResolvedValue([
        {
          id: 1,
          type: 'SINGLE',
          price: 500,
          lineId: 1,
          isActive: true,
        },
      ]);

      const result = await service.getAvailablePricing(
        { tripId: 1 },
        'user-1',
      );

      expect(result).toHaveProperty('trip');
      expect(result).toHaveProperty('availablePricing');
      expect(mockPrismaService.trip.findUnique).toHaveBeenCalled();
    });

    it('should throw NotFoundException if trip not found', async () => {
      mockPrismaService.trip.findUnique.mockResolvedValue(null);

      await expect(
        service.getAvailablePricing({ tripId: 999 }, 'user-1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if trip not scheduled', async () => {
      mockPrismaService.trip.findUnique.mockResolvedValue({
        ...mockTrip,
        status: TripStatus.COMPLETED,
      });

      await expect(
        service.getAvailablePricing({ tripId: 1 }, 'user-1'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('initiateTicketPurchase', () => {
    const purchaseDto = {
      tripId: 1,
      pricingId: 1,
      quantity: 2,
    };

    it('should successfully initiate ticket purchase', async () => {
      mockPrismaService.trip.findUnique.mockResolvedValue(mockTrip);
      mockPrismaService.ticketPricing.findUnique.mockResolvedValue({
        id: 1,
        price: 500,
        type: 'SINGLE',
        isActive: true,
      });
      mockPaymentsService.createPayment.mockResolvedValue({
        id: 'payment-1',
        paymentUrl: 'https://payment.url',
        token: 'token-123',
      });

      const result = await service.initiateTicketPurchase(purchaseDto, 'user-1');

      expect(result).toHaveProperty('paymentUrl');
      expect(result).toHaveProperty('paymentId');
      expect(mockPaymentsService.createPayment).toHaveBeenCalled();
    });

    it('should throw NotFoundException if trip not found', async () => {
      mockPrismaService.trip.findUnique.mockResolvedValue(null);

      await expect(
        service.initiateTicketPurchase(purchaseDto, 'user-1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException if pricing not found', async () => {
      mockPrismaService.trip.findUnique.mockResolvedValue(mockTrip);
      mockPrismaService.ticketPricing.findUnique.mockResolvedValue(null);

      await expect(
        service.initiateTicketPurchase(purchaseDto, 'user-1'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('validateTicket', () => {
    const validateDto = {
      qrCode: 'qr-code-data',
      tripId: 1,
      busId: 'bus-1',
    };

    it('should successfully validate an active ticket', async () => {
      mockPrismaService.ticket.findUnique.mockResolvedValue(mockTicket);
      mockPrismaService.ticket.update.mockResolvedValue({
        ...mockTicket,
        status: TicketStatus.USED,
      });

      const result = await service.validateTicket(validateDto, { id: 'driver-1' });

      expect(result).toHaveProperty('valid', true);
      expect(result).toHaveProperty('message');
      expect(mockPrismaService.ticket.update).toHaveBeenCalled();
    });

    it('should throw NotFoundException if ticket not found', async () => {
      mockPrismaService.ticket.findUnique.mockResolvedValue(null);

      await expect(
        service.validateTicket(validateDto, { id: 'driver-1' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if ticket already used', async () => {
      mockPrismaService.ticket.findUnique.mockResolvedValue({
        ...mockTicket,
        status: TicketStatus.USED,
      });

      await expect(
        service.validateTicket(validateDto, { id: 'driver-1' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if ticket expired', async () => {
      mockPrismaService.ticket.findUnique.mockResolvedValue({
        ...mockTicket,
        status: TicketStatus.EXPIRED,
      });

      await expect(
        service.validateTicket(validateDto, { id: 'driver-1' }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('getUserTickets', () => {
    it('should return user tickets', async () => {
      mockPrismaService.ticket.findMany.mockResolvedValue([mockTicket]);
      mockPrismaService.ticket.count.mockResolvedValue(1);

      const result = await service.getUserTickets('user-1', {});

      expect(result).toHaveProperty('tickets');
      expect(result).toHaveProperty('total', 1);
      expect(mockPrismaService.ticket.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ userId: 'user-1' }),
        }),
      );
    });

    it('should filter tickets by status', async () => {
      mockPrismaService.ticket.findMany.mockResolvedValue([mockTicket]);
      mockPrismaService.ticket.count.mockResolvedValue(1);

      await service.getUserTickets('user-1', { status: TicketStatus.ACTIVE });

      expect(mockPrismaService.ticket.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            userId: 'user-1',
            status: TicketStatus.ACTIVE,
          }),
        }),
      );
    });
  });

  describe('getTicketById', () => {
    it('should return ticket by id', async () => {
      mockPrismaService.ticket.findUnique.mockResolvedValue(mockTicket);

      const result = await service.getTicketById('ticket-1', 'user-1');

      expect(result).toEqual(mockTicket);
      expect(mockPrismaService.ticket.findUnique).toHaveBeenCalledWith({
        where: { id: 'ticket-1' },
        include: expect.any(Object),
      });
    });

    it('should throw NotFoundException if ticket not found', async () => {
      mockPrismaService.ticket.findUnique.mockResolvedValue(null);

      await expect(
        service.getTicketById('ticket-999', 'user-1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException if user not authorized', async () => {
      mockPrismaService.ticket.findUnique.mockResolvedValue({
        ...mockTicket,
        userId: 'other-user',
      });

      await expect(
        service.getTicketById('ticket-1', 'user-1'),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('createTicketPricing', () => {
    const createPricingDto = {
      type: 'SINGLE',
      name: 'Single Trip',
      price: 500,
      lineId: 1,
    };

    it('should successfully create ticket pricing', async () => {
      const mockPricing = {
        id: 1,
        ...createPricingDto,
        isActive: true,
      };
      mockPrismaService.ticketPricing.create.mockResolvedValue(mockPricing);

      const result = await service.createTicketPricing(createPricingDto);

      expect(result).toEqual(mockPricing);
      expect(mockPrismaService.ticketPricing.create).toHaveBeenCalled();
    });
  });

  describe('updateTicketPricing', () => {
    const updatePricingDto = {
      price: 600,
      isActive: false,
    };

    it('should successfully update ticket pricing', async () => {
      const mockPricing = { id: 1, type: 'SINGLE', price: 500, isActive: true };
      const updatedPricing = { ...mockPricing, ...updatePricingDto };

      mockPrismaService.ticketPricing.findUnique.mockResolvedValue(mockPricing);
      mockPrismaService.ticketPricing.update.mockResolvedValue(updatedPricing);

      const result = await service.updateTicketPricing(1, updatePricingDto);

      expect(result.price).toBe(600);
      expect(mockPrismaService.ticketPricing.update).toHaveBeenCalled();
    });

    it('should throw NotFoundException if pricing not found', async () => {
      mockPrismaService.ticketPricing.findUnique.mockResolvedValue(null);

      await expect(
        service.updateTicketPricing(999, updatePricingDto),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
