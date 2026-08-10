import { VERSES } from "../../docs/daily-verse-references-366";

export { VERSES };

type Verse = { reference: string; text: string; translation_name: string };

type BookCode = Record<string, string>;

const BOOK_CODES: BookCode = {
  Genesis: "GEN", Exodus: "EXO", Leviticus: "LEV", Numbers: "NUM", Deuteronomy: "DEU",
  Joshua: "JOS", Ruth: "RUT", "1 Samuel": "1SA", "2 Samuel": "2SA", "1 Kings": "1KI", "2 Kings": "2KI",
  "1 Chronicles": "1CH", "2 Chronicles": "2CH", Nehemiah: "NEH", Job: "JOB", Psalm: "PSA", Psalms: "PSA",
  Proverbs: "PRO", Ecclesiastes: "ECC", "Song of Solomon": "SNG", Isaiah: "ISA", Jeremiah: "JER",
  Lamentations: "LAM", Ezekiel: "EZK", Daniel: "DAN", Hosea: "HOS", Joel: "JOL", Amos: "AMO", Micah: "MIC",
  Nahum: "NAM", Habakkuk: "HAB", Zephaniah: "ZEP", Haggai: "HAG", Zechariah: "ZEC", Malachi: "MAL",
  Matthew: "MAT", Mark: "MRK", Luke: "LUK", John: "JHN", Acts: "ACT", Romans: "ROM",
  "1 Corinthians": "1CO", "2 Corinthians": "2CO", Galatians: "GAL", Ephesians: "EPH", Philippians: "PHP",
  Colossians: "COL", "1 Thessalonians": "1TH", "2 Thessalonians": "2TH", "1 Timothy": "1TI", "2 Timothy": "2TI",
  Titus: "TIT", Hebrews: "HEB", James: "JAS", "1 Peter": "1PE", "2 Peter": "2PE", "1 John": "1JN",
  Jude: "JUD", Revelation: "REV",
};

const FALLBACKS: Verse[] = [
  { reference: "Philippians 4:13", text: "I can do all things through Christ who gives me strength.", translation_name: "Berean Standard Bible" },
  { reference: "Psalm 23:1", text: "The LORD is my shepherd; I shall not want.", translation_name: "Berean Standard Bible" },
  { reference: "Isaiah 41:10", text: "Do not fear, for I am with you; do not be afraid, for I am your God. I will strengthen you; I will surely help you; I will uphold you with My righteous right hand.", translation_name: "Berean Standard Bible" },
  { reference: "Matthew 11:28", text: "Come to Me, all you who are weary and burdened, and I will give you rest.", translation_name: "Berean Standard Bible" },
];

function normalizeWhitespace(text: string) {
  return text.replace(/\s+/g, " ").trim();
}

function dayOfYear(date: Date) {
  const start = Date.UTC(date.getUTCFullYear(), 0, 1);
  const current = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
  return Math.floor((current - start) / 86400000) + 1;
}

export function pickReference(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Manila", year: "numeric", month: "numeric", day: "numeric" }).formatToParts(date);
  const year = Number(parts.find((part) => part.type === "year")?.value);
  const month = Number(parts.find((part) => part.type === "month")?.value) - 1;
  const day = Number(parts.find((part) => part.type === "day")?.value);
  return VERSES[dayOfYear(new Date(Date.UTC(year, month, day))) % VERSES.length];
}

function parseReference(reference: string) {
  const match = reference.match(/^(.+?)\s+(\d+):(\d+)(?:-(\d+))?$/);
  if (!match) throw new Error("Unsupported Bible reference");
  const [, book, chapter, start, end] = match;
  const code = BOOK_CODES[book];
  if (!code) throw new Error("Unsupported Bible book");
  return { code, chapter, start: Number(start), end: Number(end ?? start) };
}

function extractVerseText(content: unknown[]) {
  return content.map((item) => {
    if (typeof item === "string") return item;
    if (item && typeof item === "object" && "text" in item && typeof item.text === "string") return item.text;
    return "";
  }).join(" ");
}

export async function getDailyVerse(): Promise<Verse> {
  const reference = pickReference();
  try {
    const { code, chapter, start, end } = parseReference(reference);
    const response = await fetch(`https://bible.helloao.org/api/BSB/${code}/${chapter}.json`, { next: { revalidate: 86400 } });
    if (!response.ok) throw new Error(`Bible API returned ${response.status}`);
    const payload = await response.json() as { chapter?: { content?: Array<{ type?: string; number?: number; content?: unknown[] }> } };
    const verses = payload.chapter?.content?.filter((entry) => entry.type === "verse" && typeof entry.number === "number" && entry.number >= start && entry.number <= end) ?? [];
    const text = normalizeWhitespace(verses.map((verse) => extractVerseText(verse.content ?? [])).join(" "));
    if (!text) throw new Error("Bible API response was incomplete");
    return { reference, text, translation_name: "Berean Standard Bible" };
  } catch {
    return FALLBACKS[VERSES.indexOf(reference) % FALLBACKS.length];
  }
}
