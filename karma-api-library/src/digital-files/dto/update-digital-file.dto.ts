import { IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateDigitalFileDto {
  @IsOptional() @IsString() @MaxLength(80) label?: string;
}
