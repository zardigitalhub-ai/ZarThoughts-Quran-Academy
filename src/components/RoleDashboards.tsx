import React, { useEffect, useState } from 'react';
import {
  BookOpen,
  Calendar,
  Camera,
  CheckCircle2,
  Database,
  LogOut,
  Mail,
  Plus,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  Trash2,
  UserCheck,
  Users,
  Video,
} from 'lucide-react';
import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { useAuth } from '../context/AuthContext';
import { db, handleFirestoreError, OperationType, storage } from '../lib/firebase';
import {
  AppView,
  ContactMessage,
  CourseCategory,
  CourseLevel,
  LibraryCategory,
  LiveClass,
  MAX_LENGTHS,
  UserProfile,
} from '../types/academy';
import { COURSE_TAJWEED_IMAGE } from '../data/academySeedData';

interface RoleDashboardsProps {
  onNavigate: (view: AppView) => void;
  onEnterClassroom: (session: LiveClass) => void;
}

export const RoleDashboards: React.FC<RoleDashboardsProps> = ({
  onNavigate,
  onEnterClassroom,
}) => {
  const {
    firebaseUser,
    profile,
    courses,
    enrollments,
    quranProgress,
    guardianLinks,
    liveClasses,
    logout,
    resendVerificationEmail,
    refreshUserSession,
    updateMyProfile,
    seedInitialAcademyData,
    sendResetPassword,
  } = useAuth();

  const [tab, setTab] = useState<'overview' | 'profile' | 'cms' | 'approvals'>('overview');
  const [statusBanner, setStatusBanner] = useState<string | null>(null);

  // Admin-specific real-time lists
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [contactMessages, setContactMessages] = useState<ContactMessage[]>([]);
  const [minorStudentsForParent, setMinorStudentsForParent] = useState<UserProfile[]>([]);

  // Profile edit form state
  const [displayName, setDisplayName] = useState(profile?.displayName || '');
  const [phone, setPhone] = useState(profile?.phone || '');
  const [bio, setBio] = useState(profile?.bio || '');
  const [teacherSpecialty, setTeacherSpecialty] = useState(profile?.teacherSpecialty || '');
  const [teacherBio, setTeacherBio] = useState(profile?.teacherBio || '');
  const [guardianEmailInput, setGuardianEmailInput] = useState(profile?.guardianEmail || '');
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  // Parent: Add Child / Consent form
  const [childName, setChildName] = useState('');
  const [childAge, setChildAge] = useState('9');
  const [dailyLimit, setDailyLimit] = useState('45');
  const [childNotes, setChildNotes] = useState('');
  const [consentChecked, setConsentChecked] = useState(true);

  // CMS: Create Course
  const [newCourseTitle, setNewCourseTitle] = useState('');
  const [newCourseCat, setNewCourseCat] = useState<CourseCategory>('Tajweed');
  const [newCourseLevel, setNewCourseLevel] = useState<CourseLevel>('Beginner');
  const [newCourseDesc, setNewCourseDesc] = useState('');
  const [newCourseWeeks, setNewCourseWeeks] = useState('12');
  const [newCourseSchedule, setNewCourseSchedule] = useState('Sat & Sun · 17:00 UTC');

  // CMS: Create Live Class
  const [liveTitle, setLiveTitle] = useState('');
  const [liveWhen, setLiveWhen] = useState('Friday · 18:00 UTC');
  const [liveDuration, setLiveDuration] = useState('45');
  const [liveUrl, setLiveUrl] = useState('https://meet.jit.si/ZarthoughtsAcademyRoom');
  const [liveTopic, setLiveTopic] = useState('');

  // CMS: Create Library Item
  const [libTitle, setLibTitle] = useState('');
  const [libAuthor, setLibAuthor] = useState('');
  const [libCat, setLibCat] = useState<LibraryCategory>('Quran & Tajweed');
  const [libLang, setLibLang] = useState<'English' | 'Urdu' | 'Arabic'>('English');
  const [libDesc, setLibDesc] = useState('');

  // CMS: Create Lecture
  const [lecTitle, setLecTitle] = useState('');
  const [lecSpeaker, setLecSpeaker] = useState('');
  const [lecCat, setLecCat] = useState('Quranic Sciences');
  const [lecDuration, setLecDuration] = useState('25 min');
  const [lecSummary, setLecSummary] = useState('');

  useEffect(() => {
    if (profile) {
      setDisplayName(profile.displayName || '');
      setPhone(profile.phone || '');
      setBio(profile.bio || '');
      setTeacherSpecialty(profile.teacherSpecialty || '');
      setTeacherBio(profile.teacherBio || '');
      setGuardianEmailInput(profile.guardianEmail || '');
    }
  }, [profile]);

  // Admin subscriptions
  useEffect(() => {
    if (!firebaseUser || profile?.role !== 'super_admin') return;

    const unsubUsers = onSnapshot(
      collection(db, 'users'),
      (snap) => {
        setAllUsers(snap.docs.map((d) => d.data() as UserProfile));
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'users')
    );

    const unsubMessages = onSnapshot(
      collection(db, 'contact_messages'),
      (snap) => {
        setContactMessages(
          snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<ContactMessage, 'id'>) }))
        );
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'contact_messages')
    );

    return () => {
      unsubUsers();
      unsubMessages();
    };
  }, [firebaseUser, profile?.role]);

  // Parent subscription to minor students matching guardianEmail
  useEffect(() => {
    if (!firebaseUser || !firebaseUser.emailVerified || profile?.role !== 'parent') return;
    const parentEmail = firebaseUser.email;
    if (!parentEmail) return;

    const q = query(collection(db, 'users'), where('guardianEmail', '==', parentEmail));
    const unsub = onSnapshot(
      q,
      (snap) => {
        setMinorStudentsForParent(snap.docs.map((d) => d.data() as UserProfile));
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'users')
    );
    return () => unsub();
  }, [firebaseUser, profile?.role]);

  if (!firebaseUser || !profile) {
    return (
      <section className="max-w-lg mx-auto px-4 py-16 text-center">
        <h2 className="font-display text-3xl font-bold text-[#0F1F1A] mb-3">
          Sign in to access your Academy Portal
        </h2>
        <p className="text-sm text-[#475A53] mb-6">
          Access Student, Parent/Guardian, Teacher, or Super Admin tools.
        </p>
        <button
          type="button"
          onClick={() => onNavigate('auth')}
          className="px-6 py-2.5 rounded-lg bg-[#065F46] text-white text-sm font-medium"
        >
          Go to Sign In
        </button>
      </section>
    );
  }

  const notify = (msg: string) => {
    setStatusBanner(msg);
    setTimeout(() => setStatusBanner(null), 4500);
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !firebaseUser) return;
    setUploadingPhoto(true);
    try {
      const storageRef = ref(storage, `avatars/${firebaseUser.uid}_${Date.now()}`);
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);
      await updateMyProfile({ photoURL: url });
      notify('Profile picture updated.');
    } catch {
      // Fallback: resize image via canvas into a compact data URL <= 450 chars if storage bucket rules block upload
      try {
        const reader = new FileReader();
        reader.onload = async () => {
          const img = new Image();
          img.onload = async () => {
            const canvas = document.createElement('canvas');
            canvas.width = 48;
            canvas.height = 48;
            const ctx = canvas.getContext('2d');
            if (ctx) {
              ctx.drawImage(img, 0, 0, 48, 48);
              const compact = canvas.toDataURL('image/webp', 0.4);
              if (compact.length <= 500) {
                await updateMyProfile({ photoURL: compact });
                notify('Profile picture saved.');
              } else {
                notify('Please paste an image URL or try a smaller image file.');
              }
            }
          };
          img.src = String(reader.result);
        };
        reader.readAsDataURL(file);
      } catch {
        notify('Unable to upload image right now.');
      }
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    await updateMyProfile({
      displayName,
      phone,
      bio,
      teacherSpecialty: profile.role === 'teacher' ? teacherSpecialty : undefined,
      teacherBio: profile.role === 'teacher' ? teacherBio : undefined,
      guardianEmail: profile.isMinor ? guardianEmailInput : undefined,
    });
    notify('Profile changes saved.');
  };

  const handleApproveTeacher = async (target: UserProfile, approve: boolean) => {
    try {
      await updateDoc(doc(db, 'users', target.uid), {
        teacherApproved: approve,
        updatedAt: serverTimestamp(),
      });
      await setDoc(doc(db, 'public_teachers', target.uid), {
        teacherId: target.uid,
        displayName: target.displayName.slice(0, MAX_LENGTHS.displayName),
        photoURL: target.photoURL || '',
        specialty: (target.teacherSpecialty || 'Quran & Tajweed Instructor').slice(
          0,
          MAX_LENGTHS.teacherSpecialty
        ),
        bio: (target.teacherBio || 'Certified instructor at ZARTHOUGHTS QURAN ACADEMY.').slice(
          0,
          MAX_LENGTHS.teacherBio
        ),
        languages: 'Arabic, English, Urdu',
        approved: approve,
        updatedAt: serverTimestamp(),
      });
      notify(
        approve
          ? `${target.displayName} approved and published to Faculty.`
          : `${target.displayName} approval paused.`
      );
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `users/${target.uid}`);
    }
  };

  const handleAdminUpdateConsent = async (
    target: UserProfile,
    status: 'approved' | 'pending'
  ) => {
    try {
      await updateDoc(doc(db, 'users', target.uid), {
        parentalConsentStatus: status,
        updatedAt: serverTimestamp(),
      });
      notify(`Updated parental consent for ${target.displayName} to ${status}.`);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `users/${target.uid}`);
    }
  };

  const handleParentApproveChild = async (child: UserProfile) => {
    try {
      await updateDoc(doc(db, 'users', child.uid), {
        parentalConsentStatus: 'approved',
        guardianUid: firebaseUser.uid,
        updatedAt: serverTimestamp(),
      });
      notify(`Parental consent approved for ${child.displayName}.`);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `users/${child.uid}`);
    }
  };

  const handleCreateGuardianLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!childName.trim()) return;
    const id = `glink_${firebaseUser.uid}_${Date.now()}`;
    try {
      await setDoc(doc(db, 'guardian_links', id), {
        parentUid: firebaseUser.uid,
        parentEmail: (firebaseUser.email || profile.email).slice(0, MAX_LENGTHS.email),
        childName: childName.trim().slice(0, MAX_LENGTHS.displayName),
        childAge: Math.max(3, Math.min(17, Number(childAge) || 8)),
        consentGranted: consentChecked,
        dailyLimitMinutes: Math.max(10, Math.min(480, Number(dailyLimit) || 45)),
        notes: childNotes.trim().slice(0, 500),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      setChildName('');
      setChildNotes('');
      notify('Child profile and parental consent record saved.');
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `guardian_links/${id}`);
    }
  };

  const handleCreateCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    const id = `course_${Date.now()}`;
    try {
      await setDoc(doc(db, 'courses', id), {
        title: newCourseTitle.trim().slice(0, MAX_LENGTHS.courseTitle),
        category: newCourseCat,
        level: newCourseLevel,
        description: newCourseDesc.trim().slice(0, MAX_LENGTHS.courseDescription),
        durationWeeks: Math.max(1, Math.min(260, Number(newCourseWeeks) || 12)),
        scheduleSummary: newCourseSchedule.trim().slice(0, MAX_LENGTHS.scheduleSummary),
        teacherId: firebaseUser.uid,
        teacherName: profile.displayName.slice(0, MAX_LENGTHS.displayName),
        imageUrl: COURSE_TAJWEED_IMAGE,
        published: true,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      setNewCourseTitle('');
      setNewCourseDesc('');
      notify('New course published to the academy catalog.');
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `courses/${id}`);
    }
  };

  const handleCreateLiveClass = async (e: React.FormEvent) => {
    e.preventDefault();
    const id = `live_${Date.now()}`;
    try {
      await setDoc(doc(db, 'live_classes', id), {
        title: liveTitle.trim().slice(0, MAX_LENGTHS.liveTitle),
        teacherId: firebaseUser.uid,
        teacherName: profile.displayName.slice(0, MAX_LENGTHS.displayName),
        scheduledFor: liveWhen.trim().slice(0, 64),
        durationMinutes: Math.max(10, Math.min(300, Number(liveDuration) || 45)),
        meetingUrl: liveUrl.trim().slice(0, 500),
        topic: liveTopic.trim().slice(0, MAX_LENGTHS.liveTopic),
        status: 'scheduled',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      setLiveTitle('');
      setLiveTopic('');
      notify('Live class scheduled.');
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `live_classes/${id}`);
    }
  };

  const handleCreateLibraryItem = async (e: React.FormEvent) => {
    e.preventDefault();
    const id = `lib_${Date.now()}`;
    try {
      await setDoc(doc(db, 'library_items', id), {
        title: libTitle.trim().slice(0, MAX_LENGTHS.libraryTitle),
        author: libAuthor.trim().slice(0, MAX_LENGTHS.displayName),
        category: libCat,
        language: libLang,
        description: libDesc.trim().slice(0, MAX_LENGTHS.libraryDescription),
        contentPreview: libDesc.trim().slice(0, MAX_LENGTHS.libraryPreview),
        pages: 24,
        published: true,
        createdBy: firebaseUser.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      setLibTitle('');
      setLibAuthor('');
      setLibDesc('');
      notify('Resource added to the Islamic Digital Library.');
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `library_items/${id}`);
    }
  };

  const handleCreateLecture = async (e: React.FormEvent) => {
    e.preventDefault();
    const id = `lec_${Date.now()}`;
    try {
      await setDoc(doc(db, 'lectures', id), {
        title: lecTitle.trim().slice(0, MAX_LENGTHS.lectureTitle),
        speaker: lecSpeaker.trim().slice(0, MAX_LENGTHS.displayName),
        category: lecCat.trim().slice(0, 80),
        durationLabel: lecDuration.trim().slice(0, 30),
        summary: lecSummary.trim().slice(0, MAX_LENGTHS.lectureSummary),
        mediaUrl: 'https://everyayah.com/data/Alafasy_128kbps/001001.mp3',
        published: true,
        createdBy: firebaseUser.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      setLecTitle('');
      setLecSpeaker('');
      setLecSummary('');
      notify('Lecture published.');
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `lectures/${id}`);
    }
  };

  const canManageContent =
    profile.role === 'super_admin' ||
    (profile.role === 'teacher' && profile.teacherApproved === true);

  const roleDisplayName: Record<string, string> = {
    super_admin: 'Super Administrator',
    teacher: profile.teacherApproved ? 'Approved Teacher' : 'Teacher (Pending Approval)',
    student: 'Student',
    parent: 'Parent / Guardian',
  };

  return (
    <section className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {/* Header Summary */}
      <div className="bg-white border border-[#E2E8E5] rounded-2xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-6 mb-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-[#065F46] text-white flex items-center justify-center font-display text-2xl font-bold overflow-hidden shrink-0">
            {profile.photoURL ? (
              <img
                src={profile.photoURL}
                alt={profile.displayName}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover"
              />
            ) : (
              profile.displayName.charAt(0).toUpperCase()
            )}
          </div>
          <div>
            <p className="text-xs font-medium text-[#065F46]">{roleDisplayName[profile.role]}</p>
            <h1 className="font-display text-2xl sm:text-3xl font-bold text-[#0F1F1A]">
              {profile.displayName}
            </h1>
            <p className="text-xs text-[#475A53] mt-0.5">{profile.email}</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex p-1 bg-[#F6F8F7] border border-[#E2E8E5] rounded-lg">
            <button
              type="button"
              onClick={() => setTab('overview')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md ${
                tab === 'overview' ? 'bg-white text-[#0F1F1A] shadow-xs' : 'text-[#475A53]'
              }`}
            >
              Dashboard
            </button>
            {canManageContent && (
              <button
                type="button"
                onClick={() => setTab('cms')}
                className={`px-3 py-1.5 text-xs font-medium rounded-md ${
                  tab === 'cms' ? 'bg-white text-[#0F1F1A] shadow-xs' : 'text-[#475A53]'
                }`}
              >
                Content Studio
              </button>
            )}
            {profile.role === 'super_admin' && (
              <button
                type="button"
                onClick={() => setTab('approvals')}
                className={`px-3 py-1.5 text-xs font-medium rounded-md ${
                  tab === 'approvals' ? 'bg-white text-[#0F1F1A] shadow-xs' : 'text-[#475A53]'
                }`}
              >
                Approvals &amp; Inbox
              </button>
            )}
            <button
              type="button"
              onClick={() => setTab('profile')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md ${
                tab === 'profile' ? 'bg-white text-[#0F1F1A] shadow-xs' : 'text-[#475A53]'
              }`}
            >
              Profile
            </button>
          </div>

          <button
            type="button"
            onClick={() => void logout()}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-[#E2E8E5] text-xs font-medium text-[#0F1F1A] hover:border-red-300 hover:text-red-700 transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            Logout
          </button>
        </div>
      </div>

      {/* Verification / Role Alerts */}
      {!firebaseUser.emailVerified && (
        <div className="mb-6 rounded-xl border border-amber-300 bg-amber-50 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-2.5 text-xs text-amber-900">
            <Mail className="w-4 h-4 shrink-0 mt-0.5" />
            <span>
              Your email address is not yet verified. Please click the verification link in your
              inbox to unlock enrollment, bookmarks, and dashboard updates.
            </span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => void resendVerificationEmail().then(() => notify('Verification email sent.'))}
              className="px-3 py-1.5 rounded-lg bg-white border border-amber-300 text-xs font-medium text-amber-900"
            >
              Resend Email
            </button>
            <button
              type="button"
              onClick={() => void refreshUserSession()}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#065F46] text-white text-xs font-medium"
            >
              <RefreshCw className="w-3 h-3" /> I Verified
            </button>
          </div>
        </div>
      )}

      {profile.role === 'teacher' && !profile.teacherApproved && (
        <div className="mb-6 rounded-xl border border-amber-300 bg-amber-50 p-4 flex items-start gap-2.5 text-xs text-amber-900">
          <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
          <span>
            Your Teacher application is awaiting Super Admin verification. Once approved, your
            Content Studio and Live Classroom scheduling tools will unlock automatically.
          </span>
        </div>
      )}

      {profile.isMinor && profile.parentalConsentStatus !== 'approved' && (
        <div className="mb-6 rounded-xl border border-amber-300 bg-amber-50 p-4 flex items-start gap-2.5 text-xs text-amber-900">
          <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5" />
          <span>
            Parental Consent Status: <strong>{profile.parentalConsentStatus}</strong>. Your
            guardian ({profile.guardianEmail || 'not assigned'}) or Academy Admin can approve
            parental consent from the Parent Portal.
          </span>
        </div>
      )}

      {statusBanner && (
        <div
          role="status"
          className="mb-6 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs font-medium text-[#065F46]"
        >
          <CheckCircle2 className="w-4 h-4" />
          <span>{statusBanner}</span>
        </div>
      )}

      {/* TAB: OVERVIEW */}
      {tab === 'overview' && (
        <div className="space-y-8">
          {/* Quick Role Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 tabular-nums">
            <div className="bg-white border border-[#E2E8E5] rounded-2xl p-5">
              <div className="text-xs text-[#475A53]">Active Enrollments</div>
              <div className="font-display text-3xl font-bold text-[#065F46] mt-1">
                {enrollments.length}
              </div>
            </div>
            <div className="bg-white border border-[#E2E8E5] rounded-2xl p-5">
              <div className="text-xs text-[#475A53]">Quran Bookmarks</div>
              <div className="font-display text-3xl font-bold text-[#065F46] mt-1">
                {quranProgress.length}
              </div>
            </div>
            <div className="bg-white border border-[#E2E8E5] rounded-2xl p-5">
              <div className="text-xs text-[#475A53]">Live Classes Available</div>
              <div className="font-display text-3xl font-bold text-[#065F46] mt-1">
                {liveClasses.length}
              </div>
            </div>
            <div className="bg-white border border-[#E2E8E5] rounded-2xl p-5">
              <div className="text-xs text-[#475A53]">
                {profile.role === 'super_admin'
                  ? 'Registered Accounts'
                  : profile.role === 'parent'
                  ? 'Children Linked'
                  : 'Courses Available'}
              </div>
              <div className="font-display text-3xl font-bold text-[#065F46] mt-1">
                {profile.role === 'super_admin'
                  ? allUsers.length
                  : profile.role === 'parent'
                  ? guardianLinks.length + minorStudentsForParent.length
                  : courses.length}
              </div>
            </div>
          </div>

          {/* Interactive Live Whiteboard Classrooms (Students Join / Teachers Host) */}
          <div className="bg-white border border-[#E2E8E5] rounded-2xl p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
              <div>
                <h2 className="font-display text-2xl font-bold text-[#0F1F1A] flex items-center gap-2">
                  <Video className="w-5 h-5 text-[#065F46]" />
                  Live Whiteboard Classrooms
                </h2>
                <p className="text-xs text-[#475A53] mt-1">
                  {canManageContent
                    ? 'Open any session below to teach on the interactive whiteboard, or start an instant live class.'
                    : 'Join a live classroom below to learn on your teacher’s real-time whiteboard and ask questions.'}
                </p>
              </div>
              {canManageContent && (
                <button
                  type="button"
                  onClick={async () => {
                    const id = `live_instant_${Date.now()}`;
                    const instantSession: LiveClass = {
                      id,
                      title: `${profile.displayName}'s Live Quran & Tajweed Class`,
                      teacherId: firebaseUser.uid,
                      teacherName: profile.displayName.slice(0, MAX_LENGTHS.displayName),
                      scheduledFor: 'Live Now',
                      durationMinutes: 45,
                      topic: 'Interactive Quran recitation & Tajweed whiteboard session',
                      status: 'live',
                      allowStudentDraw: false,
                    };
                    try {
                      await setDoc(doc(db, 'live_classes', id), {
                        ...instantSession,
                        createdAt: serverTimestamp(),
                        updatedAt: serverTimestamp(),
                      });
                      onEnterClassroom(instantSession);
                    } catch (err) {
                      handleFirestoreError(err, OperationType.CREATE, `live_classes/${id}`);
                    }
                  }}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#065F46] text-white text-xs font-medium hover:bg-[#047857] whitespace-nowrap shrink-0"
                >
                  <Plus className="w-4 h-4" />
                  Start Instant Whiteboard Class
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {liveClasses.slice(0, 6).map((lc) => (
                <div
                  key={lc.id}
                  className="p-4 rounded-xl bg-[#FAF9F6] border border-[#E2E8E5] flex flex-col justify-between gap-3"
                >
                  <div>
                    <div className="text-[11px] font-medium text-[#065F46] mb-1">
                      {lc.status === 'live' ? 'Live Now' : lc.status === 'completed' ? 'Completed' : 'Scheduled'} · {lc.scheduledFor}
                    </div>
                    <div className="text-sm font-semibold text-[#0F1F1A]">{lc.title}</div>
                    <div className="text-xs text-[#475A53] mt-1">Teacher: {lc.teacherName}</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => onEnterClassroom(lc)}
                    className="w-full py-2 rounded-lg bg-[#065F46] text-white text-xs font-medium hover:bg-[#047857]"
                  >
                    {canManageContent ? 'Open Teacher Whiteboard' : 'Enter Live Classroom'}
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Super Admin Quick Bootstrap Action */}
          {profile.role === 'super_admin' && (
            <div className="bg-[#FAF9F6] border border-[#D4AF37]/50 rounded-2xl p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-[#0F1F1A]">
                  Academy Database Synchronization
                </h2>
                <p className="text-xs text-[#475A53] mt-1">
                  Populate Firestore with the default courses, live classes, faculty cards, digital
                  library books, and lectures so all users receive live database updates.
                </p>
              </div>
              <button
                type="button"
                onClick={() =>
                  void seedInitialAcademyData().then(() =>
                    notify('Firestore academy catalog synchronized.')
                  )
                }
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#065F46] text-white text-xs font-medium hover:bg-[#047857] whitespace-nowrap shrink-0"
              >
                <Database className="w-4 h-4" />
                Sync Catalog to Firestore
              </button>
            </div>
          )}

          {/* Parent / Guardian Management */}
          {(profile.role === 'parent' || profile.role === 'super_admin') && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <div className="lg:col-span-5 bg-white border border-[#E2E8E5] rounded-2xl p-6">
                <h2 className="font-display text-2xl font-bold text-[#0F1F1A] mb-2">
                  Add Child &amp; Parental Consent
                </h2>
                <p className="text-xs text-[#475A53] mb-4">
                  Register a child under guardian supervision and set daily Quran study limits.
                </p>
                <form onSubmit={handleCreateGuardianLink} className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-[#0F1F1A] mb-1">
                      Child Name
                    </label>
                    <input
                      type="text"
                      required
                      maxLength={MAX_LENGTHS.displayName}
                      value={childName}
                      onChange={(e) => setChildName(e.target.value)}
                      placeholder="e.g., Yusuf Ali"
                      className="w-full h-10 px-3 rounded-lg border border-[#E2E8E5] text-sm"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-[#0F1F1A] mb-1">
                        Age (3–17)
                      </label>
                      <input
                        type="number"
                        min={3}
                        max={17}
                        value={childAge}
                        onChange={(e) => setChildAge(e.target.value)}
                        className="w-full h-10 px-3 rounded-lg border border-[#E2E8E5] text-sm tabular-nums"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-[#0F1F1A] mb-1">
                        Daily Limit (min)
                      </label>
                      <input
                        type="number"
                        min={10}
                        max={480}
                        value={dailyLimit}
                        onChange={(e) => setDailyLimit(e.target.value)}
                        className="w-full h-10 px-3 rounded-lg border border-[#E2E8E5] text-sm tabular-nums"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-[#0F1F1A] mb-1">
                      Learning Goals
                    </label>
                    <input
                      type="text"
                      maxLength={500}
                      value={childNotes}
                      onChange={(e) => setChildNotes(e.target.value)}
                      placeholder="Noorani Qaida & Surah Al-Mulk"
                      className="w-full h-10 px-3 rounded-lg border border-[#E2E8E5] text-sm"
                    />
                  </div>
                  <label className="flex items-center gap-2 text-xs text-[#0F1F1A] pt-1">
                    <input
                      type="checkbox"
                      checked={consentChecked}
                      onChange={(e) => setConsentChecked(e.target.checked)}
                    />
                    I grant verified parental consent for supervised classes
                  </label>
                  <button
                    type="submit"
                    className="w-full py-2.5 rounded-lg bg-[#065F46] text-white text-xs font-medium hover:bg-[#047857]"
                  >
                    Save Child Supervision Record
                  </button>
                </form>
              </div>

              <div className="lg:col-span-7 bg-white border border-[#E2E8E5] rounded-2xl p-6 space-y-5">
                <h2 className="font-display text-2xl font-bold text-[#0F1F1A]">
                  Guardian Oversight &amp; Minor Approvals
                </h2>

                {minorStudentsForParent.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-[#065F46]">
                      Student Accounts Linked to Your Email
                    </p>
                    {minorStudentsForParent.map((child) => (
                      <div
                        key={child.uid}
                        className="p-3.5 rounded-xl bg-[#FAF9F6] border border-[#E2E8E5] flex items-center justify-between gap-3"
                      >
                        <div>
                          <div className="text-sm font-semibold text-[#0F1F1A]">
                            {child.displayName}
                          </div>
                          <div className="text-xs text-[#475A53]">
                            Status: {child.parentalConsentStatus}
                          </div>
                        </div>
                        {child.parentalConsentStatus !== 'approved' && (
                          <button
                            type="button"
                            onClick={() => void handleParentApproveChild(child)}
                            className="px-3 py-1.5 rounded-lg bg-[#065F46] text-white text-xs font-medium"
                          >
                            Approve Consent
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {guardianLinks.length === 0 ? (
                  <p className="text-xs text-[#475A53]">
                    No supervised child profiles added yet. Use the form to add a child.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {guardianLinks.map((link) => (
                      <div
                        key={link.id}
                        className="p-4 rounded-xl border border-[#E2E8E5] flex items-center justify-between gap-4"
                      >
                        <div>
                          <div className="text-sm font-semibold text-[#0F1F1A] flex items-center gap-2">
                            <Users className="w-3.5 h-3.5 text-[#065F46]" />
                            {link.childName} (Age {link.childAge})
                          </div>
                          <div className="text-xs text-[#475A53] mt-0.5 tabular-nums">
                            Consent: {link.consentGranted ? 'Approved' : 'Pending'} · Daily Limit:{' '}
                            {link.dailyLimitMinutes || 45} min
                          </div>
                          {link.notes && (
                            <p className="text-xs text-[#475A53] mt-1">{link.notes}</p>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() =>
                            void deleteDoc(doc(db, 'guardian_links', link.id)).catch((err) =>
                              handleFirestoreError(
                                err,
                                OperationType.DELETE,
                                `guardian_links/${link.id}`
                              )
                            )
                          }
                          aria-label={`Remove ${link.childName}`}
                          className="p-2 rounded-lg text-[#475A53] hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Student Course Enrollments & Quran Bookmarks */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-6 bg-white border border-[#E2E8E5] rounded-2xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-display text-2xl font-bold text-[#0F1F1A]">
                  Enrolled Courses
                </h2>
                <button
                  type="button"
                  onClick={() => onNavigate('courses')}
                  className="text-xs font-medium text-[#065F46] hover:underline"
                >
                  Browse Courses
                </button>
              </div>
              {enrollments.length === 0 ? (
                <p className="text-xs text-[#475A53]">
                  You have not enrolled in any courses yet. Visit Courses to begin.
                </p>
              ) : (
                <div className="space-y-3">
                  {enrollments.map((enr) => (
                    <div
                      key={enr.id}
                      className="p-4 rounded-xl bg-[#FAF9F6] border border-[#E2E8E5] space-y-2"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-semibold text-[#0F1F1A]">
                          {enr.courseTitle}
                        </span>
                        <span className="text-xs font-medium text-[#065F46] tabular-nums">
                          {enr.progressPercent}%
                        </span>
                      </div>
                      <input
                        type="range"
                        min={0}
                        max={100}
                        value={enr.progressPercent}
                        aria-label={`Progress for ${enr.courseTitle}`}
                        onChange={(e) => {
                          const pct = Number(e.target.value);
                          void updateDoc(doc(db, 'enrollments', enr.id), {
                            progressPercent: pct,
                            status: pct === 100 ? 'completed' : 'active',
                            updatedAt: serverTimestamp(),
                          }).catch((err) =>
                            handleFirestoreError(err, OperationType.UPDATE, `enrollments/${enr.id}`)
                          );
                        }}
                        className="w-full accent-[#065F46]"
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="lg:col-span-6 bg-white border border-[#E2E8E5] rounded-2xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-display text-2xl font-bold text-[#0F1F1A]">
                  Quran Bookmarks &amp; Notes
                </h2>
                <button
                  type="button"
                  onClick={() => onNavigate('quran')}
                  className="text-xs font-medium text-[#065F46] hover:underline"
                >
                  Open Quran Reader
                </button>
              </div>
              {quranProgress.length === 0 ? (
                <p className="text-xs text-[#475A53]">
                  Bookmark any Ayah inside the Holy Quran Reader to save your place and study
                  notes.
                </p>
              ) : (
                <div className="space-y-3">
                  {quranProgress.map((qp) => (
                    <div
                      key={qp.id}
                      className="p-4 rounded-xl bg-[#FAF9F6] border border-[#E2E8E5] flex items-start justify-between gap-3"
                    >
                      <div>
                        <div className="text-sm font-semibold text-[#065F46] tabular-nums">
                          {qp.surahName} ({qp.surahNumber}:{qp.ayahNumber}) · Juz {qp.juzNumber}
                        </div>
                        {qp.note && <p className="text-xs text-[#475A53] mt-1">{qp.note}</p>}
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          void deleteDoc(doc(db, 'quran_progress', qp.id)).catch((err) =>
                            handleFirestoreError(
                              err,
                              OperationType.DELETE,
                              `quran_progress/${qp.id}`
                            )
                          )
                        }
                        aria-label="Delete bookmark"
                        className="p-1.5 rounded-lg text-[#475A53] hover:text-red-700"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB: CONTENT STUDIO (Approved Teachers + Super Admin) */}
      {tab === 'cms' && canManageContent && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Publish Course */}
          <form
            onSubmit={handleCreateCourse}
            className="bg-white border border-[#E2E8E5] rounded-2xl p-6 space-y-3"
          >
            <h2 className="font-display text-2xl font-bold text-[#0F1F1A] flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-[#065F46]" />
              Publish New Course
            </h2>
            <input
              type="text"
              required
              minLength={3}
              maxLength={MAX_LENGTHS.courseTitle}
              value={newCourseTitle}
              onChange={(e) => setNewCourseTitle(e.target.value)}
              placeholder="Course Title (e.g., Intermediate Tajweed Mastery)"
              className="w-full h-10 px-3 rounded-lg border border-[#E2E8E5] text-sm"
            />
            <div className="grid grid-cols-2 gap-3">
              <select
                value={newCourseCat}
                onChange={(e) => setNewCourseCat(e.target.value as CourseCategory)}
                className="h-10 px-3 rounded-lg border border-[#E2E8E5] text-sm"
              >
                <option value="Tajweed">Tajweed</option>
                <option value="Hifz">Hifz</option>
                <option value="Nazra">Nazra</option>
                <option value="Tafseer">Tafseer</option>
                <option value="Islamic Studies">Islamic Studies</option>
                <option value="Kids Quran">Kids Quran</option>
              </select>
              <select
                value={newCourseLevel}
                onChange={(e) => setNewCourseLevel(e.target.value as CourseLevel)}
                className="h-10 px-3 rounded-lg border border-[#E2E8E5] text-sm"
              >
                <option value="Beginner">Beginner</option>
                <option value="Intermediate">Intermediate</option>
                <option value="Advanced">Advanced</option>
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <input
                type="number"
                min={1}
                max={260}
                value={newCourseWeeks}
                onChange={(e) => setNewCourseWeeks(e.target.value)}
                placeholder="Weeks"
                className="h-10 px-3 rounded-lg border border-[#E2E8E5] text-sm tabular-nums"
              />
              <input
                type="text"
                maxLength={MAX_LENGTHS.scheduleSummary}
                value={newCourseSchedule}
                onChange={(e) => setNewCourseSchedule(e.target.value)}
                placeholder="Schedule Summary"
                className="h-10 px-3 rounded-lg border border-[#E2E8E5] text-sm"
              />
            </div>
            <textarea
              rows={3}
              required
              minLength={10}
              maxLength={MAX_LENGTHS.courseDescription}
              value={newCourseDesc}
              onChange={(e) => setNewCourseDesc(e.target.value)}
              placeholder="Course syllabus and learning outcomes..."
              className="w-full p-3 rounded-lg border border-[#E2E8E5] text-sm"
            />
            <button
              type="submit"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#065F46] text-white text-xs font-medium"
            >
              <Plus className="w-4 h-4" /> Publish Course
            </button>
          </form>

          {/* Schedule Live Class */}
          <form
            onSubmit={handleCreateLiveClass}
            className="bg-white border border-[#E2E8E5] rounded-2xl p-6 space-y-3"
          >
            <h2 className="font-display text-2xl font-bold text-[#0F1F1A] flex items-center gap-2">
              <Calendar className="w-5 h-5 text-[#065F46]" />
              Schedule Live Class
            </h2>
            <input
              type="text"
              required
              minLength={3}
              maxLength={MAX_LENGTHS.liveTitle}
              value={liveTitle}
              onChange={(e) => setLiveTitle(e.target.value)}
              placeholder="Session Title"
              className="w-full h-10 px-3 rounded-lg border border-[#E2E8E5] text-sm"
            />
            <div className="grid grid-cols-2 gap-3">
              <input
                type="text"
                required
                value={liveWhen}
                onChange={(e) => setLiveWhen(e.target.value)}
                placeholder="Date & Time"
                className="h-10 px-3 rounded-lg border border-[#E2E8E5] text-sm"
              />
              <input
                type="number"
                min={10}
                max={300}
                value={liveDuration}
                onChange={(e) => setLiveDuration(e.target.value)}
                placeholder="Duration (min)"
                className="h-10 px-3 rounded-lg border border-[#E2E8E5] text-sm tabular-nums"
              />
            </div>
            <input
              type="url"
              maxLength={500}
              value={liveUrl}
              onChange={(e) => setLiveUrl(e.target.value)}
              placeholder="Classroom Meeting URL"
              className="w-full h-10 px-3 rounded-lg border border-[#E2E8E5] text-sm"
            />
            <textarea
              rows={2}
              maxLength={MAX_LENGTHS.liveTopic}
              value={liveTopic}
              onChange={(e) => setLiveTopic(e.target.value)}
              placeholder="Topic covered in this session..."
              className="w-full p-3 rounded-lg border border-[#E2E8E5] text-sm"
            />
            <button
              type="submit"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#065F46] text-white text-xs font-medium"
            >
              <Plus className="w-4 h-4" /> Schedule Class
            </button>
          </form>

          {/* Add Digital Library Item */}
          <form
            onSubmit={handleCreateLibraryItem}
            className="bg-white border border-[#E2E8E5] rounded-2xl p-6 space-y-3"
          >
            <h2 className="font-display text-2xl font-bold text-[#0F1F1A]">
              Add Islamic Library Book
            </h2>
            <input
              type="text"
              required
              minLength={2}
              maxLength={MAX_LENGTHS.libraryTitle}
              value={libTitle}
              onChange={(e) => setLibTitle(e.target.value)}
              placeholder="Book or Guide Title"
              className="w-full h-10 px-3 rounded-lg border border-[#E2E8E5] text-sm"
            />
            <input
              type="text"
              required
              minLength={2}
              maxLength={MAX_LENGTHS.displayName}
              value={libAuthor}
              onChange={(e) => setLibAuthor(e.target.value)}
              placeholder="Author / Scholar"
              className="w-full h-10 px-3 rounded-lg border border-[#E2E8E5] text-sm"
            />
            <div className="grid grid-cols-2 gap-3">
              <select
                value={libCat}
                onChange={(e) => setLibCat(e.target.value as LibraryCategory)}
                className="h-10 px-3 rounded-lg border border-[#E2E8E5] text-sm"
              >
                <option value="Quran & Tajweed">Quran &amp; Tajweed</option>
                <option value="Tafseer">Tafseer</option>
                <option value="Hadith">Hadith</option>
                <option value="Seerah">Seerah</option>
                <option value="Fiqh">Fiqh</option>
                <option value="Kids Stories">Kids Stories</option>
              </select>
              <select
                value={libLang}
                onChange={(e) => setLibLang(e.target.value as 'English' | 'Urdu' | 'Arabic')}
                className="h-10 px-3 rounded-lg border border-[#E2E8E5] text-sm"
              >
                <option value="English">English</option>
                <option value="Urdu">Urdu</option>
                <option value="Arabic">Arabic</option>
              </select>
            </div>
            <textarea
              rows={3}
              required
              minLength={5}
              maxLength={MAX_LENGTHS.libraryDescription}
              value={libDesc}
              onChange={(e) => setLibDesc(e.target.value)}
              placeholder="Summary and readable excerpt..."
              className="w-full p-3 rounded-lg border border-[#E2E8E5] text-sm"
            />
            <button
              type="submit"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#065F46] text-white text-xs font-medium"
            >
              <Plus className="w-4 h-4" /> Add to Library
            </button>
          </form>

          {/* Publish Lecture */}
          <form
            onSubmit={handleCreateLecture}
            className="bg-white border border-[#E2E8E5] rounded-2xl p-6 space-y-3"
          >
            <h2 className="font-display text-2xl font-bold text-[#0F1F1A]">
              Publish Islamic Lecture
            </h2>
            <input
              type="text"
              required
              minLength={3}
              maxLength={MAX_LENGTHS.lectureTitle}
              value={lecTitle}
              onChange={(e) => setLecTitle(e.target.value)}
              placeholder="Lecture Title"
              className="w-full h-10 px-3 rounded-lg border border-[#E2E8E5] text-sm"
            />
            <div className="grid grid-cols-2 gap-3">
              <input
                type="text"
                required
                minLength={2}
                maxLength={MAX_LENGTHS.displayName}
                value={lecSpeaker}
                onChange={(e) => setLecSpeaker(e.target.value)}
                placeholder="Speaker Name"
                className="h-10 px-3 rounded-lg border border-[#E2E8E5] text-sm"
              />
              <input
                type="text"
                required
                value={lecDuration}
                onChange={(e) => setLecDuration(e.target.value)}
                placeholder="Duration (e.g., 25 min)"
                className="h-10 px-3 rounded-lg border border-[#E2E8E5] text-sm"
              />
            </div>
            <input
              type="text"
              required
              value={lecCat}
              onChange={(e) => setLecCat(e.target.value)}
              placeholder="Category"
              className="w-full h-10 px-3 rounded-lg border border-[#E2E8E5] text-sm"
            />
            <textarea
              rows={3}
              required
              minLength={5}
              maxLength={MAX_LENGTHS.lectureSummary}
              value={lecSummary}
              onChange={(e) => setLecSummary(e.target.value)}
              placeholder="Lecture summary..."
              className="w-full p-3 rounded-lg border border-[#E2E8E5] text-sm"
            />
            <button
              type="submit"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#065F46] text-white text-xs font-medium"
            >
              <Plus className="w-4 h-4" /> Publish Lecture
            </button>
          </form>
        </div>
      )}

      {/* TAB: SUPER ADMIN APPROVALS & INBOX */}
      {tab === 'approvals' && profile.role === 'super_admin' && (
        <div className="space-y-8">
          <div className="bg-white border border-[#E2E8E5] rounded-2xl p-6">
            <h2 className="font-display text-2xl font-bold text-[#0F1F1A] mb-4 flex items-center gap-2">
              <UserCheck className="w-5 h-5 text-[#065F46]" />
              Teacher Applications &amp; User Directory
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-[#E2E8E5] text-[#475A53]">
                  <tr>
                    <th className="py-2.5 pr-4">Name</th>
                    <th className="py-2.5 pr-4">Email</th>
                    <th className="py-2.5 pr-4">Role</th>
                    <th className="py-2.5 pr-4">Status</th>
                    <th className="py-2.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F0F2F1]">
                  {allUsers.map((u) => (
                    <tr key={u.uid}>
                      <td className="py-3 pr-4 font-medium text-[#0F1F1A]">{u.displayName}</td>
                      <td className="py-3 pr-4 text-[#475A53]">{u.email}</td>
                      <td className="py-3 pr-4 capitalize">{u.role.replace('_', ' ')}</td>
                      <td className="py-3 pr-4">
                        {u.role === 'teacher'
                          ? u.teacherApproved
                            ? 'Approved'
                            : 'Pending Approval'
                          : u.isMinor
                          ? `Minor (${u.parentalConsentStatus})`
                          : 'Active'}
                      </td>
                      <td className="py-3 text-right space-x-2">
                        {u.role === 'teacher' && (
                          <button
                            type="button"
                            onClick={() => void handleApproveTeacher(u, !u.teacherApproved)}
                            className={`px-3 py-1 rounded-md font-medium ${
                              u.teacherApproved
                                ? 'border border-[#E2E8E5] text-[#475A53]'
                                : 'bg-[#065F46] text-white'
                            }`}
                          >
                            {u.teacherApproved ? 'Revoke' : 'Approve Teacher'}
                          </button>
                        )}
                        {u.isMinor && u.parentalConsentStatus !== 'approved' && (
                          <button
                            type="button"
                            onClick={() => void handleAdminUpdateConsent(u, 'approved')}
                            className="px-3 py-1 rounded-md bg-[#B8860B] text-white font-medium"
                          >
                            Approve Consent
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="bg-white border border-[#E2E8E5] rounded-2xl p-6">
            <h2 className="font-display text-2xl font-bold text-[#0F1F1A] mb-4">
              Contact Inquiries ({contactMessages.length})
            </h2>
            {contactMessages.length === 0 ? (
              <p className="text-xs text-[#475A53]">No contact inquiries yet.</p>
            ) : (
              <div className="space-y-3">
                {contactMessages.map((m) => (
                  <div
                    key={m.id}
                    className="p-4 rounded-xl bg-[#FAF9F6] border border-[#E2E8E5] flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div>
                      <div className="text-sm font-semibold text-[#0F1F1A]">
                        {m.subject} — {m.name} ({m.email})
                      </div>
                      <p className="text-xs text-[#475A53] mt-1">{m.message}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        void updateDoc(doc(db, 'contact_messages', m.id), {
                          status: m.status === 'new' ? 'reviewed' : 'new',
                        })
                      }
                      className="px-3 py-1.5 rounded-lg border border-[#E2E8E5] bg-white text-xs font-medium shrink-0"
                    >
                      {m.status === 'new' ? 'Mark Reviewed' : 'Reviewed'}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB: PROFILE MANAGEMENT */}
      {tab === 'profile' && (
        <div className="bg-white border border-[#E2E8E5] rounded-2xl p-6 sm:p-8 max-w-2xl">
          <h2 className="font-display text-2xl font-bold text-[#0F1F1A] mb-6">
            Profile &amp; Account Security
          </h2>

          <div className="flex items-center gap-4 pb-6 mb-6 border-b border-[#E2E8E5]">
            <div className="w-16 h-16 rounded-2xl bg-[#065F46] text-white flex items-center justify-center font-display text-2xl font-bold overflow-hidden">
              {profile.photoURL ? (
                <img
                  src={profile.photoURL}
                  alt={profile.displayName}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                />
              ) : (
                profile.displayName.charAt(0).toUpperCase()
              )}
            </div>
            <div>
              <label className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-[#E2E8E5] bg-[#FAF9F6] text-xs font-medium text-[#0F1F1A] cursor-pointer hover:border-[#065F46]">
                <Camera className="w-3.5 h-3.5 text-[#065F46]" />
                {uploadingPhoto ? 'Uploading...' : 'Upload Profile Picture'}
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => void handlePhotoUpload(e)}
                  className="hidden"
                />
              </label>
              <p className="text-[11px] text-[#475A53] mt-1.5">
                PNG, JPG, or WebP. Stored securely in your academy profile.
              </p>
            </div>
          </div>

          <form onSubmit={handleSaveProfile} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-[#0F1F1A] mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  maxLength={MAX_LENGTHS.displayName}
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full h-10 px-3 rounded-lg border border-[#E2E8E5] text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#0F1F1A] mb-1">Phone</label>
                <input
                  type="tel"
                  maxLength={MAX_LENGTHS.phone}
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+1 555 012 3456"
                  className="w-full h-10 px-3 rounded-lg border border-[#E2E8E5] text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-[#0F1F1A] mb-1">
                Personal Learning Bio
              </label>
              <textarea
                rows={3}
                maxLength={MAX_LENGTHS.bio}
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                className="w-full p-3 rounded-lg border border-[#E2E8E5] text-sm"
              />
            </div>

            {profile.role === 'teacher' && (
              <>
                <div>
                  <label className="block text-xs font-medium text-[#0F1F1A] mb-1">
                    Teaching Specialization
                  </label>
                  <input
                    type="text"
                    maxLength={MAX_LENGTHS.teacherSpecialty}
                    value={teacherSpecialty}
                    onChange={(e) => setTeacherSpecialty(e.target.value)}
                    className="w-full h-10 px-3 rounded-lg border border-[#E2E8E5] text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#0F1F1A] mb-1">
                    Faculty Biography
                  </label>
                  <textarea
                    rows={3}
                    maxLength={MAX_LENGTHS.teacherBio}
                    value={teacherBio}
                    onChange={(e) => setTeacherBio(e.target.value)}
                    className="w-full p-3 rounded-lg border border-[#E2E8E5] text-sm"
                  />
                </div>
              </>
            )}

            <div className="pt-2 flex flex-wrap items-center justify-between gap-3">
              <button
                type="submit"
                className="px-5 py-2.5 rounded-lg bg-[#065F46] text-white text-xs font-medium hover:bg-[#047857]"
              >
                Save Profile
              </button>

              <button
                type="button"
                onClick={() =>
                  void sendResetPassword(profile.email).then(() =>
                    notify('Password reset email dispatched.')
                  )
                }
                className="text-xs font-medium text-[#065F46] hover:underline"
              >
                Send Password Reset Email
              </button>
            </div>
          </form>
        </div>
      )}
    </section>
  );
};
