# NestJS Conventions - CutX API

Ces conventions s'appliquent aux fichiers `*.controller.ts`, `*.service.ts`, `*.module.ts` dans `cutx-api/`.

## Structure des Modules

```typescript
// *.module.ts
@Module({
  imports: [],           // Autres modules
  controllers: [],       // Controllers du module
  providers: [],         // Services du module
  exports: [],           // Services exportés
})
export class XxxModule {}
```

## Controllers

```typescript
// Toujours utiliser le préfixe de route dans @Controller()
@Controller('xxx')
export class XxxController {
  constructor(private readonly xxxService: XxxService) {}

  // GET sans paramètre
  @Get()
  async findAll() {}

  // GET avec paramètre
  @Get(':id')
  async findOne(@Param('id') id: string) {}

  // POST avec body
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() dto: CreateXxxDto) {}

  // PUT/PATCH pour update
  @Put(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateXxxDto) {}

  // DELETE
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') id: string) {}
}
```

## Services

```typescript
@Injectable()
export class XxxService {
  constructor(private prisma: PrismaService) {}

  // Toujours async/await avec Prisma
  async findAll(): Promise<Xxx[]> {
    return this.prisma.xxx.findMany();
  }

  // Utiliser les exceptions NestJS
  async findOne(id: string): Promise<Xxx> {
    const item = await this.prisma.xxx.findUnique({ where: { id } });
    if (!item) {
      throw new NotFoundException(`Xxx with ID "${id}" not found`);
    }
    return item;
  }
}
```

## DTOs et Validation

```typescript
// Utiliser class-validator
export class CreateXxxDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsOptional()
  @IsNumber()
  price?: number;
}

// Pour les types importés, utiliser `import type`
import type { Request } from 'express';
```

## Imports de Types

```typescript
// IMPORTANT: Pour les types dans les decorators, utiliser import type
import type { Request } from 'express';
import type { CreateXxxDto } from './dto';

// Sinon erreur TS1272 avec NestJS 11+
```

## Exceptions

Utiliser les exceptions built-in:
- `NotFoundException` - 404
- `BadRequestException` - 400
- `UnauthorizedException` - 401
- `ForbiddenException` - 403
- `ConflictException` - 409
- `GoneException` - 410 (pour ressources expirées)

## CORS

CORS est configuré globalement dans `main.ts`. Ne pas ajouter de headers CORS dans les controllers.
