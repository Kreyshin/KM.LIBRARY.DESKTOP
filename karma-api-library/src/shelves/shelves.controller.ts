import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentReader } from '../auth/current-reader.decorator';
import { AddShelfItemDto, CreateShelfDto, ReorderShelfItemsDto, UpdateShelfDto } from './dto/shelf.dto';
import { ShelvesService } from './shelves.service';

@Controller('shelves')
@UseGuards(AuthGuard)
export class ShelvesController {
  constructor(private readonly shelves: ShelvesService) {}
  @Get() list(@CurrentReader() reader: { id: string }) { return this.shelves.list(reader.id); }
  @Post() create(@CurrentReader() reader: { id: string }, @Body() dto: CreateShelfDto) { return this.shelves.create(reader.id, dto); }
  @Patch(':id') update(@CurrentReader() reader: { id: string }, @Param('id') id: string, @Body() dto: UpdateShelfDto) { return this.shelves.update(reader.id, id, dto); }
  @Delete(':id') remove(@CurrentReader() reader: { id: string }, @Param('id') id: string) { return this.shelves.remove(reader.id, id); }
  @Post(':id/items') addItem(@CurrentReader() reader: { id: string }, @Param('id') id: string, @Body() dto: AddShelfItemDto) { return this.shelves.addItem(reader.id, id, dto); }
  @Delete(':id/items/:obraId') removeItem(@CurrentReader() reader: { id: string }, @Param('id') id: string, @Param('obraId') obraId: string) { return this.shelves.removeItem(reader.id, id, obraId); }
  @Patch(':id/reorder') reorder(@CurrentReader() reader: { id: string }, @Param('id') id: string, @Body() dto: ReorderShelfItemsDto) { return this.shelves.reorder(reader.id, id, dto); }
}
