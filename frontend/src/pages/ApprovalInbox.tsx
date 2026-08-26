import React, { useEffect, useState } from 'react';
import { api, errMsg } from '../api/client';
import { Task } from '../types/workflow';

export const ApprovalInbox: React.FC = () => {
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
      
      // Thử gọi endpoint chuẩn dạng RESTful action
      // 1. Nếu Backend hỗ trợ /tasks/{id}/action:
      await api.post(
        `/tasks/${selectedTask.id}/action`,
        { action: action.toLowerCase(), comment },
        idempotencyKey
      );

      setSelectedTask(null);
      setComment('');
      setErrorMsg('');
      fetchTasks();
    } catch (err: any) {
      console.error('Action error:', err);
      
      // Fallback: Thử lại với endpoint trực tiếp /tasks/{id}/{action} nếu endpoint trên trả 404
      if (err?.status === 404) {
        try {
          const idempotencyKey = `task-action-${selectedTask.id}-${Date.now()}`;
          await api.post(
            `/tasks/${selectedTask.id}/${action}`,
            { comment },
            idempotencyKey
          );

          setSelectedTask(null);
          setComment('');
          setErrorMsg('');
          fetchTasks();
          return;
        } catch (fallbackErr: any) {
          setErrorMsg(errMsg(fallbackErr));
          return;
        }
      }

      setErrorMsg(errMsg(err));
    }
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Approval Inbox</h1>
      {loading ? (
        <div>Đang tải...</div>
      ) : (
        <div className="space-y-4">
          {tasks.map((task) => (
            <div key={task.id} className="border p-4 rounded shadow-sm flex justify-between items-center bg-white">
              <div>
                <p className="font-semibold">Bước {task.step_order}: {task.step_name}</p>
                <p className="text-sm text-gray-600">
                  Vai trò: {task.assignee_role} | Người phân công: {task.assignee_username}
                </p>
                <p className="text-xs text-gray-500">Trạng thái: {task.status}</p>
              </div>
              <button
                onClick={() => { setSelectedTask(task); setErrorMsg(''); }}
                className="bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700 transition"
              >
                Xử lý
              </button>
            </div>
          ))}
          {tasks.length === 0 && <div>Không có tác vụ nào chờ duyệt.</div>}
        </div>
      )}

      {selectedTask && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white p-6 rounded max-w-md w-full shadow-lg">
            <h2 className="text-lg font-bold mb-2">Duyệt công việc #{selectedTask.id}</h2>
            <p className="text-sm text-gray-600 mb-4">Bước: {selectedTask.step_name} (Thứ tự: {selectedTask.step_order})</p>
            {errorMsg && <p className="text-red-500 text-sm mb-2 font-medium">{errorMsg}</p>}
            <textarea
              className="w-full border p-2 rounded mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={3}
              placeholder="Nhập ghi chú / lý do (bắt buộc khi Từ chối / Sửa đổi)..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
            />
            <div className="flex gap-2 justify-end">
              <button 
                onClick={() => setSelectedTask(null)} 
                className="px-3 py-1 border rounded hover:bg-gray-100"
              >
                Hủy
              </button>
              <button 
                onClick={() => handleAction('request_revision')} 
                className="px-3 py-1 bg-yellow-500 text-white rounded hover:bg-yellow-600"
              >
                Yêu cầu sửa
              </button>
              <button 
                onClick={() => handleAction('reject')} 
                className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700"
              >
                Từ chối
              </button>
              <button 
                onClick={() => handleAction('approve')} 
                className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700"
              >
                Duyệt
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ApprovalInbox;