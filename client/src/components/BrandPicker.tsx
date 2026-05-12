import { useState, useRef, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { BookOpen, Plus, Trash2, X, Check } from "lucide-react";
import { toast } from "sonner";

interface BrandPickerProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export default function BrandPicker({ value, onChange, placeholder = "Например: Samsung" }: BrandPickerProps) {
  const [open, setOpen] = useState(false);
  const [newBrand, setNewBrand] = useState("");
  const [adding, setAdding] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const { data: brands = [], refetch } = trpc.brands.list.useQuery(undefined, {
    retry: false,
    refetchOnWindowFocus: false,
  });

  const createMutation = trpc.brands.create.useMutation({
    onSuccess: () => {
      refetch();
      setNewBrand("");
      setAdding(false);
      toast.success("Бренд сохранён");
    },
    onError: (err) => toast.error(err.message),
  });

  const deleteMutation = trpc.brands.delete.useMutation({
    onSuccess: () => { refetch(); toast.success("Бренд удалён"); },
    onError: (err) => toast.error(err.message),
  });

  // Close dropdown when clicking outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    if (open) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const handleSelect = (name: string) => {
    onChange(name);
    setOpen(false);
  };

  const handleAdd = () => {
    const trimmed = newBrand.trim();
    if (!trimmed) return;
    createMutation.mutate({ name: trimmed });
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <div className="flex gap-1.5">
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
        />
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          title="Выбрать из сохранённых брендов"
          className="flex items-center justify-center w-9 h-9 border border-gray-300 rounded-lg bg-white hover:bg-gray-50 transition-colors shrink-0"
        >
          <BookOpen size={16} className="text-gray-500" />
        </button>
      </div>

      {open && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-xl z-50 overflow-hidden">
          <div className="p-2 border-b border-gray-100">
            <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide px-1 mb-1.5">Сохранённые бренды</p>

            {brands.length === 0 && !adding && (
              <p className="text-xs text-gray-400 text-center py-2">Нет сохранённых брендов</p>
            )}

            <div className="max-h-44 overflow-y-auto space-y-0.5">
              {brands.map((b) => (
                <div
                  key={b.id}
                  className="flex items-center gap-1.5 group rounded-lg hover:bg-gray-50 px-1.5 py-1 cursor-pointer"
                  onClick={() => handleSelect(b.name)}
                >
                  {value === b.name && <Check size={12} className="text-green-600 shrink-0" />}
                  <span className="flex-1 text-sm text-gray-800 truncate">{b.name}</span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteMutation.mutate({ id: b.id });
                    }}
                    className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-red-50 transition-all"
                    title="Удалить бренд"
                  >
                    <Trash2 size={11} className="text-red-400" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Добавить новый бренд */}
          <div className="p-2">
            {adding ? (
              <div className="flex gap-1.5">
                <input
                  autoFocus
                  type="text"
                  value={newBrand}
                  onChange={(e) => setNewBrand(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") { e.preventDefault(); handleAdd(); }
                    if (e.key === "Escape") { setAdding(false); setNewBrand(""); }
                  }}
                  placeholder="Название бренда"
                  className="flex-1 border border-gray-300 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                />
                <button
                  type="button"
                  onClick={handleAdd}
                  disabled={!newBrand.trim() || createMutation.isPending}
                  className="px-3 py-1.5 bg-primary text-white rounded-lg text-xs font-semibold disabled:opacity-50"
                >
                  {createMutation.isPending ? "..." : "Сохранить"}
                </button>
                <button
                  type="button"
                  onClick={() => { setAdding(false); setNewBrand(""); }}
                  className="p-1.5 border border-gray-200 rounded-lg hover:bg-gray-50"
                >
                  <X size={14} className="text-gray-400" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setAdding(true)}
                className="w-full flex items-center gap-1.5 text-xs text-primary font-semibold py-1.5 px-2 rounded-lg hover:bg-primary/5 transition-colors"
              >
                <Plus size={13} />
                Добавить новый бренд
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
