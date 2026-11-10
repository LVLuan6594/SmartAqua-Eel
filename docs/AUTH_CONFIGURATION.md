# SmartAqua authentication configuration

## Demo mode

`npm run dev` uses the mock authentication adapter by default. To explicitly enable it in a deployment intended only for demonstrations, set `VITE_AUTH_MODE=mock` before building.

| Role | Username | Demo password |
|---|---|---|
| Admin | `admin` | `AquaAdmin#2026` |
| Nông dân | `farmer` | `AquaFarmer#2026` |
| CEO hợp tác xã | `cooperative` | `AquaCoop#2026` |
| Lãnh đạo địa phương | `leader` | `AquaLeader#2026` |

Demo users and accounts created in the admin screen are stored in browser `localStorage`; the session marker is stored in `sessionStorage`. This is presentation-only authentication and is not suitable for real user data. Reset the browser's SmartAqua demo storage to restore the four built-in accounts.

## Production adapter contract

Set `VITE_AUTH_MODE=api` and configure `VITE_API_BASE_URL`. The frontend calls:

- `POST /auth/login` with `{ username, password }`; return `{ user }` and set an `HttpOnly`, `Secure`, `SameSite` session cookie.
- `GET /auth/session`; return `{ user }` for a valid session, otherwise a 401 response.
- `POST /auth/logout`; clear the session cookie.

The `user` object should include `id`, `username`, `name`, `role` (`admin`, `farmer`, `coop`, or `manager`) and the authorized scope fields (`farmerId`, `coopId`, `unitIds`, `pondIds`). The backend must enforce permissions and data scopes on every API request. The client route guards and selectors improve the UI experience; they are not a security boundary. Password hashing, login throttling, audit records and account administration endpoints must be implemented by the backend before Production authentication is considered complete.

If `VITE_AUTH_MODE` is unset, authentication follows data mode: `api` for `VITE_DATA_MODE=api`, otherwise `mock`, including demo production builds. Set `VITE_AUTH_MODE=api` explicitly for a real backend. Demo credentials are hidden in API authentication mode. Eel demo accounts/session use separate storage keys from the previous dataset.
