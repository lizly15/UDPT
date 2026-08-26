import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api, errMsg, ApiError } from "../api/client";
import { useAuth } from "../context/AuthContext";
import DataTable, { type Column } from "../components/DataTable";
import Modal from "../components/Modal";
import FormField from "../components/FormField";
import StatusBadge from "../components/StatusBadge";
import { ErrorBox, Spinner } from "../components/Feedback";
import type { Contract } from "../types/contract";
import type { Customer } from "../types/customer";

const STATUSES = [
  "Draft",
  "Submitted",
  "Approved",
  "Active",
  "Expired",
  "Rejected",
  "RevisionRequested",
  "Cancelled",
];

export default function Contracts() {
  const navigate = useNavigate();
  const { hasRole } = useAuth();

  const canCreate = hasRole("SALES");

  const [items, setItems] = useState<Contract[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [customerFilter, setCustomerFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    code: "",
    customer_code: "",
    title: "",
    value: "",
    payment_terms: "",
    service_terms: "",
  });

  async function loadCustomers() {
    try {
      const data = await api.get<Customer[]>("/customers");
      setCustomers(data);
    } catch (err) {
      setError(errMsg(err));
    }
  }

  async function loadContracts() {
    setLoading(true);
    setError("");

    try {
      const params = new URLSearchParams();

      if (customerFilter) {
        params.set("customer_code", customerFilter);
      }

      if (statusFilter) {
        params.set("status", statusFilter);
      }

      const query = params.toString();
      const path = query ? `/contracts?${query}` : "/contracts";

      const data = await api.get<Contract[]>(path);
      setItems(data);
    } catch (err) {
      setError(errMsg(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadCustomers();
  }, []);

  useEffect(() => {
    loadContracts();
  }, [customerFilter, statusFilter]);

  function resetForm() {
    setForm({
      code: "",
      customer_code: "",
      title: "",
      value: "",
      payment_terms: "",
      service_terms: "",
    });
  }

  async function createContract(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!form.code.trim()) {
      setError("Mã hợp đồng không được để trống");
      return;
    }

    if (!form.customer_code) {
      setError("Vui lòng chọn khách hàng");
      return;
    }

    if (!form.title.trim()) {
      setError("Tiêu đề không được để trống");
      return;
    }

    if (!form.value || Number(form.value) < 0) {
      setError("Giá trị hợp đồng không hợp lệ");
      return;
    }

    setSaving(true);

    try {
      await api.post(
        "/contracts",
        {
          code: form.code.trim(),
          customer_code: form.customer_code,
          title: form.title.trim(),
          value: Number(form.value),
          payment_terms: form.payment_terms.trim(),
          service_terms: form.service_terms.trim(),
        },
        crypto.randomUUID()
      );

      setShowForm(false);
      resetForm();
      await loadContracts();
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError(errMsg(err));
      }
    } finally {
      setSaving(false);
    }
  }

  const fmt = (value: number) =>
    value.toLocaleString("vi-VN");

  const columns: Column<Contract>[] = [
    {
      key: "code",
      label: "Mã",
      render: (row) => (
        <span className="font-medium">{row.code}</span>
      ),
    },
    {
      key: "customer_code",
      label: "Khách hàng",
    },
    {
      key: "title",
      label: "Tiêu đề",
    },
    {
      key: "value",
      label: "Giá trị",
      render: (row) => `${fmt(row.value)} đ`,
    },
    {
      key: "status",
      label: "Trạng thái",
      render: (row) => <StatusBadge status={row.status} />,
    },
  ];

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-bold">Hợp đồng</h1>

        {canCreate && (
          <button
            className="btn-primary"
            onClick={() => {
              setError("");
              setShowForm(true);
            }}
          >
            + Tạo hợp đồng
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="card mb-4 flex flex-wrap gap-3 p-4">
        <div>
          <label className="mb-1 block text-xs font-medium">
            Khách hàng
          </label>

          <select
            className="input min-w-52"
            value={customerFilter}
            onChange={(e) => setCustomerFilter(e.target.value)}
          >
            <option value="">Tất cả khách hàng</option>

            {customers.map((customer) => (
              <option
                key={customer.code}
                value={customer.code}
              >
                {customer.code} - {customer.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium">
            Trạng thái
          </label>

          <select
            className="input min-w-48"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="">Tất cả trạng thái</option>

            {STATUSES.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
        </div>
      </div>

      {error && !showForm && (
        <div className="mb-4">
          <ErrorBox message={error} />
        </div>
      )}

      {loading ? (
        <Spinner />
      ) : (
        <DataTable
          columns={columns}
          rows={items}
          empty="Chưa có hợp đồng"
          onRowClick={(row) =>
            navigate(`/contracts/${row.code}`)
          }
        />
      )}

      {/* Create contract modal */}
      <Modal
        open={showForm}
        title="Tạo hợp đồng"
        onClose={() => {
          if (!saving) {
            setShowForm(false);
            setError("");
          }
        }}
        footer={
          <>
            <button
              type="button"
              className="btn-secondary"
              disabled={saving}
              onClick={() => {
                setShowForm(false);
                setError("");
              }}
            >
              Hủy
            </button>

            <button
              type="submit"
              form="contract-form"
              className="btn-primary"
              disabled={saving}
            >
              {saving ? "Đang lưu..." : "Lưu"}
            </button>
          </>
        }
      >
        <form
          id="contract-form"
          onSubmit={createContract}
          className="space-y-3"
        >
          {error && <ErrorBox message={error} />}

          <FormField
            label="Mã hợp đồng"
            value={form.code}
            onChange={(value) =>
              setForm({ ...form, code: value })
            }
            placeholder="VD: HD0001"
            required
          />

          <div>
            <label className="mb-1 block text-xs font-medium">
              Khách hàng *
            </label>

            <select
              className="input w-full"
              value={form.customer_code}
              onChange={(e) =>
                setForm({
                  ...form,
                  customer_code: e.target.value,
                })
              }
              required
            >
              <option value="">-- Chọn khách hàng --</option>

              {customers.map((customer) => (
                <option
                  key={customer.code}
                  value={customer.code}
                >
                  {customer.code} - {customer.name}
                </option>
              ))}
            </select>
          </div>

          <FormField
            label="Tiêu đề"
            value={form.title}
            onChange={(value) =>
              setForm({ ...form, title: value })
            }
            placeholder="VD: Hợp đồng vận chuyển năm 2026"
            required
          />

          <FormField
            label="Giá trị"
            type="number"
            value={form.value}
            onChange={(value) =>
              setForm({ ...form, value })
            }
            placeholder="VD: 100000000"
            required
          />

          <FormField
            label="Điều khoản thanh toán"
            value={form.payment_terms}
            onChange={(value) =>
              setForm({
                ...form,
                payment_terms: value,
              })
            }
            placeholder="VD: Thanh toán trong 30 ngày"
          />

          <FormField
            label="Điều khoản dịch vụ"
            value={form.service_terms}
            onChange={(value) =>
              setForm({
                ...form,
                service_terms: value,
              })
            }
            placeholder="Mô tả điều khoản dịch vụ"
          />
        </form>
      </Modal>
    </div>
  );
}