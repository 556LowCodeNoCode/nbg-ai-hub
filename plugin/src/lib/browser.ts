import open from "open";

export async function openInBrowser(url: string): Promise<void> {
  await open(url);
}

export async function probeUrl(url: string, timeoutMs = 2000): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const res = await fetch(url, {
      method: "HEAD",
      signal: controller.signal,
      redirect: "follow",
    });
    clearTimeout(timer);
    return res.ok || (res.status >= 200 && res.status < 400);
  } catch {
    return false;
  }
}
