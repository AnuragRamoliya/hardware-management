import type {
  ApiResponse,
  Paginated,
  EmployeeDto,
  AssetDto,
  OptionsResponse,
  ListRequest,
} from "../src/index.js";

// Type-level assertion tests
const responseSample: ApiResponse<Paginated<AssetDto>> = {
  message: "Success",
  data: {
    rows: [
      {
        id: 1,
        asset_tag: "AST-001",
        name: "Dell XPS 15",
        status: 1,
      },
    ],
    count: 1,
  },
};

const employeeSample: EmployeeDto = {
  id: 101,
  first_name: "John",
  last_name: "Doe",
  email: "john.doe@company.com",
};

const optionsSample: OptionsResponse = {
  rows: [
    {
      value: 1,
      label: "Engineering",
      meta: { department_id: 1 },
    },
  ],
  count: 1,
  hasMore: false,
  page: 1,
};

const listQuery: ListRequest = {
  currentPage: 1,
  itemsPerPage: 10,
  filters: { status: 1 },
};

// Void export to prevent unused variable errors
export const _typeChecks = {
  responseSample,
  employeeSample,
  optionsSample,
  listQuery,
};
