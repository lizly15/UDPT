import React, { useState, useEffect } from 'react';
import { api, errMsg } from '../api/client';

export const Audit: React.FC = () => {
  const [docId, setDocId] = useState('');
  const [docType, setDocType] = useState('');
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setLoading(true);
    setErrorMsg('');
    try {
      const params = new URLSearchParams();
      // Chỉ gửi đúng doc_id lên Backend
      if (docId.trim()) params.append('doc_id', docId.trim());
      if (docType.trim()) params.append('doc_type', docType.trim());

      const queryString = params.toString() ? `?${params.toString()}` : '';
      const data = await api.get<any[]>(`/audit${queryString}`);
      setLogs(Array.isArray(data) ? data : []);
    } catch (err: any) {
      console.error('Lỗi tải Audit Log:', err);
      setErrorMsg(errMsg(err));
      setLogs([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    handleSearch();
  }, []);

  // Đọc thời gian
  const renderTime = (log: any) => {
    const rawTime = log.ts || log.created_at || log.timestamp || log.time;
    if (!rawTime) return 'N/A';
    try {
      const parsedDate = new Date(rawTime);
      if (isNaN(parsedDate.getTime())) return String(rawTime);
      return parsedDate.toLocaleString('vi-VN');
    } catch {
      return String(rawTime);
    }
  };

  // Đọc người thực hiện
  const renderActor = (log: any) => {
    return log.actor || log.user_id || log.username || log.performed_by || 'N/A';
  };

  // Đọc loại hồ sơ
  const renderDocType = (log: any) => {
    return (
      log.doc_type ||
      log.table_name ||
      log.entity_type ||
      log.details?.doc_type ||
      'N/A'
    );
  };

  // Đọc dữ liệu chi tiết
  const getDetails = (log: any) => {
    return log.details || log.payload || log.data || log.changes;
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Tra cứu Audit Log</h1>
      
      <form onSubmit={handleSearch} className="flex gap-2 mb-6 max-w-2xl">
        <input
          className="border p-2 rounded flex-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Mã hồ sơ "
          value={docId}
          onChange={(e) => setDocId(e.target.value)}
        />
        <input
          className="border p-2 rounded flex-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Loại hồ sơ "
          value={docType}
          onChange={(e) => setDocType(e.target.value)}
        />
        <button
          type="submit"
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition font-medium"
        >
          {loading ? 'Đang tìm...' : 'Tìm kiếm'}
        </button>
      </form>

      {errorMsg && <p className="text-red-500 mb-4 font-medium">{errorMsg}</p>}

      {loading ? (
        <div>Đang tải nhật ký...</div>
      ) : (
        <div className="space-y-3">
          {logs.map((log, index) => {
            const detailsData = getDetails(log);
            const currentDocId = log.doc_id || log.doc_code;
            return (
              <div key={log.id || index} className="border p-4 rounded bg-white shadow-sm text-sm">
                <div className="flex justify-between items-center mb-1">
                  <p className="text-gray-700">
                    <strong>Thời gian:</strong> <span className="text-blue-700 font-medium">{renderTime(log)}</span> |{' '}
                    <strong>Thực hiện:</strong> <span className="font-semibold text-gray-900">{renderActor(log)}</span>
                  </p>
                  {currentDocId && (
                    <span className="text-xs bg-gray-100 text-gray-700 font-mono px-2 py-0.5 rounded border">
                      ID: {currentDocId}
                    </span>
                  )}
                </div>

                <p className="mb-2">
                  <strong>Thao tác:</strong>{' '}
                  <span className="font-semibold text-emerald-600">{log.action || 'N/A'}</span> trên loại hồ sơ{' '}
                  <strong className="text-indigo-600 font-bold">{renderDocType(log)}</strong>
                </p>

                {detailsData && (
                  <div className="mt-2">
                    <p className="text-xs text-gray-500 mb-1 font-medium">Chi tiết dữ liệu (Payload):</p>
                    <pre className="bg-gray-50 p-2 border rounded text-xs font-mono overflow-x-auto text-gray-800">
                      {typeof detailsData === 'object'
                        ? JSON.stringify(detailsData, null, 2)
                        : String(detailsData)}
                    </pre>
                  </div>
                )}
              </div>
            );
          })}

          {!loading && logs.length === 0 && (
            <div className="text-gray-500 italic p-4 bg-gray-50 rounded border">
              Không tìm thấy bản ghi Audit Log nào.
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Audit;