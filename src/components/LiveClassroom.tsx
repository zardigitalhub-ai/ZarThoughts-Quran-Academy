import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  BookOpen,
  Circle,
  Download,
  Eraser,
  ExternalLink,
  Hand,
  Highlighter,
  Lock,
  MessageSquare,
  Minus,
  Pen,
  Radio,
  Send,
  Square,
  Trash2,
  Type,
  Undo2,
  Unlock,
  Users,
} from 'lucide-react';
import {
  collection,
  deleteDoc,
  deleteField,
  doc,
  getDoc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  writeBatch,
} from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { ALL_SURAHS } from '../data/quranMetadata';
import { fetchSurahWithTranslations } from '../services/quranService';
import {
  AyahData,
  ClassroomChatMessage,
  ClassroomParticipant,
  LiveClass,
  WhiteboardStroke,
  WhiteboardTool,
} from '../types/academy';

interface LiveClassroomProps {
  classItem: LiveClass;
  onExit: () => void;
}

const TAJWEED_COLORS = [
  { label: 'Ink', hex: '#0F1F1A' },
  { label: 'Ghunnah (Emerald)', hex: '#065F46' },
  { label: 'Madd (Gold)', hex: '#B8860B' },
  { label: 'Qalqalah (Crimson)', hex: '#DC2626' },
  { label: 'Idgham (Azure)', hex: '#0284C7' },
];

export const LiveClassroom: React.FC<LiveClassroomProps> = ({ classItem, onExit }) => {
  const { firebaseUser, profile } = useAuth();

  const [liveMeta, setLiveMeta] = useState<LiveClass>(classItem);
  const [classExistsInDb, setClassExistsInDb] = useState<boolean>(false);
  const [strokes, setStrokes] = useState<WhiteboardStroke[]>([]);
  const [messages, setMessages] = useState<ClassroomChatMessage[]>([]);
  const [participants, setParticipants] = useState<ClassroomParticipant[]>([]);
  const [pinnedAyahData, setPinnedAyahData] = useState<AyahData | null>(null);

  // Whiteboard tool state
  const [tool, setTool] = useState<WhiteboardTool>('pen');
  const [color, setColor] = useState<string>('#0F1F1A');
  const [lineWidth, setLineWidth] = useState<number>(4);
  const [textDraftPos, setTextDraftPos] = useState<{ x: number; y: number } | null>(null);
  const [textDraftValue, setTextDraftValue] = useState('');

  // Quran Ayah pin controls (Teacher)
  const [pinSurah, setPinSurah] = useState<number>(classItem.boardSurah || 1);
  const [pinAyah, setPinAyah] = useState<number>(classItem.boardAyah || 1);

  // Sidebar tab & chat input
  const [sideTab, setSideTab] = useState<'chat' | 'participants'>('chat');
  const [chatInput, setChatInput] = useState('');
  const [handRaised, setHandRaised] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  // Canvas Refs (per real-time guidelines: store canvas in refs, not state)
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const previewCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const isDrawingRef = useRef(false);
  const draftPointsRef = useRef<{ xs: number[]; ys: number[] }>({ xs: [], ys: [] });

  const isTeacherOrAdmin = useMemo(() => {
    if (!firebaseUser || !profile) return false;
    if (profile.role === 'super_admin') return true;
    return profile.role === 'teacher' && profile.teacherApproved === true;
  }, [firebaseUser, profile]);

  const canDraw =
    Boolean(firebaseUser?.emailVerified) &&
    classExistsInDb &&
    (isTeacherOrAdmin || liveMeta.allowStudentDraw === true);

  // 1. Ensure parent class doc exists if teacher/admin opens a seeded session, and listen to class metadata
  useEffect(() => {
    const classDocRef = doc(db, 'live_classes', classItem.id);

    const initAndListen = async () => {
      try {
        const snap = await getDoc(classDocRef);
        if (!snap.exists() && isTeacherOrAdmin && firebaseUser?.emailVerified) {
          await setDoc(classDocRef, {
            title: classItem.title,
            courseId: classItem.courseId || '',
            teacherId: firebaseUser.uid,
            teacherName: profile?.displayName || classItem.teacherName,
            scheduledFor: classItem.scheduledFor,
            durationMinutes: classItem.durationMinutes,
            meetingUrl: classItem.meetingUrl || '',
            topic: classItem.topic || '',
            status: 'live',
            allowStudentDraw: false,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
        }
      } catch (err) {
        console.warn('Class initialization check:', err);
      }
    };

    void initAndListen();

    const unsubClass = onSnapshot(
      classDocRef,
      (snap) => {
        if (snap.exists()) {
          setClassExistsInDb(true);
          setLiveMeta({ id: snap.id, ...(snap.data() as Omit<LiveClass, 'id'>) });
        } else {
          setClassExistsInDb(false);
        }
      },
      (err) => handleFirestoreError(err, OperationType.GET, `live_classes/${classItem.id}`)
    );

    return () => unsubClass();
  }, [classItem, isTeacherOrAdmin, firebaseUser, profile?.displayName]);

  // 2. Subscribe to whiteboard strokes, chat messages, and participants
  useEffect(() => {
    if (!firebaseUser || !classExistsInDb) return;

    const strokesQ = query(
      collection(db, 'live_classes', classItem.id, 'whiteboard_strokes'),
      orderBy('seq', 'asc')
    );
    const unsubStrokes = onSnapshot(
      strokesQ,
      (snap) => {
        setStrokes(
          snap.docs.map((d) => ({
            id: d.id,
            ...(d.data() as Omit<WhiteboardStroke, 'id'>),
          }))
        );
      },
      (err) =>
        handleFirestoreError(
          err,
          OperationType.LIST,
          `live_classes/${classItem.id}/whiteboard_strokes`
        )
    );

    const chatQ = query(
      collection(db, 'live_classes', classItem.id, 'chat_messages'),
      orderBy('createdAt', 'asc')
    );
    const unsubChat = onSnapshot(
      chatQ,
      (snap) => {
        setMessages(
          snap.docs.map((d) => ({
            id: d.id,
            ...(d.data() as Omit<ClassroomChatMessage, 'id'>),
          }))
        );
      },
      (err) =>
        handleFirestoreError(
          err,
          OperationType.LIST,
          `live_classes/${classItem.id}/chat_messages`
        )
    );

    const partQ = collection(db, 'live_classes', classItem.id, 'participants');
    const unsubParts = onSnapshot(
      partQ,
      (snap) => {
        setParticipants(
          snap.docs.map((d) => ({
            id: d.id,
            ...(d.data() as Omit<ClassroomParticipant, 'id'>),
          }))
        );
      },
      (err) =>
        handleFirestoreError(
          err,
          OperationType.LIST,
          `live_classes/${classItem.id}/participants`
        )
    );

    return () => {
      unsubStrokes();
      unsubChat();
      unsubParts();
    };
  }, [firebaseUser, classExistsInDb, classItem.id]);

  // 3. Register presence in participants subcollection when verified & class exists
  useEffect(() => {
    if (!firebaseUser || !firebaseUser.emailVerified || !profile || !classExistsInDb) return;
    const partRef = doc(db, 'live_classes', classItem.id, 'participants', firebaseUser.uid);

    void setDoc(partRef, {
      uid: firebaseUser.uid,
      displayName: profile.displayName.slice(0, 120),
      role: profile.role,
      handRaised: false,
      lastActiveAt: serverTimestamp(),
    }).catch((err) =>
      handleFirestoreError(
        err,
        OperationType.WRITE,
        `live_classes/${classItem.id}/participants/${firebaseUser.uid}`
      )
    );

    return () => {
      void deleteDoc(partRef).catch(() => {});
    };
  }, [firebaseUser, profile, classExistsInDb, classItem.id]);

  // 4. Load pinned Quran Ayah whenever boardSurah / boardAyah changes
  useEffect(() => {
    if (!liveMeta.boardSurah || !liveMeta.boardAyah) {
      setPinnedAyahData(null);
      return;
    }
    let active = true;
    fetchSurahWithTranslations(liveMeta.boardSurah)
      .then((ayahs) => {
        if (!active) return;
        const found = ayahs.find((a) => a.numberInSurah === liveMeta.boardAyah);
        setPinnedAyahData(found || null);
      })
      .catch(() => {
        if (active) setPinnedAyahData(null);
      });
    return () => {
      active = false;
    };
  }, [liveMeta.boardSurah, liveMeta.boardAyah]);

  // 5. Render strokes helper
  const renderStrokeOnCtx = (
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
    stroke: {
      tool: WhiteboardTool;
      color: string;
      lineWidth: number;
      xs: number[];
      ys: number[];
      text?: string;
    }
  ) => {
    if (stroke.xs.length === 0 || stroke.ys.length === 0) return;

    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    if (stroke.tool === 'eraser') {
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = stroke.lineWidth * 3;
    } else if (stroke.tool === 'highlighter') {
      ctx.strokeStyle = stroke.color;
      ctx.globalAlpha = 0.28;
      ctx.lineWidth = stroke.lineWidth * 4;
    } else {
      ctx.strokeStyle = stroke.color;
      ctx.fillStyle = stroke.color;
      ctx.lineWidth = stroke.lineWidth;
    }

    if (stroke.tool === 'text' && stroke.text) {
      const px = stroke.xs[0] * w;
      const py = stroke.ys[0] * h;
      const fontSize = Math.max(18, stroke.lineWidth * 4.5);
      ctx.font = `600 ${fontSize}px "Amiri", "Plus Jakarta Sans", sans-serif`;
      ctx.fillText(stroke.text, px, py);
      ctx.restore();
      return;
    }

    if (stroke.tool === 'line' && stroke.xs.length >= 2) {
      ctx.beginPath();
      ctx.moveTo(stroke.xs[0] * w, stroke.ys[0] * h);
      ctx.lineTo(
        stroke.xs[stroke.xs.length - 1] * w,
        stroke.ys[stroke.ys.length - 1] * h
      );
      ctx.stroke();
      ctx.restore();
      return;
    }

    if (stroke.tool === 'rect' && stroke.xs.length >= 2) {
      const x0 = stroke.xs[0] * w;
      const y0 = stroke.ys[0] * h;
      const x1 = stroke.xs[stroke.xs.length - 1] * w;
      const y1 = stroke.ys[stroke.ys.length - 1] * h;
      ctx.strokeRect(x0, y0, x1 - x0, y1 - y0);
      ctx.restore();
      return;
    }

    if (stroke.tool === 'circle' && stroke.xs.length >= 2) {
      const x0 = stroke.xs[0] * w;
      const y0 = stroke.ys[0] * h;
      const x1 = stroke.xs[stroke.xs.length - 1] * w;
      const y1 = stroke.ys[stroke.ys.length - 1] * h;
      const radius = Math.hypot(x1 - x0, y1 - y0);
      ctx.beginPath();
      ctx.arc(x0, y0, radius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
      return;
    }

    // Freehand pen / highlighter / eraser
    ctx.beginPath();
    ctx.moveTo(stroke.xs[0] * w, stroke.ys[0] * h);
    if (stroke.xs.length === 1) {
      ctx.lineTo(stroke.xs[0] * w + 0.1, stroke.ys[0] * h + 0.1);
    } else {
      for (let i = 1; i < stroke.xs.length; i++) {
        const px = stroke.xs[i] * w;
        const py = stroke.ys[i] * h;
        ctx.lineTo(px, py);
      }
    }
    ctx.stroke();
    ctx.restore();
  };

  // Redraw main canvas whenever strokes or container size changes
  const redrawAllStrokes = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const w = canvas.width / dpr;
    const h = canvas.height / dpr;

    ctx.save();
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, w, h);

    // Faint study grid lines
    ctx.strokeStyle = '#F1F5F3';
    ctx.lineWidth = 1;
    for (let gx = 40; gx < w; gx += 40) {
      ctx.beginPath();
      ctx.moveTo(gx, 0);
      ctx.lineTo(gx, h);
      ctx.stroke();
    }
    for (let gy = 40; gy < h; gy += 40) {
      ctx.beginPath();
      ctx.moveTo(0, gy);
      ctx.lineTo(w, gy);
      ctx.stroke();
    }

    for (const s of strokes) {
      renderStrokeOnCtx(ctx, w, h, s);
    }
    ctx.restore();
  };

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const syncCanvasDimensions = () => {
      const rect = container.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      for (const c of [canvasRef.current, previewCanvasRef.current]) {
        if (!c) continue;
        c.width = Math.max(1, Math.floor(rect.width * dpr));
        c.height = Math.max(1, Math.floor(rect.height * dpr));
        c.style.width = `${rect.width}px`;
        c.style.height = `${rect.height}px`;
      }
      redrawAllStrokes();
    };

    syncCanvasDimensions();
    const ro = new ResizeObserver(syncCanvasDimensions);
    ro.observe(container);
    return () => ro.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    redrawAllStrokes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [strokes]);

  const getNormalizedPoint = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const y = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));
    return { x, y };
  };

  const commitStrokeToFirestore = async (
    strokeTool: WhiteboardTool,
    xs: number[],
    ys: number[],
    text?: string
  ) => {
    if (!firebaseUser || !profile || !classExistsInDb) return;
    const strokeId = `stk_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const safeXs = xs.slice(0, 400);
    const safeYs = ys.slice(0, 400);

    try {
      await setDoc(doc(db, 'live_classes', classItem.id, 'whiteboard_strokes', strokeId), {
        authorUid: firebaseUser.uid,
        authorName: profile.displayName.slice(0, 120),
        tool: strokeTool,
        color,
        lineWidth,
        xs: safeXs,
        ys: safeYs,
        ...(text ? { text: text.slice(0, 300) } : {}),
        seq: Date.now(),
        createdAt: serverTimestamp(),
      });
    } catch (err) {
      handleFirestoreError(
        err,
        OperationType.CREATE,
        `live_classes/${classItem.id}/whiteboard_strokes/${strokeId}`
      );
    }
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!canDraw) return;
    const pt = getNormalizedPoint(e);

    if (tool === 'text') {
      setTextDraftPos(pt);
      setTextDraftValue('');
      return;
    }

    e.currentTarget.setPointerCapture(e.pointerId);
    isDrawingRef.current = true;
    draftPointsRef.current = { xs: [pt.x], ys: [pt.y] };
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current || !canDraw) return;
    const pt = getNormalizedPoint(e);
    const { xs, ys } = draftPointsRef.current;

    const lastX = xs[xs.length - 1];
    const lastY = ys[ys.length - 1];
    const dist = Math.hypot(pt.x - lastX, pt.y - lastY);

    // Throttle tiny jitter & enforce 400-point Firestore cap
    if (tool === 'pen' || tool === 'highlighter' || tool === 'eraser') {
      if (dist < 0.003 || xs.length >= 380) return;
      xs.push(pt.x);
      ys.push(pt.y);
    } else {
      if (xs.length === 1) {
        xs.push(pt.x);
        ys.push(pt.y);
      } else {
        xs[1] = pt.x;
        ys[1] = pt.y;
      }
    }

    const preview = previewCanvasRef.current;
    if (!preview) return;
    const ctx = preview.getContext('2d');
    if (!ctx) return;
    const dpr = window.devicePixelRatio || 1;
    const w = preview.width / dpr;
    const h = preview.height / dpr;

    ctx.save();
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    renderStrokeOnCtx(ctx, w, h, { tool, color, lineWidth, xs, ys });
    ctx.restore();
  };

  const handlePointerUp = async () => {
    if (!isDrawingRef.current) return;
    isDrawingRef.current = false;

    const preview = previewCanvasRef.current;
    if (preview) {
      const ctx = preview.getContext('2d');
      ctx?.clearRect(0, 0, preview.width, preview.height);
    }

    const { xs, ys } = draftPointsRef.current;
    draftPointsRef.current = { xs: [], ys: [] };
    if (xs.length > 0) {
      await commitStrokeToFirestore(tool, xs, ys);
    }
  };

  const handleCommitTextNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!textDraftPos || !textDraftValue.trim()) {
      setTextDraftPos(null);
      return;
    }
    const pos = textDraftPos;
    const txt = textDraftValue.trim();
    setTextDraftPos(null);
    setTextDraftValue('');
    await commitStrokeToFirestore('text', [pos.x], [pos.y], txt);
  };

  const handleUndoLast = async () => {
    if (!canDraw || strokes.length === 0) return;
    const reversed = [...strokes].reverse();
    const target = isTeacherOrAdmin
      ? reversed[0]
      : reversed.find((s) => s.authorUid === firebaseUser?.uid);
    if (!target) return;
    try {
      await deleteDoc(
        doc(db, 'live_classes', classItem.id, 'whiteboard_strokes', target.id)
      );
    } catch (err) {
      handleFirestoreError(
        err,
        OperationType.DELETE,
        `live_classes/${classItem.id}/whiteboard_strokes/${target.id}`
      );
    }
  };

  const handleClearBoard = async () => {
    if (!isTeacherOrAdmin || strokes.length === 0) return;
    try {
      const batch = writeBatch(db);
      for (const s of strokes) {
        batch.delete(doc(db, 'live_classes', classItem.id, 'whiteboard_strokes', s.id));
      }
      await batch.commit();
    } catch (err) {
      handleFirestoreError(
        err,
        OperationType.DELETE,
        `live_classes/${classItem.id}/whiteboard_strokes`
      );
    }
  };

  const handleExportPng = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement('a');
    link.download = `zarthoughts_whiteboard_${classItem.id}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  const handleUpdateClassField = async (updates: Record<string, unknown>) => {
    if (!isTeacherOrAdmin) return;
    try {
      await updateDoc(doc(db, 'live_classes', classItem.id), {
        ...updates,
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `live_classes/${classItem.id}`);
    }
  };

  const handlePinAyah = async () => {
    if (!isTeacherOrAdmin) return;
    const maxAyah = ALL_SURAHS.find((s) => s.number === pinSurah)?.ayahCount || 7;
    const safeAyah = Math.max(1, Math.min(maxAyah, pinAyah));
    await handleUpdateClassField({ boardSurah: pinSurah, boardAyah: safeAyah });
    setNotice(`Pinned Surah ${pinSurah}:${safeAyah} to the whiteboard.`);
    setTimeout(() => setNotice(null), 3000);
  };

  const handleToggleHand = async () => {
    if (!firebaseUser || !profile || !classExistsInDb) return;
    const next = !handRaised;
    setHandRaised(next);
    try {
      await updateDoc(
        doc(db, 'live_classes', classItem.id, 'participants', firebaseUser.uid),
        {
          handRaised: next,
          lastActiveAt: serverTimestamp(),
        }
      );
    } catch (err) {
      handleFirestoreError(
        err,
        OperationType.UPDATE,
        `live_classes/${classItem.id}/participants/${firebaseUser.uid}`
      );
    }
  };

  const handleLowerStudentHand = async (studentUid: string) => {
    if (!isTeacherOrAdmin) return;
    try {
      await updateDoc(doc(db, 'live_classes', classItem.id, 'participants', studentUid), {
        handRaised: false,
        lastActiveAt: serverTimestamp(),
      });
    } catch (err) {
      handleFirestoreError(
        err,
        OperationType.UPDATE,
        `live_classes/${classItem.id}/participants/${studentUid}`
      );
    }
  };

  const handleSendChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firebaseUser || !profile || !chatInput.trim() || !classExistsInDb) return;
    const msgId = `msg_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const text = chatInput.trim().slice(0, 500);
    setChatInput('');
    try {
      await setDoc(doc(db, 'live_classes', classItem.id, 'chat_messages', msgId), {
        senderUid: firebaseUser.uid,
        senderName: profile.displayName.slice(0, 120),
        senderRole: profile.role,
        message: text,
        createdAt: serverTimestamp(),
      });
    } catch (err) {
      handleFirestoreError(
        err,
        OperationType.CREATE,
        `live_classes/${classItem.id}/chat_messages/${msgId}`
      );
    }
  };

  const maxAyahForSelectedSurah =
    ALL_SURAHS.find((s) => s.number === pinSurah)?.ayahCount || 7;

  return (
    <section className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* Top Classroom Header */}
      <div className="bg-white border border-[#E2E8E5] rounded-2xl p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-5">
        <div className="flex items-start sm:items-center gap-3">
          <button
            type="button"
            onClick={onExit}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-[#E2E8E5] text-xs font-medium text-[#0F1F1A] hover:border-[#065F46] shrink-0"
          >
            <ArrowLeft className="w-4 h-4" />
            Exit Class
          </button>
          <div>
            <div className="flex flex-wrap items-center gap-2 text-xs text-[#475A53]">
              <span className="inline-flex items-center gap-1 font-semibold text-[#065F46]">
                <Radio className="w-3.5 h-3.5" />
                {liveMeta.status === 'live'
                  ? 'Live Class Active'
                  : liveMeta.status === 'completed'
                  ? 'Session Completed'
                  : 'Scheduled Classroom'}
              </span>
              <span aria-hidden="true">·</span>
              <span>Teacher: {liveMeta.teacherName}</span>
              <span aria-hidden="true">·</span>
              <span className="tabular-nums">{participants.length} in room</span>
            </div>
            <h1 className="font-display text-2xl sm:text-3xl font-bold text-[#0F1F1A] mt-0.5">
              {liveMeta.title}
            </h1>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {!isTeacherOrAdmin && classExistsInDb && (
            <button
              type="button"
              onClick={() => void handleToggleHand()}
              className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-medium transition-colors ${
                handRaised
                  ? 'bg-[#B8860B] text-white'
                  : 'border border-[#E2E8E5] bg-[#FAF9F6] text-[#0F1F1A] hover:border-[#B8860B]'
              }`}
            >
              <Hand className="w-3.5 h-3.5" />
              {handRaised ? 'Hand Raised' : 'Raise Hand'}
            </button>
          )}

          {isTeacherOrAdmin && (
            <>
              <div className="inline-flex p-1 bg-[#F6F8F7] border border-[#E2E8E5] rounded-lg">
                {(['scheduled', 'live', 'completed'] as const).map((st) => (
                  <button
                    key={st}
                    type="button"
                    onClick={() => void handleUpdateClassField({ status: st })}
                    className={`px-3 py-1.5 text-xs font-medium rounded-md capitalize transition-colors ${
                      liveMeta.status === st
                        ? 'bg-[#065F46] text-white'
                        : 'text-[#475A53] hover:text-[#0F1F1A]'
                    }`}
                  >
                    {st}
                  </button>
                ))}
              </div>

              <button
                type="button"
                onClick={() =>
                  void handleUpdateClassField({
                    allowStudentDraw: !liveMeta.allowStudentDraw,
                  })
                }
                className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border text-xs font-medium transition-colors ${
                  liveMeta.allowStudentDraw
                    ? 'border-[#065F46] bg-emerald-50 text-[#065F46]'
                    : 'border-[#E2E8E5] bg-white text-[#475A53]'
                }`}
              >
                {liveMeta.allowStudentDraw ? (
                  <Unlock className="w-3.5 h-3.5" />
                ) : (
                  <Lock className="w-3.5 h-3.5" />
                )}
                {liveMeta.allowStudentDraw ? 'Student Draw: ON' : 'Student Draw: OFF'}
              </button>
            </>
          )}

          {liveMeta.meetingUrl &&
            (liveMeta.meetingUrl.startsWith('https://') ||
              liveMeta.meetingUrl.startsWith('http://')) && (
              <a
                href={liveMeta.meetingUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#065F46] text-white text-xs font-medium hover:bg-[#047857]"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                Voice / Video Room
              </a>
            )}
        </div>
      </div>

      {!classExistsInDb && (
        <div className="mb-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-900">
          This session has not yet been initialized in the live database by the teacher. Once the
          teacher opens the room, real-time whiteboard drawing and chat activate automatically.
        </div>
      )}

      {notice && (
        <div
          role="status"
          className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-xs font-medium text-[#065F46]"
        >
          {notice}
        </div>
      )}

      {/* Main Classroom Grid: Whiteboard (Left 8 cols) + Chat/Participants (Right 4 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* WHITEBOARD STAGE */}
        <div className="lg:col-span-8 bg-white border border-[#E2E8E5] rounded-2xl overflow-hidden flex flex-col">
          {/* Whiteboard Toolbar */}
          <div className="p-3 border-b border-[#E2E8E5] bg-[#FAF9F6] flex flex-wrap items-center justify-between gap-3">
            {canDraw ? (
              <div className="flex flex-wrap items-center gap-1.5">
                {(
                  [
                    { id: 'pen', icon: Pen, label: 'Pen' },
                    { id: 'highlighter', icon: Highlighter, label: 'Tajweed Highlight' },
                    { id: 'line', icon: Minus, label: 'Line' },
                    { id: 'rect', icon: Square, label: 'Box' },
                    { id: 'circle', icon: Circle, label: 'Circle' },
                    { id: 'text', icon: Type, label: 'Text / Arabic Note' },
                    { id: 'eraser', icon: Eraser, label: 'Eraser' },
                  ] as const
                ).map((item) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      title={item.label}
                      onClick={() => setTool(item.id)}
                      className={`inline-flex items-center gap-1.5 px-2.5 py-2 rounded-lg text-xs font-medium transition-colors ${
                        tool === item.id
                          ? 'bg-[#065F46] text-white'
                          : 'bg-white border border-[#E2E8E5] text-[#0F1F1A] hover:border-[#065F46]'
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">{item.label}</span>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="text-xs font-medium text-[#475A53]">
                Live Student View · Watching Teacher&rsquo;s Whiteboard
              </div>
            )}

            <div className="flex flex-wrap items-center gap-2">
              {canDraw && (
                <>
                  <div className="flex items-center gap-1 px-2 py-1 bg-white border border-[#E2E8E5] rounded-lg">
                    {TAJWEED_COLORS.map((swatch) => (
                      <button
                        key={swatch.hex}
                        type="button"
                        title={swatch.label}
                        onClick={() => setColor(swatch.hex)}
                        aria-label={swatch.label}
                        className={`w-5 h-5 rounded-full border-2 transition-transform ${
                          color === swatch.hex ? 'border-[#0F1F1A] scale-110' : 'border-white'
                        }`}
                        style={{ backgroundColor: swatch.hex }}
                      />
                    ))}
                  </div>

                  <select
                    aria-label="Pen thickness"
                    value={lineWidth}
                    onChange={(e) => setLineWidth(Number(e.target.value))}
                    className="h-8 px-2 rounded-lg border border-[#E2E8E5] bg-white text-xs tabular-nums"
                  >
                    <option value={2}>Fine (2px)</option>
                    <option value={4}>Medium (4px)</option>
                    <option value={8}>Marker (8px)</option>
                  </select>

                  <button
                    type="button"
                    onClick={() => void handleUndoLast()}
                    title="Undo last stroke"
                    className="p-2 rounded-lg border border-[#E2E8E5] bg-white text-[#0F1F1A] hover:border-[#065F46]"
                  >
                    <Undo2 className="w-3.5 h-3.5" />
                  </button>
                </>
              )}

              {isTeacherOrAdmin && (
                <button
                  type="button"
                  onClick={() => void handleClearBoard()}
                  title="Clear entire whiteboard"
                  className="inline-flex items-center gap-1 px-2.5 py-2 rounded-lg border border-red-200 bg-white text-red-700 text-xs font-medium hover:bg-red-50"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Clear
                </button>
              )}

              <button
                type="button"
                onClick={handleExportPng}
                title="Download Whiteboard PNG"
                className="inline-flex items-center gap-1 px-2.5 py-2 rounded-lg border border-[#E2E8E5] bg-white text-[#0F1F1A] text-xs font-medium hover:border-[#065F46]"
              >
                <Download className="w-3.5 h-3.5" />
                Save PNG
              </button>
            </div>
          </div>

          {/* Teacher Quran Ayah Pinning Bar */}
          {isTeacherOrAdmin && (
            <div className="px-4 py-2.5 border-b border-[#E2E8E5] bg-white flex flex-wrap items-center gap-2 text-xs">
              <span className="inline-flex items-center gap-1.5 font-medium text-[#065F46]">
                <BookOpen className="w-3.5 h-3.5" />
                Pin Ayah on Board:
              </span>
              <select
                value={pinSurah}
                onChange={(e) => {
                  setPinSurah(Number(e.target.value));
                  setPinAyah(1);
                }}
                className="h-8 px-2 rounded-lg border border-[#E2E8E5] bg-[#FAF9F6]"
              >
                {ALL_SURAHS.map((s) => (
                  <option key={s.number} value={s.number}>
                    {s.number}. {s.transliteration} ({s.arabicName})
                  </option>
                ))}
              </select>
              <input
                type="number"
                min={1}
                max={maxAyahForSelectedSurah}
                value={pinAyah}
                onChange={(e) => setPinAyah(Number(e.target.value))}
                className="w-16 h-8 px-2 rounded-lg border border-[#E2E8E5] tabular-nums"
              />
              <button
                type="button"
                onClick={() => void handlePinAyah()}
                className="h-8 px-3 rounded-lg bg-[#065F46] text-white font-medium hover:bg-[#047857]"
              >
                Pin Ayah
              </button>
              {pinnedAyahData && (
                <button
                  type="button"
                  onClick={() =>
                    void handleUpdateClassField({
                      boardSurah: deleteField(),
                      boardAyah: deleteField(),
                    })
                  }
                  className="h-8 px-2.5 rounded-lg border border-[#E2E8E5] text-[#475A53] hover:text-[#0F1F1A]"
                >
                  Unpin
                </button>
              )}
            </div>
          )}

          {/* Pinned Quran Ayah Reference Strip */}
          {pinnedAyahData && (
            <div className="px-5 py-3.5 border-b border-[#E2E8E5] bg-[#FAF9F6] flex flex-col gap-1">
              <div className="flex items-center justify-between text-[11px] text-[#065F46] font-medium tabular-nums">
                <span>
                  Lesson Verse · Surah {liveMeta.boardSurah}:{pinnedAyahData.numberInSurah}
                </span>
                <span>Juz {pinnedAyahData.juz}</span>
              </div>
              <p className="font-arabic text-2xl sm:text-3xl text-right text-[#0F1F1A] leading-loose">
                {pinnedAyahData.arabicText}
              </p>
              <p className="text-xs text-[#475A53]">{pinnedAyahData.englishText}</p>
            </div>
          )}

          {/* Dual Canvas Drawing Stage */}
          <div
            ref={containerRef}
            className="relative flex-1 min-h-[440px] sm:min-h-[520px] bg-white select-none"
          >
            <canvas ref={canvasRef} className="absolute inset-0 block w-full h-full" />
            <canvas
              ref={previewCanvasRef}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={() => void handlePointerUp()}
              onPointerCancel={() => void handlePointerUp()}
              className={`absolute inset-0 block w-full h-full touch-none ${
                canDraw ? 'cursor-crosshair' : 'cursor-default'
              }`}
            />

            {textDraftPos && (
              <form
                onSubmit={handleCommitTextNote}
                style={{
                  left: `${Math.min(72, textDraftPos.x * 100)}%`,
                  top: `${Math.min(82, textDraftPos.y * 100)}%`,
                }}
                className="absolute z-20 flex items-center gap-1.5 bg-white border border-[#065F46] rounded-lg p-1.5 shadow-lg"
              >
                <input
                  type="text"
                  autoFocus
                  maxLength={300}
                  value={textDraftValue}
                  onChange={(e) => setTextDraftValue(e.target.value)}
                  placeholder="Type Arabic / English note..."
                  className="h-8 px-2 text-xs focus:outline-none min-w-[180px]"
                />
                <button
                  type="submit"
                  className="h-8 px-2.5 rounded bg-[#065F46] text-white text-xs font-medium"
                >
                  Place
                </button>
                <button
                  type="button"
                  onClick={() => setTextDraftPos(null)}
                  className="h-8 px-2 text-xs text-[#475A53]"
                >
                  Cancel
                </button>
              </form>
            )}
          </div>
        </div>

        {/* CLASSROOM SIDEBAR: CHAT + PARTICIPANTS */}
        <aside className="lg:col-span-4 bg-white border border-[#E2E8E5] rounded-2xl flex flex-col overflow-hidden min-h-[520px]">
          <div className="p-2 border-b border-[#E2E8E5] bg-[#FAF9F6] grid grid-cols-2 gap-1">
            <button
              type="button"
              onClick={() => setSideTab('chat')}
              className={`py-2 rounded-lg text-xs font-medium inline-flex items-center justify-center gap-1.5 ${
                sideTab === 'chat' ? 'bg-white text-[#0F1F1A] shadow-xs' : 'text-[#475A53]'
              }`}
            >
              <MessageSquare className="w-3.5 h-3.5" />
              Class Chat ({messages.length})
            </button>
            <button
              type="button"
              onClick={() => setSideTab('participants')}
              className={`py-2 rounded-lg text-xs font-medium inline-flex items-center justify-center gap-1.5 ${
                sideTab === 'participants'
                  ? 'bg-white text-[#0F1F1A] shadow-xs'
                  : 'text-[#475A53]'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              Attendees ({participants.length})
            </button>
          </div>

          {sideTab === 'chat' ? (
            <>
              <div className="flex-1 p-4 space-y-3 overflow-y-auto max-h-[460px]">
                {messages.length === 0 ? (
                  <p className="text-xs text-[#475A53] text-center py-8">
                    Ask questions or share recitation notes with your teacher and classmates.
                  </p>
                ) : (
                  messages.map((m) => {
                    const isSelf = m.senderUid === firebaseUser?.uid;
                    const isFaculty =
                      m.senderRole === 'teacher' || m.senderRole === 'super_admin';
                    return (
                      <div
                        key={m.id}
                        className={`p-3 rounded-xl border text-xs ${
                          isFaculty
                            ? 'bg-emerald-50/70 border-emerald-200'
                            : isSelf
                            ? 'bg-[#FAF9F6] border-[#E2E8E5]'
                            : 'bg-white border-[#E2E8E5]'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <span className="font-semibold text-[#0F1F1A]">
                            {m.senderName}
                          </span>
                          <span className="text-[11px] text-[#065F46] capitalize">
                            {m.senderRole.replace('_', ' ')}
                          </span>
                        </div>
                        <p className="text-sm text-[#0F1F1A] leading-relaxed">{m.message}</p>
                      </div>
                    );
                  })
                )}
              </div>

              <form
                onSubmit={handleSendChat}
                className="p-3 border-t border-[#E2E8E5] bg-[#FAF9F6] flex gap-2"
              >
                <input
                  type="text"
                  maxLength={500}
                  disabled={!classExistsInDb || !firebaseUser?.emailVerified}
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder="Ask your teacher a question..."
                  className="flex-1 h-10 px-3 rounded-lg border border-[#E2E8E5] bg-white text-xs focus:outline-none focus:border-[#065F46]"
                />
                <button
                  type="submit"
                  disabled={!classExistsInDb || !chatInput.trim()}
                  aria-label="Send message"
                  className="w-10 h-10 rounded-lg bg-[#065F46] text-white flex items-center justify-center hover:bg-[#047857] disabled:opacity-40"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </>
          ) : (
            <div className="flex-1 p-4 space-y-2.5 overflow-y-auto max-h-[520px]">
              {participants.length === 0 ? (
                <p className="text-xs text-[#475A53] text-center py-8">
                  Connected students and teachers will appear here.
                </p>
              ) : (
                participants.map((p) => (
                  <div
                    key={p.id}
                    className="p-3 rounded-xl border border-[#E2E8E5] bg-[#FAF9F6] flex items-center justify-between gap-3"
                  >
                    <div>
                      <div className="text-sm font-medium text-[#0F1F1A]">
                        {p.displayName}
                      </div>
                      <div className="text-[11px] text-[#475A53] capitalize">
                        {p.role.replace('_', ' ')}
                      </div>
                    </div>

                    {p.handRaised && (
                      <div className="flex items-center gap-2">
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-[#B8860B]">
                          <Hand className="w-3.5 h-3.5" /> Hand Raised
                        </span>
                        {isTeacherOrAdmin && (
                          <button
                            type="button"
                            onClick={() => void handleLowerStudentHand(p.uid)}
                            className="px-2 py-1 rounded border border-[#E2E8E5] bg-white text-[11px]"
                          >
                            Acknowledge
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          )}
        </aside>
      </div>
    </section>
  );
};
