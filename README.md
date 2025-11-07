# Setsvm - Interactive Learning Platform

> Created by [Siham Nafie](https://github.com/SihamNafie24)

![Setsvm Logo](public/logo.svg)

> An interactive learning platform built with modern web technologies to provide an engaging educational experience.

## 🚀 Features

- **Interactive Learning**: Engaging courses with progress tracking
- **User Authentication**: Secure signup and login with email/password
- **Personalized Dashboard**: Track your learning progress and achievements
- **Responsive Design**: Works seamlessly on desktop and mobile devices
- **Modern Tech Stack**: Built with the latest web technologies

## 🛠 Technologies

### Frontend
- **Framework**: [React](https://reactjs.org/) + [TypeScript](https://www.typescriptlang.org/)
- **UI**: [TailwindCSS](https://tailwindcss.com/)
- **State Management**: [TanStack Query](https://tanstack.com/query/latest/)
- **Forms**: [React Hook Form](https://react-hook-form.com/)
- **Icons**: [Lucide Icons](https://lucide.dev/)
- **Routing**: [TanStack Router](https://tanstack.com/router/latest/)

### Backend
- **Framework**: [NestJS](https://nestjs.com/)
- **Database**: [PostgreSQL](https://www.postgresql.org/)
- **ORM**: [TypeORM](https://typeorm.io/)
- **Authentication**: JWT (JSON Web Tokens)
- **API**: RESTful API with TypeScript

## 🚀 Getting Started

### Prerequisites

- Node.js (v18 or later)
- npm (v9 or later) or yarn

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/setsvm.git
   cd setsvm
   ```

2. **Install frontend dependencies**
   ```bash
   npm install
   ```

3. **Set up backend**
   ```bash
   cd backend
   npm install
   ```

4. **Set up database**
   - Install [PostgreSQL](https://www.postgresql.org/download/)
   - Create a new database for the project
   - Update the database configuration in `backend/.env`

5. **Set up environment variables**
   - Copy `.env.example` to `.env` in both root and backend directories
   - Update the environment variables with your configuration

6. **Start the development servers**
   ```bash
   # In the root directory
   npm run dev
   
   # In a new terminal, navigate to backend directory and run
   npm run start:dev
   ```

7. **Open your browser**
   - Frontend: http://localhost:3000
   - API Documentation: http://localhost:3001/api (when running in development mode)

## 📦 Project Structure

```
setsvm/
├── src/                    # Frontend source code
│   ├── components/         # Reusable UI components
│   ├── pages/              # Page components
│   ├── lib/                # Utility functions and configurations
│   ├── styles/             # Global styles
│   └── types/              # TypeScript type definitions
│
├── backend/                # Backend source code
│   ├── src/
│   │   ├── auth/          # Authentication module
│   │   ├── content/       # Content management
│   │   ├── user/          # User management
│   │   └── app.module.ts  # Main application module
│   └── test/              # Backend tests
│
├── public/                 # Static files
└── routes/                # Frontend routes
│   │   └── core/           # Core functionality
│   └── static/             # Static files for backend
│
├── .gitignore             # Git ignore file
├── README.md              # Project documentation
└── package.json           # Frontend dependencies and scripts
```

## 🤝 Contributing

Contributions are welcome! Please read our [Contributing Guidelines](CONTRIBUTING.md) to get started.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [TanStack](https://tanstack.com/) for amazing React tools
- [TailwindCSS](https://tailwindcss.com/) for utility-first CSS
- All contributors who have helped shape this project

---

<p align="center">
  Made with ❤️ by <a href="https://github.com/SihamNafie24" target="_blank">Siham Nafie</a>
</p>
