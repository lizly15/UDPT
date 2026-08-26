import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, errMsg } from '../api/client';
import { Payment } from '../types/payment';

export const Payments: React.FC = () => {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [customerCode, setCustomerCode] = useState('');
  const [contractCode, setContractCode] = useState(''); //
  const [period, setPeriod] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const fetchPayments = async () => {
    try {
      const data = await api.get<Payment[]>('/payments');
      setPayments(data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchPayments();
  }, []);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const idempotencyKey = `pay-gen-${customerCode}-${period}-${Date.now()}`;
      // ✅ Gửi bổ sung contract_code lên Backend
      await api.post('/payments/generate', { 
        customer_code: customerCode, 
        contract_code: contractCode,
        period 
      }, idempotencyKey);
      
      alert('Tạo bảng thanh toán thành công!');
      fetchPayments();
    } catch (err) {
      alert(`Lỗi: ${errMsg(err)}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Bảng thanh toán</h1>

      <form onSubmit={handleGenerate} className="flex gap-2 mb-6">
        <input 
          className="border p-2 rounded" 
          placeholder="Mã KH (vd: KH0001)" 
          value={customerCode} 
          onChange={e => setCustomerCode(e.target.value)} 
          required 
        />
        {/* ✅ Bổ sung Input Mã hợp đồng */}
        <input 
          className="border p-2 rounded" 
          placeholder="Mã HĐ (vd: HD2026001)" 
          value={contractCode} 
          onChange={e => setContractCode(e.target.value)} 
          required 
        />
        <input 
          className="border p-2 rounded" 
          placeholder="Kỳ (YYYY-MM)" 
          value={period} 
          onChange={e => setPeriod(e.target.value)} 
          required 
        />
        <button 
          type="submit" 
          disabled={loading}
          className="bg-green-600 text-white px-4 py-2 rounded disabled:bg-gray-400"
        >
          {loading ? 'Đang tạo...' : 'Tạo bảng thanh toán'}
        </button>
      </form>

      <div className="space-y-2">
        {payments.map(p => (
          <div key={p.id} className="border p-4 rounded flex justify-between items-center">
            <div>
              <p className="font-bold">{p.code} - Mã KH: {p.customer_code} (HĐ: {p.contract_code})</p>
              <p className="text-sm text-gray-600">
                Tổng tiền: {p.total.toLocaleString()} VNĐ (Thành tiền: {p.subtotal.toLocaleString()} | Thuế: {p.tax.toLocaleString()}) | Trạng thái: {p.status}
              </p>
            </div>
            <button onClick={() => navigate(`/payments/${p.id}`)} className="bg-blue-600 text-white px-3 py-1 rounded">
              Xem chi tiết
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Payments;