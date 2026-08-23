// FE-A. Thêm/sửa type của module Khách hàng & Dịch vụ tại đây.
export interface Customer {
  code: string;
  name: string;
  tax_code: string;
  customer_type: string;
  address?: string;
  representative?: string;
  contact?: string;
  status: string;
}
export interface ServiceItem {
  code: string;
  name: string;
  unit: string;
}
