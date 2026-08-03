import { IsString, IsUUID, MaxLength, MinLength } from 'class-validator';

export class CreateGenreDto {
  @IsString()
  @MinLength(2)
  @MaxLength(60)
  name!: string;
}

export class UpdateGenreDto extends CreateGenreDto {}

export class MergeGenreDto {
  @IsUUID()
  targetId!: string;
}
