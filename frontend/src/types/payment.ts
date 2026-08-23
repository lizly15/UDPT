// FE-B. Type module Bảng thanh toán.
export interface PaymentLine {
  service_code: string;
  quantity: number;
  unit_price: number;
  amount: number;
}
export interface Payment {
  id: string;
  code: string;
  customer_code: string;
  contract_code: string;
  period: string;
  status: string;
  subtotal: number;
  tax: number;
  total: number;
  workflow_instance_id?: string;
  lines: PaymentLine[];
}
export interface SigningSession {
  doc_id: string;
  status: string;
  attempts?: number;
  provider_ref?: string;
}
