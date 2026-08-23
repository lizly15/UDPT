// FE-B. Type module Quản trị.
export interface UserAdmin {
  id: string;
  username: string;
  full_name: string;
  department: string;
  is_active: boolean;
  roles: string[];
}
export interface Role {
  code: string;
  name: string;
}
export interface WorkflowDefinition {
  doc_type: string;
  name: string;
  steps: { order: number; name: string; role: string; assignee: string }[];
}
