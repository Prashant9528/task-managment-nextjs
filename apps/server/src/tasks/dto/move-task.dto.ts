import { IsString, IsInt, Min } from 'class-validator';

/**
 * MoveTaskDto - Data for moving a task to another column/position
 * 
 * Used for drag-and-drop functionality
 */
export class MoveTaskDto {
  @IsString()
  columnId!: string;  // Target column ID

  @IsInt()
  @Min(0)
  order!: number;     // New position in the column (0 = first)
}
