import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  UseGuards,
  Query,
  Request,
  HttpStatus,
  ParseIntPipe,
  HttpCode,
  Req,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
  ApiParam,
} from '@nestjs/swagger';
import { PaymentsService } from './payments.service';
import {
  CreatePaymentDto,
  CreateTicketPaymentDto,
  PaymentProvider,
  PaymentMethod,
  RefundPaymentDto,
  VerifyPaymentDto,
} from './dto/create-payment.dto';
import {
  PaydunyaCallbackDto,
  PaydunyaWebhookDto,
} from './dto/paydunya-callback.dto';
import { AuthGuard } from '../common/guards/auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Public } from '../common/decorators/public.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Role, PaymentStatus } from '@prisma/client';

type AuthenticatedRequest = Request & {
  user: { sub: string } & Record<string, unknown>;
};

@ApiTags('Payments')
@Controller('payments')
@UseGuards(AuthGuard, RolesGuard)
@ApiBearerAuth()
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  // ===============================
  // ENDPOINTS PAIEMENTS UTILISATEURS
  // ===============================

  @Post()
  @ApiOperation({
    summary: 'Créer un paiement',
    description:
      'Crée un nouveau paiement pour un ticket avec redirection vers le fournisseur de paiement',
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Paiement créé avec succès',
    schema: {
      type: 'object',
      properties: {
        payment: {
          type: 'object',
          description: 'Informations du paiement créé',
        },
        paymentUrl: {
          type: 'string',
          description: 'URL de redirection vers le fournisseur de paiement',
        },
        token: {
          type: 'string',
          description: 'Token de paiement externe',
        },
        expiresAt: {
          type: 'string',
          description: "Date d'expiration du paiement",
        },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Données invalides ou fournisseur non supporté',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Ticket non trouvé ou déjà traité',
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'Paiement déjà existant pour ce ticket',
  })
  @Post('ticket')
  @UseGuards(AuthGuard)
  @ApiOperation({
    summary: 'Créer un paiement pour un nouveau ticket',
    description:
      'Initie un paiement pour un ticket qui sera créé automatiquement après paiement réussi',
  })
  @ApiResponse({
    status: 201,
    description: 'Paiement de ticket créé avec succès',
    schema: {
      type: 'object',
      properties: {
        paymentId: { type: 'number', example: 123 },
        paymentUrl: {
          type: 'string',
          example:
            'https://app.paydunya.com/sandbox-checkout/checkout-invoice/token123',
        },
        paymentToken: { type: 'string', example: 'paydunya_token_abc123' },
        amount: { type: 'number', example: 500 },
        currency: { type: 'string', example: 'XOF' },
        status: { type: 'string', example: 'PENDING' },
        tripInfo: {
          type: 'object',
          properties: {
            id: { type: 'number' },
            routeName: { type: 'string' },
            startTime: { type: 'string' },
            busNumber: { type: 'string' },
            availableSeats: { type: 'number' },
          },
        },
        pricingInfo: {
          type: 'object',
          properties: {
            id: { type: 'number' },
            name: { type: 'string' },
            type: { type: 'string' },
            originalPrice: { type: 'number' },
            finalPrice: { type: 'number' },
            discountPercent: { type: 'number' },
            validityDuration: { type: 'number' },
            validityPeriodType: { type: 'string' },
          },
        },
        reservedSeat: { type: 'string', nullable: true },
        reservationValidityMinutes: { type: 'number' },
        reservationExpiresAt: { type: 'string' },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Données de paiement invalides',
  })
  @ApiResponse({
    status: 404,
    description: 'Voyage ou tarification non trouvé(e)',
  })
  @ApiResponse({
    status: 409,
    description: 'Siège déjà pris',
  })
  @ApiResponse({
    status: 500,
    description: 'Erreur interne du serveur',
  })
  async createTicketPayment(
    @Body() createTicketPaymentDto: CreateTicketPaymentDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.paymentsService.createTicketPayment(
      createTicketPaymentDto,
      req.user.sub,
    );
  }

  async create(
    @Body() createPaymentDto: CreatePaymentDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.paymentsService.createPayment(createPaymentDto, req.user.sub);
  }

  @Get('my-payments')
  @ApiOperation({
    summary: 'Mes paiements',
    description: "Liste tous les paiements de l'utilisateur connecté",
  })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: PaymentStatus,
    isArray: true,
    description: 'Filtrer par statut de paiement',
  })
  @ApiQuery({
    name: 'provider',
    required: false,
    enum: PaymentProvider,
    description: 'Filtrer par fournisseur de paiement',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Nombre maximum de résultats (défaut: 50)',
  })
  @ApiQuery({
    name: 'offset',
    required: false,
    type: Number,
    description: 'Décalage pour la pagination (défaut: 0)',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "Liste des paiements de l'utilisateur",
  })
  async findUserPayments(
    @CurrentUser() user: any,
    @Query('status') status?: string[],
    @Query('provider') provider?: PaymentProvider,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
  ) {
    const statusArray = status
      ? Array.isArray(status)
        ? status
        : [status]
      : undefined;

    return this.paymentsService.findAll({
      userId: user.sub,
      status: statusArray as PaymentStatus[],
      provider,
      limit: limit ? parseInt(limit.toString()) : 50,
      offset: offset ? parseInt(offset.toString()) : 0,
    });
  }

  @Get(':id/status')
  @ApiOperation({
    summary: "Statut d'un paiement",
    description:
      "Récupère le statut actuel d'un paiement avec vérification auprès du fournisseur",
  })
  @ApiParam({
    name: 'id',
    type: Number,
    description: 'ID du paiement',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Statut du paiement',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Paiement non trouvé',
  })
  async getPaymentStatus(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: any,
  ) {
    return this.paymentsService.getPaymentStatus(id, user.sub);
  }

  @Get(':id')
  @ApiOperation({
    summary: "Détails d'un paiement",
    description: "Récupère les détails complets d'un paiement",
  })
  @ApiParam({
    name: 'id',
    type: Number,
    description: 'ID du paiement',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Détails du paiement',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Paiement non trouvé',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Accès interdit (pas votre paiement)',
  })
  async findOne(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: any,
  ) {
    // Les utilisateurs normaux ne peuvent voir que leurs propres paiements
    // Les admins peuvent voir tous les paiements
    const userId = user.role === Role.ADMIN ? undefined : user.sub;
    return this.paymentsService.findOne(id, userId);
  }

  @Patch(':id/cancel')
  @ApiOperation({
    summary: 'Annuler un paiement',
    description: 'Annule un paiement en attente',
  })
  @ApiParam({
    name: 'id',
    type: Number,
    description: 'ID du paiement à annuler',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Paiement annulé avec succès',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Paiement déjà complété ou déjà annulé',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Paiement non trouvé',
  })
  async cancelPayment(
    @Param('id', ParseIntPipe) id: number,
    @Body('reason') reason: string,
    @CurrentUser() user: any,
  ) {
    return this.paymentsService.cancelPayment(id, user.sub, reason);
  }

  // ===============================
  // ENDPOINTS CALLBACKS PUBLICS
  // ===============================

  @Post('paydunya/callback')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Callback PayDunya',
    description:
      'Endpoint de callback pour les notifications PayDunya (utilisé par PayDunya)',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Callback traité avec succès',
    schema: {
      type: 'object',
      properties: {
        message: {
          type: 'string',
          example: 'Callback traité avec succès',
        },
        paymentStatus: {
          type: 'string',
          enum: ['COMPLETED', 'FAILED', 'CANCELLED', 'PENDING'],
        },
        ticketStatus: {
          type: 'string',
          enum: ['PAID', 'CANCELLED', 'PENDING'],
        },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Hash de sécurité invalide ou données manquantes',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Paiement non trouvé',
  })
  async handlePaydunyaCallback(@Body() callbackDto: PaydunyaCallbackDto) {
    return this.paymentsService.handlePaydunyaCallback(callbackDto);
  }

  @Post('paydunya/webhook')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Webhook PayDunya',
    description:
      'Endpoint webhook pour les événements PayDunya (utilisé par PayDunya)',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Webhook traité avec succès',
  })
  async handlePaydunyaWebhook(@Body() webhookDto: PaydunyaWebhookDto) {
    // Traiter le webhook comme un callback
    return this.paymentsService.handlePaydunyaCallback({
      data: webhookDto.data,
    });
  }

  // ===============================
  // ENDPOINTS VÉRIFICATION
  // ===============================

  @Post('verify')
  @ApiOperation({
    summary: 'Vérifier un paiement',
    description:
      "Vérifie le statut d'un paiement auprès du fournisseur externe",
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Statut de vérification',
    schema: {
      type: 'object',
      properties: {
        status: {
          type: 'string',
          enum: ['COMPLETED', 'FAILED', 'CANCELLED', 'PENDING'],
        },
        verified: {
          type: 'boolean',
          description: 'Indique si la vérification a réussi',
        },
        invoice: {
          type: 'object',
          description: 'Informations de la facture',
        },
        customer: {
          type: 'object',
          description: 'Informations du client',
        },
        localPayment: {
          type: 'object',
          description: 'Paiement local correspondant',
        },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Token invalide ou fournisseur non supporté',
  })
  async verifyPayment(@Body() verifyDto: VerifyPaymentDto) {
    return this.paymentsService.verifyPayment(verifyDto);
  }

  // ===============================
  // ENDPOINTS ADMINISTRATIFS
  // ===============================

  @Get('admin/all')
  @Roles(Role.ADMIN)
  @ApiOperation({
    summary: 'Tous les paiements (Admin)',
    description: 'Liste tous les paiements du système (Admin uniquement)',
  })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: PaymentStatus,
    isArray: true,
    description: 'Filtrer par statut',
  })
  @ApiQuery({
    name: 'provider',
    required: false,
    enum: PaymentProvider,
    description: 'Filtrer par fournisseur',
  })
  @ApiQuery({
    name: 'userId',
    required: false,
    type: String,
    description: 'Filtrer par utilisateur',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Nombre maximum de résultats',
  })
  @ApiQuery({
    name: 'offset',
    required: false,
    type: Number,
    description: 'Décalage pour la pagination',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Liste de tous les paiements',
  })
  async findAllAdmin(
    @Query('status') status?: string[],
    @Query('provider') provider?: PaymentProvider,
    @Query('userId') userId?: string,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
  ) {
    const statusArray = status
      ? Array.isArray(status)
        ? status
        : [status]
      : undefined;

    return this.paymentsService.findAll({
      status: statusArray as PaymentStatus[],
      provider,
      userId,
      limit: limit ? parseInt(limit.toString()) : 50,
      offset: offset ? parseInt(offset.toString()) : 0,
    });
  }

  @Get('admin/statistics')
  @Roles(Role.ADMIN)
  @ApiOperation({
    summary: 'Statistiques des paiements',
    description:
      'Récupère les statistiques détaillées des paiements (Admin uniquement)',
  })
  @ApiQuery({
    name: 'startDate',
    required: false,
    type: String,
    description: 'Date de début (ISO 8601)',
  })
  @ApiQuery({
    name: 'endDate',
    required: false,
    type: String,
    description: 'Date de fin (ISO 8601)',
  })
  @ApiQuery({
    name: 'provider',
    required: false,
    enum: PaymentProvider,
    description: 'Filtrer par fournisseur',
  })
  @ApiQuery({
    name: 'paymentMethod',
    required: false,
    enum: PaymentMethod,
    description: 'Filtrer par méthode de paiement',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Statistiques des paiements',
    schema: {
      type: 'object',
      properties: {
        totalPayments: {
          type: 'number',
          description: 'Nombre total de paiements',
        },
        completedPayments: {
          type: 'number',
          description: 'Nombre de paiements complétés',
        },
        pendingPayments: {
          type: 'number',
          description: 'Nombre de paiements en attente',
        },
        failedPayments: {
          type: 'number',
          description: 'Nombre de paiements échoués',
        },
        successRate: {
          type: 'number',
          description: 'Taux de succès en pourcentage',
        },
        totalRevenue: {
          type: 'number',
          description: 'Revenus totaux en FCFA',
        },
        netRevenue: {
          type: 'number',
          description: 'Revenus nets (après frais) en FCFA',
        },
        totalFees: {
          type: 'number',
          description: 'Total des frais en FCFA',
        },
        averagePayment: {
          type: 'number',
          description: 'Montant moyen par paiement',
        },
      },
    },
  })
  async getPaymentStatistics(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('provider') provider?: PaymentProvider,
    @Query('paymentMethod') paymentMethod?: PaymentMethod,
  ) {
    return this.paymentsService.getPaymentStatistics({
      startDate,
      endDate,
      provider,
      paymentMethod,
    });
  }

  @Post('admin/:id/refund')
  @Roles(Role.ADMIN)
  @ApiOperation({
    summary: 'Rembourser un paiement',
    description: 'Initie un remboursement pour un paiement (Admin uniquement)',
  })
  @ApiParam({
    name: 'id',
    type: Number,
    description: 'ID du paiement à rembourser',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Remboursement initié avec succès',
    schema: {
      type: 'object',
      properties: {
        refund: {
          type: 'object',
          description: 'Informations du remboursement',
        },
        status: {
          type: 'string',
          enum: ['COMPLETED', 'MANUAL', 'PENDING'],
          description: 'Statut du remboursement',
        },
        message: {
          type: 'string',
          description: 'Message informatif',
        },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Paiement non éligible au remboursement',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Paiement non trouvé',
  })
  async refundPayment(
    @Param('id', ParseIntPipe) id: number,
    @Body() refundDto: RefundPaymentDto,
    @CurrentUser() admin: any,
  ) {
    return this.paymentsService.refundPayment(id, refundDto, admin.sub);
  }

  @Get('admin/refunds')
  @Roles(Role.ADMIN)
  @ApiOperation({
    summary: 'Liste des remboursements',
    description:
      'Récupère la liste de tous les remboursements (Admin uniquement)',
  })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: ['PENDING', 'COMPLETED', 'FAILED', 'MANUAL'],
    description: 'Filtrer par statut de remboursement',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Nombre maximum de résultats',
  })
  @ApiQuery({
    name: 'offset',
    required: false,
    type: Number,
    description: 'Décalage pour la pagination',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Liste des remboursements',
  })
  async findAllRefunds(
    @Query('status') status?: string,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
  ) {
    // Cette méthode devra être implémentée dans le service
    throw new Error('Fonctionnalité non implémentée');
  }

  @Patch('admin/refunds/:id/complete')
  @Roles(Role.ADMIN)
  @ApiOperation({
    summary: 'Marquer un remboursement comme terminé',
    description:
      'Marque un remboursement manuel comme terminé (Admin uniquement)',
  })
  @ApiParam({
    name: 'id',
    type: Number,
    description: 'ID du remboursement',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Remboursement marqué comme terminé',
  })
  async completeRefund(
    @Param('id', ParseIntPipe) id: number,
    @Body('notes') notes: string,
    @CurrentUser() admin: any,
  ) {
    // Cette méthode devra être implémentée dans le service
    throw new Error('Fonctionnalité non implémentée');
  }

  // ===============================
  // ENDPOINTS RAPPORT ET EXPORT
  // ===============================

  @Get('admin/export')
  @Roles(Role.ADMIN)
  @ApiOperation({
    summary: 'Exporter les paiements',
    description:
      'Exporte les données de paiements au format CSV/Excel (Admin uniquement)',
  })
  @ApiQuery({
    name: 'format',
    required: false,
    enum: ['csv', 'excel'],
    description: "Format d'export (défaut: csv)",
  })
  @ApiQuery({
    name: 'startDate',
    required: false,
    type: String,
    description: 'Date de début',
  })
  @ApiQuery({
    name: 'endDate',
    required: false,
    type: String,
    description: 'Date de fin',
  })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: PaymentStatus,
    isArray: true,
    description: 'Filtrer par statut',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "Fichier d'export généré",
    headers: {
      'Content-Type': {
        description: 'Type de contenu du fichier',
        schema: {
          type: 'string',
          example:
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        },
      },
      'Content-Disposition': {
        description: 'Nom du fichier',
        schema: {
          type: 'string',
          example: 'attachment; filename="payments-export-2024-01-15.xlsx"',
        },
      },
    },
  })
  async exportPayments(
    @Query('format') format: 'csv' | 'excel' = 'csv',
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('status') status?: string[],
  ) {
    // Cette méthode devra être implémentée dans le service
    throw new Error('Fonctionnalité non implémentée');
  }

  @Get('admin/reconciliation')
  @Roles(Role.ADMIN)
  @ApiOperation({
    summary: 'Rapport de réconciliation',
    description:
      'Génère un rapport de réconciliation des paiements (Admin uniquement)',
  })
  @ApiQuery({
    name: 'date',
    required: false,
    type: String,
    description: "Date pour la réconciliation (défaut: aujourd'hui)",
  })
  @ApiQuery({
    name: 'provider',
    required: false,
    enum: PaymentProvider,
    description: 'Fournisseur à réconcilier',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Rapport de réconciliation',
    schema: {
      type: 'object',
      properties: {
        date: {
          type: 'string',
          description: 'Date du rapport',
        },
        provider: {
          type: 'string',
          description: 'Fournisseur concerné',
        },
        totalTransactions: {
          type: 'number',
          description: 'Nombre total de transactions',
        },
        completedTransactions: {
          type: 'number',
          description: 'Transactions complétées',
        },
        totalAmount: {
          type: 'number',
          description: 'Montant total',
        },
        totalFees: {
          type: 'number',
          description: 'Total des frais',
        },
        discrepancies: {
          type: 'array',
          items: {
            type: 'object',
          },
          description: 'Écarts détectés',
        },
      },
    },
  })
  async getReconciliationReport(
    @Query('date') date?: string,
    @Query('provider') provider?: PaymentProvider,
  ) {
    // Cette méthode devra être implémentée dans le service
    throw new Error('Fonctionnalité non implémentée');
  }

  // ===============================
  // ENDPOINTS DE TEST (DEV UNIQUEMENT)
  // ===============================

  @Post('test/simulate-callback')
  @Roles(Role.ADMIN)
  @ApiOperation({
    summary: 'Simuler un callback (Test)',
    description: 'Simule un callback PayDunya pour tester (Dev uniquement)',
  })
  async simulateCallback(
    @Body()
    simulationData: {
      paymentId: number;
      status: 'completed' | 'failed' | 'cancelled';
    },
  ) {
    // Cette méthode ne devrait être disponible qu'en mode développement
    if (process.env.NODE_ENV === 'production') {
      throw new Error('Endpoint non disponible en production');
    }

    // Implémentation de simulation
    throw new Error('Fonctionnalité non implémentée');
  }
}
