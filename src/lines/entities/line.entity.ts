import { ApiProperty } from '@nestjs/swagger';
import { Line as PrismaLine } from '@prisma/client';

export class Line implements PrismaLine {
  @ApiProperty({
    description: 'ID unique de la ligne',
    example: 1,
  })
  id: number;

  @ApiProperty({
    description: 'Nom de la ligne',
    example: 'Ligne 1',
  })
  name: string;

  @ApiProperty({
    description: 'Numéro unique de la ligne',
    example: '1',
  })
  number: string;

  @ApiProperty({
    description: "Couleur de la ligne pour l'affichage",
    example: '#FF5722',
    required: false,
  })
  color: string | null;

  @ApiProperty({
    description: 'Description de la ligne',
    example: 'Ligne principale reliant le centre-ville aux banlieues',
    required: false,
  })
  description: string | null;

  @ApiProperty({
    description: 'Statut actif/inactif de la ligne',
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
    description: 'Bus assignés à cette ligne',
    required: false,
  })
  buses?: any[];

  @ApiProperty({
    description: 'Routes de cette ligne',
    required: false,
  })
  routes?: any[];
}

export class LineWithStats extends Line {
  @ApiProperty({
    description: 'Nombre de bus actifs sur cette ligne',
    example: 5,
  })
  activeBusesCount?: number;

  @ApiProperty({
    description: 'Nombre total de bus sur cette ligne',
    example: 7,
  })
  totalBusesCount?: number;

  @ApiProperty({
    description: 'Nombre de routes sur cette ligne',
    example: 3,
  })
  routesCount?: number;
}
