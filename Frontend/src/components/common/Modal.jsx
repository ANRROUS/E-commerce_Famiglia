import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { IconButton } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';

// Modal genérico reutilizable - usando Portal para evitar problemas de posicionamiento
const Modal = ({ isOpen, onClose, title, children }) => {
  // Cerrar modal con la tecla ESC
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  // Bloquear scroll del body cuando el modal está abierto
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'auto';
    }
    return () => {
      document.body.style.overflow = 'auto';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  // Usar createPortal para renderizar el modal en el body, fuera del flujo del DOM
  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {/* Fondo con desenfoque */}
      <div
        className="absolute inset-0 backdrop-blur-[6px] bg-black/20"
        onClick={onClose}
        aria-hidden="true"
      />
      {/* Contenedor del modal */}
      <div
        className="relative bg-white rounded-lg shadow-xl border-2 border-[#b17b6b] max-w-md w-[95%] sm:w-full mx-4 p-6 z-10 max-h-[90vh] overflow-y-auto font-['Montserrat']"
        onClick={(e) => e.stopPropagation()}
      >
        <IconButton
          onClick={onClose}
          sx={{
            position: 'absolute',
            top: 10,
            right: 10,
            color: '#b17b6b',
            '&:hover': { color: '#6b2c2c' },
          }}
          aria-label="Cerrar"
        >
          <CloseIcon />
        </IconButton>

        {title && <h2 className="text-2xl font-bold text-[#6b2c2c] mb-4">{title}</h2>}

        <div className="text-sm text-[#4a2b2b] leading-relaxed">{children}</div>
      </div>
    </div>,
    document.body
  );
};

export default Modal;
