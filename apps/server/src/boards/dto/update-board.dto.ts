import { IsString, MinLength, IsOptional } from 'class-validator';

/**
 * UpdateBoardDto - Data for updating a board
 * All fields are optional (only update what's provided)
 */
export class UpdateBoardDto {
  @IsString()
  @MinLength(1, { message: 'Board title cannot be empty' })
  @IsOptional()
  title?: string;
}
