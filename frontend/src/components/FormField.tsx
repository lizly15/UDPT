// Component chung (đóng băng). Ô nhập có label + lỗi.
export default function FormField({
  label, value, onChange, type = "text", placeholder, required, error,
}: {
  label: string; value: string; onChange: (v: string) => void;
  type?: string; placeholder?: string; required?: boolean; error?: string;
}) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium">{label}{required && " *"}</label>
      <input className="input" type={type} value={value} placeholder={placeholder}
             required={required} onChange={(e) => onChange(e.target.value)} />
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}
