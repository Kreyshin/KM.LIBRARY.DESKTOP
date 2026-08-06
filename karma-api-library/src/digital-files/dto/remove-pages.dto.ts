import { ArrayMinSize, IsArray, IsString } from 'class-validator';

export class RemovePagesDto {
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  pages!: string[];
}
