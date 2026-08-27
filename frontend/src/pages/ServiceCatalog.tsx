import { useEffect, useState } from "react";
import { api, ApiError } from "../api/client";
import { useAuth } from "../context/AuthContext";
import DataTable, { type Column } from "../components/DataTable";
import Modal from "../components/Modal";
import FormField from "../components/FormField";
import { ErrorBox, Spinner } from "../components/Feedback";
import type { ServiceItem } from "../types";

export default function ServiceCatalog() {
  const { hasRole } = useAuth();

  const canWrite = hasRole("SALES", "SALES_MANAGER", "ADMIN");

  const [items, setItems] = useState<ServiceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    code: "",
    name: "",
    unit: "",
  });

  async function load() {
    setLoading(true);
    setError("");

    try {
      const data = await api.get<ServiceItem[]>("/services");
      setItems(data);
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "Không thể tải danh mục dịch vụ"
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!form.code.trim()) {
      setError("Mã dịch vụ không được để trống");
      return;
    }

    if (!form.name.trim()) {
      setError("Tên dịch vụ không được để trống");
      return;
    }

    if (!form.unit.trim()) {
      setError("Đơn vị không được để trống");
      return;
    }

    setSaving(true);

    try {
      await api.post(
        "/services",
        {
          code: form.code.trim(),
          name: form.name.trim(),
          unit: form.unit.trim(),
        },
        crypto.randomUUID()
      );

      setShowForm(false);
      setForm({
        code: "",
        name: "",
        unit: "",
      });

      await load();
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "Không thể tạo dịch vụ"
      );
    } finally {
      setSaving(false);
    }
  }

  const columns: Column<ServiceItem>[] = [
    {
      key: "code",
      label: "Mã",
      render: (service) => (
        <span className="font-medium">{service.code}</span>
      ),
    },
    {
      key: "name",
      label: "Tên",
    },
    {
      key: "unit",
      label: "Đơn vị",
    },
  ];

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-bold">Danh mục dịch vụ</h1>

        {canWrite && (
          <button
            className="btn-primary"
            onClick={() => {
              setError("");
              setShowForm(true);
            }}
          >
            + Thêm dịch vụ
          </button>
        )}
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
          empty="Chưa có dịch vụ"
        />
      )}

      <Modal
        open={showForm}
        title="Thêm dịch vụ"
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
              form="service-form"
              className="btn-primary"
              disabled={saving}
            >
              {saving ? "Đang lưu..." : "Lưu"}
            </button>
          </>
        }
      >
        <form id="service-form" onSubmit={create} className="space-y-3">
          {error && <ErrorBox message={error} />}

          <FormField
            label="Mã dịch vụ"
            value={form.code}
            onChange={(value) =>
              setForm({ ...form, code: value })
            }
            placeholder="VD: VC01"
            required
          />

          <FormField
            label="Tên dịch vụ"
            value={form.name}
            onChange={(value) =>
              setForm({ ...form, name: value })
            }
            placeholder="VD: Vận chuyển"
            required
          />

          <FormField
            label="Đơn vị"
            value={form.unit}
            onChange={(value) =>
              setForm({ ...form, unit: value })
            }
            placeholder="VD: chuyến"
            required
          />
        </form>
      </Modal>
    </div>
  );
}