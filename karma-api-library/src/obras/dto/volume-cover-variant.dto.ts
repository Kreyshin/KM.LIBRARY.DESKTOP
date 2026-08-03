import {
  IsBoolean,
  IsDateString,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { COVER_EDITION_TYPES, type CoverEditionType } from '../../domain/constants';
import { IsIn } from 'class-validator';

function emptyToUndefined({ value }: { value: unknown }) {
  if (typeof value !== 'string') return value;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : undefined;
}

function toBoolean({ value }: { value: unknown }) {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') return value === 'true';
  return false;
}

export class CreateVolumeCoverVariantDto {
  @IsOptional()
  @Transform(emptyToUndefined)
  @IsString()
  @MaxLength(80)
  language?: string;

  @IsOptional()
  @Transform(emptyToUndefined)
  @IsString()
  @MaxLength(160)
  publisher?: string;

  @IsOptional()
  @Transform(emptyToUndefined)
  @IsString()
  @MaxLength(160)
  edition?: string;

  @IsOptional() @Transform(emptyToUndefined) @IsString() @MaxLength(100)
  country?: string;

  @IsOptional() @Transform(emptyToUndefined) @IsString() @MaxLength(40)
  isbn?: string;

  @IsOptional() @Transform(emptyToUndefined) @IsDateString()
  publishDate?: string;

  @IsOptional() @IsIn(COVER_EDITION_TYPES)
  editionType?: CoverEditionType;

  @IsOptional()
  @Transform(emptyToUndefined)
  @IsString()
  @MaxLength(160)
  label?: string;

  @IsOptional()
  @Transform(toBoolean)
  @IsBoolean()
  isPrimary?: boolean;
}

export class UpdateVolumeCoverVariantDto {
  @IsOptional()
  @Transform(emptyToUndefined)
  @IsString()
  @MaxLength(80)
  language?: string;

  @IsOptional()
  @Transform(emptyToUndefined)
  @IsString()
  @MaxLength(160)
  publisher?: string;

  @IsOptional()
  @Transform(emptyToUndefined)
  @IsString()
  @MaxLength(160)
  edition?: string;

  @IsOptional() @Transform(emptyToUndefined) @IsString() @MaxLength(100)
  country?: string | null;

  @IsOptional() @Transform(emptyToUndefined) @IsString() @MaxLength(40)
  isbn?: string | null;

  @IsOptional() @IsDateString()
  publishDate?: string | null;

  @IsOptional() @IsIn(COVER_EDITION_TYPES)
  editionType?: CoverEditionType;

  @IsOptional()
  @Transform(emptyToUndefined)
  @IsString()
  @MaxLength(160)
  label?: string;

  @IsOptional()
  @Transform(toBoolean)
  @IsBoolean()
  isPrimary?: boolean;
}

export class SetPrimaryVolumeCoverDto {
  @IsOptional()
  @IsString()
  coverId?: string | null;
}
