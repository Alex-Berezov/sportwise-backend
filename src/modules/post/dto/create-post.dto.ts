import {
  IsString,
  IsOptional,
  IsArray,
  ArrayNotEmpty,
  ArrayUnique,
  IsInt,
  MinLength,
  IsISO8601,
} from 'class-validator';

export class CreatePostDto {
  @IsString({ message: 'Title should be a string' })
  @MinLength(3, { message: 'Title cannot be shorter than 3 characters' })
  title: string;

  @IsString({ message: 'Slug should be a string' })
  slug: string;

  @IsString({ message: 'Content should be a string' })
  content: string;

  @IsOptional()
  @IsString({ message: 'Excerpt should be a string' })
  excerpt?: string;

  @IsArray({ message: 'categoryIds must be an array' })
  @ArrayNotEmpty({ message: 'categoryIds cannot be an empty array' })
  @IsInt({ each: true, message: 'Each categoryIds element must be a number' })
  categoryIds: number[];

  @IsArray({ message: 'tagNames must be an array' })
  @ArrayUnique({ message: 'tagNames must not contain repeated values' })
  @IsString({ each: true, message: 'Each tagNames element must be a string' })
  tagNames: string[];

  // Пример, как можно валидировать дату (если, к примеру, DTO принимает дату)
  @IsOptional()
  @IsISO8601({}, { message: 'publishedAt должна быть ISO8601 датой' })
  publishedAt?: string;
}
