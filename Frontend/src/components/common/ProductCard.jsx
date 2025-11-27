import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useLoginModal } from '../../context/LoginModalContext';

const ProductCard = ({ product, onAddToCart, showAddButton = true }) => {
  const [imageError, setImageError] = useState(false);
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

  const handleAddToCart = () => {
    if (!isAuthenticated) return openLoginModal();
    if (onAddToCart) onAddToCart(product);
  };

  const isBestSeller = totalVendido > 5;

  return (
    <div className="bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow duration-300 font-['Montserrat'] border border-red-300 mb-3">
      <div className="grid grid-cols-[100px_1fr_auto] gap-4 items-center px-4 py-4">
        {/* Imagen */}
        <div className="w-[100px] h-[90px] rounded-xl overflow-hidden bg-[#ffe3d9] flex items-center justify-center">
          <img
            src={image}
            alt={name}
            className="w-full h-full object-cover"
            onError={handleImageError}
          />
        </div>

        {/* Info */}
        <div className="flex flex-col justify-center">
          <h3 className="text-base font-bold text-black mb-1">{name}</h3>
          <p className="text-gray-700 text-sm mb-2 line-clamp-2">{description}</p>
        </div>

        {/* Precio y botón (solo si showAddButton=true) */}
        <div className="flex flex-col items-end gap-2">
          <div className="text-xl font-bold text-red-600">S/{price?.toFixed(2)}</div>
          {showAddButton && (
            <button
              className="px-4 py-2 bg-pink-50 text-[#771919] rounded-lg hover:bg-pink-100 transition-colors duration-200 font-medium text-sm border border-pink-200"
              onClick={handleAddToCart}
            >
              Añadir al carrito
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default React.memo(ProductCard);
