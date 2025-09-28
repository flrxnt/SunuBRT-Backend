import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  ParseIntPipe,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiQuery,
  ApiParam,
} from '@nestjs/swagger';
import { TripsService } from './trips.service';
import { CreateTripDto } from './dto/create-trip.dto';
import { UpdateTripDto } from './dto/update-trip.dto';
import { Trip, TripWithStats } from './entities/trip.entity';
import { Roles } from '../common/decorators/roles.decorator';
import { Public } from '../common/decorators/public.decorator';
import { AuthGuard } from '../common/guards/auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import {
  CurrentUser,
  CurrentUserData,
} from '../common/decorators/current-user.decorator';
import { AccessLogInterceptor } from '../common/interceptors/access-log.interceptor';
import {
  Permissions,
  Permission,
} from '../common/decorators/permissions.decorator';
import { Role, TripStatus } from '@prisma/client';

@ApiTags('Trips')
@ApiBearerAuth()
@Controller('trips')
@UseGuards(AuthGuard, RolesGuard, PermissionsGuard)
@UseInterceptors(AccessLogInterceptor)
export class TripsController {
  constructor(private readonly tripsService: TripsService) {}

  @Post()
  @Roles(Role.ADMIN)
  @Permissions(Permission.CREATE_TRIP)
  @ApiOperation({
    summary: 'Créer un nouveau trajet (Admin uniquement)',
    description:
      'Permet aux administrateurs de créer un nouveau trajet avec horaires et tarification',
  })
  @ApiResponse({
    status: 201,
    description: 'Trajet créé avec succès',
    type: Trip,
  })
  @ApiResponse({
    status: 400,
    description: "Données invalides ou conflits d'horaires",
  })
  @ApiResponse({ status: 403, description: 'Accès interdit' })
  @ApiResponse({ status: 404, description: 'Route ou bus non trouvé' })
  @ApiResponse({
    status: 409,
    description: 'Bus déjà assigné sur cette période',
  })
  async create(
    @Body() createTripDto: CreateTripDto,
    @CurrentUser() user: CurrentUserData,
  ): Promise<Trip> {
    return this.tripsService.create(createTripDto, user);
  }

  @Get()
  @Public()
  @Permissions(Permission.READ_TRIP)
  @ApiOperation({
    summary: 'Récupérer tous les trajets',
    description:
      'Récupère la liste de tous les trajets avec possibilité de filtrage',
  })
  @ApiQuery({
    name: 'routeId',
    required: false,
    description: 'Filtrer par ID de route',
    type: Number,
  })
  @ApiQuery({
    name: 'busId',
    required: false,
    description: 'Filtrer par ID de bus',
    type: String,
  })
  @ApiQuery({
    name: 'status',
    required: false,
    description: 'Filtrer par statut',
    enum: TripStatus,
  })
  @ApiQuery({
    name: 'dateFrom',
    required: false,
    description: 'Date de début (ISO 8601)',
    type: String,
  })
  @ApiQuery({
    name: 'dateTo',
    required: false,
    description: 'Date de fin (ISO 8601)',
    type: String,
  })
  @ApiQuery({
    name: 'lineId',
    required: false,
    description: 'Filtrer par ID de ligne',
    type: Number,
  })
  @ApiQuery({
    name: 'withStats',
    required: false,
    description: 'Inclure les statistiques',
    type: Boolean,
  })
  @ApiResponse({
    status: 200,
    description: 'Liste des trajets récupérée avec succès',
    type: [Trip],
  })
  async findAll(
    @Query('routeId') routeId?: string,
    @Query('busId') busId?: string,
    @Query('status') status?: TripStatus,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('lineId') lineId?: string,
    @Query('withStats') withStats?: string,
  ): Promise<Trip[] | TripWithStats[]> {
    const query: any = {};

    if (routeId) {
      query.routeId = parseInt(routeId, 10);
    }

    if (busId) {
      query.busId = busId;
    }

    if (status) {
      query.status = status;
    }

    if (dateFrom) {
      query.dateFrom = dateFrom;
    }

    if (dateTo) {
      query.dateTo = dateTo;
    }

    if (lineId) {
      query.lineId = parseInt(lineId, 10);
    }

    if (withStats !== undefined) {
      query.withStats = withStats === 'true';
    }

    return this.tripsService.findAll(query);
  }

  @Get('statistics')
  @Roles(Role.ADMIN)
  @Permissions(Permission.READ_SYSTEM_STATS)
  @ApiOperation({
    summary: 'Récupérer les statistiques des trajets (Admin uniquement)',
    description:
      "Fournit des statistiques détaillées sur les trajets, revenus et taux d'occupation",
  })
  @ApiResponse({
    status: 200,
    description: 'Statistiques récupérées avec succès',
  })
  @ApiResponse({ status: 403, description: 'Accès interdit' })
  async getStatistics() {
    return this.tripsService.getStatistics();
  }

  @Get('search')
  @Public()
  @Permissions(Permission.READ_TRIP)
  @ApiOperation({
    summary: 'Rechercher des trajets',
    description: 'Recherche des trajets par route, ligne, bus ou numéro de bus',
  })
  @ApiQuery({
    name: 'q',
    required: true,
    description: 'Terme de recherche',
    type: String,
  })
  @ApiResponse({
    status: 200,
    description: 'Résultats de recherche',
    type: [Trip],
  })
  @ApiResponse({ status: 400, description: 'Terme de recherche manquant' })
  async search(@Query('q') query: string): Promise<Trip[]> {
    return this.tripsService.search(query);
  }

  @Get('route/:routeId')
  @Public()
  @Permissions(Permission.READ_TRIP)
  @ApiOperation({
    summary: "Récupérer tous les trajets d'une route spécifique",
    description: "Récupère tous les trajets à venir d'une route donnée",
  })
  @ApiParam({
    name: 'routeId',
    description: 'ID de la route',
    type: Number,
  })
  @ApiResponse({
    status: 200,
    description: 'Trajets de la route récupérés avec succès',
    type: [Trip],
  })
  @ApiResponse({ status: 404, description: 'Route non trouvée' })
  async findByRoute(
    @Param('routeId', ParseIntPipe) routeId: number,
  ): Promise<Trip[]> {
    return this.tripsService.findByRoute(routeId);
  }

  @Get('bus/:busId')
  @Roles(Role.DRIVER, Role.ADMIN)
  @Permissions(Permission.READ_TRIP)
  @ApiOperation({
    summary: "Récupérer tous les trajets d'un bus spécifique",
    description: "Récupère l'historique des trajets d'un bus donné",
  })
  @ApiParam({
    name: 'busId',
    description: 'ID du bus',
    type: String,
  })
  @ApiResponse({
    status: 200,
    description: 'Trajets du bus récupérés avec succès',
    type: [Trip],
  })
  @ApiResponse({ status: 404, description: 'Bus non trouvé' })
  async findByBus(@Param('busId') busId: string): Promise<Trip[]> {
    return this.tripsService.findByBus(busId);
  }

  @Get(':id')
  @Public()
  @Permissions(Permission.READ_TRIP)
  @ApiOperation({
    summary: 'Récupérer un trajet par ID',
    description:
      "Récupère les détails complets d'un trajet spécifique avec tickets",
  })
  @ApiParam({
    name: 'id',
    description: 'ID du trajet',
    type: Number,
  })
  @ApiResponse({
    status: 200,
    description: 'Trajet récupéré avec succès',
    type: TripWithStats,
  })
  @ApiResponse({ status: 404, description: 'Trajet non trouvé' })
  async findOne(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<Trip | TripWithStats> {
    return this.tripsService.findOne(id);
  }

  @Patch(':id')
  @Roles(Role.ADMIN)
  @Permissions(Permission.UPDATE_TRIP)
  @ApiOperation({
    summary: 'Mettre à jour un trajet (Admin uniquement)',
    description:
      "Permet aux administrateurs de modifier les informations d'un trajet",
  })
  @ApiParam({
    name: 'id',
    description: 'ID du trajet',
    type: Number,
  })
  @ApiResponse({
    status: 200,
    description: 'Trajet mis à jour avec succès',
    type: Trip,
  })
  @ApiResponse({
    status: 400,
    description: 'Données invalides ou trajet non modifiable',
  })
  @ApiResponse({ status: 403, description: 'Accès interdit' })
  @ApiResponse({ status: 404, description: 'Trajet non trouvé' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateTripDto: UpdateTripDto,
    @CurrentUser() user: CurrentUserData,
  ): Promise<Trip> {
    return this.tripsService.update(id, updateTripDto, user);
  }

  @Patch(':id/status')
  @Roles(Role.DRIVER, Role.ADMIN)
  @Permissions(Permission.UPDATE_TRIP)
  @ApiOperation({
    summary: "Mettre à jour le statut d'un trajet",
    description:
      "Permet aux conducteurs et administrateurs de changer le statut d'un trajet",
  })
  @ApiParam({
    name: 'id',
    description: 'ID du trajet',
    type: Number,
  })
  @ApiQuery({
    name: 'status',
    required: true,
    description: 'Nouveau statut',
    enum: TripStatus,
  })
  @ApiResponse({
    status: 200,
    description: 'Statut du trajet mis à jour avec succès',
  })
  @ApiResponse({ status: 400, description: 'Transition de statut invalide' })
  @ApiResponse({ status: 403, description: 'Accès interdit' })
  @ApiResponse({ status: 404, description: 'Trajet non trouvé' })
  async updateStatus(
    @Param('id', ParseIntPipe) id: number,
    @Query('status') status: TripStatus,
    @CurrentUser() user: CurrentUserData,
  ): Promise<{ message: string; status: TripStatus }> {
    return this.tripsService.updateStatus(id, status, user);
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  @Permissions(Permission.DELETE_TRIP)
  @ApiOperation({
    summary: 'Supprimer un trajet (Admin uniquement)',
    description: "Supprime un trajet s'il n'a pas de tickets vendus",
  })
  @ApiParam({
    name: 'id',
    description: 'ID du trajet',
    type: Number,
  })
  @ApiResponse({
    status: 200,
    description: 'Trajet supprimé avec succès',
  })
  @ApiResponse({
    status: 400,
    description: 'Trajet avec tickets vendus',
  })
  @ApiResponse({ status: 403, description: 'Accès interdit' })
  @ApiResponse({ status: 404, description: 'Trajet non trouvé' })
  async remove(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: CurrentUserData,
  ): Promise<{ message: string }> {
    return this.tripsService.remove(id, user);
  }
}
