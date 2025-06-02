import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module'; // обязательно подключаем
import { PostModule } from './modules/post/post.module'; // модуль блога
import { CategoryModule } from './modules/category/category.module'; // при необходимости
import { AuthModule } from './modules/auth/auth.module';

@Module({
  imports: [
    // 1) Подключаем ConfigModule (даёт доступ к process.env через ConfigService)
    ConfigModule.forRoot({
      isGlobal: true,
      // envFilePath: '.env', // по умолчанию уже ищет .env
    }),

    // 2) Подключаем PrismaModule, чтобы PrismaService был глобально доступен
    PrismaModule,

    // 3) Подключаем модуль блога (PostModule). Когда появятся другие модули – их тоже добавляем сюда
    PostModule,
    CategoryModule,
    AuthModule,
    // TagModule,
    // и т.д.
  ],
  controllers: [
    // Можно оставить AppController, если он нужен для простых «здоровье-проверок»:
    // import { AppController } from './app.controller';
    // AppController,
  ],
  providers: [
    // Аналогично AppService, если он нужен:
    // import { AppService } from './app.service';
    // AppService,
  ],
})
export class AppModule {}
