import { Test, TestingModule } from '@nestjs/testing';
import { TicketsController } from './tickets.controller';
import { TicketsService } from './tickets.service';

describe('TicketsController', () => {
  let controller: TicketsController;
  let service: TicketsService;

  const mockTicket = {
    id: 'ticket-1',
    userId: 'user-1',
    tripId: 1,
    status: 'ACTIVE',
    qrCode: 'qr-code-data',
    price: 500,
  };

  const mockUser = {
    id: 'user-1',
    email: 'test@example.com',
    role: 'USER',
  };

  const mockTicketsService = {
    getAvailablePricing: jest.fn(),
    initiateTicketPurchase: jest.fn(),
    validateTicket: jest.fn(),
    getUserTickets: jest.fn(),
    getTicketById: jest.fn(),
    createTicketPricing: jest.fn(),
    updateTicketPricing: jest.fn(),
    deleteTicketPricing: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [TicketsController],
      providers: [
        {
          provide: TicketsService,
          useValue: mockTicketsService,
        },
      ],
    }).compile();

    controller = module.get<TicketsController>(TicketsController);
    service = module.get<TicketsService>(TicketsService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getAvailablePricing', () => {
    it('should return available pricing for a trip', async () => {
      const pricingData = {
        trip: { id: 1, status: 'SCHEDULED' },
        availablePricing: [
          { id: 1, type: 'SINGLE', price: 500 },
        ],
      };

      mockTicketsService.getAvailablePricing.mockResolvedValue(pricingData);

      const result = await controller.getAvailablePricing(
        { tripId: 1 },
        mockUser as any,
      );

      expect(result).toEqual(pricingData);
      expect(service.getAvailablePricing).toHaveBeenCalledWith(
        { tripId: 1 },
        'user-1',
      );
    });
  });

  describe('initiateTicketPurchase', () => {
    it('should initiate ticket purchase', async () => {
      const purchaseDto = {
        tripId: 1,
        pricingId: 1,
        quantity: 2,
      };

      const purchaseResult = {
        paymentUrl: 'https://payment.url',
        paymentId: 'payment-1',
        amount: 1000,
      };

      mockTicketsService.initiateTicketPurchase.mockResolvedValue(purchaseResult);

      const result = await controller.initiateTicketPurchase(
        purchaseDto,
        mockUser as any,
      );

      expect(result).toEqual(purchaseResult);
      expect(service.initiateTicketPurchase).toHaveBeenCalledWith(
        purchaseDto,
        'user-1',
      );
    });
  });

  describe('validateTicket', () => {
    it('should validate a ticket', async () => {
      const validateDto = {
        qrCode: 'qr-code-data',
        tripId: 1,
        busId: 'bus-1',
      };

      const validationResult = {
        valid: true,
        message: 'Ticket validé avec succès',
        ticket: mockTicket,
      };

      mockTicketsService.validateTicket.mockResolvedValue(validationResult);

      const result = await controller.validateTicket(
        validateDto,
        mockUser as any,
      );

      expect(result).toEqual(validationResult);
      expect(service.validateTicket).toHaveBeenCalledWith(validateDto, mockUser);
    });
  });

  describe('getUserTickets', () => {
    it('should return user tickets', async () => {
      const paginatedResult = {
        tickets: [mockTicket],
        total: 1,
        page: 1,
        limit: 10,
      };

      mockTicketsService.getUserTickets.mockResolvedValue(paginatedResult);

      const result = await controller.getUserTickets({}, mockUser as any);

      expect(result).toEqual(paginatedResult);
      expect(service.getUserTickets).toHaveBeenCalledWith('user-1', {});
    });
  });

  describe('getTicketById', () => {
    it('should return a ticket by id', async () => {
      mockTicketsService.getTicketById.mockResolvedValue(mockTicket);

      const result = await controller.getTicketById('ticket-1', mockUser as any);

      expect(result).toEqual(mockTicket);
      expect(service.getTicketById).toHaveBeenCalledWith('ticket-1', 'user-1');
    });
  });

  describe('createTicketPricing', () => {
    it('should create ticket pricing', async () => {
      const createPricingDto = {
        type: 'SINGLE',
        name: 'Single Trip',
        price: 500,
        lineId: 1,
      };

      const pricing = {
        id: 1,
        ...createPricingDto,
        isActive: true,
      };

      mockTicketsService.createTicketPricing.mockResolvedValue(pricing);

      const result = await controller.createTicketPricing(createPricingDto);

      expect(result).toEqual(pricing);
      expect(service.createTicketPricing).toHaveBeenCalledWith(createPricingDto);
    });
  });

  describe('updateTicketPricing', () => {
    it('should update ticket pricing', async () => {
      const updatePricingDto = {
        price: 600,
        isActive: false,
      };

      const updatedPricing = {
        id: 1,
        type: 'SINGLE',
        ...updatePricingDto,
      };

      mockTicketsService.updateTicketPricing.mockResolvedValue(updatedPricing);

      const result = await controller.updateTicketPricing(1, updatePricingDto);

      expect(result).toEqual(updatedPricing);
      expect(service.updateTicketPricing).toHaveBeenCalledWith(
        1,
        updatePricingDto,
      );
    });
  });
});
