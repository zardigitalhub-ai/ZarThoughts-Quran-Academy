import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  User,
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  onAuthStateChanged,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
} from 'firebase/auth';
import {
  collection,
  doc,
  getDoc,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import {
  auth,
  db,
  handleFirestoreError,
  OperationType,
} from '../lib/firebase';
import {
  BOOTSTRAP_ADMIN_EMAIL,
  Course,
  Enrollment,
  GuardianLink,
  Lecture,
  LibraryItem,
  LiveClass,
  MAX_LENGTHS,
  PublicTeacher,
  QuranProgress,
  UserProfile,
  UserRole,
} from '../types/academy';
import {
  SEED_COURSES,
  SEED_LECTURES,
  SEED_LIBRARY,
  SEED_LIVE_CLASSES,
  SEED_TEACHERS,
} from '../data/academySeedData';

interface RegisterPayload {
  email: string;
  password: string;
  displayName: string;
  role: Exclude<UserRole, 'super_admin'>;
  isMinor: boolean;
  guardianEmail?: string;
  teacherSpecialty?: string;
  teacherBio?: string;
}

interface AuthContextValue {
  firebaseUser: User | null;
  profile: UserProfile | null;
  authReady: boolean;
  courses: Course[];
  liveClasses: LiveClass[];
  libraryItems: LibraryItem[];
  lectures: Lecture[];
  publicTeachers: PublicTeacher[];
  enrollments: Enrollment[];
  quranProgress: QuranProgress[];
  guardianLinks: GuardianLink[];
  signInWithGoogle: (preferredRole?: Exclude<UserRole, 'super_admin'>) => Promise<void>;
  registerWithEmail: (payload: RegisterPayload) => Promise<{ needsVerification: boolean }>;
  loginWithEmail: (email: string, password: string) => Promise<void>;
  sendResetPassword: (email: string) => Promise<void>;
  resendVerificationEmail: () => Promise<void>;
  refreshUserSession: () => Promise<void>;
  logout: () => Promise<void>;
  updateMyProfile: (updates: {
    displayName?: string;
    phone?: string;
    bio?: string;
    photoURL?: string;
    teacherSpecialty?: string;
    teacherBio?: string;
    guardianEmail?: string;
  }) => Promise<void>;
  seedInitialAcademyData: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [authReady, setAuthReady] = useState(false);

  const [courses, setCourses] = useState<Course[]>(
    SEED_COURSES.map((c) => ({ ...c }))
  );
  const [liveClasses, setLiveClasses] = useState<LiveClass[]>(
    SEED_LIVE_CLASSES.map((c) => ({ ...c }))
  );
  const [libraryItems, setLibraryItems] = useState<LibraryItem[]>(
    SEED_LIBRARY.map((l) => ({ ...l }))
  );
  const [lectures, setLectures] = useState<Lecture[]>(
    SEED_LECTURES.map((l) => ({ ...l }))
  );
  const [publicTeachers, setPublicTeachers] = useState<PublicTeacher[]>(
    SEED_TEACHERS.map((t) => ({ ...t }))
  );

  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [quranProgress, setQuranProgress] = useState<QuranProgress[]>([]);
  const [guardianLinks, setGuardianLinks] = useState<GuardianLink[]>([]);

  // 1. Public Catalog Listeners (Courses, Live Classes, Library, Lectures, Approved Teachers)
  useEffect(() => {
    const unsubCourses = onSnapshot(
      query(collection(db, 'courses'), where('published', '==', true)),
      (snap) => {
        if (!snap.empty) {
          setCourses(
            snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Course, 'id'>) }))
          );
        }
      },
      (err) => {
        // Keep curated catalog visible if unauthenticated/offline
        console.warn('Courses listener fallback:', err.message);
      }
    );

    const unsubLive = onSnapshot(
      query(
        collection(db, 'live_classes'),
        where('status', 'in', ['scheduled', 'live', 'completed'])
      ),
      (snap) => {
        if (!snap.empty) {
          setLiveClasses(
            snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<LiveClass, 'id'>) }))
          );
        }
      },
      (err) => {
        console.warn('Live classes listener fallback:', err.message);
      }
    );

    const unsubLib = onSnapshot(
      query(collection(db, 'library_items'), where('published', '==', true)),
      (snap) => {
        if (!snap.empty) {
          setLibraryItems(
            snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<LibraryItem, 'id'>) }))
          );
        }
      },
      (err) => {
        console.warn('Library listener fallback:', err.message);
      }
    );

    const unsubLec = onSnapshot(
      query(collection(db, 'lectures'), where('published', '==', true)),
      (snap) => {
        if (!snap.empty) {
          setLectures(
            snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Lecture, 'id'>) }))
          );
        }
      },
      (err) => {
        console.warn('Lectures listener fallback:', err.message);
      }
    );

    const unsubTeachers = onSnapshot(
      query(collection(db, 'public_teachers'), where('approved', '==', true)),
      (snap) => {
        if (!snap.empty) {
          setPublicTeachers(
            snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<PublicTeacher, 'id'>) }))
          );
        }
      },
      (err) => {
        console.warn('Teachers listener fallback:', err.message);
      }
    );

    return () => {
      unsubCourses();
      unsubLive();
      unsubLib();
      unsubLec();
      unsubTeachers();
    };
  }, []);

  // 2. Auth State Listener
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      setFirebaseUser(user);
      if (!user) {
        setProfile(null);
        setEnrollments([]);
        setQuranProgress([]);
        setGuardianLinks([]);
        setAuthReady(true);
        return;
      }

      const userRef = doc(db, 'users', user.uid);
      try {
        const snap = await getDoc(userRef);
        if (!snap.exists()) {
          const isBootstrap =
            user.email?.toLowerCase() === BOOTSTRAP_ADMIN_EMAIL.toLowerCase() &&
            user.emailVerified;
          const initialProfile: UserProfile = {
            uid: user.uid,
            email: (user.email || '').slice(0, MAX_LENGTHS.email),
            displayName: (user.displayName || user.email?.split('@')[0] || 'Student').slice(
              0,
              MAX_LENGTHS.displayName
            ),
            photoURL: (user.photoURL || '').slice(0, 500),
            role: isBootstrap ? 'super_admin' : 'student',
            isMinor: false,
            parentalConsentStatus: 'not_required',
            teacherApproved: isBootstrap,
            emailVerified: user.emailVerified,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          };
          await setDoc(userRef, initialProfile);

          if (isBootstrap) {
            await setDoc(doc(db, 'admins', user.uid), {
              uid: user.uid,
              email: user.email || BOOTSTRAP_ADMIN_EMAIL,
              grantedBy: 'bootstrap',
              createdAt: serverTimestamp(),
            });
          }
        } else if (user.emailVerified && snap.data()?.emailVerified === false) {
          await updateDoc(userRef, {
            emailVerified: true,
            updatedAt: serverTimestamp(),
          });
        }
      } catch (err) {
        console.error('Error initializing user profile:', err);
      }

      setAuthReady(true);
    });

    return () => unsub();
  }, []);

  // 3. Authenticated User Sub-Listeners
  useEffect(() => {
    if (!firebaseUser) return;

    const userDocRef = doc(db, 'users', firebaseUser.uid);
    const unsubProfile = onSnapshot(
      userDocRef,
      (snap) => {
        if (snap.exists()) {
          setProfile(snap.data() as UserProfile);
        }
      },
      (err) => handleFirestoreError(err, OperationType.GET, `users/${firebaseUser.uid}`)
    );

    const enrollQuery = query(
      collection(db, 'enrollments'),
      where('studentId', '==', firebaseUser.uid)
    );
    const unsubEnroll = onSnapshot(
      enrollQuery,
      (snap) => {
        setEnrollments(
          snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Enrollment, 'id'>) }))
        );
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'enrollments')
    );

    const progressQuery = query(
      collection(db, 'quran_progress'),
      where('userId', '==', firebaseUser.uid)
    );
    const unsubProgress = onSnapshot(
      progressQuery,
      (snap) => {
        setQuranProgress(
          snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<QuranProgress, 'id'>) }))
        );
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'quran_progress')
    );

    const guardianQuery = query(
      collection(db, 'guardian_links'),
      where('parentUid', '==', firebaseUser.uid)
    );
    const unsubGuardian = onSnapshot(
      guardianQuery,
      (snap) => {
        setGuardianLinks(
          snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<GuardianLink, 'id'>) }))
        );
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'guardian_links')
    );

    return () => {
      unsubProfile();
      unsubEnroll();
      unsubProgress();
      unsubGuardian();
    };
  }, [firebaseUser]);

  const signInWithGoogle = async (preferredRole?: Exclude<UserRole, 'super_admin'>) => {
    const provider = new GoogleAuthProvider();
    const cred = await signInWithPopup(auth, provider);
    const user = cred.user;
    const userRef = doc(db, 'users', user.uid);
    const existing = await getDoc(userRef);

    const isBootstrap =
      user.email?.toLowerCase() === BOOTSTRAP_ADMIN_EMAIL.toLowerCase() && user.emailVerified;

    if (!existing.exists()) {
      const assignedRole: UserRole = isBootstrap ? 'super_admin' : preferredRole || 'student';
      try {
        await setDoc(userRef, {
          uid: user.uid,
          email: (user.email || '').slice(0, MAX_LENGTHS.email),
          displayName: (user.displayName || user.email?.split('@')[0] || 'Learner').slice(
            0,
            MAX_LENGTHS.displayName
          ),
          photoURL: (user.photoURL || '').slice(0, 500),
          role: assignedRole,
          isMinor: false,
          parentalConsentStatus: 'not_required',
          teacherApproved: isBootstrap,
          emailVerified: user.emailVerified,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        if (isBootstrap) {
          await setDoc(doc(db, 'admins', user.uid), {
            uid: user.uid,
            email: user.email || BOOTSTRAP_ADMIN_EMAIL,
            grantedBy: 'bootstrap',
            createdAt: serverTimestamp(),
          });
        }
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, `users/${user.uid}`);
      }
    }
  };

  const registerWithEmail = async (payload: RegisterPayload) => {
    const cred = await createUserWithEmailAndPassword(auth, payload.email, payload.password);
    const user = cred.user;
    await updateProfile(user, { displayName: payload.displayName.slice(0, MAX_LENGTHS.displayName) });
    await sendEmailVerification(user);

    const isBootstrap =
      payload.email.toLowerCase() === BOOTSTRAP_ADMIN_EMAIL.toLowerCase() && user.emailVerified;

    const userDoc: UserProfile = {
      uid: user.uid,
      email: payload.email.slice(0, MAX_LENGTHS.email),
      displayName: payload.displayName.slice(0, MAX_LENGTHS.displayName),
      photoURL: '',
      role: isBootstrap ? 'super_admin' : payload.role,
      isMinor: payload.isMinor,
      guardianEmail: payload.isMinor && payload.guardianEmail ? payload.guardianEmail.slice(0, MAX_LENGTHS.email) : undefined,
      parentalConsentStatus: payload.isMinor ? 'pending' : 'not_required',
      teacherApproved: false,
      teacherSpecialty:
        payload.role === 'teacher' && payload.teacherSpecialty
          ? payload.teacherSpecialty.slice(0, MAX_LENGTHS.teacherSpecialty)
          : undefined,
      teacherBio:
        payload.role === 'teacher' && payload.teacherBio
          ? payload.teacherBio.slice(0, MAX_LENGTHS.teacherBio)
          : undefined,
      emailVerified: user.emailVerified,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    // Strip undefined keys before Firestore write
    const cleanDoc = Object.fromEntries(
      Object.entries(userDoc).filter(([, v]) => v !== undefined)
    );

    try {
      await setDoc(doc(db, 'users', user.uid), cleanDoc);
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `users/${user.uid}`);
    }

    return { needsVerification: !user.emailVerified };
  };

  const loginWithEmail = async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email, password);
  };

  const sendResetPassword = async (email: string) => {
    await sendPasswordResetEmail(auth, email);
  };

  const resendVerificationEmail = async () => {
    if (!auth.currentUser) return;
    await sendEmailVerification(auth.currentUser);
  };

  const refreshUserSession = async () => {
    if (!auth.currentUser) return;
    await auth.currentUser.reload();
    if (auth.currentUser.emailVerified) {
      try {
        await updateDoc(doc(db, 'users', auth.currentUser.uid), {
          emailVerified: true,
          updatedAt: serverTimestamp(),
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, `users/${auth.currentUser.uid}`);
      }
    }
    setFirebaseUser({ ...auth.currentUser } as User);
  };

  const logout = async () => {
    await signOut(auth);
  };

  const updateMyProfile = async (updates: {
    displayName?: string;
    phone?: string;
    bio?: string;
    photoURL?: string;
    teacherSpecialty?: string;
    teacherBio?: string;
    guardianEmail?: string;
  }) => {
    if (!firebaseUser) return;
    const sanitized: Record<string, unknown> = {
      updatedAt: serverTimestamp(),
    };
    if (updates.displayName !== undefined) {
      sanitized.displayName = updates.displayName.trim().slice(0, MAX_LENGTHS.displayName);
    }
    if (updates.phone !== undefined) {
      sanitized.phone = updates.phone.trim().slice(0, MAX_LENGTHS.phone);
    }
    if (updates.bio !== undefined) {
      sanitized.bio = updates.bio.trim().slice(0, MAX_LENGTHS.bio);
    }
    if (updates.photoURL !== undefined) {
      sanitized.photoURL = updates.photoURL.trim().slice(0, 500);
    }
    if (updates.teacherSpecialty !== undefined) {
      sanitized.teacherSpecialty = updates.teacherSpecialty
        .trim()
        .slice(0, MAX_LENGTHS.teacherSpecialty);
    }
    if (updates.teacherBio !== undefined) {
      sanitized.teacherBio = updates.teacherBio.trim().slice(0, MAX_LENGTHS.teacherBio);
    }
    if (updates.guardianEmail !== undefined) {
      sanitized.guardianEmail = updates.guardianEmail.trim().slice(0, MAX_LENGTHS.email);
    }

    try {
      await updateDoc(doc(db, 'users', firebaseUser.uid), sanitized);
      if (updates.displayName || updates.photoURL) {
        await updateProfile(firebaseUser, {
          displayName: updates.displayName || firebaseUser.displayName,
          photoURL: updates.photoURL || firebaseUser.photoURL,
        });
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `users/${firebaseUser.uid}`);
    }
  };

  const seedInitialAcademyData = async () => {
    if (!firebaseUser || profile?.role !== 'super_admin') return;
    const batch = writeBatch(db);
    const now = serverTimestamp();

    for (const t of SEED_TEACHERS) {
      batch.set(doc(db, 'public_teachers', t.id), {
        teacherId: t.teacherId,
        displayName: t.displayName,
        photoURL: t.photoURL,
        specialty: t.specialty,
        bio: t.bio,
        languages: t.languages,
        approved: t.approved,
        updatedAt: now,
      });
    }

    for (const c of SEED_COURSES) {
      batch.set(doc(db, 'courses', c.id), {
        title: c.title,
        category: c.category,
        level: c.level,
        description: c.description,
        durationWeeks: c.durationWeeks,
        scheduleSummary: c.scheduleSummary,
        teacherId: c.teacherId,
        teacherName: c.teacherName,
        imageUrl: c.imageUrl,
        published: c.published,
        createdAt: now,
        updatedAt: now,
      });
    }

    for (const lc of SEED_LIVE_CLASSES) {
      batch.set(doc(db, 'live_classes', lc.id), {
        title: lc.title,
        courseId: lc.courseId,
        teacherId: lc.teacherId,
        teacherName: lc.teacherName,
        scheduledFor: lc.scheduledFor,
        durationMinutes: lc.durationMinutes,
        meetingUrl: lc.meetingUrl,
        topic: lc.topic,
        status: lc.status,
        createdAt: now,
        updatedAt: now,
      });
    }

    for (const lib of SEED_LIBRARY) {
      batch.set(doc(db, 'library_items', lib.id), {
        title: lib.title,
        author: lib.author,
        category: lib.category,
        language: lib.language,
        description: lib.description,
        contentPreview: lib.contentPreview,
        pages: lib.pages,
        published: lib.published,
        createdBy: firebaseUser.uid,
        createdAt: now,
        updatedAt: now,
      });
    }

    for (const lec of SEED_LECTURES) {
      batch.set(doc(db, 'lectures', lec.id), {
        title: lec.title,
        speaker: lec.speaker,
        category: lec.category,
        durationLabel: lec.durationLabel,
        summary: lec.summary,
        mediaUrl: lec.mediaUrl,
        published: lec.published,
        createdBy: firebaseUser.uid,
        createdAt: now,
        updatedAt: now,
      });
    }

    try {
      await batch.commit();
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'batch_seed');
    }
  };

  return (
    <AuthContext.Provider
      value={{
        firebaseUser,
        profile,
        authReady,
        courses,
        liveClasses,
        libraryItems,
        lectures,
        publicTeachers,
        enrollments,
        quranProgress,
        guardianLinks,
        signInWithGoogle,
        registerWithEmail,
        loginWithEmail,
        sendResetPassword,
        resendVerificationEmail,
        refreshUserSession,
        logout,
        updateMyProfile,
        seedInitialAcademyData,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
