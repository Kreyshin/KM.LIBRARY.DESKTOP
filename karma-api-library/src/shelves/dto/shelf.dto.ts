import { ArrayMaxSize, IsArray, IsHexColor, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class CreateShelfDto {
  @IsString() @MaxLength(60) name!: string;
  @IsOptional() @IsString() @MaxLength(200) description?: string;
  @IsOptional() @IsHexColor() color?: string;
}

export class UpdateShelfDto {
  @IsOptional() @IsString() @MaxLength(60) name?: string;
  @IsOptional() @IsString() @MaxLength(200) description?: string;
  @IsOptional() @IsHexColor() color?: string;
}

export class AddShelfItemDto { @IsUUID() obraId!: string; }

export class ReorderShelfItemsDto {
  @IsArray() @ArrayMaxSize(1000) @IsUUID(undefined, { each: true }) obraIds!: string[];
}
