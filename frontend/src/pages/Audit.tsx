import React, { useState, useEffect } from 'react';
import { api, errMsg } from '../api/client';
import { useAuth } from '../context/AuthContext';
import PageHeader from '../components/PageHeader';
import DataTable, { Column } from '../components/DataTable';
import { ErrorBox, Spinner } from '../components/Feedback';

export const Audit: React.FC = () => {
  const [docId, setDocId] = useState('');
  const [docType, setDocType] = useState('');
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');

  const { hasRole } = useAuth();

  // Kiểm tra quyền truy cập trang Nhật ký hệ thống (Audit Log)
  const canView = hasRole('ADMIN', 'DIRECTOR','ACCOUNTANT');

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!canView) return;

    setLoading(true);
    setErrorMsg('');
    try {
      const params = new URLSearchParams();
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
    if (canView) {
      handleSearch();
    }
  }, [canView]);

  // Trả về giao diện báo lỗi nếu không đủ quyền truy cập
  if (!canView) {
    return (
      <div className="p-4">
        <ErrorBox message="Bạn không có quyền truy cập trang Tra cứu Nhật ký hệ thống (Audit Log)." />
      </div>
    );
  }

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

  const renderActor = (log: any) => {
    return log.actor || log.user_id || log.username || log.performed_by || 'N/A';
  };

  const renderDocType = (log: any) => {
    return (
      log.doc_type ||
      log.table_name ||
      log.entity_type ||
      log.details?.doc_type ||
      'N/A'
    );
  };

  const getDetails = (log: any) => {
    return log.details || log.payload || log.data || log.changes;
  };

  const columns: Column<any>[] = [
    {
      key: 'time',
      label: 'Thời gian',
      render: (log) => <span className="font-medium text-blue-700">{renderTime(log)}</span>,
    },
    {
      key: 'actor',
      label: 'Thực hiện',
      render: (log) => <span className="font-semibold text-gray-900">{renderActor(log)}</span>,
    },
    {
      key: 'doc_id',
      label: 'Mã hồ sơ',
      render: (log) => {
        const id = log.doc_id || log.doc_code;
        return id ? (
          <span className="rounded border bg-gray-100 px-2 py-0.5 font-mono text-xs text-gray-700">
            {id}
          </span>
        ) : (
          'N/A'
        );
      },
    },
    {
      key: 'action',
      label: 'Thao tác',
      render: (log) => <span className="font-semibold text-emerald-600">{log.action || 'N/A'}</span>,
    },
    {
      key: 'doc_type',
      label: 'Loại hồ sơ',
      render: (log) => <span className="font-bold text-indigo-600">{renderDocType(log)}</span>,
    },
    {
      key: 'details',
      label: 'Chi tiết (Payload)',
      render: (log) => {
        const detailsData = getDetails(log);
        if (!detailsData) return <span className="text-gray-400 italic">Không có</span>;
        return (
          <pre className="max-h-32 max-w-xs overflow-auto rounded border bg-gray-50 p-2 text-xs font-mono text-gray-800">
            {typeof detailsData === 'object'
              ? JSON.stringify(detailsData, null, 2)
              : String(detailsData)}
          </pre>
        );
      },
    },
  ];

  return (
    <div className="space-y-4">
      <PageHeader title="Tra cứu Audit Log" />

      <form onSubmit={handleSearch} className="card flex max-w-2xl gap-2 p-4">
        <input
          className="input-field flex-1"
          placeholder="Mã hồ sơ (doc_id)"
          value={docId}
          onChange={(e) => setDocId(e.target.value)}
        />
        <input
          className="input-field flex-1"
          placeholder="Loại hồ sơ (doc_type)"
          value={docType}
          onChange={(e) => setDocType(e.target.value)}
        />
        <button type="submit" className="btn-primary" disabled={loading}>
          {loading ? 'Đang tìm...' : 'Tìm kiếm'}
        </button>
      </form>

      {errorMsg && <ErrorBox message={errorMsg} />}

      {loading ? (
        <Spinner />
      ) : (
        <DataTable
          columns={columns}
          rows={logs}
          empty="Không tìm thấy bản ghi Audit Log nào."
        />
      )}
    </div>
  );
};

export default Audit;