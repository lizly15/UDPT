import React, { useEffect, useState } from 'react';
import { api, errMsg } from '../api/client';
import { VolumeRecord } from '../types/volume';
import { useAuth } from '../context/AuthContext';
import PageHeader from '../components/PageHeader';
import DataTable, { Column } from '../components/DataTable';
import StatusBadge from '../components/StatusBadge';
import { ErrorBox } from '../components/Feedback';

export const Volumes: React.FC = () => {
  const [volumes, setVolumes] = useState<VolumeRecord[]>([]);
  const [customerCode, setCustomerCode] = useState('');
  const [period, setPeriod] = useState('');
  const [serviceCode, setServiceCode] = useState('');
  const [recordDate, setRecordDate] = useState('');
  const [quantity, setQuantity] = useState<number>(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const { hasRole } = useAuth();

  // Kiểm tra quyền xem trang Sản lượng
  const canView = hasRole('OPERATIONS', 'ACCOUNTANT', 'SALES_MANAGER', 'DIRECTOR', 'ADMIN');

  // Khai báo các cờ phân quyền thao tác
  const canCreate = hasRole('OPERATIONS' ,'ADMIN');
  const canLock = hasRole('OPERATIONS', 'ADMIN');

  const fetchVolumes = async () => {
    try {
      setErrorMsg(null);
      const data = await api.get<VolumeRecord[]>(`/volumes?customer_code=${customerCode}&period=${period}`);
      setVolumes(data || []);
    } catch (err) {
      console.error(err);
      setErrorMsg(errMsg(err));
    }
  };

  useEffect(() => {
    if (canView) {
      fetchVolumes();
    }
  }, [canView]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canCreate) {
      setErrorMsg('Bạn không có quyền ghi nhận sản lượng.');
      return;
    }
    try {
      setErrorMsg(null);
      const idempotencyKey = `vol-create-${Date.now()}`;
      await api.post('/volumes', {
        customer_code: customerCode,
        period,
        service_code: serviceCode,
        record_date: recordDate,
        quantity: Number(quantity)
      }, idempotencyKey);
      fetchVolumes();
    } catch (err) {
      console.error(err);
      setErrorMsg(errMsg(err));
    }
  };

  const handleLockPeriod = async () => {
    if (!canLock) {
      setErrorMsg('Bạn không có quyền khóa kỳ sản lượng.');
      return;
    }
    if (!customerCode || !period) {
      setErrorMsg('Vui lòng nhập Mã khách hàng và Kỳ để thực hiện khóa kỳ.');
      return;
    }
    try {
      setErrorMsg(null);
      const idempotencyKey = `vol-lock-${customerCode}-${period}-${Date.now()}`;
      await api.post('/volumes/lock', { customer_code: customerCode, period }, idempotencyKey);
      fetchVolumes();
    } catch (err) {
      console.error(err);
      setErrorMsg(errMsg(err));
    }
  };

  // Nếu không có quyền xem trang
  if (!canView) {
    return (
      <div className="p-4">
        <ErrorBox message="Bạn không có quyền truy cập trang Quản lý Sản lượng." />
      </div>
    );
  }

  const columns: Column<VolumeRecord>[] = [
    { key: 'customer_code', label: 'Khách hàng' },
    { key: 'period', label: 'Kỳ' },
    { key: 'record_date', label: 'Ngày ghi nhận' },
    { key: 'service_code', label: 'Dịch vụ' },
    { 
      key: 'quantity', 
      label: 'Sản lượng',
      render: (v) => (v.quantity ?? 0).toLocaleString()
    },
    {
      key: 'locked',
      label: 'Trạng thái',
      render: (v) => <StatusBadge status={v.locked ? 'LOCKED' : 'OPEN'} />
    },
  ];

  return (
    <div className="space-y-4">
      <PageHeader title="Quản lý Sản lượng" />

      {errorMsg && <ErrorBox message={errorMsg} />}

      {/* Form chỉ hiển thị nếu người dùng có ít nhất một trong hai quyền: Tạo mới hoặc Khóa kỳ */}
      {(canCreate || canLock) && (
        <form onSubmit={handleSubmit} className="card grid grid-cols-2 gap-4 p-4">
          <input 
            className="input-field" 
            placeholder="Mã khách hàng" 
            value={customerCode} 
            onChange={e => setCustomerCode(e.target.value)} 
            required 
          />
          <input 
            className="input-field" 
            placeholder="Kỳ (YYYY-MM)" 
            value={period} 
            onChange={e => setPeriod(e.target.value)} 
            required 
          />
          <input 
            className="input-field" 
            placeholder="Mã dịch vụ" 
            value={serviceCode} 
            onChange={e => setServiceCode(e.target.value)} 
            required={canCreate}
          />
          <input 
            className="input-field" 
            type="date" 
            value={recordDate} 
            onChange={e => setRecordDate(e.target.value)} 
            required={canCreate}
          />
          <input 
            className="input-field col-span-2" 
            type="number" 
            placeholder="Sản lượng" 
            value={quantity} 
            onChange={e => setQuantity(Number(e.target.value))} 
            required={canCreate}
          />
          <div className="col-span-2 flex gap-2">
            {/* Nút Ghi nhận sản lượng */}
            {canCreate && (
              <button type="submit" className="btn-primary">
                Ghi nhận sản lượng
              </button>
            )}

            {/* Nút Khóa kỳ sản lượng */}
            {canLock && (
              <button type="button" onClick={handleLockPeriod} className="btn-danger">
                Khóa kỳ sản lượng
              </button>
            )}
          </div>
        </form>
      )}

      <DataTable 
        columns={columns} 
        rows={volumes} 
        empty="Chưa có dữ liệu sản lượng" 
      />
    </div>
  );
};

export default Volumes;