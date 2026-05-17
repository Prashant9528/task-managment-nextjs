import { IsString, MinLength, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

/**
 * UpdateColumnDto - Data for updating a column
 */
export class UpdateColumnDto {
  @ApiPropertyOptional({ example: 'Testing', description: 'New column title' })
  @IsString()
  @MinLength(1, { message: 'Column title cannot be empty' })
  @IsOptional()
  title?: string;
}
