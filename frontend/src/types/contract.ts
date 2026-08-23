// FE-A. Type module Hợp đồng & Phụ lục.
export interface Appendix {
  id: string;
  title: string;
  content: string;
  effective_date?: string;
  status: string;
}
export interface Contract {
  code: string;
  customer_code: string;
  title: string;
  effective_from?: string;
  effective_to?: string;
  value: number;
  payment_terms?: string;
  service_terms?: string;
  has_attachment?: boolean;
  status: string;
  workflow_instance_id?: string;
  created_by?: string;
  appendices?: Appendix[];
}
