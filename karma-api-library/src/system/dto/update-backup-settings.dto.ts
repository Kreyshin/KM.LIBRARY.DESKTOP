import { IsBoolean, IsInt, IsOptional, Max, Min } from 'class-validator';

export class UpdateBackupSettingsDto {
  @IsOptional() @IsBoolean() autoEnabled?: boolean;
  @IsOptional() @IsInt() @Min(1) @Max(720) intervalHours?: number;
  @IsOptional() @IsInt() @Min(1) @Max(100) retention?: number;
}
