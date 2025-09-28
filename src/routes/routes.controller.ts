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
import { RoutesService } from './routes.service';
import { CreateRouteDto } from './dto/create-route.dto';
import { UpdateRouteDto } from './dto/update-route.dto';
import { Route, RouteWithStats } from './entities/route.entity';
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

@ApiTags('Routes')
@ApiBearerAuth()
@Controller('routes')
@UseGuards(AuthGuard, RolesGuard, PermissionsGuard)
@UseInterceptors(AccessLogInterceptor)
export class RoutesController {
  constructor(private readonly routesService: RoutesService) {}

  @Post()
  @Roles(Role.ADMIN)
  @Permissions(Permission.CREATE_ROUTE)
  @ApiOperation({
    summary: 'Créer une nouvelle route (Admin uniquement)',
    description:
      'Permet aux administrateurs de créer une nouvelle route avec ses points GPS',
  })
  @ApiResponse({
    status: 201,
    description: 'Route créée avec succès',
    type: Route,
  })
  @ApiResponse({ status: 400, description: 'Données invalides' })
  @ApiResponse({ status: 403, description: 'Accès interdit' })
  @ApiResponse({ status: 404, description: 'Ligne non trouvée' })
  async create(
    @Body() createRouteDto: CreateRouteDto,
    @CurrentUser() user: CurrentUserData,
  ): Promise<Route> {
    return this.routesService.create(createRouteDto, user);
  }

  @Get()
  @Public()
  @Permissions(Permission.READ_ROUTE)
  @ApiOperation({
    summary: 'Récupérer toutes les routes',
    description:
      'Récupère la liste de toutes les routes avec possibilité de filtrage',
  })
  @ApiQuery({
    name: 'lineId',
    required: false,
    description: 'Filtrer par ID de ligne',
    type: Number,
  })
  @ApiQuery({
    name: 'isActive',
    required: false,
    description: 'Filtrer par statut actif',
    type: Boolean,
  })
  @ApiQuery({
    name: 'withTrips',
    required: false,
    description: 'Inclure les trajets à venir',
    type: Boolean,
  })
  @ApiQuery({
    name: 'withStats',
    required: false,
    description: 'Inclure les statistiques',
    type: Boolean,
  })
  @ApiResponse({
    status: 200,
    description: 'Liste des routes récupérée avec succès',
    type: [Route],
  })
  async findAll(
    @Query('lineId') lineId?: string,
    @Query('isActive') isActive?: string,
    @Query('withTrips') withTrips?: string,
    @Query('withStats') withStats?: string,
  ): Promise<Route[] | RouteWithStats[]> {
    const query: any = {};

    if (lineId) {
      query.lineId = parseInt(lineId, 10);
    }

    if (isActive !== undefined) {
      query.isActive = isActive === 'true';
    }

    if (withTrips !== undefined) {
      query.withTrips = withTrips === 'true';
    }

    if (withStats !== undefined) {
      query.withStats = withStats === 'true';
    }

    return this.routesService.findAll(query);
  }

  @Get('statistics')
  @Roles(Role.ADMIN)
  @Permissions(Permission.READ_SYSTEM_STATS)
  @ApiOperation({
    summary: 'Récupérer les statistiques des routes (Admin uniquement)',
    description:
      'Fournit des statistiques détaillées sur les routes, distances et trajets',
  })
  @ApiResponse({
    status: 200,
    description: 'Statistiques récupérées avec succès',
  })
  @ApiResponse({ status: 403, description: 'Accès interdit' })
  async getStatistics() {
    return this.routesService.getStatistics();
  }

  @Get('search')
  @Public()
  @Permissions(Permission.READ_ROUTE)
  @ApiOperation({
    summary: 'Rechercher des routes',
    description: 'Recherche des routes par nom, description ou ligne',
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
    type: [Route],
  })
  @ApiResponse({ status: 400, description: 'Terme de recherche manquant' })
  async search(@Query('q') query: string): Promise<Route[]> {
    return this.routesService.search(query);
  }

  @Get('nearby')
  @Public()
  @Permissions(Permission.READ_ROUTE)
  @ApiOperation({
    summary: "Trouver des routes proches d'une position GPS",
    description:
      "Recherche des routes dans un rayon donné autour d'une position",
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
    description: 'Rayon de recherche en km (défaut: 5km)',
    type: Number,
  })
  @ApiResponse({
    status: 200,
    description: 'Routes proches trouvées',
    type: [Route],
  })
  @ApiResponse({ status: 400, description: 'Coordonnées GPS invalides' })
  async findNearby(
    @Query('lat') lat: string,
    @Query('lng') lng: string,
    @Query('radius') radius?: string,
  ): Promise<Route[]> {
    const latitude = parseFloat(lat);
    const longitude = parseFloat(lng);
    const radiusKm = radius ? parseFloat(radius) : 5;

    if (isNaN(latitude) || isNaN(longitude)) {
      throw new Error('Coordonnées GPS invalides');
    }

    return this.routesService.findNearbyRoutes(latitude, longitude, radiusKm);
  }

  @Get('line/:lineId')
  @Public()
  @Permissions(Permission.READ_ROUTE)
  @ApiOperation({
    summary: "Récupérer toutes les routes d'une ligne spécifique",
    description:
      'Récupère toutes les routes actives associées à une ligne donnée',
  })
  @ApiParam({
    name: 'lineId',
    description: 'ID de la ligne',
    type: Number,
  })
  @ApiResponse({
    status: 200,
    description: 'Routes de la ligne récupérées avec succès',
    type: [Route],
  })
  @ApiResponse({ status: 404, description: 'Ligne non trouvée' })
  async findByLine(
    @Param('lineId', ParseIntPipe) lineId: number,
  ): Promise<Route[]> {
    return this.routesService.findByLine(lineId);
  }

  @Get(':id')
  @Public()
  @Permissions(Permission.READ_ROUTE)
  @ApiOperation({
    summary: 'Récupérer une route par ID',
    description:
      "Récupère les détails complets d'une route spécifique avec ses points GPS",
  })
  @ApiParam({
    name: 'id',
    description: 'ID de la route',
    type: Number,
  })
  @ApiResponse({
    status: 200,
    description: 'Route récupérée avec succès',
    type: RouteWithStats,
  })
  @ApiResponse({ status: 404, description: 'Route non trouvée' })
  async findOne(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<Route | RouteWithStats> {
    return this.routesService.findOne(id);
  }

  @Patch(':id')
  @Roles(Role.ADMIN)
  @Permissions(Permission.UPDATE_ROUTE)
  @ApiOperation({
    summary: 'Mettre à jour une route (Admin uniquement)',
    description:
      "Permet aux administrateurs de modifier les informations d'une route",
  })
  @ApiParam({
    name: 'id',
    description: 'ID de la route',
    type: Number,
  })
  @ApiResponse({
    status: 200,
    description: 'Route mise à jour avec succès',
    type: Route,
  })
  @ApiResponse({ status: 400, description: 'Données invalides' })
  @ApiResponse({ status: 403, description: 'Accès interdit' })
  @ApiResponse({ status: 404, description: 'Route non trouvée' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateRouteDto: UpdateRouteDto,
    @CurrentUser() user: CurrentUserData,
  ): Promise<Route> {
    return this.routesService.update(id, updateRouteDto, user);
  }

  @Patch(':id/toggle-active')
  @Roles(Role.ADMIN)
  @Permissions(Permission.UPDATE_ROUTE)
  @ApiOperation({
    summary: 'Activer/désactiver une route (Admin uniquement)',
    description: "Permet aux administrateurs d'activer ou désactiver une route",
  })
  @ApiParam({
    name: 'id',
    description: 'ID de la route',
    type: Number,
  })
  @ApiResponse({
    status: 200,
    description: 'Statut de la route modifié avec succès',
  })
  @ApiResponse({ status: 403, description: 'Accès interdit' })
  @ApiResponse({ status: 404, description: 'Route non trouvée' })
  async toggleActive(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: CurrentUserData,
  ): Promise<{ message: string; isActive: boolean }> {
    return this.routesService.toggleActive(id, user);
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  @Permissions(Permission.DELETE_ROUTE)
  @ApiOperation({
    summary: 'Supprimer une route (Admin uniquement)',
    description: "Supprime une route si elle n'a pas de trajets actifs",
  })
  @ApiParam({
    name: 'id',
    description: 'ID de la route',
    type: Number,
  })
  @ApiResponse({
    status: 200,
    description: 'Route supprimée avec succès',
  })
  @ApiResponse({
    status: 400,
    description: 'Route avec trajets actifs',
  })
  @ApiResponse({ status: 403, description: 'Accès interdit' })
  @ApiResponse({ status: 404, description: 'Route non trouvée' })
  async remove(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: CurrentUserData,
  ): Promise<{ message: string }> {
    return this.routesService.remove(id, user);
  }
}
