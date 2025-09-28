import { PartialType } from '@nestjs/swagger';
import { CreateLineDto } from './create-line.dto';

export class UpdateLineDto extends PartialType(CreateLineDto) {}
