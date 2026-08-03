import { IsBoolean, IsDateString, IsIn, IsOptional, IsString } from 'class-validator';
import { VOLUME_OWNERSHIPS, VOLUME_STATUSES, type VolumeOwnership, type VolumeStatus } from '../../domain/constants';

export class UpdateVolumeDto {
  @IsOptional() @IsIn(VOLUME_STATUSES) status?: VolumeStatus;
  @IsOptional() @IsBoolean() read?: boolean;
  @IsOptional() @IsString() chapters?: string;
  @IsOptional() @IsDateString() startDate?: string;
  @IsOptional() @IsDateString() finishDate?: string;
  @IsOptional() @IsString() notes?: string;
  @IsOptional() @IsString() title?: string;
  @IsOptional() @IsString() isbn?: string;
  @IsOptional() @IsString() publisher?: string;
  @IsOptional() @IsDateString() publishDate?: string;
  @IsOptional() @IsIn(VOLUME_OWNERSHIPS) ownership?: VolumeOwnership;
}
