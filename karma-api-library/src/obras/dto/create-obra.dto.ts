import {
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
  MinLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import { DEMOGRAPHICS, FORMAT_TYPES, READING_STATUSES, type Demographic, type FormatType, type ReadingStatus } from '../../domain/constants';

export class CreateObraDto {
  @IsString()
  @MinLength(1)
  titulo: string;

  @IsOptional() @IsString() originalTitle?: string;
  @IsOptional() @IsString() autor?: string;
  @IsOptional() @IsString() illustrator?: string;
  @IsOptional() @IsString() publisher?: string;

  @IsOptional() @Type(() => Number) @IsInt() releaseYear?: number;

  @IsOptional() @IsIn(FORMAT_TYPES) tipo?: FormatType;

  @IsOptional() @IsIn(DEMOGRAPHICS) demographic?: Demographic;

  @IsOptional() @IsArray() @IsString({ each: true }) genres?: string[];

  @IsOptional() @IsString() language?: string;

  @IsOptional() @IsIn(READING_STATUSES) status?: ReadingStatus;

  @IsOptional() @Type(() => Number) @IsInt() currentVolume?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) currentChapter?: number;
  @IsOptional() @Type(() => Number) @IsInt() totalChapters?: number;

  @IsOptional() @IsArray() @IsString({ each: true }) tags?: string[];

  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) @Max(5) rating?: number;

  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsString() personalReview?: string;
  @IsOptional() @IsString() notes?: string;
  @IsOptional() @IsBoolean() favorite?: boolean;

  @IsOptional() @Type(() => Number) @IsInt() @Min(0) totalVolumes?: number;
}
