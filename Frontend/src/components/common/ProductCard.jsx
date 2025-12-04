import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useLoginModal } from '../../context/LoginModalContext';

import { CircularProgress } from '@mui/material';

const ProductCard = ({ product, onAddToCart, showAddButton = true, layout = 'list' }) => {
  const [imageError, setImageError] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const dispatch = useDispatch();
  const { openLoginModal } = useLoginModal();
  const { isAuthenticated } = useSelector((state) => state.auth);

  if (!product) return null;

  const {
    nombre: name,
    descripcion: description = 'Sin descripción disponible',
    precio: price,
    imagen,
    url_imagen,
    totalVendido = 0
  } = product;

  const image = imageError
    ? '/images/placeholder-product.jpg'
    : (url_imagen || imagen || '/images/placeholder-product.jpg');

  const handleImageError = () => !imageError && setImageError(true);

  const handleAddToCart = async () => {
    if (!isAuthenticated) return openLoginModal();
    if (onAddToCart) {
      setIsAdding(true);
      try {
        await onAddToCart(product);
      } catch (error) {
        console.error("Error adding to cart", error);
      } finally {
        setIsAdding(false);
      }
    }
  };

  const isBestSeller = totalVendido > 5;
  const isGrid = layout === 'grid';
  return (
    <div className={`bg-white rounded-2xl shadow-sm hover:shadow-xl transition-all duration-300 font-['Montserrat'] border border-red-100 overflow-hidden group ${isGrid ? 'flex flex-col h-full' : 'mb-4'}`}>
      <div className={`${isGrid ? 'flex flex-col h-full' : 'grid grid-cols-[120px_1fr_auto] gap-6 p-4 items-center'}`}>

        {/* Imagen */}
        <div className={`${isGrid ? 'w-full h-40 p-4' : 'w-[120px] h-[120px] rounded-xl p-2'} overflow-hidden bg-white relative flex items-center justify-center`}>
          <img
            src={image}
            alt={name}
            className="w-full h-full object-contain transition-transform duration-500 group-hover:scale-110"
            onError={handleImageError}
          />
        </div>

        {/* Info */}
        <div className={`flex flex-col ${isGrid ? 'p-3 flex-grow' : 'justify-center'}`}>
          <h3 className={`font-bold text-[#4a2b2b] mb-1 ${isGrid ? 'text-base' : 'text-xl'}`}>{name}</h3>
          <p className="text-gray-600 text-xs leading-relaxed line-clamp-2 mb-2">{description}</p>

          {isGrid && (
            <div className="mt-auto pt-2 flex items-center justify-between">
              <div className="text-lg font-bold text-[#8b3e3e]">S/{price?.toFixed(2)}</div>
            </div>
          )}
        </div>

        {/* Precio y botón (Layout Lista) o Solo Botón (Layout Grid) */}
        <div className={`${isGrid ? 'px-3 pb-3' : 'flex flex-col items-end gap-3'}`}>
          {!isGrid && <div className="text-2xl font-bold text-[#8b3e3e]">S/{price?.toFixed(2)}</div>}

          {showAddButton && (
            <button
              className={`
                group/btn relative overflow-hidden rounded-xl font-bold text-xs transition-all duration-300 cursor-pointer
                ${isGrid ? 'w-full py-2 bg-[#fff0f0] text-[#8b3e3e] hover:text-white hover:shadow-lg hover:shadow-red-900/20' : 'px-6 py-2.5 bg-[#fff0f0] text-[#8b3e3e] hover:text-white border border-red-100 hover:border-[#8b3e3e]'}
              `}
              onClick={handleAddToCart}
              disabled={isAdding}
            >
              <span className="relative z-10 flex items-center justify-center gap-2">
                {isAdding ? (
                  <>
                    <CircularProgress size={16} color="inherit" />
                    Agregando...
                  </>
                ) : (
                  <>
                    Añadir al carrito
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 transition-transform group-hover/btn:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                    </svg>
                  </>
                )}
              </span>
              {!isAdding && <div className="absolute inset-0 bg-[#8b3e3e] transform scale-x-0 group-hover/btn:scale-x-100 transition-transform origin-left duration-300 ease-out"></div>}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default React.memo(ProductCard);
