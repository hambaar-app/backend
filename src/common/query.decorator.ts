import { applyDecorators } from '@nestjs/common';
import { ApiQuery } from '@nestjs/swagger';

export function ApiQueryPagination() {
  return applyDecorators(
    ApiQuery({
      name: 'page',
      type: Number,
      required: false,
      description: 'Page number for paginated relations (default: 1)',
    }),
    ApiQuery({
      name: 'limit',
      type: Number,
      required: false,
      description: 'Number of titles per page (default: 10)',
    }),
  );
}
