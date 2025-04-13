# Clicker Game

## Project Overview

This is a web-based clicker game where the objective is to click a button as close as possible to a whole second mark (e.g., XX:XX:XX:000). The player's accuracy, measured in milliseconds difference from the whole second, determines the number of "smiles" 😊 awarded for their best attempt within a game session.

## Features

*   **Real-time Timer:** Displays the current time with millisecond precision.
*   **Click Button:** Allows the user to register their click time. Includes a 2-second cooldown after each click to prevent spamming.
*   **Attempts System:** Each game session consists of a configurable number of attempts (default: 10).
*   **Cooldown Period:** After exhausting all attempts in a session, a configurable cooldown period (default: 60 minutes) must pass before a new session can begin.
*   **Results Table:** Displays the attempts made within the *current* game session, showing the difference (ms), smiles awarded for that specific attempt, and timestamp.
*   **Best Result Highlighting:** After a session ends, the row corresponding to the best attempt (lowest difference) is highlighted.
*   **Session Score:** The final score for a session is the number of smiles corresponding to the single best attempt made during that session (displayed after the session ends).
*   **Game Rules:** A modal window explaining the game objective, rules, and smile calculation.
*   **Authentication:** Users sign up and log in using their phone number (utilizing Supabase Auth with Email/Password provider behind the scenes).
*   **Logout:** Users can log out to return to the login screen.
*   **Dark/Light Theme:** Supports switching between dark and light visual themes for user preference.
*   **Responsive Design:** The user interface adapts gracefully to various screen sizes, ensuring usability on desktops, tablets, and mobile devices.
*   **Comprehensive Logging:** Includes detailed logging mechanisms (e.g., in the browser console) to aid in development, debugging, and monitoring application behavior.
*   **Advanced Client-Side Monitoring:** Integrated with Datadog for real-time performance tracking and error logging.

## Tech Stack

*   **Frontend:**
    *   Vite + React + TypeScript
    *   Tailwind CSS for styling (including theme support and responsiveness)
    *   Zustand for state management (authentication, game settings, theme)
    *   React Toastify for notifications
    *   React Modal for the rules dialog
*   **Backend:**
    *   Supabase
        *   PostgreSQL Database for storing user data, attempts, and game settings.
        *   Supabase Auth for user authentication.
        *   Supabase Database Functions (PL/pgSQL) for core game logic (recording attempts, handling cooldowns, calculating best result smiles).
        *   Row Level Security (RLS) for data protection.
*   **Monitoring:**
    *   Datadog client-side monitoring libraries for:
        *   Real-time frontend performance tracking
        *   Error detection and logging
        *   User interaction and session analytics

## Getting Started

### Prerequisites

*   Node.js (v18 or higher recommended)
*   npm or yarn package manager
*   A Supabase account and project
*   A Datadog account (optional, but recommended for advanced monitoring)

### Installation

1.  **Clone the repository:**
    ```bash
    git clone <repository-url>
    cd clicker-game
    ```
2.  **Install dependencies:**
    ```bash
    npm install
    # or
    yarn install
    ```
3.  **Set up environment variables:**
    *   Create a `.env` file in the root of the project.
    *   Get your Supabase project URL and anon key from your Supabase project settings (Project Settings -> API).
    *   Get your Datadog client token from your Datadog account.
    *   Add the following lines to your `.env` file, replacing the placeholders:
        ```dotenv
        VITE_SUPABASE_URL=your_supabase_project_url
        VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
        VITE_DATADOG_CLIENT_TOKEN=your_datadog_client_token
        ```
4.  **Set up Supabase Backend:**
    *   Follow the instructions in the `supabase_setup.md` file to create the necessary tables, functions, policies, and triggers in your Supabase project.

### Running the Development Server

```bash
npm run dev
# or
yarn dev
```
This will start the Vite development server, typically available at `http://localhost:5173`.

### Building for Production

```bash
npm run build
# or
yarn build
```
This command builds the application for production in the `dist` folder.

## Testing

The project includes a comprehensive testing setup:

*   **Unit & Integration Tests:** Using Vitest and React Testing Library (RTL).
*   **End-to-End (E2E) Tests:** Using Playwright.

The testing strategy is documented in `TESTING_STRATEGY.md` (Russian) and `TESTING_STRATEGY_EN.md` (English).

### Running Tests

*   **Run Unit/Integration Tests (Vitest):**
    ```bash
    npm test
    ```
*   **Run E2E Tests (Playwright):**
    ```bash
    npm run test:e2e
    ```
*   **Run E2E Tests with UI (Playwright):**
    ```bash
    npm run test:e2e:ui
    ```

## Author

Created by Pasha Feldman - Full Stack Developer