import React, { useEffect, useRef, useState } from 'react';
import {
  Bookmark,
  BookOpen,
  Check,
  ChevronLeft,
  ChevronRight,
  DownloadCloud,
  Languages,
  Layers,
  Pause,
  Play,
  Repeat,
  RotateCcw,
  Search,
  SkipBack,
  SkipForward,
  Volume2,
} from 'lucide-react';
import { ALL_JUZ, ALL_SURAHS } from '../data/quranMetadata';
import {
  fetchAyahTafseer,
  fetchSurahWithTranslations,
  getAyahAudioUrl,
  isSurahCached,
  RECITERS,
  resolveSurahByPage,
} from '../services/quranService';
import { AyahData, MAX_LENGTHS } from '../types/academy';
import { useAuth } from '../context/AuthContext';
import { doc, serverTimestamp, setDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';

export const QuranReader: React.FC<{
  onNavigateAuth?: () => void;
}> = ({ onNavigateAuth }) => {
  const { firebaseUser, quranProgress } = useAuth();

  const [selectedSurah, setSelectedSurah] = useState<number>(1);
  const [ayahs, setAyahs] = useState<AyahData[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [cachedOffline, setCachedOffline] = useState<boolean>(false);

  // Navigation panels
  const [navMode, setNavMode] = useState<'surah' | 'juz' | 'page'>('surah');
  const [surahSearch, setSurahSearch] = useState('');
  const [pageInput, setPageInput] = useState('1');
  const [targetAyahScroll, setTargetAyahScroll] = useState<number | null>(null);

  // Reading preferences
  const [showArabic, setShowArabic] = useState(true);
  const [showEnglish, setShowEnglish] = useState(true);
  const [showUrdu, setShowUrdu] = useState(true);
  const [showWordByWord, setShowWordByWord] = useState(false);
  const [arabicScale, setArabicScale] = useState<number>(30);

  // Tafseer drawer per Ayah
  const [openTafseer, setOpenTafseer] = useState<{
    ayah: number;
    lang: 'en' | 'ur';
    text: string;
    loading: boolean;
  } | null>(null);

  // Bookmark note modal/inline
  const [editingNoteAyah, setEditingNoteAyah] = useState<number | null>(null);
  const [noteDraft, setNoteDraft] = useState('');
  const [bookmarkFeedback, setBookmarkFeedback] = useState<string | null>(null);

  // Audio player state
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [reciterFolder, setReciterFolder] = useState(RECITERS[0].folder);
  const [currentAyahIndex, setCurrentAyahIndex] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [ayahRepeatTarget, setAyahRepeatTarget] = useState<number>(1); // 1, 3, 5, or 999 (infinite)
  const [ayahRepeatDone, setAyahRepeatDone] = useState<number>(0);
  const [surahRepeat, setSurahRepeat] = useState<boolean>(false);
  const [playbackRate, setPlaybackRate] = useState<number>(1);

  const surahMeta = ALL_SURAHS.find((s) => s.number === selectedSurah) || ALL_SURAHS[0];

  // Load Surah content
  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    setOpenTafseer(null);
    setIsPlaying(false);
    if (audioRef.current) {
      audioRef.current.pause();
    }

    fetchSurahWithTranslations(selectedSurah)
      .then((data) => {
        if (!active) return;
        setAyahs(data);
        setCachedOffline(isSurahCached(selectedSurah));
        setCurrentAyahIndex(0);
        setAyahRepeatDone(0);
        if (data[0]) {
          setPageInput(String(data[0].page));
        }
        setLoading(false);
      })
      .catch((err) => {
        if (!active) return;
        setError(err instanceof Error ? err.message : 'Unable to load Surah text.');
        setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [selectedSurah]);

  // Scroll to target Ayah when jumping by Juz or Page
  useEffect(() => {
    if (!loading && targetAyahScroll && ayahs.length > 0) {
      const idx = ayahs.findIndex((a) => a.numberInSurah === targetAyahScroll);
      if (idx >= 0) {
        setCurrentAyahIndex(idx);
        const el = document.getElementById(`ayah-${selectedSurah}-${targetAyahScroll}`);
        el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      setTargetAyahScroll(null);
    }
  }, [loading, targetAyahScroll, ayahs, selectedSurah]);

  // Manage HTMLAudioElement playback
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.playbackRate = playbackRate;
  }, [playbackRate]);

  const playAyahAtIndex = (index: number) => {
    const ayah = ayahs[index];
    if (!ayah || !audioRef.current) return;
    setCurrentAyahIndex(index);
    const url = getAyahAudioUrl(selectedSurah, ayah.numberInSurah, reciterFolder);
    if (audioRef.current.src !== url) {
      audioRef.current.src = url;
    }
    audioRef.current.playbackRate = playbackRate;
    audioRef.current
      .play()
      .then(() => setIsPlaying(true))
      .catch(() => setIsPlaying(false));

    const el = document.getElementById(`ayah-${selectedSurah}-${ayah.numberInSurah}`);
    el?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  };

  const togglePlayPause = () => {
    if (!audioRef.current || ayahs.length === 0) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      playAyahAtIndex(currentAyahIndex);
    }
  };

  const handleAudioEnded = () => {
    const nextRepeat = ayahRepeatDone + 1;
    if (ayahRepeatTarget === 999 || nextRepeat < ayahRepeatTarget) {
      setAyahRepeatDone(nextRepeat);
      if (audioRef.current) {
        audioRef.current.currentTime = 0;
        void audioRef.current.play();
      }
      return;
    }

    setAyahRepeatDone(0);
    if (currentAyahIndex + 1 < ayahs.length) {
      playAyahAtIndex(currentAyahIndex + 1);
    } else if (surahRepeat) {
      playAyahAtIndex(0);
    } else if (selectedSurah < 114) {
      setIsPlaying(false);
    } else {
      setIsPlaying(false);
    }
  };

  // Switch reciter cleanly while paused/playing
  useEffect(() => {
    if (isPlaying && ayahs[currentAyahIndex]) {
      playAyahAtIndex(currentAyahIndex);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reciterFolder]);

  const handleOpenTafseer = async (ayahNum: number, lang: 'en' | 'ur') => {
    if (openTafseer && openTafseer.ayah === ayahNum && openTafseer.lang === lang) {
      setOpenTafseer(null);
      return;
    }
    setOpenTafseer({ ayah: ayahNum, lang, text: '', loading: true });
    const commentary = await fetchAyahTafseer(selectedSurah, ayahNum, lang);
    setOpenTafseer({ ayah: ayahNum, lang, text: commentary, loading: false });
  };

  const handleJumpToPage = async (e: React.FormEvent) => {
    e.preventDefault();
    const num = Number(pageInput);
    if (!Number.isFinite(num) || num < 1 || num > 604) return;
    const target = await resolveSurahByPage(num);
    if (target.surahNumber === selectedSurah) {
      setTargetAyahScroll(target.ayahNumber);
    } else {
      setTargetAyahScroll(target.ayahNumber);
      setSelectedSurah(target.surahNumber);
    }
  };

  const handleSaveBookmark = async (ayah: AyahData, noteText?: string) => {
    if (!firebaseUser) {
      onNavigateAuth?.();
      return;
    }
    if (!firebaseUser.emailVerified) {
      setBookmarkFeedback('Verify your email in the Account Portal to save cloud bookmarks.');
      return;
    }
    const docId = `${firebaseUser.uid}_${selectedSurah}_${ayah.numberInSurah}`;
    try {
      await setDoc(doc(db, 'quran_progress', docId), {
        userId: firebaseUser.uid,
        surahNumber: selectedSurah,
        surahName: surahMeta.transliteration,
        ayahNumber: ayah.numberInSurah,
        juzNumber: ayah.juz,
        pageNumber: ayah.page,
        note: (noteText || '').trim().slice(0, MAX_LENGTHS.note),
        isBookmark: true,
        updatedAt: serverTimestamp(),
      });
      setEditingNoteAyah(null);
      setNoteDraft('');
      setBookmarkFeedback(`Saved ${surahMeta.transliteration} ${selectedSurah}:${ayah.numberInSurah}`);
      setTimeout(() => setBookmarkFeedback(null), 3000);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `quran_progress/${docId}`);
    }
  };

  const filteredSurahs = ALL_SURAHS.filter((s) => {
    const q = surahSearch.trim().toLowerCase();
    if (!q) return true;
    return (
      s.transliteration.toLowerCase().includes(q) ||
      s.englishName.toLowerCase().includes(q) ||
      s.arabicName.includes(q) ||
      String(s.number) === q
    );
  });

  const bookmarkedKeys = new Set(
    quranProgress.map((p) => `${p.surahNumber}:${p.ayahNumber}`)
  );

  const cycleAyahRepeat = () => {
    const order = [1, 3, 5, 999];
    const next = order[(order.indexOf(ayahRepeatTarget) + 1) % order.length];
    setAyahRepeatTarget(next);
    setAyahRepeatDone(0);
  };

  return (
    <section className="max-w-[1320px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <audio ref={audioRef} onEnded={handleAudioEnded} preload="none" />

      {/* Reader Header */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 pb-6 border-b border-[#E2E8E5]">
        <div>
          <p className="text-xs font-medium tracking-wide text-[#065F46] mb-1">
            Digital Holy Quran · All 114 Surahs · 30 Juz · 604 Pages
          </p>
          <h1 className="font-display text-3xl sm:text-4xl font-bold text-[#0F1F1A]">
            {surahMeta.number}. {surahMeta.transliteration}{' '}
            <span className="font-arabic text-3xl sm:text-4xl text-[#065F46] mr-2">
              ({surahMeta.arabicName})
            </span>
          </h1>
          <div className="flex flex-wrap items-center gap-2 text-xs text-[#475A53] mt-2 tabular-nums">
            <span>{surahMeta.englishName}</span>
            <span aria-hidden="true">·</span>
            <span>{surahMeta.revelationType} Revelation</span>
            <span aria-hidden="true">·</span>
            <span>{surahMeta.ayahCount} Ayahs</span>
            <span aria-hidden="true">·</span>
            <span>Juz {ayahs[0]?.juz || surahMeta.juzStart}</span>
            <span aria-hidden="true">·</span>
            <span>Page {ayahs[currentAyahIndex]?.page || surahMeta.pageStart}</span>
            {cachedOffline && (
              <>
                <span aria-hidden="true">·</span>
                <span className="text-[#065F46] font-medium inline-flex items-center gap-1">
                  <DownloadCloud className="w-3.5 h-3.5" /> Cached Offline
                </span>
              </>
            )}
          </div>
        </div>

        {/* Display & Script Controls */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex items-center gap-1 p-1 bg-[#F6F8F7] border border-[#E2E8E5] rounded-lg">
            <button
              type="button"
              onClick={() => setShowArabic((v) => !v)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                showArabic ? 'bg-[#065F46] text-white' : 'text-[#475A53] hover:text-[#0F1F1A]'
              }`}
            >
              Arabic
            </button>
            <button
              type="button"
              onClick={() => setShowEnglish((v) => !v)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                showEnglish ? 'bg-[#065F46] text-white' : 'text-[#475A53] hover:text-[#0F1F1A]'
              }`}
            >
              English
            </button>
            <button
              type="button"
              onClick={() => setShowUrdu((v) => !v)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                showUrdu ? 'bg-[#065F46] text-white' : 'text-[#475A53] hover:text-[#0F1F1A]'
              }`}
            >
              Urdu
            </button>
            <button
              type="button"
              onClick={() => setShowWordByWord((v) => !v)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                showWordByWord ? 'bg-[#B8860B] text-white' : 'text-[#475A53] hover:text-[#0F1F1A]'
              }`}
            >
              Word-by-Word
            </button>
          </div>

          <div className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-white border border-[#E2E8E5] rounded-lg text-xs text-[#475A53]">
            <span>Script</span>
            <button
              type="button"
              onClick={() => setArabicScale((s) => Math.max(22, s - 2))}
              aria-label="Decrease Arabic font size"
              className="w-6 h-6 rounded hover:bg-[#F6F8F7] text-[#0F1F1A] font-semibold"
            >
              -
            </button>
            <span className="tabular-nums w-6 text-center">{arabicScale}</span>
            <button
              type="button"
              onClick={() => setArabicScale((s) => Math.min(46, s + 2))}
              aria-label="Increase Arabic font size"
              className="w-6 h-6 rounded hover:bg-[#F6F8F7] text-[#0F1F1A] font-semibold"
            >
              +
            </button>
          </div>
        </div>
      </div>

      {/* Audio Recitation Bar */}
      <div className="mt-5 bg-[#FAF9F6] border border-[#E2E8E5] rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => playAyahAtIndex(Math.max(0, currentAyahIndex - 1))}
            disabled={loading || currentAyahIndex === 0}
            aria-label="Previous Ayah"
            className="w-10 h-10 rounded-lg border border-[#E2E8E5] bg-white flex items-center justify-center text-[#0F1F1A] hover:border-[#065F46] disabled:opacity-40 transition-colors"
          >
            <SkipBack className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={togglePlayPause}
            disabled={loading || ayahs.length === 0}
            className="inline-flex items-center gap-2 px-5 h-10 rounded-lg bg-[#065F46] text-white text-sm font-medium hover:bg-[#047857] disabled:opacity-50 transition-colors whitespace-nowrap shrink-0"
          >
            {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            {isPlaying ? 'Pause' : 'Play Recitation'}
          </button>

          <button
            type="button"
            onClick={() => playAyahAtIndex(Math.min(ayahs.length - 1, currentAyahIndex + 1))}
            disabled={loading || currentAyahIndex >= ayahs.length - 1}
            aria-label="Next Ayah"
            className="w-10 h-10 rounded-lg border border-[#E2E8E5] bg-white flex items-center justify-center text-[#0F1F1A] hover:border-[#065F46] disabled:opacity-40 transition-colors"
          >
            <SkipForward className="w-4 h-4" />
          </button>

          <div className="text-xs text-[#475A53] pl-1 tabular-nums">
            <span className="font-medium text-[#0F1F1A]">
              Ayah {ayahs[currentAyahIndex]?.numberInSurah || 1}
            </span>{' '}
            of {surahMeta.ayahCount}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <div className="inline-flex items-center gap-2 bg-white border border-[#E2E8E5] rounded-lg px-3 h-10">
            <Volume2 className="w-3.5 h-3.5 text-[#065F46]" />
            <select
              aria-label="Select Reciter"
              value={reciterFolder}
              onChange={(e) => setReciterFolder(e.target.value)}
              className="text-xs font-medium text-[#0F1F1A] bg-transparent focus:outline-none"
            >
              {RECITERS.map((r) => (
                <option key={r.id} value={r.folder}>
                  {r.name}
                </option>
              ))}
            </select>
          </div>

          <button
            type="button"
            onClick={cycleAyahRepeat}
            className={`inline-flex items-center gap-1.5 px-3 h-10 rounded-lg border text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
              ayahRepeatTarget > 1
                ? 'border-[#065F46] bg-[#065F46] text-white'
                : 'border-[#E2E8E5] bg-white text-[#0F1F1A] hover:border-[#065F46]'
            }`}
          >
            <Repeat className="w-3.5 h-3.5" />
            Ayah Repeat: {ayahRepeatTarget === 999 ? 'Loop' : `${ayahRepeatTarget}x`}
          </button>

          <button
            type="button"
            onClick={() => setSurahRepeat((v) => !v)}
            className={`inline-flex items-center gap-1.5 px-3 h-10 rounded-lg border text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
              surahRepeat
                ? 'border-[#B8860B] bg-[#B8860B] text-white'
                : 'border-[#E2E8E5] bg-white text-[#0F1F1A] hover:border-[#B8860B]'
            }`}
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Surah Repeat
          </button>

          <select
            aria-label="Playback speed"
            value={playbackRate}
            onChange={(e) => setPlaybackRate(Number(e.target.value))}
            className="h-10 px-2.5 rounded-lg border border-[#E2E8E5] bg-white text-xs font-medium text-[#0F1F1A] tabular-nums"
          >
            <option value={0.75}>0.75x</option>
            <option value={1}>1.0x</option>
            <option value={1.25}>1.25x</option>
          </select>
        </div>
      </div>

      {bookmarkFeedback && (
        <div
          role="status"
          className="mt-4 flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-xs font-medium text-[#065F46]"
        >
          <Check className="w-4 h-4" />
          <span>{bookmarkFeedback}</span>
        </div>
      )}

      {/* Main Split: Left Navigation Rail (Surah / Juz / Page) + Right Ayah Canvas */}
      <div className="mt-6 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Navigation Panel */}
        <aside className="lg:col-span-4 xl:col-span-3 bg-white border border-[#E2E8E5] rounded-2xl overflow-hidden lg:sticky lg:top-20">
          <div className="p-3 border-b border-[#E2E8E5] bg-[#FAF9F6]">
            <div className="grid grid-cols-3 gap-1 p-1 bg-[#EAECEB] rounded-lg">
              <button
                type="button"
                onClick={() => setNavMode('surah')}
                className={`py-1.5 text-xs font-medium rounded-md transition-colors ${
                  navMode === 'surah' ? 'bg-white text-[#0F1F1A] shadow-xs' : 'text-[#475A53]'
                }`}
              >
                114 Surahs
              </button>
              <button
                type="button"
                onClick={() => setNavMode('juz')}
                className={`py-1.5 text-xs font-medium rounded-md transition-colors ${
                  navMode === 'juz' ? 'bg-white text-[#0F1F1A] shadow-xs' : 'text-[#475A53]'
                }`}
              >
                30 Juz
              </button>
              <button
                type="button"
                onClick={() => setNavMode('page')}
                className={`py-1.5 text-xs font-medium rounded-md transition-colors ${
                  navMode === 'page' ? 'bg-white text-[#0F1F1A] shadow-xs' : 'text-[#475A53]'
                }`}
              >
                Pages
              </button>
            </div>
          </div>

          {navMode === 'surah' && (
            <div>
              <div className="p-3 border-b border-[#E2E8E5]">
                <div className="relative">
                  <Search className="w-4 h-4 text-[#475A53] absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={surahSearch}
                    onChange={(e) => setSurahSearch(e.target.value)}
                    placeholder="Search Surah name or #..."
                    className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-[#E2E8E5] bg-[#FAF9F6] focus:outline-none focus:border-[#065F46]"
                  />
                </div>
              </div>
              <div className="max-h-[540px] overflow-y-auto divide-y divide-[#F0F2F1]">
                {filteredSurahs.map((s) => {
                  const active = s.number === selectedSurah;
                  return (
                    <button
                      key={s.number}
                      type="button"
                      onClick={() => setSelectedSurah(s.number)}
                      className={`w-full text-left px-4 py-3 flex items-center justify-between gap-3 transition-colors ${
                        active ? 'bg-emerald-50/70' : 'hover:bg-[#FAF9F6]'
                      }`}
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span
                            className={`text-xs font-semibold tabular-nums ${
                              active ? 'text-[#065F46]' : 'text-[#475A53]'
                            }`}
                          >
                            {s.number}.
                          </span>
                          <span className="text-sm font-medium text-[#0F1F1A] truncate">
                            {s.transliteration}
                          </span>
                        </div>
                        <p className="text-[11px] text-[#475A53] mt-0.5 tabular-nums">
                          {s.englishName} · {s.ayahCount} ayahs
                        </p>
                      </div>
                      <span className="font-arabic text-lg text-[#065F46] shrink-0">
                        {s.arabicName}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {navMode === 'juz' && (
            <div className="max-h-[580px] overflow-y-auto divide-y divide-[#F0F2F1]">
              {ALL_JUZ.map((j) => (
                <button
                  key={j.juzNumber}
                  type="button"
                  onClick={() => {
                    if (j.startSurah === selectedSurah) {
                      setTargetAyahScroll(j.startAyah);
                    } else {
                      setTargetAyahScroll(j.startAyah);
                      setSelectedSurah(j.startSurah);
                    }
                  }}
                  className="w-full text-left px-4 py-3 flex items-center justify-between gap-3 hover:bg-[#FAF9F6] transition-colors"
                >
                  <div>
                    <div className="text-sm font-medium text-[#0F1F1A] tabular-nums">
                      Juz {j.juzNumber} · {j.englishTitle}
                    </div>
                    <div className="text-[11px] text-[#475A53] tabular-nums mt-0.5">
                      Surah {j.startSurah}:{j.startAyah} – {j.endSurah}:{j.endAyah} · Page {j.pageStart}
                    </div>
                  </div>
                  <span className="font-arabic text-base text-[#065F46] shrink-0">
                    {j.arabicName}
                  </span>
                </button>
              ))}
            </div>
          )}

          {navMode === 'page' && (
            <div className="p-4 space-y-4">
              <form onSubmit={handleJumpToPage} className="space-y-3">
                <label className="block text-xs font-medium text-[#0F1F1A]">
                  Jump to Mushaf Page (1 – 604)
                </label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    min={1}
                    max={604}
                    value={pageInput}
                    onChange={(e) => setPageInput(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-[#E2E8E5] tabular-nums focus:outline-none focus:border-[#065F46]"
                  />
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-lg bg-[#065F46] text-white text-xs font-medium hover:bg-[#047857] transition-colors whitespace-nowrap shrink-0"
                  >
                    Go
                  </button>
                </div>
              </form>

              <div className="pt-3 border-t border-[#E2E8E5]">
                <p className="text-xs font-medium text-[#475A53] mb-2">Quick Bookmarks</p>
                {quranProgress.length === 0 ? (
                  <p className="text-xs text-[#475A53]">
                    {firebaseUser
                      ? 'Bookmark any Ayah to resume reading from any device.'
                      : 'Sign in to save cloud bookmarks and study notes.'}
                  </p>
                ) : (
                  <div className="space-y-2 max-h-72 overflow-y-auto">
                    {quranProgress.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => {
                          setTargetAyahScroll(item.ayahNumber);
                          setSelectedSurah(item.surahNumber);
                        }}
                        className="w-full text-left p-2.5 rounded-lg bg-[#FAF9F6] border border-[#E2E8E5] hover:border-[#065F46] transition-colors"
                      >
                        <div className="text-xs font-semibold text-[#065F46] tabular-nums">
                          {item.surahName} ({item.surahNumber}:{item.ayahNumber})
                        </div>
                        {item.note && (
                          <p className="text-[11px] text-[#475A53] mt-1 line-clamp-2">
                            {item.note}
                          </p>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </aside>

        {/* Right Ayah Reading Stream */}
        <div className="lg:col-span-8 xl:col-span-9 space-y-5">
          {/* Surah Banner with Bismillah */}
          <div className="rounded-2xl bg-[#065F46] text-white p-6 sm:p-8 islamic-lattice-gold relative overflow-hidden">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <p className="text-xs text-[#D4AF37] font-medium tracking-wide">
                  Surah {surahMeta.number} of 114 · {surahMeta.revelationType}
                </p>
                <h2 className="font-display text-3xl font-bold mt-1">
                  {surahMeta.transliteration} — {surahMeta.englishName}
                </h2>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={selectedSurah <= 1}
                  onClick={() => setSelectedSurah((s) => Math.max(1, s - 1))}
                  className="inline-flex items-center gap-1 px-3 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-medium disabled:opacity-40 transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Prev
                </button>
                <button
                  type="button"
                  disabled={selectedSurah >= 114}
                  onClick={() => setSelectedSurah((s) => Math.min(114, s + 1))}
                  className="inline-flex items-center gap-1 px-3 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-medium disabled:opacity-40 transition-colors"
                >
                  Next
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
            {selectedSurah !== 9 && selectedSurah !== 1 && (
              <p className="font-arabic text-2xl sm:text-3xl text-center mt-6 pt-5 border-t border-white/15 text-[#FAF9F6]">
                بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ
              </p>
            )}
          </div>

          {/* Loading / Error / Ayah List */}
          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((n) => (
                <div
                  key={n}
                  className="bg-white border border-[#E2E8E5] rounded-2xl p-6 animate-pulse space-y-4"
                >
                  <div className="h-4 w-24 bg-[#EAECEB] rounded" />
                  <div className="h-8 w-3/4 ml-auto bg-[#EAECEB] rounded" />
                  <div className="h-4 w-full bg-[#F2F4F3] rounded" />
                </div>
              ))}
            </div>
          ) : error ? (
            <div className="bg-white border border-amber-200 rounded-2xl p-8 text-center">
              <p className="text-sm text-[#0F1F1A] font-medium mb-2">{error}</p>
              <button
                type="button"
                onClick={() => setSelectedSurah((s) => s)}
                className="px-4 py-2 rounded-lg bg-[#065F46] text-white text-xs font-medium"
              >
                Retry Loading Surah
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {ayahs.map((ayah, idx) => {
                const isActiveAudio = isPlaying && currentAyahIndex === idx;
                const isBookmarked = bookmarkedKeys.has(`${selectedSurah}:${ayah.numberInSurah}`);
                const tafseerOpenHere =
                  openTafseer?.ayah === ayah.numberInSurah ? openTafseer : null;

                return (
                  <article
                    key={ayah.numberInSurah}
                    id={`ayah-${selectedSurah}-${ayah.numberInSurah}`}
                    className={`bg-white rounded-2xl border p-6 transition-colors ${
                      isActiveAudio
                        ? 'border-[#065F46] bg-emerald-50/30'
                        : 'border-[#E2E8E5]'
                    }`}
                  >
                    {/* Ayah Header Toolbar */}
                    <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-[#F0F2F1]">
                      <div className="flex items-center gap-2 text-xs text-[#475A53] tabular-nums">
                        <span className="font-semibold text-[#065F46]">
                          {selectedSurah}:{ayah.numberInSurah}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span>Juz {ayah.juz}</span>
                        <span aria-hidden="true">·</span>
                        <span>Page {ayah.page}</span>
                      </div>

                      <div className="flex flex-wrap items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => playAyahAtIndex(idx)}
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                            isActiveAudio
                              ? 'bg-[#065F46] text-white'
                              : 'bg-[#F6F8F7] text-[#0F1F1A] hover:bg-emerald-50 hover:text-[#065F46]'
                          }`}
                        >
                          {isActiveAudio ? (
                            <Pause className="w-3.5 h-3.5" />
                          ) : (
                            <Play className="w-3.5 h-3.5" />
                          )}
                          {isActiveAudio ? 'Playing' : 'Listen'}
                        </button>

                        <button
                          type="button"
                          onClick={() => void handleOpenTafseer(ayah.numberInSurah, 'en')}
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                            tafseerOpenHere?.lang === 'en'
                              ? 'bg-[#065F46] text-white'
                              : 'bg-[#F6F8F7] text-[#0F1F1A] hover:bg-emerald-50'
                          }`}
                        >
                          <BookOpen className="w-3.5 h-3.5" />
                          English Tafseer
                        </button>

                        <button
                          type="button"
                          onClick={() => void handleOpenTafseer(ayah.numberInSurah, 'ur')}
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                            tafseerOpenHere?.lang === 'ur'
                              ? 'bg-[#B8860B] text-white'
                              : 'bg-[#F6F8F7] text-[#0F1F1A] hover:bg-amber-50'
                          }`}
                        >
                          <Languages className="w-3.5 h-3.5" />
                          Urdu Tafseer
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            if (!firebaseUser) {
                              onNavigateAuth?.();
                              return;
                            }
                            setEditingNoteAyah(
                              editingNoteAyah === ayah.numberInSurah ? null : ayah.numberInSurah
                            );
                          }}
                          aria-label={`Bookmark Ayah ${ayah.numberInSurah}`}
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                            isBookmarked
                              ? 'bg-amber-50 text-[#B8860B] border border-[#D4AF37]/40'
                              : 'bg-[#F6F8F7] text-[#475A53] hover:text-[#0F1F1A]'
                          }`}
                        >
                          <Bookmark className="w-3.5 h-3.5" />
                          {isBookmarked ? 'Bookmarked' : 'Bookmark'}
                        </button>
                      </div>
                    </div>

                    {/* Arabic Text */}
                    {showArabic && (
                      <p
                        style={{ fontSize: `${arabicScale}px`, lineHeight: 2.05 }}
                        className="font-arabic text-right text-[#0F1F1A] mt-5 mb-4"
                      >
                        {ayah.arabicText}
                        <span className="inline-block mx-2 text-lg text-[#B8860B] tabular-nums">
                          ﴿{ayah.numberInSurah}﴾
                        </span>
                      </p>
                    )}

                    {/* Word-by-Word Breakdown */}
                    {showWordByWord && ayah.words.length > 0 && (
                      <div className="my-4 p-4 rounded-xl bg-[#FAF9F6] border border-[#E2E8E5]">
                        <div className="flex items-center gap-2 text-xs font-medium text-[#065F46] mb-3">
                          <Layers className="w-3.5 h-3.5" />
                          <span>Word-by-Word Analysis (Right to Left)</span>
                        </div>
                        <div className="flex flex-row-reverse flex-wrap gap-2.5">
                          {ayah.words.map((w) => (
                            <div
                              key={`${ayah.numberInSurah}-w-${w.position}`}
                              className="px-3 py-2 rounded-lg bg-white border border-[#E2E8E5] text-center min-w-[90px]"
                            >
                              <div className="font-arabic text-xl text-[#0F1F1A]">{w.arabic}</div>
                              {w.transliteration && (
                                <div className="text-[11px] text-[#065F46] font-medium mt-0.5">
                                  {w.transliteration}
                                </div>
                              )}
                              <div className="text-[11px] text-[#475A53] mt-0.5">{w.english}</div>
                              {w.urdu && (
                                <div className="font-arabic text-xs text-[#0F1F1A] mt-0.5">
                                  {w.urdu}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* English & Urdu Translations */}
                    <div className="space-y-3 mt-3">
                      {showEnglish && (
                        <p className="text-[15px] leading-relaxed text-[#0F1F1A]">
                          {ayah.englishText}
                        </p>
                      )}
                      {showUrdu && (
                        <p
                          dir="rtl"
                          className="font-arabic text-xl leading-loose text-[#2D443D] text-right"
                        >
                          {ayah.urduText}
                        </p>
                      )}
                    </div>

                    {/* Expandable Tafseer Panel */}
                    {tafseerOpenHere && (
                      <div className="mt-4 p-4 rounded-xl bg-[#FAF9F6] border border-[#D4AF37]/40">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-semibold text-[#065F46]">
                            {tafseerOpenHere.lang === 'en'
                              ? 'English Tafseer (Ibn Kathir / Scholarly Commentary)'
                              : 'اردو تفسیر (بیان القرآن / تفسیری نوٹ)'}
                          </span>
                          <button
                            type="button"
                            onClick={() => setOpenTafseer(null)}
                            className="text-xs text-[#475A53] hover:text-[#0F1F1A]"
                          >
                            Close
                          </button>
                        </div>
                        {tafseerOpenHere.loading ? (
                          <p className="text-xs text-[#475A53]">Loading Tafseer commentary...</p>
                        ) : (
                          <p
                            dir={tafseerOpenHere.lang === 'ur' ? 'rtl' : 'ltr'}
                            className={
                              tafseerOpenHere.lang === 'ur'
                                ? 'font-arabic text-lg leading-loose text-[#0F1F1A] text-right'
                                : 'text-sm leading-relaxed text-[#2D443D]'
                            }
                          >
                            {tafseerOpenHere.text}
                          </p>
                        )}
                      </div>
                    )}

                    {/* Bookmark & Study Note Form */}
                    {editingNoteAyah === ayah.numberInSurah && (
                      <div className="mt-4 p-4 rounded-xl bg-[#FAF9F6] border border-[#E2E8E5] space-y-3">
                        <label className="block text-xs font-medium text-[#0F1F1A]">
                          Save Bookmark & Personal Study Note for {selectedSurah}:{ayah.numberInSurah}
                        </label>
                        <textarea
                          rows={2}
                          value={noteDraft}
                          onChange={(e) => setNoteDraft(e.target.value)}
                          maxLength={MAX_LENGTHS.note}
                          placeholder="Add Tajweed reminder or reflection (optional)..."
                          className="w-full px-3 py-2 text-xs rounded-lg border border-[#E2E8E5] bg-white focus:outline-none focus:border-[#065F46]"
                        />
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => setEditingNoteAyah(null)}
                            className="px-3 py-1.5 text-xs text-[#475A53] hover:text-[#0F1F1A]"
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            onClick={() => void handleSaveBookmark(ayah, noteDraft)}
                            className="px-4 py-1.5 rounded-lg bg-[#065F46] text-white text-xs font-medium hover:bg-[#047857] transition-colors"
                          >
                            Save Bookmark
                          </button>
                        </div>
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </section>
  );
};
