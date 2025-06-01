import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
// Этот модуль будет глобальным, чтобы его сервис был доступен во всех модулях приложения без необходимости импортировать его в каждом из них.
// Это позволит нам использовать PrismaService в любом месте приложения, не импортируя PrismaModule в каждый модуль.
