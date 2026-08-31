/** Server-only helpers to pull a transcript from a YouTube video. */

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";

export function parseYoutubeId(input: string): string | null {
  const url = input.trim();
  const patterns = [
    /(?:youtube\.com\/watch\?[^#]*\bv=)([A-Za-z0-9_-]{11})/,
    /(?:youtu\.be\/)([A-Za-z0-9_-]{11})/,
    /(?:youtube\.com\/(?:embed|shorts|live|v)\/)([A-Za-z0-9_-]{11})/,
  ];
  for (const re of patterns) {
    const m = url.match(re);
    if (m?.[1]) return m[1];
  }
  if (/^[A-Za-z0-9_-]{11}$/.test(url)) return url;
  return null;
}

function decodeEntities(s: string) {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&#39;/g, "'")
    .replace(/&#34;|&quot;/g, '"')
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ")
    .replace(/&#(\d+);/g, (_, d: string) => String.fromCharCode(Number(d)));
}

type CaptionTrack = {
  baseUrl: string;
  languageCode?: string;
  kind?: string;
  name?: { simpleText?: string };
};

function extractJson<T>(html: string, key: string): T | null {
  const idx = html.indexOf(key);
  if (idx === -1) return null;
  // find the start of the value (array or object) after the key
  let i = html.indexOf(":", idx + key.length);
  if (i === -1) return null;
  i += 1;
  while (i < html.length && /\s/.test(html[i]!)) i++;
  const open = html[i];
  if (open !== "[" && open !== "{") return null;
  const close = open === "[" ? "]" : "}";
  let depth = 0;
  let inStr = false;
  let esc = false;
  for (let j = i; j < html.length; j++) {
    const ch = html[j]!;
    if (inStr) {
      if (esc) esc = false;
      else if (ch === "\\") esc = true;
      else if (ch === '"') inStr = false;
      continue;
    }
    if (ch === '"') inStr = true;
    else if (ch === open) depth++;
    else if (ch === close) {
      depth--;
      if (depth === 0) {
        try {
          return JSON.parse(html.slice(i, j + 1)) as T;
        } catch {
          return null;
        }
      }
    }
  }
  return null;
}

async function fetchTrackText(baseUrl: string): Promise<string> {
  const url = baseUrl.replace(/&amp;/g, "&");
  const res = await fetch(`${url}&fmt=json3`, { headers: { "User-Agent": UA } });
  if (res.ok) {
    const body = await res.text();
    try {
      const json = JSON.parse(body) as {
        events?: { segs?: { utf8?: string }[] }[];
      };
      const text = (json.events ?? [])
        .flatMap((e) => (e.segs ?? []).map((s) => s.utf8 ?? ""))
        .join("")
        .replace(/\n+/g, " ")
        .replace(/\s{2,}/g, " ")
        .trim();
      if (text) return text;
    } catch {
      /* fall through to XML */
    }
  }
  const xmlRes = await fetch(url, { headers: { "User-Agent": UA } });
  if (!xmlRes.ok) return "";
  const xml = await xmlRes.text();
  return [...xml.matchAll(/<text[^>]*>([\s\S]*?)<\/text>/g)]
    .map((m) => decodeEntities(m[1] ?? "").replace(/<[^>]+>/g, ""))
    .join(" ")
    .replace(/\s{2,}/g, " ")
    .trim();
}

export type YoutubeTranscript = { videoId: string; title: string; text: string };

/** Throws `youtube_invalid_url` or `youtube_no_captions` on failure. */
export async function fetchYoutubeTranscript(input: string): Promise<YoutubeTranscript> {
  const videoId = parseYoutubeId(input);
  if (!videoId) throw new Error("youtube_invalid_url");

  const res = await fetch(`https://www.youtube.com/watch?v=${videoId}&hl=en`, {
    headers: {
      "User-Agent": UA,
      "Accept-Language": "en-US,en;q=0.9,ar;q=0.8",
    },
  });
  if (!res.ok) throw new Error("youtube_fetch_failed");
  const html = await res.text();

  const titleMatch =
    html.match(/<meta\s+name="title"\s+content="([^"]*)"/) ??
    html.match(/<title>([^<]*)<\/title>/);
  const title = decodeEntities(titleMatch?.[1] ?? "").replace(/\s*-\s*YouTube$/, "").trim();

  const tracks = extractJson<CaptionTrack[]>(html, '"captionTracks"');
  if (!tracks || tracks.length === 0) throw new Error("youtube_no_captions");

  // Prefer Arabic, then English, then manual, then anything.
  const pick =
    tracks.find((tr) => tr.languageCode === "ar" && tr.kind !== "asr") ??
    tracks.find((tr) => tr.languageCode === "ar") ??
    tracks.find((tr) => tr.languageCode?.startsWith("en") && tr.kind !== "asr") ??
    tracks.find((tr) => tr.languageCode?.startsWith("en")) ??
    tracks.find((tr) => tr.kind !== "asr") ??
    tracks[0]!;

  const text = await fetchTrackText(pick.baseUrl);
  if (text.length < 40) throw new Error("youtube_no_captions");

  return { videoId, title: title || "YouTube", text: text.slice(0, 40000) };
}
