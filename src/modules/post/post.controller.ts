import {
  Controller,
  Get,
  Post as HttpPost,
  Put,
  Delete,
  Body,
  Param,
  HttpException,
  HttpStatus,
  UseGuards,
  Request,
} from '@nestjs/common';
import { PostService } from './post.service';
import { CreatePostDto } from './dto/create-post.dto';
import { PostStatus } from '@prisma/client';
import { UpdatePostDto } from './dto/update-post.dto';
import { CreateTranslationDto } from './dto/create-translation.dto';
import { AuthGuard } from '@nestjs/passport';

@Controller('posts')
export class PostController {
  constructor(private readonly postService: PostService) {}

  // === 1. Создание нового черновика ===
  // POST /posts
  @UseGuards(AuthGuard('jwt'))
  @HttpPost()
  async create(@Request() req, @Body() dto: CreatePostDto) {
    try {
      const authorId = req.user.userId;
      return await this.postService.createDraft(authorId, dto);
    } catch (err) {
      if (err instanceof HttpException) throw err;
      throw new HttpException(
        { message: 'Не удалось создать черновик', details: err.message },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // === 2. Получить один Post по его ID (включая все связи) ===
  // GET /posts/id/:postId
  @Get('id/:postId')
  async getById(@Param('postId') postId: string) {
    try {
      return await this.postService.getPostById(Number(postId));
    } catch (err) {
      if (err instanceof HttpException) throw err;
      throw new HttpException(
        { message: 'Не удалось получить Post по ID', details: err.message },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // === 3. Публикация поста ===
  // PUT /posts/:postId/publish
  @Put(':postId/publish')
  async publish(@Param('postId') postId: string) {
    try {
      return await this.postService.publishPost(Number(postId));
    } catch (err) {
      if (err instanceof HttpException) throw err;
      throw new HttpException(
        { message: 'Не удалось опубликовать пост', details: err.message },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // === 4. Обновление полей Post (title, content, excerpt, статус, категории, теги) ===
  // PUT /posts/:postId
  @Put(':postId')
  async update(
    @Param('postId') postId: string,
    @Body() dto: UpdatePostDto, // <-- теперь здесь DTO
  ) {
    try {
      return await this.postService.updatePost(Number(postId), dto);
    } catch (err) {
      if (err instanceof HttpException) throw err;
      throw new HttpException(
        { message: 'Не удалось обновить пост', details: err.message },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // === 5. Удаление Post ===
  // DELETE /posts/:postId
  @Delete(':postId')
  async delete(@Param('postId') postId: string) {
    try {
      await this.postService.deletePost(Number(postId));
      return { success: true };
    } catch (err) {
      if (err instanceof HttpException) throw err;
      throw new HttpException(
        { message: 'Не удалось удалить пост', details: err.message },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // === 6. Получить все опубликованные переводы (для фронтенда) ===
  // GET /posts/published/:locale
  @Get('published/:locale')
  async listPublished(@Param('locale') locale: string) {
    return this.postService.listPublishedPosts(locale);
  }

  // === 7. Получить перевод поста по slug + locale ===
  // GET /posts/:slug/:locale
  @Get(':slug/:locale')
  async findBySlug(@Param('slug') slug: string, @Param('locale') locale: string) {
    return this.postService.findBySlugAndLocale(slug, locale);
  }

  // === 8. Создать новый перевод для существующего Post ===
  // POST /posts/:postId/translation
  @HttpPost(':postId/translation')
  async createTranslation(@Param('postId') postId: string, @Body() dto: CreateTranslationDto) {
    try {
      // --- Здесь конвертируем строковые даты в Date ---
      let seoDataFormatted: Record<string, any> | undefined;
      if (dto.seoData) {
        seoDataFormatted = { ...dto.seoData };

        // Если dto.seoData.eventStartDate — строка, превращаем в Date
        if (dto.seoData.eventStartDate) {
          seoDataFormatted.eventStartDate = new Date(dto.seoData.eventStartDate);
        }
        if (dto.seoData.eventEndDate) {
          seoDataFormatted.eventEndDate = new Date(dto.seoData.eventEndDate);
        }
      }

      return await this.postService.createTranslation(Number(postId), dto.locale, {
        title: dto.title,
        content: dto.content,
        excerpt: dto.excerpt,
        slug: dto.slug,
        seoData: seoDataFormatted, // теперь это поле содержит Date-значения
      });
    } catch (err) {
      if (err instanceof HttpException) throw err;
      throw new HttpException(
        { message: 'Не удалось создать перевод', details: err.message },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // === 9. Обновить существующий перевод ===
  // PUT /posts/:postId/translation/:locale
  @Put(':postId/translation/:locale')
  async updateTranslation(
    @Param('postId') postId: string,
    @Param('locale') locale: string,
    @Body() dto: CreateTranslationDto, // если у вас нет отдельного UpdateTranslationDto, можно переиспользовать CreateTranslationDto
  ) {
    try {
      // Точно так же конвертируем даты:
      let seoDataFormatted: Record<string, any> | undefined;
      if (dto.seoData) {
        seoDataFormatted = { ...dto.seoData };
        if (dto.seoData.eventStartDate) {
          seoDataFormatted.eventStartDate = new Date(dto.seoData.eventStartDate);
        }
        if (dto.seoData.eventEndDate) {
          seoDataFormatted.eventEndDate = new Date(dto.seoData.eventEndDate);
        }
      }

      return await this.postService.updateTranslation(Number(postId), locale, {
        title: dto.title,
        content: dto.content,
        excerpt: dto.excerpt,
        slug: dto.slug,
        seoData: seoDataFormatted, // передаём уже Date-поля
      });
    } catch (err) {
      if (err instanceof HttpException) throw err;
      throw new HttpException(
        { message: 'Не удалось обновить перевод', details: err.message },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // === 10. Удалить существующий перевод ===
  // DELETE /posts/:postId/translation/:locale
  @Delete(':postId/translation/:locale')
  async deleteTranslation(@Param('postId') postId: string, @Param('locale') locale: string) {
    try {
      await this.postService.deleteTranslation(Number(postId), locale);
      return { success: true };
    } catch (err) {
      if (err instanceof HttpException) throw err;
      throw new HttpException(
        { message: 'Не удалось удалить перевод', details: err.message },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // === 11. (Опционально) Получить все переводы конкретного Post ===
  // GET /posts/:postId/translations
  // (Если понадобится, раскомментируйте)
  /*
  @Get(':postId/translations')
  async listAllTranslations(@Param('postId') postId: string) {
    try {
      // Можно реализовать сервис-метод listAllTranslations(postId)
      return await this.postService.listAllTranslations(Number(postId));
    } catch (err) {
      if (err instanceof HttpException) throw err;
      throw new HttpException(
        { message: 'Не удалось получить переводы', details: err.message },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
  */
}
