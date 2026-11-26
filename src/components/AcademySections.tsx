import React, { useRef, useState } from 'react';
import {
  ArrowRight,
  BookOpen,
  Calendar,
  Check,
  Clock,
  ExternalLink,
  Headphones,
  Library,
  Mail,
  MapPin,
  Pause,
  Phone,
  Play,
  Send,
  Users,
  Video,
} from 'lucide-react';
import { doc, serverTimestamp, setDoc } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import {
  HERO_BANNER_IMAGE,
  TEACHER_MALE_IMAGE,
  TESTIMONIALS,
} from '../data/academySeedData';
import {
  AppView,
  Course,
  CourseCategory,
  LibraryCategory,
  LibraryItem,
  LiveClass,
  MAX_LENGTHS,
} from '../types/academy';
import { PWAInstallButton } from './PWAInstallButton';

interface NavProps {
  onNavigate: (view: AppView) => void;
  onEnterClassroom?: (session: LiveClass) => void;
}

/* ---------------- COURSES CATALOG ---------------- */
export const CoursesSection: React.FC<NavProps & { compact?: boolean }> = ({
  onNavigate,
  compact = false,
}) => {
  const { courses, firebaseUser, profile, enrollments } = useAuth();
  const [filter, setFilter] = useState<'All' | CourseCategory>('All');
  const [enrollStatus, setEnrollStatus] = useState<string | null>(null);

  const visibleCourses = courses
    .filter((c) => filter === 'All' || c.category === filter)
    .slice(0, compact ? 4 : courses.length);

  const enrolledIds = new Set(enrollments.map((e) => e.courseId));

  const handleEnroll = async (course: Course) => {
    if (!firebaseUser) {
      onNavigate('auth');
      return;
    }
    if (!firebaseUser.emailVerified) {
      setEnrollStatus('Please verify your email inside your Portal before enrolling.');
      return;
    }
    const id = `${firebaseUser.uid}_${course.id}`;
    try {
      await setDoc(doc(db, 'enrollments', id), {
        studentId: firebaseUser.uid,
        studentName: (profile?.displayName || firebaseUser.displayName || 'Student').slice(
          0,
          MAX_LENGTHS.displayName
        ),
        courseId: course.id,
        courseTitle: course.title.slice(0, MAX_LENGTHS.courseTitle),
        status: 'active',
        progressPercent: 0,
        lastSurah: 1,
        lastAyah: 1,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      setEnrollStatus(`Enrolled in "${course.title}". View your progress in the Academy Portal.`);
      setTimeout(() => setEnrollStatus(null), 4000);
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `enrollments/${id}`);
    }
  };

  const categories: Array<'All' | CourseCategory> = [
    'All',
    'Tajweed',
    'Hifz',
    'Kids Quran',
    'Tafseer',
    'Nazra',
    'Islamic Studies',
  ];

  return (
    <section className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 py-14">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
        <div>
          <p className="text-xs font-medium text-[#065F46] mb-1">Structured Curriculum</p>
          <h2 className="font-display text-3xl sm:text-4xl font-bold text-[#0F1F1A]">
            {compact ? 'Popular Quran Courses' : 'All Quran & Islamic Courses'}
          </h2>
        </div>

        {!compact && (
          <div className="flex flex-wrap gap-1 p-1 bg-[#F6F8F7] border border-[#E2E8E5] rounded-lg">
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setFilter(cat)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                  filter === cat ? 'bg-[#065F46] text-white' : 'text-[#475A53] hover:text-[#0F1F1A]'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        )}
      </div>

      {enrollStatus && (
        <div
          role="status"
          className="mb-6 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs font-medium text-[#065F46]"
        >
          <Check className="w-4 h-4 shrink-0" />
          <span>{enrollStatus}</span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {visibleCourses.map((course) => {
          const isEnrolled = enrolledIds.has(course.id);
          return (
            <article
              key={course.id}
              className="bg-white border border-[#E2E8E5] rounded-2xl overflow-hidden flex flex-col"
            >
              <div className="aspect-[16/9] bg-[#F6F8F7] relative overflow-hidden">
                {course.imageUrl ? (
                  <img
                    src={course.imageUrl}
                    alt={course.title}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center islamic-lattice-bg text-[#065F46]">
                    <BookOpen className="w-10 h-10" />
                  </div>
                )}
              </div>

              <div className="p-6 flex-1 flex flex-col">
                <div className="text-xs text-[#475A53] mb-2 tabular-nums">
                  <span className="font-medium text-[#065F46]">{course.category}</span>
                  <span aria-hidden="true"> · </span>
                  <span>{course.level}</span>
                  <span aria-hidden="true"> · </span>
                  <span>{course.durationWeeks} Weeks</span>
                </div>

                <h3 className="text-xl font-semibold text-[#0F1F1A] mb-2">{course.title}</h3>
                <p className="text-sm text-[#475A53] leading-relaxed mb-5 flex-1">
                  {course.description}
                </p>

                <div className="pt-4 border-t border-[#F0F2F1] flex items-center justify-between gap-4">
                  <div className="text-xs text-[#475A53]">
                    <div className="font-medium text-[#0F1F1A]">{course.teacherName}</div>
                    {course.scheduleSummary && <div>{course.scheduleSummary}</div>}
                  </div>
                  <button
                    type="button"
                    disabled={isEnrolled}
                    onClick={() => void handleEnroll(course)}
                    className={`px-4 py-2 rounded-lg text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                      isEnrolled
                        ? 'bg-emerald-50 text-[#065F46] border border-emerald-200'
                        : 'bg-[#065F46] text-white hover:bg-[#047857]'
                    }`}
                  >
                    {isEnrolled ? 'Enrolled' : 'Enroll Now'}
                  </button>
                </div>
              </div>
            </article>
          );
        })}
      </div>

      {compact && (
        <div className="mt-8 text-center">
          <button
            type="button"
            onClick={() => onNavigate('courses')}
            className="inline-flex items-center gap-2 text-sm font-medium text-[#065F46] hover:underline"
          >
            Browse All Courses <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </section>
  );
};

/* ---------------- LIVE CLASSES ---------------- */
export const LiveClassesSection: React.FC<NavProps & { compact?: boolean }> = ({
  onNavigate,
  onEnterClassroom,
  compact = false,
}) => {
  const { liveClasses, firebaseUser, profile } = useAuth();
  const isFaculty =
    profile?.role === 'super_admin' ||
    (profile?.role === 'teacher' && profile?.teacherApproved === true);

  const visible = compact ? liveClasses.slice(0, 3) : liveClasses;

  const handleEnterRoom = (session: LiveClass) => {
    if (!firebaseUser) {
      onNavigate('auth');
      return;
    }
    onEnterClassroom?.(session);
  };

  return (
    <section className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 py-14">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
        <div>
          <p className="text-xs font-medium text-[#065F46] mb-1">
            Interactive Whiteboard Classroom
          </p>
          <h2 className="font-display text-3xl sm:text-4xl font-bold text-[#0F1F1A]">
            {compact ? 'Upcoming Live Classes' : 'Live Quran Classroom Schedule'}
          </h2>
        </div>
        {compact && (
          <button
            type="button"
            onClick={() => onNavigate('live-classes')}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-[#065F46] hover:underline"
          >
            Full Schedule <ArrowRight className="w-4 h-4" />
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {visible.map((session) => (
          <article
            key={session.id}
            className="bg-white border border-[#E2E8E5] rounded-2xl p-6 flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between gap-2 text-xs text-[#475A53] mb-3 tabular-nums">
                <span className="inline-flex items-center gap-1.5 font-medium text-[#065F46]">
                  <Video className="w-3.5 h-3.5" />
                  {session.status === 'live'
                    ? 'Live Now'
                    : session.status === 'completed'
                    ? 'Completed'
                    : 'Scheduled'}
                </span>
                <span>{session.durationMinutes} min</span>
              </div>

              <h3 className="text-lg font-semibold text-[#0F1F1A] mb-2">{session.title}</h3>
              {session.topic && (
                <p className="text-sm text-[#475A53] leading-relaxed mb-4">{session.topic}</p>
              )}
            </div>

            <div className="pt-4 border-t border-[#F0F2F1] space-y-3">
              <div className="flex items-center justify-between text-xs text-[#475A53]">
                <span className="inline-flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-[#065F46]" />
                  {session.scheduledFor}
                </span>
                <span className="font-medium text-[#0F1F1A]">{session.teacherName}</span>
              </div>
              <button
                type="button"
                onClick={() => handleEnterRoom(session)}
                className="w-full py-2.5 rounded-lg bg-[#065F46] text-white text-xs font-medium hover:bg-[#047857] transition-colors"
              >
                {!firebaseUser
                  ? 'Login to Join Class'
                  : isFaculty
                  ? 'Host Whiteboard Class'
                  : 'Join Live Classroom'}
              </button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
};

/* ---------------- ISLAMIC DIGITAL LIBRARY ---------------- */
export const LibrarySection: React.FC<NavProps & { compact?: boolean }> = ({
  onNavigate,
  compact = false,
}) => {
  const { libraryItems } = useAuth();
  const [categoryFilter, setCategoryFilter] = useState<'All' | LibraryCategory>('All');
  const [readingBook, setReadingBook] = useState<LibraryItem | null>(null);

  const filtered = libraryItems
    .filter((i) => categoryFilter === 'All' || i.category === categoryFilter)
    .slice(0, compact ? 4 : libraryItems.length);

  const cats: Array<'All' | LibraryCategory> = [
    'All',
    'Quran & Tajweed',
    'Tafseer',
    'Hadith',
    'Seerah',
    'Kids Stories',
  ];

  return (
    <section className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 py-14">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
        <div>
          <p className="text-xs font-medium text-[#065F46] mb-1">Authentic Study Resources</p>
          <h2 className="font-display text-3xl sm:text-4xl font-bold text-[#0F1F1A]">
            Quran & Islamic Digital Library
          </h2>
        </div>

        {!compact ? (
          <div className="flex flex-wrap gap-1 p-1 bg-[#F6F8F7] border border-[#E2E8E5] rounded-lg">
            {cats.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setCategoryFilter(c)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                  categoryFilter === c ? 'bg-[#065F46] text-white' : 'text-[#475A53]'
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        ) : (
          <button
            type="button"
            onClick={() => onNavigate('library')}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-[#065F46] hover:underline"
          >
            Open Full Library <ArrowRight className="w-4 h-4" />
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {filtered.map((book) => (
          <article
            key={book.id}
            className="bg-white border border-[#E2E8E5] rounded-2xl p-6 flex flex-col justify-between"
          >
            <div>
              <div className="text-xs text-[#475A53] mb-2 tabular-nums">
                <span className="font-medium text-[#065F46]">{book.category}</span>
                <span aria-hidden="true"> · </span>
                <span>{book.language}</span>
                {book.pages && (
                  <>
                    <span aria-hidden="true"> · </span>
                    <span>{book.pages} pages</span>
                  </>
                )}
              </div>
              <h3 className="text-xl font-semibold text-[#0F1F1A] mb-1">{book.title}</h3>
              <p className="text-xs text-[#475A53] mb-3">By {book.author}</p>
              <p className="text-sm text-[#475A53] leading-relaxed mb-5">{book.description}</p>
            </div>

            <button
              type="button"
              onClick={() => setReadingBook(book)}
              className="inline-flex items-center gap-2 self-start px-4 py-2 rounded-lg border border-[#065F46] text-[#065F46] text-xs font-medium hover:bg-[#065F46] hover:text-white transition-colors"
            >
              <Library className="w-3.5 h-3.5" />
              Read Study Excerpt
            </button>
          </article>
        ))}
      </div>

      {readingBook && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-white border border-[#E2E8E5] rounded-2xl max-w-2xl w-full p-6 sm:p-8 max-h-[85vh] overflow-y-auto">
            <div className="text-xs text-[#065F46] font-medium mb-1">
              {readingBook.category} · {readingBook.language}
            </div>
            <h3 className="font-display text-2xl font-bold text-[#0F1F1A]">{readingBook.title}</h3>
            <p className="text-xs text-[#475A53] mt-1 mb-5">Author: {readingBook.author}</p>
            <div className="p-5 rounded-xl bg-[#FAF9F6] border border-[#E2E8E5] text-sm leading-relaxed text-[#0F1F1A] whitespace-pre-line">
              {readingBook.contentPreview || readingBook.description}
            </div>
            <div className="mt-6 flex justify-end">
              <button
                type="button"
                onClick={() => setReadingBook(null)}
                className="px-5 py-2.5 rounded-lg bg-[#065F46] text-white text-xs font-medium hover:bg-[#047857]"
              >
                Close Reader
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};

/* ---------------- ISLAMIC LECTURES ---------------- */
export const LecturesSection: React.FC<NavProps & { compact?: boolean }> = ({
  onNavigate,
  compact = false,
}) => {
  const { lectures } = useAuth();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playingId, setPlayingId] = useState<string | null>(null);

  const visible = compact ? lectures.slice(0, 3) : lectures;

  const togglePlay = (id: string, mediaUrl?: string) => {
    if (!audioRef.current) return;
    if (playingId === id) {
      audioRef.current.pause();
      setPlayingId(null);
      return;
    }
    const src = mediaUrl || 'https://everyayah.com/data/Alafasy_128kbps/001001.mp3';
    audioRef.current.src = src;
    void audioRef.current.play();
    setPlayingId(id);
  };

  return (
    <section className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 py-14">
      <audio ref={audioRef} onEnded={() => setPlayingId(null)} preload="none" />
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
        <div>
          <p className="text-xs font-medium text-[#065F46] mb-1">Scholarly Reflections</p>
          <h2 className="font-display text-3xl sm:text-4xl font-bold text-[#0F1F1A]">
            Latest Islamic Lectures
          </h2>
        </div>
        {compact && (
          <button
            type="button"
            onClick={() => onNavigate('lectures')}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-[#065F46] hover:underline"
          >
            All Lectures <ArrowRight className="w-4 h-4" />
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {visible.map((lec) => {
          const isPlaying = playingId === lec.id;
          return (
            <article
              key={lec.id}
              className="bg-white border border-[#E2E8E5] rounded-2xl p-6 flex flex-col justify-between"
            >
              <div>
                <div className="text-xs text-[#475A53] mb-2 tabular-nums">
                  <span className="font-medium text-[#065F46]">{lec.category}</span>
                  <span aria-hidden="true"> · </span>
                  <span className="inline-flex items-center gap-1">
                    <Clock className="w-3 h-3" /> {lec.durationLabel}
                  </span>
                </div>
                <h3 className="text-lg font-semibold text-[#0F1F1A] mb-1">{lec.title}</h3>
                <p className="text-xs text-[#475A53] mb-3">{lec.speaker}</p>
                <p className="text-sm text-[#475A53] leading-relaxed mb-5">{lec.summary}</p>
              </div>

              <button
                type="button"
                onClick={() => togglePlay(lec.id, lec.mediaUrl)}
                className={`inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-xs font-medium transition-colors ${
                  isPlaying
                    ? 'bg-[#B8860B] text-white'
                    : 'bg-[#FAF9F6] border border-[#E2E8E5] text-[#0F1F1A] hover:border-[#065F46]'
                }`}
              >
                {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                {isPlaying ? 'Pause Audio' : 'Listen to Lecture'}
                <Headphones className="w-3.5 h-3.5 ml-auto text-[#475A53]" />
              </button>
            </article>
          );
        })}
      </div>
    </section>
  );
};

/* ---------------- FEATURED TEACHERS ---------------- */
export const TeachersSection: React.FC<NavProps & { compact?: boolean }> = ({
  onNavigate,
  compact = false,
}) => {
  const { publicTeachers } = useAuth();
  const visible = compact ? publicTeachers.slice(0, 4) : publicTeachers;

  return (
    <section className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 py-14">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
        <div>
          <p className="text-xs font-medium text-[#065F46] mb-1">Verified Scholars</p>
          <h2 className="font-display text-3xl sm:text-4xl font-bold text-[#0F1F1A]">
            Featured Teachers & Qaris
          </h2>
        </div>
        {compact && (
          <button
            type="button"
            onClick={() => onNavigate('teachers')}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-[#065F46] hover:underline"
          >
            Meet Faculty <ArrowRight className="w-4 h-4" />
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {visible.map((teacher) => (
          <article
            key={teacher.id}
            className="bg-white border border-[#E2E8E5] rounded-2xl p-6 flex flex-col sm:flex-row gap-5 items-start"
          >
            <div className="w-24 h-24 rounded-xl overflow-hidden bg-[#F6F8F7] border border-[#E2E8E5] shrink-0">
              <img
                src={teacher.photoURL || TEACHER_MALE_IMAGE}
                alt={teacher.displayName}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover"
              />
            </div>
            <div>
              <h3 className="text-xl font-semibold text-[#0F1F1A]">{teacher.displayName}</h3>
              <p className="text-xs font-medium text-[#065F46] mt-0.5 mb-2">{teacher.specialty}</p>
              <p className="text-sm text-[#475A53] leading-relaxed mb-3">{teacher.bio}</p>
              {teacher.languages && (
                <p className="text-xs text-[#475A53]">Languages: {teacher.languages}</p>
              )}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
};

/* ---------------- ABOUT & MISSION ---------------- */
export const AboutSection: React.FC = () => {
  return (
    <section className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 py-14">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        <div className="lg:col-span-6">
          <p className="text-xs font-medium text-[#065F46] mb-1">About the Academy</p>
          <h2 className="font-display text-3xl sm:text-4xl font-bold text-[#0F1F1A] mb-4">
            A Trusted Sanctuary for Quranic Literacy & Character
          </h2>
          <p className="text-[15px] text-[#475A53] leading-relaxed mb-4">
            ZARTHOUGHTS QURAN ACADEMY unites classical Ijazah-certified scholarship with modern
            digital tools so children, adults, and families worldwide can recite the Holy Quran
            accurately, understand its guidance deeply, and build a purposeful future.
          </p>
          <p className="text-[15px] text-[#475A53] leading-relaxed">
            Every child account is safeguarded with guardian oversight, and every faculty member
            undergoes administrative verification before leading live recitation circles.
          </p>
        </div>

        <div className="lg:col-span-6 bg-[#FAF9F6] border border-[#E2E8E5] rounded-2xl p-6 sm:p-8 space-y-6">
          <div>
            <h3 className="font-display text-2xl font-bold text-[#0F1F1A] mb-2">Our Mission</h3>
            <p className="text-sm text-[#475A53] leading-relaxed">
              &ldquo;Learn Quran. Understand Islam. Build a Better Future.&rdquo; — Our mission is
              to make authentic Tajweed, Hifz, Urdu & English Tafseer, and prophetic character
              education accessible in a calm, ad-free environment for every household.
            </p>
          </div>
          <div className="grid grid-cols-3 gap-4 pt-5 border-t border-[#E2E8E5] tabular-nums">
            <div>
              <div className="font-display text-2xl font-bold text-[#065F46]">114</div>
              <div className="text-xs text-[#475A53]">Complete Surahs</div>
            </div>
            <div>
              <div className="font-display text-2xl font-bold text-[#065F46]">30</div>
              <div className="text-xs text-[#475A53]">Indexed Juz</div>
            </div>
            <div>
              <div className="font-display text-2xl font-bold text-[#065F46]">4 Roles</div>
              <div className="text-xs text-[#475A53]">Family & Admin Portal</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

/* ---------------- CONTACT SECTION ---------------- */
export const ContactSection: React.FC = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSending(true);
    const id = `msg_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    try {
      await setDoc(doc(db, 'contact_messages', id), {
        name: name.trim().slice(0, MAX_LENGTHS.displayName),
        email: email.trim().slice(0, MAX_LENGTHS.email),
        subject: subject.trim().slice(0, MAX_LENGTHS.contactSubject),
        message: message.trim().slice(0, MAX_LENGTHS.contactMessage),
        status: 'new',
        createdAt: serverTimestamp(),
      });
      setSent(true);
      setName('');
      setEmail('');
      setSubject('');
      setMessage('');
    } catch (err) {
      setError('Unable to send inquiry right now. Please try again.');
      handleFirestoreError(err, OperationType.CREATE, `contact_messages/${id}`);
    } finally {
      setSending(false);
    }
  };

  return (
    <section className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 py-14">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-5 space-y-5">
          <div>
            <p className="text-xs font-medium text-[#065F46] mb-1">Get in Touch</p>
            <h2 className="font-display text-3xl sm:text-4xl font-bold text-[#0F1F1A]">
              Contact ZARTHOUGHTS QURAN ACADEMY
            </h2>
            <p className="text-sm text-[#475A53] mt-3 leading-relaxed">
              Questions about enrollment, children&rsquo;s classes, or teacher applications? Send
              our academic coordinators a message directly.
            </p>
          </div>

          <div className="space-y-3 pt-2 text-sm text-[#0F1F1A]">
            <div className="flex items-center gap-3">
              <Mail className="w-4 h-4 text-[#065F46]" />
              <span>admissions@zarthoughtsquran.academy</span>
            </div>
            <div className="flex items-center gap-3">
              <Phone className="w-4 h-4 text-[#065F46]" />
              <span>International Student Desk · Mon–Sun</span>
            </div>
            <div className="flex items-center gap-3">
              <MapPin className="w-4 h-4 text-[#065F46]" />
              <span>Global Online Campus (UTC / UK / North America / Asia)</span>
            </div>
          </div>
        </div>

        <div className="lg:col-span-7 bg-white border border-[#E2E8E5] rounded-2xl p-6 sm:p-8">
          {sent ? (
            <div className="py-8 text-center space-y-3">
              <Check className="w-10 h-10 text-[#065F46] mx-auto" />
              <h3 className="text-xl font-semibold text-[#0F1F1A]">Inquiry Received</h3>
              <p className="text-sm text-[#475A53]">
                JazakAllahu Khayran. Our academic desk will respond to your email shortly.
              </p>
              <button
                type="button"
                onClick={() => setSent(false)}
                className="mt-2 px-4 py-2 rounded-lg border border-[#E2E8E5] text-xs font-medium"
              >
                Send Another Message
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && <p className="text-xs text-red-700">{error}</p>}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-[#0F1F1A] mb-1">Full Name</label>
                  <input
                    type="text"
                    required
                    minLength={2}
                    maxLength={MAX_LENGTHS.displayName}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full h-10 px-3 rounded-lg border border-[#E2E8E5] text-sm focus:outline-none focus:border-[#065F46]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#0F1F1A] mb-1">Email</label>
                  <input
                    type="email"
                    required
                    maxLength={MAX_LENGTHS.email}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full h-10 px-3 rounded-lg border border-[#E2E8E5] text-sm focus:outline-none focus:border-[#065F46]"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-[#0F1F1A] mb-1">Subject</label>
                <input
                  type="text"
                  required
                  minLength={2}
                  maxLength={MAX_LENGTHS.contactSubject}
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full h-10 px-3 rounded-lg border border-[#E2E8E5] text-sm focus:outline-none focus:border-[#065F46]"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#0F1F1A] mb-1">Message</label>
                <textarea
                  rows={4}
                  required
                  minLength={5}
                  maxLength={MAX_LENGTHS.contactMessage}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="w-full p-3 rounded-lg border border-[#E2E8E5] text-sm focus:outline-none focus:border-[#065F46]"
                />
              </div>
              <button
                type="submit"
                disabled={sending}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#065F46] text-white text-sm font-medium hover:bg-[#047857] transition-colors disabled:opacity-50"
              >
                <Send className="w-4 h-4" />
                {sending ? 'Sending...' : 'Send Message'}
              </button>
            </form>
          )}
        </div>
      </div>
    </section>
  );
};

/* ---------------- COMPLETE HOMEPAGE ---------------- */
export const HomePage: React.FC<NavProps> = ({ onNavigate, onEnterClassroom }) => {
  return (
    <div>
      {/* Hero Section */}
      <section className="relative bg-[#FAF9F6] border-b border-[#E2E8E5] islamic-lattice-bg">
        <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-stretch">
            <div className="lg:col-span-6 flex flex-col justify-center">
              <p className="text-xs font-semibold tracking-wide text-[#065F46] mb-3">
                Learn Quran. Understand Islam. Build a Better Future.
              </p>
              <h1
                className="font-display font-bold text-[#0F1F1A] leading-[1.1] tracking-tight"
                style={{ fontSize: 'clamp(2.25rem, 4vw, 3.65rem)', textWrap: 'balance' }}
              >
                Welcome to ZARTHOUGHTS QURAN ACADEMY
              </h1>
              <p className="mt-4 text-base sm:text-lg text-[#475A53] leading-relaxed max-w-xl">
                Your Online Destination for Quran Learning and Islamic Education. Study all 114
                Surahs with Urdu &amp; English Tafseer, join live Ijazah-certified classes, and track
                family progress in one serene portal.
              </p>

              <div className="mt-8 flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={() => onNavigate('auth')}
                  className="px-6 py-3 rounded-lg bg-[#065F46] text-white text-sm font-medium hover:bg-[#047857] transition-colors whitespace-nowrap shrink-0"
                >
                  Start Learning
                </button>
                <button
                  type="button"
                  onClick={() => onNavigate('quran')}
                  className="px-5 py-3 rounded-lg border border-[#065F46] bg-white text-[#065F46] text-sm font-medium hover:bg-emerald-50 transition-colors whitespace-nowrap shrink-0"
                >
                  Explore Holy Quran
                </button>
                <button
                  type="button"
                  onClick={() => onNavigate('live-classes')}
                  className="px-5 py-3 rounded-lg border border-[#D4AF37]/60 bg-white text-[#0F1F1A] text-sm font-medium hover:border-[#B8860B] transition-colors whitespace-nowrap shrink-0"
                >
                  Join Live Classes
                </button>
                <PWAInstallButton variant="subtle" />
              </div>
            </div>

            <div className="lg:col-span-6">
              <div className="h-full min-h-[300px] lg:min-h-[420px] rounded-2xl overflow-hidden border border-[#E2E8E5] bg-[#065F46]">
                <img
                  src={HERO_BANNER_IMAGE}
                  alt="Illuminated Holy Quran manuscript inside ZARTHOUGHTS QURAN ACADEMY"
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      <AboutSection />

      <div className="border-t border-[#E2E8E5] bg-[#FAF9F6]">
        <CoursesSection onNavigate={onNavigate} compact />
      </div>

      <LibrarySection onNavigate={onNavigate} compact />

      <div className="border-t border-[#E2E8E5] bg-[#FAF9F6]">
        <TeachersSection onNavigate={onNavigate} compact />
      </div>

      <LecturesSection onNavigate={onNavigate} compact />

      <div className="border-t border-[#E2E8E5] bg-[#FAF9F6]">
        <LiveClassesSection
          onNavigate={onNavigate}
          onEnterClassroom={onEnterClassroom}
          compact
        />
      </div>

      {/* Student & Parent Testimonials */}
      <section className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 py-14">
        <div className="mb-8">
          <p className="text-xs font-medium text-[#065F46] mb-1">Community Voices</p>
          <h2 className="font-display text-3xl sm:text-4xl font-bold text-[#0F1F1A]">
            Student &amp; Parent Testimonials
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {TESTIMONIALS.map((t) => (
            <blockquote
              key={t.name}
              className="bg-white border border-[#E2E8E5] rounded-2xl p-6 flex flex-col justify-between"
            >
              <p className="text-sm text-[#2D443D] leading-relaxed mb-5">&ldquo;{t.quote}&rdquo;</p>
              <footer className="pt-4 border-t border-[#F0F2F1]">
                <div className="text-sm font-semibold text-[#0F1F1A] flex items-center gap-2">
                  <Users className="w-3.5 h-3.5 text-[#065F46]" />
                  {t.name}
                </div>
                <div className="text-xs text-[#475A53] mt-0.5">{t.role}</div>
                <div className="text-[11px] text-[#475A53]">{t.location}</div>
              </footer>
            </blockquote>
          ))}
        </div>
      </section>

      <div className="border-t border-[#E2E8E5] bg-[#FAF9F6]">
        <ContactSection />
      </div>
    </div>
  );
};
