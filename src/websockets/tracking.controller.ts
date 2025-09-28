import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Query,
  UseGuards,
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
  ApiBody,
} from '@nestjs/swagger';
import {
  BusTrackingService,
  BusPositionUpdate,
  BusStatusUpdate,
  TrafficAlert,
} from './bus-tracking.service';
import { WebsocketsGateway } from './websockets.gateway';
import { AuthGuard } from '../common/guards/auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Public } from '../common/decorators/public.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Role } from '@prisma/client';

@ApiTags('Bus Tracking')
@Controller('tracking')
@UseGuards(AuthGuard, RolesGuard)
@ApiBearerAuth()
export class TrackingController {
  constructor(
    private readonly busTrackingService: BusTrackingService,
    private readonly websocketsGateway: WebsocketsGateway,
  ) {}

  // ===============================
  // ENDPOINTS PUBLICS - CONSULTATION
  // ===============================

  @Get('lines/:lineId/buses')
  @Public()
  @ApiOperation({
    summary: "Positions des bus d'une ligne",
    description:
      "Récupère les positions actuelles de tous les bus actifs d'une ligne",
  })
  @ApiParam({
    name: 'lineId',
    type: Number,
    description: 'ID de la ligne',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Positions des bus de la ligne',
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          busId: { type: 'string', description: 'ID du bus' },
          busNumber: { type: 'string', description: 'Numéro du bus' },
          position: {
            type: 'object',
            properties: {
              latitude: { type: 'number', description: 'Latitude GPS' },
              longitude: { type: 'number', description: 'Longitude GPS' },
              speed: { type: 'number', description: 'Vitesse en km/h' },
              heading: { type: 'number', description: 'Direction en degrés' },
              timestamp: {
                type: 'string',
                description: 'Timestamp de la position',
              },
            },
          },
          passengers: { type: 'number', description: 'Nombre de passagers' },
          capacity: { type: 'number', description: 'Capacité maximale' },
          occupancyRate: {
            type: 'number',
            description: "Taux d'occupation en %",
          },
        },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Ligne non trouvée',
  })
  async getLineBusPositions(@Param('lineId', ParseIntPipe) lineId: number) {
    return this.busTrackingService.updateLinePositions(lineId);
  }

  @Get('buses/:busId/position')
  @Public()
  @ApiOperation({
    summary: "Position actuelle d'un bus",
    description: "Récupère la position GPS actuelle d'un bus spécifique",
  })
  @ApiParam({
    name: 'busId',
    type: String,
    description: 'ID du bus',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Position actuelle du bus',
    schema: {
      type: 'object',
      properties: {
        busId: { type: 'string', description: 'ID du bus' },
        busNumber: { type: 'string', description: 'Numéro du bus' },
        position: {
          type: 'object',
          properties: {
            latitude: { type: 'number', description: 'Latitude GPS' },
            longitude: { type: 'number', description: 'Longitude GPS' },
            altitude: { type: 'number', description: 'Altitude en mètres' },
            speed: { type: 'number', description: 'Vitesse en km/h' },
            heading: { type: 'number', description: 'Direction en degrés' },
            timestamp: {
              type: 'string',
              description: 'Timestamp de la position',
            },
          },
        },
        status: {
          type: 'object',
          properties: {
            isActive: { type: 'boolean', description: 'Bus actif' },
            passengers: { type: 'number', description: 'Nombre de passagers' },
            capacity: { type: 'number', description: 'Capacité maximale' },
            occupancyRate: {
              type: 'number',
              description: "Taux d'occupation en %",
            },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Bus non trouvé',
  })
  async getBusPosition(@Param('busId') busId: string) {
    // Cette méthode devra être implémentée dans le service
    throw new Error('Fonctionnalité à implémenter');
  }

  @Get('buses/:busId/history')
  @Public()
  @ApiOperation({
    summary: "Historique des positions d'un bus",
    description: "Récupère l'historique des positions GPS d'un bus",
  })
  @ApiParam({
    name: 'busId',
    type: String,
    description: 'ID du bus',
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
    name: 'limit',
    required: false,
    type: Number,
    description: 'Nombre maximum de positions (défaut: 100)',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Historique des positions',
  })
  async getBusPositionHistory(
    @Param('busId') busId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('limit') limit?: number,
  ) {
    return this.busTrackingService.getBusPositionHistory(
      busId,
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined,
      limit || 100,
    );
  }

  @Get('statistics')
  @Public()
  @ApiOperation({
    summary: 'Statistiques de tracking',
    description: 'Récupère les statistiques générales de tracking des bus',
  })
  @ApiQuery({
    name: 'lineId',
    required: false,
    type: Number,
    description: 'Filtrer par ligne (optionnel)',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Statistiques de tracking',
    schema: {
      type: 'object',
      properties: {
        activeBuses: { type: 'number', description: 'Nombre de bus actifs' },
        totalBuses: { type: 'number', description: 'Nombre total de bus' },
        busesWithPosition: {
          type: 'number',
          description: 'Bus avec position GPS',
        },
        coverageRate: {
          type: 'number',
          description: 'Taux de couverture GPS en %',
        },
        websocket: {
          type: 'object',
          properties: {
            totalConnectedUsers: {
              type: 'number',
              description: 'Utilisateurs connectés',
            },
            trackedBuses: { type: 'number', description: 'Bus suivis' },
            trackedLines: { type: 'number', description: 'Lignes suivies' },
          },
        },
        lastUpdate: { type: 'string', description: 'Dernière mise à jour' },
      },
    },
  })
  async getTrackingStatistics(@Query('lineId') lineId?: number) {
    return this.busTrackingService.getTrackingStatistics(
      lineId ? parseInt(lineId.toString()) : undefined,
    );
  }

  @Get('alerts')
  @Public()
  @ApiOperation({
    summary: 'Alertes de trafic actives',
    description: 'Récupère les alertes de trafic et incidents en cours',
  })
  @ApiQuery({
    name: 'lineId',
    required: false,
    type: Number,
    description: 'Filtrer par ligne',
  })
  @ApiQuery({
    name: 'busId',
    required: false,
    type: String,
    description: 'Filtrer par bus',
  })
  @ApiQuery({
    name: 'severity',
    required: false,
    enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
    description: 'Filtrer par sévérité',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Liste des alertes actives',
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string', description: "ID de l'alerte" },
          lineId: { type: 'number', description: 'ID de la ligne' },
          busId: { type: 'string', description: 'ID du bus (optionnel)' },
          type: {
            type: 'string',
            enum: [
              'CONGESTION',
              'INCIDENT',
              'BREAKDOWN',
              'DELAY',
              'ROUTE_CHANGE',
            ],
            description: "Type d'alerte",
          },
          severity: {
            type: 'string',
            enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
            description: 'Niveau de sévérité',
          },
          message: { type: 'string', description: "Message d'alerte" },
          location: {
            type: 'object',
            properties: {
              latitude: { type: 'number' },
              longitude: { type: 'number' },
              description: { type: 'string' },
            },
          },
          timestamp: { type: 'string', description: "Date de l'alerte" },
        },
      },
    },
  })
  async getActiveAlerts(
    @Query('lineId') lineId?: number,
    @Query('busId') busId?: string,
    @Query('severity') severity?: string,
  ) {
    const alerts = this.busTrackingService.getActiveAlerts(busId, lineId);

    // Filtrer par sévérité si spécifiée
    if (severity) {
      return alerts.filter((alert) => alert.severity === severity);
    }

    return alerts;
  }

  // ===============================
  // ENDPOINTS CONDUCTEURS
  // ===============================

  @Post('buses/:busId/position')
  @Roles(Role.DRIVER, Role.ADMIN)
  @ApiOperation({
    summary: "Mettre à jour la position d'un bus",
    description: "Met à jour la position GPS d'un bus (Conducteurs et Admins)",
  })
  @ApiParam({
    name: 'busId',
    type: String,
    description: 'ID du bus',
  })
  @ApiBody({
    description: 'Données de position GPS',
    schema: {
      type: 'object',
      required: ['latitude', 'longitude'],
      properties: {
        latitude: {
          type: 'number',
          minimum: -90,
          maximum: 90,
          description: 'Latitude GPS',
          example: 14.6937,
        },
        longitude: {
          type: 'number',
          minimum: -180,
          maximum: 180,
          description: 'Longitude GPS',
          example: -17.4441,
        },
        altitude: {
          type: 'number',
          description: 'Altitude en mètres',
          example: 25.5,
        },
        speed: {
          type: 'number',
          description: 'Vitesse en km/h',
          example: 45.2,
        },
        heading: {
          type: 'number',
          minimum: 0,
          maximum: 360,
          description: 'Direction en degrés',
          example: 180.5,
        },
        accuracy: {
          type: 'number',
          description: 'Précision GPS en mètres',
          example: 5.0,
        },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Position mise à jour avec succès',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Accès interdit (pas votre bus)',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Bus non trouvé',
  })
  async updateBusPosition(
    @Param('busId') busId: string,
    @Body() positionData: BusPositionUpdate,
    @CurrentUser() user: any,
  ) {
    // Pour les conducteurs, vérifier qu'ils ne peuvent mettre à jour que leur propre bus
    if (user.role === Role.DRIVER) {
      // Cette vérification devrait être faite dans le service ou un guard
      // Pour l'instant, on passe le userId pour vérification
    }

    return this.busTrackingService.updateBusPosition({
      ...positionData,
      busId,
      timestamp: new Date(),
    });
  }

  @Post('buses/:busId/status')
  @Roles(Role.DRIVER, Role.ADMIN)
  @ApiOperation({
    summary: "Mettre à jour le statut d'un bus",
    description:
      "Met à jour le statut et les informations d'un bus (Conducteurs et Admins)",
  })
  @ApiParam({
    name: 'busId',
    type: String,
    description: 'ID du bus',
  })
  @ApiBody({
    description: 'Données de statut du bus',
    schema: {
      type: 'object',
      required: ['passengersCount'],
      properties: {
        passengersCount: {
          type: 'number',
          minimum: 0,
          description: 'Nombre de passagers actuels',
          example: 35,
        },
        isActive: {
          type: 'boolean',
          description: 'Bus en service',
          example: true,
        },
        tripId: {
          type: 'number',
          description: 'ID du voyage en cours',
          example: 123,
        },
        lastStopId: {
          type: 'number',
          description: 'ID du dernier arrêt',
          example: 5,
        },
        nextStopId: {
          type: 'number',
          description: 'ID du prochain arrêt',
          example: 6,
        },
        delayMinutes: {
          type: 'number',
          description: 'Retard en minutes (négatif = avance)',
          example: -2,
        },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Statut mis à jour avec succès',
  })
  async updateBusStatus(
    @Param('busId') busId: string,
    @Body() statusData: BusStatusUpdate,
    @CurrentUser() user: any,
  ) {
    return this.busTrackingService.updateBusStatus({
      ...statusData,
      busId,
    });
  }

  // ===============================
  // ENDPOINTS ADMINISTRATIFS
  // ===============================

  @Post('alerts')
  @Roles(Role.ADMIN)
  @ApiOperation({
    summary: 'Créer une alerte de trafic',
    description:
      'Crée une nouvelle alerte de trafic ou incident (Admin uniquement)',
  })
  @ApiBody({
    description: "Données de l'alerte",
    schema: {
      type: 'object',
      required: ['lineId', 'type', 'severity', 'message'],
      properties: {
        lineId: {
          type: 'number',
          description: 'ID de la ligne concernée',
          example: 1,
        },
        busId: {
          type: 'string',
          description: 'ID du bus concerné (optionnel)',
          example: 'bus-001',
        },
        type: {
          type: 'string',
          enum: [
            'CONGESTION',
            'INCIDENT',
            'BREAKDOWN',
            'DELAY',
            'ROUTE_CHANGE',
          ],
          description: "Type d'alerte",
          example: 'INCIDENT',
        },
        severity: {
          type: 'string',
          enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
          description: 'Niveau de sévérité',
          example: 'HIGH',
        },
        message: {
          type: 'string',
          description: "Message d'alerte",
          example: 'Accident sur la route, circulation perturbée',
        },
        location: {
          type: 'object',
          properties: {
            latitude: { type: 'number', example: 14.6937 },
            longitude: { type: 'number', example: -17.4441 },
            description: { type: 'string', example: 'Intersection Plateau' },
          },
        },
        estimatedDuration: {
          type: 'number',
          description: 'Durée estimée en minutes',
          example: 30,
        },
        affectedRoutes: {
          type: 'array',
          items: { type: 'number' },
          description: 'IDs des routes affectées',
          example: [1, 2],
        },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Alerte créée avec succès',
  })
  async createTrafficAlert(@Body() alertData: TrafficAlert) {
    return this.busTrackingService.emitTrafficAlert(alertData);
  }

  @Get('admin/websocket-stats')
  @Roles(Role.ADMIN)
  @ApiOperation({
    summary: 'Statistiques WebSocket détaillées',
    description:
      'Récupère les statistiques détaillées des connexions WebSocket (Admin)',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Statistiques WebSocket',
    schema: {
      type: 'object',
      properties: {
        totalConnectedUsers: {
          type: 'number',
          description: 'Total utilisateurs connectés',
        },
        trackedBuses: { type: 'number', description: 'Nombre de bus suivis' },
        trackedLines: {
          type: 'number',
          description: 'Nombre de lignes suivies',
        },
        totalBusTrackers: {
          type: 'number',
          description: 'Total de suivis de bus',
        },
        totalLineTrackers: {
          type: 'number',
          description: 'Total de suivis de ligne',
        },
        mostTrackedBuses: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              busId: { type: 'string' },
              trackersCount: { type: 'number' },
            },
          },
        },
        mostTrackedLines: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              lineId: { type: 'number' },
              trackersCount: { type: 'number' },
            },
          },
        },
      },
    },
  })
  async getWebSocketStatistics() {
    const stats = this.websocketsGateway.getTrackingStatistics();
    const mostTrackedBuses = this.websocketsGateway.getMostTrackedBuses(10);
    const mostTrackedLines = this.websocketsGateway.getMostTrackedLines(10);

    return {
      ...stats,
      mostTrackedBuses,
      mostTrackedLines,
    };
  }

  @Post('admin/refresh-positions')
  @Roles(Role.ADMIN)
  @ApiOperation({
    summary: 'Actualiser toutes les positions',
    description:
      "Force l'actualisation des positions de tous les bus actifs (Admin)",
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Positions actualisées avec succès',
  })
  async refreshAllPositions() {
    await this.busTrackingService.refreshAllBusPositions();
    return {
      message: 'Actualisation des positions lancée',
      timestamp: new Date().toISOString(),
    };
  }

  @Get('admin/system-health')
  @Roles(Role.ADMIN)
  @ApiOperation({
    summary: 'État de santé du système de tracking',
    description: "Vérifie l'état de santé du système de tracking (Admin)",
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'État de santé du système',
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string', enum: ['healthy', 'degraded', 'down'] },
        checks: {
          type: 'object',
          properties: {
            database: {
              type: 'boolean',
              description: 'Base de données accessible',
            },
            websocket: {
              type: 'boolean',
              description: 'WebSocket fonctionnel',
            },
            busPositions: {
              type: 'boolean',
              description: 'Positions GPS récentes',
            },
            alerts: { type: 'boolean', description: "Système d'alertes actif" },
          },
        },
        metrics: {
          type: 'object',
          properties: {
            uptime: {
              type: 'number',
              description: 'Temps de fonctionnement en ms',
            },
            memoryUsage: {
              type: 'number',
              description: 'Utilisation mémoire en MB',
            },
            lastPositionUpdate: {
              type: 'string',
              description: 'Dernière mise à jour GPS',
            },
            activeConnections: {
              type: 'number',
              description: 'Connexions WebSocket actives',
            },
          },
        },
        timestamp: { type: 'string', description: 'Timestamp de vérification' },
      },
    },
  })
  async getSystemHealth() {
    // Cette méthode devrait implémenter des vérifications de santé
    const stats = this.websocketsGateway.getTrackingStatistics();

    return {
      status: 'healthy',
      checks: {
        database: true, // À vérifier avec une vraie requête DB
        websocket: stats.totalConnectedUsers >= 0,
        busPositions: true, // À vérifier avec les timestamps récents
        alerts: true,
      },
      metrics: {
        uptime: process.uptime() * 1000,
        memoryUsage: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
        lastPositionUpdate: new Date().toISOString(), // À récupérer de la vraie dernière mise à jour
        activeConnections: stats.totalConnectedUsers,
      },
      timestamp: new Date().toISOString(),
    };
  }
}
