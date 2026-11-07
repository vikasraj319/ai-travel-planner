# 🌍 Horizons — AI Travel Planner

An AI-powered travel planning platform that helps users discover destinations, generate personalized travel itineraries, explore places through interactive maps, and organize their trips in one place.

Horizons combines generative AI with location-based information and personalized trip management to simplify the travel planning experience.

---

## ✨ Features

### 🤖 AI-Powered Travel Planning

- Generate personalized travel itineraries using Google Gemini AI.
- Plan trips based on destination, budget, duration, and preferences.
- AI-powered conversational assistance for travel-related queries.
- Organized day-wise travel recommendations.

### 🗺️ Interactive Maps & Exploration

- Interactive destination maps.
- Visualize itinerary locations and points of interest.
- Explore attractions and nearby destinations.
- Display routes between selected travel locations.
- Ongoing improvements to location accuracy and route planning.

### 👤 User & Trip Management

- User authentication with Supabase.
- Personalized user profiles.
- Save and retrieve planned trips.
- Manage previously generated travel plans.

### 🎨 User Experience

- Responsive React-based interface.
- Light and dark theme support.
- Animated UI interactions.
- Destination imagery and visual exploration.
- Modern navigation and travel-focused dashboard.

---

## 🛠️ Tech Stack

### Frontend

- **React** – Component-based UI development.
- **JavaScript (JSX)** – Application logic.
- **Vite** – Development server and build tooling.
- **React Router** – Client-side navigation.
- **CSS** – Responsive layouts, styling, and theming.
- **Framer Motion** – UI animations.
- **Lucide React** – Icons.

### Backend

- **Node.js** – JavaScript runtime.
- **Express.js** – REST API development.
- **Google Gemini AI** – AI-powered itinerary generation and conversational assistance.
- **Helmet** – HTTP security headers.
- **CORS** – Cross-origin request management.
- **Express Rate Limit** – API request limiting.

### Database & Authentication

- **Supabase** – Backend services and authentication.
- **PostgreSQL** – Relational database.
- **Supabase Auth** – User authentication and session management.

### External Services

- **Pexels API** – Destination and travel imagery.
- **Mapping and location services** – Interactive maps and geographical information.

### Development & Deployment

- Git and GitHub
- VS Code
- ESLint
- Vercel – Frontend deployment
- Render – Backend deployment

---

## 🏗️ Project Architecture

Horizons follows a frontend-backend architecture with separate applications in a single monorepository.

```text
AI-TRAVEL-PLANNER/
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── hooks/
│   │   ├── services/
│   │   ├── utils/
│   │   └── ...
│   ├── public/
│   └── package.json
│
├── backend/
│   ├── routes/
│   ├── middleware/
│   ├── services/
│   ├── config/
│   ├── utils/
│   └── ...
│
├── package.json
└── README.md
```

_The directory structure above represents the logical application organization; individual filenames may vary._

---

## 🚀 Getting Started

### Prerequisites

Make sure the following are installed:

- Node.js
- npm
- Git
- Supabase account
- Google Gemini API key
- Pexels API key

### 1. Clone the Repository

```bash
git clone <YOUR_REPOSITORY_URL>
cd ai-travel-planner
```

### 2. Install Dependencies

Install dependencies for both frontend and backend:

```bash
npm run install:all
```

### 3. Configure Environment Variables

Create environment files using the provided examples.

**Frontend:**

```bash
cp frontend/.env.example frontend/.env
```

Configure your Supabase credentials.

**Backend:**

```bash
cp backend/.env.example backend/.env
```

Configure the required credentials:

- Supabase URL and keys.
- Google Gemini API key.
- Pexels API key.
- Frontend origin / CORS configuration.
- Other application-specific environment variables.

Never commit `.env` files or expose API keys in the frontend.

### 4. Start the Development Servers

Run the backend in one terminal:

```bash
npm run dev:backend
```

Run the frontend in another terminal:

```bash
npm run dev:frontend
```

### 5. Build for Production

```bash
npm run build:frontend
```

---

## 🧠 How It Works

1. **Trip Configuration:** The user enters a destination, budget, duration, and travel preferences.
2. **AI Processing:** The backend communicates with Google Gemini to generate a personalized travel plan.
3. **Itinerary Generation:** The generated recommendations are organized into a day-wise itinerary.
4. **Location Exploration:** Interactive maps help users visualize destinations, attractions, and travel locations.
5. **Trip Management:** Authenticated users can manage their profiles and save their travel plans.
6. **AI Assistance:** Users can interact with the travel assistant for additional travel-related guidance.

---

## 🚧 Current Development Status

Horizons is actively under development. The current focus is improving the reliability, accuracy, and overall experience of the existing platform.

| Area                          | Status                   |
| ----------------------------- | ------------------------ |
| React frontend and navigation | Implemented / Refinement |
| Express REST API              | Implemented              |
| Gemini AI integration         | Implemented              |
| AI itinerary generation       | Implemented              |
| Supabase authentication       | Implemented              |
| PostgreSQL integration        | Implemented              |
| User profiles                 | Implemented              |
| Trip persistence              | Under refinement         |
| Interactive maps              | Implemented / Refinement |
| Route and location accuracy   | In progress              |
| Nearby places and restaurants | Under development        |
| Responsive UI and themes      | Implemented / Refinement |
| Production deployment         | Configured               |

---

## 🛣️ Roadmap

Planned improvements include:

- [ ] Improve map accuracy and route calculations.
- [ ] Strengthen trip-saving and retrieval reliability.
- [ ] Improve nearby attractions and restaurant discovery.
- [ ] Integrate more reliable real-time location information.
- [ ] Introduce advanced budget estimation and optimization.
- [ ] Add weather-aware itinerary recommendations.
- [ ] Add flight and accommodation integrations.
- [ ] Introduce multilingual travel assistance.
- [ ] Develop collaborative trip planning.
- [ ] Explore a dedicated mobile application.

---

## 🔒 Security

Security is an important part of the application architecture.

- Environment-based secret management.
- Supabase authentication.
- Protected backend API endpoints.
- CORS configuration.
- HTTP security headers using Helmet.
- API rate limiting.
- Server-side handling of sensitive API credentials.

---

## 🐛 Issues & Contributions

If you encounter a bug, have a suggestion, or want to request a feature:

1. Open an issue in the GitHub repository.
2. Describe the problem or proposed improvement.
3. Include relevant screenshots or reproduction steps when possible.

Contributions and suggestions are welcome.

---

## 👨‍💻 Developer

**Vikas Raj**

B.Tech in Computer Science and Engineering.

Interested in backend engineering, full-stack development, AI applications, and building practical software solutions.

---

## ⭐ Support

If you find Horizons interesting or useful, consider giving the repository a ⭐ on GitHub.

**Built with curiosity, AI, and a passion for exploring the world.** 🌍
