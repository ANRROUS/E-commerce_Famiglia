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

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="">
      <div className="flex flex-col items-center justify-center px-6 py-4">
        <div className="w-full max-w-md flex flex-col items-center text-center justify-center -mt-16">
          <img src={imgLogoFamiglia} alt="Panadería Famiglia" className="w-56 -mb-6" />
          <h2 className="text-3xl font-semibold text-[#8B3A3A] mb-8">
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
                disabled={twoFARequired} // bloquea correo una vez entra a 2FA
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
                disabled={twoFARequired} // bloquea contraseña al entrar en 2FA
                className={`w-full border ${fieldErrors.contraseña ? "border-red-400" : "border-[#E3AFAF]"
                  } rounded-md p-3 text-lg focus:outline-none focus:ring-2 focus:ring-[#E3AFAF]`}
                placeholder="********"
              />
              {fieldErrors.contraseña && (
                <p className="text-red-600 text-sm mt-1">{fieldErrors.contraseña}</p>
              )}
            </div>

            {/* Campo Código 2FA (solo aparece si está activado) */}
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
        </div >
      </div >
    </Modal >
  );
}
