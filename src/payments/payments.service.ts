import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ConflictException,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { ConfigService } from '@nestjs/config';
import {
  CreatePaymentDto,
  CreateTicketPaymentDto,
  PaymentProvider,
  PaymentMethod,
} from './dto/create-payment.dto';
import { PaydunyaCallbackDto } from './dto/paydunya-callback.dto';
import {
  RefundPaymentDto,
  VerifyPaymentDto,
  PaymentStatisticsDto,
} from './dto/create-payment.dto';
import { getPayDunyaConfig } from '../config/paydunya.config';
import { PaymentStatus, TicketStatus } from '@prisma/client';
import { WebsocketsGateway } from '../websockets/websockets.gateway';
import axios from 'axios';
import * as crypto from 'crypto';

// Interface pour les fournisseurs de paiement
interface PaymentProviderInterface {
  createPayment(paymentData: any): Promise<any>;
  verifyPayment(token: string): Promise<any>;
  handleCallback(callbackData: any): Promise<any>;
  refundPayment?(paymentData: any, amount: number): Promise<any>;
}

// Implémentation PayDunya
class PaydunyaProvider implements PaymentProviderInterface {
  private config: any;
  private logger = new Logger(PaydunyaProvider.name);

  constructor(private configService: ConfigService) {
    this.config = getPayDunyaConfig(configService);
  }

  async createPayment(paymentData: any): Promise<any> {
    const headers = {
      'Content-Type': 'application/json',
      'PAYDUNYA-MASTER-KEY': this.config.masterKey,
      'PAYDUNYA-PRIVATE-KEY': this.config.privateKey,
      'PAYDUNYA-TOKEN': this.config.token,
    };

    const payload = {
      invoice: {
        total_amount: paymentData.amount,
        description: paymentData.description,
      },
      store: {
        name: 'SunuBRT',
        tagline: 'Transport public intelligent du Sénégal',
        phone: '+221338601020',
        logo_url: `${process.env.BASE_URL || 'https://sunubrt.com'}/logo.png`,
      },
      custom_data: paymentData.customData,
      actions: {
        callback_url: `${process.env.BASE_URL || 'http://localhost:3000'}/api/v1/payments/paydunya/callback`,
        return_url:
          paymentData.returnUrl ||
          `${process.env.FRONTEND_URL || 'http://localhost:3001'}/payment-success`,
        cancel_url:
          paymentData.cancelUrl ||
          `${process.env.FRONTEND_URL || 'http://localhost:3001'}/payment-cancel`,
      },
    };

    // Ajouter les informations client si disponibles
    if (
      paymentData.customerName ||
      paymentData.customerEmail ||
      paymentData.customerPhone
    ) {
      payload['customer'] = {
        name: paymentData.customerName,
        email: paymentData.customerEmail,
        phone: paymentData.customerPhone,
      };
    }

    try {
      const response = await axios.post(
        `${this.config.baseUrl}/checkout-invoice/create`,
        payload,
        { headers },
      );

      if (response.data.response_code !== '00') {
        throw new Error(`Erreur PayDunya: ${response.data.response_text}`);
      }

      return {
        token: response.data.token,
        paymentUrl: response.data.response_text,
        invoiceUrl: response.data.invoice_url,
        receiptUrl: response.data.receipt_url,
        rawResponse: response.data,
      };
    } catch (error) {
      this.logger.error(
        'Erreur création paiement PayDunya:',
        error.response?.data || error.message,
      );
      throw new BadRequestException(
        `Échec de création du paiement: ${error.message}`,
      );
    }
  }

  async verifyPayment(token: string): Promise<any> {
    const headers = {
      'Content-Type': 'application/json',
      'PAYDUNYA-MASTER-KEY': this.config.masterKey,
      'PAYDUNYA-PRIVATE-KEY': this.config.privateKey,
      'PAYDUNYA-TOKEN': this.config.token,
    };

    try {
      const response = await axios.get(
        `${this.config.baseUrl}/checkout-invoice/confirm/${token}`,
        { headers },
      );

      return {
        status: response.data.status,
        invoice: response.data.invoice,
        customer: response.data.customer,
        rawResponse: response.data,
      };
    } catch (error) {
      this.logger.error(
        'Erreur vérification PayDunya:',
        error.response?.data || error.message,
      );
      throw new BadRequestException(`Échec de vérification: ${error.message}`);
    }
  }

  async handleCallback(callbackData: any): Promise<any> {
    // Vérifier le hash de sécurité
    const expectedHash = crypto
      .createHash('sha512')
      .update(this.config.masterKey)
      .digest('hex');

    // console.log('=== VÉRIFICATION HASH PAYDUNYA ===');
    // console.log('Master Key:', this.config.masterKey.substring(0, 10) + '...');
    // console.log('Hash attendu:', expectedHash);
    // console.log('Hash reçu:', callbackData.data.hash);
    // console.log('Hash valide:', callbackData.data.hash === expectedHash);

    if (callbackData.data.hash !== expectedHash) {
      console.error('ERREUR: Hash de sécurité invalide');
      console.error('Hash attendu:', expectedHash);
      console.error('Hash reçu:', callbackData.data.hash);
      throw new BadRequestException('Hash de sécurité invalide');
    }

    console.log('Hash validé avec succès');

    return {
      status: this.mapPaydunyaStatus(callbackData.data.status),
      transactionRef: callbackData.data.transaction_id,
      amount: callbackData.data.amount_paid,
      fees: callbackData.data.fees,
      netAmount: callbackData.data.net_amount,
      customerInfo: callbackData.data.customer,
      rawData: callbackData.data,
    };
  }

  private mapPaydunyaStatus(status: string): PaymentStatus {
    switch (status.toLowerCase()) {
      case 'completed':
      case 'success':
        return PaymentStatus.COMPLETED;
      case 'cancelled':
      case 'canceled':
        return PaymentStatus.CANCELLED;
      case 'failed':
      case 'error':
        return PaymentStatus.FAILED;
      case 'pending':
      default:
        return PaymentStatus.PENDING;
    }
  }

  async refundPayment(paymentData: any, amount: number): Promise<any> {
    // PayDunya ne supporte pas encore les remboursements automatiques
    // Cette méthode peut être étendue quand la fonctionnalité sera disponible
    throw new BadRequestException(
      'Les remboursements automatiques via PayDunya ne sont pas encore supportés. Contactez le support PayDunya.',
    );
  }
}

// Factory pour les fournisseurs de paiement
class PaymentProviderFactory {
  static create(
    provider: PaymentProvider,
    configService: ConfigService,
  ): PaymentProviderInterface {
    switch (provider) {
      case PaymentProvider.PAYDUNYA:
        return new PaydunyaProvider(configService);
      case PaymentProvider.ORANGE_MONEY:
      case PaymentProvider.WAVE:
      case PaymentProvider.FREE_MONEY:
        // Ces fournisseurs peuvent être implémentés plus tard
        throw new BadRequestException(
          `Le fournisseur ${provider} n'est pas encore supporté`,
        );
      default:
        throw new BadRequestException(
          `Fournisseur de paiement non reconnu: ${provider}`,
        );
    }
  }
}

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);
  private providers: Map<PaymentProvider, PaymentProviderInterface> = new Map();

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
    private websocketsGateway: WebsocketsGateway,
  ) {
    // Initialiser les fournisseurs de paiement disponibles
    this.initializeProviders();
  }

  private initializeProviders() {
    try {
      // PayDunya est le fournisseur principal
      const paydunyaProvider = PaymentProviderFactory.create(
        PaymentProvider.PAYDUNYA,
        this.configService,
      );
      this.providers.set(PaymentProvider.PAYDUNYA, paydunyaProvider);
      this.logger.log('Fournisseur PayDunya initialisé avec succès');
    } catch (error) {
      this.logger.error('Erreur initialisation PayDunya:', error.message);
    }

    // TODO: Ajouter d'autres fournisseurs quand ils seront implémentés
    // this.providers.set(PaymentProvider.ORANGE_MONEY, new OrangeMoneyProvider());
    // this.providers.set(PaymentProvider.WAVE, new WaveProvider());
  }

  async createTicketPayment(
    createTicketPaymentDto: CreateTicketPaymentDto,
    userId: string,
  ) {
    const {
      tripId,
      pricingId,
      seatNumber,
      notes,
      provider = PaymentProvider.PAYDUNYA,
      paymentMethod,
      customerName,
      customerEmail,
      customerPhone,
      returnUrl,
      cancelUrl,
      promoCode,
      currency = 'XOF',
    } = createTicketPaymentDto;

    // Vérifier que le voyage existe et est disponible
    const trip = await this.prisma.trip.findUnique({
      where: { id: tripId },
      include: {
        route: {
          include: {
            line: true,
          },
        },
        bus: true,
        tickets: {
          where: {
            status: {
              in: [TicketStatus.PAID, TicketStatus.PENDING],
            },
          },
        },
      },
    });

    if (!trip) {
      throw new NotFoundException('Voyage non trouvé');
    }

    if (trip.status !== 'SCHEDULED') {
      throw new BadRequestException(
        "Ce voyage n'est plus disponible à la réservation",
      );
    }

    // Vérifier la disponibilité des places (1 seul passager par ticket)
    const occupiedSeats = trip.tickets.length;
    if (occupiedSeats >= trip.availableSeats) {
      throw new BadRequestException(
        `Pas de places disponibles. Places restantes: ${trip.availableSeats - occupiedSeats}`,
      );
    }

    // Vérifier si le siège spécifique est disponible
    if (seatNumber) {
      const existingSeat = await this.prisma.ticket.findFirst({
        where: {
          tripId,
          seatNumber,
          status: { in: [TicketStatus.PAID, TicketStatus.PENDING] },
        },
      });

      if (existingSeat) {
        throw new ConflictException(`Le siège ${seatNumber} est déjà pris`);
      }
    }

    // Vérifier que la tarification existe et est applicable
    const pricing = await this.prisma.ticketPricing.findUnique({
      where: { id: pricingId },
    });

    if (!pricing || !pricing.isActive) {
      throw new NotFoundException('Tarification non trouvée ou inactive');
    }

    // Vérifier que la tarification est applicable à ce voyage
    const isPricingApplicable =
      (!pricing.routeId && !pricing.lineId) || // tarification générale
      pricing.routeId === trip.routeId || // tarification pour cette route
      pricing.lineId === trip.route.lineId; // tarification pour cette ligne

    if (!isPricingApplicable) {
      throw new BadRequestException(
        "Cette tarification n'est pas applicable à ce voyage",
      );
    }

    // Calculer le prix final
    const basePrice = pricing.price;
    const discountAmount = Math.round(
      (basePrice * pricing.discountPercent) / 100,
    );
    let finalPrice = basePrice - discountAmount;

    // Appliquer le code promo si fourni
    if (promoCode) {
      const discount = await this.applyPromoCode(promoCode, finalPrice);
      finalPrice = discount.finalAmount;
    }

    // Récupérer les informations utilisateur
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
      },
    });

    if (!user) {
      throw new NotFoundException('Utilisateur non trouvé');
    }

    const payment = await this.prisma.payment.create({
      data: {
        user: { connect: { id: userId } },

        amount: finalPrice,

        originalAmount: basePrice,

        discountAmount: basePrice - finalPrice,

        currency,

        provider,

        paymentMethod,

        status: PaymentStatus.PENDING,

        customerName: customerName || `${user.firstName} ${user.lastName}`,

        customerEmail: customerEmail || user.email,

        customerPhone: customerPhone || user.phone,

        promoCode,

        customData: {
          tripId,

          pricingId,

          seatNumber,

          notes,

          routeName: trip.route.name,

          startTime: trip.startTime.toISOString(),

          busNumber: trip.bus.busNumber,
        },
      },
    });

    try {
      // Obtenir le fournisseur de paiement
      const paymentProvider = this.providers.get(provider);
      if (!paymentProvider) {
        throw new BadRequestException(`Fournisseur ${provider} non disponible`);
      }

      // Créer le paiement externe
      const externalPayment = await paymentProvider.createPayment({
        amount: finalPrice,
        description: `Ticket SunuBRT - ${trip.route.name} (${new Date(trip.startTime).toLocaleDateString()})`,
        customerName: payment.customerName,
        customerEmail: payment.customerEmail,
        customerPhone: payment.customerPhone,
        returnUrl,
        cancelUrl,
        customData: {
          paymentId: payment.id,
          userId,
          tripId,
          pricingId,
          seatNumber,
          notes,
        },
      });

      // Mettre à jour le paiement avec les informations externes
      const updatedPayment = await this.prisma.payment.update({
        where: { id: payment.id },
        data: {
          externalToken: externalPayment.token,
          externalReference: externalPayment.paymentUrl,
          externalData: externalPayment.rawResponse || {},
        },
      });

      // Envoyer notification WebSocket
      if (this.websocketsGateway) {
        this.websocketsGateway.emitToUser(userId, 'payment:created', {
          paymentId: payment.id,
          paymentUrl: externalPayment.paymentUrl,
          amount: finalPrice,
        });
      }

      this.logger.log(
        `Paiement de ticket créé: ${payment.id} pour le voyage ${tripId}`,
      );

      return {
        paymentId: payment.id,
        paymentUrl: externalPayment.paymentUrl,
        paymentToken: externalPayment.token,
        amount: finalPrice,
        currency,
        status: PaymentStatus.PENDING,
        tripInfo: {
          id: trip.id,
          routeName: trip.route.name,
          startTime: trip.startTime.toISOString(),
          busNumber: trip.bus.busNumber,
          availableSeats: trip.availableSeats - occupiedSeats,
        },
        pricingInfo: {
          id: pricing.id,
          name: pricing.name,
          type: pricing.type,
          originalPrice: basePrice,
          finalPrice,
          discountPercent: pricing.discountPercent,
          validityDuration: pricing.validityDuration,
          validityPeriodType: pricing.validityPeriodType,
        },
        reservedSeat: seatNumber,
        reservationValidityMinutes: 15,
        reservationExpiresAt: new Date(
          Date.now() + 15 * 60 * 1000,
        ).toISOString(),
      };
    } catch (error) {
      // Supprimer le paiement en cas d'erreur
      await this.prisma.payment.delete({ where: { id: payment.id } });
      this.logger.error('Erreur création paiement de ticket:', error.message);
      throw new InternalServerErrorException(
        'Échec de création du paiement: ' + error.message,
      );
    }
  }

  async createPayment(createPaymentDto: CreatePaymentDto, userId: string) {
    const {
      ticketId,
      provider = PaymentProvider.PAYDUNYA,
      paymentMethod,
      customerName,
      customerEmail,
      customerPhone,
      returnUrl,
      cancelUrl,
      customData,
      notes,
      promoCode,
      currency = 'XOF',
    } = createPaymentDto;

    // Si aucun ticketId n'est fourni, retourner une erreur
    if (!ticketId) {
      throw new BadRequestException(
        'ID du ticket requis pour cette méthode. Utilisez createTicketPayment pour créer un paiement de ticket.',
      );
    }

    // Vérifier que le ticket existe et appartient à l'utilisateur
    const ticket = await this.prisma.ticket.findFirst({
      where: {
        id: ticketId,
        userId,
        status: TicketStatus.PENDING,
      },
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
            email: true,
            phone: true,
          },
        },
        payment: true,
      },
    });

    if (!ticket) {
      throw new NotFoundException('Ticket non trouvé ou déjà traité');
    }

    if (ticket.payment) {
      throw new ConflictException('Ce ticket a déjà un paiement associé');
    }

    // Calculer le montant avec promotions éventuelles
    let finalAmount = ticket.trip.price;
    let discountAmount = 0;

    if (promoCode) {
      const discount = await this.applyPromoCode(promoCode, finalAmount);
      discountAmount = discount.discountAmount;
      finalAmount = discount.finalAmount;
    }

    // Créer l'enregistrement de paiement en base

    const payment = await this.prisma.payment.create({
      data: {
        ticket: { connect: { id: ticketId } },

        user: { connect: { id: userId } },

        amount: finalAmount,

        originalAmount: ticket.trip.price,

        discountAmount,

        currency,

        provider,

        paymentMethod,

        status: PaymentStatus.PENDING,

        customerName:
          customerName || `${ticket.user.firstName} ${ticket.user.lastName}`,

        customerEmail: customerEmail || ticket.user.email,

        customerPhone: customerPhone || ticket.user.phone,

        notes,

        promoCode,

        customData: customData || {},
      },
    });

    try {
      // Obtenir le fournisseur de paiement
      const paymentProvider = this.providers.get(provider);
      if (!paymentProvider) {
        throw new BadRequestException(`Fournisseur ${provider} non disponible`);
      }

      // Créer le paiement externe
      const externalPayment = await paymentProvider.createPayment({
        amount: finalAmount,
        description: `Ticket SunuBRT - ${ticket.trip.route.name} (${new Date(ticket.trip.startTime).toLocaleDateString()})`,
        customerName: payment.customerName,
        customerEmail: payment.customerEmail,
        customerPhone: payment.customerPhone,
        returnUrl,
        cancelUrl,
        customData: {
          paymentId: payment.id,
          ticketId: ticket.id,
          userId,
          tripId: ticket.tripId,
          ...customData,
        },
      });

      // Mettre à jour le paiement avec les informations externes
      const updatedPayment = await this.prisma.payment.update({
        where: { id: payment.id },
        data: {
          externalToken: externalPayment.token,
          externalReference: externalPayment.paymentUrl,
          externalData: externalPayment.rawResponse || {},
        },
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
                },
              },
            },
          },
        },
      });

      // Envoyer notification WebSocket
      if (this.websocketsGateway) {
        this.websocketsGateway.emitToUser(userId, 'payment:created', {
          paymentId: payment.id,
          paymentUrl: externalPayment.paymentUrl,
          amount: finalAmount,
        });
      }

      return {
        payment: updatedPayment,
        paymentUrl: externalPayment.paymentUrl,
        token: externalPayment.token,
        invoiceUrl: externalPayment.invoiceUrl,
        receiptUrl: externalPayment.receiptUrl,
        expiresAt: new Date(Date.now() + 30 * 60 * 1000), // 30 minutes
      };
    } catch (error) {
      // Supprimer le paiement en cas d'erreur
      await this.prisma.payment.delete({ where: { id: payment.id } });
      this.logger.error('Erreur création paiement:', error.message);
      throw new InternalServerErrorException(
        'Échec de création du paiement: ' + error.message,
      );
    }
  }

  async getPaymentStatus(paymentId: number, userId: string) {
    const payment = await this.prisma.payment.findFirst({
      where: {
        id: paymentId,
        userId,
      },
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
                bus: true,
              },
            },
          },
        },
      },
    });

    if (!payment) {
      throw new NotFoundException('Paiement non trouvé');
    }

    // Vérifier le statut auprès du fournisseur si le paiement est en attente
    if (payment.status === PaymentStatus.PENDING && payment.externalToken) {
      try {
        const provider = this.providers.get(
          payment.provider as PaymentProvider,
        );
        if (provider) {
          const externalStatus = await provider.verifyPayment(
            payment.externalToken,
          );

          // Mettre à jour le statut si nécessaire
          if (externalStatus.status !== payment.status) {
            await this.updatePaymentStatus(payment.id, externalStatus);
          }
        }
      } catch (error) {
        this.logger.warn(
          `Erreur vérification paiement ${paymentId}:`,
          error.message,
        );
      }
    }

    return payment;
  }

  async handlePaydunyaCallback(callbackDto: PaydunyaCallbackDto) {
    const { data } = callbackDto;

    // Logging pour debugging
    // console.log('=== CALLBACK PAYDUNYA REÇU ===');
    // console.log('Token:', data.invoice?.token);
    // console.log('Statut:', data.status);
    // console.log('Hash reçu:', data.hash);
    // console.log('Données complètes:', JSON.stringify(data, null, 2));

    try {
      const provider = this.providers.get(PaymentProvider.PAYDUNYA);
      if (!provider) {
        console.error('Fournisseur PayDunya non disponible');
        throw new BadRequestException('Fournisseur PayDunya non disponible');
      }

      // Traiter le callback via le fournisseur
      console.log('Traitement du callback via le fournisseur...');
      const callbackResult = await provider.handleCallback(callbackDto);
      console.log('Résultat du callback:', callbackResult);

      // Trouver le paiement par token
      // console.log('Recherche du paiement avec token:', data.invoice.token);
      const payment = await this.prisma.payment.findFirst({
        where: {
          externalToken: data.invoice.token,
        },
        include: {
          ticket: true,
          user: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      });

      if (!payment) {
        console.error('Paiement non trouvé pour le token:', data.invoice.token);
        throw new NotFoundException('Paiement non trouvé');
      }

      console.log(
        'Paiement trouvé:',
        payment.id,
        'Statut actuel:',
        payment.status,
      );

      // Déterminer le statut du paiement
      const paymentStatus = callbackResult.status;
      let ticket = null;

      // Mettre à jour le paiement et créer/mettre à jour le ticket dans une transaction
      const result = await this.prisma.$transaction(async (tx) => {
        // Mettre à jour le paiement
        const updatedPayment = await tx.payment.update({
          where: { id: payment.id },
          data: {
            status: paymentStatus,
            paymentMethod:
              callbackResult.customerInfo?.payment_method ||
              payment.paymentMethod,
            paidAt:
              paymentStatus === PaymentStatus.COMPLETED ? new Date() : null,
            transactionReference: callbackResult.transactionRef,
            externalData: {
              ...(typeof payment.externalData === 'object' &&
              payment.externalData !== null
                ? payment.externalData
                : {}),
              callback: callbackResult.rawData,
            },
            fees: callbackResult.fees || 0,
            netAmount: callbackResult.netAmount || payment.amount,
          },
        });

        let createdTicket = null;

        // Si le paiement est réussi, créer automatiquement le ticket
        if (paymentStatus === PaymentStatus.COMPLETED) {
          // Récupérer les données du voyage et de la tarification depuis customData
          const customData = payment.customData as any;
          const tripId = customData?.tripId;
          const pricingId = customData?.pricingId;
          const seatNumber = customData?.seatNumber;
          const notes = customData?.notes;

          if (!tripId || !pricingId) {
            throw new BadRequestException(
              'Informations du voyage manquantes dans le paiement',
            );
          }

          // Vérifier que le voyage existe
          const trip = await tx.trip.findUnique({
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

          // Vérifier la tarification
          const pricing = await tx.ticketPricing.findUnique({
            where: { id: pricingId },
          });

          if (!pricing) {
            throw new NotFoundException('Tarification non trouvée');
          }

          // Calculer la date de validité
          const validUntil = new Date();
          switch (pricing.validityPeriodType) {
            case 'HOURS':
              validUntil.setHours(
                validUntil.getHours() + pricing.validityDuration,
              );
              break;
            case 'DAYS':
              validUntil.setDate(
                validUntil.getDate() + pricing.validityDuration,
              );
              break;
            case 'WEEKS':
              validUntil.setDate(
                validUntil.getDate() + pricing.validityDuration * 7,
              );
              break;
            case 'MONTHS':
              validUntil.setMonth(
                validUntil.getMonth() + pricing.validityDuration,
              );
              break;
            default:
              validUntil.setDate(validUntil.getDate() + 1); // Par défaut 1 jour
          }

          // Générer un code QR unique pour le ticket
          const qrCode = `SUNUBRT-${Date.now()}-${payment.id}`;

          // Créer le ticket
          createdTicket = await tx.ticket.create({
            data: {
              userId: payment.userId,
              tripId,
              pricingId,
              seatNumber,
              qrCode,
              status: TicketStatus.PAID,
              validUntil,
              notes,
              purchaseDate: new Date(),
            },
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
              pricing: true,
            },
          });

          // Mettre à jour le paiement avec l'ID du ticket créé
          await tx.payment.update({
            where: { id: payment.id },
            data: {
              ticketId: createdTicket.id,
            },
          });
        }

        return { updatedPayment, createdTicket };
      });

      ticket = result.createdTicket;

      // Envoyer notifications WebSocket
      if (this.websocketsGateway) {
        if (paymentStatus === PaymentStatus.COMPLETED && ticket) {
          this.websocketsGateway.emitToUser(
            payment.userId,
            'payment:completed',
            {
              paymentId: payment.id,
              ticketId: ticket.id,
              status: paymentStatus,
              amount: payment.amount,
            },
          );

          this.websocketsGateway.emitToUser(payment.userId, 'ticket:created', {
            ticketId: ticket.id,
            tripInfo: {
              routeName: ticket.trip.route.name,
              startTime: ticket.trip.startTime,
              busNumber: ticket.trip.bus.busNumber,
            },
          });
        } else {
          this.websocketsGateway.emitToUser(payment.userId, 'payment:failed', {
            paymentId: payment.id,
            status: paymentStatus,
            amount: payment.amount,
          });
        }
      }

      this.logger.log(`Paiement ${payment.id} mis à jour: ${paymentStatus}`);
      if (ticket) {
        this.logger.log(
          `Ticket ${ticket.id} créé automatiquement après paiement réussi`,
        );
      }

      return {
        message: 'Callback traité avec succès',
        paymentStatus,
        ticketCreated: !!ticket,
        ticketId: ticket?.id,
      };
    } catch (error) {
      this.logger.error('Erreur traitement callback PayDunya:', error.message);
      throw error;
    }
  }

  async refundPayment(
    paymentId: number,
    refundDto: RefundPaymentDto,
    adminUserId: string,
  ) {
    const { amount, reason, adminNotes, sendEmail = true } = refundDto;

    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
      include: {
        ticket: {
          include: {
            trip: true,
          },
        },
        user: {
          select: {
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    if (!payment) {
      throw new NotFoundException('Paiement non trouvé');
    }

    if (payment.status !== PaymentStatus.COMPLETED) {
      throw new BadRequestException(
        'Seuls les paiements complétés peuvent être remboursés',
      );
    }

    if (amount > payment.amount) {
      throw new BadRequestException(
        'Le montant de remboursement ne peut pas dépasser le montant payé',
      );
    }

    // Vérifier si le ticket peut être remboursé
    if (payment.ticket.status === TicketStatus.EXPIRED) {
      throw new BadRequestException(
        'Impossible de rembourser un ticket déjà utilisé',
      );
    }

    try {
      // Créer l'enregistrement de remboursement
      const refund = await this.prisma.refund.create({
        data: {
          paymentId,
          amount,
          reason,
          adminNotes,
          adminUserId,
          status: 'PENDING',
        },
      });

      // Tenter le remboursement automatique via le fournisseur
      let refundStatus = 'MANUAL'; // Par défaut, remboursement manuel

      try {
        const provider = this.providers.get(
          payment.provider as PaymentProvider,
        );
        if (provider && provider.refundPayment) {
          await provider.refundPayment(payment, amount);
          refundStatus = 'COMPLETED';
        }
      } catch (error) {
        this.logger.warn(
          `Remboursement automatique échoué pour ${paymentId}:`,
          error.message,
        );
        refundStatus = 'MANUAL';
      }

      // Mettre à jour le remboursement
      const updatedRefund = await this.prisma.refund.update({
        where: { id: refund.id },
        data: {
          status: refundStatus,
          processedAt: refundStatus === 'COMPLETED' ? new Date() : null,
        },
      });

      // Si remboursement complet, annuler le ticket
      if (amount === payment.amount) {
        await this.prisma.ticket.update({
          where: { id: payment.ticketId },
          data: {
            status: TicketStatus.CANCELLED,
            cancellationReason: `Remboursement: ${reason}`,
            cancelledAt: new Date(),
          },
        });
      }

      // Envoyer notification
      if (this.websocketsGateway) {
        this.websocketsGateway.emitToUser(payment.userId, 'refund:initiated', {
          refundId: refund.id,
          amount,
          status: refundStatus,
        });
      }

      // TODO: Envoyer email si sendEmail === true

      return {
        refund: updatedRefund,
        status: refundStatus,
        message:
          refundStatus === 'COMPLETED'
            ? 'Remboursement traité automatiquement'
            : 'Remboursement en attente de traitement manuel',
      };
    } catch (error) {
      this.logger.error('Erreur lors du remboursement:', error.message);
      throw new InternalServerErrorException(
        'Erreur lors du traitement du remboursement',
      );
    }
  }

  async verifyPayment(verifyDto: VerifyPaymentDto) {
    const { paymentToken, provider = PaymentProvider.PAYDUNYA } = verifyDto;

    const paymentProvider = this.providers.get(provider);
    if (!paymentProvider) {
      throw new BadRequestException(`Fournisseur ${provider} non disponible`);
    }

    try {
      const verification = await paymentProvider.verifyPayment(paymentToken);

      // Trouver et mettre à jour le paiement local si nécessaire
      const payment = await this.prisma.payment.findFirst({
        where: { externalToken: paymentToken },
      });

      if (payment && verification.status !== payment.status) {
        await this.updatePaymentStatus(payment.id, verification);
      }

      return {
        status: verification.status,
        verified: true,
        invoice: verification.invoice,
        customer: verification.customer,
        localPayment: payment,
      };
    } catch (error) {
      this.logger.error('Erreur vérification paiement:', error.message);
      throw new BadRequestException('Échec de vérification du paiement');
    }
  }

  async getPaymentStatistics(statsDto: PaymentStatisticsDto) {
    const { startDate, endDate, provider, paymentMethod } = statsDto;

    const where: any = {};

    if (startDate) where.createdAt = { gte: new Date(startDate) };
    if (endDate)
      where.createdAt = { ...where.createdAt, lte: new Date(endDate) };
    if (provider) where.provider = provider;
    if (paymentMethod) where.paymentMethod = paymentMethod;

    const [
      totalPayments,
      completedPayments,
      pendingPayments,
      failedPayments,
      cancelledPayments,
      totalRevenue,
      totalFees,
    ] = await Promise.all([
      this.prisma.payment.count({ where }),
      this.prisma.payment.count({
        where: { ...where, status: PaymentStatus.COMPLETED },
      }),
      this.prisma.payment.count({
        where: { ...where, status: PaymentStatus.PENDING },
      }),
      this.prisma.payment.count({
        where: { ...where, status: PaymentStatus.FAILED },
      }),
      this.prisma.payment.count({
        where: { ...where, status: PaymentStatus.CANCELLED },
      }),
      this.prisma.payment.aggregate({
        where: { ...where, status: PaymentStatus.COMPLETED },
        _sum: { amount: true, netAmount: true },
      }),
      this.prisma.payment.aggregate({
        where: { ...where, status: PaymentStatus.COMPLETED },
        _sum: { fees: true },
      }),
    ]);

    return {
      totalPayments,
      completedPayments,
      pendingPayments,
      failedPayments,
      cancelledPayments,
      successRate:
        totalPayments > 0 ? (completedPayments / totalPayments) * 100 : 0,
      totalRevenue: totalRevenue._sum.amount || 0,
      netRevenue: totalRevenue._sum.netAmount || 0,
      totalFees: totalFees._sum.fees || 0,
      averagePayment:
        completedPayments > 0
          ? (totalRevenue._sum.amount || 0) / completedPayments
          : 0,
    };
  }

  // Méthodes privées et utilitaires

  private async updatePaymentStatus(paymentId: number, statusData: any) {
    return this.prisma.payment.update({
      where: { id: paymentId },
      data: {
        status: statusData.status,
        paidAt:
          statusData.status === PaymentStatus.COMPLETED ? new Date() : null,
        externalData: {
          verification: statusData,
        },
      },
    });
  }

  private async applyPromoCode(promoCode: string, amount: number) {
    const promo = await this.prisma.promoCode.findFirst({
      where: {
        code: promoCode,
        isActive: true,
        AND: [
          {
            OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
          },
          {
            OR: [
              { maxUses: null },
              { currentUses: { lt: this.prisma.promoCode.fields.maxUses } },
            ],
          },
        ],
      },
    });

    if (!promo) {
      throw new BadRequestException('Code promo invalide ou expiré');
    }

    const discountAmount = promo.isPercentage
      ? Math.floor((amount * promo.value) / 100)
      : Math.min(promo.value, amount);

    const finalAmount = Math.max(amount - discountAmount, 0);

    // Incrémenter l'utilisation du code promo
    await this.prisma.promoCode.update({
      where: { id: promo.id },
      data: {
        currentUses: { increment: 1 },
      },
    });

    return {
      promoCode: promo,
      discountAmount,
      finalAmount,
    };
  }

  async cancelPayment(paymentId: number, userId: string, reason?: string) {
    const payment = await this.prisma.payment.findFirst({
      where: { id: paymentId, userId },
    });

    if (!payment) {
      throw new NotFoundException('Paiement non trouvé');
    }

    if (payment.status === PaymentStatus.COMPLETED) {
      throw new BadRequestException(
        "Impossible d'annuler un paiement complété. Utilisez le remboursement.",
      );
    }

    if (payment.status === PaymentStatus.CANCELLED) {
      throw new BadRequestException('Ce paiement est déjà annulé');
    }

    const updatedPayment = await this.prisma.payment.update({
      where: { id: paymentId },
      data: {
        status: PaymentStatus.CANCELLED,
        cancellationReason: reason,
        cancelledAt: new Date(),
      },
    });

    // Annuler le ticket associé
    await this.prisma.ticket.update({
      where: { id: payment.ticketId },
      data: {
        status: TicketStatus.CANCELLED,
        cancellationReason: `Paiement annulé: ${reason || 'Raison non spécifiée'}`,
        cancelledAt: new Date(),
      },
    });

    return updatedPayment;
  }

  async findAll(options?: {
    userId?: string;
    status?: PaymentStatus[];
    provider?: PaymentProvider;
    limit?: number;
    offset?: number;
  }) {
    const { userId, status, provider, limit = 50, offset = 0 } = options || {};

    const where: any = {};
    if (userId) where.userId = userId;
    if (status && status.length > 0) where.status = { in: status };
    if (provider) where.provider = provider;

    return this.prisma.payment.findMany({
      where,
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
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip: offset,
      take: limit,
    });
  }

  async findOne(id: number, userId?: string) {
    const where = userId ? { id, userId } : { id };

    const payment = await this.prisma.payment.findFirst({
      where,
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
                bus: true,
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
          },
        },
        refunds: true,
      },
    });

    if (!payment) {
      throw new NotFoundException('Paiement non trouvé');
    }

    return payment;
  }
}
