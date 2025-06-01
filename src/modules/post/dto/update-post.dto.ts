import {
  IsString,
  IsOptional,
  IsArray,
  ArrayNotEmpty,
  ArrayUnique,
  IsInt,
  MinLength,
  IsEnum,
} from 'class-validator';
import { PostStatus } from '@prisma/client';

export class UpdatePostDto {
  @IsOptional()
  @IsString({ message: 'Title should be a string' })
  @MinLength(3, { message: 'Title cannot be shorter than 3 characters' })
  title?: string;

  @IsOptional()
  @IsString({ message: 'Slug should be a string' })
  slug?: string;

  @IsOptional()
  @IsString({ message: 'Content should be a string' })
  content?: string;

  @IsOptional()
  @IsString({ message: 'Excerpt should be a string' })
  excerpt?: string;

  @IsOptional()
  @IsEnum(PostStatus, { message: 'Status must be one of DRAFT, PENDING, PUBLISHED, PRIVATE' })
  status?: PostStatus;

  @IsOptional()
  @IsArray({ message: 'categoryIds must be an array' })
  @ArrayNotEmpty({ message: 'categoryIds cannot be empty' })
  @IsInt({ each: true, message: 'Each categoryIds element must be a number' })
  categoryIds?: number[];

  @IsOptional()
  @IsArray({ message: 'tagNames must be an array' })
  @ArrayUnique({ message: 'tagNames must not contain repeated values' })
  @IsString({ each: true, message: 'Each tagNames element must be a string' })
  tagNames?: string[];
}
