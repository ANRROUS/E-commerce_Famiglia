import API from "./axiosInstance.js";

export const ProductosAPI = {
    getAll: () => API.get('/productos'),
    getById: (id) => API.get(`/productos/${id}`),
    getByCategoria: (id_categoria) => API.get(`/productos/categoria/${id_categoria}`)
}

export const categoriaAPI = {
    getAll: () => API.get('/categorias'),
    getById: (id) => API.get(`/categorias/${id}`)
}

export const authAPI = {
    register: (userData) => API.post('/api/auth/register', userData),
    login: (credentials) => API.post('/api/auth/login', credentials),
    verify2FA: (data) => API.post("/api/auth/verify-2fa", data),
    logout: () => API.post('/api/auth/logout'),
    getPerfil: () => API.get('/api/auth/perfil'),
    uploadProfileImage: (imageData) => API.post('/api/auth/perfil/upload-image', imageData)
}

export const pagoAPI = {
    procesarPago: (datosPago) => API.post('/api/pedido/pago/procesar', datosPago)
}

export const pedidoAPI = {
    getHistorialPedidos: () => API.get('/pedidos/historial/mis-pedidos'),
    getPedidosAdmin: () => API.get('/pedidos/admin'),
    updatePedidoEstadoAdmin: (id_pedido, estado) => API.put(`/pedidos/admin/${id_pedido}/estado`, { estado })
}

export const preferencesAPI = {
    getHistorialTests: () => API.get('/api/preferences/history')
}
