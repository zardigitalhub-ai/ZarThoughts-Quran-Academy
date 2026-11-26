import { ALL_SURAHS, OFFLINE_SURAH_DATA } from '../data/quranMetadata';
import { AyahData, WordToken } from '../types/academy';

export interface ReciterOption {
  id: string;
  name: string;
  folder: string;
}

export const RECITERS: ReciterOption[] = [
  { id: 'alafasy', name: 'Mishary Rashid Alafasy', folder: 'Alafasy_128kbps' },
  { id: 'abdulbasit', name: 'Abdul Basit (Murattal)', folder: 'Abdul_Basit_Murattal_192kbps' },
  { id: 'husary', name: 'Mahmoud Khalil Al-Husary', folder: 'Husary_128kbps' },
];

const CACHE_PREFIX = 'zarthoughts_surah_v1_';

export function getAyahAudioUrl(
  surahNumber: number,
  ayahNumber: number,
  reciterFolder = 'Alafasy_128kbps'
): string {
  const s = String(surahNumber).padStart(3, '0');
  const a = String(ayahNumber).padStart(3, '0');
  return `https://everyayah.com/data/${reciterFolder}/${s}${a}.mp3`;
}

function buildFallbackWords(arabicText: string): WordToken[] {
  const tokens = arabicText.trim().split(/\s+/).filter(Boolean);
  return tokens.map((word, idx) => ({
    position: idx + 1,
    arabic: word,
    transliteration: '',
    english: 'Tap Tafseer or load full word index',
    urdu: '',
  }));
}

export function isSurahCached(surahNumber: number): boolean {
  try {
    return Boolean(localStorage.getItem(`${CACHE_PREFIX}${surahNumber}`));
  } catch {
    return false;
  }
}

export async function fetchSurahWithTranslations(surahNumber: number): Promise<AyahData[]> {
  // Return cached surah immediately if available
  try {
    const cached = localStorage.getItem(`${CACHE_PREFIX}${surahNumber}`);
    if (cached) {
      const parsed = JSON.parse(cached) as AyahData[];
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch {
    // Ignore storage read errors
  }

  try {
    // Fetch Arabic Uthmani, English Sahih International, and Urdu Jalandhry in parallel
    const [editionsRes, wordsRes] = await Promise.allSettled([
      fetch(
        `https://api.alquran.cloud/v1/surah/${surahNumber}/editions/quran-uthmani,en.sahih,ur.jalandhry`
      ),
      fetch(
        `https://api.quran.com/api/v4/verses/by_chapter/${surahNumber}?language=en&words=true&word_fields=text_uthmani,transliteration&per_page=300`
      ),
    ]);

    if (editionsRes.status !== 'fulfilled' || !editionsRes.value.ok) {
      throw new Error('Unable to reach Quran edition API');
    }

    const editionsJson = await editionsRes.value.json();
    const editions = editionsJson?.data;
    if (!Array.isArray(editions) || editions.length < 3) {
      throw new Error('Unexpected Quran API response structure');
    }

    const arabicAyahs = editions[0].ayahs as Array<{
      number: number;
      numberInSurah: number;
      text: string;
      juz: number;
      page: number;
    }>;
    const englishAyahs = editions[1].ayahs as Array<{ text: string }>;
    const urduAyahs = editions[2].ayahs as Array<{ text: string }>;

    let wordMap: Record<number, WordToken[]> = {};
    if (wordsRes.status === 'fulfilled' && wordsRes.value.ok) {
      try {
        const wordsJson = await wordsRes.value.json();
        const verses = wordsJson?.verses as Array<{
          verse_number: number;
          words?: Array<{
            position: number;
            char_type_name?: string;
            text_uthmani?: string;
            transliteration?: { text?: string };
            translation?: { text?: string };
          }>;
        }>;
        if (Array.isArray(verses)) {
          for (const v of verses) {
            const list = (v.words || [])
              .filter((w) => w.char_type_name !== 'end')
              .map((w) => ({
                position: w.position,
                arabic: w.text_uthmani || '',
                transliteration: w.transliteration?.text || '',
                english: w.translation?.text || '',
                urdu: '',
              }));
            wordMap[v.verse_number] = list;
          }
        }
      } catch {
        // Fallback to local tokenization
      }
    }

    const offlineSeed = OFFLINE_SURAH_DATA[surahNumber];
    const result: AyahData[] = arabicAyahs.map((ayah, idx) => {
      const seedAyah = offlineSeed?.find((s) => s.numberInSurah === ayah.numberInSurah);
      return {
        numberInSurah: ayah.numberInSurah,
        globalNumber: ayah.number,
        juz: ayah.juz,
        page: ayah.page,
        arabicText: ayah.text,
        englishText: englishAyahs[idx]?.text || seedAyah?.englishText || '',
        urduText: urduAyahs[idx]?.text || seedAyah?.urduText || '',
        englishTafseer: seedAyah?.englishTafseer,
        urduTafseer: seedAyah?.urduTafseer,
        words:
          wordMap[ayah.numberInSurah]?.length
            ? wordMap[ayah.numberInSurah]
            : seedAyah?.words || buildFallbackWords(ayah.text),
      };
    });

    try {
      localStorage.setItem(`${CACHE_PREFIX}${surahNumber}`, JSON.stringify(result));
    } catch {
      // Ignore quota exceeded
    }

    return result;
  } catch (err) {
    if (OFFLINE_SURAH_DATA[surahNumber]) {
      return OFFLINE_SURAH_DATA[surahNumber];
    }
    throw err;
  }
}

export async function fetchAyahTafseer(
  surahNumber: number,
  ayahNumber: number,
  lang: 'en' | 'ur'
): Promise<string> {
  const seed = OFFLINE_SURAH_DATA[surahNumber]?.find((a) => a.numberInSurah === ayahNumber);
  if (lang === 'en' && seed?.englishTafseer) return seed.englishTafseer;
  if (lang === 'ur' && seed?.urduTafseer) return seed.urduTafseer;

  const surahMeta = ALL_SURAHS.find((s) => s.number === surahNumber);
  const tafsirId = lang === 'en' ? 169 : 159; // 169: Ibn Kathir English, 159: Bayan-ul-Quran Urdu
  try {
    const res = await fetch(
      `https://api.quran.com/api/v4/tafsirs/${tafsirId}/by_ayah/${surahNumber}:${ayahNumber}`
    );
    if (res.ok) {
      const data = await res.json();
      const rawHtml: string = data?.tafsir?.text || '';
      const plain = rawHtml.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
      if (plain.length > 20) {
        return plain.slice(0, 1400) + (plain.length > 1400 ? '...' : '');
      }
    }
  } catch {
    // Fall back gracefully below
  }

  return lang === 'en'
    ? `Tafseer reflection for Surah ${surahMeta?.transliteration || surahNumber}, Ayah ${ayahNumber}: Contemplate the Arabic roots and divine guidance emphasized in this ${surahMeta?.revelationType || ''} passage.`
    : `سورۃ ${surahMeta?.arabicName || surahNumber} آیت ${ayahNumber} کی تفسیر: اس آیت میں اللہ تعالیٰ کی ہدایت، حکمت اور بندگی کے تقاضوں پر غور و فکر کی دعوت دی گئی ہے۔`;
}

export async function resolveSurahByPage(pageNumber: number): Promise<{
  surahNumber: number;
  ayahNumber: number;
}> {
  const clamped = Math.max(1, Math.min(604, pageNumber));
  try {
    const res = await fetch(`https://api.alquran.cloud/v1/page/${clamped}/quran-uthmani`);
    if (res.ok) {
      const json = await res.json();
      const firstAyah = json?.data?.ayahs?.[0];
      if (firstAyah?.surah?.number) {
        return {
          surahNumber: firstAyah.surah.number,
          ayahNumber: firstAyah.numberInSurah || 1,
        };
      }
    }
  } catch {
    // Fallback to nearest metadata pageStart
  }
  let best = ALL_SURAHS[0];
  for (const s of ALL_SURAHS) {
    if (s.pageStart <= clamped) best = s;
  }
  return { surahNumber: best.number, ayahNumber: 1 };
}
