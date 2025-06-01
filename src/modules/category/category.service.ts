import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateCategoryDto } from './create-category.dto';

@Injectable()
export class CategoryService {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateCategoryDto) {
    return this.prisma.category.create({
      data: {
        name: data.name,
        slug: data.slug,
        description: data.description,
        parent: data.parentId ? { connect: { id: data.parentId } } : undefined,
      },
    });
  }

  async findAll() {
    return this.prisma.category.findMany();
  }

  async findOne(id: number) {
    const category = await this.prisma.category.findUnique({ where: { id } });
    if (!category) throw new NotFoundException(`Категория с id=${id} не найдена`);
    return category;
  }

  async update(id: number, data: Partial<CreateCategoryDto>) {
    const category = await this.prisma.category.findUnique({ where: { id } });
    if (!category) throw new NotFoundException(`Категория с id=${id} не найдена`);
    return this.prisma.category.update({ where: { id }, data });
  }

  async remove(id: number) {
    const category = await this.prisma.category.findUnique({ where: { id } });
    if (!category) throw new NotFoundException(`Категория с id=${id} не найдена`);
    return this.prisma.category.delete({ where: { id } });
  }
}
