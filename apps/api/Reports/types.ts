import type {
  ReportFilterDef,
  ReportColumnDef,
  ReportSummaryItem,
  ReportMetadataDto,
  ReportRunResultDto,
} from '@hm/shared';
import type { UserInfo } from '../Types/api';

export interface ReportRunOptions {
  filters?: Record<string, unknown>;
  currentPage?: number;
  itemsPerPage?: number;
  sortBy?: Array<{ id: string; value: 'asc' | 'desc' | 'ASC' | 'DESC' }>;
}

export interface ReportDefinition extends ReportMetadataDto {
  allowedRoles: string[];
  run(options: ReportRunOptions, actor: UserInfo): Promise<ReportRunResultDto>;
  stream(
    options: Omit<ReportRunOptions, 'currentPage' | 'itemsPerPage'>,
    actor: UserInfo,
  ): AsyncIterable<Record<string, unknown>[]>;
}

export {
  ReportFilterDef,
  ReportColumnDef,
  ReportSummaryItem,
  ReportMetadataDto,
  ReportRunResultDto,
};
