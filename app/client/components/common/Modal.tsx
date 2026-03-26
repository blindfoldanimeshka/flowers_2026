'use client'

import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  className?: string;
}

const Modal: React.FC<ModalProps> = ({ 
  isOpen, 
  onClose, 
  title, 
  children, 
  className = "" 
}) => {
  const modalRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const overflowBackupRef = useRef<{
    bodyOverflow: string;
    htmlOverflow: string;
  } | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (isOpen) setIsVisible(true);
  }, [isOpen]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    let preventTouchMove: ((event: TouchEvent) => void) | null = null;

    if (isVisible) {
      document.addEventListener('keydown', handleEscape);

      // На iOS/некоторых mobile-браузерах блокировка скролла только через body может не сработать.
      // Поэтому фиксируем и body, и html. Плюс перехватываем touchmove, чтобы фон не скроллился.
      const body = document.body;
      const html = document.documentElement;
      overflowBackupRef.current = {
        bodyOverflow: body.style.overflow,
        htmlOverflow: html.style.overflow,
      };
      body.style.overflow = 'hidden';
      html.style.overflow = 'hidden';

      preventTouchMove = (event: TouchEvent) => {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-call
        event.preventDefault();
      };
      document.addEventListener('touchmove', preventTouchMove, { passive: false });
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      if (preventTouchMove) {
        document.removeEventListener('touchmove', preventTouchMove as any);
      }
      const backup = overflowBackupRef.current;
      const body = document.body;
      const html = document.documentElement;
      body.style.overflow = backup?.bodyOverflow ?? '';
      html.style.overflow = backup?.htmlOverflow ?? '';
      overflowBackupRef.current = null;
    };
  }, [isVisible, onClose]);

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence
      // Exit-анимация длится ~0.22-0.26s, после неё можно снять блокировку скролла.
      onExitComplete={() => {
        if (!isOpen) setIsVisible(false);
      }}
    >
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/25 backdrop-blur-[2px]"
          onClick={handleBackdropClick}
        >
          <motion.div
            ref={modalRef}
            initial={{ opacity: 0, y: 12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.98 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
            className={`bg-white rounded-[20px] shadow-xl max-w-md w-full max-h-[90vh] overflow-hidden ${className}`}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Заголовок с крестиком */}
            {title && (
              <div className="flex items-center justify-between p-3 sm:p-4 border-b border-gray-100">
                <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
                <button
                  onClick={onClose}
                  className="p-1 rounded-full hover:bg-gray-100 transition-colors duration-200"
                  aria-label="Закрыть"
                >
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="text-gray-500"
                  >
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                  </svg>
                </button>
              </div>
            )}

            {/* Контент */}
            <div className="p-3 sm:p-4 overflow-y-auto max-h-[calc(90vh-120px)]">{children}</div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
};

export default Modal;
