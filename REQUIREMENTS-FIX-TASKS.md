# Brook — Requirements Fix Tasks

> This document lists all inconsistencies and missing rules found in REQUIREMENTS.md.
> Work through these tasks IN ORDER before implementing the expense module.
> Each task tells you exactly what is wrong, what the correct behaviour is, and where to fix it in REQUIREMENTS.md.

---

## Task 1 — Add trip_type field to Trip entity

**What is wrong:**
REQUIREMENTS.md Section 3 mentions an "IN_BETWEEN trip" that is auto-created when a trip moves to DELIVERED status. But the Trip entity in Section 4 has no field to distinguish a revenue trip from an in-between trip. An AI implementing TripService would have no way to differentiate them.

**What the correct behaviour is:**
Add a `trip_type` field to the Trip entity with two values:
- `REVENUE` — a real delivery job with a broker, agreed fare, and expected payment
- `IN_BETWEEN` — auto-created when a REVENUE trip reaches DELIVERED status, exists only so the father can log repositioning expenses (fuel to reach next pickup). Has no broker, no rate, no payment fields.

**Rules for IN_BETWEEN trips:**
- Created automatically by TripService when a REVENUE trip status changes to DELIVERED
- IN_BETWEEN trip status starts at IN_TRANSIT automatically
- IN_BETWEEN trip has no broker_name, rate_per_ton, agreed_weight, shortage_penalty, brokerage_pct, or payment_received fields — these should be nullable or excluded for IN_BETWEEN type
- IN_BETWEEN trip expenses do NOT contribute to gross trip profit calculation
- IN_BETWEEN trip expenses ARE included in monthly truck business cost view
- Only one IN_BETWEEN trip can be active at a time
- IN_BETWEEN trip is closed (status → COMPLETED) when admin creates the next REVENUE trip

**Where to fix:**
- Section 3 — Trip lifecycle: document IN_BETWEEN trip rules explicitly
- Section 4 — Trip entity: add `trip_type VARCHAR NOT NULL ← REVENUE | IN_BETWEEN`
- Section 6 — POST /trips: note that creating a new REVENUE trip auto-closes any open IN_BETWEEN trip
- Section 6 — PATCH /trips/{id}: note that changing status to DELIVERED auto-creates IN_BETWEEN trip
- Section 8 — Testing: add unit test for `TripService.handleDeliveredStatusTransition()`

---

## Task 2 — Fix BUSINESS user expense category permissions

**What is wrong:**
Section 2 says the father (BUSINESS role) adds "trip expenses only." But Section 4 role-based filtering shows BUSINESS user can see MAINTENANCE, TYRE, BREAKDOWN, TAX, FASTAG, OTHER_TRUCK categories. This is wrong — truck overhead is added by ADMIN only, not father.

Section 6 POST /expenses marks the endpoint as 🟢 (all roles) but never documents what categories each role is allowed to submit. An AI implementing ExpenseService would incorrectly allow the father to submit a MAINTENANCE expense.

**What the correct behaviour is:**

| Role | Can submit categories | tripId required? |
|------|-----------------------|-----------------|
| ADMIN | All categories | Optional — depends on category |
| BUSINESS | FUEL, TOLL, CLEANING, OTHER_TRIP only | YES — must provide a valid active tripId |
| PERSONAL | HOUSEHOLD, GROCERY, MEDICAL, OTHER_PERSONAL only | NO — always null |

If BUSINESS user submits a category outside their allowed list → return 403 FORBIDDEN with message "You are not authorised to log this expense category."

If BUSINESS user submits without a tripId → return 400 BAD REQUEST with message "A trip must be selected to log a business expense."

If BUSINESS user submits a tripId that is COMPLETED or does not exist → return 400 BAD REQUEST with message "Selected trip is not active."

**Fix for GET /expenses role-based filtering:**
- BUSINESS user GET /expenses → only FUEL, TOLL, CLEANING, OTHER_TRIP (NOT truck overhead)
- Truck overhead (MAINTENANCE, TYRE, BREAKDOWN, TAX, FASTAG, OTHER_TRUCK) is visible to ADMIN only in a separate truck overhead view

**Where to fix:**
- Section 2 — Role rules: explicitly state which categories each role can submit
- Section 4 — Expense category reference: add a column showing which role can CREATE each category
- Section 6 — POST /expenses: add per-role validation rules and error responses
- Section 6 — GET /expenses: fix BUSINESS user filter to exclude truck overhead categories

---

## Task 3 — Document the mandatory trip selection rule for BUSINESS user

**What is wrong:**
The most critical business rule — that BUSINESS user MUST select an active trip before logging an expense — is never explicitly stated as a system constraint anywhere in REQUIREMENTS.md. It is implied in conversation but absent from the API spec, entity rules, and validation rules.

**What the correct behaviour is:**
Add the following rule explicitly to REQUIREMENTS.md:

**Rule: BUSINESS user expense requires active trip**
- Before the BUSINESS user opens the expense entry screen, the frontend calls `GET /api/v1/trips/active`
- If no active trips exist → show message "No active trip. Contact admin to create a trip." Disable expense entry.
- If active trips exist → show a dropdown of active trips. Father selects one. tripId is sent with every expense submission.
- Backend validates on POST /expenses that the tripId belongs to the organisation and is not COMPLETED
- This validation happens in ExpenseService before saving — not just frontend

**Where to fix:**
- Section 2 — Role rules: add this rule under BUSINESS role
- Section 3 — Domain model: add a "Business rules" subsection listing this constraint
- Section 6 — POST /expenses: add this validation to the endpoint documentation
- Section 6 — GET /trips/active: define the complete response shape (see Task 4)

---

## Task 4 — Define GET /trips/active response shape

**What is wrong:**
`GET /trips/active` exists in the API spec but has no response shape defined. The father uses this endpoint to pick a trip from a dropdown. An AI implementing this endpoint would not know what fields to return.

**What the correct behaviour is:**
The endpoint should return a lightweight list — only what the father needs to identify a trip in a dropdown:

```json
Response:
[
  {
    "id": "uuid",
    "brokerName": "Sharma Brothers",
    "startDate": "2024-01-15",
    "status": "IN_TRANSIT",
    "tripType": "REVENUE"
  }
]
```

Rules:
- Returns trips where status NOT IN (COMPLETED) AND org_id matches the authenticated user's org
- Returns BOTH REVENUE and IN_BETWEEN trips so father can log expenses against either
- Ordered by start_date DESC (most recent first)
- No pagination — active trips list is always small
- BUSINESS and ADMIN roles can call this — PERSONAL role cannot

**Where to fix:**
- Section 6 — GET /trips/active: add full response shape and rules above

---

## Task 5 — Clarify payment_received flag vs payment entity relationship

**What is wrong:**
The Trip entity has a `payment_received BOOLEAN` field. The Payment entity has a `received_date DATE` field. The relationship between them is never documented. An AI implementing PaymentService would not know:
- Whether `payment_received` is set manually by admin or automatically when a FINAL payment is recorded
- Whether a trip can have `payment_received = true` without a FINAL payment record in the Payment table
- What triggers the trip status to move to COMPLETED

**What the correct behaviour is:**
Document the following rule:

**Payment received rule:**
- When admin records a Payment with `type = FINAL` via POST /payments, PaymentService automatically sets `trip.payment_received = true` and `trip.status = COMPLETED`
- Admin does NOT manually set `payment_received` via PATCH /trips — it is set automatically
- Remove `payment_received` from the PATCH /trips request body in the API spec
- A trip can only have one ADVANCE and one FINAL payment. Attempting to add a second FINAL payment → 400 BAD REQUEST "Final payment already recorded for this trip."

**Where to fix:**
- Section 4 — Trip entity: add note that payment_received is system-managed, not user-editable
- Section 6 — POST /payments: add the auto-update rule and the duplicate FINAL payment validation
- Section 6 — PATCH /trips: remove payment_received from the editable fields list

---

## Task 6 — Write precise calculateGrossProfit formula with field references

**What is wrong:**
Section 8 lists `TripService.calculateGrossProfit()` as the most critical unit test but the exact formula with field-level references is never documented precisely. An AI implementing this method would have to guess which fields to use.

**What the correct behaviour is:**
Add the following to REQUIREMENTS.md Section 3 under Financial model:

```
calculateGrossProfit(tripId):

  Step 1 — Calculate total revenue
    payments = PaymentRepository.findByTripId(tripId)
    totalRevenue = SUM(payment.amount) for all payments         ← includes both ADVANCE and FINAL
                                                                 ← amounts already net of brokerage and shortage
                                                                    as broker deducts before sending

  Step 2 — Calculate total direct trip expenses
    expenses = ExpenseRepository.findByTripIdAndCategoryIn(
      tripId, [FUEL, TOLL, CLEANING, OTHER_TRIP]
    )
    totalExpenses = SUM(expense.amount)                         ← only trip direct categories
                                                                 ← excludes MAINTENANCE, TYRE etc.

  Step 3 — Calculate gross profit
    grossProfit = totalRevenue - totalExpenses

  Returns:
    TripSummaryDTO {
      totalRevenue: DECIMAL,
      totalExpenses: DECIMAL,
      grossProfit: DECIMAL
    }

  Note: IN_BETWEEN trips always return grossProfit = 0 as they have no payments.
  Note: This method is called inside TripService.getTripById() and included in the response DTO.
  Note: Money values use DECIMAL(10,2) — never float or double.
```

**Where to fix:**
- Section 3 — Financial model: replace vague formula with the precise field-level formula above
- Section 8 — Testing: update unit test description to reference exact inputs and expected output

---

## Task 7 — Add org_id security check to GET /expenses/trip/{tripId}

**What is wrong:**
`GET /expenses/trip/{tripId}` has no security rule documented. A BUSINESS user could theoretically pass any tripId and retrieve expenses from a trip that does not belong to their organisation. For a single-org app this is low risk today but the rule should be documented for correctness.

**What the correct behaviour is:**
Add the following rule to the endpoint:
- ExpenseService validates that the trip referenced by tripId belongs to the same org_id as the authenticated user
- If tripId belongs to a different org → return 403 FORBIDDEN
- If tripId does not exist → return 404 NOT FOUND

**Where to fix:**
- Section 6 — GET /expenses/trip/{tripId}: add security rule and error responses

---

## Verification Checklist

After applying all fixes, verify REQUIREMENTS.md answers these questions unambiguously:

- [ ] What field distinguishes a REVENUE trip from an IN_BETWEEN trip?
- [ ] What categories can the BUSINESS user submit in POST /expenses?
- [ ] What happens if BUSINESS user submits without a tripId?
- [ ] What happens if BUSINESS user submits with a COMPLETED tripId?
- [ ] What does GET /trips/active return and in what shape?
- [ ] What automatically sets trip.payment_received = true?
- [ ] What automatically sets trip.status = COMPLETED?
- [ ] What exact fields does calculateGrossProfit() use from which entities?
- [ ] Does the BUSINESS user see truck overhead expenses in GET /expenses?
- [ ] What happens if a second FINAL payment is submitted for the same trip?
