import { useEffect, useState } from "react";
import { api, errMsg, ApiError } from "../api/client";
import { useAuth } from "../context/AuthContext";
import Modal from "../components/Modal";
import FormField from "../components/FormField";
import StatusBadge from "../components/StatusBadge";
import DataTable, { type Column } from "../components/DataTable";
import { ErrorBox, Spinner } from "../components/Feedback";
import type {
  PriceList,
  PriceListVersion,
  EffectivePrice,
} from "../types/pricing";
import type { Customer } from "../types/customer";
import type { ServiceItem } from "../types/customer";

export default function Pricing() {
  const { hasRole } = useAuth();

  const canWrite = hasRole(
    "SALES",
    "SALES_MANAGER",
    "ADMIN"
  );

  const [lists, setLists] = useState<PriceList[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [services, setServices] = useState<ServiceItem[]>([]);

  const [customerFilter, setCustomerFilter] = useState("");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [listModalOpen, setListModalOpen] = useState(false);
  const [versionModalOpen, setVersionModalOpen] = useState(false);

  const [selectedList, setSelectedList] =
    useState<PriceList | null>(null);

  const [saving, setSaving] = useState(false);

  const [listForm, setListForm] = useState({
    code: "",
    name: "",
    customer_code: "",
  });

  const [versionForm, setVersionForm] = useState({
    effective_from: "",
    effective_to: "",
  });

  const [priceItems, setPriceItems] = useState<
    { service_code: string; unit_price: string }[]
  >([
    {
      service_code: "",
      unit_price: "",
    },
  ]);

  const [effectiveServiceCode, setEffectiveServiceCode] =
    useState("");

  const [effectiveDate, setEffectiveDate] = useState("");

  const [effectivePrice, setEffectivePrice] =
    useState<EffectivePrice | null>(null);

  const [effectiveError, setEffectiveError] =
    useState("");

  async function loadCustomers() {
    try {
      const data = await api.get<Customer[]>("/customers");
      setCustomers(data);
    } catch (err) {
      setError(errMsg(err));
    }
  }

  async function loadServices() {
    try {
      const data = await api.get<ServiceItem[]>("/services");
      setServices(data);
    } catch (err) {
      setError(errMsg(err));
    }
  }

  async function loadLists() {
    setLoading(true);
    setError("");

    try {
      const query = customerFilter
        ? `?customer_code=${encodeURIComponent(
            customerFilter
          )}`
        : "";

      const data = await api.get<PriceList[]>(
        `/pricing/lists${query}`
      );

      setLists(data);
    } catch (err) {
      setError(errMsg(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadCustomers();
    loadServices();
  }, []);

  useEffect(() => {
    loadLists();
  }, [customerFilter]);

  function resetListForm() {
    setListForm({
      code: "",
      name: "",
      customer_code: customerFilter,
    });
  }

  function resetVersionForm() {
    setVersionForm({
      effective_from: "",
      effective_to: "",
    });

    setPriceItems([
      {
        service_code: "",
        unit_price: "",
      },
    ]);
  }

  async function createPriceList(
    e: React.FormEvent
  ) {
    e.preventDefault();
    setError("");

    if (!listForm.code.trim()) {
      setError("Mã bảng giá không được để trống");
      return;
    }

    if (!listForm.name.trim()) {
      setError("Tên bảng giá không được để trống");
      return;
    }

    if (!listForm.customer_code) {
      setError("Vui lòng chọn khách hàng");
      return;
    }

    setSaving(true);

    try {
      await api.post(
        "/pricing/lists",
        {
          code: listForm.code.trim(),
          name: listForm.name.trim(),
          customer_code: listForm.customer_code,
        },
        crypto.randomUUID()
      );

      setListModalOpen(false);
      resetListForm();

      await loadLists();
    } catch (err) {
      setError(errMsg(err));
    } finally {
      setSaving(false);
    }
  }

  function addPriceItem() {
    setPriceItems([
      ...priceItems,
      {
        service_code: "",
        unit_price: "",
      },
    ]);
  }

  function removePriceItem(index: number) {
    if (priceItems.length === 1) return;

    setPriceItems(
      priceItems.filter((_, i) => i !== index)
    );
  }

  function updatePriceItem(
    index: number,
    field: "service_code" | "unit_price",
    value: string
  ) {
    setPriceItems(
      priceItems.map((item, i) =>
        i === index
          ? {
              ...item,
              [field]: value,
            }
          : item
      )
    );
  }

  async function createVersion(
    e: React.FormEvent
  ) {
    e.preventDefault();
    setError("");

    if (!selectedList) {
      setError("Chưa chọn bảng giá");
      return;
    }

    if (!versionForm.effective_from) {
      setError("Vui lòng chọn ngày bắt đầu hiệu lực");
      return;
    }

    if (!versionForm.effective_to) {
      setError("Vui lòng chọn ngày kết thúc hiệu lực");
      return;
    }

    if (
      versionForm.effective_to <
      versionForm.effective_from
    ) {
      setError(
        "Ngày kết thúc phải lớn hơn hoặc bằng ngày bắt đầu"
      );
      return;
    }

    const invalidItem = priceItems.some(
      (item) =>
        !item.service_code ||
        item.unit_price === "" ||
        Number(item.unit_price) < 0
    );

    if (invalidItem) {
      setError(
        "Mỗi dòng phải có dịch vụ và đơn giá hợp lệ"
      );
      return;
    }

    setSaving(true);

    try {
      await api.post(
        `/pricing/lists/${selectedList.code}/versions`,
        {
          effective_from:
            versionForm.effective_from,
          effective_to:
            versionForm.effective_to,
          items: priceItems.map((item) => ({
            service_code: item.service_code,
            unit_price: Number(item.unit_price),
          })),
        },
        crypto.randomUUID()
      );

      setVersionModalOpen(false);
      setSelectedList(null);
      resetVersionForm();

      await loadLists();
    } catch (err) {
      if (err instanceof ApiError) {
        setError(
          err.code === "EFFECTIVE_OVERLAP"
            ? `EFFECTIVE_OVERLAP: ${err.message}`
            : err.message
        );
      } else {
        setError(errMsg(err));
      }
    } finally {
      setSaving(false);
    }
  }

  async function submitVersion(
    version: PriceListVersion
  ) {
    setError("");

    try {
      await api.post(
        `/pricing/versions/${version.id}/submit`,
        {},
        crypto.randomUUID()
      );

      await loadLists();
    } catch (err) {
      if (err instanceof ApiError) {
        setError(
          err.code === "EFFECTIVE_OVERLAP"
            ? `EFFECTIVE_OVERLAP: ${err.message}`
            : err.message
        );
      } else {
        setError(errMsg(err));
      }
    }
  }

  async function lookupEffectivePrice() {
    setEffectiveError("");
    setEffectivePrice(null);

    if (!customerFilter) {
      setEffectiveError(
        "Vui lòng chọn khách hàng trước"
      );
      return;
    }

    if (!effectiveServiceCode) {
      setEffectiveError(
        "Vui lòng chọn dịch vụ"
      );
      return;
    }

    if (!effectiveDate) {
      setEffectiveError(
        "Vui lòng chọn ngày"
      );
      return;
    }

    try {
      const params = new URLSearchParams({
        customer_code: customerFilter,
        service_code: effectiveServiceCode,
        date: effectiveDate,
      });

      const data = await api.get<EffectivePrice>(
        `/pricing/effective?${params.toString()}`
      );

      setEffectivePrice(data);
    } catch (err) {
      setEffectiveError(errMsg(err));
    }
  }

  const versionColumns: Column<PriceListVersion>[] = [
    {
      key: "version_no",
      label: "Version",
      render: (version) =>
        `v${version.version_no}`,
    },
    {
      key: "effective",
      label: "Hiệu lực",
      render: (version) =>
        `${version.effective_from} → ${version.effective_to}`,
    },
    {
      key: "status",
      label: "Trạng thái",
      render: (version) => (
        <StatusBadge status={version.status} />
      ),
    },
    {
      key: "items",
      label: "Số dòng",
      render: (version) =>
        String(version.items?.length || 0),
    },
    {
      key: "actions",
      label: "Thao tác",
      render: (version) =>
        ["Draft", "Rejected"].includes(
          version.status
        ) ? (
          <button
            className="btn-secondary"
            onClick={(e) => {
              e.stopPropagation();
              submitVersion(version);
            }}
          >
            Gửi duyệt
          </button>
        ) : null,
    },
  ];

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-bold">
          Bảng giá
        </h1>

        {canWrite && (
          <button
            className="btn-primary"
            onClick={() => {
              setError("");
              resetListForm();
              setListModalOpen(true);
            }}
          >
            + Tạo bảng giá
          </button>
        )}
      </div>

      {error && (
        <div className="mb-4">
          <ErrorBox message={error} />
        </div>
      )}

      {/* Filter */}
      <div className="card mb-4 p-4">
        <label className="mb-1 block text-xs font-medium">
          Khách hàng
        </label>

        <select
          className="input max-w-md"
          value={customerFilter}
          onChange={(e) =>
            setCustomerFilter(e.target.value)
          }
        >
          <option value="">
            Tất cả khách hàng
          </option>

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

      {loading ? (
        <Spinner />
      ) : lists.length === 0 ? (
        <div className="card p-6 text-center text-sm text-slate-400">
          Chưa có bảng giá
        </div>
      ) : (
        <div className="space-y-4">
          {lists.map((list) => (
            <div
              key={list.code}
              className="card overflow-hidden"
            >
              <div className="flex items-center justify-between border-b border-slate-100 p-4">
                <div>
                  <div className="font-semibold">
                    {list.code} — {list.name}
                  </div>

                  <div className="text-xs text-slate-500">
                    Khách hàng:{" "}
                    {list.customer_code}
                  </div>
                </div>

                {canWrite && (
                  <button
                    className="btn-secondary"
                    onClick={() => {
                      setError("");
                      setSelectedList(list);
                      resetVersionForm();
                      setVersionModalOpen(true);
                    }}
                  >
                    + Tạo version
                  </button>
                )}
              </div>

              <div className="p-3">
                <DataTable
                  columns={versionColumns}
                  rows={list.versions || []}
                  empty="Chưa có version"
                />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Effective price lookup */}
      <div className="card mt-6 p-4">
        <h2 className="mb-3 font-semibold">
          Tra cứu giá hiệu lực
        </h2>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <div>
            <label className="mb-1 block text-xs font-medium">
              Dịch vụ
            </label>

            <select
              className="input w-full"
              value={effectiveServiceCode}
              onChange={(e) =>
                setEffectiveServiceCode(
                  e.target.value
                )
              }
            >
              <option value="">
                -- Chọn dịch vụ --
              </option>

              {services.map((service) => (
                <option
                  key={service.code}
                  value={service.code}
                >
                  {service.code} - {service.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium">
              Ngày
            </label>

            <input
              className="input w-full"
              type="date"
              value={effectiveDate}
              onChange={(e) =>
                setEffectiveDate(e.target.value)
              }
            />
          </div>

          <div className="flex items-end">
            <button
              className="btn-secondary"
              onClick={lookupEffectivePrice}
            >
              Tra cứu
            </button>
          </div>
        </div>

        {effectiveError && (
          <div className="mt-3">
            <ErrorBox message={effectiveError} />
          </div>
        )}

        {effectivePrice && (
          <div className="mt-4 rounded bg-slate-50 p-3 text-sm">
            <div>
              <b>Khách hàng:</b>{" "}
              {effectivePrice.customer_code}
            </div>

            <div>
              <b>Dịch vụ:</b>{" "}
              {effectivePrice.service_code}
            </div>

            <div>
              <b>Ngày:</b>{" "}
              {effectivePrice.date}
            </div>

            <div>
              <b>Đơn giá:</b>{" "}
              {effectivePrice.unit_price.toLocaleString(
                "vi-VN"
              )}{" "}
              đ
            </div>

            <div>
              <b>Version:</b>{" "}
              v{effectivePrice.version_no}
            </div>
          </div>
        )}
      </div>

      {/* Create price list */}
      <Modal
        open={listModalOpen}
        title="Tạo bảng giá"
        onClose={() => {
          if (!saving) {
            setListModalOpen(false);
            setError("");
          }
        }}
        footer={
          <>
            <button
              className="btn-secondary"
              disabled={saving}
              onClick={() =>
                setListModalOpen(false)
              }
            >
              Hủy
            </button>

            <button
              type="submit"
              form="price-list-form"
              className="btn-primary"
              disabled={saving}
            >
              {saving ? "Đang lưu..." : "Lưu"}
            </button>
          </>
        }
      >
        <form
          id="price-list-form"
          onSubmit={createPriceList}
          className="space-y-3"
        >
          {error && <ErrorBox message={error} />}

          <FormField
            label="Mã bảng giá"
            value={listForm.code}
            onChange={(value) =>
              setListForm({
                ...listForm,
                code: value,
              })
            }
            placeholder="VD: BG0001"
            required
          />

          <FormField
            label="Tên bảng giá"
            value={listForm.name}
            onChange={(value) =>
              setListForm({
                ...listForm,
                name: value,
              })
            }
            placeholder="VD: Bảng giá Samsung"
            required
          />

          <div>
            <label className="mb-1 block text-xs font-medium">
              Khách hàng *
            </label>

            <select
              className="input w-full"
              value={listForm.customer_code}
              onChange={(e) =>
                setListForm({
                  ...listForm,
                  customer_code:
                    e.target.value,
                })
              }
              required
            >
              <option value="">
                -- Chọn khách hàng --
              </option>

              {customers.map((customer) => (
                <option
                  key={customer.code}
                  value={customer.code}
                >
                  {customer.code} -{" "}
                  {customer.name}
                </option>
              ))}
            </select>
          </div>
        </form>
      </Modal>

      {/* Create version */}
      <Modal
        open={versionModalOpen}
        title={`Tạo version — ${
          selectedList?.code || ""
        }`}
        onClose={() => {
          if (!saving) {
            setVersionModalOpen(false);
            setSelectedList(null);
            setError("");
          }
        }}
        footer={
          <>
            <button
              className="btn-secondary"
              disabled={saving}
              onClick={() =>
                setVersionModalOpen(false)
              }
            >
              Hủy
            </button>

            <button
              type="submit"
              form="version-form"
              className="btn-primary"
              disabled={saving}
            >
              {saving ? "Đang lưu..." : "Lưu version"}
            </button>
          </>
        }
      >
        <form
          id="version-form"
          onSubmit={createVersion}
          className="space-y-4"
        >
          {error && <ErrorBox message={error} />}

          <div className="grid grid-cols-2 gap-3">
            <FormField
              label="Hiệu lực từ"
              type="date"
              value={
                versionForm.effective_from
              }
              onChange={(value) =>
                setVersionForm({
                  ...versionForm,
                  effective_from: value,
                })
              }
              required
            />

            <FormField
              label="Hiệu lực đến"
              type="date"
              value={
                versionForm.effective_to
              }
              onChange={(value) =>
                setVersionForm({
                  ...versionForm,
                  effective_to: value,
                })
              }
              required
            />
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-sm font-semibold">
                Danh sách dịch vụ
              </h3>

              <button
                type="button"
                className="btn-secondary"
                onClick={addPriceItem}
              >
                + Thêm dòng
              </button>
            </div>

            <div className="space-y-2">
              {priceItems.map((item, index) => (
                <div
                  key={index}
                  className="grid grid-cols-[1fr_140px_auto] gap-2"
                >
                  <select
                    className="input"
                    value={item.service_code}
                    onChange={(e) =>
                      updatePriceItem(
                        index,
                        "service_code",
                        e.target.value
                      )
                    }
                    required
                  >
                    <option value="">
                      -- Dịch vụ --
                    </option>

                    {services.map((service) => (
                      <option
                        key={service.code}
                        value={service.code}
                      >
                        {service.code} -{" "}
                        {service.name}
                      </option>
                    ))}
                  </select>

                  <input
                    className="input"
                    type="number"
                    min="0"
                    placeholder="Đơn giá"
                    value={item.unit_price}
                    onChange={(e) =>
                      updatePriceItem(
                        index,
                        "unit_price",
                        e.target.value
                      )
                    }
                    required
                  />

                  <button
                    type="button"
                    className="btn-danger"
                    disabled={
                      priceItems.length === 1
                    }
                    onClick={() =>
                      removePriceItem(index)
                    }
                  >
                    Xóa
                  </button>
                </div>
              ))}
            </div>
          </div>
        </form>
      </Modal>
    </div>
  );
}