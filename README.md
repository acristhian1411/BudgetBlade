# Native Budget Blade 💰

Una aplicación móvil de gestión financiera personal segura, robusta y fácil de usar. Diseñada para ayudarte a controlar tus ingresos, egresos, transferencias y compromisos financieros con máxima privacidad y seguridad.

Construida con [Expo](https://expo.dev) y disponible en iOS, Android.

## ✨ Características Principales

### 📊 Gestión de Transacciones

- **Registro completo**: Ingresos, egresos y transferencias entre cuentas
- **Categorización automática**: Más de 16 categorías predefinidas (Alimentación, Salud, Combustible, Servicios, Educación, etc.)
- **Múltiples cuentas**: Gestiona varias tills/cuentas simultáneamente
- **Historial detallado**: Búsqueda y filtrado completo de transacciones
- **Descripción de operaciones**: Añade notas a cada transacción

### 📅 Compromisos y Recordatorios

- **Planes programados**: Crea planes de pagos recurrentes (servicios, suscripciones, préstamos)
- **Instalaciones**: Divide pagos en múltiples cuotas con fechas específicas
- **Pagos parciales**: Registra abonos parciales de compromisos y conserva el saldo pendiente actualizado
- **Recordatorios inteligentes**: Notificaciones automáticas para compromisos vencidos
- **Entidades asociadas**: Vincula proveedores y clientes a tus transacciones
- **Estados de cumplimiento**: Seguimiento de pagos pendientes, procesados y atrasados
- **Procesamiento automático**: Convierte fácilmente compromisos en transacciones

### 🏦 Gestión de Cuentas

- **Múltiples tills**: Gestiona tarjetas de crédito, cuentas bancarias, billeteras, efectivo
- **Tarjetas de crédito asociadas**: Vincula tarjetas de crédito a cuentas específicas para un mejor control del flujo real
- **Números de cuenta**: Almacena información de cuenta para referencia
- **Balances individuales**: Visualiza el estado de cada cuenta

### 🔐 Seguridad Avanzada

- **Autenticación protegida**:
  - Contraseña con hash PBKDF2-SHA256 (210,000 iteraciones en producción)
  - Salt único por usuario (16 bytes aleatorios)
  - Prevención de ataques de fuerza bruta

- **Cifrado de datos en reposo**:
  - Clave maestra de 256 bits (Master Encryption Key - MEK)
  - Almacenada de forma segura en Secure Store
  - Envuelta con contraseña usando AES-256-GCM
  - Nonce único de 96 bits por operación

- **Protección contra ataques**:
  - Limitación de intentos fallidos de login
  - Bloqueo temporal de cuenta después de múltiples fallos
  - Datos de usuario nunca almacenados en texto plano

### 💾 Import/Export con Cifrado

- **Exportación cifrada (.nbb)**: Formato propietario con AES-256-GCM
- **Exportación JSON legacy**: Para compatibilidad y análisis
- **Exportación CSV multi-tabla**: Para integración con hojas de cálculo
- **Importación inteligente**:
  - Soporte para formatos .nbb, JSON y CSV
  - Validación con Zod antes de restaurar datos
  - Restauración atómica con transacciones SQL
  - Preservación de integridad referencial

### 🎨 Experiencia de Usuario

- **Tema adaptativo**: Soporte automático para modo claro/oscuro
- **Interfaz intuitiva**: Diseño limpio con Tailwind CSS y NativeWind
- **Privacidad visual en dashboard**: Oculta o muestra montos del panel principal con un botón rápido
- **Navegación por tabs**: Acceso rápido a todas las funciones (Inicio, Compromisos, Cuentas, Historial, Ajustes)
- **Feedback háptico**: Vibraciones al interactuar con elementos

### 🌍 Multiplataforma

- **iOS**: Compilación nativa con Expo
- **Android**: Compilación nativa con Expo
- **Cross-platform**: Código compartido en JavaScript/TypeScript

## 🗄️ Estructura de Datos

### Tablas Principales

- **users**: Gestión de usuario con autenticación segura
- **tills**: Cuentas/billeteras del usuario
- **credit_cards**: Tarjetas de crédito asociadas a cuentas/tills
- **transactions**: Registro de todas las operaciones
- **categories**: Categorización de ingresos y egresos
- **entities**: Clientes y proveedores
- **scheduled_plans**: Planes de pagos recurrentes
- **scheduled_occurrences**: Instalaciones individuales de un plan con seguimiento

## 🚀 Cómo Empezar

### Instalación

1. Clona el repositorio e instala dependencias:

   ```bash
   npm install
   ```

2. Inicia la aplicación:

   ```bash
   npx expo start
   ```

3. Elige cómo ejecutar:
   - **[development build](https://docs.expo.dev/develop/development-builds/introduction/)**: Compilación personalizada
   - **[Android emulator](https://docs.expo.dev/workflow/android-studio-emulator/)**: Emulador Android
   - **[iOS simulator](https://docs.expo.dev/workflow/ios-simulator/)**: Simulador iOS
   - **[Expo Go](https://expo.dev/go)**: Aplicación sandbox (limitaciones)
   - **Web**: Soporte para navegadores modernos

### Desarrollo

- Edita archivos en el directorio **app/** (usa [file-based routing](https://docs.expo.dev/router/introduction))
- Los cambios se reflejan automáticamente en tiempo real
- Usa TypeScript para type-safety en todo el proyecto

### Resetear Proyecto

```bash
npm run reset-project
```

Este comando mueve el código de ejemplo a **app-example/** y crea un directorio **app/** limpio.

## 📦 Stack Tecnológico

### Frontend

- **Expo 54**: Framework React Native universal
- **Expo Router 6**: Navegación basada en archivos
- **React 19**: Última versión de React
- **React Native**: Componentes nativos multiplataforma
- **Tailwind CSS + NativeWind**: Styling utility-first
- **TypeScript**: Type-safety en todo el código

### Base de Datos

- **SQLite (expo-sqlite)**: Almacenamiento local seguro y rápido
- **Migraciones automáticas**: Schema versionado (v0, v1, v2)

### Seguridad

- **@noble/ciphers**: Cifrado AES-256-GCM
- **@noble/hashes**: PBKDF2-SHA256 y SHA256
- **expo-secure-store**: Almacenamiento seguro de claves
- **expo-crypto**: Generación de números aleatorios criptográficos

### Funcionalidades Adicionales

- **expo-notifications**: Recordatorios de compromisos
- **expo-haptics**: Feedback háptico (vibraciones)
- **expo-file-system**: Acceso al sistema de archivos
- **expo-sharing**: Compartir datos y archivos
- **@react-native-community/datetimepicker**: Selector de fecha/hora
- **react-native-gesture-handler**: Gestos avanzados
- **zod**: Validación de esquemas

## 🔧 Scripts Disponibles

```bash
npm run start          # Inicia el servidor Expo
npm run android        # Compila para Android
npm run ios            # Compila para iOS
npm run web            # Inicia en navegador
npm run lint           # Verifica código con ESLint
npm run reset-project  # Resetea a estado inicial
```

## 📚 Documentación y Recursos

- [Documentación de Expo](https://docs.expo.dev/): Guías y tutoriales
- [Expo Router](https://docs.expo.dev/router/introduction): Sistema de navegación
- [React Native](https://reactnative.dev): Documentación de componentes
- [Tailwind CSS](https://tailwindcss.com): Utility-first CSS
- [SQLite](https://www.sqlite.org): Base de datos local

## 🛡️ Notas de Seguridad

### En Desarrollo

- PBKDF2 usa 5,000 iteraciones (desarrollo rápido)
- Logs pueden mostrar información sensible

### En Producción

- PBKDF2 usa 210,000 iteraciones (1-2 segundos de latencia aceptable)
- Todos los datos en reposo están cifrados
- Las claves nunca se almacenan en texto plano
- Backup/export cifrado de extremo a extremo

## 🤝 Comunidad

- [Expo en GitHub](https://github.com/expo/expo): Plataforma open source
- [Comunidad Discord de Expo](https://chat.expo.dev): Chat con desarrolladores
- [React Native](https://reactnative.dev/help): Comunidad global
