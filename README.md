# 📦 Stocklat — Sistema de Gestión de Inventario

## 🛠️ Stack

| Capa       | Tecnología                       |
| ---------- | -------------------------------- |
| Frontend   | React 18 + Vite + Tailwind CSS   |
| Gráficas   | Recharts                         |
| Routing    | React Router DOM v6              |
| Estado     | Zustand (auth persistente)       |
| HTTP       | Axios (con interceptor JWT)      |
| Backend    | Node.js + Express                |
| ORM        | Prisma                           |
| Base Datos | PostgreSQL (Supabase)            |
| Auth       | JWT + bcrypt                     |

## 📁 Estructura

```
stocklat/
├── frontend/
│   ├── src/
│   │   ├── pages/
│   │   ├── components/
│   │   │   ├── layout/   ← Sidebar, Navbar, AppLayout
│   │   │   ├── common/   ← ModalFacturacion
│   │   │   └── ui/       ← Button
│   │   ├── store/        ← authStore (Zustand)
│   │   ├── services/     ← api.js (Axios)
│   │   └── index.css
│   └── package.json
│
└── backend/
    ├── src/
    │   ├── routes/
    │   ├── middleware/
    │   └── services/
    ├── prisma/
    │   └── schema.prisma
    └── package.json
```

## 🚀 Instalación

### Backend
```bash
cd backend
cp .env.example .env   # edita con tus credenciales
npm install
npx prisma migrate dev --name init
npm run dev            # http://localhost:4000
```

### Frontend
```bash
cd frontend
cp .env.example .env
npm install
npm run dev            # http://localhost:3000
```

## 👤 Usuarios de prueba

| Rol           | Email    | Contraseña  |
| ------------- | -------- | ----------- |
| Administrador | admin    | admin123    |
| Vendedor      | vendedor | vendedor123 |
