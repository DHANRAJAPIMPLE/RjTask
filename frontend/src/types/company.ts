export interface Company {
  company_code: string;
  brand_name: string;
}

export interface GroupCompany {
  group_name: string;
  group_code: string;
  companies: Company[];
}
