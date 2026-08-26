import React, { useEffect, useState } from 'react';
import { api } from '../api/client';
import { UserAdmin, WorkflowDefinition } from '../types/admin';

export const Admin: React.FC = () => {
  const [users, setUsers] = useState<UserAdmin[]>([]);
  const [workflows, setWorkflows] = useState<WorkflowDefinition[]>([]);

  useEffect(() => {
    api.get<UserAdmin[]>('/users').then(data => setUsers(data)).catch(console.error);
    api.get<WorkflowDefinition[]>('/workflows/definitions').then(data => setWorkflows(data)).catch(console.error);
  }, []);

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Quản trị Hệ thống</h1>

      <section>
        <h2 className="text-xl font-semibold mb-2">Danh sách Người dùng</h2>
        <div className="border rounded divide-y">
          {users.map(u => (
            <div key={u.id} className="p-3 flex justify-between items-center">
              <div>
                <p className="font-bold">{u.full_name} ({u.username})</p>
                <p className="text-xs text-gray-500">Phòng ban: {u.department} | Roles: {u.roles.join(', ')}</p>
              </div>
              <span className={`px-2 py-1 rounded text-xs ${u.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                {u.is_active ? 'Hoạt động' : 'Tạm khóa'}
              </span>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-xl font-semibold mb-2">Cấu hình Quy trình Duyệt</h2>
        <div className="space-y-3">
          {workflows.map((wf, idx) => (
            <div key={idx} className="border p-4 rounded">
              <p className="font-bold">{wf.name} ({wf.doc_type})</p>
              <ul className="list-disc ml-5 text-sm mt-1">
                {wf.steps.map((s, stepIdx) => (
                  <li key={stepIdx}>
                    Bước {s.order}: {s.name} (Role: {s.role} - Người phụ trách: {s.assignee})
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};

export default Admin;