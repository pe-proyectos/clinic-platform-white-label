# Setup Frontend con Mercado Pago

## 1. Actualizar config.js

Editar `config.js` y reemplazar:

```javascript
// Mercado Pago
mpPublicKey: 'TU_PUBLIC_KEY_AQUI', // Copiar de Mercado Pago

// Backend API
apiUrl: 'http://localhost:3000', // URL del backend
```

## 2. Verificar estructura de archivos

Asegurarse de que existen estos archivos en orden:

```html
<!-- En index.html, al final del body: -->
<script src="https://sdk.mercadopago.com/js/v2"></script>
<script src="config.js"></script>
<script src="transformation.js"></script>
<script src="form.js"></script>
<script src="mapa.js"></script>
<script src="booking.js"></script>
```

## 3. Correr frontend

### Opción A - Live Server (VS Code):
1. Instalar extensión "Live Server"
2. Click derecho en `index.html` → "Open with Live Server"

### Opción B - Python simple server:
```bash
cd C:\Users\Fabricio\Desktop\Repos\clinic-platform-white-label
python -m http.server 5500
```

### Opción C - Node serve:
```bash
npm install -g serve
serve -p 5500
```

Frontend estará en: http://localhost:5500

## 4. Flujo completo de prueba

### Paso 1 - Abrir página:
- Ir a http://localhost:5500
- Click en "Agendar Cita"

### Paso 2 - Seleccionar fecha y hora:
- Elegir fecha en calendario
- Elegir hora disponible
- Click "Siguiente"

### Paso 3 - Llenar datos:
- Nombre: Juan Pérez
- DNI: 12345678
- Teléfono: 987654321
- Procedimiento: Electrocardiograma
- Click "Programar Evento"

### Paso 4 - Pagar (PRUEBA):
- Aparecerá checkout de Mercado Pago
- Usar **tarjetas de prueba** de Mercado Pago:

**Tarjeta aprobada:**
```
Número: 5031 7557 3453 0604
Vencimiento: 11/25
CVV: 123
Nombre: APRO
```

**Otras tarjetas de prueba:** https://www.mercadopago.com.pe/developers/es/docs/checkout-pro/additional-content/test-cards

### Paso 5 - Confirmación:
- Cuando pago se aprueba → avanza automático a STEP 4
- Click "Notificar al Doctor" → abre WhatsApp
- Enviar mensaje al doctor

## 5. Verificar integración

### Backend debe estar corriendo:
```bash
# En otra terminal
cd C:\Users\Fabricio\Desktop\Repos\citas-app-backend
bun run dev
```

### ngrok debe estar corriendo:
```bash
# En otra terminal
ngrok http 3000
```

### Verificar logs:
- **Backend:** Ver logs en consola de `bun run dev`
- **Frontend:** Abrir DevTools (F12) → Console
- **Webhook:** Ver requests en dashboard de ngrok (http://localhost:4040)

## 6. Mejoras de responsive

El calendario ahora tiene:
- Botones adaptativos: `min-w-[32px] max-w-[44px]`
- Text sizes responsivos: `text-xs md:text-sm`
- Padding adaptativo: `py-2.5 md:py-3`
- Grid flexible en mobile/desktop

## 7. Troubleshooting

### Error: "Error al cargar información del doctor"
- Verificar que backend esté corriendo
- Verificar URL en `config.js`
- Verificar que existe doctor con slug "dr-cristian-chaponan"

### Error: "Error creating appointment"
- Revisar logs del backend
- Verificar que horario esté disponible
- Verificar campos requeridos del formulario

### Pago no se procesa:
- Verificar Public Key en `config.js`
- Verificar que webhook URL en backend esté correcta
- Ver logs en dashboard de Mercado Pago

### Checkout no aparece:
- Abrir DevTools → Console
- Ver si hay errores de MercadoPago SDK
- Verificar que preferenceId se creó correctamente

## 8. Pasar a producción

### Backend:
1. Deploy backend en Railway/Render/Fly.io
2. Actualizar `config.js` con URL de producción
3. Configurar webhook URL de producción en Mercado Pago

### Frontend:
1. Deploy en Netlify/Vercel/GitHub Pages
2. Actualizar CORS en backend para permitir dominio de producción

### Mercado Pago:
1. Cambiar de credenciales de prueba a producción
2. Actualizar Access Token y Public Key
3. Configurar webhook URL de producción
