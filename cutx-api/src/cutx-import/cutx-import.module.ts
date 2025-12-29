import { Module } from '@nestjs/common';
import { CutxImportController } from './cutx-import.controller';
import { CutxImportService } from './cutx-import.service';

@Module({
  controllers: [CutxImportController],
  providers: [CutxImportService],
  exports: [CutxImportService],
})
export class CutxImportModule {}
