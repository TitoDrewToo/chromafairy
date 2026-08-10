import { getDailyVerse } from "../lib/daily-verse";
import DailyVerseFit from "./daily-verse-fit";

export default async function DailyVerse() {
  const verse = await getDailyVerse();
  return <DailyVerseFit reference={verse.reference} text={verse.text} />;
}
