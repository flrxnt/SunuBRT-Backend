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
import { LinesService } from './lines.service';
import { CreateLineDto } from './dto/create-line.dto';
import { UpdateLineDto } from './dto/update-line.dto';
import { Line, LineWithStats } from './entities/line.entity';
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

@ApiTags('Lines')
@ApiBearerAuth()
@Controller('lines')
@UseGuards(AuthGuard, RolesGuard, PermissionsGuard)
@UseInterceptors(AccessLogInterceptor)
export class LinesController {
  constructor(private readonly linesService: LinesService) {}

  @Post()
  @Roles(Role.ADMIN)
  @Permissions(Permission.CREATE_LINE)
  @ApiOperation({
    summary: 'Créer une nouvelle ligne (Admin uniquement)',
    description:
      'Permet aux administrateurs de créer une nouvelle ligne de transport',
  })
  @ApiResponse({
    status: 201,
    description: 'Ligne créée avec succès',
    type: Line,
  })
  @ApiResponse({ status: 400, description: 'Données invalides' })
  @ApiResponse({ status: 403, description: 'Accès interdit' })
  @ApiResponse({
    status: 409,
    description: 'Conflit - nom ou numéro de ligne existant',
  })
  async create(
    @Body() createLineDto: CreateLineDto,
    @CurrentUser() user: CurrentUserData,
  ): Promise<Line> {
    return this.linesService.create(createLineDto, user);
  }

  @Get()
  @Public()
  @ApiOperation({
    summary: 'Récupérer toutes les lignes',
    description:
      'Récupère la liste de toutes les lignes avec possibilité de filtrage',
  })
  @ApiQuery({
    name: 'isActive',
    required: false,
    description: 'Filtrer par statut actif',
    type: Boolean,
  })
  @ApiQuery({
    name: 'withBuses',
    required: false,
    description: 'Inclure les bus assignés',
    type: Boolean,
  })
  @ApiQuery({
    name: 'withRoutes',
    required: false,
    description: 'Inclure les routes',
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
    description: 'Liste des lignes récupérée avec succès',
    type: [Line],
  })
  async findAll(
    @Query('isActive') isActive?: string,
    @Query('withBuses') withBuses?: string,
    @Query('withRoutes') withRoutes?: string,
    @Query('withStats') withStats?: string,
  ): Promise<Line[] | LineWithStats[]> {
    const query: {
      isActive?: boolean;
      withBuses?: boolean;
      withRoutes?: boolean;
      withStats?: boolean;
    } = {};

    if (isActive !== undefined) {
      query.isActive = isActive === 'true';
    }

    if (withBuses !== undefined) {
      query.withBuses = withBuses === 'true';
    }

    if (withRoutes !== undefined) {
      query.withRoutes = withRoutes === 'true';
    }

    if (withStats !== undefined) {
      query.withStats = withStats === 'true';
    }

    return this.linesService.findAll(query);
  }

  @Get('statistics')
  @Roles(Role.ADMIN)
  @Permissions(Permission.READ_SYSTEM_STATS)
  @ApiOperation({
    summary: 'Récupérer les statistiques des lignes (Admin uniquement)',
    description:
      'Fournit des statistiques détaillées sur les lignes, bus et routes',
  })
  @ApiResponse({
    status: 200,
    description: 'Statistiques récupérées avec succès',
  })
  @ApiResponse({ status: 403, description: 'Accès interdit' })
  async getStatistics() {
    return this.linesService.getStatistics();
  }

  @Get('search')
  @Public()
  @ApiOperation({
    summary: 'Rechercher des lignes',
    description: 'Recherche des lignes par nom, numéro ou description',
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
    type: [Line],
  })
  @ApiResponse({ status: 400, description: 'Terme de recherche manquant' })
  async search(@Query('q') query: string): Promise<Line[]> {
    return this.linesService.search(query);
  }

  @Get('number/:number')
  @Public()
  @ApiOperation({
    summary: 'Récupérer une ligne par numéro',
    description: "Récupère les détails d'une ligne par son numéro",
  })
  @ApiParam({
    name: 'number',
    description: 'Numéro de la ligne',
    type: String,
  })
  @ApiResponse({
    status: 200,
    description: 'Ligne récupérée avec succès',
    type: Line,
  })
  @ApiResponse({ status: 404, description: 'Ligne non trouvée' })
  async findByNumber(@Param('number') number: string): Promise<Line> {
    return this.linesService.findByNumber(number);
  }

  @Get(':id')
  @Public()
  @ApiOperation({
    summary: 'Récupérer une ligne par ID',
    description: "Récupère les détails complets d'une ligne spécifique",
  })
  @ApiParam({
    name: 'id',
    description: 'ID de la ligne',
    type: Number,
  })
  @ApiResponse({
    status: 200,
    description: 'Ligne récupérée avec succès',
    type: LineWithStats,
  })
  @ApiResponse({ status: 404, description: 'Ligne non trouvée' })
  async findOne(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<Line | LineWithStats> {
    return this.linesService.findOne(id);
  }

  @Patch(':id')
  @Roles(Role.ADMIN)
  @Permissions(Permission.UPDATE_LINE)
  @ApiOperation({
    summary: 'Mettre à jour une ligne (Admin uniquement)',
    description:
      "Permet aux administrateurs de modifier les informations d'une ligne",
  })
  @ApiParam({
    name: 'id',
    description: 'ID de la ligne',
    type: Number,
  })
  @ApiResponse({
    status: 200,
    description: 'Ligne mise à jour avec succès',
    type: Line,
  })
  @ApiResponse({ status: 400, description: 'Données invalides' })
  @ApiResponse({ status: 403, description: 'Accès interdit' })
  @ApiResponse({ status: 404, description: 'Ligne non trouvée' })
  @ApiResponse({
    status: 409,
    description: 'Conflit - nom ou numéro de ligne existant',
  })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateLineDto: UpdateLineDto,
    @CurrentUser() user: CurrentUserData,
  ): Promise<Line> {
    return this.linesService.update(id, updateLineDto, user);
  }

  @Patch(':id/toggle-active')
  @Roles(Role.ADMIN)
  @Permissions(Permission.UPDATE_LINE)
  @ApiOperation({
    summary: 'Activer/désactiver une ligne (Admin uniquement)',
    description: "Permet aux administrateurs d'activer ou désactiver une ligne",
  })
  @ApiParam({
    name: 'id',
    description: 'ID de la ligne',
    type: Number,
  })
  @ApiResponse({
    status: 200,
    description: 'Statut de la ligne modifié avec succès',
  })
  @ApiResponse({ status: 403, description: 'Accès interdit' })
  @ApiResponse({ status: 404, description: 'Ligne non trouvée' })
  async toggleActive(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: CurrentUserData,
  ): Promise<{ message: string; isActive: boolean }> {
    return this.linesService.toggleActive(id, user);
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  @Permissions(Permission.DELETE_LINE)
  @ApiOperation({
    summary: 'Supprimer une ligne (Admin uniquement)',
    description: "Supprime une ligne si elle n'a pas de bus ou routes assignés",
  })
  @ApiParam({
    name: 'id',
    description: 'ID de la ligne',
    type: Number,
  })
  @ApiResponse({
    status: 200,
    description: 'Ligne supprimée avec succès',
  })
  @ApiResponse({
    status: 400,
    description: 'Ligne avec bus ou routes assignés',
  })
  @ApiResponse({ status: 403, description: 'Accès interdit' })
  @ApiResponse({ status: 404, description: 'Ligne non trouvée' })
  async remove(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: CurrentUserData,
  ): Promise<{ message: string }> {
    return this.linesService.remove(id, user);
  }
}
