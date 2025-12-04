import { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import imgLogoFamiglia from "../../assets/images/img_logoFamigliawithoutBorders.png";
import { loginStart, loginSuccess, loginFailure, clearError } from "../../redux/slices/authSlice";
import { authAPI } from "../../services/api";
import { useLoginModal } from "../../context/LoginModalContext";
import Modal from "../common/Modal";

export default function LoginForm({ isOpen, onClose, onSwitchToRegister }) {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { isLoading, error } = useSelector((state) => state.auth);

  const [fieldErrors, setFieldErrors] = useState({});
  const [formData, setFormData] = useState({ correo: "", contraseña: "" });
  const [twoFARequired, setTwoFARequired] = useState(false);
  const [twoFAData, setTwoFAData] = useState({ userId: null, token: "" });

  const { redirectPath } = useLoginModal();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handle2FAChange = (e) => {
    setTwoFAData({ ...twoFAData, token: e.target.value });
  };

  // === LOGIN NORMAL ===
  const handleSubmit = async (e) => {
    e.preventDefault();
    dispatch(loginStart());
    setFieldErrors({});

    try {
      if (twoFARequired) {
        const response = await authAPI.login({
          correo: formData.correo,
          contraseña: formData.contraseña,
          token2fa: twoFAData.token,
        });

        dispatch(loginSuccess(response.data));

        if (response.data.authToken) {
          document.cookie = `authToken=${response.data.authToken}; path=/;`;
          localStorage.setItem("authToken", response.data.authToken);
          localStorage.setItem("token", response.data.authToken);
        }

        redirectAfterLogin(response.data.usuario?.rol);
        return;
      }

      const response = await authAPI.login(formData);

      if (response.data.twofa_required) {
        setTwoFARequired(true);
        setTwoFAData({ ...twoFAData, userId: response.data.userId });
        dispatch(loginFailure(null));
        return;
      }

      dispatch(loginSuccess(response.data));

      if (response.data.authToken) {
        document.cookie = `authToken=${response.data.authToken}; path=/;`;
        localStorage.setItem("authToken", response.data.authToken);
        localStorage.setItem("token", response.data.authToken);
      }

      redirectAfterLogin(response.data.usuario?.rol);

    } catch (err) {
      handleLoginError(err);
    }
  };

  const handleLoginError = (err) => {
    const status = err.response?.status;
    const data = err.response?.data;
    if (status === 400 && Array.isArray(data?.errors)) {
      const errorsByField = {};
      data.errors.forEach((e) => {
        errorsByField[e.field] = e.message;
      });
      setFieldErrors(errorsByField);
      return;
    }
    const errorMessage = data?.message || "Error al iniciar sesión.";
    dispatch(loginFailure(errorMessage));
  };

  const redirectAfterLogin = (userRole) => {
    const isAdmin = userRole === "A";
    const adminDefaultPath = "/pedidos-admin";
    const clientDefaultPath = "/carta";
    const isAdminRedirectPath =
      redirectPath?.startsWith("/pedidos-admin") || redirectPath?.startsWith("/catalogo-admin");

    const targetPath = isAdmin
      ? (redirectPath && isAdminRedirectPath ? redirectPath : adminDefaultPath)
      : (redirectPath && !isAdminRedirectPath ? redirectPath : clientDefaultPath);

    navigate(targetPath);
    onClose();
  };

  const handleClose = () => {
    dispatch(clearError());
    setFormData({ correo: "", contraseña: "" });
    setFieldErrors({});
    setTwoFARequired(false);
    onClose();
  };

  const shouldShowGeneralError = error && !fieldErrors.correo && !fieldErrors.contraseña;

  // Google OAuth URL
  const googleAuthUrl = `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/auth/google`;

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="">
      <div className="flex flex-col items-center justify-center px-4 overflow-y-auto overflow-x-hidden">
        <div className="w-full flex flex-col items-center text-center justify-center">
          <img src={imgLogoFamiglia} alt="Panadería Famiglia" className="w-48 mb-2" />
          <h2 className="text-2xl font-semibold text-[#8B3A3A] mb-6">
            {twoFARequired ? "Verificación en dos pasos" : "¡Qué bueno verte aquí!"}
          </h2>

          {shouldShowGeneralError && (
            <div className="w-full mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded-md text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-5 w-full text-left">
            {/* Campo Correo */}
            <div>
              <label className="block text-[#8B3A3A] text-base font-medium mb-2">
                Correo Electrónico:
              </label>
              <input
                type="email"
                name="correo"
                value={formData.correo}
                onChange={handleChange}
                disabled={twoFARequired}
                className={`w-full border ${fieldErrors.correo ? "border-red-400" : "border-[#E3AFAF]"
                  } rounded-md p-3 text-lg focus:outline-none focus:ring-2 focus:ring-[#E3AFAF]`}
                placeholder="Ej. maria@gmail.com"
              />
              {fieldErrors.correo && (
                <p className="text-red-600 text-sm mt-1">{fieldErrors.correo}</p>
              )}
            </div>

            {/* Campo Contraseña */}
            <div>
              <label className="block text-[#8B3A3A] text-base font-medium mb-2">
                Contraseña:
              </label>
              <input
                type="password"
                name="contraseña"
                value={formData.contraseña}
                onChange={handleChange}
                disabled={twoFARequired}
                className={`w-full border ${fieldErrors.contraseña ? "border-red-400" : "border-[#E3AFAF]"
                  } rounded-md p-3 text-lg focus:outline-none focus:ring-2 focus:ring-[#E3AFAF]`}
                placeholder="********"
              />
              {fieldErrors.contraseña && (
                <p className="text-red-600 text-sm mt-1">{fieldErrors.contraseña}</p>
              )}
            </div>

            {/* Campo Código 2FA */}
            {twoFARequired && (
              <div>
                <label className="block text-[#8B3A3A] text-base font-medium mb-2">
                  Código de Autenticación (2FA):
                </label>
                <input
                  type="text"
                  name="token"
                  value={twoFAData.token}
                  onChange={handle2FAChange}
                  maxLength={6}
                  placeholder="000000"
                  className="w-full border border-[#E3AFAF] rounded-md p-3 text-lg text-center tracking-widest focus:outline-none focus:ring-2 focus:ring-[#E3AFAF]"
                />
              </div>
            )}

            {/* Botón principal */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-[#EACCCC] text-[#5A3A29] font-semibold py-3 rounded-md hover:bg-[#E3AFAF] transition-colors mt-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading
                ? twoFARequired
                  ? "VERIFICANDO..."
                  : "INICIANDO SESIÓN..."
                : twoFARequired
                  ? "VERIFICAR CÓDIGO"
                  : "INICIAR SESIÓN"}
            </button>
          </form>

          {/* Divider */}
          <div className="flex items-center w-full my-4">
            <div className="flex-1 border-t border-gray-300"></div>
            <span className="px-3 text-gray-500 text-sm">o</span>
            <div className="flex-1 border-t border-gray-300"></div>
          </div>

          {/* Google Sign In Button */}
          <a
            href={googleAuthUrl}
            className="w-full flex items-center justify-center gap-3 border border-gray-300 rounded-md py-3 px-4 hover:bg-gray-50 transition-colors"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
            <span className="text-gray-700 font-medium">Continuar con Google</span>
          </a>

          <p className="text-sm text-[#5A3A29] mt-5 mb-2">
            ¿No tienes una cuenta?{" "}
            <span
              onClick={() => {
                handleClose();
                if (onSwitchToRegister) onSwitchToRegister();
              }}
              className="text-[#8B3A3A] font-medium hover:underline cursor-pointer"
            >
              Regístrate aquí
            </span>
          </p>
        </div>
      </div>
    </Modal>
  );
}
