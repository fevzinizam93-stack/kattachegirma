/**
 * ContactPhonePicker
 * A reusable input that lets admin/seller:
 *  - Type a phone number manually
 *  - Click the phone-book icon to open a popover with saved contacts
 *  - Save a new contact (name + phone) from the popover
 *  - Delete a contact (admin only)
 */
import { useState, useRef, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { BookUser, Plus, Trash2, X } from "lucide-react";
import { toast } from "sonner";

interface Props {
  value: string;
  onChange: (phone: string) => void;
  placeholder?: string;
  className?: string;
}

export default function ContactPhonePicker({ value, onChange, placeholder = "+998 __ ___ __ __", className = "" }: Props) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  const utils = trpc.useUtils();
  const { data: contacts = [], isLoading } = trpc.sellerContacts.list.useQuery(undefined, {
    enabled: open,
  });

  const createMut = trpc.sellerContacts.create.useMutation({
    onSuccess: (contact) => {
      utils.sellerContacts.list.invalidate();
      if (contact) {
        onChange(contact.phone);
        toast.success(`Контакт «${contact.name}» сохранён`);
      }
      setNewName("");
      setNewPhone("");
      setShowAdd(false);
      setOpen(false);
    },
    onError: (e) => toast.error(e.message),
  });

  const deleteMut = trpc.sellerContacts.delete.useMutation({
    onSuccess: () => {
      utils.sellerContacts.list.invalidate();
      toast.success("Контакт удалён");
    },
    onError: (e) => toast.error(e.message),
  });

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  return (
    <div className={`relative ${className}`}>
      <div className="flex items-center gap-1.5">
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
        />
        <button
          type="button"
          title="Выбрать из сохранённых контактов"
          onClick={() => setOpen((v) => !v)}
          className="shrink-0 w-9 h-9 flex items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 hover:text-primary transition-colors"
        >
          <BookUser size={16} />
        </button>
      </div>

      {open && (
        <div
          ref={popoverRef}
          className="absolute z-50 right-0 mt-1.5 w-80 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <p className="font-bold text-sm text-gray-900">Сохранённые контакты</p>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="text-gray-400 hover:text-gray-600"
            >
              <X size={15} />
            </button>
          </div>

          {/* Contact list */}
          <div className="max-h-56 overflow-y-auto">
            {isLoading && (
              <div className="flex justify-center py-6">
                <div className="w-5 h-5 border-2 border-gray-200 border-t-primary rounded-full animate-spin" />
              </div>
            )}
            {!isLoading && contacts.length === 0 && (
              <p className="text-center text-gray-400 text-sm py-6">Нет сохранённых контактов</p>
            )}
            {contacts.map((c) => (
              <div
                key={c.id}
                className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 group"
              >
                <button
                  type="button"
                  className="flex-1 text-left min-w-0"
                  onClick={() => {
                    onChange(c.phone);
                    setOpen(false);
                  }}
                >
                  <p className="text-sm font-semibold text-gray-900 truncate">{c.name}</p>
                  <p className="text-xs text-gray-500">{c.phone}</p>
                </button>
                {user?.role === "admin" && (
                  <button
                    type="button"
                    onClick={() => deleteMut.mutate({ id: c.id })}
                    className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-600 transition-opacity"
                    title="Удалить контакт"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            ))}
          </div>

          {/* Add new contact */}
          <div className="border-t border-gray-100 p-3">
            {!showAdd ? (
              <button
                type="button"
                onClick={() => {
                  setNewPhone(value); // pre-fill with current input
                  setShowAdd(true);
                }}
                className="w-full flex items-center justify-center gap-2 py-2 rounded-xl border border-dashed border-gray-300 text-sm text-gray-500 hover:border-primary hover:text-primary transition-colors"
              >
                <Plus size={14} /> Сохранить новый контакт
              </button>
            ) : (
              <div className="space-y-2">
                <input
                  type="text"
                  placeholder="Имя продавца"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                  autoFocus
                />
                <input
                  type="text"
                  placeholder="Номер телефона"
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      if (!newName.trim() || !newPhone.trim()) {
                        toast.error("Введите имя и телефон");
                        return;
                      }
                      createMut.mutate({ name: newName.trim(), phone: newPhone.trim() });
                    }}
                    disabled={createMut.isPending}
                    className="flex-1 bg-primary text-white py-2 rounded-lg text-sm font-semibold hover:bg-primary/90 disabled:opacity-50 transition-colors"
                  >
                    {createMut.isPending ? "Сохраняем..." : "Сохранить"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowAdd(false)}
                    className="px-3 py-2 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50"
                  >
                    Отмена
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
