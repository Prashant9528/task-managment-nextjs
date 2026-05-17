import { IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * CreateColumnDto - Data required to create a new column
 */
export class CreateColumnDto {
  @ApiProperty({ example: 'In Review', description: 'Column title' })
  @IsString()
  @MinLength(1, { message: 'Column title is required' })
  title!: string;

  @ApiProperty({ example: 'clxxx123', description: 'Board ID to add column to' })
  @IsString()
  boardId!: string;
}
