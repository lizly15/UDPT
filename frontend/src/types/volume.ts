// FE-B. Type module Sản lượng.
export interface VolumeRecord {
  id: string;
  customer_code: string;
  service_code: string;
  record_date: string;
  period: string;
  quantity: number;
  locked: boolean;
}
