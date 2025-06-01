import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Post, PostStatus, PostTranslation, Prisma } from '@prisma/client';
import { CreatePostDto } from './dto/create-post.dto';

@Injectable()
export class PostService {
  constructor(private readonly prisma: PrismaService) {}

  // Вспомогательная функция для конвертации строки в slug
  private slugify(str: string): string {
    return str.toLowerCase().trim().replace(/\s+/g, '-');
  }

  // === Создаёт новый черновик поста ===
  async createDraft(authorId: number, dto: CreatePostDto): Promise<Post> {
    // Проверка уникальности slug
    const existingPost = await this.prisma.post.findUnique({
      where: { slug: dto.slug },
    });
    if (existingPost) {
      throw new BadRequestException(`Post с slug="${dto.slug}" уже существует`);
    }

    return this.prisma.post.create({
      data: {
        authorId,
        title: dto.title,
        slug: dto.slug,
        content: dto.content,
        excerpt: dto.excerpt,
        status: PostStatus.DRAFT,
        // Категории (предполагается, что они уже есть)
        categories: {
          connect: dto.categoryIds.map((id) => ({ id })),
        },
        // Теги: либо соединяемся по slug, либо создаём новый
        tags: {
          connectOrCreate: dto.tagNames.map((name) => {
            const tagSlug = this.slugify(name);
            return {
              where: { slug: tagSlug }, // Prisma: TagWhereUniqueInput { slug }
              create: { name, slug: tagSlug },
            };
          }),
        },
      },
    });
  }

  // === Возвращает список всех опубликованных переводов для данного locale ===
  async listPublishedPosts(locale: string): Promise<PostTranslation[]> {
    const translations = await this.prisma.postTranslation.findMany({
      where: {
        locale,
        post: {
          status: PostStatus.PUBLISHED,
        },
      },
      include: {
        seo: true,
        post: {
          select: {
            slug: true,
            excerpt: true,
            publishedAt: true,
            categories: true,
            tags: true,
            featuredImage: true,
          },
        },
      },
      orderBy: {
        post: {
          publishedAt: 'desc',
        },
      },
    });

    return translations;
  }

  // === Возвращает перевод по slug + locale вместе с SEO и связанной информацией ===
  async findBySlugAndLocale(slug: string, locale: string): Promise<PostTranslation> {
    const translation = await this.prisma.postTranslation.findFirst({
      where: { locale, slug },
      include: {
        seo: true,
        post: {
          include: {
            categories: true,
            tags: true,
            featuredImage: true,
          },
        },
      },
    });

    if (!translation) {
      throw new NotFoundException(`Пост с slug="${slug}" и locale="${locale}" не найден`);
    }
    return translation;
  }

  // === Возвращает сам Post (без перевода) по id, включая все связи ===
  async getPostById(postId: number): Promise<Post> {
    const post = await this.prisma.post.findUnique({
      where: { id: postId },
      include: {
        categories: true,
        tags: true,
        featuredImage: true,
        translations: true,
      },
    });

    if (!post) {
      throw new NotFoundException(`Post с id=${postId} не найден`);
    }
    return post;
  }

  // === Обновление полей Post (title, slug, content, excerpt, status, категории, теги) ===
  async updatePost(
    postId: number,
    data: {
      title?: string;
      slug?: string;
      content?: string;
      excerpt?: string;
      status?: PostStatus;
      categoryIds?: number[];
      tagNames?: string[];
    },
  ): Promise<Post> {
    const existing = await this.prisma.post.findUnique({
      where: { id: postId },
    });
    if (!existing) {
      throw new NotFoundException(`Post с id=${postId} не найден`);
    }

    // Если обновляется slug, проверим уникальность
    if (data.slug && data.slug !== existing.slug) {
      const conflict = await this.prisma.post.findUnique({
        where: { slug: data.slug },
      });
      if (conflict) {
        throw new BadRequestException(`Post с slug="${data.slug}" уже существует`);
      }
    }

    // Собираем объект обновления
    const updateData: Prisma.PostUpdateInput = {};

    if (data.title !== undefined) {
      updateData.title = data.title;
    }
    if (data.slug !== undefined) {
      updateData.slug = data.slug;
    }
    if (data.content !== undefined) {
      updateData.content = data.content;
    }
    if (data.excerpt !== undefined) {
      updateData.excerpt = data.excerpt;
    }
    if (data.status !== undefined) {
      updateData.status = data.status;
    }
    if (data.categoryIds) {
      updateData.categories = {
        set: data.categoryIds.map((id) => ({ id })),
      };
    }
    if (data.tagNames) {
      updateData.tags = {
        set: [],
        connectOrCreate: data.tagNames.map((name) => {
          const tagSlug = this.slugify(name);
          return {
            where: { slug: tagSlug },
            create: { name, slug: tagSlug },
          };
        }),
      };
    }

    return this.prisma.post.update({
      where: { id: postId },
      data: updateData,
    });
  }

  // === Удаление Post (вместе с cascade-переводами и SEO, если в схеме указан onDelete: Cascade) ===
  async deletePost(postId: number): Promise<void> {
    const existing = await this.prisma.post.findUnique({
      where: { id: postId },
    });
    if (!existing) {
      throw new NotFoundException(`Post с id=${postId} не найден`);
    }
    await this.prisma.post.delete({ where: { id: postId } });
  }

  // === Публикация Post (меняем статус на PUBLISHED и устанавливаем publishedAt) ===
  async publishPost(postId: number): Promise<Post> {
    const existing = await this.prisma.post.findUnique({
      where: { id: postId },
    });
    if (!existing) {
      throw new NotFoundException(`Post с id=${postId} не найден`);
    }
    if (existing.status === PostStatus.PUBLISHED) {
      return existing;
    }
    return this.prisma.post.update({
      where: { id: postId },
      data: {
        status: PostStatus.PUBLISHED,
        publishedAt: new Date(),
      },
    });
  }

  // === Создание нового перевода для существующего Post ===
  async createTranslation(
    postId: number,
    locale: string,
    data: {
      title: string;
      content: string;
      excerpt?: string;
      slug: string;
      seoData?: {
        metaTitle?: string;
        metaDescription?: string;
        canonicalUrl?: string;
        robots?: string;
        ogTitle?: string;
        ogDescription?: string;
        ogType?: string;
        ogUrl?: string;
        ogImageUrl?: string;
        ogImageAlt?: string;
        twitterCard?: string;
        twitterSite?: string;
        twitterCreator?: string;
        eventName?: string;
        eventDescription?: string;
        eventStartDate?: Date;
        eventEndDate?: Date;
        eventUrl?: string;
        eventImageUrl?: string;
        eventLocationName?: string;
        eventLocationStreet?: string;
        eventLocationCity?: string;
        eventLocationRegion?: string;
        eventLocationPostal?: string;
        eventLocationCountry?: string;
      };
    },
  ): Promise<PostTranslation> {
    // Проверяем существование Post
    const existingPost = await this.prisma.post.findUnique({
      where: { id: postId },
    });
    if (!existingPost) {
      throw new NotFoundException(`Post с id=${postId} не найден`);
    }

    // Проверяем, нет ли уже перевода для этого locale
    const existingTrans = await this.prisma.postTranslation.findFirst({
      where: { postId, locale },
    });
    if (existingTrans) {
      throw new BadRequestException(`Перевод для locale="${locale}" уже существует`);
    }

    // Проверяем уникальность slug перевода
    const conflictSlug = await this.prisma.postTranslation.findUnique({
      where: { slug: data.slug },
    });
    if (conflictSlug) {
      throw new BadRequestException(`Перевод с slug="${data.slug}" уже существует`);
    }

    // Если передан seoData, создаём новую SEO-запись и готовим вложение
    let seoField: { connect: { id: number } } | undefined;
    if (data.seoData) {
      const seoRecord = await this.prisma.seo.create({
        data: {
          metaTitle: data.seoData.metaTitle,
          metaDescription: data.seoData.metaDescription,
          canonicalUrl: data.seoData.canonicalUrl,
          robots: data.seoData.robots,
          ogTitle: data.seoData.ogTitle,
          ogDescription: data.seoData.ogDescription,
          ogType: data.seoData.ogType,
          ogUrl: data.seoData.ogUrl,
          ogImageUrl: data.seoData.ogImageUrl,
          ogImageAlt: data.seoData.ogImageAlt,
          twitterCard: data.seoData.twitterCard,
          twitterSite: data.seoData.twitterSite,
          twitterCreator: data.seoData.twitterCreator,
          eventName: data.seoData.eventName,
          eventDescription: data.seoData.eventDescription,
          eventStartDate: data.seoData.eventStartDate,
          eventEndDate: data.seoData.eventEndDate,
          eventUrl: data.seoData.eventUrl,
          eventImageUrl: data.seoData.eventImageUrl,
          eventLocationName: data.seoData.eventLocationName,
          eventLocationStreet: data.seoData.eventLocationStreet,
          eventLocationCity: data.seoData.eventLocationCity,
          eventLocationRegion: data.seoData.eventLocationRegion,
          eventLocationPostal: data.seoData.eventLocationPostal,
          eventLocationCountry: data.seoData.eventLocationCountry,
        },
      });
      seoField = { connect: { id: seoRecord.id } };
    }

    // Собираем данные для создания перевода
    const createData: Prisma.PostTranslationCreateInput = {
      post: { connect: { id: postId } },
      locale: locale, // используем явно переданный locale
      title: data.title,
      content: data.content,
      excerpt: data.excerpt,
      slug: data.slug,
      ...(seoField ? { seo: seoField } : {}),
    };

    return this.prisma.postTranslation.create({
      data: createData,
      include: { seo: true },
    });
  }

  // === Обновление существующего перевода ===
  async updateTranslation(
    postId: number,
    locale: string,
    data: {
      title?: string;
      content?: string;
      excerpt?: string;
      slug?: string;
      seoData?: {
        metaTitle?: string;
        metaDescription?: string;
        canonicalUrl?: string;
        robots?: string;
        ogTitle?: string;
        ogDescription?: string;
        ogType?: string;
        ogUrl?: string;
        ogImageUrl?: string;
        ogImageAlt?: string;
        twitterCard?: string;
        twitterSite?: string;
        twitterCreator?: string;
        eventName?: string;
        eventDescription?: string;
        eventStartDate?: Date;
        eventEndDate?: Date;
        eventUrl?: string;
        eventImageUrl?: string;
        eventLocationName?: string;
        eventLocationStreet?: string;
        eventLocationCity?: string;
        eventLocationRegion?: string;
        eventLocationPostal?: string;
        eventLocationCountry?: string;
      };
    },
  ): Promise<PostTranslation> {
    // Находим существующий перевод вместе с привязанной SEO (если есть)
    const existing = await this.prisma.postTranslation.findFirst({
      where: { postId, locale },
      include: { seo: true },
    });
    if (!existing) {
      throw new NotFoundException(`Перевод для postId=${postId}, locale="${locale}" не найден`);
    }

    // Если обновляется slug, проверяем уникальность
    if (data.slug && data.slug !== existing.slug) {
      const conflict = await this.prisma.postTranslation.findUnique({
        where: { slug: data.slug },
      });
      if (conflict) {
        throw new BadRequestException(`Перевод с slug="${data.slug}" уже существует`);
      }
    }

    // Готовим апдейт для SEO, если переданы seoData
    let seoUpdate: Prisma.SeoUpdateOneWithoutTranslationNestedInput | undefined;

    if (data.seoData) {
      if (existing.seo) {
        // Обновляем существующую запись SEO
        seoUpdate = {
          update: {
            metaTitle: data.seoData.metaTitle,
            metaDescription: data.seoData.metaDescription,
            canonicalUrl: data.seoData.canonicalUrl,
            robots: data.seoData.robots,
            ogTitle: data.seoData.ogTitle,
            ogDescription: data.seoData.ogDescription,
            ogType: data.seoData.ogType,
            ogUrl: data.seoData.ogUrl,
            ogImageUrl: data.seoData.ogImageUrl,
            ogImageAlt: data.seoData.ogImageAlt,
            twitterCard: data.seoData.twitterCard,
            twitterSite: data.seoData.twitterSite,
            twitterCreator: data.seoData.twitterCreator,
            eventName: data.seoData.eventName,
            eventDescription: data.seoData.eventDescription,
            eventStartDate: data.seoData.eventStartDate,
            eventEndDate: data.seoData.eventEndDate,
            eventUrl: data.seoData.eventUrl,
            eventImageUrl: data.seoData.eventImageUrl,
            eventLocationName: data.seoData.eventLocationName,
            eventLocationStreet: data.seoData.eventLocationStreet,
            eventLocationCity: data.seoData.eventLocationCity,
            eventLocationRegion: data.seoData.eventLocationRegion,
            eventLocationPostal: data.seoData.eventLocationPostal,
            eventLocationCountry: data.seoData.eventLocationCountry,
          },
        };
      } else {
        // Создаём новую запись SEO и связываем её
        seoUpdate = {
          create: {
            metaTitle: data.seoData.metaTitle,
            metaDescription: data.seoData.metaDescription,
            canonicalUrl: data.seoData.canonicalUrl,
            robots: data.seoData.robots,
            ogTitle: data.seoData.ogTitle,
            ogDescription: data.seoData.ogDescription,
            ogType: data.seoData.ogType,
            ogUrl: data.seoData.ogUrl,
            ogImageUrl: data.seoData.ogImageUrl,
            ogImageAlt: data.seoData.ogImageAlt,
            twitterCard: data.seoData.twitterCard,
            twitterSite: data.seoData.twitterSite,
            twitterCreator: data.seoData.twitterCreator,
            eventName: data.seoData.eventName,
            eventDescription: data.seoData.eventDescription,
            eventStartDate: data.seoData.eventStartDate,
            eventEndDate: data.seoData.eventEndDate,
            eventUrl: data.seoData.eventUrl,
            eventImageUrl: data.seoData.eventImageUrl,
            eventLocationName: data.seoData.eventLocationName,
            eventLocationStreet: data.seoData.eventLocationStreet,
            eventLocationCity: data.seoData.eventLocationCity,
            eventLocationRegion: data.seoData.eventLocationRegion,
            eventLocationPostal: data.seoData.eventLocationPostal,
            eventLocationCountry: data.seoData.eventLocationCountry,
          },
        };
      }
    }

    // Собираем объект обновления перевода
    const updateData: Prisma.PostTranslationUpdateInput = {};
    if (data.title !== undefined) {
      updateData.title = data.title;
    }
    if (data.content !== undefined) {
      updateData.content = data.content;
    }
    if (data.excerpt !== undefined) {
      updateData.excerpt = data.excerpt;
    }
    if (data.slug !== undefined) {
      updateData.slug = data.slug;
    }
    if (seoUpdate) {
      updateData.seo = seoUpdate;
    }

    return this.prisma.postTranslation.update({
      where: { id: existing.id },
      data: updateData,
      include: { seo: true },
    });
  }

  // === Удаление существующего перевода и связанного SEO ===
  async deleteTranslation(postId: number, locale: string): Promise<void> {
    const existing = await this.prisma.postTranslation.findFirst({
      where: { postId, locale },
      include: { seo: true },
    });
    if (!existing) {
      throw new NotFoundException(`Перевод для postId=${postId}, locale="${locale}" не найден`);
    }

    // Если у перевода есть SEO, удаляем сначала SEO
    if (existing.seoId) {
      await this.prisma.seo.delete({ where: { id: existing.seoId } });
    }
    // Затем удаляем сам перевод
    await this.prisma.postTranslation.delete({ where: { id: existing.id } });
  }
}
