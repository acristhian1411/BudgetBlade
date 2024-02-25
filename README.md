# BudgetBlade

SpendSage es una aplicación web diseñada para ayudarte a gestionar tus gastos e ingresos personales de manera eficiente. Con esta aplicación, podrás llevar un registro detallado de tus transacciones financieras y obtener insights valiosos sobre tus hábitos de gasto.

## Características principales

- **Registro de transacciones:** Registra tus gastos e ingresos de forma fácil y rápida.
- **Categorización:** Categoriza tus transacciones para un mejor seguimiento y análisis.
- **Informes y gráficos:** Visualiza tus datos financieros en informes y gráficos interactivos.

## Tecnologías utilizadas

- **Backend:** Node.js, Express.js, Prisma (ORM para PostgreSQL)
- **Frontend:** Svelte
- **Base de datos:** PostgreSQL
- **Documentación de API:** Swagger

## Instalación y configuración

1. Clona el repositorio: `https://github.com/acristhian1411/spendsage.git`
2. Accede al directorio del proyecto: `cd spendsage`
3. Instala las dependencias: `npm install`
4. Copia el archivo de configuración: `cp .env.example .env`
5. Configura la base de datos en el archivo `.env`
6. Ejecuta las migraciones: `npx sequelize-cli db:migrate`
7. Lanza la aplicación: `npm start` o `npm run dev`
8. Ve a la documentación de la api en: [http://localhost:3000/docs]

## Imagenes relacionadas

<!-- ![Documentación](public/img/swagger.png) -->
