import { IsString, IsIn } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * DTO for updating a board member's role
 */
export class UpdateMemberDto {
  @ApiProperty({
    description: 'New role for the member',
    example: 'viewer',
    enum: ['viewer', 'editor'],
  })
  @IsIn(['viewer', 'editor'], { message: 'Role must be either viewer or editor' })
  role!: string;
}
