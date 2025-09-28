import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Query,
  Request,
  HttpStatus,
  ParseIntPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
  ApiParam,
} from '@nestjs/swagger';
import { TicketsService } from './tickets.service';
import { CreateTicketDto } from './dto/create-ticket.dto';
import {
  ValidateTicketDto,
  TicketValidationResponseDto,
  ScanTicketDto,
} from './dto/validate-ticket.dto';
import {
  CreateTicketPricingDto,
  UpdateTicketPricingDto,
  TicketPricingType,
  ApplyDiscountDto,
  BulkUpdatePricingDto,
} from './dto/ticket-pricing.dto';
import { AuthGuard } from '../common/guards/auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Public } from '../common/decorators/public.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Role, TicketStatus } from '@prisma/client';

@ApiTags('Tickets')
@Controller('api/v1/tickets')
@UseGuards(AuthGuard, RolesGuard)
@ApiBearerAuth()
export class TicketsController {
  constructor(private readonly ticketsService: TicketsService) {}

  // ===============================
  // ENDPOINTS TICKETS
  // ===============================

  @Post()
  @ApiOperation({
    summary: 'Créer un nouveau ticket',
    description: 'Permet à un utilisateur de créer un ticket pour un voyage',
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Ticket créé avec succès',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Données invalides ou voyage indisponible',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Voyage non trouvé',
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'Siège déjà pris ou pas assez de places',
  })
  async create(
    @Body() createTicketDto: CreateTicketDto,
    @CurrentUser() user: any,
  ) {
    return this.ticketsService.create(createTicketDto, user.sub);
  }

  @Get('my-tickets')
  @ApiOperation({
    summary: 'Récupérer mes tickets',
    description: "Liste tous les tickets de l'utilisateur connecté",
  })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: TicketStatus,
    isArray: true,
    description: 'Filtrer par statut de ticket',
  })
  @ApiQuery({
    name: 'includeExpired',
    required: false,
    type: Boolean,
    description: 'Inclure les tickets expirés',
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
    description: "Liste des tickets de l'utilisateur",
  })
  async findUserTickets(
    @CurrentUser() user: any,
    @Query('status') status?: string[],
    @Query('includeExpired') includeExpired?: boolean,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
  ) {
    const statusArray = status
      ? Array.isArray(status)
        ? status
        : [status]
      : undefined;

    return this.ticketsService.findUserTickets(user.sub, {
      status: statusArray as TicketStatus[],
      includeExpired: includeExpired === true,
      limit: limit ? parseInt(limit.toString()) : 50,
      offset: offset ? parseInt(offset.toString()) : 0,
    });
  }

  @Get('statistics')
  @Roles(Role.ADMIN)
  @ApiOperation({
    summary: 'Statistiques des tickets',
    description:
      'Récupère les statistiques générales des tickets (Admin uniquement)',
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
    name: 'lineId',
    required: false,
    type: Number,
    description: 'ID de la ligne à filtrer',
  })
  @ApiQuery({
    name: 'routeId',
    required: false,
    type: Number,
    description: 'ID de la route à filtrer',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Statistiques des tickets',
  })
  async getStatistics(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('lineId') lineId?: number,
    @Query('routeId') routeId?: number,
  ) {
    return this.ticketsService.getTicketStatistics({
      startDate,
      endDate,
      lineId: lineId ? parseInt(lineId.toString()) : undefined,
      routeId: routeId ? parseInt(routeId.toString()) : undefined,
    });
  }

  @Get('user-statistics')
  @ApiOperation({
    summary: 'Mes statistiques de tickets',
    description: "Récupère les statistiques personnelles de l'utilisateur",
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Statistiques personnelles des tickets',
  })
  async getUserStatistics(@CurrentUser() user: any) {
    return this.ticketsService.getTicketStatistics({
      userId: user.sub,
    });
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Récupérer un ticket par ID',
    description: "Récupère les détails d'un ticket spécifique",
  })
  @ApiParam({
    name: 'id',
    type: Number,
    description: 'ID du ticket',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Détails du ticket',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Ticket non trouvé',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Accès interdit (pas votre ticket)',
  })
  async findOne(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: any,
  ) {
    // Les utilisateurs normaux ne peuvent voir que leurs propres tickets
    // Les admins peuvent voir tous les tickets
    const userId = user.role === Role.ADMIN ? undefined : user.sub;
    return this.ticketsService.findOne(id, userId);
  }

  @Get(':id/qr-code')
  @ApiOperation({
    summary: "Générer le code QR d'un ticket",
    description: "Génère et retourne le code QR d'un ticket payé",
  })
  @ApiParam({
    name: 'id',
    type: Number,
    description: 'ID du ticket',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Code QR généré avec succès',
    schema: {
      type: 'object',
      properties: {
        qrCode: {
          type: 'string',
          description: 'Image QR code en base64',
        },
        qrCodeData: {
          type: 'string',
          description: 'Données du QR code',
        },
        ticketData: {
          type: 'object',
          description: 'Informations du ticket',
        },
        expiresAt: {
          type: 'string',
          description: "Date d'expiration du ticket",
        },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Ticket pas payé ou expiré',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Ticket non trouvé',
  })
  async generateQRCode(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: any,
  ) {
    return this.ticketsService.generateQRCode(id, user.sub);
  }

  @Post('validate')
  @Roles(Role.DRIVER, Role.ADMIN)
  @ApiOperation({
    summary: 'Valider un ticket par QR code',
    description: 'Valide un ticket scanné (Conducteurs et Admins uniquement)',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Résultat de la validation',
    type: TicketValidationResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Seuls les conducteurs et admins peuvent valider',
  })
  async validateTicket(
    @Body() validateTicketDto: ValidateTicketDto,
    @CurrentUser() user: any,
  ): Promise<TicketValidationResponseDto> {
    return this.ticketsService.validateTicket(validateTicketDto, user);
  }

  @Post('scan')
  @Roles(Role.DRIVER, Role.ADMIN)
  @ApiOperation({
    summary: 'Scanner un ticket pour voir les informations',
    description:
      'Scanne un QR code pour afficher les informations sans valider',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Informations du ticket scanné',
  })
  async scanTicket(@Body() scanTicketDto: ScanTicketDto) {
    return this.ticketsService.scanTicketInfo(scanTicketDto.qrCode);
  }

  @Patch(':id/cancel')
  @ApiOperation({
    summary: 'Annuler un ticket',
    description: "Annule un ticket (possible jusqu'à 2h avant le départ)",
  })
  @ApiParam({
    name: 'id',
    type: Number,
    description: 'ID du ticket à annuler',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Ticket annulé avec succès',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Annulation impossible (ticket utilisé, trop tard, etc.)',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Ticket non trouvé',
  })
  async cancelTicket(
    @Param('id', ParseIntPipe) id: number,
    @Body('reason') reason: string,
    @CurrentUser() user: any,
  ) {
    return this.ticketsService.cancelTicket(id, user.sub, reason);
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  @ApiOperation({
    summary: 'Supprimer un ticket',
    description: 'Supprime un ticket (Admin uniquement)',
  })
  @ApiParam({
    name: 'id',
    type: Number,
    description: 'ID du ticket à supprimer',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Ticket supprimé avec succès',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Seuls les admins peuvent supprimer',
  })
  async remove(@Param('id', ParseIntPipe) id: number) {
    // Note: La méthode remove devra être implémentée dans le service
    throw new Error('Fonctionnalité non implémentée');
  }

  // ===============================
  // ENDPOINTS TARIFICATION
  // ===============================

  @Post('pricing')
  @Roles(Role.ADMIN)
  @ApiOperation({
    summary: 'Créer une tarification de ticket',
    description:
      'Crée une nouvelle tarification pour les tickets (Admin uniquement)',
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Tarification créée avec succès',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Données invalides',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Ligne ou route non trouvée',
  })
  async createPricing(@Body() createPricingDto: CreateTicketPricingDto) {
    return this.ticketsService.createPricing(createPricingDto);
  }

  @Get('pricing')
  @Public()
  @ApiOperation({
    summary: 'Lister les tarifications',
    description: 'Récupère la liste des tarifications de tickets',
  })
  @ApiQuery({
    name: 'type',
    required: false,
    enum: TicketPricingType,
    description: 'Type de tarification',
  })
  @ApiQuery({
    name: 'lineId',
    required: false,
    type: Number,
    description: 'ID de la ligne',
  })
  @ApiQuery({
    name: 'routeId',
    required: false,
    type: Number,
    description: 'ID de la route',
  })
  @ApiQuery({
    name: 'isActive',
    required: false,
    type: Boolean,
    description: 'Tarifications actives seulement',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Liste des tarifications',
  })
  async findAllPricing(
    @Query('type') type?: TicketPricingType,
    @Query('lineId') lineId?: number,
    @Query('routeId') routeId?: number,
    @Query('isActive') isActive?: boolean,
  ) {
    return this.ticketsService.findAllPricing({
      type,
      lineId: lineId ? parseInt(lineId.toString()) : undefined,
      routeId: routeId ? parseInt(routeId.toString()) : undefined,
      isActive: isActive === true,
    });
  }

  @Get('pricing/:id')
  @Public()
  @ApiOperation({
    summary: 'Récupérer une tarification par ID',
    description: "Récupère les détails d'une tarification spécifique",
  })
  @ApiParam({
    name: 'id',
    type: Number,
    description: 'ID de la tarification',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Détails de la tarification',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Tarification non trouvée',
  })
  async findOnePricing(@Param('id', ParseIntPipe) id: number) {
    // Cette méthode devra être implémentée dans le service
    throw new Error('Fonctionnalité non implémentée');
  }

  @Patch('pricing/:id')
  @Roles(Role.ADMIN)
  @ApiOperation({
    summary: 'Mettre à jour une tarification',
    description: 'Met à jour une tarification existante (Admin uniquement)',
  })
  @ApiParam({
    name: 'id',
    type: Number,
    description: 'ID de la tarification',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Tarification mise à jour avec succès',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Tarification non trouvée',
  })
  async updatePricing(
    @Param('id', ParseIntPipe) id: number,
    @Body() updatePricingDto: UpdateTicketPricingDto,
  ) {
    return this.ticketsService.updatePricing(id, updatePricingDto);
  }

  @Delete('pricing/:id')
  @Roles(Role.ADMIN)
  @ApiOperation({
    summary: 'Supprimer une tarification',
    description: 'Supprime une tarification (Admin uniquement)',
  })
  @ApiParam({
    name: 'id',
    type: Number,
    description: 'ID de la tarification',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Tarification supprimée avec succès',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Tarification utilisée par des tickets',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Tarification non trouvée',
  })
  async deletePricing(@Param('id', ParseIntPipe) id: number) {
    return this.ticketsService.deletePricing(id);
  }

  @Patch('pricing/bulk-update')
  @Roles(Role.ADMIN)
  @ApiOperation({
    summary: 'Mise à jour en lot des tarifications',
    description:
      'Met à jour plusieurs tarifications à la fois (Admin uniquement)',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Tarifications mises à jour avec succès',
  })
  async bulkUpdatePricing(@Body() bulkUpdateDto: BulkUpdatePricingDto) {
    // Cette méthode devra être implémentée dans le service
    throw new Error('Fonctionnalité non implémentée');
  }

  @Post('pricing/apply-discount')
  @Roles(Role.ADMIN)
  @ApiOperation({
    summary: 'Appliquer une promotion',
    description:
      'Applique une remise sur toutes les tarifications actives (Admin uniquement)',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Promotion appliquée avec succès',
  })
  async applyDiscount(@Body() discountDto: ApplyDiscountDto) {
    // Cette méthode devra être implémentée dans le service
    throw new Error('Fonctionnalité non implémentée');
  }

  // ===============================
  // ENDPOINTS ADMINISTRATIFS
  // ===============================

  @Get('admin/all')
  @Roles(Role.ADMIN)
  @ApiOperation({
    summary: 'Lister tous les tickets (Admin)',
    description: 'Liste tous les tickets du système (Admin uniquement)',
  })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: TicketStatus,
    isArray: true,
    description: 'Filtrer par statut',
  })
  @ApiQuery({
    name: 'userId',
    required: false,
    type: String,
    description: 'Filtrer par utilisateur',
  })
  @ApiQuery({
    name: 'tripId',
    required: false,
    type: Number,
    description: 'Filtrer par voyage',
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
    description: 'Liste de tous les tickets',
  })
  async findAllAdmin(
    @Query('status') status?: string[],
    @Query('userId') userId?: string,
    @Query('tripId') tripId?: number,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
  ) {
    // Cette méthode devra être implémentée dans le service
    throw new Error('Fonctionnalité non implémentée');
  }

  @Get('admin/export')
  @Roles(Role.ADMIN)
  @ApiOperation({
    summary: 'Exporter les tickets',
    description:
      'Exporte les données de tickets au format CSV/Excel (Admin uniquement)',
  })
  @ApiQuery({
    name: 'format',
    required: false,
    enum: ['csv', 'excel'],
    description: "Format d'export",
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
  @ApiResponse({
    status: HttpStatus.OK,
    description: "Fichier d'export généré",
  })
  async exportTickets(
    @Query('format') format: 'csv' | 'excel' = 'csv',
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    // Cette méthode devra être implémentée dans le service
    throw new Error('Fonctionnalité non implémentée');
  }

  @Post('admin/:id/force-validate')
  @Roles(Role.ADMIN)
  @ApiOperation({
    summary: "Validation forcée d'un ticket",
    description: "Force la validation d'un ticket (Admin uniquement)",
  })
  @ApiParam({
    name: 'id',
    type: Number,
    description: 'ID du ticket',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Ticket validé avec succès',
  })
  async forceValidate(
    @Param('id', ParseIntPipe) id: number,
    @Body('reason') reason: string,
    @CurrentUser() user: any,
  ) {
    // Cette méthode devra être implémentée dans le service
    throw new Error('Fonctionnalité non implémentée');
  }
}
