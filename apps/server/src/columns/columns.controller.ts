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
import { ColumnsService } from './columns.service';
import { CreateColumnDto } from './dto/create-column.dto';
import { UpdateColumnDto } from './dto/update-column.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

/**
 * ColumnsController - HTTP endpoints for column operations
 */
@ApiTags('columns')
@ApiBearerAuth()
@Controller('columns')
@UseGuards(JwtAuthGuard)
export class ColumnsController {
  constructor(private columnsService: ColumnsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new column in a board' })
  @ApiResponse({ status: 201, description: 'Column created' })
  create(
    @Body() dto: CreateColumnDto,
    @CurrentUser() user: { id: string },
  ) {
    return this.columnsService.create(dto, user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single column' })
  @ApiResponse({ status: 200, description: 'Column details' })
  @ApiResponse({ status: 404, description: 'Column not found' })
  findOne(
    @Param('id') id: string,
    @CurrentUser() user: { id: string },
  ) {
    return this.columnsService.findOne(id, user.id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a column title' })
  @ApiResponse({ status: 200, description: 'Column updated' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateColumnDto,
    @CurrentUser() user: { id: string },
  ) {
    return this.columnsService.update(id, dto, user.id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a column and all its tasks' })
  @ApiResponse({ status: 200, description: 'Column deleted' })
  @ApiResponse({ status: 400, description: 'Cannot delete last column' })
  remove(
    @Param('id') id: string,
    @CurrentUser() user: { id: string },
  ) {
    return this.columnsService.remove(id, user.id);
  }
}
