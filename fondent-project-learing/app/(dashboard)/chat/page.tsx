import { Suspense } from "react";
import { ChatView } from "@/components/chat/chat-view";

export default function ChatPage() {
  return (
    <Suspense fallback={null}>
      <ChatView />
    </Suspense>
  );
}
