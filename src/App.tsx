import React, { useState } from 'react';
import { Menu, X } from 'lucide-react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ErrorBoundary } from './components/ErrorBoundary';
import { AcademyLogo } from './components/AcademyLogo';
import { QuranReader } from './components/QuranReader';
import { AuthPortal } from './components/AuthPortal';
import { RoleDashboards } from './components/RoleDashboards';
import {
  AboutSection,
  ContactSection,
  CoursesSection,
  HomePage,
  LecturesSection,
  LibrarySection,
  LiveClassesSection,
  TeachersSection,
} from './components/AcademySections';
import { LiveClassroom } from './components/LiveClassroom';
import { OfflineIndicator, PWAInstallButton } from './components/PWAInstallButton';
import { AppView, LiveClass } from './types/academy';

const AcademyShell: React.FC = () => {
  const { firebaseUser, profile } = useAuth();
  const [view, setView] = useState<AppView>('home');
  const [activeClassroom, setActiveClassroom] = useState<LiveClass | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navigate = (next: AppView) => {
    setView(next);
    setMobileMenuOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const enterClassroom = (session: LiveClass) => {
    if (!firebaseUser) {
      navigate('auth');
      return;
    }
    setActiveClassroom(session);
    navigate('classroom');
  };

  return (
    <div className="min-h-screen flex flex-col bg-white text-[#0F1F1A]">
      {/* Top Bar Contract: 3 zones (Brand — 5 Nav Links — 1 Primary Action) */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur border-b border-[#E2E8E5]">
        <div className="max-w-[1320px] mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-8">
          {/* Zone 1: Brand Wordmark */}
          <button
            type="button"
            onClick={() => navigate('home')}
            className="text-left focus-visible:outline-2 focus-visible:outline-[#065F46] rounded-md shrink-0"
          >
            <AcademyLogo size="sm" showWordmark />
          </button>

          {/* Zone 2: 5 concise single-line navigation links */}
          <nav
            aria-label="Primary Navigation"
            className="hidden lg:flex items-center gap-6 text-sm font-medium text-[#475A53]"
          >
            {(
              [
                { id: 'quran', label: 'Holy Quran' },
                { id: 'courses', label: 'Courses' },
                { id: 'live-classes', label: 'Live Classes' },
                { id: 'library', label: 'Library' },
                { id: 'teachers', label: 'Teachers' },
              ] as const
            ).map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => navigate(item.id)}
                className={`whitespace-nowrap shrink-0 py-1 border-b-2 transition-colors ${
                  view === item.id
                    ? 'border-[#065F46] text-[#065F46]'
                    : 'border-transparent hover:text-[#0F1F1A]'
                }`}
              >
                {item.label}
              </button>
            ))}
          </nav>

          {/* Zone 3: 1 Primary Action + Mobile Drawer Toggle */}
          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={() => navigate(firebaseUser ? 'dashboard' : 'auth')}
              className="px-4 py-2 rounded-lg bg-[#065F46] text-white text-xs font-medium hover:bg-[#047857] transition-colors whitespace-nowrap shrink-0"
            >
              {firebaseUser ? profile?.displayName?.split(' ')[0] || 'Portal' : 'Login / Register'}
            </button>

            <button
              type="button"
              onClick={() => setMobileMenuOpen((v) => !v)}
              aria-label="Toggle navigation menu"
              className="lg:hidden p-2 rounded-lg border border-[#E2E8E5] text-[#0F1F1A]"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Drawer */}
        {mobileMenuOpen && (
          <div className="lg:hidden border-t border-[#E2E8E5] bg-white px-4 py-4 space-y-2">
            {(
              [
                { id: 'home', label: 'Home' },
                { id: 'about', label: 'About Us' },
                { id: 'quran', label: 'Holy Quran' },
                { id: 'courses', label: 'Courses' },
                { id: 'live-classes', label: 'Live Classes' },
                { id: 'library', label: 'Islamic Library' },
                { id: 'lectures', label: 'Lectures' },
                { id: 'teachers', label: 'Teachers' },
                { id: 'contact', label: 'Contact Us' },
              ] as const
            ).map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => navigate(item.id)}
                className={`block w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium ${
                  view === item.id ? 'bg-emerald-50 text-[#065F46]' : 'text-[#0F1F1A]'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        )}
      </header>

      {/* Main Route Viewport */}
      <main className="flex-1">
        {view === 'home' && (
          <HomePage onNavigate={navigate} onEnterClassroom={enterClassroom} />
        )}
        {view === 'quran' && <QuranReader onNavigateAuth={() => navigate('auth')} />}
        {view === 'courses' && <CoursesSection onNavigate={navigate} />}
        {view === 'live-classes' && (
          <LiveClassesSection onNavigate={navigate} onEnterClassroom={enterClassroom} />
        )}
        {view === 'classroom' && activeClassroom && (
          <LiveClassroom
            classItem={activeClassroom}
            onExit={() => navigate(firebaseUser ? 'dashboard' : 'live-classes')}
          />
        )}
        {view === 'library' && <LibrarySection onNavigate={navigate} />}
        {view === 'lectures' && <LecturesSection onNavigate={navigate} />}
        {view === 'teachers' && <TeachersSection onNavigate={navigate} />}
        {view === 'about' && <AboutSection />}
        {view === 'contact' && <ContactSection />}
        {view === 'auth' && <AuthPortal onSuccess={() => navigate('dashboard')} />}
        {view === 'dashboard' && (
          <RoleDashboards onNavigate={navigate} onEnterClassroom={enterClassroom} />
        )}
      </main>

      {/* Quiet Editorial Footer */}
      <footer className="bg-[#0F1F1A] text-white border-t border-[#1E352D] mt-auto">
        <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8 pb-8 border-b border-white/10">
            <div className="md:col-span-5 space-y-3">
              <AcademyLogo size="md" showWordmark lightText />
              <p className="text-xs text-emerald-100/80 leading-relaxed max-w-sm">
                Learn Quran. Understand Islam. Build a Better Future. An international Islamic
                education academy dedicated to Tajweed, Hifz, Tafseer, and family character
                development.
              </p>
              <div className="pt-2">
                <PWAInstallButton />
              </div>
            </div>

            <div className="md:col-span-4 grid grid-cols-2 gap-4 text-xs">
              <div className="space-y-2">
                <p className="font-semibold text-[#D4AF37]">Academy</p>
                <button
                  type="button"
                  onClick={() => navigate('home')}
                  className="block text-emerald-100/80 hover:text-white"
                >
                  Home
                </button>
                <button
                  type="button"
                  onClick={() => navigate('about')}
                  className="block text-emerald-100/80 hover:text-white"
                >
                  About Us
                </button>
                <button
                  type="button"
                  onClick={() => navigate('quran')}
                  className="block text-emerald-100/80 hover:text-white"
                >
                  Holy Quran
                </button>
                <button
                  type="button"
                  onClick={() => navigate('courses')}
                  className="block text-emerald-100/80 hover:text-white"
                >
                  Courses
                </button>
              </div>
              <div className="space-y-2">
                <p className="font-semibold text-[#D4AF37]">Resources</p>
                <button
                  type="button"
                  onClick={() => navigate('live-classes')}
                  className="block text-emerald-100/80 hover:text-white"
                >
                  Live Classes
                </button>
                <button
                  type="button"
                  onClick={() => navigate('library')}
                  className="block text-emerald-100/80 hover:text-white"
                >
                  Islamic Library
                </button>
                <button
                  type="button"
                  onClick={() => navigate('lectures')}
                  className="block text-emerald-100/80 hover:text-white"
                >
                  Lectures
                </button>
                <button
                  type="button"
                  onClick={() => navigate('contact')}
                  className="block text-emerald-100/80 hover:text-white"
                >
                  Contact Us
                </button>
              </div>
            </div>

            <div className="md:col-span-3 space-y-2 text-xs">
              <p className="font-semibold text-[#D4AF37]">Connect</p>
              <a
                href="https://youtube.com"
                target="_blank"
                rel="noopener noreferrer"
                className="block text-emerald-100/80 hover:text-white"
              >
                YouTube Academy Channel
              </a>
              <a
                href="https://instagram.com"
                target="_blank"
                rel="noopener noreferrer"
                className="block text-emerald-100/80 hover:text-white"
              >
                Instagram Community
              </a>
              <a
                href="https://facebook.com"
                target="_blank"
                rel="noopener noreferrer"
                className="block text-emerald-100/80 hover:text-white"
              >
                Facebook Study Group
              </a>
              <button
                type="button"
                onClick={() => navigate('auth')}
                className="block text-emerald-100/80 hover:text-white"
              >
                Student &amp; Parent Login
              </button>
            </div>
          </div>

          <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-emerald-100/70">
            <span>© {new Date().getFullYear()} ZARTHOUGHTS QURAN ACADEMY. All rights reserved.</span>
            <span>Learn Quran. Understand Islam. Build a Better Future.</span>
          </div>
        </div>
      </footer>

      <OfflineIndicator />
    </div>
  );
};

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <AcademyShell />
      </AuthProvider>
    </ErrorBoundary>
  );
}
