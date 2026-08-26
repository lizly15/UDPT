import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { api, errMsg } from '../api/client';
import { Payment, SigningSession } from '../types/payment';

export const PaymentDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [payment, setPayment] = useState<Payment | null>(null);
  const [signingSession, setSigningSession] = useState<SigningSession | null>(null);

  const fetchDetail = async () => {
    try {
      const paymentData = await api.get<Payment>(`/payments/${id}`);
      setPayment(paymentData);
      
      const esignData = await api.get<SigningSession>(`/workflows/esign/${id}`);
      setSigningSession(esignData);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchDetail();
    const interval = setInterval(() => {
      fetchDetail();
    }, 3000);
    return () => clearInterval(interval);
  }, [id]);

  const handleSubmit = async () => {
    try {
      const idempotencyKey = `pay-submit-${id}-${Date.now()}`;
      await api.post(`/payments/${id}/submit`, {}, idempotencyKey);
      alert('Đã gửi duyệt thành công!');
      fetchDetail();
    } catch (err) {
      alert(`Lỗi: ${errMsg(err)}`);
    }
  };

  const handleResign = async () => {
    try {
      const idempotencyKey = `pay-resign-${id}-${Date.now()}`;
      await api.post(`/workflows/esign/${id}/resign`, {}, idempotencyKey);
      alert('Đã gửi ký lại!');
      fetchDetail();
    } catch (err) {
      alert(`Lỗi: ${errMsg(err)}`);
    }
  };

  if (!payment) return <div className="p-6">Đang tải...</div>;

  // Chuẩn hóa trạng thái về chữ hoa để so sánh chuẩn xác
  const currentStatus = payment.status?.toUpperCase();
  const signStatus = signingSession?.status?.toUpperCase();

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-bold">Chi tiết Bảng thanh toán: {payment.code}</h1>
      <p>Mã Hợp đồng: <strong>{payment.contract_code}</strong></p>
      <p>Trạng thái: <strong>{payment.status}</strong></p>
      <p>Trạng thái ký điện tử: <strong>{signingSession?.status || 'none'}</strong></p>

      {/* ✅ Nút Gửi duyệt sẽ xuất hiện khi status là DRAFT hoặc Draft */}
      <div className="flex gap-2 my-4">
        {currentStatus === 'DRAFT' && (
          <button onClick={handleSubmit} className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
            Gửi duyệt
          </button>
        )}
        {signStatus === 'FAILED' && (
          <button onClick={handleResign} className="bg-yellow-600 text-white px-4 py-2 rounded hover:bg-yellow-700">
            Gửi ký lại
          </button>
        )}
      </div>

      <h2 className="text-lg font-bold mt-4">Dòng dịch vụ (Lines)</h2>
      <table className="w-full border-collapse border bg-white">
        <thead>
          <tr className="bg-gray-100 border-b">
            <th className="p-2 border">Mã dịch vụ</th>
            <th className="p-2 border">Số lượng</th>
            <th className="p-2 border">Đơn giá</th>
            <th className="p-2 border">Thành tiền</th>
          </tr>
        </thead>
        <tbody>
          {payment.lines?.map((line, idx) => (
            <tr key={idx} className="border-b text-center">
              <td className="p-2 border">{line.service_code}</td>
              <td className="p-2 border">{line.quantity}</td>
              <td className="p-2 border">{line.unit_price.toLocaleString()}</td>
              <td className="p-2 border">{line.amount.toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="text-right space-y-1">
        <p>Tạm tính: {payment.subtotal.toLocaleString()} VNĐ</p>
        <p>Thuế: {payment.tax.toLocaleString()} VNĐ</p>
        <p className="font-bold text-lg">Tổng cộng: {payment.total.toLocaleString()} VNĐ</p>
      </div>
    </div>
  );
};

export default PaymentDetail;