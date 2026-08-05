import { IsInt, IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';

export class UpdateDigitalProgressDto {
  @IsOptional() @IsInt() @Min(1) currentPage?: number;
  @IsOptional() @IsInt() @Min(1) totalPages?: number;
  @IsOptional() @IsNumber() @Min(0) @Max(100) percent?: number;
  @IsOptional() @IsString() locator?: string;
}
