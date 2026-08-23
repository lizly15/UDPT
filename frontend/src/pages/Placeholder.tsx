// Trang tạm cho các module 2 bạn FE sẽ hoàn thiện (xem docs/frontend-handover.md).
export default function Placeholder({ title, owner }: { title: string; owner: string }) {
  return (
    <div className="card p-8 text-center">
      <h1 className="text-xl font-bold text-primary">{title}</h1>
      <p className="mt-2 text-sm text-slate-500">
        Màn hình này chưa làm — phụ trách: <b>{owner}</b>.
      </p>
      <p className="mt-1 text-xs text-slate-400">
        Xem endpoint ở <code>docs/api.md</code> và pattern ở <code>pages/Customers.tsx</code>.
      </p>
    </div>
  );
}
