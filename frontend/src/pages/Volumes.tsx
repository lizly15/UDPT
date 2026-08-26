import React, { useEffect, useState } from 'react';
import { api } from '../api/client';
import { VolumeRecord } from '../types/volume';

export const Volumes: React.FC = () => {
  const [volumes, setVolumes] = useState<VolumeRecord[]>([]);
  const [customerCode, setCustomerCode] = useState('');
  const [period, setPeriod] = useState('');
  const [serviceCode, setServiceCode] = useState('');
  const [recordDate, setRecordDate] = useState('');
  const [quantity, setQuantity] = useState<number>(0);

  const fetchVolumes = async () => {
    try {
      const data = await api.get<VolumeRecord[]>(`/volumes?customer_code=${customerCode}&period=${period}`);
      setVolumes(data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchVolumes();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
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
    }
  };

  const handleLockPeriod = async () => {
    if (!customerCode || !period) return;
    try {
      const idempotencyKey = `vol-lock-${customerCode}-${period}-${Date.now()}`;
      await api.post('/volumes/lock', { customer_code: customerCode, period }, idempotencyKey);
      fetchVolumes();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Quản lý Sản lượng</h1>

      <form onSubmit={handleSubmit} className="bg-gray-50 p-4 rounded mb-6 border grid grid-cols-2 gap-4">
        <input className="border p-2 rounded" placeholder="Mã khách hàng" value={customerCode} onChange={e => setCustomerCode(e.target.value)} required />
        <input className="border p-2 rounded" placeholder="Kỳ (YYYY-MM)" value={period} onChange={e => setPeriod(e.target.value)} required />
        <input className="border p-2 rounded" placeholder="Mã dịch vụ" value={serviceCode} onChange={e => setServiceCode(e.target.value)} required />
        <input className="border p-2 rounded" type="date" value={recordDate} onChange={e => setRecordDate(e.target.value)} required />
        <input className="border p-2 rounded col-span-2" type="number" placeholder="Sản lượng" value={quantity} onChange={e => setQuantity(Number(e.target.value))} required />
        <div className="col-span-2 flex gap-2">
          <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded">Ghi nhận sản lượng</button>
          <button type="button" onClick={handleLockPeriod} className="bg-red-600 text-white px-4 py-2 rounded">Khóa kỳ sản lượng</button>
        </div>
      </form>

      <table className="w-full border-collapse border">
        <thead>
          <tr className="bg-gray-100 border-b">
            <th className="p-2 border">Khách hàng</th>
            <th className="p-2 border">Kỳ</th>
            <th className="p-2 border">Ngày ghi nhận</th>
            <th className="p-2 border">Dịch vụ</th>
            <th className="p-2 border">Sản lượng</th>
            <th className="p-2 border">Trạng thái</th>
          </tr>
        </thead>
        <tbody>
          {volumes.map(v => (
            <tr key={v.id} className="border-b text-center">
              <td className="p-2 border">{v.customer_code}</td>
              <td className="p-2 border">{v.period}</td>
              <td className="p-2 border">{v.record_date}</td>
              <td className="p-2 border">{v.service_code}</td>
              <td className="p-2 border">{v.quantity}</td>
              <td className="p-2 border">{v.locked ? 'Đã khóa' : 'Mở'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default Volumes;