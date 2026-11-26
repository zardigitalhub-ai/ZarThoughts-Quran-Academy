import React, { useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  KeyRound,
  LogIn,
  Mail,
  ShieldCheck,
  UserPlus,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { MAX_LENGTHS, UserRole } from '../types/academy';
import { AcademyLogo } from './AcademyLogo';

interface AuthPortalProps {
  onSuccess: () => void;
}

export const AuthPortal: React.FC<AuthPortalProps> = ({ onSuccess }) => {
  const {
    signInWithGoogle,
    registerWithEmail,
    loginWithEmail,
    sendResetPassword,
  } = useAuth();

  const [mode, setMode] = useState<'login' | 'register' | 'reset'>('login');
  const [role, setRole] = useState<Exclude<UserRole, 'super_admin'>>('student');
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isMinor, setIsMinor] = useState(false);
  const [guardianEmail, setGuardianEmail] = useState('');
  const [parentalAgreed, setParentalAgreed] = useState(false);
  const [teacherSpecialty, setTeacherSpecialty] = useState('');
  const [teacherBio, setTeacherBio] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const mapAuthError = (err: unknown): string => {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes('auth/operation-not-allowed')) {
      return 'Email/Password sign-in is not yet enabled in Firebase Console (Authentication → Sign-in method). You can sign in immediately with Google below, or enable Email/Password in Firebase Console.';
    }
    if (msg.includes('auth/invalid-credential') || msg.includes('auth/wrong-password')) {
      return 'Invalid email or password. Please verify your credentials or reset your password.';
    }
    if (msg.includes('auth/email-already-in-use')) {
      return 'An account with this email already exists. Please sign in instead.';
    }
    if (msg.includes('auth/weak-password')) {
      return 'Password must be at least 6 characters long.';
    }
    if (msg.includes('auth/popup-closed-by-user')) {
      return 'Sign-in popup was closed before completing.';
    }
    return msg;
  };

  const handleGoogleSignIn = async () => {
    setError(null);
    setNotice(null);
    setSubmitting(true);
    try {
      await signInWithGoogle(role);
      onSuccess();
    } catch (err) {
      setError(mapAuthError(err));
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setNotice(null);

    if (mode === 'reset') {
      if (!email.trim()) {
        setError('Please enter your registered email address.');
        return;
      }
      setSubmitting(true);
      try {
        await sendResetPassword(email.trim());
        setNotice(
          'Password reset instructions have been sent to your email address. Please check your inbox.'
        );
      } catch (err) {
        setError(mapAuthError(err));
      } finally {
        setSubmitting(false);
      }
      return;
    }

    if (mode === 'register') {
      if (!displayName.trim()) {
        setError('Please enter your full name.');
        return;
      }
      if (isMinor && (!guardianEmail.trim() || !parentalAgreed)) {
        setError(
          'Students under 18 must provide a parent/guardian email and confirm guardian supervision.'
        );
        return;
      }
      if (role === 'teacher' && !teacherSpecialty.trim()) {
        setError('Teachers must provide their specialization (e.g., Tajweed, Hifz, Tafseer).');
        return;
      }

      setSubmitting(true);
      try {
        const res = await registerWithEmail({
          email: email.trim(),
          password,
          displayName: displayName.trim(),
          role,
          isMinor,
          guardianEmail: guardianEmail.trim() || undefined,
          teacherSpecialty: teacherSpecialty.trim() || undefined,
          teacherBio: teacherBio.trim() || undefined,
        });
        if (res.needsVerification) {
          setNotice(
            'Account created! A verification link has been sent to your email. Please verify your email before accessing cloud updates.'
          );
        }
        onSuccess();
      } catch (err) {
        setError(mapAuthError(err));
      } finally {
        setSubmitting(false);
      }
      return;
    }

    // Login
    setSubmitting(true);
    try {
      await loginWithEmail(email.trim(), password);
      onSuccess();
    } catch (err) {
      setError(mapAuthError(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="max-w-xl mx-auto px-4 py-12">
      <div className="bg-white border border-[#E2E8E5] rounded-2xl p-6 sm:p-8">
        <div className="text-center mb-6">
          <div className="flex justify-center mb-3">
            <AcademyLogo size="md" showWordmark={false} />
          </div>
          <h1 className="font-display text-3xl font-bold text-[#0F1F1A]">
            {mode === 'login'
              ? 'Academy Sign In'
              : mode === 'register'
              ? 'Create Academy Account'
              : 'Reset Password'}
          </h1>
          <p className="text-xs text-[#475A53] mt-1.5">
            ZARTHOUGHTS QURAN ACADEMY · Student, Parent, Teacher & Admin Access
          </p>
        </div>

        {/* Mode Switcher */}
        <div className="grid grid-cols-3 gap-1 p-1 bg-[#F6F8F7] border border-[#E2E8E5] rounded-lg mb-6">
          <button
            type="button"
            onClick={() => {
              setMode('login');
              setError(null);
              setNotice(null);
            }}
            className={`py-2 text-xs font-medium rounded-md transition-colors ${
              mode === 'login' ? 'bg-white text-[#0F1F1A] shadow-xs' : 'text-[#475A53]'
            }`}
          >
            Login
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('register');
              setError(null);
              setNotice(null);
            }}
            className={`py-2 text-xs font-medium rounded-md transition-colors ${
              mode === 'register' ? 'bg-white text-[#0F1F1A] shadow-xs' : 'text-[#475A53]'
            }`}
          >
            Register
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('reset');
              setError(null);
              setNotice(null);
            }}
            className={`py-2 text-xs font-medium rounded-md transition-colors ${
              mode === 'reset' ? 'bg-white text-[#0F1F1A] shadow-xs' : 'text-[#475A53]'
            }`}
          >
            Forgot Password
          </button>
        </div>

        {error && (
          <div
            role="alert"
            className="mb-5 flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 p-3.5 text-xs text-red-800"
          >
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {notice && (
          <div
            role="status"
            className="mb-5 flex items-start gap-2.5 rounded-xl border border-emerald-200 bg-emerald-50 p-3.5 text-xs text-[#065F46]"
          >
            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{notice}</span>
          </div>
        )}

        {/* Role Selector (for registration or first-time Google Sign-In) */}
        {mode !== 'reset' && (
          <div className="mb-5">
            <label className="block text-xs font-medium text-[#0F1F1A] mb-2">
              {mode === 'register'
                ? 'Select Account Role'
                : 'Account Role (for first-time Google sign-in)'}
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(
                [
                  { id: 'student', label: 'Student' },
                  { id: 'parent', label: 'Parent / Guardian' },
                  { id: 'teacher', label: 'Teacher' },
                ] as const
              ).map((r) => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => setRole(r.id)}
                  className={`py-2.5 px-3 rounded-lg border text-xs font-medium transition-colors ${
                    role === r.id
                      ? 'border-[#065F46] bg-emerald-50/70 text-[#065F46]'
                      : 'border-[#E2E8E5] bg-white text-[#475A53] hover:text-[#0F1F1A]'
                  }`}
                >
                  {r.label}
                </button>
              ))}
            </div>
            {role === 'teacher' && (
              <p className="mt-2 text-[11px] text-[#475A53] flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-[#B8860B] shrink-0" />
                Teacher accounts require Super Admin approval before publishing classes or courses.
              </p>
            )}
          </div>
        )}

        {/* Primary Google Sign-In (Works immediately) */}
        {mode !== 'reset' && (
          <div className="mb-6">
            <button
              type="button"
              disabled={submitting}
              onClick={() => void handleGoogleSignIn()}
              className="w-full flex items-center justify-center gap-2.5 h-11 rounded-lg border border-[#E2E8E5] bg-[#FAF9F6] hover:bg-emerald-50/60 hover:border-[#065F46] text-sm font-medium text-[#0F1F1A] transition-colors disabled:opacity-50"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" aria-hidden="true">
                <path
                  fill="#4285F4"
                  d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17Z"
                />
                <path
                  fill="#34A853"
                  d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.11-6.72-4.96H1.29v3.14C3.26 21.3 7.31 24 12 24Z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.28 14.24c-.24-.72-.38-1.49-.38-2.24s.14-1.52.38-2.24V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.99-3.14Z"
                />
                <path
                  fill="#EA4335"
                  d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.99 3.14c.95-2.85 3.6-4.96 6.72-4.96Z"
                />
              </svg>
              Continue with Google
            </button>

            <div className="relative my-5 flex items-center">
              <div className="flex-grow border-t border-[#E2E8E5]" />
              <span className="mx-3 text-[11px] text-[#475A53]">or with email</span>
              <div className="flex-grow border-t border-[#E2E8E5]" />
            </div>
          </div>
        )}

        {/* Email Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'register' && (
            <div>
              <label className="block text-xs font-medium text-[#0F1F1A] mb-1">Full Name</label>
              <input
                type="text"
                required
                maxLength={MAX_LENGTHS.displayName}
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="e.g., Fatima Zahra"
                className="w-full h-10 px-3 rounded-lg border border-[#E2E8E5] text-sm focus:outline-none focus:border-[#065F46]"
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-[#0F1F1A] mb-1">Email Address</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-[#475A53] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                required
                maxLength={MAX_LENGTHS.email}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full h-10 pl-9 pr-3 rounded-lg border border-[#E2E8E5] text-sm focus:outline-none focus:border-[#065F46]"
              />
            </div>
          </div>

          {mode !== 'reset' && (
            <div>
              <label className="block text-xs font-medium text-[#0F1F1A] mb-1">Password</label>
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Minimum 6 characters"
                className="w-full h-10 px-3 rounded-lg border border-[#E2E8E5] text-sm focus:outline-none focus:border-[#065F46]"
              />
            </div>
          )}

          {mode === 'register' && role === 'student' && (
            <div className="p-4 rounded-xl bg-[#FAF9F6] border border-[#E2E8E5] space-y-3">
              <label className="flex items-center gap-2 text-xs font-medium text-[#0F1F1A] cursor-pointer">
                <input
                  type="checkbox"
                  checked={isMinor}
                  onChange={(e) => setIsMinor(e.target.checked)}
                  className="rounded border-[#E2E8E5] text-[#065F46]"
                />
                Student is under 18 years old (Parental Consent Required)
              </label>

              {isMinor && (
                <div className="space-y-3 pt-1">
                  <div>
                    <label className="block text-xs font-medium text-[#0F1F1A] mb-1">
                      Parent / Guardian Email
                    </label>
                    <input
                      type="email"
                      required
                      maxLength={MAX_LENGTHS.email}
                      value={guardianEmail}
                      onChange={(e) => setGuardianEmail(e.target.value)}
                      placeholder="parent@example.com"
                      className="w-full h-10 px-3 rounded-lg border border-[#E2E8E5] bg-white text-sm focus:outline-none focus:border-[#065F46]"
                    />
                  </div>
                  <label className="flex items-start gap-2 text-[11px] text-[#475A53] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={parentalAgreed}
                      onChange={(e) => setParentalAgreed(e.target.checked)}
                      className="mt-0.5 rounded border-[#E2E8E5] text-[#065F46]"
                    />
                    <span>
                      I confirm that my parent or legal guardian consents to my enrollment and
                      progress monitoring at ZARTHOUGHTS QURAN ACADEMY.
                    </span>
                  </label>
                </div>
              )}
            </div>
          )}

          {mode === 'register' && role === 'teacher' && (
            <div className="p-4 rounded-xl bg-[#FAF9F6] border border-[#E2E8E5] space-y-3">
              <div>
                <label className="block text-xs font-medium text-[#0F1F1A] mb-1">
                  Teaching Specialization & Ijazah
                </label>
                <input
                  type="text"
                  required
                  maxLength={MAX_LENGTHS.teacherSpecialty}
                  value={teacherSpecialty}
                  onChange={(e) => setTeacherSpecialty(e.target.value)}
                  placeholder="e.g., Hafs an Asim, Kids Tajweed, Urdu Tafseer"
                  className="w-full h-10 px-3 rounded-lg border border-[#E2E8E5] bg-white text-sm focus:outline-none focus:border-[#065F46]"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#0F1F1A] mb-1">
                  Short Teaching Bio
                </label>
                <textarea
                  rows={2}
                  maxLength={MAX_LENGTHS.teacherBio}
                  value={teacherBio}
                  onChange={(e) => setTeacherBio(e.target.value)}
                  placeholder="Share your qualifications and experience..."
                  className="w-full p-3 rounded-lg border border-[#E2E8E5] bg-white text-sm focus:outline-none focus:border-[#065F46]"
                />
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full h-11 rounded-lg bg-[#065F46] text-white text-sm font-medium hover:bg-[#047857] transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {mode === 'login' && <LogIn className="w-4 h-4" />}
            {mode === 'register' && <UserPlus className="w-4 h-4" />}
            {mode === 'reset' && <KeyRound className="w-4 h-4" />}
            {submitting
              ? 'Please wait...'
              : mode === 'login'
              ? 'Sign In'
              : mode === 'register'
              ? 'Create Account'
              : 'Send Password Reset Link'}
          </button>
        </form>
      </div>
    </section>
  );
};
