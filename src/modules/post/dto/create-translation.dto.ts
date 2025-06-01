import { Type } from 'class-transformer';
import { IsString, IsOptional, IsISO8601, ValidateNested } from 'class-validator';

class SeoDataDto {
  @IsOptional() @IsString() metaTitle?: string;
  @IsOptional() @IsString() metaDescription?: string;
  @IsOptional() @IsString() canonicalUrl?: string;
  @IsOptional() @IsString() robots?: string;
  @IsOptional() @IsString() ogTitle?: string;
  @IsOptional() @IsString() ogDescription?: string;
  @IsOptional() @IsString() ogType?: string;
  @IsOptional() @IsString() ogUrl?: string;
  @IsOptional() @IsString() ogImageUrl?: string;
  @IsOptional() @IsString() ogImageAlt?: string;
  @IsOptional() @IsString() twitterCard?: string;
  @IsOptional() @IsString() twitterSite?: string;
  @IsOptional() @IsString() twitterCreator?: string;
  @IsOptional() @IsString() eventName?: string;
  @IsOptional() @IsString() eventDescription?: string;
  @IsOptional()
  @IsISO8601({}, { message: 'eventStartDate должна быть ISO8601 датой' })
  eventStartDate?: string;
  @IsOptional()
  @IsISO8601({}, { message: 'eventEndDate должна быть ISO8601 датой' })
  eventEndDate?: string;
  @IsOptional() @IsString() eventUrl?: string;
  @IsOptional() @IsString() eventImageUrl?: string;
  @IsOptional() @IsString() eventLocationName?: string;
  @IsOptional() @IsString() eventLocationStreet?: string;
  @IsOptional() @IsString() eventLocationCity?: string;
  @IsOptional() @IsString() eventLocationRegion?: string;
  @IsOptional() @IsString() eventLocationPostal?: string;
  @IsOptional() @IsString() eventLocationCountry?: string;
}

export class CreateTranslationDto {
  @IsString({ message: 'Locale should be a string (например, "en", "ru")' })
  locale: string;

  @IsString({ message: 'Title should be a string' })
  title: string;

  @IsString({ message: 'Content should be a string' })
  content: string;

  @IsOptional()
  @IsString({ message: 'Excerpt should be a string' })
  excerpt?: string;

  @IsString({ message: 'Slug should be a string' })
  slug: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => SeoDataDto)
  seoData?: SeoDataDto;
}
