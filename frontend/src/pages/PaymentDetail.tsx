import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { api, errMsg } from '../api/client';
import { Payment, SigningSession } from '../types/payment';
import { useAuth } from '../context/AuthContext';
import PageHeader from '../components/PageHeader';
import StatusBadge from '../components/StatusBadge';
import ApprovalTimeline from '../components/ApprovalTimeline';
import DataTable, { Column } from '../components/DataTable';
import { ErrorBox, Spinner } from '../components/Feedback';

export const PaymentDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [payment, setPayment] = useState<Payment | null>(null);
  const [signingSession, setSigningSession] = useState<SigningSession | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const { hasRole } = useAuth();

  // Kiểm tra quyền truy cập vào trang Chi tiết Thanh toán
  const canView = hasRole('ACCOUNTANT', 'SALES_MANAGER', 'DIRECTOR', 'ADMIN');

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
    if (canView) {
      fetchDetail();
      const interval = setInterval(() => {
        fetchDetail();
      }, 3000);
      return () => clearInterval(interval);
    }
  }, [id, canView]);

  const handleSubmit = async () => {
    try {
      setErrorMsg(null);
      const idempotencyKey = `pay-submit-${id}-${Date.now()}`;
      await api.post(`/payments/${id}/submit`, {}, idempotencyKey);
      fetchDetail();
    } catch (err) {
      setErrorMsg(errMsg(err));
    }
  };

  // Gửi ký lại khi ký điện tử thất bại (SC-06)
  const handleRetrySign = async () => {
    try {
      setErrorMsg(null);
      const idempotencyKey = `pay-retry-${id}-${Date.now()}`;
      await api.post(`/workflows/esign/${id}/retry`, {}, idempotencyKey);
      fetchDetail();
    } catch (err) {
      setErrorMsg(errMsg(err));
    }
  };



  // Nếu không có quyền xem trang
  if (!canView) {
    return (
      <div className="p-4">
        <ErrorBox message="Bạn không có quyền xem chi tiết Bảng thanh toán này." />
      </div>
    );
  }

  if (!payment) return <Spinner />;

  const currentStatus = payment.status?.toUpperCase();

  const fmt = (v?: number) => (v ?? 0).toLocaleString();

  const lineColumns: Column<any>[] = [
    { key: 'service_code', label: 'Mã dịch vụ' },
    { key: 'quantity', label: 'Số lượng' },
    {
      key: 'unit_price',
      label: 'Đơn giá',
      render: (line) => `${fmt(line.unit_price)} đ`,
    },
    {
      key: 'amount',
      label: 'Thành tiền',
      render: (line) => `${fmt(line.amount)} đ`,
    },
  ];

  return (
    <div className="space-y-4">
      <PageHeader
        title={`Chi tiết Bảng thanh toán: ${payment.code}`}
        action={
          <div className="flex gap-2">
            {/* Nút Gửi duyệt: Dành cho Kế toán viên, Kế toán trưởng, ADMIN */}
            {currentStatus === 'DRAFT' && hasRole('ACCOUNTANT', 'ADMIN') && (
              <button onClick={handleSubmit} className="btn-primary">
                Gửi duyệt
              </button>
            )}
            {/* Nút Gửi ký lại: chỉ hiện khi ký điện tử thất bại (SC-06) */}
            {signingSession?.status?.toLowerCase() === 'failed' &&
              hasRole('ACCOUNTANT', 'ADMIN') && (
                <button onClick={handleRetrySign} className="btn-secondary">
                  Gửi ký lại
                </button>
              )}
          </div>
        }
      />

      {errorMsg && <ErrorBox message={errorMsg} />}

      <div className="card grid grid-cols-3 gap-3 p-4 text-sm">
        <div><b>Khách hàng:</b> {payment.customer_code}</div>
        <div><b>Hợp đồng:</b> {payment.contract_code}</div>
        <div><b>Kỳ:</b> {payment.period}</div>
        <div className="flex items-center gap-2">
          <b>Trạng thái:</b> <StatusBadge status={payment.status} />
        </div>
        <div className="flex items-center gap-2">
          <b>Trạng thái ký điện tử:</b>{' '}
          <StatusBadge status={signingSession?.status || 'none'} />
        </div>
      </div>

      {id && (
        <div className="card p-4">
          <h2 className="mb-3 text-base font-semibold text-primary">
            Tiến trình phê duyệt
          </h2>
          <ApprovalTimeline docType="PAYMENT" docId={id} />
        </div>
      )}

      <div>
        <h2 className="mb-2 text-base font-semibold">Dòng dịch vụ (Lines)</h2>
        <DataTable
          columns={lineColumns}
          rows={payment.lines || []}
          empty="Không có dòng dịch vụ"
        />
        <div className="card mt-2 p-3 text-right text-sm">
          <div>Tạm tính: <b>{fmt(payment.subtotal)} đ</b></div>
          <div>Thuế: {fmt(payment.tax)} đ</div>
          <div className="text-base font-bold text-primary">
            Tổng cộng: {fmt(payment.total)} đ
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentDetail;