import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api, errMsg } from "../api/client";
import { Payment } from "../types/payment";
import { useAuth } from "../context/AuthContext";
import PageHeader from "../components/PageHeader";
import DataTable, { Column } from "../components/DataTable";
import Modal from "../components/Modal";
import FormField from "../components/FormField";
import { ErrorBox, Spinner } from "../components/Feedback";
import StatusBadge from "../components/StatusBadge";

export const Payments: React.FC = () => {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [customerCode, setCustomerCode] = useState("");
  const [contractCode, setContractCode] = useState("");
  const [period, setPeriod] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [openModal, setOpenModal] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const navigate = useNavigate();
  const { hasRole } = useAuth();

  // Kiểm tra quyền xem danh sách bảng thanh toán
  const canView = hasRole("ACCOUNTANT", "SALES_MANAGER", "DIRECTOR", "ADMIN");

  const fetchPayments = async () => {
    setLoading(true);
    try {
      setErrorMsg(null);
      const data = await api.get<Payment[]>("/payments");
      setPayments(data || []);
    } catch (err) {
      console.error(err);
      setErrorMsg(errMsg(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (canView) {
      fetchPayments();
    }
  }, [canView]);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorMsg(null);

    try {
      const idempotencyKey = `pay-gen-${customerCode}-${period}-${Date.now()}`;
      await api.post(
        "/payments/generate",
        {
          customer_code: customerCode,
          contract_code: contractCode,
          period,
        },
        idempotencyKey
      );

      setOpenModal(false);
      setCustomerCode("");
      setContractCode("");
      setPeriod("");
      fetchPayments();
    } catch (err) {
      setErrorMsg(errMsg(err));
    } finally {
      setSubmitting(false);
    }
  };

  // Nếu không có quyền truy cập trang
  if (!canView) {
    return (
      <div className="p-4">
        <ErrorBox message="Bạn không có quyền truy cập trang Bảng thanh toán." />
      </div>
    );
  }

  const columns: Column<Payment>[] = [
    {
      key: "code",
      label: "Mã bảng thanh toán",
      render: (p) => <span className="font-semibold">{p.code}</span>,
    },
    { key: "customer_code", label: "Mã KH" },
    { key: "contract_code", label: "Mã HĐ" },
    { key: "period", label: "Kỳ" },
    {
      key: "total",
      label: "Tổng tiền",
      render: (p) => (
        <span className="font-medium">
          {p.total?.toLocaleString()} đ
        </span>
      ),
    },
    {
      key: "status",
      label: "Trạng thái",
      render: (p) => <StatusBadge status={p.status} />,
    },
    {
      key: "actions",
      label: "Thao tác",
      render: (p) => (
        <button
          onClick={(e) => {
            e.stopPropagation();
            navigate(`/payments/${p.id}`);
          }}
          className="btn-secondary text-xs"
        >
          Xem chi tiết
        </button>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <PageHeader
        title="Bảng thanh toán"
        action={
          /* Nút Tạo bảng thanh toán: Dành cho Kế toán viên, Kế toán trưởng, Quản lý, ADMIN */
          hasRole("ACCOUNTANT", "CHIEF_ACCOUNTANT", "MANAGER", "ADMIN") ? (
            <button
              onClick={() => {
                setErrorMsg(null);
                setOpenModal(true);
              }}
              className="btn-primary"
            >
              Tạo bảng thanh toán
            </button>
          ) : undefined
        }
      />

      {errorMsg && <ErrorBox message={errorMsg} />}

      {loading ? (
        <Spinner />
      ) : (
        <DataTable
          columns={columns}
          rows={payments}
          empty="Chưa có dữ liệu bảng thanh toán"
          onRowClick={(p) => navigate(`/payments/${p.id}`)}
        />
      )}

      <Modal
        open={openModal}
        title="Tạo bảng thanh toán mới"
        onClose={() => setOpenModal(false)}
        footer={
          <>
            <button
              type="button"
              onClick={() => setOpenModal(false)}
              className="btn-secondary"
            >
              Hủy
            </button>
            <button
              type="submit"
              form="generate-payment-form"
              disabled={submitting}
              className="btn-primary"
            >
              {submitting ? "Đang tạo…" : "Tạo mới"}
            </button>
          </>
        }
      >
        <form
          id="generate-payment-form"
          onSubmit={handleGenerate}
          className="space-y-3"
        >
          <FormField
            label="Mã Khách hàng"
            placeholder="vd: KH0001"
            value={customerCode}
            onChange={setCustomerCode}
            required
          />
          <FormField
            label="Mã Hợp đồng"
            placeholder="vd: HD2026001"
            value={contractCode}
            onChange={setContractCode}
            required
          />
          <FormField
            label="Kỳ thanh toán"
            placeholder="2026-03"
            value={period}
            onChange={setPeriod}
            required
          />
        </form>
      </Modal>
    </div>
  );
};

export default Payments;