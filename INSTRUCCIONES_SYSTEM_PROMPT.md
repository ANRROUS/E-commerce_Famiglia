# Instrucciones para actualizar el System Prompt

## Ubicación
Archivo: `Backend/services/voiceGeminiService.js`
Línea aproximada: 498 (después de la regla 9)

## Agregar la siguiente sección ANTES de "CONTEXTO ACTUAL:"

```javascript
🔍 FILTRADO POR CATEGORÍA (Flujo estándar):
Cuando el usuario pida ver productos de UNA categoría específica (ej: "muéstrame las tortas", "qué bebidas hay"):

**SIEMPRE sigue este orden:**
1. PRIMERO: Usa 'clearFilters' para limpiar cualquier filtro activo
2. SEGUNDO: Usa 'filterByCategory' con la categoría solicitada
3. TERCERO: El sistema automáticamente generará feedback con los productos encontrados

Ejemplo:
Usuario: "Muéstrame las tortas"
TOOL: clearFilters
TOOL: filterByCategory | category: Tortas
FEEDBACK: (se generará automáticamente con los productos de tortas)

📋 CONSULTAS DE MÚLTIPLES CATEGORÍAS:
Si el usuario pide ver productos de MÚLTIPLES categorías (ej: "muéstrame panes y tortas", "quiero ver bebidas y postres"):

**IMPORTANTE: Solo procesa UNA categoría a la vez y pide confirmación antes de continuar con la siguiente.**

Flujo para la PRIMERA categoría:
1. Usa 'clearFilters' para limpiar filtros activos
2. Usa 'filterByCategory' con la primera categoría solicitada
3. En el FEEDBACK, menciona los productos encontrados de esa categoría
4. Al final del FEEDBACK, pregunta: "¿Te gustaría que ahora te muestre los [segunda categoría]?"
5. NO ejecutes más herramientas en este turno

Flujo para categorías SUBSIGUIENTES (solo si el usuario confirma):
1. Si el usuario responde afirmativamente (sí, claro, dale, ok, etc.):
   - Usa 'clearFilters' primero
   - Usa 'filterByCategory' con la siguiente categoría
   - Menciona los productos de esa nueva categoría
   - Si hay más categorías pendientes, pregunta nuevamente por la siguiente
2. Si el usuario responde negativamente o cambia de tema:
   - No continúes con las otras categorías
   - Responde a lo que el usuario pidió

Ejemplo de flujo correcto:
Usuario: "Muéstrame panes y tortas"
Turno 1:
  TOOL: clearFilters
  TOOL: filterByCategory | category: Panes
  FEEDBACK: "Tenemos los siguientes panes: Baguette (S/4.00), Pan integral (S/3.50)... ¿Te gustaría que ahora te muestre las tortas?"

Usuario: "Sí, por favor"
Turno 2:
  TOOL: clearFilters
  TOOL: filterByCategory | category: Tortas
  FEEDBACK: "Perfecto. Aquí están nuestras tortas: Torta de chocolate (S/45.00), Cheesecake (S/38.00)..."

```

## Resumen de cambios

Esto asegura que:
1. **Siempre se limpien los filtros** antes de filtrar por una categoría
2. **Se procese una categoría a la vez** cuando se solicitan múltiples
3. **Se pida confirmación** antes de continuar con la siguiente categoría
4. **El flujo sea controlado** y no abrume al usuario

Las categorías válidas son:
- Bebidas
- Panes  
- Postres
- Salados
- Sanguches
- Tortas
