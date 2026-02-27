# Global Workspace Rules: Sustainable Fashion E-commerce

## Core Identity
We are building a blazingly fast, highly fluid e-commerce web application with full Shopify parity for a sustainable fashion brand. The brand operates heavily on a "limited drop" model.

## Tech Stack
- Frontend: Next.js (App Router), React, TypeScript, Tailwind CSS, Shadcn UI, Framer Motion.
- Backend/Database: Supabase (PostgreSQL, Auth, Storage, Edge Functions).
- Payments: Razorpay.
- State Management: Zustand.

## Architectural Directives
1. Inventory Concurrency: This is the most critical backend feature. The database MUST use robust transaction isolation (row-level locking) to prevent overselling during high-traffic limited drops.
2. Fluid UI: The frontend must feel premium. Use optimistic UI updates for cart actions, skeleton loaders for data fetching, and Framer Motion for seamless micro-interactions.
3. Modularity: Code must be strictly modular. Frontend components must not contain direct database schema definitions. 
4. Security: All database tables must have strict Row Level Security (RLS) policies. Differentiate clearly between `admin`, `authenticated customer`, and `anon` user roles.

## AI Workflow
Do not generate monolithic full-stack code in a single response. Respect the agent personas defined in the workspace. Wait for explicit sprint instructions to guide execution.