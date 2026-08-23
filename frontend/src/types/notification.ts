// FE-B. Type module Thông báo & Nhật ký.
export interface AppNotification {
  id: string;
  title: string;
  body: string;
  doc_type?: string;
  doc_id?: string;
  is_read: boolean;
  created_at: string;
}
export interface AuditLog {
  ts: string;
  actor: string;
  action: string;
  doc_type: string;
  doc_id: string;
}
