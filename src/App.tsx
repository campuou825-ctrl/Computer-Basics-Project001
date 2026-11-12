/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
  FILMS,
  SHEETS,
  DECADE_TABS,
  INK_BLOBS,
  getTabIdForFilmIndex,
  Film,
} from './films';
import {
  smoothstep,
  computeTapeX,
  computeRelativeIndex,
  computeOpenness,
  computeCropCss,
  shortestJumpToFilm,
  computeBlobRadius,
} from './shelf-math';

declare global {
  interface Window {
    onYouTubeIframeAPIReady?: () => void;
    YT?: any;
  }
}

export default function App() {
  // Current and target scroll positions (in tape units, initialized to film 5 in middle copy = 17)
  const sRef = useRef<number>(17);
  const targetRef = useRef<number>(17);
  const [activeFilmIndex, setActiveFilmIndex] = useState<number>(5);

  // Layout probe and dimension state
  const probeRef = useRef<HTMLDivElement>(null);
  const dimsRef = useRef<{ H: number; ws: number; d: number; gap: number }>({
    H: 350,
    ws: 59,
    d: 184,
    gap: 10.5,
  });

  // Pointer & cursor coordinates
  const mouseRef = useRef<{ x: number; y: number }>({ x: -100, y: -100 });
  const cursorRef = useRef<{ x: number; y: number }>({ x: -100, y: -100 });
  const [cursorState, setCursorState] = useState<'default' | 'spine' | 'btn' | 'open'>('default');

  // Interactive 3D tilt & hover lifts
  const tiltRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const hoveredTapeRef = useRef<number>(-1);
  const liftsRef = useRef<Float32Array>(new Float32Array(36));

  // Drag tracking
  const dragRef = useRef<{ isDragging: boolean; startX: number; startT: number; moved: boolean }>({
    isDragging: false,
    startX: 0,
    startT: 17,
    moved: false,
  });

  // Wheel debouncing
  const wheelTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Detail modal state
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const isOpenRef = useRef<boolean>(false);
  isOpenRef.current = isOpen;
  const detailModalRef = useRef<HTMLDivElement>(null);
  const [detailFilm, setDetailFilm] = useState<Film>(FILMS[5]);
  const inkRadiiRef = useRef<number[]>([0, 0, 0, 0, 0, 0, 0]);
  const [, setInkUpdateTick] = useState<number>(0);
  const inkRafRef = useRef<number | null>(null);

  // Lesson Reading & Syllabus State
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showCurriculumDrawer, setShowCurriculumDrawer] = useState<boolean>(false);

  const handleCopyText = (text: string, id: string) => {
    navigator.clipboard
      .writeText(text)
      .then(() => {
        setCopiedId(id);
        setTimeout(() => setCopiedId(null), 2200);
      })
      .catch(() => {});
  };

  const scrollToLesson = () => {
    const el = document.getElementById('chapter-content');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const navigateToChapterInDetail = (index: number) => {
    const nextIdx = (index + FILMS.length) % FILMS.length;
    setDetailFilm(FILMS[nextIdx]);
    if (detailModalRef.current) {
      detailModalRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // YouTube Background Music Player (FcI-ZBarMOU)
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const ytPlayerRef = useRef<any>(null);
  const hasInteractedRef = useRef<boolean>(false);

  useEffect(() => {
    let isUnmounted = false;

    const initYT = () => {
      if (isUnmounted) return;
      if (window.YT && window.YT.Player) {
        setupPlayer();
      } else {
        const prevReady = window.onYouTubeIframeAPIReady;
        window.onYouTubeIframeAPIReady = () => {
          if (prevReady) prevReady();
          if (!isUnmounted) setupPlayer();
        };
        if (!document.querySelector('script[src*="youtube.com/iframe_api"]')) {
          const tag = document.createElement('script');
          tag.src = 'https://www.youtube.com/iframe_api';
          document.head.appendChild(tag);
        }
      }
    };

    const setupPlayer = () => {
      if (ytPlayerRef.current || !document.getElementById('youtube-audio-player')) return;
      try {
        ytPlayerRef.current = new window.YT.Player('youtube-audio-player', {
          height: '1',
          width: '1',
          videoId: 'FcI-ZBarMOU',
          playerVars: {
            autoplay: 1,
            controls: 0,
            disablekb: 1,
            enablejsapi: 1,
            fs: 0,
            loop: 1,
            playlist: 'FcI-ZBarMOU',
            modestbranding: 1,
            playsinline: 1,
            rel: 0,
            origin: window.location.origin,
          },
          events: {
            onReady: (e: any) => {
              try {
                e.target.playVideo();
              } catch (_) {}
            },
            onStateChange: (e: any) => {
              if (isUnmounted) return;
              setIsPlaying(e.data === 1);
            },
          },
        });
      } catch (err) {
        console.warn('YouTube Player init error:', err);
      }
    };

    initYT();

    // Auto-start playback on first user gesture if browser autoplay blocked it
    const startAudioOnGesture = () => {
      if (ytPlayerRef.current && typeof ytPlayerRef.current.playVideo === 'function') {
        hasInteractedRef.current = true;
        try {
          ytPlayerRef.current.playVideo();
        } catch (_) {}
      }
    };

    window.addEventListener('click', startAudioOnGesture, { once: true });
    window.addEventListener('pointerdown', startAudioOnGesture, { once: true });
    window.addEventListener('keydown', startAudioOnGesture, { once: true });

    return () => {
      isUnmounted = true;
      window.removeEventListener('click', startAudioOnGesture);
      window.removeEventListener('pointerdown', startAudioOnGesture);
      window.removeEventListener('keydown', startAudioOnGesture);
      if (ytPlayerRef.current && typeof ytPlayerRef.current.destroy === 'function') {
        ytPlayerRef.current.destroy();
        ytPlayerRef.current = null;
      }
    };
  }, []);

  const toggleAudio = () => {
    hasInteractedRef.current = true;
    if (!ytPlayerRef.current || typeof ytPlayerRef.current.playVideo !== 'function') {
      return;
    }
    if (isPlaying) {
      ytPlayerRef.current.pauseVideo();
      setIsPlaying(false);
    } else {
      ytPlayerRef.current.playVideo();
      setIsPlaying(true);
    }
  };

  // DOM node references for 3D elements
  const stageRef = useRef<HTMLDivElement>(null);
  const tapesRef = useRef<(HTMLDivElement | null)[]>([]);
  const activeCoverFaceRef = useRef<HTMLDivElement | null>(null);
  const cursorElRef = useRef<HTMLDivElement>(null);
  const playRingRef = useRef<HTMLButtonElement>(null);

  // Decade tab indicator reference
  const tabsNavRef = useRef<HTMLElement>(null);
  const tabButtonRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const tabIndicatorRef = useRef<HTMLDivElement>(null);

  // Caption lines containers for text sliding masks
  const captionTitleBoxRef = useRef<HTMLDivElement>(null);
  const captionSubBoxRef = useRef<HTMLDivElement>(null);
  const captionYearBoxRef = useRef<HTMLDivElement>(null);

  // Preload all 4 sheet images
  useEffect(() => {
    Object.values(SHEETS).forEach((sheet) => {
      const img = new Image();
      img.src = sheet.url;
    });
  }, []);

  // Update geometry measurements from real CSS --H
  const measureDimensions = useCallback(() => {
    if (!probeRef.current) return;
    const computedH = probeRef.current.offsetHeight || 350;
    const H = computedH;
    const ws = (H * 142) / 840;
    const d = (H * 474) / 900;
    const gap = H * 0.03;
    dimsRef.current = { H, ws, d, gap };

    if (stageRef.current) {
      stageRef.current.style.setProperty('--ws', `${ws}px`);
      stageRef.current.style.setProperty('--d', `${d}px`);
      stageRef.current.style.setProperty('--H', `${H}px`);
    }
  }, []);

  useEffect(() => {
    measureDimensions();
    window.addEventListener('resize', measureDimensions);
    return () => window.removeEventListener('resize', measureDimensions);
  }, [measureDimensions]);

  // Update tab indicator position and width
  const updateTabIndicator = useCallback((filmIndex: number) => {
    const activeTabId = getTabIdForFilmIndex(filmIndex);
    const activeIdx = DECADE_TABS.findIndex((t) => t.id === activeTabId);
    const btn = tabButtonRefs.current[activeIdx];
    if (btn && tabIndicatorRef.current && tabsNavRef.current) {
      const left = btn.offsetLeft;
      const width = btn.offsetWidth;
      tabIndicatorRef.current.style.transform = `translateX(${left}px)`;
      tabIndicatorRef.current.style.width = `${width}px`;
    }
  }, []);

  // Slide caption text through overflow masks
  const triggerCaptionSwap = useCallback(
    (newFilm: Film, dir: number) => {
      const isReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      const effectiveDir = dir === 0 ? 1 : dir;

      const swapMask = (container: HTMLDivElement | null, text: string) => {
        if (!container) return;
        if (isReduced) {
          container.textContent = text;
          return;
        }

        const oldSpans = Array.from(container.querySelectorAll('span'));
        oldSpans.forEach((sp) => {
          if (!sp.dataset.leaving) {
            sp.dataset.leaving = 'true';
            sp.animate(
              [
                { transform: 'translateY(0%)' },
                { transform: `translateY(${-effectiveDir * 105}%)` },
              ],
              {
                duration: 650,
                easing: 'cubic-bezier(0.2, 0.8, 0.2, 1)',
                fill: 'both',
              }
            ).onfinish = () => sp.remove();
          }
        });

        const newSpan = document.createElement('span');
        newSpan.textContent = text;
        newSpan.style.display = 'block';
        newSpan.style.position = 'absolute';
        newSpan.style.inset = '0';
        newSpan.style.textAlign = 'center';
        container.appendChild(newSpan);

        newSpan.animate(
          [
            { transform: `translateY(${effectiveDir * 105}%)` },
            { transform: 'translateY(0%)' },
          ],
          {
            duration: 650,
            easing: 'cubic-bezier(0.2, 0.8, 0.2, 1)',
            fill: 'both',
          }
        );
      };

      swapMask(
        captionTitleBoxRef.current,
        `CH.${String(newFilm.chapterNumber).padStart(2, '0')}: ${newFilm.title}`
      );
      swapMask(
        captionSubBoxRef.current,
        `บทที่ ${newFilm.chapterNumber} • ${newFilm.titleTh}`
      );
      swapMask(
        captionYearBoxRef.current,
        `${newFilm.year} • ${newFilm.genre.toUpperCase()} • ${newFilm.minutes} MIN`
      );
    },
    []
  );

  // Initialize initial caption and tab indicator
  useEffect(() => {
    const film = FILMS[activeFilmIndex];
    if (captionTitleBoxRef.current)
      captionTitleBoxRef.current.textContent = `CH.${String(film.chapterNumber).padStart(2, '0')}: ${film.title}`;
    if (captionSubBoxRef.current)
      captionSubBoxRef.current.textContent = `บทที่ ${film.chapterNumber} • ${film.titleTh}`;
    if (captionYearBoxRef.current)
      captionYearBoxRef.current.textContent = `${film.year} • ${film.genre.toUpperCase()} • ${film.minutes} MIN`;
    updateTabIndicator(activeFilmIndex);
  }, [activeFilmIndex, updateTabIndicator]);

  // Main continuous requestAnimationFrame loop for spring physics, 3D tape transforms & cursor
  useEffect(() => {
    let prevTime = performance.now();
    let animId: number;

    const loop = (currentTime: number) => {
      const dt = Math.min((currentTime - prevTime) / 1000, 0.05);
      prevTime = currentTime;

      const isReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      const k = isReduced ? 1 : dragRef.current.isDragging ? 18 : 5.2;

      // Spring update for scroll position s
      const diff = targetRef.current - sRef.current;
      if (Math.abs(diff) < 1e-4) {
        sRef.current = targetRef.current;
      } else {
        sRef.current += diff * (1 - Math.exp(-k * dt));
      }

      // Loop normalisation if drifted beyond ±4 full loops (48 tapes)
      if (sRef.current > 48) {
        sRef.current -= 12;
        targetRef.current -= 12;
      } else if (sRef.current < -12) {
        sRef.current += 12;
        targetRef.current += 12;
      }

      // Check active film index change
      const rawCurrentIdx = Math.round(sRef.current);
      const normalizedFilmIdx = ((((rawCurrentIdx % 12) + 12) % 12));
      if (normalizedFilmIdx !== activeFilmIndex) {
        const moveDir = Math.sign(targetRef.current - sRef.current) || 1;
        setActiveFilmIndex(normalizedFilmIdx);
        triggerCaptionSwap(FILMS[normalizedFilmIdx], moveDir);
        updateTabIndicator(normalizedFilmIdx);
      }

      const W = window.innerWidth;
      const H_win = window.innerHeight;
      const shelfCenterY = H_win * 0.5;
      const { H, ws, d, gap } = dimsRef.current;

      // Smooth cursor following
      const cursorK = 1 - Math.exp(-16 * dt);
      cursorRef.current.x += (mouseRef.current.x - cursorRef.current.x) * cursorK;
      cursorRef.current.y += (mouseRef.current.y - cursorRef.current.y) * cursorK;
      if (cursorElRef.current) {
        cursorElRef.current.style.transform = `translate3d(${cursorRef.current.x}px, ${cursorRef.current.y}px, 0)`;
        cursorElRef.current.classList.toggle('cursor--visible', mouseRef.current.x >= 0);
      }

      // Tilt towards cursor
      const mx = mouseRef.current.x;
      const my = mouseRef.current.y;
      const onCoverCondition =
        Math.abs(mx - W / 2) < 0.55 * d &&
        Math.abs(my - shelfCenterY) < 0.55 * H &&
        !isOpenRef.current &&
        Math.abs(targetRef.current - sRef.current) < 0.3;

      let targetTiltY = 0;
      let targetTiltX = 0;
      if (onCoverCondition) {
        targetTiltY = ((mx - W / 2) / (0.55 * d)) * 9;
        targetTiltX = -((my - shelfCenterY) / (H / 2)) * 6;
      } else {
        targetTiltY = ((mx - W / 2) / W) * 5;
        targetTiltX = 0;
      }

      const tiltK = 1 - Math.exp(-7 * dt);
      tiltRef.current.y += (targetTiltY - tiltRef.current.y) * tiltK;
      tiltRef.current.x += (targetTiltX - tiltRef.current.x) * tiltK;

      // Update Cursor state
      if (isOpenRef.current) {
        setCursorState('default');
      } else if (onCoverCondition) {
        setCursorState('open');
      } else if (hoveredTapeRef.current !== -1) {
        const hVirtual = hoveredTapeRef.current;
        const hRel = computeRelativeIndex(hVirtual, sRef.current);
        if (Math.abs(hRel) > 0.5) {
          setCursorState('spine');
        } else {
          setCursorState('open');
        }
      } else {
        // If not hovering shelf or cover, default or btn handled by mouseenter/leave
      }

      // Update Play Ring scale & position
      if (playRingRef.current) {
        const playRingLeft = W / 2 - 0.5 * d - 6;
        const playRingTop = shelfCenterY + 0.36 * H;
        const settleFactor = smoothstep(Math.max(0, 1 - Math.abs(targetRef.current - sRef.current) * 3));
        const playRingScale = isOpenRef.current ? 0 : settleFactor;
        playRingRef.current.style.transform = `translate3d(${playRingLeft}px, ${playRingTop}px, 0) scale(${playRingScale})`;
      }

      // Update each tape in 3D
      const cullingThreshold = W / 2 + 1.5 * d;
      for (let v = 0; v < 36; v++) {
        const el = tapesRef.current[v];
        if (!el) continue;

        const r = computeRelativeIndex(v, sRef.current);
        const x = computeTapeX(r, ws, d, gap);

        if (Math.abs(x) > cullingThreshold) {
          el.style.visibility = 'hidden';
          continue;
        }
        el.style.visibility = 'visible';

        // Hover lift easing
        const isHovered = hoveredTapeRef.current === v && Math.abs(r) > 0.5;
        const targetLift = isHovered ? 1 : 0;
        const liftK = 1 - Math.exp(-12 * dt);
        liftsRef.current[v] += (targetLift - liftsRef.current[v]) * liftK;
        const liftVal = liftsRef.current[v];

        const o = computeOpenness(r);
        const rotY = -90 * o + tiltRef.current.y * o;
        const rotX = tiltRef.current.x * o;
        const rotZ = -4.5 * o;
        const transZ = o * 0.2 * H;
        const transY = -o * 0.025 * H - liftVal * 0.045 * H;

        el.style.transform = `translate3d(${x}px, ${transY}px, ${transZ}px) rotateZ(${rotZ}deg) rotateX(${rotX}deg) rotateY(${rotY}deg)`;
        el.style.zIndex = `${Math.round(100 - Math.abs(r) * 4)}`;

        // Shading on faces
        const spineFace = el.querySelector<HTMLDivElement>('.tape-spine');
        const coverFace = el.querySelector<HTMLDivElement>('.tape-cover');
        if (spineFace) {
          spineFace.style.setProperty('--shade', `${(o * 0.55).toFixed(3)}`);
        }
        if (coverFace) {
          coverFace.style.setProperty('--shade', `${((1 - o) * 0.5).toFixed(3)}`);
          if (Math.abs(r) < 0.5) {
            activeCoverFaceRef.current = coverFace;
          }
        }
      }

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [activeFilmIndex, triggerCaptionSwap, updateTabIndicator]);

  // Global mousemove tracking
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      mouseRef.current = { x: e.clientX, y: e.clientY };
    };
    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpenRef.current) {
        closeDetail();
      } else if (e.key === 'Enter' && !isOpenRef.current) {
        openDetail();
      } else if (!isOpenRef.current) {
        if (e.key === 'ArrowLeft') {
          targetRef.current = Math.round(targetRef.current) - 1;
        } else if (e.key === 'ArrowRight') {
          targetRef.current = Math.round(targetRef.current) + 1;
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Wheel scrolling
  const handleWheel = useCallback((e: WheelEvent) => {
    if (isOpenRef.current) return;
    const { ws, gap } = dimsRef.current;
    const delta = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
    targetRef.current += (delta / (ws + gap)) * 0.5;

    if (wheelTimerRef.current) clearTimeout(wheelTimerRef.current);
    wheelTimerRef.current = setTimeout(() => {
      targetRef.current = Math.round(targetRef.current);
    }, 160);
  }, []);

  useEffect(() => {
    window.addEventListener('wheel', handleWheel, { passive: true });
    return () => window.removeEventListener('wheel', handleWheel);
  }, [handleWheel]);

  // Pointer drag on shelf
  const handleShelfPointerDown = (e: React.PointerEvent) => {
    if (isOpenRef.current) return;
    dragRef.current = {
      isDragging: true,
      startX: e.clientX,
      startT: targetRef.current,
      moved: false,
    };
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
  };

  const handleShelfPointerMove = (e: React.PointerEvent) => {
    if (!dragRef.current.isDragging) return;
    const dx = e.clientX - dragRef.current.startX;
    if (Math.abs(dx) > 5) {
      dragRef.current.moved = true;
    }
    const { ws, gap } = dimsRef.current;
    targetRef.current = dragRef.current.startT - dx / (ws + gap);
  };

  const handleShelfPointerUp = () => {
    if (!dragRef.current.isDragging) return;
    dragRef.current.isDragging = false;
    targetRef.current = Math.round(targetRef.current);
  };

  // Tape click handler
  const handleTapeClick = (virtualIndex: number) => {
    if (dragRef.current.moved) return;
    const r = computeRelativeIndex(virtualIndex, sRef.current);
    if (Math.abs(r) < 0.5) {
      openDetail();
    } else {
      targetRef.current = Math.round(targetRef.current + r);
    }
  };

  // Decade tabs jump
  const handleDecadeTabClick = (targetFilmIndex: number) => {
    targetRef.current = Math.round(shortestJumpToFilm(sRef.current, targetFilmIndex));
  };

  // Open detail view with full Web Animations API and ink blot animation
  const openDetail = () => {
    if (isOpenRef.current) return;
    targetRef.current = Math.round(targetRef.current);
    sRef.current = targetRef.current;

    const film = FILMS[activeFilmIndex];
    setDetailFilm(film);
    setIsOpen(true);
    isOpenRef.current = true;

    // Reset ink blot radii
    inkRadiiRef.current = [0, 0, 0, 0, 0, 0, 0];
    setInkUpdateTick((n) => n + 1);

    const isReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // Projected bounding box of active cover
    const coverEl = activeCoverFaceRef.current;
    const rect = coverEl
      ? coverEl.getBoundingClientRect()
      : {
          top: window.innerHeight / 2 - 175,
          left: window.innerWidth / 2 - 92,
          right: window.innerWidth / 2 + 92,
          bottom: window.innerHeight / 2 + 175,
          width: 184,
          height: 350,
        };

    const dialog = detailModalRef.current;
    if (!dialog) return;

    dialog.style.visibility = 'visible';
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    dialog.style.transformOrigin = `${centerX}px ${centerY}px`;

    const W_win = window.innerWidth;
    const H_win = window.innerHeight;
    const insetTop = Math.max(0, rect.top);
    const insetRight = Math.max(0, W_win - rect.right);
    const insetBottom = Math.max(0, H_win - rect.bottom);
    const insetLeft = Math.max(0, rect.left);

    if (isReduced) {
      dialog.style.clipPath = 'inset(0px 0px 0px 0px round 0px)';
      dialog.style.transform = 'rotate(0deg)';
      inkRadiiRef.current = [720, 720, 720, 720, 720, 720, 720];
      setInkUpdateTick((n) => n + 1);
      return;
    }

    // 1. Paper sheet expansion Web Animation
    dialog.animate(
      [
        {
          clipPath: `inset(${insetTop}px ${insetRight}px ${insetBottom}px ${insetLeft}px round 3px)`,
          transform: 'rotate(-4.5deg)',
        },
        {
          clipPath: 'inset(0px 0px 0px 0px round 0px)',
          transform: 'rotate(0deg)',
        },
      ],
      {
        duration: 1050,
        easing: 'cubic-bezier(0.76, 0, 0.18, 1)',
        fill: 'both',
      }
    );

    // 2. Text lines rising through individual overflow masks
    const lines = dialog.querySelectorAll<HTMLElement>('.detail-line-content');
    lines.forEach((line, index) => {
      line.animate(
        [
          { transform: 'translateY(110%)' },
          { transform: 'translateY(0%)' },
        ],
        {
          duration: 900,
          delay: 620 + index * 75,
          easing: 'cubic-bezier(0.2, 0.8, 0.2, 1)',
          fill: 'both',
        }
      );
    });

    // 3. Spreading ink blots
    const startTime = performance.now() + 520;
    const runInk = (time: number) => {
      const elapsed = time - startTime;
      let allDone = true;
      const newRadii = INK_BLOBS.map((blob) => {
        const r = computeBlobRadius(elapsed, blob.delay, 1250, 720);
        if (r < 720) allDone = false;
        return r;
      });
      inkRadiiRef.current = newRadii;
      setInkUpdateTick((n) => n + 1);

      if (!allDone && elapsed < 2500 && isOpenRef.current) {
        inkRafRef.current = requestAnimationFrame(runInk);
      }
    };
    inkRafRef.current = requestAnimationFrame(runInk);
  };

  // Close detail view
  const closeDetail = () => {
    if (!isOpenRef.current) return;
    if (inkRafRef.current) cancelAnimationFrame(inkRafRef.current);

    const isReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const dialog = detailModalRef.current;

    if (isReduced || !dialog) {
      if (dialog) dialog.style.visibility = 'hidden';
      setIsOpen(false);
      isOpenRef.current = false;
      return;
    }

    const coverEl = activeCoverFaceRef.current;
    const rect = coverEl
      ? coverEl.getBoundingClientRect()
      : {
          top: window.innerHeight / 2 - 175,
          left: window.innerWidth / 2 - 92,
          right: window.innerWidth / 2 + 92,
          bottom: window.innerHeight / 2 + 175,
        };

    const W_win = window.innerWidth;
    const H_win = window.innerHeight;
    const insetTop = Math.max(0, rect.top);
    const insetRight = Math.max(0, W_win - rect.right);
    const insetBottom = Math.max(0, H_win - rect.bottom);
    const insetLeft = Math.max(0, rect.left);

    const anim = dialog.animate(
      [
        {
          clipPath: 'inset(0px 0px 0px 0px round 0px)',
          transform: 'rotate(0deg)',
        },
        {
          clipPath: `inset(${insetTop}px ${insetRight}px ${insetBottom}px ${insetLeft}px round 3px)`,
          transform: 'rotate(-4.5deg)',
        },
      ],
      {
        duration: 850,
        easing: 'cubic-bezier(0.76, 0, 0.18, 1)',
        fill: 'both',
      }
    );

    anim.onfinish = () => {
      dialog.style.visibility = 'hidden';
      setIsOpen(false);
      isOpenRef.current = false;
    };
  };

  // Compute SVG poster crop metrics
  const coverSheet = SHEETS[detailFilm.coverCrop.sheet];
  const posterCropX = (-detailFilm.coverCrop.x * 474) / detailFilm.coverCrop.w;
  const posterCropY = (-detailFilm.coverCrop.y * 900) / detailFilm.coverCrop.h;
  const posterCropW = (coverSheet.w * 474) / detailFilm.coverCrop.w;
  const posterCropH = (coverSheet.h * 900) / detailFilm.coverCrop.h;

  const currentFilm = FILMS[activeFilmIndex];
  const activeDecadeTabId = getTabIdForFilmIndex(activeFilmIndex);

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-[var(--paper)] text-[var(--ink)] select-none">
      {/* Hidden probe to measure real CSS --H */}
      <div
        ref={probeRef}
        aria-hidden="true"
        style={{
          position: 'absolute',
          visibility: 'hidden',
          height: 'var(--H)',
          pointerEvents: 'none',
        }}
      />

      {/* Paper Grain Overlay */}
      <svg
        className="paper-grain-overlay"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <defs>
          <filter id="paper-grain-filter">
            <feTurbulence
              type="fractalNoise"
              baseFrequency="0.85"
              numOctaves="3"
              stitchTiles="stitch"
            />
            <feColorMatrix
              type="matrix"
              values="0 0 0 0 0.45  0 0 0 0 0.42  0 0 0 0 0.38  0 0 0 0.22 0"
            />
          </filter>
        </defs>
        <rect width="100%" height="100%" filter="url(#paper-grain-filter)" />
      </svg>

      {/* 1. Top Bar */}
      <header className="fixed top-0 left-0 right-0 h-[84px] max-md:h-[64px] px-8 max-md:px-4 grid grid-cols-[1fr_auto_1fr] items-center z-30 pointer-events-auto">
        {/* Left: Back / 戻る */}
        <div className="flex justify-start">
          <button
            type="button"
            className="box lbl cursor-pointer"
            onMouseEnter={() => setCursorState('btn')}
            onMouseLeave={() => setCursorState('default')}
            onClick={() => {
              targetRef.current = 17;
            }}
          >
            BACK / 戻る
          </button>
        </div>

        {/* Center: Logo */}
        <div className="flex flex-col items-center justify-center gap-[5px] text-[var(--cobalt)]">
          <span
            style={{
              fontFamily: 'var(--font-serif), var(--font-sc)',
              fontWeight: 700,
              fontSize: 'clamp(17px, 1.8vw, 22px)',
              letterSpacing: '0.04em',
              lineHeight: 1,
            }}
          >
            Computer Basics
          </span>
          <span
            className="lbl"
            style={{
              fontSize: 'clamp(7.5px, 0.75vw, 9px)',
              letterSpacing: '0.34em',
              paddingLeft: '0.34em',
              lineHeight: 1,
            }}
          >
            Computer Basics
          </span>
        </div>

        {/* Right: Course Info, Syllabus & Music Player */}
        <div className="flex justify-end items-center gap-2.5">
          <button
            type="button"
            className="box lbl px-2.5 h-[28px] rounded-[2px] border-[var(--rule)] text-[var(--ink)] hover:border-[var(--cobalt)] hover:text-[var(--cobalt)] cursor-pointer max-md:hidden transition-colors"
            onClick={() => setShowCurriculumDrawer(true)}
            onMouseEnter={() => setCursorState('btn')}
            onMouseLeave={() => setCursorState('default')}
            title="ดูสารบัญเนื้อหาบทเรียนทั้งหมด 12 บท"
          >
            SYLLABUS / สารบัญ
          </button>
          <span className="lbl text-right max-lg:hidden text-[var(--muted)] text-[9px]">
            12 CHAPTERS
          </span>
          <button
            type="button"
            aria-label={isPlaying ? 'Pause background music' : 'Play background music'}
            className={`box lbl flex items-center gap-2 h-[28px] px-2.5 rounded-[2px] cursor-pointer transition-all ${
              isPlaying
                ? 'border-[var(--cobalt)] text-[var(--cobalt)] bg-[#1F3FB0]/10 shadow-[0_0_12px_rgba(31,63,176,0.18)]'
                : 'border-[var(--rule)] text-[var(--ink)] bg-transparent opacity-85 hover:opacity-100 hover:border-[var(--cobalt)] hover:text-[var(--cobalt)]'
            }`}
            onMouseEnter={() => setCursorState('btn')}
            onMouseLeave={() => setCursorState('default')}
            onClick={toggleAudio}
            title={isPlaying ? 'Click to Pause Music' : 'Click to Play Music (Auto Start)'}
          >
            <img
              src="/assets/aistudio/music_5b2e3494.png"
              alt="Audio waveform"
              className={`w-[17px] h-[17px] object-contain transition-all duration-300 ${
                isPlaying ? 'scale-105' : 'opacity-70 scale-95'
              }`}
              style={{
                filter: isPlaying
                  ? 'invert(21%) sepia(85%) saturate(2745%) hue-rotate(222deg) brightness(85%) contrast(98%)'
                  : 'none',
              }}
            />
            <div className="flex items-end gap-[2px] h-[14px]">
              <span className={`w-[2.5px] rounded-full bg-current ${isPlaying ? 'eq-bar-1' : 'h-[3px]'}`} />
              <span className={`w-[2.5px] rounded-full bg-current ${isPlaying ? 'eq-bar-2' : 'h-[8px]'}`} />
              <span className={`w-[2.5px] rounded-full bg-current ${isPlaying ? 'eq-bar-3' : 'h-[4px]'}`} />
            </div>
            <span className="text-[9px] tracking-[0.1em] font-bold whitespace-nowrap">
              {isPlaying ? 'AUDIO ON' : 'AUDIO OFF'}
            </span>
          </button>
        </div>
      </header>

      {/* 2. Decade Tabs */}
      <nav
        ref={tabsNavRef}
        aria-label="Decades"
        className="fixed left-1/2 -translate-x-1/2 z-30 pointer-events-auto"
        style={{
          top: 'calc(50% - var(--H) / 2 - 86px)',
        }}
      >
        <div className="relative inline-flex items-center">
          {/* Sliding Cobalt Background Block */}
          <div
            ref={tabIndicatorRef}
            aria-hidden="true"
            className="absolute top-0 bottom-0 left-0 bg-[var(--cobalt)] pointer-events-none transition-all duration-600"
            style={{
              height: '23px',
              transitionTimingFunction: 'var(--ease)',
            }}
          />

          {/* Tab Buttons */}
          {DECADE_TABS.map((tab, idx) => {
            const isActive = tab.id === activeDecadeTabId;
            return (
              <button
                key={tab.id}
                ref={(el) => {
                  tabButtonRefs.current[idx] = el;
                }}
                type="button"
                className={`lbl box relative h-[23px] px-[11px] max-md:px-[7px] max-md:text-[9px] -ml-[1px] first:ml-0 cursor-pointer transition-colors duration-450 ${
                  isActive ? 'text-white' : 'text-[var(--ink)]'
                }`}
                style={{
                  transitionTimingFunction: 'var(--ease)',
                }}
                onMouseEnter={() => setCursorState('btn')}
                onMouseLeave={() => setCursorState('default')}
                onClick={() => handleDecadeTabClick(tab.filmIndex)}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </nav>

      {/* 3. The 3D Shelf */}
      <section
        aria-label="Filmography shelf"
        className="shelf-stage-container z-20 cursor-grab active:cursor-grabbing"
        style={{
          top: 'calc(50% - var(--H) / 2 - 40px)',
          height: 'calc(var(--H) + 80px)',
        }}
        onPointerDown={handleShelfPointerDown}
        onPointerMove={handleShelfPointerMove}
        onPointerUp={handleShelfPointerUp}
      >
        <div ref={stageRef} className="stage">
          {Array.from({ length: 36 }).map((_, v) => {
            const filmIdx = v % 12;
            const film = FILMS[filmIdx];
            const spineSheet = SHEETS[film.spineCrop.sheet];
            const coverSheet = SHEETS[film.coverCrop.sheet];

            const spineCss = computeCropCss(
              spineSheet.url,
              spineSheet.w,
              spineSheet.h,
              film.spineCrop.x,
              film.spineCrop.y,
              film.spineCrop.w,
              film.spineCrop.h
            );

            const coverCss = computeCropCss(
              coverSheet.url,
              coverSheet.w,
              coverSheet.h,
              film.coverCrop.x,
              film.coverCrop.y,
              film.coverCrop.w,
              film.coverCrop.h
            );

            return (
              <div
                key={v}
                ref={(el) => {
                  tapesRef.current[v] = el;
                }}
                className="tape"
                data-virtual-index={v}
                data-film-id={film.id}
                onPointerEnter={() => {
                  hoveredTapeRef.current = v;
                }}
                onPointerLeave={() => {
                  if (hoveredTapeRef.current === v) {
                    hoveredTapeRef.current = -1;
                  }
                }}
                onClick={() => handleTapeClick(v)}
              >
                {/* Spine Face */}
                <div
                  className="tape-face tape-spine overflow-hidden flex flex-col items-center justify-between py-2.5 px-1 select-none"
                  style={{
                    backgroundColor: '#0A0D14',
                    borderLeft: `2.5px solid ${film.accentColor}`,
                    borderRight: '1px solid rgba(255,255,255,0.08)',
                    boxShadow: `inset 0 0 16px rgba(0,0,0,0.85), inset 2px 0 6px ${film.accentColor}33`,
                  }}
                >
                  {/* Top: Chapter badge & cropped illustration */}
                  <div className="flex flex-col items-center gap-1 w-full">
                    <span
                      className="lbl"
                      style={{
                        fontSize: '7.5px',
                        letterSpacing: '0.12em',
                        color: film.accentColor,
                        lineHeight: 1,
                        textShadow: `0 0 6px ${film.accentColor}88`,
                      }}
                    >
                      CH.{String(filmIdx + 1).padStart(2, '0')}
                    </span>
                    <div
                      className="w-[calc(var(--ws)-16px)] h-[calc(var(--ws)-16px)] max-w-[42px] max-h-[42px] rounded border border-white/20 overflow-hidden bg-black/60 shrink-0"
                      style={{
                        backgroundImage: coverCss.backgroundImage,
                        backgroundSize: coverCss.backgroundSize,
                        backgroundPosition: coverCss.backgroundPosition,
                      }}
                    />
                  </div>

                  {/* Middle: Vertical Title */}
                  <div className="flex-1 flex flex-col items-center justify-center my-1.5 overflow-hidden w-full">
                    <span
                      style={{
                        writingMode: 'vertical-rl',
                        textOrientation: 'mixed',
                        fontFamily: 'var(--font-sans)',
                        fontWeight: 700,
                        fontSize: 'clamp(9px, 1.1vw, 11px)',
                        letterSpacing: '0.14em',
                        color: '#F4F2ED',
                        textTransform: 'uppercase',
                        whiteSpace: 'nowrap',
                        maxHeight: 'calc(var(--H) * 0.5)',
                        textShadow: `0 0 8px ${film.accentColor}66`,
                      }}
                    >
                      {film.title}
                    </span>
                  </div>

                  {/* Bottom: COMPUTER BASICS + VHS badge */}
                  <div className="flex flex-col items-center gap-1 w-full shrink-0">
                    <span
                      className="lbl text-white/50"
                      style={{
                        fontSize: '6.5px',
                        letterSpacing: '0.08em',
                        lineHeight: 1,
                      }}
                    >
                      BASICS
                    </span>
                    <div className="bg-[#FFE600] text-black font-serif font-black text-[9px] px-1 py-[1px] rounded-[1px] leading-none tracking-tight border border-black/50 shadow-sm">
                      VHS
                    </div>
                  </div>
                </div>

                {/* Cover Face */}
                <div
                  className="tape-face tape-cover"
                  style={{
                    backgroundImage: coverCss.backgroundImage,
                    backgroundSize: coverCss.backgroundSize,
                    backgroundPosition: coverCss.backgroundPosition,
                  }}
                />
              </div>
            );
          })}
        </div>
      </section>

      {/* 4. Play Ring Button */}
      <button
        ref={playRingRef}
        type="button"
        aria-label="Open film"
        className="fixed z-30 w-[42px] h-[42px] rounded-full border border-[var(--cobalt)] bg-[#edebe6bf] text-[var(--cobalt)] flex items-center justify-center cursor-pointer transition-transform pointer-events-auto"
        onMouseEnter={() => setCursorState('btn')}
        onMouseLeave={() => setCursorState('default')}
        onClick={openDetail}
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="currentColor"
          className="translate-x-[1.5px]"
        >
          <path d="M7 5v14l12-7z" />
        </svg>
      </button>

      {/* 5. Caption */}
      <div
        aria-live="polite"
        className="fixed left-1/2 -translate-x-1/2 z-30 pointer-events-none flex flex-col items-center gap-[9px]"
        style={{
          top: 'calc(50% + var(--H) / 2 + 30px)',
          width: 'min(92vw, 760px)',
        }}
      >
        {/* Title Mask */}
        <div
          ref={captionTitleBoxRef}
          className="relative overflow-hidden w-full h-[38px] max-md:h-[30px] flex items-center justify-center"
          style={{
            fontFamily: 'var(--font-serif)',
            fontSize: 'clamp(24px, 3.2vw, 31px)',
            lineHeight: 1.12,
            letterSpacing: '-0.01em',
            fontWeight: 400,
          }}
        />

        {/* Subtitle Mask */}
        <div
          ref={captionSubBoxRef}
          className="lbl relative overflow-hidden w-full h-[18px] flex items-center justify-center text-[var(--cobalt)]"
          style={{
            fontWeight: 500,
          }}
        />

        {/* Year Mask */}
        <div
          ref={captionYearBoxRef}
          className="relative overflow-hidden w-full h-[16px] flex items-center justify-center"
          style={{
            fontFamily: 'var(--font-sans)',
            fontWeight: 500,
            fontSize: '11px',
            letterSpacing: '0.08em',
          }}
        />
      </div>

      {/* 6. Arrows */}
      <button
        type="button"
        aria-label="Previous film"
        className="fixed z-30 w-[44px] h-[44px] flex items-center justify-center left-[20px] max-md:left-[6px] text-[var(--ink)] cursor-pointer hover:opacity-75 transition-opacity"
        style={{
          top: 'calc(50% + var(--H) / 2 + 40px)',
        }}
        onMouseEnter={() => setCursorState('btn')}
        onMouseLeave={() => setCursorState('default')}
        onClick={() => {
          targetRef.current = Math.round(targetRef.current) - 1;
        }}
      >
        <svg width="18" height="10" viewBox="0 0 18 10" fill="none">
          <path
            d="M5 1 L1 5 L5 9 M1 5 L17 5"
            stroke="currentColor"
            strokeWidth="1.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      <button
        type="button"
        aria-label="Next film"
        className="fixed z-30 w-[44px] h-[44px] flex items-center justify-center right-[20px] max-md:right-[6px] text-[var(--ink)] cursor-pointer hover:opacity-75 transition-opacity"
        style={{
          top: 'calc(50% + var(--H) / 2 + 40px)',
        }}
        onMouseEnter={() => setCursorState('btn')}
        onMouseLeave={() => setCursorState('default')}
        onClick={() => {
          targetRef.current = Math.round(targetRef.current) + 1;
        }}
      >
        <svg width="18" height="10" viewBox="0 0 18 10" fill="none">
          <path
            d="M13 1 L17 5 L13 9 M1 5 L17 5"
            stroke="currentColor"
            strokeWidth="1.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      {/* 7. Footer */}
      <footer className="fixed bottom-[26px] max-md:bottom-[18px] left-[32px] max-md:left-[16px] right-[32px] max-md:right-[16px] flex justify-between items-center z-30 pointer-events-auto">
        <span className="lbl max-md:text-[9px]">
          Prepared by : Mr.ANUPHON ATTHASENA / Mr.THEERAPAT SAMANJAI
        </span>
        <div className="flex gap-4">
          <a
            href="#fb"
            className="lbl max-md:text-[9px] text-[var(--ink)] no-underline"
            onMouseEnter={() => setCursorState('btn')}
            onMouseLeave={() => setCursorState('default')}
          >
            FB
          </a>
          <span className="lbl max-md:text-[9px]">/</span>
          <a
            href="#tw"
            className="lbl max-md:text-[9px] text-[var(--ink)] no-underline"
            onMouseEnter={() => setCursorState('btn')}
            onMouseLeave={() => setCursorState('default')}
          >
            TW
          </a>
        </div>
      </footer>

      {/* 8. Custom Cursor (pointer: fine only) */}
      <div
        ref={cursorElRef}
        aria-hidden="true"
        className={`custom-cursor cursor--${cursorState} ${
          mouseRef.current.x >= 0 ? 'cursor--visible' : ''
        }`}
      >
        <div className="cursor-ring" />
        <div className="cursor-dot" />
        <div className="cursor-label">
          <span>OPEN</span>
          <span>開く</span>
        </div>
      </div>

      {/* 9. Detail Dialog: Paper Sheet & Spreading Ink Reveal */}
      <div
        ref={detailModalRef}
        role="dialog"
        aria-modal="true"
        aria-label={`${detailFilm.title} details`}
        className="fixed inset-0 z-60 bg-[var(--sheet)] text-[var(--ink)] pointer-events-auto overflow-y-auto"
        style={{
          visibility: 'hidden',
          willChange: 'clip-path, transform',
        }}
      >
        {/* Top Header inside Detail */}
        <div className="fixed top-0 left-0 right-0 h-[84px] max-md:h-[64px] px-[32px] max-md:px-[16px] flex items-center justify-between z-70 pointer-events-none bg-[var(--sheet)]/90 backdrop-blur-md border-b border-[var(--rule)]/10">
          <button
            type="button"
            className="box lbl cursor-pointer pointer-events-auto"
            onClick={closeDetail}
          >
            CLOSE / 閉じる
          </button>

          {/* Cobalt Logo in Band */}
          <div className="flex flex-col items-center justify-center gap-[5px] text-[var(--cobalt)] pointer-events-auto">
            <span
              style={{
                fontFamily: 'var(--font-serif), var(--font-sc)',
                fontWeight: 700,
                fontSize: 'clamp(17px, 1.8vw, 22px)',
                letterSpacing: '0.04em',
                lineHeight: 1,
              }}
            >
              Computer Basics
            </span>
            <span
              className="lbl"
              style={{
                fontSize: 'clamp(7.5px, 0.75vw, 9px)',
                letterSpacing: '0.34em',
                paddingLeft: '0.34em',
                lineHeight: 1,
              }}
            >
              CHAPTER {String(detailFilm.chapterNumber).padStart(2, '0')} • {detailFilm.title.toUpperCase()}
            </span>
          </div>

          <div className="flex items-center gap-2 pointer-events-auto">
            <button
              type="button"
              className="box lbl h-[28px] px-2.5 rounded-[2px] border-[var(--cobalt)] text-[var(--cobalt)] hover:bg-[var(--cobalt)] hover:text-white transition-colors cursor-pointer"
              onClick={scrollToLesson}
              title="เลื่อนลงเพื่ออ่านเนื้อหาฉบับสมบูรณ์"
            >
              READ TEXT ↓
            </button>
            <button
              type="button"
              className="box lbl h-[28px] px-2.5 rounded-[2px] border-[var(--rule)] text-[var(--ink)] hover:border-[var(--cobalt)] hover:text-[var(--cobalt)] cursor-pointer max-md:hidden transition-colors"
              onClick={() => setShowCurriculumDrawer(true)}
              title="เปิดดูสารบัญ 12 บทเรียน"
            >
              SYLLABUS
            </button>
          </div>
        </div>

        {/* Content Layout */}
        <div className="w-full min-h-screen pt-[110px] pb-[56px] px-[7vw] max-md:px-[22px] max-md:pt-[84px] max-md:pb-[40px] grid grid-cols-2 max-md:grid-cols-1 gap-[4vw] max-md:gap-[24px] items-center">
          {/* Left Column (Desktop) / Second (Mobile): Masked Rising Lines */}
          <div className="flex flex-col justify-center max-w-[540px] gap-[18px] max-md:order-2">
            {/* 1. Subtitle */}
            <div className="overflow-hidden">
              <div className="detail-line-content lbl text-[var(--cobalt)] font-bold">
                บทที่ {detailFilm.chapterNumber} • {detailFilm.titleTh}
              </div>
            </div>

            {/* 2. Title */}
            <div className="overflow-hidden">
              <h1
                className="detail-line-content m-0"
                style={{
                  fontFamily: 'var(--font-serif)',
                  fontSize: 'clamp(38px, 5vw, 76px)',
                  lineHeight: 1.05,
                  letterSpacing: '-0.025em',
                  fontWeight: 400,
                }}
              >
                {detailFilm.title}
              </h1>
            </div>

            {/* 3. Meta */}
            <div className="overflow-hidden">
              <div className="detail-line-content lbl text-[var(--muted)]">
                CH.{String(detailFilm.chapterNumber).padStart(2, '0')} / {detailFilm.genre.toUpperCase()} / {detailFilm.minutes} MIN READ
              </div>
            </div>

            {/* 4. Synopsis */}
            <div className="overflow-hidden">
              <p
                className="detail-line-content m-0"
                style={{
                  fontFamily: 'var(--font-sans)',
                  fontSize: '15.5px',
                  lineHeight: 1.6,
                  maxWidth: '48ch',
                  fontWeight: 400,
                  color: 'var(--ink)',
                }}
              >
                {detailFilm.synopsis}
              </p>
            </div>

            {/* 5. Section Quick Jump Pills */}
            <div className="overflow-hidden">
              <div className="detail-line-content flex flex-wrap gap-1.5 pt-1">
                {detailFilm.content.sections.map((sec) => (
                  <button
                    key={sec.id}
                    type="button"
                    onClick={() => {
                      const el = document.getElementById(`sec-${sec.id}`);
                      if (el) el.scrollIntoView({ behavior: 'smooth' });
                    }}
                    className="lbl text-[9px] px-2 py-1 rounded bg-[var(--paper)] border border-[var(--rule)]/25 text-[var(--ink)] hover:border-[var(--cobalt)] hover:text-[var(--cobalt)] transition-colors cursor-pointer"
                  >
                    {sec.number} {sec.title.split(' ')[0]}
                  </button>
                ))}
              </div>
            </div>

            {/* 6. Action Buttons */}
            <div className="overflow-hidden mt-[10px]">
              <div className="detail-line-content flex items-center gap-3 flex-wrap">
                <button
                  type="button"
                  className="box lbl h-[44px] px-[20px] text-white bg-[var(--cobalt)] border-[var(--cobalt)] cursor-pointer hover:opacity-90 transition-opacity font-bold shadow-sm"
                  onClick={scrollToLesson}
                >
                  READ FULL CHAPTER / อ่านเนื้อหาฉบับเต็ม ↓
                </button>
                <button
                  type="button"
                  onClick={() => setShowCurriculumDrawer(true)}
                  className="box lbl h-[44px] px-[16px] text-[var(--ink)] border-[var(--rule)] cursor-pointer hover:border-[var(--cobalt)] hover:text-[var(--cobalt)] transition-colors"
                >
                  ALL 12 CHAPTERS / สารบัญ
                </button>
              </div>
            </div>
          </div>

          {/* Right Column (Desktop) / First (Mobile): The Ink Bleed Poster */}
          <div className="flex items-center justify-center max-md:order-1">
            <div
              className="relative w-auto h-[min(100%,78vh)] max-md:h-[46svh] aspect-[474/900] flex items-center justify-center"
              style={{
                boxShadow: '0 30px 60px -28px rgba(20, 16, 10, 0.45)',
              }}
            >
              <svg
                aria-hidden="true"
                viewBox="0 0 474 900"
                className="w-full h-full block"
              >
                <defs>
                  {/* Ink Filter with feTurbulence and feDisplacementMap */}
                  <filter
                    id="ink-displacement"
                    x="-20%"
                    y="-20%"
                    width="140%"
                    height="140%"
                  >
                    <feTurbulence
                      type="fractalNoise"
                      baseFrequency="0.011"
                      numOctaves="3"
                      seed="7"
                      result="noise"
                    />
                    <feDisplacementMap
                      in="SourceGraphic"
                      in2="noise"
                      scale="120"
                      xChannelSelector="R"
                      yChannelSelector="G"
                    />
                  </filter>

                  {/* Ink Mask with 7 blooming circles */}
                  <mask
                    id="ink-mask"
                    maskUnits="userSpaceOnUse"
                    x="-200"
                    y="-200"
                    width="874"
                    height="1300"
                  >
                    <g filter="url(#ink-displacement)">
                      {INK_BLOBS.map((blob, idx) => (
                        <circle
                          key={blob.id}
                          cx={blob.cx}
                          cy={blob.cy}
                          r={inkRadiiRef.current[idx] || 0}
                          fill="#FFFFFF"
                        />
                      ))}
                    </g>
                  </mask>

                  {/* Crop Clip Path for Poster */}
                  <clipPath id="poster-clip">
                    <rect x="0" y="0" width="474" height="900" rx="2" ry="2" />
                  </clipPath>
                </defs>

                <g clipPath="url(#poster-clip)" mask="url(#ink-mask)">
                  <image
                    href={coverSheet.url}
                    x={posterCropX}
                    y={posterCropY}
                    width={posterCropW}
                    height={posterCropH}
                    preserveAspectRatio="none"
                  />
                </g>
              </svg>
            </div>
          </div>
        </div>

        {/* Full Academic Course Content Reading Section */}
        <section
          id="chapter-content"
          className="w-full max-w-[880px] mx-auto px-6 max-md:px-4 pt-10 pb-28 border-t border-[var(--rule)]/20"
        >
          {/* Header Bar */}
          <div className="flex flex-col gap-3 mb-8 pb-6 border-b border-[var(--rule)]/15">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <span className="lbl px-2 py-0.5 rounded bg-[var(--cobalt)]/10 text-[var(--cobalt)] font-bold">
                CHAPTER {String(detailFilm.chapterNumber).padStart(2, '0')} • LESSON SYLLABUS
              </span>
              <button
                type="button"
                onClick={() => {
                  const fullText =
                    `# บทที่ ${detailFilm.chapterNumber} ${detailFilm.title} (${detailFilm.titleTh})\n\n` +
                    detailFilm.content.sections
                      .map(
                        (s) =>
                          `${s.number} ${s.title}\n${s.content}\n` +
                          (s.bullets ? s.bullets.join('\n') : '')
                      )
                      .join('\n\n');
                  handleCopyText(fullText, 'full-chapter');
                }}
                className="box lbl px-3 h-[28px] text-[10px] text-[var(--cobalt)] border-[var(--cobalt)] hover:bg-[var(--cobalt)] hover:text-white transition-colors cursor-pointer"
              >
                {copiedId === 'full-chapter'
                  ? 'COPIED TO CLIPBOARD ✓'
                  : 'COPY FULL CHAPTER / คัดลอกทั้งบท'}
              </button>
            </div>

            <h2
              className="text-[28px] md:text-[36px] font-bold tracking-tight text-[var(--ink)] leading-snug"
              style={{ fontFamily: 'var(--font-sans)' }}
            >
              บทที่ {detailFilm.chapterNumber} {detailFilm.title} ({detailFilm.titleTh})
            </h2>

            <p className="text-[15px] md:text-[16px] text-[var(--muted)] leading-relaxed">
              {detailFilm.content.brief}
            </p>

            {/* Quick Section Table of Contents Pills */}
            <div className="flex flex-wrap gap-1.5 pt-2">
              <span className="lbl text-[9px] text-[var(--muted)] flex items-center pr-1">
                SECTIONS:
              </span>
              {detailFilm.content.sections.map((sec) => (
                <button
                  key={sec.id}
                  type="button"
                  onClick={() => {
                    const el = document.getElementById(`sec-${sec.id}`);
                    if (el) el.scrollIntoView({ behavior: 'smooth' });
                  }}
                  className="lbl text-[9.5px] px-2 py-1 rounded bg-[var(--paper)] border border-[var(--rule)]/20 text-[var(--ink)] hover:border-[var(--cobalt)] hover:text-[var(--cobalt)] transition-colors cursor-pointer"
                >
                  {sec.number} {sec.title.split(' ')[0]}
                </button>
              ))}
            </div>
          </div>

          {/* Sections List */}
          <div className="flex flex-col gap-8">
            {detailFilm.content.sections.map((sec) => {
              const secText =
                `${sec.number} ${sec.title}\n\n${sec.content}\n` +
                (sec.bullets ? '\n' + sec.bullets.join('\n') : '');
              return (
                <article
                  key={sec.id}
                  id={`sec-${sec.id}`}
                  className="p-6 max-md:p-4 rounded-lg bg-[var(--sheet)]/60 border border-[var(--rule)]/15 shadow-sm hover:border-[var(--cobalt)]/40 transition-colors"
                >
                  <div className="flex items-start justify-between gap-4 mb-3">
                    <h3 className="text-[19px] md:text-[21px] font-bold text-[var(--ink)] flex items-center gap-2">
                      <span className="inline-block px-2 py-0.5 text-[12px] font-mono font-bold rounded bg-[var(--cobalt)] text-white">
                        {sec.number}
                      </span>
                      <span>{sec.title}</span>
                    </h3>
                    <button
                      type="button"
                      onClick={() => handleCopyText(secText, sec.id)}
                      className="lbl text-[9px] px-2 py-1 rounded border border-[var(--rule)]/20 text-[var(--muted)] hover:text-[var(--cobalt)] hover:border-[var(--cobalt)] transition-colors shrink-0 cursor-pointer"
                      title="คัดลอกส่วนนี้สำหรับนำไปทำรายงานหรือสรุป"
                    >
                      {copiedId === sec.id ? 'COPIED ✓' : 'COPY'}
                    </button>
                  </div>

                  <p className="text-[15px] md:text-[16px] leading-relaxed text-[var(--ink)]/90 mb-3 whitespace-pre-line">
                    {sec.content}
                  </p>

                  {sec.bullets && sec.bullets.length > 0 && (
                    <ul className="mt-3 flex flex-col gap-2 pl-0 list-none">
                      {sec.bullets.map((bullet, bIdx) => (
                        <li
                          key={bIdx}
                          className="flex items-start gap-2.5 text-[14px] md:text-[15px] leading-relaxed text-[var(--ink)]/85 bg-[var(--paper)]/60 p-2.5 rounded border border-[var(--rule)]/10"
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-[var(--cobalt)] mt-2 shrink-0" />
                          <span className="flex-1">{bullet}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </article>
              );
            })}
          </div>

          {/* Chapter Bottom Navigation & Progress */}
          <div className="mt-12 pt-6 border-t border-[var(--rule)]/20 flex flex-col sm:flex-row items-center justify-between gap-4">
            <button
              type="button"
              onClick={() => navigateToChapterInDetail(detailFilm.chapterNumber - 2)}
              className="box lbl px-4 h-[36px] text-[var(--ink)] border-[var(--rule)] hover:border-[var(--cobalt)] hover:text-[var(--cobalt)] cursor-pointer"
            >
              ← PREVIOUS CHAPTER / บทก่อนหน้า
            </button>

            <span className="lbl text-[10px] text-[var(--muted)]">
              บทที่ {detailFilm.chapterNumber} จาก 12 บทเรียน
            </span>

            <button
              type="button"
              onClick={() => navigateToChapterInDetail(detailFilm.chapterNumber)}
              className="box lbl px-4 h-[36px] text-white bg-[var(--cobalt)] border-[var(--cobalt)] hover:opacity-90 cursor-pointer"
            >
              NEXT CHAPTER / บทถัดไป →
            </button>
          </div>
        </section>
      </div>

      {/* 10. Curriculum Syllabus Drawer */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Computer Basics Course Syllabus"
        className={`fixed inset-0 z-80 flex justify-end bg-black/40 backdrop-blur-xs transition-opacity duration-300 ${
          showCurriculumDrawer
            ? 'pointer-events-auto opacity-100'
            : 'pointer-events-none opacity-0'
        }`}
        onClick={() => setShowCurriculumDrawer(false)}
      >
        <div
          className={`relative w-full max-w-[540px] h-full bg-[var(--sheet)] text-[var(--ink)] p-6 md:p-8 flex flex-col shadow-2xl overflow-y-auto transform transition-transform duration-300 ease-out ${
            showCurriculumDrawer ? 'translate-x-0' : 'translate-x-full'
          }`}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between pb-4 border-b border-[var(--rule)]/20 mb-6">
            <div>
              <span className="lbl text-[10px] text-[var(--cobalt)] font-bold">COURSE SYLLABUS</span>
              <h3 className="text-[20px] font-bold m-0 text-[var(--ink)]">
                สารบัญบทเรียน 12 บท
              </h3>
            </div>
            <button
              type="button"
              className="box lbl h-[30px] px-3 border-[var(--rule)] hover:border-[var(--cobalt)] hover:text-[var(--cobalt)] cursor-pointer"
              onClick={() => setShowCurriculumDrawer(false)}
            >
              CLOSE / ปิด
            </button>
          </div>

          <p className="text-[13px] text-[var(--muted)] leading-relaxed mb-6">
            เนื้อหาคำอธิบายทั้ง 12 หัวข้อแบบละเอียด เน้นเนื้อหาทางวิชาการ ความหมาย หน้าที่ องค์ประกอบ ประเภท และตัวอย่างการใช้งาน สามารถนำไปใช้ประกอบการเรียน การทำรายงาน หรือจัดทำเว็บไซต์สื่อการสอนได้โดยตรง
          </p>

          <div className="flex flex-col gap-3">
            {FILMS.map((film, fIdx) => (
              <div
                key={film.id}
                className="p-3.5 rounded-lg border border-[var(--rule)]/15 bg-[var(--paper)] hover:border-[var(--cobalt)] hover:shadow-sm transition-all flex items-center justify-between gap-3 group"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="lbl text-[9px] px-1.5 py-0.5 rounded bg-[var(--cobalt)] text-white font-mono font-bold">
                      CH.{String(film.chapterNumber).padStart(2, '0')}
                    </span>
                    <span className="font-bold text-[14px] text-[var(--ink)] truncate">
                      {film.title}
                    </span>
                  </div>
                  <p className="text-[12px] text-[var(--muted)] m-0 truncate">
                    {film.titleTh}
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    className="box lbl h-[28px] px-2.5 text-[9px] border-[var(--rule)] text-[var(--ink)] group-hover:border-[var(--cobalt)] group-hover:text-[var(--cobalt)] cursor-pointer"
                    onClick={() => {
                      targetRef.current = 12 + fIdx;
                      setShowCurriculumDrawer(false);
                    }}
                    title="หมุนไปยังเทปม้วนนี้บนชั้นวาง 3D"
                  >
                    SHELF
                  </button>
                  <button
                    type="button"
                    className="box lbl h-[28px] px-2.5 text-[9px] bg-[var(--cobalt)] text-white border-[var(--cobalt)] cursor-pointer hover:opacity-90"
                    onClick={() => {
                      setShowCurriculumDrawer(false);
                      targetRef.current = 12 + fIdx;
                      setDetailFilm(film);
                      openDetail();
                    }}
                    title="เปิดอ่านเนื้อหาบทเรียนนี้ทันที"
                  >
                    READ
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Hidden YouTube Audio Player container mounted via Portal to preserve main tree */}
      {typeof document !== 'undefined' &&
        createPortal(
          <div
            aria-hidden="true"
            className="fixed -bottom-10 -right-10 w-[1px] h-[1px] opacity-0 pointer-events-none overflow-hidden"
          >
            <div id="youtube-audio-player" />
          </div>,
          document.body
        )}
    </div>
  );
}

