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
import { StopsService } from './stops.service';
import { CreateStopDto } from './dto/create-stop.dto';
import { UpdateStopDto } from './dto/update-stop.dto';
import { Stop, StopWithLines } from './entities/stop.entity';
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
import { Role } from '@prisma/client';

@ApiTags('Stops')
@ApiBearerAuth()
@Controller('stops')
@UseGuards(AuthGuard, RolesGuard, PermissionsGuard)
@UseInterceptors(AccessLogInterceptor)
export class StopsController {
  constructor(private readonly stopsService: StopsService) {}

  @Post()
  @Roles(Role.ADMIN)
  @Permissions(Permission.CREATE_STOP)
  @ApiOperation({
    summary: 'Créer un nouvel arrêt (Admin uniquement)',
    description: 'Permet aux administrateurs de créer un nouvel arrêt de bus',
  })
  @ApiResponse({
    status: 201,
    description: 'Arrêt créé avec succès',
    type: Stop,
  })
  @ApiResponse({ status: 400, description: 'Données invalides' })
  @ApiResponse({ status: 403, description: 'Accès interdit' })
  async create(
    @Body() createStopDto: CreateStopDto,
    @CurrentUser() user: CurrentUserData,
  ): Promise<Stop> {
    return this.stopsService.create(createStopDto, user);
  }

  @Get()
  @Public()
  @ApiOperation({
    summary: 'Récupérer tous les arrêts',
    description:
      'Récupère la liste de tous les arrêts avec possibilité de filtrage',
  })
  @ApiQuery({
    name: 'lineId',
    required: false,
    description: 'Filtrer par ID de ligne',
    type: Number,
  })
  @ApiQuery({
    name: 'zone',
    required: false,
    description: 'Filtrer par zone géographique',
    type: String,
  })
  @ApiQuery({
    name: 'isActive',
    required: false,
    description: 'Filtrer par statut actif',
    type: Boolean,
  })
  @ApiQuery({
    name: 'withLines',
    required: false,
    description: "Inclure les lignes passant par l'arrêt",
    type: Boolean,
  })
  @ApiQuery({
    name: 'withRoutes',
    required: false,
    description: "Inclure les routes passant par l'arrêt",
    type: Boolean,
  })
  @ApiResponse({
    status: 200,
    description: 'Liste des arrêts récupérée avec succès',
    type: [Stop],
  })
  async findAll(
    @Query('lineId') lineId?: string,
    @Query('zone') zone?: string,
    @Query('isActive') isActive?: string,
    @Query('withLines') withLines?: string,
    @Query('withRoutes') withRoutes?: string,
  ): Promise<Stop[] | StopWithLines[]> {
    const query: any = {};

    if (lineId) {
      query.lineId = parseInt(lineId, 10);
    }

    if (zone) {
      query.zone = zone;
    }

    if (isActive !== undefined) {
      query.isActive = isActive === 'true';
    }

    if (withLines !== undefined) {
      query.withLines = withLines === 'true';
    }

    if (withRoutes !== undefined) {
      query.withRoutes = withRoutes === 'true';
    }

    return this.stopsService.findAll(query);
  }

  @Get('statistics')
  @Roles(Role.ADMIN)
  @Permissions(Permission.READ_SYSTEM_STATS)
  @ApiOperation({
    summary: 'Récupérer les statistiques des arrêts (Admin uniquement)',
    description:
      'Fournit des statistiques détaillées sur les arrêts, zones et lignes',
  })
  @ApiResponse({
    status: 200,
    description: 'Statistiques récupérées avec succès',
  })
  @ApiResponse({ status: 403, description: 'Accès interdit' })
  async getStatistics() {
    return this.stopsService.getStatistics();
  }

  @Get('search')
  @Public()
  @ApiOperation({
    summary: 'Rechercher des arrêts',
    description: 'Recherche des arrêts par nom, adresse ou zone',
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
    type: [Stop],
  })
  @ApiResponse({ status: 400, description: 'Terme de recherche manquant' })
  async search(@Query('q') query: string): Promise<Stop[]> {
    return this.stopsService.search(query);
  }

  @Get('nearby')
  @Public()
  @ApiOperation({
    summary: "Trouver des arrêts proches d'une position GPS",
    description:
      "Recherche des arrêts dans un rayon donné autour d'une position",
  })
  @ApiQuery({
    name: 'lat',
    required: true,
    description: 'Latitude',
    type: Number,
  })
  @ApiQuery({
    name: 'lng',
    required: true,
    description: 'Longitude',
    type: Number,
  })
  @ApiQuery({
    name: 'radius',
    required: false,
    description: 'Rayon de recherche en km (défaut: 1km)',
    type: Number,
  })
  @ApiResponse({
    status: 200,
    description: 'Arrêts proches trouvés',
    type: [Stop],
  })
  @ApiResponse({ status: 400, description: 'Coordonnées GPS invalides' })
  async findNearby(
    @Query('lat') lat: string,
    @Query('lng') lng: string,
    @Query('radius') radius?: string,
  ): Promise<Stop[]> {
    const latitude = parseFloat(lat);
    const longitude = parseFloat(lng);
    const radiusKm = radius ? parseFloat(radius) : 1;

    if (isNaN(latitude) || isNaN(longitude)) {
      throw new Error('Coordonnées GPS invalides');
    }

    return this.stopsService.findNearbyStops(latitude, longitude, radiusKm);
  }

  @Get('line/:lineId')
  @Public()
  @ApiOperation({
    summary: "Récupérer tous les arrêts d'une ligne spécifique",
    description: 'Récupère tous les arrêts actifs associés à une ligne donnée',
  })
  @ApiParam({
    name: 'lineId',
    description: 'ID de la ligne',
    type: Number,
  })
  @ApiResponse({
    status: 200,
    description: 'Arrêts de la ligne récupérés avec succès',
    type: [Stop],
  })
  @ApiResponse({ status: 404, description: 'Ligne non trouvée' })
  async findByLine(
    @Param('lineId', ParseIntPipe) lineId: number,
  ): Promise<Stop[]> {
    return this.stopsService.findByLine(lineId);
  }

  @Get('route/:routeId')
  @Public()
  @ApiOperation({
    summary: "Récupérer tous les arrêts d'une route spécifique",
    description: 'Récupère tous les arrêts actifs associés à une route donnée',
  })
  @ApiParam({
    name: 'routeId',
    description: 'ID de la route',
    type: Number,
  })
  @ApiResponse({
    status: 200,
    description: 'Arrêts de la route récupérés avec succès',
    type: [Stop],
  })
  @ApiResponse({ status: 404, description: 'Route non trouvée' })
  async findByRoute(
    @Param('routeId', ParseIntPipe) routeId: number,
  ): Promise<Stop[]> {
    return this.stopsService.findByRoute(routeId);
  }

  @Get(':id')
  @Public()
  @ApiOperation({
    summary: 'Récupérer un arrêt par ID',
    description:
      "Récupère les détails complets d'un arrêt spécifique avec ses lignes",
  })
  @ApiParam({
    name: 'id',
    description: "ID de l'arrêt",
    type: Number,
  })
  @ApiResponse({
    status: 200,
    description: 'Arrêt récupéré avec succès',
    type: StopWithLines,
  })
  @ApiResponse({ status: 404, description: 'Arrêt non trouvé' })
  async findOne(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<Stop | StopWithLines> {
    return this.stopsService.findOne(id);
  }

  @Patch(':id')
  @Roles(Role.ADMIN)
  @Permissions(Permission.UPDATE_STOP)
  @ApiOperation({
    summary: 'Mettre à jour un arrêt (Admin uniquement)',
    description:
      "Permet aux administrateurs de modifier les informations d'un arrêt",
  })
  @ApiParam({
    name: 'id',
    description: "ID de l'arrêt",
    type: Number,
  })
  @ApiResponse({
    status: 200,
    description: 'Arrêt mis à jour avec succès',
    type: Stop,
  })
  @ApiResponse({ status: 400, description: 'Données invalides' })
  @ApiResponse({ status: 403, description: 'Accès interdit' })
  @ApiResponse({ status: 404, description: 'Arrêt non trouvé' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateStopDto: UpdateStopDto,
    @CurrentUser() user: CurrentUserData,
  ): Promise<Stop> {
    return this.stopsService.update(id, updateStopDto, user);
  }

  @Patch(':id/toggle-active')
  @Roles(Role.ADMIN)
  @Permissions(Permission.UPDATE_STOP)
  @ApiOperation({
    summary: 'Activer/désactiver un arrêt (Admin uniquement)',
    description: "Permet aux administrateurs d'activer ou désactiver un arrêt",
  })
  @ApiParam({
    name: 'id',
    description: "ID de l'arrêt",
    type: Number,
  })
  @ApiResponse({
    status: 200,
    description: "Statut de l'arrêt modifié avec succès",
  })
  @ApiResponse({ status: 403, description: 'Accès interdit' })
  @ApiResponse({ status: 404, description: 'Arrêt non trouvé' })
  async toggleActive(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: CurrentUserData,
  ): Promise<{ message: string; isActive: boolean }> {
    return this.stopsService.toggleActive(id, user);
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  @Permissions(Permission.DELETE_STOP)
  @ApiOperation({
    summary: 'Supprimer un arrêt (Admin uniquement)',
    description:
      "Supprime un arrêt s'il n'est pas utilisé dans des routes actives",
  })
  @ApiParam({
    name: 'id',
    description: "ID de l'arrêt",
    type: Number,
  })
  @ApiResponse({
    status: 200,
    description: 'Arrêt supprimé avec succès',
  })
  @ApiResponse({
    status: 400,
    description: 'Arrêt utilisé dans des routes actives',
  })
  @ApiResponse({ status: 403, description: 'Accès interdit' })
  @ApiResponse({ status: 404, description: 'Arrêt non trouvé' })
  async remove(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: CurrentUserData,
  ): Promise<{ message: string }> {
    return this.stopsService.remove(id, user);
  }
}
