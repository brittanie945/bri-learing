/**
 * AI SDK Data Stream Protocol 适配层
 *
 * 接收 useChat (DefaultChatTransport) 发来的请求，
 * 转发至 Python 后端，将自定义 SSE 格式转换为 AI SDK Data Stream Protocol。
 */

const BACKEND = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

/** 后端 SSE 事件类型 */
type BackendSSE =
  | { type: "chunk"; content: string }
  | { type: "refs"; ids: number[] }
  | { type: "diary_saved"; diary_id?: string; title: string }
  | { type: "done" }
  | { type: "error"; message: string };

function encodeSSE(chunk: unknown): Uint8Array {
  const encoder = new TextEncoder();
  return encoder.encode(`data: ${JSON.stringify(chunk)}\n\n`);
}

/**
 * 将后端 SSE 流转换为 AI SDK Data Stream Protocol
 *
 * 由于后端 LLM 目前不是真正流式（stream=False），整个响应会在一个 chunk 中到达。
 * 我们将其按字符拆分以模拟打字机效果，同时保持协议的完整性。
 */
function transformBackendToAISDK(
  backendStream: ReadableStream<Uint8Array>,
  signal?: AbortSignal,
): ReadableStream<Uint8Array> {
  let buffer = "";
  const decoder = new TextDecoder();
  const messageId = `msg_${Date.now()}`;
  const textId = `txt_${Date.now()}`;
  let textStarted = false;
  let diaryToolCallId: string | null = null;

  return new ReadableStream({
    async start(controller) {
      // 发送 start 事件
      controller.enqueue(encodeSSE({ type: "start", messageId }));

      const reader = backendStream.getReader();

      try {
        while (true) {
          if (signal?.aborted) {
            controller.enqueue(encodeSSE({ type: "abort" }));
            controller.close();
            return;
          }

          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";

          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            const jsonStr = line.slice(6);

            let evt: BackendSSE;
            try {
              evt = JSON.parse(jsonStr);
            } catch {
              continue; // 跳过解析失败的行
            }

            switch (evt.type) {
              case "chunk": {
                // 开始文本块
                if (!textStarted) {
                  controller.enqueue(encodeSSE({ type: "text-start", id: textId }));
                  textStarted = true;
                }

                // 将内容按字符拆分，模拟打字机效果
                // 每批发送 1~3 个字符，避免一次性全部到达
                const content = evt.content;
                for (let i = 0; i < content.length; i += 2) {
                  if (signal?.aborted) break;
                  const delta = content.slice(i, i + 2);
                  controller.enqueue(
                    encodeSSE({ type: "text-delta", id: textId, delta }),
                  );
                  // 微小的延迟让 UI 有时间渲染
                  await sleep(15);
                }
                break;
              }
              case "refs": {
                // [REF:N] 已经包含在 chunk 内容中，这里不需要额外处理
                // ref_ids 仅在后端数据库中做关联
                break;
              }
              case "diary_saved": {
                // 结束前面的文本流（如果有）
                if (textStarted) {
                  controller.enqueue(encodeSSE({ type: "text-end", id: textId }));
                }

                // 发送 write_diary 工具调用事件
                diaryToolCallId = `call_${Date.now()}`;
                const input = {
                  title: evt.title,
                  diary_id: evt.diary_id || "",
                };

                controller.enqueue(
                  encodeSSE({
                    type: "tool-input-start",
                    toolCallId: diaryToolCallId,
                    toolName: "write_diary",
                  }),
                );
                controller.enqueue(
                  encodeSSE({
                    type: "tool-input-delta",
                    toolCallId: diaryToolCallId,
                    inputTextDelta: JSON.stringify(input),
                  }),
                );
                controller.enqueue(
                  encodeSSE({
                    type: "tool-input-available",
                    toolCallId: diaryToolCallId,
                    toolName: "write_diary",
                    input,
                  }),
                );
                // 工具执行结果（已经在服务端完成）
                controller.enqueue(
                  encodeSSE({
                    type: "tool-output-available",
                    toolCallId: diaryToolCallId,
                    output: {
                      diary_id: evt.diary_id || "",
                      title: evt.title,
                    },
                  }),
                );
                break;
              }
              case "done": {
                // 结束文本流
                if (textStarted) {
                  controller.enqueue(encodeSSE({ type: "text-end", id: textId }));
                }
                controller.enqueue(
                  encodeSSE({
                    type: "finish",
                    finishReason: diaryToolCallId ? "tool-calls" : "stop",
                  }),
                );
                break;
              }
              case "error": {
                controller.enqueue(
                  encodeSSE({ type: "error", errorText: evt.message }),
                );
                controller.close();
                return;
              }
            }
          }
        }
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") {
          controller.enqueue(encodeSSE({ type: "abort" }));
        } else {
          controller.enqueue(
            encodeSSE({
              type: "error",
              errorText: err instanceof Error ? err.message : "Stream error",
            }),
          );
        }
      } finally {
        reader.releaseLock();
        controller.close();
      }
    },
  });
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ sessionId: string }> },
) {
  const { sessionId } = await params;
  const body = await req.json();

  // 提取最后一条用户消息（因为后端已有完整历史记录）
  // AI SDK 消息使用 parts 数组格式，需从中提取文本内容
  const messages = body.messages as Array<{
    role: string;
    content?: string;
    parts?: Array<{ type: string; text?: string }>;
  }> | undefined;
  const lastUserMsg = messages
    ? [...messages].reverse().find((m) => m.role === "user")
    : null;
  if (!lastUserMsg) {
    return Response.json({ error: "No user message" }, { status: 400 });
  }

  // 优先从 parts 中提取文本，兼容 content 字段
  const userText =
    lastUserMsg.content ??
    lastUserMsg.parts?.find((p) => p.type === "text")?.text ??
    "";
  if (!userText) {
    return Response.json({ error: "Empty user message" }, { status: 400 });
  }

  // 转发至 Python 后端
  const authHeader = req.headers.get("Authorization") || "";
  const backendRes = await fetch(
    `${BACKEND}/chat/sessions/${sessionId}/messages`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(authHeader ? { Authorization: authHeader } : {}),
      },
      body: JSON.stringify({ content: userText }),
    },
  );

  if (backendRes.status === 401) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!backendRes.ok) {
    let errorText = "Backend error";
    try {
      const errBody = await backendRes.text();
      errorText = errBody || `Backend returned ${backendRes.status}`;
    } catch {
      // ignore
    }
    return Response.json({ error: errorText }, { status: backendRes.status });
  }

  if (!backendRes.body) {
    return Response.json({ error: "Empty response body" }, { status: 500 });
  }

  // 转换 SSE 格式
  const transformed = transformBackendToAISDK(
    backendRes.body,
    req.signal,
  );

  return new Response(transformed, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
