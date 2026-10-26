# FurniHaven – Furniture E-Commerce Website

Full-stack furniture store with **User panel + Admin panel + Order map**.

Built with **HTML, CSS, JavaScript** (frontend) and **Node.js + SQLite** (backend).  
No npm packages required for the main server.

---

## Features

- Multi-page furniture store (Home, Shop, Categories, Cart, Contact, FAQ)
- User **Register / Login / Profile**
- **Admin panel** – Dashboard, Orders, Users
- Orders shown on **map** (Leaflet + OpenStreetMap)
- SQLite database (auto-created, no separate DB install)
- Cart with LocalStorage + order checkout

---

## Requirements

- [Node.js](https://nodejs.org/) **v18 or higher** (LTS recommended)
- Git (optional, for cloning)

Check Node version:

```bash
node -v
```

---

## How to Run

### 1. Clone the repository

```bash
git clone https://github.com/YOUR_USERNAME/furniture-fullstack.git
cd furniture-fullstack
```

### 2. Start the server

```bash
node server/pure-server.js
```

### 3. Open in browser

| Page | URL |
|------|-----|
| Website | http://localhost:3000 |
| Login | http://localhost:3000/login.html |
| Admin Panel | http://localhost:3000/admin/ |

**Default Admin Login**

- Email: `admin@furnihaven.in`
- Password: `admin123`

---

## If port 3000 is already in use

**Windows (PowerShell):**

```powershell
$env:PORT=3001; node server/pure-server.js
```

**Mac / Linux:**

```bash
PORT=3001 node server/pure-server.js
```

Then open: http://localhost:3001

---

## Project Structure

```
furniture-fullstack/
├── public/                 # Frontend
│   ├── index.html
│   ├── shop.html
│   ├── cart.html
│   ├── login.html
│   ├── register.html
│   ├── profile.html
│   ├── admin/
│   │   ├── index.html      # Dashboard
│   │   ├── orders.html     # Orders + Map
│   │   └── users.html
│   ├── css/style.css
│   └── js/main.js
├── server/
│   └── pure-server.js      # Backend + API + SQLite
├── database/               # Auto-created (furnihaven.db)
└── README.md
```

---

## API Overview

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/products` | List products |
| POST | `/api/register` | User register |
| POST | `/api/login` | User / Admin login |
| GET | `/api/me` | Current user profile |
| POST | `/api/orders` | Place order |
| GET | `/api/admin/orders` | All orders (admin) |
| GET | `/api/admin/users` | All users (admin) |
| GET | `/api/admin/stats` | Dashboard stats |

---

## Notes

- Database file `database/furnihaven.db` is created automatically on first run.
- Do not commit the `.db` file (already in `.gitignore`).
- Map uses approximate city coordinates for demo purposes.

---

## License

This project is for learning / demo use.
