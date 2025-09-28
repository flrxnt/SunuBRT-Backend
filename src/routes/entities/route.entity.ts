import { ApiProperty } from '@nestjs/swagger';
import { Route as PrismaRoute } from '@prisma/client';

export class RoutePointEntity {
  @ApiProperty({
    description: 'ID unique du point de route',
    example: 1,
  })
  id: number;

  @ApiProperty({
    description: 'ID de la route à laquelle appartient ce point',
    example: 1,
  })
  routeId: number;

  @ApiProperty({
    description: 'Latitude du point',
    example: 14.6937,
  })
  latitude: number;

  @ApiProperty({
    description: 'Longitude du point',
    example: -17.4441,
  })
  longitude: number;

  @ApiProperty({
    description: 'Élévation du point',
    example: 25.5,
    required: false,
  })
  elevation: number | null;

  @ApiProperty({
    description: 'Ordre du point dans la route (commence à 1)',
    example: 1,
  })
  seq: number;

  @ApiProperty({
    description: 'Nom optionnel du point',
    example: 'Arrêt Central',
    required: false,
  })
  name: string | null;

  @ApiProperty({
    description: 'Date de création',
    example: '2024-01-15T10:30:00Z',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'Date de dernière mise à jour',
    example: '2024-01-15T10:30:00Z',
  })
  updatedAt: Date;
}

export class Route implements PrismaRoute {
  @ApiProperty({
    description: 'ID unique de la route',
    example: 1,
  })
  id: number;

  @ApiProperty({
    description: 'Nom de la route',
    example: 'Dakar Centre - Guédiawaye',
  })
  name: string;

  @ApiProperty({
    description: 'ID de la ligne à laquelle appartient cette route',
    example: 1,
    required: false,
  })
  lineId: number | null;

  @ApiProperty({
    description: 'ID du point de départ',
    example: 1,
    required: false,
  })
  startPointId: number | null;

  @ApiProperty({
    description: "ID du point d'arrivée",
    example: 15,
    required: false,
  })
  endPointId: number | null;

  @ApiProperty({
    description: 'Distance calculée automatiquement en km',
    example: 15.5,
    required: false,
  })
  distance: number | null;

  @ApiProperty({
    description: 'Durée calculée automatiquement en minutes',
    example: 45,
    required: false,
  })
  duration: number | null;

  @ApiProperty({
    description: 'Description de la route',
    example: 'Route principale reliant le centre-ville de Dakar à Guédiawaye',
    required: false,
  })
  description: string | null;

  @ApiProperty({
    description: 'Statut actif/inactif de la route',
    example: true,
  })
  isActive: boolean;

  @ApiProperty({
    description: 'Date de création',
    example: '2024-01-15T10:30:00Z',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'Date de dernière mise à jour',
    example: '2024-01-15T10:30:00Z',
  })
  updatedAt: Date;

  // Relations optionnelles (chargées selon le besoin)
  @ApiProperty({
    description: 'Ligne à laquelle appartient cette route',
    required: false,
  })
  line?: any;

  @ApiProperty({
    description: 'Point de départ de la route',
    required: false,
  })
  startPoint?: RoutePointEntity;

  @ApiProperty({
    description: "Point d'arrivée de la route",
    required: false,
  })
  endPoint?: RoutePointEntity;

  @ApiProperty({
    description: 'Points constituant la route',
    required: false,
  })
  points?: RoutePointEntity[];

  @ApiProperty({
    description: 'Trajets utilisant cette route',
    required: false,
  })
  trips?: any[];
}

export class RouteWithStats extends Route {
  @ApiProperty({
    description: 'Nombre de points sur cette route',
    example: 12,
  })
  pointsCount?: number;

  @ApiProperty({
    description: 'Nombre de trajets actifs sur cette route',
    example: 3,
  })
  activeTripsCount?: number;

  @ApiProperty({
    description: 'Nombre total de trajets sur cette route',
    example: 8,
  })
  totalTripsCount?: number;

  @ApiProperty({
    description: 'Prochains trajets sur cette route',
    required: false,
  })
  upcomingTrips?: any[];
}
