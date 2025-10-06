import { ApiProperty } from '@nestjs/swagger';
import { Stop as PrismaStop } from '@prisma/client';

export class Stop implements PrismaStop {
  @ApiProperty({
    description: "ID unique de l'arrêt",
    example: 1,
  })
  id: number;

  @ApiProperty({
    description: "Nom de l'arrêt",
    example: 'République',
  })
  name: string;

  @ApiProperty({
    description: "Adresse de l'arrêt",
    example: 'Place de la République, 75011 Paris',
    required: false,
  })
  address: string | null;

  @ApiProperty({
    description: "Latitude de l'arrêt",
    example: 48.8676,
  })
  latitude: number;

  @ApiProperty({
    description: "Longitude de l'arrêt",
    example: 2.3631,
  })
  longitude: number;

  @ApiProperty({
    description: "Zone géographique de l'arrêt",
    example: 'Zone 1',
    required: false,
  })
  zone: string | null;

  @ApiProperty({
    description: "Services disponibles à l'arrêt",
    example: '["wifi", "accessible", "shelter"]',
    required: false,
  })
  services: any | null;

  @ApiProperty({
    description: "URL de la photo de l'arrêt",
    example: 'https://example.com/stop-photo.jpg',
    required: false,
  })
  photo: string | null;

  @ApiProperty({
    description: "Statut actif/inactif de l'arrêt",
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
    description: 'Lignes passant par cet arrêt',
    required: false,
  })
  lines?: any[];

  @ApiProperty({
    description: 'Points de route associés à cet arrêt',
    required: false,
  })
  routePoints?: any[];
}

export class StopWithLines extends Stop {
  @ApiProperty({
    description: 'Lignes passant par cet arrêt avec détails',
    required: false,
  })
  lines?: any[];

  @ApiProperty({
    description: 'Points de route avec informations détaillées',
    required: false,
  })
  routePoints?: any[];
}
