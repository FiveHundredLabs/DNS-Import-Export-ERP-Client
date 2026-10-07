import { useState, useEffect } from 'react';
import { Maximize2, Minimize2 } from 'lucide-react';
import { cn } from '../../utils/cn';

interface FullscreenButtonProps {
  className?: string;
}

export function FullscreenButton({ className }: FullscreenButtonProps) {
  const [isFullscreen, setIsFullscreen] = useState<boolean>(() => {
    return (
      typeof document !== 'undefined' &&
      Boolean(
        document.fullscreenElement ||
          (document as any).webkitFullscreenElement ||
          (document as any).mozFullScreenElement ||
          (document as any).msFullscreenElement
      )
    );
  });

  useEffect(() => {
    const handleFullscreenChange = () => {
      const isCurrentlyFullscreen = Boolean(
        document.fullscreenElement ||
          (document as any).webkitFullscreenElement ||
          (document as any).mozFullScreenElement ||
          (document as any).msFullscreenElement
      );
      setIsFullscreen(isCurrentlyFullscreen);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('mozfullscreenchange', handleFullscreenChange);
    document.addEventListener('MSFullscreenChange', handleFullscreenChange);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('mozfullscreenchange', handleFullscreenChange);
      document.removeEventListener('MSFullscreenChange', handleFullscreenChange);
    };
  }, []);

  const toggleFullscreen = async () => {
    try {
      const isCurrentlyFullscreen = Boolean(
        document.fullscreenElement ||
          (document as any).webkitFullscreenElement ||
          (document as any).mozFullScreenElement ||
          (document as any).msFullscreenElement
      );

      if (!isCurrentlyFullscreen) {
        const docEl = document.documentElement as any;
        if (docEl.requestFullscreen) {
          await docEl.requestFullscreen();
        } else if (docEl.webkitRequestFullscreen) {
          await docEl.webkitRequestFullscreen();
        } else if (docEl.mozRequestFullScreen) {
          await docEl.mozRequestFullScreen();
        } else if (docEl.msRequestFullscreen) {
          await docEl.msRequestFullscreen();
        }
      } else {
        const doc = document as any;
        if (doc.exitFullscreen) {
          await doc.exitFullscreen();
        } else if (doc.webkitExitFullscreen) {
          await doc.webkitExitFullscreen();
        } else if (doc.mozCancelFullScreen) {
          await doc.mozCancelFullScreen();
        } else if (doc.msExitFullscreen) {
          await doc.msExitFullscreen();
        }
      }
    } catch (err) {
      console.warn('Native Fullscreen request failed or was cancelled:', err);
    }
  };

  const label = isFullscreen ? 'Exit Full Screen' : 'Full Screen';

  return (
    <button
      type="button"
      onClick={toggleFullscreen}
      className={cn(
        'flex h-9 w-9 items-center justify-center rounded-md text-primary-foreground/90 hover:bg-primary-foreground/15 hover:text-primary-foreground transition-colors focus:outline-none focus:ring-2 focus:ring-primary-foreground shrink-0 cursor-pointer',
        className
      )}
      title={label}
      aria-label={label}
    >
      {isFullscreen ? (
        <Minimize2 className="h-4.5 w-4.5 transition-transform duration-150 hover:scale-110" />
      ) : (
        <Maximize2 className="h-4.5 w-4.5 transition-transform duration-150 hover:scale-110" />
      )}
    </button>
  );
}
