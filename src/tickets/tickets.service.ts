import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CreateTicketDto } from './dto/create-ticket.dto';
import {
  InitiateTicketPurchaseDto,
  GetAvailablePricingDto,
  PurchaseResponseDto,
} from './dto/purchase-ticket.dto';
import {
  ValidateTicketDto,
  TicketValidationResponseDto,
} from './dto/validate-ticket.dto';
import {
  CreateTicketPricingDto,
  UpdateTicketPricingDto,
  TicketPricingType,
  ValidityPeriodType,
} from './dto/ticket-pricing.dto';
import { TicketStatus, Role, TripStatus, PaymentStatus } from '@prisma/client';
import { WebsocketsGateway } from '../websockets/websockets.gateway';
import { PaymentsService } from '../payments/payments.service';
import * as QRCode from 'qrcode';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class TicketsService {
  private readonly logger = new Logger(TicketsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly paymentsService: PaymentsService,
    private readonly websocketsGateway: WebsocketsGateway,
  ) {}

  // ===============================
  // GESTION DES TICKETS
  // ===============================

  /**
   * Nouvelle méthode pour obtenir les tarifications disponibles pour un voyage
   */
  async getAvailablePricing(dto: GetAvailablePricingDto, userId?: string) {
    const { tripId } = dto;

    // Vérifier que le voyage existe
    const trip = await this.prisma.trip.findUnique({
      where: { id: tripId },
      include: {
        route: {
          include: {
            line: true,
          },
        },
        bus: true,
      },
    });

    if (!trip) {
      throw new NotFoundException('Voyage non trouvé');
    }

    if (trip.status !== TripStatus.SCHEDULED) {
      throw new BadRequestException("Ce voyage n'est plus disponible");
    }

    // Récupérer toutes les tarifications applicables
    const pricingOptions = await this.prisma.ticketPricing.findMany({
      where: {
        isActive: true,
        OR: [
          { routeId: trip.routeId },
          { lineId: trip.route.lineId },
          { AND: [{ routeId: null }, { lineId: null }] }, // tarification générale
        ],
        AND: [
          {
            OR: [{ validFrom: null }, { validFrom: { lte: new Date() } }],
          },
          {
            OR: [{ validTo: null }, { validTo: { gte: new Date() } }],
          },
        ],
      },
      orderBy: [
        { routeId: 'desc' }, // priorité aux tarifs spécifiques à la route
        { lineId: 'desc' }, // puis à la ligne
        { price: 'asc' }, // puis par prix croissant
      ],
    });

    return pricingOptions.map((pricing) => ({
      id: pricing.id,
      name: pricing.name,
      type: pricing.type,
      description: pricing.description,
      originalPrice: pricing.price,
      finalPrice: Math.round(
        pricing.price * (1 - pricing.discountPercent / 100),
      ),
      totalPrice: Math.round(
        pricing.price * (1 - pricing.discountPercent / 100),
      ),
      discountPercent: pricing.discountPercent,
      validityDuration: pricing.validityDuration,
      validityPeriodType: pricing.validityPeriodType,
      specialConditions: pricing.specialConditions,
      maxTickets: pricing.maxTickets,
    }));
  }

  /**
   * Nouvelle méthode pour initier l'achat d'un ticket avec paiement
   */
  async initiateTicketPurchase(
    dto: InitiateTicketPurchaseDto,
    userId: string,
  ): Promise<PurchaseResponseDto> {
    const {
      tripId,
      pricingId,
      seatNumber,
      notes,
      provider,
      paymentMethod,
      customerName,
      customerEmail,
      customerPhone,
      promoCode,
    } = dto;

    // Créer directement le paiement de ticket qui gérera la création du ticket après paiement réussi
    const paymentResult = await this.paymentsService.createTicketPayment(
      {
        tripId,
        pricingId,
        seatNumber,
        notes,
        provider,
        paymentMethod,
        customerName,
        customerEmail,
        customerPhone,
        promoCode,
      },
      userId,
    );

    return paymentResult;
  }

  /**
   * Méthode pour créer un ticket après paiement confirmé
   */
  async create(createTicketDto: CreateTicketDto, userId: string) {
    const { paymentId, seatNumber, notes } = createTicketDto;

    // Vérifier que le paiement existe et est confirmé
    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
      include: {
        ticket: {
          include: {
            trip: {
              include: {
                route: {
                  include: {
                    line: true,
                  },
                },
                bus: {
                  include: {
                    driver: {
                      select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        phone: true,
                      },
                    },
                  },
                },
              },
            },
            pricing: true,
            user: {
              select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
                phone: true,
              },
            },
          },
        },
      },
    });

    if (!payment) {
      throw new NotFoundException('Paiement non trouvé');
    }

    if (payment.userId !== userId) {
      throw new BadRequestException('Ce paiement ne vous appartient pas');
    }

    if (payment.status !== PaymentStatus.COMPLETED) {
      throw new BadRequestException("Le paiement n'est pas encore confirmé");
    }

    if (!payment.ticket) {
      throw new NotFoundException('Ticket associé au paiement non trouvé');
    }

    // Vérifier que le ticket n'est pas déjà activé
    if (payment.ticket.status === TicketStatus.PAID) {
      throw new BadRequestException('Ce ticket est déjà activé');
    }

    // Mettre à jour le ticket avec les nouvelles informations et statut PAID
    const updatedTicket = await this.prisma.ticket.update({
      where: { id: payment.ticket.id },
      data: {
        status: TicketStatus.PAID,
        seatNumber: seatNumber || payment.ticket.seatNumber,
        notes: notes || payment.ticket.notes,
      },
      include: {
        trip: {
          include: {
            route: {
              include: {
                line: true,
              },
            },
            bus: {
              include: {
                driver: {
                  select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                    phone: true,
                  },
                },
              },
            },
          },
        },
        pricing: true,
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            phone: true,
          },
        },
      },
    });

    // Envoyer notification WebSocket
    if (this.websocketsGateway) {
      this.websocketsGateway.emitToUser(userId, 'ticket:paid', {
        ticketId: updatedTicket.id,
        tripInfo: {
          routeName: updatedTicket.trip.route.name,
          startTime: updatedTicket.trip.startTime,
          busNumber: updatedTicket.trip.bus.busNumber,
        },
      });
    }

    this.logger.log(
      `Ticket ${updatedTicket.id} activé après paiement confirmé`,
    );

    return updatedTicket;
  }

  async findUserTickets(
    userId: string,
    options?: {
      status?: TicketStatus[];
      includeExpired?: boolean;
      limit?: number;
      offset?: number;
    },
  ) {
    const {
      status,
      includeExpired = false,
      limit = 50,
      offset = 0,
    } = options || {};

    const where: any = { userId };

    if (status && status.length > 0) {
      where.status = { in: status };
    }

    if (!includeExpired) {
      where.OR = [{ validUntil: null }, { validUntil: { gt: new Date() } }];
    }

    return this.prisma.ticket.findMany({
      where,
      include: {
        trip: {
          include: {
            route: {
              include: {
                line: true,
              },
            },
            bus: {
              include: {
                driver: {
                  select: {
                    firstName: true,
                    lastName: true,
                    phone: true,
                  },
                },
              },
            },
          },
        },
        payment: {
          select: {
            id: true,
            amount: true,
            status: true,
            paidAt: true,
            paymentMethod: true,
          },
        },
      },
      orderBy: { purchaseDate: 'desc' },
      skip: offset,
      take: limit,
    });
  }

  async findOne(id: number, userId?: string) {
    const where = userId ? { id, userId } : { id };

    const ticket = await this.prisma.ticket.findFirst({
      where,
      include: {
        trip: {
          include: {
            route: {
              include: {
                line: true,
              },
            },
            bus: {
              include: {
                driver: {
                  select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                    phone: true,
                  },
                },
              },
            },
          },
        },
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            phone: true,
          },
        },
        payment: true,
      },
    });

    if (!ticket) {
      throw new NotFoundException('Ticket non trouvé');
    }

    return ticket;
  }

  async generateQRCode(ticketId: number, userId: string) {
    const ticket = await this.findOne(ticketId, userId);

    if (ticket.status !== TicketStatus.PAID) {
      throw new BadRequestException(
        'Le ticket doit être payé pour générer le code QR',
      );
    }

    if (ticket.validUntil && new Date() > ticket.validUntil) {
      throw new BadRequestException('Ce ticket a expiré');
    }

    try {
      const qrCodeData = JSON.stringify({
        ticketId: ticket.id,
        userId: ticket.userId,
        tripId: ticket.tripId,
        qrCode: ticket.qrCode,
        validUntil: ticket.validUntil,
        passengers: 1,
        generatedAt: new Date().toISOString(),
      });

      const qrCodeImage = await QRCode.toDataURL(qrCodeData, {
        errorCorrectionLevel: 'M',
        width: 256,
        margin: 2,
      });

      return {
        qrCode: qrCodeImage,
        qrCodeData: ticket.qrCode,
        ticketData: ticket,
        expiresAt: ticket.validUntil,
      };
    } catch (error) {
      throw new BadRequestException(
        'Erreur lors de la génération du code QR: ' + error.message,
      );
    }
  }

  async validateTicket(
    validateTicketDto: ValidateTicketDto,
    currentUser: any,
  ): Promise<TicketValidationResponseDto> {
    const { qrCode, latitude, longitude, notes } = validateTicketDto;

    // Seuls les conducteurs et admins peuvent valider les tickets
    if (![Role.DRIVER, Role.ADMIN].includes(currentUser.role)) {
      throw new ForbiddenException(
        'Seuls les conducteurs et administrateurs peuvent valider les tickets',
      );
    }

    const ticket = await this.prisma.ticket.findUnique({
      where: { qrCode },
      include: {
        trip: {
          include: {
            route: {
              include: {
                line: true,
              },
            },
            bus: true,
          },
        },
        user: {
          select: {
            firstName: true,
            lastName: true,
            phone: true,
            email: true,
          },
        },
      },
    });

    if (!ticket) {
      return {
        isValid: false,
        message: 'Code QR invalide ou ticket inexistant',
        errorCode: 'INVALID_QR_CODE',
      };
    }

    if (ticket.status !== TicketStatus.PAID) {
      return {
        isValid: false,
        message: "Ce ticket n'est pas valide pour le voyage",
        errorCode: 'TICKET_NOT_PAID',
      };
    }

    if (ticket.usedAt) {
      return {
        isValid: false,
        message: 'Ce ticket a déjà été utilisé',
        ticket: {
          id: ticket.id,
          qrCode: ticket.qrCode,
          seatNumber: ticket.seatNumber,
          passengerName: `${ticket.user.firstName} ${ticket.user.lastName}`,
          tripInfo: {
            routeName: ticket.trip.route.name,
            startTime: ticket.trip.startTime.toISOString(),
            busNumber: ticket.trip.bus.busNumber,
          },
          usedAt: ticket.usedAt?.toISOString(),
        },
        errorCode: 'TICKET_ALREADY_USED',
      };
    }

    if (ticket.validUntil && new Date() > ticket.validUntil) {
      return {
        isValid: false,
        message: 'Ce ticket a expiré',
        ticket: {
          id: ticket.id,
          qrCode: ticket.qrCode,
          seatNumber: ticket.seatNumber,
          passengerName: `${ticket.user.firstName} ${ticket.user.lastName}`,
          tripInfo: {
            routeName: ticket.trip.route.name,
            startTime: ticket.trip.startTime.toISOString(),
            busNumber: ticket.trip.bus.busNumber,
          },
          validUntil: ticket.validUntil?.toISOString(),
        },
        errorCode: 'TICKET_EXPIRED',
      };
    }

    // Pour les conducteurs : vérifier qu'ils valident pour leur propre bus
    if (currentUser.role === Role.DRIVER) {
      const bus = await this.prisma.bus.findFirst({
        where: {
          id: ticket.trip.busId,
          driverId: currentUser.sub,
        },
      });

      if (!bus) {
        throw new ForbiddenException(
          'Vous ne pouvez valider que les tickets pour votre bus assigné',
        );
      }
    }

    // Marquer le ticket comme utilisé
    const updatedTicket = await this.prisma.ticket.update({
      where: { id: ticket.id },
      data: {
        status: TicketStatus.USED,
        usedAt: new Date(),
        validationNotes: notes,
        validationLocation:
          latitude && longitude ? `${latitude},${longitude}` : undefined,
      },
      include: {
        trip: {
          include: {
            route: {
              include: {
                line: true,
              },
            },
          },
        },
        user: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    // Envoyer notification WebSocket au passager
    if (this.websocketsGateway) {
      this.websocketsGateway.emitToUser(ticket.userId, 'ticket:validated', {
        ticketId: ticket.id,
        validatedAt: updatedTicket.usedAt,
        validatedBy: `${currentUser.firstName} ${currentUser.lastName}`,
      });
    }

    return {
      isValid: true,
      message: 'Ticket validé avec succès',
      ticket: {
        id: updatedTicket.id,
        qrCode: updatedTicket.qrCode,
        seatNumber: updatedTicket.seatNumber,
        passengerName: `${updatedTicket.user.firstName} ${updatedTicket.user.lastName}`,
        tripInfo: {
          routeName: updatedTicket.trip.route.name,
          startTime: updatedTicket.trip.startTime.toISOString(),
          busNumber: ticket.trip.bus.busNumber,
        },
        usedAt: updatedTicket.usedAt?.toISOString(),
      },
    };
  }

  async cancelTicket(ticketId: number, userId: string, reason?: string) {
    const ticket = await this.prisma.ticket.findFirst({
      where: { id: ticketId, userId },
      include: {
        payment: true,
      },
    });

    if (!ticket) {
      throw new NotFoundException('Ticket non trouvé');
    }

    if (ticket.status === TicketStatus.USED) {
      throw new BadRequestException(
        "Impossible d'annuler un ticket déjà utilisé",
      );
    }

    if (ticket.status === TicketStatus.CANCELLED) {
      throw new BadRequestException('Ce ticket est déjà annulé');
    }

    // Vérifier si l'annulation est encore possible (ex: 2h avant le départ)
    const trip = await this.prisma.trip.findUnique({
      where: { id: ticket.tripId },
    });

    if (trip) {
      const hoursBeforeTrip =
        (trip.startTime.getTime() - new Date().getTime()) / (1000 * 60 * 60);
      if (hoursBeforeTrip < 2) {
        throw new BadRequestException(
          "Impossible d'annuler le ticket moins de 2 heures avant le départ",
        );
      }
    }

    const updatedTicket = await this.prisma.ticket.update({
      where: { id: ticketId },
      data: {
        status: TicketStatus.CANCELLED,
        cancellationReason: reason,
        cancelledAt: new Date(),
      },
      include: {
        trip: {
          include: {
            route: {
              include: {
                line: true,
              },
            },
          },
        },
      },
    });

    // Envoyer notification WebSocket
    if (this.websocketsGateway) {
      this.websocketsGateway.emitToUser(userId, 'ticket:cancelled', {
        ticketId: ticket.id,
        refundEligible: ticket.status === TicketStatus.PAID,
      });
    }

    return updatedTicket;
  }

  // ===============================
  // GESTION DES TARIFICATIONS
  // ===============================

  async createPricing(createPricingDto: CreateTicketPricingDto) {
    const {
      name,
      type,
      price,
      validityDuration,
      validityPeriodType,
      lineId,
      routeId,
      description,
      discountPercent,
      validFrom,
      validTo,
      isActive,
      maxTickets,
      specialConditions,
    } = createPricingDto;

    // Vérifier que la ligne/route existe
    if (lineId) {
      const line = await this.prisma.line.findUnique({ where: { id: lineId } });
      if (!line) {
        throw new NotFoundException('Ligne non trouvée');
      }
    }

    if (routeId) {
      const route = await this.prisma.route.findUnique({
        where: { id: routeId },
      });
      if (!route) {
        throw new NotFoundException('Route non trouvée');
      }
    }

    return this.prisma.ticketPricing.create({
      data: {
        name,
        type,
        price,
        validityDuration,
        validityPeriodType,
        lineId,
        routeId,
        description,
        discountPercent: discountPercent || 0,
        validFrom: validFrom ? new Date(validFrom) : null,
        validTo: validTo ? new Date(validTo) : null,
        isActive: isActive ?? true,
        maxTickets,
        specialConditions,
      },
      include: {
        line: true,
        route: {
          include: {
            line: true,
          },
        },
      },
    });
  }

  async findAllPricing(options?: {
    type?: TicketPricingType;
    lineId?: number;
    routeId?: number;
    isActive?: boolean;
  }) {
    const { type, lineId, routeId, isActive } = options || {};

    const where: any = {};

    if (type) where.type = type;
    if (lineId) where.lineId = lineId;
    if (routeId) where.routeId = routeId;
    if (isActive !== undefined) where.isActive = isActive;

    return this.prisma.ticketPricing.findMany({
      where,
      include: {
        line: true,
        route: {
          include: {
            line: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async updatePricing(id: number, updatePricingDto: UpdateTicketPricingDto) {
    const pricing = await this.prisma.ticketPricing.findUnique({
      where: { id },
    });
    if (!pricing) {
      throw new NotFoundException('Tarification non trouvée');
    }

    return this.prisma.ticketPricing.update({
      where: { id },
      data: {
        ...updatePricingDto,
        validFrom: updatePricingDto.validFrom
          ? new Date(updatePricingDto.validFrom)
          : undefined,
        validTo: updatePricingDto.validTo
          ? new Date(updatePricingDto.validTo)
          : undefined,
        updatedAt: new Date(),
      },
      include: {
        line: true,
        route: {
          include: {
            line: true,
          },
        },
      },
    });
  }

  async deletePricing(id: number) {
    const pricing = await this.prisma.ticketPricing.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            tickets: true,
          },
        },
      },
    });

    if (!pricing) {
      throw new NotFoundException('Tarification non trouvée');
    }

    if (pricing._count.tickets > 0) {
      throw new BadRequestException(
        'Impossible de supprimer une tarification utilisée par des tickets',
      );
    }

    return this.prisma.ticketPricing.delete({ where: { id } });
  }

  // ===============================
  // MÉTHODES PRIVÉES ET UTILITAIRES
  // ===============================

  private async getApplicablePricing(tripId: number) {
    const trip = await this.prisma.trip.findUnique({
      where: { id: tripId },
      include: {
        route: {
          include: {
            line: true,
          },
        },
      },
    });

    if (!trip) {
      throw new NotFoundException('Voyage non trouvé');
    }

    // Chercher une tarification spécifique à la route
    let pricing = await this.prisma.ticketPricing.findFirst({
      where: {
        routeId: trip.routeId,
        isActive: true,
        OR: [
          { validFrom: null, validTo: null },
          { validFrom: { lte: new Date() }, validTo: { gte: new Date() } },
        ],
      },
      orderBy: { createdAt: 'desc' },
    });

    // Si pas de tarification route, chercher pour la ligne
    if (!pricing && trip.route.lineId) {
      pricing = await this.prisma.ticketPricing.findFirst({
        where: {
          lineId: trip.route.lineId,
          routeId: null,
          isActive: true,
          OR: [
            { validFrom: null, validTo: null },
            { validFrom: { lte: new Date() }, validTo: { gte: new Date() } },
          ],
        },
        orderBy: { createdAt: 'desc' },
      });
    }

    // Si pas de tarification spécifique, chercher une tarification standard
    if (!pricing) {
      pricing = await this.prisma.ticketPricing.findFirst({
        where: {
          type: TicketPricingType.STANDARD,
          lineId: null,
          routeId: null,
          isActive: true,
          OR: [
            { validFrom: null, validTo: null },
            { validFrom: { lte: new Date() }, validTo: { gte: new Date() } },
          ],
        },
        orderBy: { createdAt: 'desc' },
      });
    }

    // Utiliser le prix du voyage si pas de tarification trouvée
    return (
      pricing || {
        price: trip.price,
        validityDuration: 24,
        validityPeriodType: ValidityPeriodType.HOURS,
      }
    );
  }

  private calculateValidityDate(pricing: any): Date {
    const now = new Date();
    const { validityDuration, validityPeriodType } = pricing;

    switch (validityPeriodType) {
      case ValidityPeriodType.HOURS:
        return new Date(now.getTime() + validityDuration * 60 * 60 * 1000);
      case ValidityPeriodType.DAYS:
        return new Date(now.getTime() + validityDuration * 24 * 60 * 60 * 1000);
      case ValidityPeriodType.WEEKS:
        return new Date(
          now.getTime() + validityDuration * 7 * 24 * 60 * 60 * 1000,
        );
      case ValidityPeriodType.MONTHS:
        const futureDate = new Date(now);
        futureDate.setMonth(futureDate.getMonth() + validityDuration);
        return futureDate;
      default:
        return new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24h par défaut
    }
  }

  async getTicketStatistics(options?: {
    startDate?: string;
    endDate?: string;
    lineId?: number;
    routeId?: number;
    userId?: string;
  }) {
    const { startDate, endDate, lineId, routeId, userId } = options || {};

    const where: any = {};

    if (startDate) where.purchaseDate = { gte: new Date(startDate) };
    if (endDate)
      where.purchaseDate = { ...where.purchaseDate, lte: new Date(endDate) };
    if (userId) where.userId = userId;

    if (lineId || routeId) {
      where.trip = {};
      if (routeId) where.trip.routeId = routeId;
      if (lineId && !routeId) {
        where.trip.route = { lineId };
      }
    }

    const [
      totalTickets,
      paidTickets,
      usedTickets,
      cancelledTickets,
      expiredTickets,
      revenue,
    ] = await Promise.all([
      this.prisma.ticket.count({ where }),
      this.prisma.ticket.count({
        where: { ...where, status: TicketStatus.PAID },
      }),
      this.prisma.ticket.count({
        where: { ...where, status: TicketStatus.USED },
      }),
      this.prisma.ticket.count({
        where: { ...where, status: TicketStatus.CANCELLED },
      }),
      this.prisma.ticket.count({
        where: {
          ...where,
          status: TicketStatus.EXPIRED,
        },
      }),
      this.prisma.payment.aggregate({
        where: {
          status: 'COMPLETED',
          ticket: where,
        },
        _sum: { amount: true },
      }),
    ]);

    return {
      totalTickets,
      paidTickets,
      usedTickets,
      cancelledTickets,
      expiredTickets,
      pendingTickets:
        totalTickets -
        paidTickets -
        usedTickets -
        cancelledTickets -
        expiredTickets,
      totalRevenue: revenue._sum.amount || 0,
      averageTicketPrice:
        paidTickets > 0 ? (revenue._sum.amount || 0) / paidTickets : 0,
      usageRate: paidTickets > 0 ? (usedTickets / paidTickets) * 100 : 0,
      cancellationRate:
        totalTickets > 0 ? (cancelledTickets / totalTickets) * 100 : 0,
    };
  }

  async scanTicketInfo(qrCode: string) {
    const ticket = await this.prisma.ticket.findUnique({
      where: { qrCode },
      include: {
        trip: {
          include: {
            route: {
              include: {
                line: true,
              },
            },
            bus: true,
          },
        },
        user: {
          select: {
            firstName: true,
            lastName: true,
            phone: true,
          },
        },
        payment: {
          select: {
            status: true,
            paidAt: true,
          },
        },
      },
    });

    if (!ticket) {
      return {
        found: false,
        message: 'Ticket non trouvé',
      };
    }

    return {
      found: true,
      ticket: {
        id: ticket.id,
        qrCode: ticket.qrCode,
        status: ticket.status,
        seatNumber: ticket.seatNumber,
        passengers: 1,
        purchaseDate: ticket.purchaseDate,
        validUntil: ticket.validUntil,
        usedAt: ticket.usedAt,
        passengerInfo: {
          name: `${ticket.user.firstName} ${ticket.user.lastName}`,
          phone: ticket.user.phone,
        },
        tripInfo: {
          routeName: ticket.trip.route.name,
          lineName: ticket.trip.route.line?.name,
          startTime: ticket.trip.startTime,
          endTime: ticket.trip.endTime,
          busNumber: ticket.trip.bus.busNumber,
          price: ticket.trip.price,
        },
        paymentInfo: {
          status: ticket.payment?.status,
          paidAt: ticket.payment?.paidAt,
        },
      },
    };
  }
}
