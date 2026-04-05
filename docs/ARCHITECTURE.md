medical-app/
├── frontend/
│   ├── app/
│   ├── components/
│   ├── features/
│   ├── services/
│   ├── types/
├── backend/
│   ├── src/
│   ├── routes/
│   ├── controllers/
│   ├── services/
├── docs/
│   ├── md files for agents to look at while coding.



# ARCHITECTURE

## CURRENT PHASE: MVP

Frontend:
- React Native (Expo)
- Expo Router
- Lives in frontend/

Backend:
- Firebase (Firestore + Storage)
- Future API server in backend/

---

## STRUCTURE

System
  → Condition
    → Case
      → Sections
      → Resources
      → Quiz

---

## LAYERS

### 1. UI (frontend/app/)
Handles:
- screens
- navigation

### 2. Components (frontend/components/)
Reusable UI:
- cards
- lists
- quiz UI

### 3. Features (frontend/features/)
Business logic:
- cases
- quiz handling

### 4. Services (frontend/services/)
External calls:
- Firebase
- API

### 5. Types (frontend/types/)
Type definitions:
- Case
- System
- Quiz

### 6. Backend (backend/)
Server-side:
- src/ — entry point
- routes/ — API routes
- controllers/ — request handlers
- services/ — business logic / external calls

---

## RULES

- UI must NOT contain business logic
- Services must NOT contain UI
- Features connect UI + services
