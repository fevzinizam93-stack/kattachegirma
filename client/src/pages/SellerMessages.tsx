import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { useEffect, useRef, useState } from "react";
import { Link } from "wouter";
import { ArrowLeft, MessageSquare, Send, ShieldCheck } from "lucide-react";

export default function SellerMessages() {
  const { user, isAuthenticated } = useAuth();
  const [inputText, setInputText] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const utils = trpc.useUtils();

  // Access check: any authenticated user with a seller profile can access
  // (sellers may have role="user" if not updated at registration)
  // We rely on the backend to enforce access — just check isAuthenticated here
  const canAccess = isAuthenticated;

  const { data, isLoading, refetch } = trpc.messaging.sellerConversation.useQuery(undefined, {
    enabled: canAccess,
    refetchInterval: 10000, // poll every 10 seconds for new messages
  });

  const sendMutation = trpc.messaging.send.useMutation({
    onSuccess: () => {
      setInputText("");
      refetch();
    },
  });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [data?.messages]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || !data?.conversation) return;
    sendMutation.mutate({ conversationId: data.conversation.id, body: inputText.trim() });
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <MessageSquare size={48} className="text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500 mb-4">Войдите в систему для доступа к сообщениям</p>
          <Link href="/login" className="text-red-600 font-semibold hover:underline">Войти</Link>
        </div>
      </div>
    );
  }

  if (!canAccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <ShieldCheck size={48} className="text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">Этот раздел доступен только продавцам и администраторам</p>
        </div>
      </div>
    );
  }

  const messages = data?.messages ?? [];
  const hasConversation = !!data?.conversation;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <Link href="/seller/dashboard" className="text-gray-400 hover:text-gray-600 transition-colors">
            <ArrowLeft size={20} />
          </Link>
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-full bg-red-100 flex items-center justify-center">
              <ShieldCheck size={18} className="text-red-600" />
            </div>
            <div>
              <h1 className="text-base font-bold text-gray-900">Сообщения от администратора</h1>
              <p className="text-xs text-gray-500">Официальный канал связи</p>
            </div>
          </div>
        </div>

        {/* Chat area */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 flex flex-col" style={{ height: "calc(100vh - 200px)", minHeight: "400px" }}>
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {isLoading && (
              <div className="flex items-center justify-center h-full">
                <div className="w-6 h-6 border-2 border-red-300 border-t-red-600 rounded-full animate-spin" />
              </div>
            )}

            {!isLoading && !hasConversation && (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <MessageSquare size={48} className="text-gray-200 mb-3" />
                <p className="text-gray-400 text-sm font-medium">Нет сообщений</p>
                <p className="text-gray-300 text-xs mt-1">Администратор ещё не написал вам</p>
              </div>
            )}

            {messages.map((msg) => {
              const isOwn = msg.senderId === user?.id;
              return (
                <div key={msg.id} className={`flex ${isOwn ? "justify-end" : "justify-start"}`}>
                  {!isOwn && (
                    <div className="w-7 h-7 rounded-full bg-red-100 flex items-center justify-center mr-2 mt-1 shrink-0">
                      <ShieldCheck size={13} className="text-red-600" />
                    </div>
                  )}
                  <div
                    className={`max-w-[75%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                      isOwn
                        ? "bg-red-600 text-white rounded-br-sm"
                        : "bg-gray-100 text-gray-900 rounded-bl-sm"
                    }`}
                  >
                    <p>{msg.body}</p>
                    <p className={`text-[10px] mt-1 ${isOwn ? "text-red-200" : "text-gray-400"}`}>
                      {new Date(msg.createdAt).toLocaleString("ru-RU", {
                        day: "2-digit", month: "short",
                        hour: "2-digit", minute: "2-digit",
                      })}
                    </p>
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="border-t border-gray-100 p-3">
            {hasConversation ? (
              <form onSubmit={handleSend} className="flex items-center gap-2">
                <input
                  type="text"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder="Напишите ответ администратору..."
                  className="flex-1 px-4 py-2.5 rounded-full border border-gray-200 text-sm outline-none focus:border-red-400 transition-colors bg-gray-50"
                  maxLength={2000}
                />
                <button
                  type="submit"
                  disabled={!inputText.trim() || sendMutation.isPending}
                  className="w-10 h-10 rounded-full bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed text-white flex items-center justify-center transition-colors shrink-0"
                >
                  {sendMutation.isPending ? (
                    <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  ) : (
                    <Send size={16} />
                  )}
                </button>
              </form>
            ) : (
              <p className="text-center text-xs text-gray-400 py-2">
                Ответить можно только после того, как администратор напишет вам
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
