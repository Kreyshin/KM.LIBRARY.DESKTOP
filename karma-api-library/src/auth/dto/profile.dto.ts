import { IsBoolean, IsHexColor, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateProfileDto {
  @IsString() @MinLength(2) @MaxLength(60) displayName!: string;
  @IsOptional() @IsHexColor() color?: string;
  @IsOptional() @IsBoolean() isKids?: boolean;
}
