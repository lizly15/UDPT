// FE-B. Type module Phê duyệt (dùng chung cho Approval Inbox & timeline).
export interface Task {
  id: string;
  instance_id: string;
  step_order: number;
  step_name: string;
  assignee_role: string;
  assignee_username: string;
  status: string;
  acted_by?: string;
  comment?: string;
}
export interface WorkflowInstance {
  id: string;
  doc_type: string;
  doc_id: string;
  doc_title: string;
  requested_by: string;
  status: string;
  current_step_order: number;
  tasks: Task[];
}
