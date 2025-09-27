import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Request,
  Query,
  ParseIntPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiQuery,
  ApiParam,
} from '@nestjs/swagger';
import { BusesService } from './buses.service';
import { CreateBusDto } from './dto/create-bus.dto';
import { UpdateBusDto } from './dto/update-bus.dto';
import { UpdatePositionDto } from './dto/update-position.dto';
import { Bus } from './entities/bus.entity';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '@prisma/client';

@ApiTags('Buses')
@ApiBearerAuth()
@Controller('buses')
export class BusesController {
  constructor(private readonly busesService: BusesService) {}

  @Post()
  @Roles(Role.ADMIN)
  @ApiOperation({
    summary: 'Créer un nouveau bus (Admin uniquement)',
    description:
      'Permet aux administrateurs de créer un nouveau bus avec toutes les informations nécessaires',
  })
  @ApiResponse({
    status: 201,
    description: 'Bus créé avec succès',
    type: Bus,
  })
  @ApiResponse({ status: 400, description: 'Données invalides' })
  @ApiResponse({ status: 403, description: 'Accès interdit' })
  @ApiResponse({
    status: 409,
    description: 'Conflit - numéro de bus ou plaque existante',
  })
  async create(@Body() createBusDto: CreateBusDto, @Request() req) {
    return this.busesService.create(createBusDto, req.user);
  }

  @Get()
  @ApiOperation({
    summary: 'Récupérer tous les bus',
    description:
      'Récupère la liste de tous les bus avec possibilité de filtrage',
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
  @ApiResponse({
    status: 200,
    description: 'Liste des bus récupérée avec succès',
    type: [Bus],
  })
  async findAll(
    @Query('lineId') lineId?: string,
    @Query('isActive') isActive?: string,
  ) {
    const query: any = {};

    if (lineId) {
      query.lineId = parseInt(lineId, 10);
    }

    if (isActive !== undefined) {
      query.isActive = isActive === 'true';
    }

    return this.busesService.findAll(query);
  }

  @Get('statistics')
  @Roles(Role.ADMIN)
  @ApiOperation({
    summary: 'Récupérer les statistiques des bus (Admin uniquement)',
    description:
      'Fournit des statistiques détaillées sur les bus par ligne, statut, etc.',
  })
  @ApiResponse({
    status: 200,
    description: 'Statistiques récupérées avec succès',
  })
  @ApiResponse({ status: 403, description: 'Accès interdit' })
  async getStatistics(@Request() req) {
    return this.busesService.getBusStatistics();
  }

  @Get('line/:lineId')
  @ApiOperation({
    summary: "Récupérer tous les bus d'une ligne spécifique",
    description: 'Récupère tous les bus actifs associés à une ligne donnée',
  })
  @ApiParam({
    name: 'lineId',
    description: 'ID de la ligne',
    type: Number,
  })
  @ApiResponse({
    status: 200,
    description: 'Bus de la ligne récupérés avec succès',
    type: [Bus],
  })
  @ApiResponse({ status: 404, description: 'Ligne non trouvée' })
  async findByLine(@Param('lineId', ParseIntPipe) lineId: number) {
    return this.busesService.findByLine(lineId);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Récupérer un bus par ID',
    description: "Récupère les détails complets d'un bus spécifique",
  })
  @ApiParam({
    name: 'id',
    description: 'ID du bus',
    type: String,
  })
  @ApiResponse({
    status: 200,
    description: 'Détails du bus récupérés avec succès',
    type: Bus,
  })
  @ApiResponse({ status: 404, description: 'Bus non trouvé' })
  async findOne(@Param('id') id: string) {
    return this.busesService.findOne(id);
  }

  @Patch(':id/position')
  @Roles(Role.DRIVER, Role.ADMIN)
  @ApiOperation({
    summary: 'Mettre à jour la position du bus (Conducteur/Admin)',
    description:
      'Permet aux conducteurs de mettre à jour la position de leur bus en temps réel',
  })
  @ApiParam({
    name: 'id',
    description: 'ID du bus',
    type: String,
  })
  @ApiResponse({
    status: 200,
    description: 'Position mise à jour avec succès',
  })
  @ApiResponse({ status: 400, description: 'Bus inactif ou données invalides' })
  @ApiResponse({ status: 403, description: 'Accès interdit - pas votre bus' })
  @ApiResponse({ status: 404, description: 'Bus non trouvé' })
  async updatePosition(
    @Param('id') id: string,
    @Body() updatePositionDto: UpdatePositionDto,
    @Request() req,
  ) {
    return this.busesService.updatePosition(id, updatePositionDto, req.user);
  }

  @Patch(':id')
  @Roles(Role.ADMIN)
  @ApiOperation({
    summary: 'Mettre à jour les détails du bus (Admin uniquement)',
    description:
      "Permet aux administrateurs de modifier toutes les informations d'un bus",
  })
  @ApiParam({
    name: 'id',
    description: 'ID du bus',
    type: String,
  })
  @ApiResponse({
    status: 200,
    description: 'Bus mis à jour avec succès',
    type: Bus,
  })
  @ApiResponse({ status: 400, description: 'Données invalides' })
  @ApiResponse({ status: 403, description: 'Accès interdit' })
  @ApiResponse({ status: 404, description: 'Bus non trouvé' })
  @ApiResponse({
    status: 409,
    description: 'Conflit - numéro de bus ou plaque existante',
  })
  async update(
    @Param('id') id: string,
    @Body() updateBusDto: UpdateBusDto,
    @Request() req,
  ) {
    return this.busesService.update(id, updateBusDto, req.user);
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  @ApiOperation({
    summary: 'Supprimer un bus (Admin uniquement)',
    description: "Supprime un bus s'il n'a pas de trajets actifs",
  })
  @ApiParam({
    name: 'id',
    description: 'ID du bus',
    type: String,
  })
  @ApiResponse({
    status: 200,
    description: 'Bus supprimé avec succès',
  })
  @ApiResponse({ status: 400, description: 'Bus avec trajets actifs' })
  @ApiResponse({ status: 403, description: 'Accès interdit' })
  @ApiResponse({ status: 404, description: 'Bus non trouvé' })
  async remove(@Param('id') id: string, @Request() req) {
    return this.busesService.remove(id, req.user);
  }
}
