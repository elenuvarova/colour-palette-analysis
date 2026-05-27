import type { ExtractParams, ExtractResponse } from "../types";

const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000"
).replace(/\/+$/, "");

/** Thrown for any non-2xx API response or transport error. */
export class ApiError extends Error {
  readonly status: number;
  constructor(message: string, status = 0) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

function paramsToFields(params: ExtractParams): Record<string, string> {
  return {
    limit: String(params.limit),
    tolerance: String(params.tolerance),
    mode: params.mode,
    ignore_alpha: String(params.ignore_alpha),
  };
}

async function parseResponse(res: Response): Promise<ExtractResponse> {
  if (!res.ok) {
    let detail = `Request failed (${res.status})`;
    try {
      const body = await res.json();
      if (body && typeof body.detail === "string") {
        detail = body.detail;
      } else if (Array.isArray(body?.detail) && body.detail[0]?.msg) {
        // FastAPI validation errors arrive as a list of {msg, loc, ...}.
        detail = body.detail[0].msg;
      }
    } catch {
      // Body was not JSON; keep the generic message.
    }
    throw new ApiError(detail, res.status);
  }
  return (await res.json()) as ExtractResponse;
}

export async function extractFromFile(
  file: File,
  params: ExtractParams,
): Promise<ExtractResponse> {
  const form = new FormData();
  form.append("file", file, file.name);
  for (const [key, value] of Object.entries(paramsToFields(params))) {
    form.append(key, value);
  }

  let res: Response;
  try {
    res = await fetch(`${API_BASE_URL}/api/extract`, {
      method: "POST",
      body: form,
    });
  } catch (err) {
    throw new ApiError(
      err instanceof Error
        ? `Could not reach the server: ${err.message}`
        : "Could not reach the server.",
    );
  }
  return parseResponse(res);
}

export async function extractFromUrl(
  url: string,
  params: ExtractParams,
): Promise<ExtractResponse> {
  let res: Response;
  try {
    res = await fetch(`${API_BASE_URL}/api/extract-url`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url, ...params }),
    });
  } catch (err) {
    throw new ApiError(
      err instanceof Error
        ? `Could not reach the server: ${err.message}`
        : "Could not reach the server.",
    );
  }
  return parseResponse(res);
}

export { API_BASE_URL };
