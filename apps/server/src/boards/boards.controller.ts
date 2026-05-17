import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { BoardsService } from './boards.service';
import { CreateBoardDto } from './dto/create-board.dto';
import { UpdateBoardDto } from './dto/update-board.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

/**
 * BoardsController - HTTP endpoints for board operations
 */
@ApiTags('boards')
@ApiBearerAuth()
@Controller('boards')
@UseGuards(JwtAuthGuard)
export class BoardsController {
  constructor(private boardsService: BoardsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new board' })
  @ApiResponse({ status: 201, description: 'Board created with default columns' })
  create(
    @Body() dto: CreateBoardDto,
    @CurrentUser() user: { id: string },
  ) {
    return this.boardsService.create(dto, user.id);
  }

  @Get()
  @ApiOperation({ summary: 'Get all boards for current user' })
  @ApiResponse({ status: 200, description: 'List of boards' })
  findAll(@CurrentUser() user: { id: string }) {
    return this.boardsService.findAll(user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a board with all columns and tasks' })
  @ApiResponse({ status: 200, description: 'Board details' })
  @ApiResponse({ status: 404, description: 'Board not found' })
  findOne(
    @Param('id') id: string,
    @CurrentUser() user: { id: string },
  ) {
    return this.boardsService.findOne(id, user.id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a board title' })
  @ApiResponse({ status: 200, description: 'Board updated' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateBoardDto,
    @CurrentUser() user: { id: string },
  ) {
    return this.boardsService.update(id, dto, user.id);
  }

  /**
   * DELETE /boards/:id
   * Delete a board and all its contents
   */
  @Delete(':id')
  remove(
    @Param('id') id: string,
    @CurrentUser() user: { id: string },
  ) {
    return this.boardsService.remove(id, user.id);
  }
}
