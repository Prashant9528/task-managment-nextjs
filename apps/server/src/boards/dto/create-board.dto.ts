import { IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * CreateBoardDto - Data required to create a new board
 */
export class CreateBoardDto {
  @ApiProperty({ example: 'My Project', description: 'Board title' })
  @IsString()
  @MinLength(1, { message: 'Board title is required' })
  title!: string;
}
