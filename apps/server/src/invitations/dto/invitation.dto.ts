import { IsString, IsIn, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * DTO for sending an invitation
 */
export class SendInvitationDto {
  @ApiProperty({ description: 'ID of the user to invite' })
  @IsString()
  userId!: string;

  @ApiProperty({ description: 'ID of the board to invite to' })
  @IsString()
  boardId!: string;

  @ApiProperty({
    description: 'Role for the invited user',
    enum: ['viewer', 'editor'],
    default: 'editor',
  })
  @IsOptional()
  @IsIn(['viewer', 'editor'])
  role?: string = 'editor';
}

/**
 * DTO for responding to an invitation
 */
export class RespondInvitationDto {
  @ApiProperty({
    description: 'Accept or reject the invitation',
    enum: ['accept', 'reject'],
  })
  @IsIn(['accept', 'reject'])
  action!: 'accept' | 'reject';
}
