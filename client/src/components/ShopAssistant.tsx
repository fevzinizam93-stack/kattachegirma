import { useState, useRef, useEffect, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { X, Send, Loader2, Bot, ChevronDown, Sparkles } from "lucide-react";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface ViewedProduct {
  id: number;
  name: string;
  brand?: string | null;
  price: string;
  discount?: number | null;
  categoryId?: number;
  viewedAt?: number;
}

const STORAGE_KEY = "kc_recently_viewed";

function readViewedProducts(): ViewedProduct[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as ViewedProduct[];
  } catch {
    return [];
  }
}

const SUGGESTED_PROMPTS = [
  "Что у вас есть из бытовой техники?",
  "Какие товары сейчас со скидкой?",
  "Как оформить заказ?",
  "Есть ли доставка по Узбекистану?",
];

const PERSONALIZED_PROMPTS = [
  "Посоветуйте похожие товары",
  "Что лучше из просмотренного?",
  "Есть ли скидки на эти товары?",
  "Как оформить заказ?",
];

export function ShopAssistant() {
  const [isOpen, setIsOpen] = useState(false);

  // Read viewed products from localStorage once (stable reference)
  const viewedProducts = useMemo(() => readViewedProducts(), []);

  // Build personalized greeting based on viewed history
  const greeting = useMemo(() => {
    if (viewedProducts.length > 0) {
      const firstName = viewedProducts[0].name.split(" ").slice(0, 3).join(" ");
      return `Привет! 👋 Вижу, вы смотрели **${firstName}** и ещё ${viewedProducts.length > 1 ? `${viewedProducts.length - 1} товар(а)` : "другие товары"}. Могу подобрать похожие варианты или ответить на вопросы. Чем помочь?`;
    }
    return "Привет! 👋 Я помощник магазина **Katta Chegirma**. Помогу выбрать товар, расскажу о ценах и доставке. Чем могу помочь?";
  }, [viewedProducts]);

  const [messages, setMessages] = useState<Message[]>(() => [
    { role: "assistant", content: greeting },
  ]);
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [unread, setUnread] = useState(0);

  const chatMutation = trpc.ai.chat.useMutation();

  // Auto-scroll to bottom
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isOpen]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
      setUnread(0);
    }
  }, [isOpen]);

  const sendMessage = async (text: string) => {
    if (!text.trim() || chatMutation.isPending) return;

    const userMsg: Message = { role: "user", content: text.trim() };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");

    try {
      const result = await chatMutation.mutateAsync({
        messages: newMessages.slice(-10).map((m) => ({ role: m.role, content: String(m.content) })),
        // Pass viewed products for personalization
        viewedProducts: viewedProducts.length > 0
          ? viewedProducts.slice(0, 10).map((p) => ({
              id: p.id,
              name: p.name,
              brand: p.brand ?? null,
              price: p.price,
              discount: p.discount ?? null,
              categoryId: p.categoryId,
              viewedAt: p.viewedAt,
            }))
          : undefined,
      });
      const assistantMsg: Message = {
        role: "assistant",
        content: String(result.reply ?? ""),
      };
      setMessages((prev) => [...prev, assistantMsg]);
      if (!isOpen) setUnread((n) => n + 1);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Извините, произошла ошибка. Попробуйте ещё раз или позвоните нам.",
        },
      ]);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  // Simple markdown: bold **text** and line breaks
  const renderContent = (text: string) => {
    const parts = text.split(/(\*\*[^*]+\*\*)/g);
    return parts.map((part, i) => {
      if (part.startsWith("**") && part.endsWith("**")) {
        return <strong key={i}>{part.slice(2, -2)}</strong>;
      }
      return (
        <span key={i}>
          {part.split("\n").map((line, j, arr) => (
            <span key={j}>
              {line}
              {j < arr.length - 1 && <br />}
            </span>
          ))}
        </span>
      );
    });
  };

  // Choose prompts based on whether user has viewed products
  const prompts = viewedProducts.length > 0 ? PERSONALIZED_PROMPTS : SUGGESTED_PROMPTS;

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setIsOpen((v) => !v)}
        className="fixed bottom-20 right-4 md:bottom-6 md:right-6 z-50 w-14 h-14 rounded-full bg-red-600 text-white shadow-lg hover:bg-red-700 active:scale-95 transition-all flex items-center justify-center"
        aria-label="Открыть AI-помощника"
      >
        {isOpen ? (
          <ChevronDown className="w-6 h-6" />
        ) : (
          <div className="relative">
            <Bot className="w-7 h-7" />
            {unread > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-yellow-400 text-black text-[10px] font-bold rounded-full flex items-center justify-center">
                {unread}
              </span>
            )}
          </div>
        )}
      </button>

      {/* Chat window */}
      {isOpen && (
        <div
          className="fixed bottom-36 right-4 md:bottom-24 md:right-6 z-50 w-[340px] max-w-[calc(100vw-2rem)] bg-white rounded-2xl shadow-2xl border border-gray-200 flex flex-col overflow-hidden"
          style={{ height: "480px" }}
        >
          {/* Header */}
          <div className="bg-red-600 text-white px-4 py-3 flex items-center gap-2 flex-shrink-0">
            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
              <Sparkles className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-sm">AI-помощник</div>
              <div className="text-xs text-red-100">
                {viewedProducts.length > 0
                  ? `Знаю ваши предпочтения (${viewedProducts.length} товаров)`
                  : "Katta Chegirma"}
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="w-7 h-7 rounded-full hover:bg-white/20 flex items-center justify-center transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3 bg-gray-50">
            {messages.map((msg, i) => (
              <div
                key={i}
                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                {msg.role === "assistant" && (
                  <div className="w-6 h-6 rounded-full bg-red-600 flex items-center justify-center flex-shrink-0 mt-1 mr-2">
                    <Bot className="w-3 h-3 text-white" />
                  </div>
                )}
                <div
                  className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm leading-relaxed ${
                    msg.role === "user"
                      ? "bg-red-600 text-white rounded-br-sm"
                      : "bg-white text-gray-800 shadow-sm border border-gray-100 rounded-bl-sm"
                  }`}
                >
                  {renderContent(msg.content)}
                </div>
              </div>
            ))}

            {/* Loading indicator */}
            {chatMutation.isPending && (
              <div className="flex justify-start">
                <div className="w-6 h-6 rounded-full bg-red-600 flex items-center justify-center flex-shrink-0 mt-1 mr-2">
                  <Bot className="w-3 h-3 text-white" />
                </div>
                <div className="bg-white rounded-2xl rounded-bl-sm px-3 py-2 shadow-sm border border-gray-100">
                  <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
                </div>
              </div>
            )}

            {/* Suggested prompts — show only at start */}
            {messages.length === 1 && !chatMutation.isPending && (
              <div className="space-y-1.5 pt-1">
                {prompts.map((prompt) => (
                  <button
                    key={prompt}
                    onClick={() => sendMessage(prompt)}
                    className="w-full text-left text-xs bg-white border border-gray-200 rounded-xl px-3 py-2 hover:border-red-400 hover:bg-red-50 transition-colors text-gray-700"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="px-3 py-2 border-t border-gray-100 bg-white flex-shrink-0">
            <div className="flex items-end gap-2">
              <Textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Написать сообщение..."
                className="flex-1 resize-none text-sm min-h-[36px] max-h-[100px] border-gray-200 rounded-xl focus:border-red-400 focus:ring-red-400"
                rows={1}
                disabled={chatMutation.isPending}
              />
              <Button
                size="icon"
                onClick={() => sendMessage(input)}
                disabled={!input.trim() || chatMutation.isPending}
                className="w-9 h-9 rounded-xl bg-red-600 hover:bg-red-700 flex-shrink-0"
              >
                {chatMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </Button>
            </div>
            <p className="text-[10px] text-gray-400 text-center mt-1">
              Enter — отправить · Shift+Enter — новая строка
            </p>
          </div>
        </div>
      )}
    </>
  );
}
