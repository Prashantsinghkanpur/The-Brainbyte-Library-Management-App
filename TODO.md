- [ ] Update FREE/PRO subscription defaults: user starts FREE, subscriptionStatus starts EXPIRED
- [ ] Enforce max 5 students on FREE plan (block POST /students when count >= 5)
- [ ] Display subscription plan (₹299/month) on UI
- [ ] Update Students UI to block/encourage upgrade when backend returns 402
- [ ] Ensure “Pay & Renew” button matches ₹299/month in backend via APP_SUBSCRIPTION_AMOUNT=299
- [ ] Manual testing: register owner, add students up to 5, verify 6th is blocked, then subscribe and verify unlimited

