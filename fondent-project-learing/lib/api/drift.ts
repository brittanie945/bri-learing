import { req } from "@/lib/api/request";

export interface BottleItem {
  id: string;
  content: string;
  is_picked: boolean;
  picked_at: string | null;
  created_at: string;
}

export interface BottleReply {
  id: string;
  bottle_id: string;
  content: string;
  created_at: string;
}

export interface BottleWithReplies extends BottleItem {
  replies: BottleReply[];
}

export const driftApi = {
  throw: (content: string) =>
    req<BottleItem>("/drift/throw", {
      method: "POST",
      body: JSON.stringify({ content }),
    }),

  pick: () => req<BottleWithReplies>("/drift/pick", { method: "POST" }),

  myBottles: () => req<BottleItem[]>("/drift/my"),

  getBottle: (id: string) => req<BottleWithReplies>(`/drift/${id}`),

  reply: (bottleId: string, content: string) =>
    req<BottleReply>(`/drift/${bottleId}/reply`, {
      method: "POST",
      body: JSON.stringify({ content }),
    }),
};
