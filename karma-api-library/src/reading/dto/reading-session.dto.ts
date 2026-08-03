import { IsBoolean, IsDateString, IsIn, IsInt, IsOptional, IsString, IsUUID, Max, MaxLength, Min } from 'class-validator';
import { READING_UNITS, type ReadingUnit } from '../../domain/constants';

export class CreateReadingSessionDto {
  @IsUUID() obraId!: string;
  @IsOptional() @IsUUID() volumeId?: string;
  @IsOptional() @IsDateString() occurredAt?: string;
  @IsOptional() @IsInt() @Min(0) @Max(1440) minutes?: number;
  @IsOptional() @IsInt() @Min(0) startProgress?: number;
  @IsOptional() @IsInt() @Min(0) endProgress?: number;
  @IsOptional() @IsIn(READING_UNITS) unit?: ReadingUnit;
  @IsOptional() @IsInt() @Min(1) @Max(100) rereadNumber?: number;
  @IsOptional() @IsBoolean() completed?: boolean;
  @IsOptional() @IsString() @MaxLength(1000) notes?: string;
}

export class UpdateReadingSessionDto {
  @IsOptional() @IsDateString() occurredAt?: string;
  @IsOptional() @IsInt() @Min(0) @Max(1440) minutes?: number;
  @IsOptional() @IsInt() @Min(0) startProgress?: number;
  @IsOptional() @IsInt() @Min(0) endProgress?: number;
  @IsOptional() @IsIn(READING_UNITS) unit?: ReadingUnit;
  @IsOptional() @IsInt() @Min(1) @Max(100) rereadNumber?: number;
  @IsOptional() @IsBoolean() completed?: boolean;
  @IsOptional() @IsString() @MaxLength(1000) notes?: string;
}
