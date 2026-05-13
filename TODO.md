# TODO

- [ ] Implement multi-plan app subscription UI (1/3/6/12 months) in `Frontend/src/pages/SettingsPage.jsx` with hardcoded prices.
- [ ] Extend backend subscription endpoints to accept a selected plan duration and compute `amount` + `renewsAt` accordingly in `Backend/controllers/settingsController.js`.
- [ ] Update backend `createSubscriptionOrder` and `verifySubscriptionPayment` to use the selected plan passed from frontend.
- [ ] Ensure backend stores plan duration/label in payment record if needed (or derive from saved notes).

- [ ] Ensure frontend calls `/settings/subscription/order` with selected plan and displays it in UI responses.
- [ ] Run quick build/test commands (frontend) to ensure no syntax/runtime issues.

