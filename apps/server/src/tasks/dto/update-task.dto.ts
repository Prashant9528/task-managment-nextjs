import { IsString, MinLength, IsOptional, IsDateString } from 'class-validator';

/**
 * UpdateTaskDto - Data for updating a task
 * All fields are optional
 */
export class UpdateTaskDto {
  @IsString()
  @MinLength(1, { message: 'Task title cannot be empty' })
  @IsOptional()
  title?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsDateString()
  @IsOptional()
  dueDate?: string;

  @IsString()
  @IsOptional()
  assigneeId?: string;
}
