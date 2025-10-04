import { Test, TestingModule } from '@nestjs/testing';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';

describe('PaymentsController', () => {
  let controller: PaymentsController;
  let service: PaymentsService;

  const mockPayment = {
    id: 'payment-1',
    userId: 'user-1',
    amount: 1000,
    status: 'COMPLETED',
    provider: 'PAYDUNYA',
    method: 'MOBILE_MONEY',
  };

  const mockUser = {
    id: 'user-1',
    email: 'test@example.com',
    role: 'USER',
  };

  const mockPaymentsService = {
    createPayment: jest.fn(),
    verifyPayment: jest.fn(),
    getUserPayments: jest.fn(),
    getPaymentById: jest.fn(),
    handlePaydunyaCallback: jest.fn(),
    getPaymentStatistics: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [PaymentsController],
      providers: [
        {
          provide: PaymentsService,
          useValue: mockPaymentsService,
        },
      ],
    }).compile();

    controller = module.get<PaymentsController>(PaymentsController);
    service = module.get<PaymentsService>(PaymentsService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('createPayment', () => {
    it('should create a payment', async () => {
      const createPaymentDto = {
        amount: 1000,
        provider: 'PAYDUNYA',
        method: 'MOBILE_MONEY',
        description: 'Ticket purchase',
      };

      const paymentResponse = {
        id: 'payment-1',
        paymentUrl: 'https://payment.url',
        token: 'token-123',
      };

      mockPaymentsService.createPayment.mockResolvedValue(paymentResponse);

      const result = await controller.createPayment(
        createPaymentDto,
        mockUser as any,
      );

      expect(result).toEqual(paymentResponse);
      expect(service.createPayment).toHaveBeenCalledWith(
        createPaymentDto,
        'user-1',
      );
    });
  });

  describe('verifyPayment', () => {
    it('should verify a payment', async () => {
      const verifyDto = {
        token: 'token-123',
      };

      const verificationResult = {
        success: true,
        payment: mockPayment,
      };

      mockPaymentsService.verifyPayment.mockResolvedValue(verificationResult);

      const result = await controller.verifyPayment(verifyDto);

      expect(result).toEqual(verificationResult);
      expect(service.verifyPayment).toHaveBeenCalledWith(verifyDto);
    });
  });

  describe('getUserPayments', () => {
    it('should return user payments', async () => {
      const paginatedResult = {
        payments: [mockPayment],
        total: 1,
        page: 1,
        limit: 10,
      };

      mockPaymentsService.getUserPayments.mockResolvedValue(paginatedResult);

      const result = await controller.getUserPayments({}, mockUser as any);

      expect(result).toEqual(paginatedResult);
      expect(service.getUserPayments).toHaveBeenCalledWith('user-1', {});
    });
  });

  describe('getPaymentById', () => {
    it('should return a payment by id', async () => {
      mockPaymentsService.getPaymentById.mockResolvedValue(mockPayment);

      const result = await controller.getPaymentById('payment-1', mockUser as any);

      expect(result).toEqual(mockPayment);
      expect(service.getPaymentById).toHaveBeenCalledWith('payment-1', 'user-1');
    });
  });

  describe('handlePaydunyaCallback', () => {
    it('should handle PayDunya callback', async () => {
      const callbackDto = {
        invoice_token: 'token-123',
        status: 'completed',
      };

      const callbackResponse = {
        success: true,
        message: 'Payment processed',
      };

      mockPaymentsService.handlePaydunyaCallback.mockResolvedValue(
        callbackResponse,
      );

      const result = await controller.handlePaydunyaCallback(callbackDto);

      expect(result).toEqual(callbackResponse);
      expect(service.handlePaydunyaCallback).toHaveBeenCalledWith(callbackDto);
    });
  });

  describe('getPaymentStatistics', () => {
    it('should return payment statistics', async () => {
      const stats = {
        totalPayments: 100,
        totalAmount: 50000,
        successfulPayments: 95,
        failedPayments: 5,
      };

      mockPaymentsService.getPaymentStatistics.mockResolvedValue(stats);

      const result = await controller.getPaymentStatistics({});

      expect(result).toEqual(stats);
      expect(service.getPaymentStatistics).toHaveBeenCalledWith({});
    });
  });
});
