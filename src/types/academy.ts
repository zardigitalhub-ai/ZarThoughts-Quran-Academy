export type UserRole = 'student' | 'parent' | 'teacher' | 'super_admin';

export type ParentalConsentStatus = 'not_required' | 'pending' | 'approved';

export const BOOTSTRAP_ADMIN_EMAIL = 'zardigitalhub@gmail.com';

export const MAX_LENGTHS = {
  displayName: 120,
  email: 254,
  phone: 40,
  bio: 600,
  teacherSpecialty: 200,
  teacherBio: 1000,
  courseTitle: 160,
  courseDescription: 1200,
  scheduleSummary: 160,
  liveTitle: 160,
  liveTopic: 300,
  libraryTitle: 180,
  libraryDescription: 1000,
  libraryPreview: 4000,
  lectureTitle: 180,
  lectureSummary: 1200,
  note: 1000,
  contactSubject: 160,
  contactMessage: 2000,
} as const;

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  role: UserRole;
  isMinor: boolean;
  guardianEmail?: string;
  guardianUid?: string;
  parentalConsentStatus: ParentalConsentStatus;
  teacherApproved: boolean;
  teacherSpecialty?: string;
  teacherBio?: string;
  phone?: string;
  bio?: string;
  emailVerified: boolean;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface PublicTeacher {
  id: string;
  teacherId: string;
  displayName: string;
  photoURL?: string;
  specialty: string;
  bio?: string;
  languages?: string;
  approved: boolean;
  updatedAt?: unknown;
}

export type CourseCategory =
  | 'Tajweed'
  | 'Hifz'
  | 'Nazra'
  | 'Tafseer'
  | 'Islamic Studies'
  | 'Kids Quran';

export type CourseLevel = 'Beginner' | 'Intermediate' | 'Advanced';

export interface Course {
  id: string;
  title: string;
  category: CourseCategory;
  level: CourseLevel;
  description: string;
  durationWeeks: number;
  scheduleSummary?: string;
  teacherId: string;
  teacherName: string;
  imageUrl?: string;
  published: boolean;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface Enrollment {
  id: string;
  studentId: string;
  studentName: string;
  courseId: string;
  courseTitle: string;
  guardianId?: string;
  status: 'active' | 'completed' | 'paused';
  progressPercent: number;
  lastSurah?: number;
  lastAyah?: number;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface LiveClass {
  id: string;
  title: string;
  courseId?: string;
  teacherId: string;
  teacherName: string;
  scheduledFor: string;
  durationMinutes: number;
  meetingUrl?: string;
  topic?: string;
  status: 'scheduled' | 'live' | 'completed';
  allowStudentDraw?: boolean;
  boardSurah?: number;
  boardAyah?: number;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export type WhiteboardTool =
  | 'pen'
  | 'highlighter'
  | 'line'
  | 'rect'
  | 'circle'
  | 'text'
  | 'eraser';

export interface WhiteboardStroke {
  id: string;
  authorUid: string;
  authorName: string;
  tool: WhiteboardTool;
  color: string;
  lineWidth: number;
  xs: number[];
  ys: number[];
  text?: string;
  seq: number;
  createdAt?: unknown;
}

export interface ClassroomChatMessage {
  id: string;
  senderUid: string;
  senderName: string;
  senderRole: UserRole;
  message: string;
  createdAt?: unknown;
}

export interface ClassroomParticipant {
  id: string;
  uid: string;
  displayName: string;
  role: UserRole;
  handRaised: boolean;
  lastActiveAt?: unknown;
}

export type LibraryCategory =
  | 'Quran & Tajweed'
  | 'Tafseer'
  | 'Hadith'
  | 'Seerah'
  | 'Fiqh'
  | 'Kids Stories';

export interface LibraryItem {
  id: string;
  title: string;
  author: string;
  category: LibraryCategory;
  language: 'English' | 'Urdu' | 'Arabic';
  description: string;
  contentPreview?: string;
  pages?: number;
  published: boolean;
  createdBy: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface Lecture {
  id: string;
  title: string;
  speaker: string;
  category: string;
  durationLabel: string;
  summary: string;
  mediaUrl?: string;
  published: boolean;
  createdBy: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface QuranProgress {
  id: string;
  userId: string;
  guardianId?: string;
  surahNumber: number;
  surahName: string;
  ayahNumber: number;
  juzNumber: number;
  pageNumber: number;
  note?: string;
  isBookmark: boolean;
  updatedAt?: unknown;
}

export interface GuardianLink {
  id: string;
  parentUid: string;
  parentEmail: string;
  childUid?: string;
  childName: string;
  childAge: number;
  consentGranted: boolean;
  dailyLimitMinutes?: number;
  notes?: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface ContactMessage {
  id: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  status: 'new' | 'reviewed';
  createdAt?: unknown;
}

export interface SurahMeta {
  number: number;
  arabicName: string;
  englishName: string;
  transliteration: string;
  revelationType: 'Meccan' | 'Medinan';
  ayahCount: number;
  juzStart: number;
  pageStart: number;
}

export interface JuzMeta {
  juzNumber: number;
  arabicName: string;
  englishTitle: string;
  startSurah: number;
  startAyah: number;
  endSurah: number;
  endAyah: number;
  pageStart: number;
}

export interface WordToken {
  position: number;
  arabic: string;
  transliteration: string;
  english: string;
  urdu: string;
}

export interface AyahData {
  numberInSurah: number;
  globalNumber: number;
  juz: number;
  page: number;
  arabicText: string;
  englishText: string;
  urduText: string;
  englishTafseer?: string;
  urduTafseer?: string;
  words: WordToken[];
}

export type AppView =
  | 'home'
  | 'quran'
  | 'courses'
  | 'live-classes'
  | 'classroom'
  | 'library'
  | 'lectures'
  | 'teachers'
  | 'about'
  | 'contact'
  | 'auth'
  | 'dashboard';
