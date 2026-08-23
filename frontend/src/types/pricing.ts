// FE-A. Type module Bảng giá.
export interface PriceItem {
  service_code: string;
  unit_price: number;
}
export interface PriceListVersion {
  id: string;
  price_list_code: string;
  version_no: number;
  effective_from: string;
  effective_to: string;
  status: string;
  workflow_instance_id?: string;
  items: PriceItem[];
}
export interface PriceList {
  code: string;
  name: string;
  customer_code: string;
  versions: PriceListVersion[];
}
export interface EffectivePrice {
  customer_code: string;
  service_code: string;
  date: string;
  unit_price: number;
  version_no: number;
}
