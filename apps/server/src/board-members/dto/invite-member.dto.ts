import { IsEmail, IsString, IsIn, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * DTO for inviting a user to a board
 * 
 * WHAT IS THIS?
 * =============
 * When you want to share your board with someone, you send their email
 * and what role they should have (viewer = read-only, editor = can modify)
 */
export class InviteMemberDto {
  @ApiProperty({
    description: 'Email of the user to invite',
    example: 'friend@example.com',
  })
  @IsEmail({}, { message: 'Please provide a valid email address' })
  email!: string;

  @ApiProperty({
    description: 'Board ID to invite the user to',
    example: 'clxyz123...',
  })
  @IsString()
  boardId!: string;

  @ApiProperty({
    description: 'Role for the invited user',
    example: 'editor',
    enum: ['viewer', 'editor'],
    default: 'editor',
  })
  @IsOptional()
  @IsIn(['viewer', 'editor'], { message: 'Role must be either viewer or editor' })
  role?: string = 'editor';
}
