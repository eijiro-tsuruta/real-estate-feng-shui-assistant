type InputImage = { bytes: Uint8Array; mediaType: string; label: string };
type InputContent =
  | { type: "input_text"; text: string }
  | { type: "input_image"; image_url: string };

export async function requestOpenAIImageEdit(args: {
  prompt: string;
  images: InputImage[];
}): Promise<{ bytes: Uint8Array; mediaType: "image/jpeg" }> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY is not configured.");
  const content: InputContent[] = args.images.flatMap((image) => [
    { type: "input_text" as const, text: image.label },
    {
      type: "input_image" as const,
      image_url: `data:${image.mediaType};base64,${Buffer.from(image.bytes).toString("base64")}`,
    },
  ]);
  content.push({ type: "input_text", text: args.prompt });
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: process.env.OPENAI_IMAGE_ORCHESTRATOR_MODEL ?? "gpt-4.1",
      tools: [
        {
          type: "image_generation",
          action: "edit",
          model: process.env.OPENAI_IMAGE_MODEL ?? "gpt-image-1.5",
          input_fidelity: "high",
          quality: "medium",
          output_format: "jpeg",
          size: "auto",
        },
      ],
      tool_choice: { type: "image_generation" },
      input: [{ role: "user", content }],
    }),
    signal: AbortSignal.timeout(240_000),
  });
  if (!response.ok) {
    throw new Error(`OpenAI image edit failed with ${response.status}.`);
  }
  const data = (await response.json()) as {
    output?: Array<{ type?: string; result?: string }>;
  };
  const result = data.output?.find(
    (item) => item.type === "image_generation_call",
  )?.result;
  if (!result) throw new Error("OpenAI image edit returned no image.");
  return { bytes: Uint8Array.from(Buffer.from(result, "base64")), mediaType: "image/jpeg" };
}
