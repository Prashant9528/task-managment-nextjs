import { IsString, MinLength, IsOptional, IsDateString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * CreateTaskDto - Data required to create a new task
 */
export class CreateTaskDto {
  @ApiProperty({ example: 'Build login page', description: 'Task title' })
  @IsString()
  @MinLength(1, { message: 'Task title is required' })
  title!: string;

  @ApiPropertyOptional({ example: 'Create the login form with validation', description: 'Task description' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ example: 'clxxx123', description: 'Column ID to add task to' })
  @IsString()
  columnId!: string;

  @ApiPropertyOptional({ example: '2026-12-31', description: 'Due date (ISO string)' })
  @IsDateString()
  @IsOptional()
  dueDate?: string;

  @ApiPropertyOptional({ example: 'clyyy456', description: 'User ID to assign' })
  @IsString()
  @IsOptional()
  assigneeId?: string;
}
