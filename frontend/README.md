# PocketPoker Frontend

React Native (Expo) mobile app for testing the PocketPoker backend API.

## Setup

1. Install dependencies:
```bash
cd frontend
npm install
```

2. Configure API URL:
   - Open `src/api/config.js`
   - Update `API_BASE_URL` to point to your backend:
     - For iOS Simulator: `http://localhost:8000/api/v1`
     - For Android Emulator: `http://10.0.2.2:8000/api/v1`
     - For Physical Device: `http://YOUR_LOCAL_IP:8000/api/v1`

3. Start the app:
```bash
npm start
```

4. Run on a platform:
   - Press `i` for iOS Simulator
   - Press `a` for Android Emulator
   - Scan QR code with Expo Go app for physical device

## Project Structure

```
frontend/
├── App.js                 # Main app entry with navigation
├── src/
│   ├── api/              # API service layer
│   │   ├── client.js     # Axios client with auth interceptors
│   │   ├── auth.js       # Auth endpoints
│   │   ├── rooms.js      # Rooms endpoints
│   │   ├── joinRequests.js  # Join requests & waitlist
│   │   ├── users.js      # User endpoints
│   │   └── reputation.js # Reviews & reputation
│   ├── components/       # Reusable UI components
│   │   ├── Button.js
│   │   ├── Input.js
│   │   ├── Card.js
│   │   └── Badge.js
│   ├── context/          # React Context providers
│   │   └── AuthContext.js
│   └── screens/          # App screens
│       ├── LoginScreen.js
│       ├── RegisterScreen.js
│       ├── RoomsScreen.js
│       ├── RoomDetailScreen.js
│       ├── CreateRoomScreen.js
│       ├── ManageRequestsScreen.js
│       ├── WaitlistScreen.js
│       ├── MyRequestsScreen.js
│       ├── ProfileScreen.js
│       └── WriteReviewScreen.js
```

## Features Covered

### Authentication
- [x] Email/Password Register
- [x] Email/Password Login
- [x] Logout
- [ ] Google Sign-in (requires native setup)
- [ ] Apple Sign-in (requires native setup)

### Rooms
- [x] List all rooms
- [x] View room details (public)
- [x] View room details (private - members only)
- [x] Create a room
- [x] Update room status (scheduled → active → finished)
- [ ] Edit room details
- [ ] Delete room

### Join Requests
- [x] Send join request
- [x] View my requests
- [x] Cancel pending request
- [x] Approve/reject requests (host)

### Waitlist
- [x] View room waitlist (host)
- [x] Promote from waitlist (host)
- [x] Remove from waitlist (host)
- [x] Check my waitlist position

### Reputation & Reviews
- [x] View user reputation
- [x] View rating breakdown
- [x] Write review for room participants
- [x] View recent reviews

## API Endpoints Tested

| Endpoint | Method | Screen |
|----------|--------|--------|
| `/auth/register` | POST | RegisterScreen |
| `/auth/login` | POST | LoginScreen |
| `/auth/logout` | POST | ProfileScreen |
| `/rooms/` | GET | RoomsScreen |
| `/rooms/` | POST | CreateRoomScreen |
| `/rooms/{id}` | GET | RoomDetailScreen |
| `/rooms/{id}/private` | GET | RoomDetailScreen |
| `/rooms/{id}/status` | PATCH | RoomDetailScreen |
| `/join-requests/` | GET | MyRequestsScreen |
| `/join-requests/` | POST | RoomDetailScreen |
| `/join-requests/{id}` | PUT | ManageRequestsScreen |
| `/join-requests/{id}` | DELETE | MyRequestsScreen |
| `/join-requests/rooms/{id}/waitlist` | GET | WaitlistScreen |
| `/join-requests/rooms/{id}/waitlist/{id}/promote` | POST | WaitlistScreen |
| `/join-requests/rooms/{id}/waitlist/{id}` | DELETE | WaitlistScreen |
| `/join-requests/rooms/{id}/waitlist/position` | GET | RoomDetailScreen |
| `/users/me` | GET | ProfileScreen |
| `/users/{id}/reputation` | GET | ProfileScreen |
| `/rooms/{id}/reviews` | POST | WriteReviewScreen |

## Notes

- This is a **thin frontend** for API testing purposes
- OAuth sign-in (Google/Apple) requires additional native configuration
- The Picker component requires installing `@react-native-picker/picker`:
  ```bash
  npx expo install @react-native-picker/picker
  ```
- For production, add proper error handling, loading states, and form validation
