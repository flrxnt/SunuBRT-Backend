import { ApiProperty } from '@nestjs/swagger';

export class Bus {
  @ApiProperty({
    description: 'Identifiant unique du bus',
    example: 'clxxx-xxxx-xxxx-xxxx',
  })
  id: string;

  @ApiProperty({
    description: 'Numéro unique du bus',
    example: '001',
  })
  busNumber: string;

  @ApiProperty({
    description: "Plaque d'immatriculation du bus",
    example: 'DK-1234-AB',
  })
  licensePlate: string;

  @ApiProperty({
    description: 'Capacité maximale de passagers',
    example: 50,
  })
  capacity: number;

  @ApiProperty({
    description: 'Modèle du bus',
    example: 'Mercedes Citaro',
    required: false,
  })
  model?: string;

  @ApiProperty({
    description: 'Année de fabrication du bus',
    example: 2020,
    required: false,
  })
  year?: number;

  @ApiProperty({
    description: 'ID de la ligne assignée au bus',
    example: 1,
    required: false,
  })
  lineId?: number;

  @ApiProperty({
    description: 'ID du conducteur assigné au bus',
    example: 'clxxx-xxxx-xxxx-xxxx',
  })
  driverId: string;

  @ApiProperty({
    description: 'Statut actif du bus',
    example: true,
  })
  isActive: boolean;

  @ApiProperty({
    description: 'Nombre de passagers actuels',
    example: 25,
  })
  passengersCount: number;

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

  // Relations optionnelles pour les réponses étendues
  @ApiProperty({
    description: 'Informations de la ligne assignée',
    required: false,
  })
  line?: {
    id: number;
    name: string;
    number: string;
    color?: string;
  };

  @ApiProperty({
    description: 'Informations du conducteur assigné',
    required: false,
  })
  driver?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
  };

  @ApiProperty({
    description: 'Position actuelle du bus',
    required: false,
  })
  currentPosition?: {
    id: number;
    latitude: number;
    longitude: number;
    altitude?: number;
    speed?: number;
    heading?: number;
    timestamp: Date;
  };

  constructor(partial: Partial<Bus>) {
    Object.assign(this, partial);
  }
}
