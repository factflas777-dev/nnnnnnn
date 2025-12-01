import { useEffect, useRef, useState } from 'react';

interface JoystickProps {
  onMove: (x: number, y: number) => void;
  onRelease: () => void;
  onBoost: (boosting: boolean) => void;
}

export default function Joystick({ onMove, onRelease, onBoost }: JoystickProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const handleTouchStart = (e: TouchEvent) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const touch = e.touches[0];

      if (
        touch.clientX >= rect.left &&
        touch.clientX <= rect.right &&
        touch.clientY >= rect.top &&
        touch.clientY <= rect.bottom
      ) {
        setIsDragging(true);
        e.preventDefault();
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!isDragging || !containerRef.current) return;

      const rect = containerRef.current.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      const touch = e.touches[0];

      let deltaX = touch.clientX - centerX;
      let deltaY = touch.clientY - centerY;

      const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
      const maxDistance = rect.width / 2 - 20;

      if (distance > maxDistance) {
        deltaX = (deltaX / distance) * maxDistance;
        deltaY = (deltaY / distance) * maxDistance;
      }

      setPosition({ x: deltaX, y: deltaY });
      onMove(centerX + deltaX, centerY + deltaY);

      e.preventDefault();
    };

    const handleTouchEnd = () => {
      setIsDragging(false);
      setPosition({ x: 0, y: 0 });
      onRelease();
    };

    document.addEventListener('touchstart', handleTouchStart, { passive: false });
    document.addEventListener('touchmove', handleTouchMove, { passive: false });
    document.addEventListener('touchend', handleTouchEnd);

    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, [isDragging, onMove, onRelease]);

  return (
    <div className="fixed bottom-8 left-8 md:hidden z-50">
      <div
        ref={containerRef}
        className="relative w-32 h-32 bg-gray-800 bg-opacity-50 rounded-full border-2 border-gray-600"
      >
        <div
          className="absolute w-12 h-12 bg-gray-400 bg-opacity-70 rounded-full top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 transition-transform"
          style={{
            transform: `translate(calc(-50% + ${position.x}px), calc(-50% + ${position.y}px))`
          }}
        />
      </div>
      <button
        className="absolute -right-20 top-1/2 transform -translate-y-1/2 w-16 h-16 bg-red-600 bg-opacity-70 rounded-full border-2 border-red-400 active:bg-red-700"
        onTouchStart={() => onBoost(true)}
        onTouchEnd={() => onBoost(false)}
      >
        <span className="text-white font-bold text-xs">BOOST</span>
      </button>
    </div>
  );
}
