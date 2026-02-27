# Sprint 8: Verified Reviews & UGC Algorithm

## Sprint Goal
Build a high-trust User-Generated Content (UGC) system. Allow verified buyers to submit reviews with media (images/videos), and implement an algorithmic sorting mechanism that pushes 5-star reviews containing user media to the top of the product feed. 

---



## Phase 1: Feature Execution (70% Effort)

### Backend Requirements (Delegate to @backend-specialist)
1. **Review Media Storage:** Configure a new Supabase Storage bucket called `review-media`. Apply strict RLS policies: only authenticated users can upload; anyone can read. Enforce strict file size limits (e.g., 5MB for images, 20MB for videos) at the storage level.
2. **Purchase Verification API:** Create a secure Server Action or Edge Function (`/api/reviews/verify-eligibility`). It must query the `Orders` table to verify that the requesting `user_id` has a 'Paid' or 'Delivered' order containing the specific `product_id`. If false, reject the review attempt.
3. **The UGC Sorting Algorithm:** Write a Supabase RPC (Remote Procedure Call) or a specialized Next.js fetch query to retrieve reviews for a product. It must order the results based on this strict weighting hierarchy:
   - Tier 1: 5-Star rating + Contains Media (Images/Videos)
   - Tier 2: 4-Star rating + Contains Media
   - Tier 3: 5-Star rating (Text only)
   - Tier 4: Everything else, sorted by `created_at` descending.
4. **API Contract:** Update `docs/api_contract.md` with the review submission payload, the eligibility check response, and the new sorted review fetch query.

### Frontend Requirements (Delegate to @frontend-specialist)
1. **Account Portal Updates (`/account`):** Update the user's order history page. For any product that has been delivered, add a "Leave a Review" button.
2. **Review Submission Modal:** Build a fluid, Framer Motion-powered modal. 
   - Include a 1-5 Star interactive selector.
   - A text area for the written review.
   - A drag-and-drop zone for media uploads (integrating with the Supabase `review-media` bucket). Ensure loading states are clear while media uploads.
3. **The Product Page Feed (`/shop/[id]`):** Enhance the individual product pages to display the review feed. 
   - Design an elegant, minimalistic review card that fits the "Old Money" aesthetic. 
   - Use Next.js `<Suspense>` to load the reviews without blocking the main product details.
   - Include an image lightbox feature so users can click on review photos to see them full-screen.

---

## Phase 2: Hardening & Tech Debt (30% Effort)

### QA & Integration (Delegate to @qa-integration)
1. **Gatekeeper Audit:** Attempt to bypass the UI and hit the review submission API directly (using Postman or a cURL command) with an authenticated user who has *not* purchased the product. Verify that the backend strictly rejects the insertion.
2. **Algorithm Verification:** Seed the database with 5 mock reviews of varying star ratings and media presence. Fetch the feed and verify that the sorting algorithm correctly places a 5-star review with an image *above* a newer 5-star review without an image.
3. **Media Edge Cases:** Attempt to upload a massive file (e.g., a 100MB video) through the review modal. Verify that the frontend catches the size limit before the upload starts and displays a graceful error toast, and that Supabase Storage rejects it if bypassed.

---

## Definition of Done (Orchestrator Review)
- [ ] Only users who have purchased a product can leave a review.
- [ ] Users can successfully upload images/videos attached to their reviews.
- [ ] Product pages display reviews, sorted algorithmically by media presence and star rating.
- [ ] Review media displays cleanly in a lightbox without breaking the mobile layout.
- [ ] The Orchestrator has updated `docs/MEMORY.md` with the specifics of the UGC sorting algorithm and upload limitations.