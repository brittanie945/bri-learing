import { Suspense } from "react";
import { ChatView } from "@/components/chat/chat-view";

export default function ChatSessionPage() {
  return (
    <Suspense fallback={null}>
      <ChatView />
    </Suspense>
  );
}
