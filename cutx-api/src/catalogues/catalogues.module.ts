import { Module, forwardRef } from '@nestjs/common';
import { CataloguesController } from './catalogues.controller';
import { CataloguesService } from './catalogues.service';
import { PanelImportService } from './services/panel-import.service';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [forwardRef(() => UsersModule)],
  controllers: [CataloguesController],
  providers: [CataloguesService, PanelImportService],
  exports: [CataloguesService, PanelImportService],
})
export class CataloguesModule {}
