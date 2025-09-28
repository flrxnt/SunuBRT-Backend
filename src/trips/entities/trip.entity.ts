import { ApiProperty } from '@nestjs/swagger';
import { Trip as PrismaTrip, TripStatus } from '@prisma/client';

export class Trip implements PrismaTrip {
  @ApiProperty({
    description: 'ID unique du trajet',
    example: 1,
  })
  id: number;

  @ApiProperty({
    description: 'ID de la route pour ce trajet',
    example: 1,
  })
  routeId: number;

  @ApiProperty({
    description: 'ID du bus assigné à ce trajet',
    example: 'clxxx-xxxx-xxxx-xxxx',
  })
  busId: string;

  @ApiProperty({
    description: 'Heure de départ du trajet',
    example: '2024-01-15T08:00:00Z',
  })
  startTime: Date;

  @ApiProperty({
    description: "Heure d'arrivée du trajet",
    example: '2024-01-15T09:30:00Z',
    required: false,
  })
  endTime: Date | null;

  @ApiProperty({
    description: 'Prix du ticket pour ce trajet en FCFA',
    example: 500,
  })
  price: number;

  @ApiProperty({
    description: 'Nombre de places disponibles pour ce trajet',
    example: 45,
  })
  availableSeats: number;

  @ApiProperty({
    description: 'Statut du trajet',
    example: TripStatus.SCHEDULED,
    enum: TripStatus,
  })
  status: TripStatus;

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
    description: 'Route de ce trajet',
    required: false,
  })
  route?: any;

  @ApiProperty({
    description: 'Bus assigné à ce trajet',
    required: false,
  })
  bus?: any;

  @ApiProperty({
    description: 'Tickets vendus pour ce trajet',
    required: false,
  })
  tickets?: any[];
}

export class TripWithStats extends Trip {
  @ApiProperty({
    description: 'Nombre de tickets vendus pour ce trajet',
    example: 23,
  })
  soldTickets?: number;

  @ApiProperty({
    description: 'Nombre de places restantes',
    example: 22,
  })
  remainingSeats?: number;

  @ApiProperty({
    description: 'Pourcentage de remplissage',
    example: 51.1,
  })
  occupancyRate?: number;

  @ApiProperty({
    description: 'Revenus générés par ce trajet',
    example: 11500,
  })
  revenue?: number;

  @ApiProperty({
    description: 'Durée estimée du trajet en minutes',
    example: 90,
  })
  estimatedDuration?: number;

  @ApiProperty({
    description: 'Distance du trajet en kilomètres',
    example: 15.5,
  })
  distance?: number;
}
