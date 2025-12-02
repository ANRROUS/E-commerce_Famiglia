import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  user: null,
  role: null,
  isAuthenticated: false,
  token: null,
  isLoading: true, // Empieza en true para verificar autenticación inicial
  error: null
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    registerStart: (state) => {
      state.isLoading = true;
      state.error = null;
    },
    registerSuccess: (state, action) => {
      state.isLoading = false;
      state.error = null;
    },
    registerFailure: (state, action) => {
      state.isLoading = false;
      state.error = action.payload;
    },
    loginStart: (state) => {
      state.isLoading = true;
      state.error = null;
    },
    loginSuccess: (state, action) => {
      state.isLoading = false;
      state.isAuthenticated = true;
      state.user = action.payload.usuario;
      state.role = action.payload.usuario?.rol || "C";
      state.error = null;
    },
    loginFailure: (state, action) => {
      state.isLoading = false;
      state.isAuthenticated = false;
      state.user = null;
      state.role = null;
      state.error = action.payload;
    },
    logout: (state) => {
      // Reiniciar completamente el estado de autenticación
      state.user = null;
      state.role = null;
      state.isAuthenticated = false;
      state.token = null;
      state.error = null;
      state.isLoading = false;
    },
    clearError: (state) => {
      state.error = null;
    },
    setUser: (state, action) => {
      state.user = action.payload;
      state.isAuthenticated = true;
      state.isLoading = false;
      state.role = action.payload?.rol || "C";
    },
    authCheckComplete: (state) => {
      state.isLoading = false;
      if (!state.isAuthenticated) {
        state.user = null;
        state.role = null;
      }
    }
  }
});

export const {
  registerStart,
  registerSuccess,
  registerFailure,
  loginStart,
  loginSuccess,
  loginFailure,
  logout,
  clearError,
  setUser,
  authCheckComplete
} = authSlice.actions;

export default authSlice.reducer;
