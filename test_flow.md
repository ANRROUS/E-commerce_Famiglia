# Flujo de Pruebas para Agente de Voz - Famiglia

Este documento define los escenarios de prueba para validar la navegación y funcionalidad del agente de voz en la aplicación Famiglia.

## Roles y Credenciales
- **Administrador**:
  - Correo: `arthuro@gmail.com`
  - Contraseña: `arthuro`
- **Cliente**:
  - Correo: (Variable, se usará uno de prueba o nuevo registro)
  - Contraseña: (Variable)

---

## Escenario 1: Navegación y Funcionalidad - Rol Cliente (No Autenticado)

### Pestaña: Inicio (Home)
**Objetivo**: Verificar navegación básica y búsqueda de productos.

1.  **Petición**: "Hola, quiero ver qué productos tienen."
    *   **Acción Esperada**: El agente debe navegar a la sección de productos o hacer scroll hacia ellos.
    *   **Respuesta Esperada**: "Claro, aquí tienes nuestros productos destacados..."
2.  **Petición**: "Busca si tienen torta de chocolate."
    *   **Acción Esperada**: Usar la barra de búsqueda o filtrar productos.
    *   **Respuesta Esperada**: "He encontrado estas opciones de torta de chocolate..." o "Lo siento, no encontré torta de chocolate."
3.  **Petición**: "Quiero registrarme."
    *   **Acción Esperada**: Navegar a la página de registro (/register).
    *   **Respuesta Esperada**: "Te llevo a la página de registro."

### Pestaña: Registro (/register)
**Objetivo**: Verificar flujo de registro y captura de credenciales.

4.  **Petición**: "Regístrame con el correo cliente_prueba@gmail.com, nombre Juan Perez y contraseña 123456."
    *   **Acción Esperada**:
        *   Llenar formulario (Nombre, Correo, Contraseña).
        *   **IMPORTANTE**: El agente debe preguntar si desea guardar estas credenciales para futuros inicios de sesión.
        *   Enviar formulario.
    *   **Respuesta Esperada**: "He llenado tus datos. ¿Quieres que guarde estas credenciales para iniciar sesión automáticamente en el futuro?"

---

## Escenario 2: Navegación y Funcionalidad - Rol Cliente (Autenticado)

### Pestaña: Login (/login)
**Objetivo**: Verificar inicio de sesión automático/asistido.

1.  **Petición**: "Quiero iniciar sesión."
    *   **Acción Esperada**: Navegar a /login.
    *   **Respuesta Esperada**: "¿Quieres iniciar sesión como Juan Perez (cliente_prueba@gmail.com) o como otro usuario?"
2.  **Petición**: "Como Juan Perez."
    *   **Acción Esperada**: Auto-rellenar correo y contraseña guardados y hacer clic en ingresar.
    *   **Respuesta Esperada**: "Iniciando sesión como Juan Perez..."

### Pestaña: Catálogo / Productos
**Objetivo**: Verificar flujo de compra.

3.  **Petición**: "Agrega 2 baguettes al carrito."
    *   **Acción Esperada**: Identificar producto "baguette", seleccionar cantidad 2, agregar al carrito.
    *   **Respuesta Esperada**: "He agregado 2 baguettes a tu carrito."
4.  **Petición**: "¿Qué tengo en mi carrito?"
    *   **Acción Esperada**: Consultar estado del carrito (tool `getCartState` o navegar a /cart).
    *   **Respuesta Esperada**: "Tienes 2 baguettes. El total es S/..."

### Pestaña: Carrito (/cart)
**Objetivo**: Verificar gestión de carrito.

5.  **Petición**: "Quita uno, solo quiero 1."
    *   **Acción Esperada**: Actualizar cantidad del item en el carrito.
    *   **Respuesta Esperada**: "Listo, he actualizado la cantidad a 1."
6.  **Petición**: "Proceder al pago."
    *   **Acción Esperada**: Click en botón de checkout.
    *   **Respuesta Esperada**: "Vamos a finalizar tu compra."

---

## Escenario 3: Navegación y Funcionalidad - Rol Administrador

### Pestaña: Login (/login)
**Objetivo**: Verificar login de administrador.

1.  **Petición**: "Inicia sesión como administrador."
    *   **Acción Esperada**:
        *   Detectar intención de rol Admin.
        *   Buscar credenciales guardadas para "Administrador" (arthuro@gmail.com).
        *   Llenar y enviar.
    *   **Respuesta Esperada**: "Entrando como administrador..."

### Pestaña: Panel de Administración (Dashboard)
**Objetivo**: Verificar acciones administrativas.

2.  **Petición**: "Muéstrame los pedidos pendientes."
    *   **Acción Esperada**: Navegar a la lista de pedidos y filtrar por estado "Pendiente".
    *   **Respuesta Esperada**: "Aquí están los pedidos pendientes."
3.  **Petición**: "Cambia el estado del pedido de Juan a 'En camino'."
    *   **Acción Esperada**: Identificar el pedido reciente y actualizar estado (tool `updateOrderStatus`).
    *   **Respuesta Esperada**: "He actualizado el pedido a 'En camino'."

---

## Funcionalidad Requerida (Código a Implementar)

Para soportar este flujo, se implementará:

1.  **Gestor de Credenciales (CredentialManager)**:
    *   Almacenamiento seguro (local o en memoria del servidor MCP) de pares usuario/contraseña asociados a un "alias" (ej: "Administrador", "Juan").
    *   Métodos para guardar (`saveCredentials`) y recuperar (`getCredentials`).

2.  **Mejora en `playwright-server.js`**:
    *   Nuevas tools:
        *   `saveLoginCredentials`: Para guardar datos tras un registro o login exitoso.
        *   `getSavedIdentities`: Para listar identidades disponibles al hacer login.
        *   `autoLogin`: Para ejecutar el llenado y envío con credenciales guardadas.

3.  **Lógica en `geminiService.js`**:
    *   Detectar intención de registro/login para ofrecer guardar datos.
    *   Al detectar intención de login, consultar identidades guardadas y preguntar al usuario.
