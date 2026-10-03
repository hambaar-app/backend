import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { PrismaTransaction } from '../prisma.types';

/**
 * City reads (Phase 4 Task 6, pulled forward from Phase 5).
 *
 * Single home for `city` lookups so infra-adjacent reads stop spreading
 * across `MapService`, trip creation and recipient creation. Callers inside
 * an interactive transaction pass their `tx` for snapshot consistency;
 * standalone callers (e.g. the map controller path) use the default client.
 * No manual `.catch` — the global filter maps Prisma errors.
 */
@Injectable()
export class CityRepository {
  constructor(private prisma: PrismaService) {}

  findCityOrThrow(cityId: string, tx: PrismaTransaction = this.prisma) {
    return tx.city.findUniqueOrThrow({
      where: { id: cityId },
    });
  }

  findCityWithProvince(cityId: string, tx: PrismaTransaction = this.prisma) {
    return tx.city.findUniqueOrThrow({
      where: { id: cityId },
      include: { province: true },
    });
  }
}
