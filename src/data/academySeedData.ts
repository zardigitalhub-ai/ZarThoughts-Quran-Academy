import { Course, Lecture, LibraryItem, LiveClass, PublicTeacher } from '../types/academy';

export const HERO_BANNER_IMAGE = '/src/assets/images/hero_quran_academy_1795621227167.jpg';
export const COURSE_TAJWEED_IMAGE = '/src/assets/images/course_tajweed_card_1795621226986.jpg';
export const COURSE_HIFZ_IMAGE = '/src/assets/images/course_hifz_card_1795621227864.jpg';
export const TEACHER_MALE_IMAGE = '/src/assets/images/teacher_scholar_male_1795621227981.jpg';
export const TEACHER_FEMALE_IMAGE = '/src/assets/images/teacher_scholar_female_1795621227294.jpg';

export const SEED_TEACHERS: Omit<PublicTeacher, 'updatedAt'>[] = [
  {
    id: 'ustadh_tariq_mansoor',
    teacherId: 'ustadh_tariq_mansoor',
    displayName: 'Qari Tariq Al-Mansoor',
    photoURL: TEACHER_MALE_IMAGE,
    specialty: 'Ijazah in Hafs an Asim · Tajweed & Hifz Mentor',
    bio: 'Certified Qari with 14 years of online and seminary teaching experience guiding children and adults through Noorani Qaida, Tajweed articulation, and complete Hifz revision.',
    languages: 'Arabic, English, Urdu',
    approved: true,
  },
  {
    id: 'ustadha_maryam_siddiqui',
    teacherId: 'ustadha_maryam_siddiqui',
    displayName: 'Ustadha Maryam Siddiqui',
    photoURL: TEACHER_FEMALE_IMAGE,
    specialty: 'Tajweed Foundations · Sisters & Kids Quran',
    bio: 'Graduate in Usul al-Din specializing in interactive child-friendly Quran reading, Makhaarij precision, and thematic Tafseer study circles for sisters and families.',
    languages: 'English, Urdu, Arabic',
    approved: true,
  },
];

export const SEED_COURSES: Omit<Course, 'createdAt' | 'updatedAt'>[] = [
  {
    id: 'course_tajweed_mastery',
    title: 'Foundations of Tajweed & Articulation (Makhaarij)',
    category: 'Tajweed',
    level: 'Beginner',
    description:
      'Master letter articulation points, Noon and Meem Sakinah rules, Madd elongation, and fluent rhythmic recitation with live teacher feedback.',
    durationWeeks: 12,
    scheduleSummary: 'Mon & Wed · 18:00 UTC',
    teacherId: 'ustadha_maryam_siddiqui',
    teacherName: 'Ustadha Maryam Siddiqui',
    imageUrl: COURSE_TAJWEED_IMAGE,
    published: true,
  },
  {
    id: 'course_hifz_memorization',
    title: 'Structured Hifz & Juz Amma Memorization',
    category: 'Hifz',
    level: 'Intermediate',
    description:
      'Step-by-step memorization methodology combining daily Sabaq, Sabqi retention, and weekly Manzil review logs supervised by an Ijazah-certified Qari.',
    durationWeeks: 24,
    scheduleSummary: 'Tue & Thu · 19:00 UTC',
    teacherId: 'ustadh_tariq_mansoor',
    teacherName: 'Qari Tariq Al-Mansoor',
    imageUrl: COURSE_HIFZ_IMAGE,
    published: true,
  },
  {
    id: 'course_kids_nazra',
    title: 'Noorani Qaida & Kids Quran Reading (Nazra)',
    category: 'Kids Quran',
    level: 'Beginner',
    description:
      'Warm, encouraging small-group and one-on-one sessions designed for children aged 5 to 14 with parent progress summaries and gentle phonetic drills.',
    durationWeeks: 16,
    scheduleSummary: 'Sat & Sun · 15:00 UTC',
    teacherId: 'ustadha_maryam_siddiqui',
    teacherName: 'Ustadha Maryam Siddiqui',
    imageUrl: COURSE_TAJWEED_IMAGE,
    published: true,
  },
  {
    id: 'course_tafseer_reflection',
    title: 'Living with the Quran: Thematic Tafseer & Tadabbur',
    category: 'Tafseer',
    level: 'Intermediate',
    description:
      'Explore classical and contemporary Tafseer in English and Urdu across key Makki and Madani Surahs to connect revelation with daily character and family life.',
    durationWeeks: 10,
    scheduleSummary: 'Fridays · 17:30 UTC',
    teacherId: 'ustadh_tariq_mansoor',
    teacherName: 'Qari Tariq Al-Mansoor',
    imageUrl: COURSE_HIFZ_IMAGE,
    published: true,
  },
];

export const SEED_LIVE_CLASSES: Omit<LiveClass, 'createdAt' | 'updatedAt'>[] = [
  {
    id: 'live_tajweed_circle',
    title: 'Live Tajweed Recitation Clinic — Surah Al-Mulk',
    courseId: 'course_tajweed_mastery',
    teacherId: 'ustadha_maryam_siddiqui',
    teacherName: 'Ustadha Maryam Siddiqui',
    scheduledFor: 'Today · 18:00 UTC',
    durationMinutes: 60,
    meetingUrl: 'https://meet.jit.si/ZarthoughtsTajweedClinic',
    topic: 'Correcting Madd rules and Qalqalah in Surah Al-Mulk verses 1-15.',
    status: 'live',
  },
  {
    id: 'live_hifz_revision',
    title: 'Juz 30 Hifz & Sabqi Revision Session',
    courseId: 'course_hifz_memorization',
    teacherId: 'ustadh_tariq_mansoor',
    teacherName: 'Qari Tariq Al-Mansoor',
    scheduledFor: 'Tomorrow · 19:00 UTC',
    durationMinutes: 45,
    meetingUrl: 'https://meet.jit.si/ZarthoughtsHifzCircle',
    topic: 'Peer-paced memorization check for Surah An-Naba through An-Nas.',
    status: 'scheduled',
  },
  {
    id: 'live_kids_qaida',
    title: 'Children Noorani Qaida Interactive Workshop',
    courseId: 'course_kids_nazra',
    teacherId: 'ustadha_maryam_siddiqui',
    teacherName: 'Ustadha Maryam Siddiqui',
    scheduledFor: 'Saturday · 15:00 UTC',
    durationMinutes: 45,
    meetingUrl: 'https://meet.jit.si/ZarthoughtsKidsQaida',
    topic: 'Connecting Arabic letters with Harakat and joyful vocal practice.',
    status: 'scheduled',
  },
];

export const SEED_LIBRARY: Omit<LibraryItem, 'createdAt' | 'updatedAt'>[] = [
  {
    id: 'lib_noorani_qaida_guide',
    title: 'Noorani Qaida Illustrated Workbook',
    author: 'ZARTHOUGHTS Faculty',
    category: 'Quran & Tajweed',
    language: 'Arabic',
    description:
      'Foundational Arabic alphabet recognition, joined letter forms, Harakat vowels, Tanween, Sukoon, and Shaddah drills for beginners and children.',
    contentPreview:
      'Lesson 1: Individual Arabic Letters (Alif to Ya) — Focus on clear distinction between heavy (Tafkheem) and light (Tarqeeq) letters.\n\nLesson 2: Compound Letter Forms — How letters connect at the beginning, middle, and end of Quranic words.\n\nLesson 3: Short Vowels (Fathah, Kasrah, Dammah) — Consistent rhythmic timing without accidental elongation.',
    pages: 48,
    published: true,
    createdBy: 'system',
  },
  {
    id: 'lib_tafseer_fatihah_companion',
    title: 'Al-Fatihah: The Essence of Prayer & Guidance',
    author: 'Qari Tariq Al-Mansoor',
    category: 'Tafseer',
    language: 'English',
    description:
      'Concise verse-by-verse commentary explaining linguistic beauty, spiritual etiquette, and practical reflections on the Opening Chapter.',
    contentPreview:
      'Surah Al-Fatihah is called Umm al-Kitab (The Mother of the Book) because it summarizes the core pillars of Islamic faith: praise of Allah, recognition of His Mercy and Justice, sincere worship, reliance upon His aid, and steadfast guidance.',
    pages: 64,
    published: true,
    createdBy: 'system',
  },
  {
    id: 'lib_masnoon_duas_urdu',
    title: 'Masnoon Duain & Daily Azkar Companion',
    author: 'Ustadha Maryam Siddiqui',
    category: 'Hadith',
    language: 'Urdu',
    description:
      'Authentic morning, evening, and study supplications with Arabic text, Urdu translation, and daily family reading checklist.',
    contentPreview:
      'صبح و شام کے مسنون اذکار اور علم میں اضافے کی دعا:\nرَبِّ زِدْنِی عِلْمًا — اے میرے رب! میرے علم میں اضافہ فرما۔\nبندے کا ہر دن اللہ کے ذکر اور شکر کے ساتھ شروع ہونا چاہیے۔',
    pages: 36,
    published: true,
    createdBy: 'system',
  },
  {
    id: 'lib_seerah_youth_stories',
    title: 'Mercy to the Worlds: Seerah Stories for Young Learners',
    author: 'ZARTHOUGHTS Curriculum Board',
    category: 'Kids Stories',
    language: 'English',
    description:
      'Age-appropriate stories from the life of Prophet Muhammad (peace be upon him) highlighting honesty, kindness to neighbors, and love of learning.',
    contentPreview:
      'Chapter 1: Al-Amin (The Trustworthy) — Even before prophethood, young Muhammad (peace be upon him) earned universal respect in Makkah for keeping promises, caring for orphans, and speaking the truth with gentleness.',
    pages: 52,
    published: true,
    createdBy: 'system',
  },
];

export const SEED_LECTURES: Omit<Lecture, 'createdAt' | 'updatedAt'>[] = [
  {
    id: 'lec_etiquette_quran',
    title: 'Adab of Reciting and Reflecting Upon the Holy Quran',
    speaker: 'Qari Tariq Al-Mansoor',
    category: 'Quranic Sciences',
    durationLabel: '28 min',
    summary:
      'Practical guidance on inward sincerity, wudu, measured pace (Tartil), and cultivating a daily Quran habit alongside school or work.',
    mediaUrl: 'https://everyayah.com/data/Alafasy_128kbps/001001.mp3',
    published: true,
    createdBy: 'system',
  },
  {
    id: 'lec_raising_quran_home',
    title: 'Building a Quran-Centered Home for Children and Parents',
    speaker: 'Ustadha Maryam Siddiqui',
    category: 'Family & Tarbiyah',
    durationLabel: '34 min',
    summary:
      'How parents and guardians can nurture lifelong love for the Quran through gentle encouragement, shared evening recitation, and patient consistency.',
    mediaUrl: 'https://everyayah.com/data/Alafasy_128kbps/112001.mp3',
    published: true,
    createdBy: 'system',
  },
  {
    id: 'lec_tajweed_pillars',
    title: 'The Four Pillars of Clear Tajweed Recitation',
    speaker: 'Qari Tariq Al-Mansoor',
    category: 'Tajweed',
    durationLabel: '22 min',
    summary:
      'A clear breakdown of Makhaarij (articulation), Sifaat (letter qualities), Ghunnah nasalization, and balanced Madd lengths.',
    mediaUrl: 'https://everyayah.com/data/Husary_128kbps/001001.mp3',
    published: true,
    createdBy: 'system',
  },
];

export const TESTIMONIALS = [
  {
    name: 'Amina Farooq',
    role: 'Parent of two students (ages 8 and 11)',
    location: 'London, United Kingdom',
    quote:
      'Within four months at ZARTHOUGHTS QURAN ACADEMY, both of my children moved from hesitant letter recognition to reciting Juz Amma fluently with proper Tajweed and weekly parent progress reports.',
  },
  {
    name: 'Bilal Ahmad',
    role: 'Adult Tajweed & Tafseer Learner',
    location: 'Toronto, Canada',
    quote:
      'Having the 114-Surah reader with Urdu and English Tafseer side-by-side with live weekend clinics allowed me to correct years of pronunciation mistakes without interrupting my work schedule.',
  },
  {
    name: 'Dr. Safiya Rahman',
    role: 'Hifz Revision Student',
    location: 'Kuala Lumpur, Malaysia',
    quote:
      'The ayah-repeat audio controls and structured Sabqi tracking brought real discipline back to my daily revision. Every screen is calm, respectful, and easy to focus on.',
  },
];
