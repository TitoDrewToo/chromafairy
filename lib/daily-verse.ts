export const VERSES = [
  "John 3:16", "Jeremiah 29:11", "Philippians 4:13", "Philippians 4:6-7", "Psalm 23:1-4", "Proverbs 3:5-6",
  "Isaiah 40:31", "Isaiah 41:10", "Romans 8:28", "Psalm 46:1", "Psalm 118:24", "Joshua 1:9", "Matthew 6:33",
  "Matthew 11:28", "2 Corinthians 5:7", "2 Corinthians 12:9", "Galatians 5:22-23", "Ephesians 2:8-9",
  "Hebrews 11:1", "Hebrews 12:1-2", "1 Corinthians 13:4-7", "1 Corinthians 10:13", "Psalm 27:1", "Psalm 37:4",
  "Psalm 91:1-2", "Psalm 121:1-2", "Psalm 139:14", "Proverbs 16:3", "Proverbs 18:10", "Isaiah 26:3",
  "Isaiah 43:2", "Lamentations 3:22-23", "Zephaniah 3:17", "Matthew 7:7", "Mark 10:27", "Luke 1:37",
  "John 14:27", "John 16:33", "Romans 5:3-5", "Romans 12:12", "Romans 15:13", "2 Corinthians 4:16-18",
  "2 Corinthians 9:8", "Galatians 6:9", "Ephesians 3:20", "Philippians 1:6", "Philippians 4:8",
  "Colossians 3:23", "1 Thessalonians 5:16-18", "2 Timothy 1:7", "Hebrews 13:5", "James 1:2-3", "James 1:5",
  "1 Peter 5:7", "1 John 4:18", "Psalm 16:11", "Psalm 28:7", "Psalm 30:5", "Psalm 34:8", "Psalm 34:18",
  "Psalm 42:11", "Psalm 55:22", "Psalm 56:3", "Psalm 62:1-2", "Psalm 73:26", "Psalm 94:19", "Psalm 119:105",
  "Psalm 143:8", "Psalm 147:3", "Proverbs 4:23", "Proverbs 17:22", "Proverbs 31:25", "Isaiah 12:2",
  "Isaiah 30:15", "Isaiah 40:29", "Isaiah 54:10", "Isaiah 58:11", "Jeremiah 17:7-8", "Jeremiah 31:3",
  "Micah 6:8", "Nahum 1:7", "Habakkuk 3:19", "Matthew 19:26", "Matthew 28:20", "John 1:5", "John 8:12",
  "John 15:5", "Romans 8:38-39", "1 Corinthians 2:9", "1 Corinthians 15:58", "2 Corinthians 1:3-4",
  "2 Corinthians 3:17", "Ephesians 6:10", "Philippians 2:3-4", "Colossians 2:6-7", "Hebrews 4:16",
  "Hebrews 10:23", "James 4:8", "1 Peter 4:10", "1 Peter 5:10", "1 John 1:9", "Revelation 21:4",
  "Numbers 6:24-26", "Deuteronomy 31:6", "1 Chronicles 16:11", "Nehemiah 8:10", "Psalm 9:9-10",
] as const;

type Verse = { reference: string; text: string; translation_name: string };

const FALLBACKS: Verse[] = [
  { reference: "Philippians 4:13", text: "I can do all things through Christ, who strengthens me.", translation_name: "World English Bible" },
  { reference: "Psalm 23:1", text: "Yahweh is my shepherd: I shall lack nothing.", translation_name: "World English Bible" },
  { reference: "Isaiah 41:10", text: "Don’t be afraid, for I am with you. Don’t be dismayed, for I am your God. I will strengthen you. Yes, I will help you. Yes, I will uphold you with the right hand of my righteousness.", translation_name: "World English Bible" },
  { reference: "Matthew 11:28", text: "Come to me, all you who labor and are heavily burdened, and I will give you rest.", translation_name: "World English Bible" },
];

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

export async function getDailyVerse(): Promise<Verse> {
  const reference = pickReference();
  try {
    const response = await fetch(`https://bible-api.com/${encodeURIComponent(reference)}?translation=web`, { next: { revalidate: 86400 } });
    if (!response.ok) throw new Error(`Bible API returned ${response.status}`);
    const verse = await response.json() as Partial<Verse>;
    if (!verse.text || !verse.reference) throw new Error("Bible API response was incomplete");
    return { reference: verse.reference, text: verse.text.trim(), translation_name: verse.translation_name || "World English Bible" };
  } catch {
    return FALLBACKS[VERSES.indexOf(reference) % FALLBACKS.length];
  }
}
