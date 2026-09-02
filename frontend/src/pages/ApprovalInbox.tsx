import React, { useEffect, useState } from 'react';
import { api, errMsg } from '../api/client';
import { Task } from '../types/workflow';
import PageHeader from '../components/PageHeader';
import StatusBadge from '../components/StatusBadge';
import { ErrorBox, Spinner } from '../components/Feedback';
import { useAuth } from '../context/AuthContext';

export const ApprovalInbox: React.FC = () => {
  const { hasRole } = useAuth();
  
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [comment, setComment] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string>('');

  const fetchTasks = async () => {
    setLoading(true);
    try {
      const data = await api.get('/tasks/inbox');
      setTasks(data || []);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(errMsg(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, []);

  const handleAction = async (action: 'approve' | 'reject' | 'request_revision') => {
    if ((action === 'reject' || action === 'request_revision') && !comment.trim()) {
      setErrorMsg('Bắt buộc nhập lý do khi Từ chối hoặc Yêu cầu sửa đổi');
      return;
    }
    if (!selectedTask) return;

    try {
      const idempotencyKey = `task-action-${selectedTask.id}-${Date.now()}`;
      
      let actionEndpoint = action as string;
      if (action === 'request_revision') {
        actionEndpoint = 'request-revision';
      }

      await api.post(
        `/tasks/${selectedTask.id}/${actionEndpoint}`,
        { comment },
        idempotencyKey
      );

      setSelectedTask(null);
      setComment('');
      setErrorMsg('');
      fetchTasks();
    } catch (err: any) {
      setErrorMsg(errMsg(err));
    }
  };

  return (
    <div className="space-y-4">
      <PageHeader title="Hộp thư phê duyệt (Approval Inbox)" />
      
      {errorMsg && !selectedTask && <ErrorBox message={errorMsg} />}

      {loading ? (
        <Spinner />
      ) : (
        <div className="space-y-3">
          {tasks.map((task) => {
            const canProcess = hasRole(task.assignee_role, 'ADMIN');

            return (
              <div 
                key={task.id} 
                className="card flex items-center justify-between p-4 transition-all hover:shadow-md border border-gray-100"
              >
                <div className="space-y-1">
                  <p className="font-semibold text-gray-900">
                    Bước {task.step_order}: {task.step_name}
                  </p>
                  <p className="text-sm text-gray-600">
                    Vai trò: <span className="font-medium text-gray-800">{task.assignee_role}</span> | Người phân công: <span className="font-medium text-gray-800">{task.assignee_username}</span>
                  </p>
                  <div className="flex items-center gap-2 pt-1 text-xs">
                    <span className="text-gray-500">Trạng thái:</span>
                    <StatusBadge status={task.status} />
                  </div>
                </div>

                {canProcess ? (
                  <button
                    onClick={() => { setSelectedTask(task); setErrorMsg(''); }}
                    className="btn-primary text-sm shadow-sm"
                  >
                    Xử lý
                  </button>
                ) : (
                  <span className="text-xs text-gray-400 italic">Chỉ xem (Không đúng Role)</span>
                )}
              </div>
            );
          })}

          {tasks.length === 0 && (
            <div className="card text-center text-gray-500 py-8 italic">
              Không có tác vụ nào chờ duyệt.
            </div>
          )}
        </div>
      )}

      {/* MODAL PHÊ DUYỆT ĐƯỢC THIẾT KẾ LẠI */}
      {selectedTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/60 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl transition-all border border-gray-100">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between bg-gray-50 px-6 py-4 border-b border-gray-100">
              <div>
                <h3 className="text-lg font-bold text-gray-900">
                  Phê duyệt tác vụ #{selectedTask.id}
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Bước {selectedTask.step_order}: <span className="font-medium text-gray-700">{selectedTask.step_name}</span>
                </p>
              </div>
              <button
                onClick={() => setSelectedTask(null)}
                className="rounded-full p-1 text-gray-400 hover:bg-gray-200 hover:text-gray-600 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4">
              {errorMsg && <ErrorBox message={errorMsg} />}

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-600 mb-1.5">
                  Ý kiến / Lý do xử lý
                </label>
                <textarea
                  className="w-full rounded-xl border border-gray-300 p-3 text-sm text-gray-800 placeholder-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100 transition-all"
                  rows={4}
                  placeholder="Nhập ghi chú (bắt buộc khi 'Từ chối' hoặc 'Yêu cầu sửa')..."
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                />
              </div>
            </div>

            {/* Modal Footer / Actions */}
            <div className="flex flex-wrap items-center justify-between gap-2 bg-gray-50 px-6 py-4 border-t border-gray-100">
              <button 
                onClick={() => setSelectedTask(null)} 
                className="rounded-xl px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-200/70 transition-colors"
              >
                Đóng
              </button>

              <div className="flex flex-wrap items-center gap-2">
                {/* Nút Yêu cầu sửa - Màu Vàng */}
                {hasRole(selectedTask.assignee_role, 'ACCOUNTANT', 'DIRECTOR', 'ADMIN') && (
                  <button 
                    onClick={() => handleAction('request_revision')} 
                    className="rounded-xl bg-amber-500 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-amber-600 focus:ring-2 focus:ring-amber-300 transition-all"
                  >
                    Yêu cầu sửa
                  </button>
                )}

                {/* Nút Từ chối - Màu Đỏ */}
                {hasRole(selectedTask.assignee_role, 'MANAGER', 'DIRECTOR', 'ADMIN') && (
                  <button 
                    onClick={() => handleAction('reject')} 
                    className="rounded-xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-rose-700 focus:ring-2 focus:ring-rose-300 transition-all"
                  >
                    Từ chối
                  </button>
                )}

                {/* Nút Duyệt - Màu Xanh Lá */}
                {hasRole(selectedTask.assignee_role, 'MANAGER', 'DIRECTOR', 'ADMIN') && (
                  <button 
                    onClick={() => handleAction('approve')} 
                    className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 focus:ring-2 focus:ring-emerald-300 transition-all"
                  >
                    Duyệt đơn
                  </button>
                )}
              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  );
};

export default ApprovalInbox;