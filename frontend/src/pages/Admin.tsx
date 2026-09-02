import React, { useEffect, useState, useMemo } from 'react';
import { api, errMsg } from '../api/client';
import { UserAdmin, WorkflowDefinition } from '../types/admin';
import { useAuth } from '../context/AuthContext';
import PageHeader from '../components/PageHeader';
import DataTable, { Column } from '../components/DataTable';
import StatusBadge from '../components/StatusBadge';
import { ErrorBox, Spinner } from '../components/Feedback';

export const Admin: React.FC = () => {
  const { hasRole } = useAuth();
  const isAdmin = hasRole('ADMIN');

  const [users, setUsers] = useState<UserAdmin[]>([]);
  const [workflows, setWorkflows] = useState<WorkflowDefinition[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [showCreateForm, setShowCreateForm] = useState<boolean>(false);
  const [username, setUsername] = useState('');
  const [fullName, setFullName] = useState('');
  const [department, setDepartment] = useState('');
  const [password, setPassword] = useState('');
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [creating, setCreating] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const [usersData, workflowsData] = await Promise.all([
        api.get<UserAdmin[]>('/users'),
        api.get<WorkflowDefinition[]>('/workflows/definitions'),
      ]);
      setUsers(usersData || []);
      setWorkflows(workflowsData || []);
    } catch (err: any) {
      setErrorMsg(errMsg(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAdmin) {
      fetchData();
    }
  }, [isAdmin]);

  // Tự động gom tất cả các Role thực tế có trong hệ thống (từ workflows & users)
  const availableRoles = useMemo(() => {
    const roleSet = new Set<string>(['ADMIN']); // Thêm các role cơ bản nếu cần
    
    // Lấy thêm role từ các bước duyệt trong workflow
    workflows.forEach((wf) => {
      wf.steps?.forEach((step) => {
        if (step.role) roleSet.add(step.role);
      });
    });

    // Lấy thêm role từ danh sách user hiện tại
    users.forEach((u) => {
      if (Array.isArray(u.roles)) {
        u.roles.forEach((r) => roleSet.add(r));
      } else if (u.roles) {
        roleSet.add(u.roles);
      }
    });

    return Array.from(roleSet);
  }, [workflows, users]);

  const handleToggleRole = (roleCode: string) => {
    setSelectedRoles((prev) =>
      prev.includes(roleCode)
        ? prev.filter((r) => r !== roleCode)
        : [...prev, roleCode]
    );
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (selectedRoles.length === 0) {
      setErrorMsg('Vui lòng chọn ít nhất 1 Role cho người dùng.');
      return;
    }

    setCreating(true);

    try {
      const idempotencyKey = `user-create-${Date.now()}`;
      await api.post(
        '/users',
        {
          username,
          full_name: fullName,
          department,
          password,
          roles: selectedRoles,
        },
        idempotencyKey
      );

      setUsername('');
      setFullName('');
      setDepartment('');
      setPassword('');
      setSelectedRoles([]);
      setShowCreateForm(false);

      fetchData();
    } catch (err: any) {
      setErrorMsg(errMsg(err));
    } finally {
      setCreating(false);
    }
  };

  if (!isAdmin) {
    return (
      <div className="p-4">
        <ErrorBox message="Bạn không có quyền truy cập trang Quản trị Hệ thống (Cần quyền ADMIN)." />
      </div>
    );
  }

  const userColumns: Column<UserAdmin>[] = [
    {
      key: 'username',
      label: 'Tài khoản',
      render: (u) => <span className="font-semibold text-gray-900">{u.username}</span>,
    },
    { key: 'full_name', label: 'Họ và tên' },
    { key: 'department', label: 'Phòng ban' },
    {
      key: 'roles',
      label: 'Vai trò (Roles)',
      render: (u) => (
        <span className="font-mono text-xs font-medium text-indigo-700">
          {Array.isArray(u.roles) ? u.roles.join(', ') : u.roles}
        </span>
      ),
    },
    {
      key: 'is_active',
      label: 'Trạng thái',
      render: (u) => <StatusBadge status={u.is_active ? 'ACTIVE' : 'INACTIVE'} />,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <PageHeader title="Quản trị Hệ thống" />
        <button
          onClick={() => setShowCreateForm(!showCreateForm)}
          className="btn-primary"
        >
          {showCreateForm ? 'Hủy / Đóng Form' : '+ Tạo người dùng mới'}
        </button>
      </div>

      {errorMsg && <ErrorBox message={errorMsg} />}

      {/* Form tạo mới người dùng */}
      {showCreateForm && (
        <section className="card p-4 space-y-4 border-2 border-indigo-100 shadow-md">
          <div className="flex items-center justify-between border-b pb-2">
            <h2 className="text-base font-semibold text-gray-800">Tạo mới Người dùng</h2>
            <button
              type="button"
              onClick={() => setShowCreateForm(false)}
              className="text-xs text-gray-500 hover:text-gray-700"
            >
              Đóng ✕
            </button>
          </div>

          <form onSubmit={handleCreateUser} className="space-y-4 text-sm">
            <div className="grid grid-cols-2 gap-3">
              <input
                className="input-field"
                placeholder="Tên đăng nhập (Username)"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
              <input
                className="input-field"
                placeholder="Họ và tên"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
              />
              <input
                className="input-field"
                placeholder="Phòng ban"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                required
              />
              <input
                className="input-field"
                type="password"
                placeholder="Mật khẩu"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            {/* Bảng chọn Role hiển thị linh hoạt theo dữ liệu hệ thống */}
            <div className="space-y-2 border-t pt-3">
              <label className="block font-medium text-gray-700">
                Chọn Vai trò (Roles) cho người dùng:
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                {availableRoles.map((roleCode) => {
                  const isSelected = selectedRoles.includes(roleCode);
                  return (
                    <div
                      key={roleCode}
                      onClick={() => handleToggleRole(roleCode)}
                      className={`flex items-center justify-between p-2.5 rounded-lg border cursor-pointer transition-colors ${
                        isSelected
                          ? 'border-indigo-600 bg-indigo-50 text-indigo-900 font-medium'
                          : 'border-gray-200 hover:bg-gray-50 text-gray-700'
                      }`}
                    >
                      <span className="text-xs font-mono font-bold">{roleCode}</span>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => {}}
                        className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                      />
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t">
              <button
                type="button"
                onClick={() => setShowCreateForm(false)}
                className="btn-secondary"
              >
                Hủy
              </button>
              <button type="submit" className="btn-primary" disabled={creating}>
                {creating ? 'Đang tạo...' : 'Tạo người dùng'}
              </button>
            </div>
          </form>
        </section>
      )}

      {/* Danh sách người dùng */}
      <section className="space-y-2">
        <h2 className="text-base font-semibold text-gray-800">Danh sách Người dùng</h2>
        {loading ? (
          <Spinner />
        ) : (
          <DataTable
            columns={userColumns}
            rows={users}
            empty="Không tìm thấy người dùng nào."
          />
        )}
      </section>

      {/* Cấu hình quy trình duyệt */}
      <section className="space-y-3">
        <h2 className="text-base font-semibold text-gray-800">Cấu hình Quy trình Duyệt</h2>
        {loading ? (
          <Spinner />
        ) : (
          <div className="space-y-3">
            {workflows.map((wf, idx) => (
              <div key={wf.doc_type || idx} className="card p-4 space-y-2">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-gray-900">{wf.name}</span>
                  <span className="rounded border bg-gray-100 px-2 py-0.5 text-xs font-mono text-gray-700">
                    {wf.doc_type}
                  </span>
                </div>
                <ul className="ml-5 list-disc text-sm text-gray-700 space-y-1">
                  {wf.steps?.map((s, stepIdx) => (
                    <li key={stepIdx}>
                      <b>Bước {s.order}:</b> {s.name} (Role:{' '}
                      <span className="font-medium text-indigo-600">{s.role}</span> - Người phụ trách:{' '}
                      <span className="font-medium text-gray-900">{s.assignee || 'N/A'}</span>)
                    </li>
                  ))}
                </ul>
              </div>
            ))}
            {workflows.length === 0 && (
              <div className="card p-4 text-center text-gray-500 italic">
                Chưa có cấu hình quy trình duyệt nào.
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  );
};

export default Admin;