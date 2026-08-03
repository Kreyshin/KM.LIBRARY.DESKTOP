import { IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class ResizeVolumesDto {
  @Type(() => Number)
  @IsInt()
  @Min(0)
  total: number;
}
