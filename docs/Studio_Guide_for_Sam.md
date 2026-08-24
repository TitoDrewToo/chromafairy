# Your Studio — A Walkthrough

Hi Sam! This is your guide to running the studio side of your website. It focuses on the three pages you'll use most right now — **Catalogue**, **Sales / Orders**, and **Customers** — and how they fit together so your records stay clean (no duplicates, nothing overlapping).

Read it once end to end, then keep it handy for your first real session of setting up your shop. You don't need to be technical — everything here is point-and-click.

---

## The big picture (read this first)

Think of the studio as three connected pages, each with one job:

- **Catalogue** = *your paintings.* Every artwork you've made lives here as one entry. This is the master list.
- **Sales / Orders** = *recording a sale.* When a painting sells, you record it here once — and the system does the rest.
- **Customers** = *the people who buy.* This list mostly fills itself in as you record sales.

**The golden rule:** each painting lives in **one** place (the Catalogue), and a sale simply *connects* a painting to a person. You never re-type a painting or a buyer into multiple pages. Record things once, in the right place, and the pages talk to each other automatically.

**Your safety net:** a customer is identified by their **email address**, and the system will *not* let two customers share the same email. So as long as you use the same email for the same person, you can never accidentally create a duplicate buyer.

---

## Page 1 — Catalogue (your paintings)

This is where you add and manage every artwork.

### Adding a painting

1. Go to **Catalogue** and add a new work. It starts as a **Draft**.
2. Open the painting to fill in its details: upload the image(s), set the **price**, the **year/month**, and assign a **Series** (you can pick an existing series or create a new one on the spot).
3. When it's ready, set its **status** (next section). That's what puts it in your public shop.

### The four statuses (this is the important part)

Every painting has one status. Here's what each means, in plain terms:

- **Draft** — Hidden. Only you can see it. Use this while you're still adding the image or price.
- **Available** — Shown in your public shop as *for sale*. Visitors can inquire about it.
- **Reserved** — Shown in your shop but marked as *on hold* (someone's committed but hasn't completed the purchase).
- **Sold** — Shown in your shop, marked as *sold*.

A painting stays hidden until you move it out of **Draft**. The moment you set it to Available, Reserved, or Sold, it appears in your shop.

You can change a painting's status right from the list with the little status dropdown, and you can select several paintings at once to change them in bulk (handy when you're first loading everything in).

---

## Populating your shop (your main task right now)

Your shop will be mostly **sold** pieces with a few **available** ones. Here's the key decision to make **for each painting** — it's what keeps your sales records clean:

For every piece, ask: *"What do I want this painting to be?"*

**A) It's for sale now.**
→ In the Catalogue, set it to **Available**. Done. (No customer or order needed — it's simply listed.)

**B) It's sold, and I just want it shown as sold — I don't need to track who bought it.**
This is the fast path for older pieces, gifts, or things sold offline long ago that you don't need in your books.
→ In the Catalogue, set it straight to **Sold**. Done. No buyer record is created.

**C) It's sold, and I DO want the buyer and the sale recorded** (so it shows in your sales totals and the customer's history).
→ **Do not** mark it Sold in the Catalogue. Instead, leave it **Available** (or Reserved), then go to the **Sales** page and record the sale there. Recording the sale will flip it to **Sold** for you *and* create the order and the customer automatically.

> ⚠️ **The one trap to avoid:** don't mark a piece **Sold** in the Catalogue if you later want to record its buyer. Once a piece is marked Sold, the Sales page won't let you record a sale for it (it's already sold). If that happens, just set it back to **Available** in the Catalogue, then record the sale.

**Rule of thumb:** Catalogue "Sold" = *display only, no paperwork.* Sales page = *a sale you want on your books.* Pick one per piece — never both.

---

## Page 2 — Sales / Orders (recording a sale)

Use this page whenever you want a sale **tracked** (option C above). Recording one sale does three things at once, so you never enter the same thing twice:

- Marks the painting as **Sold** in your Catalogue.
- Creates the **order** (the record of the sale — amount, date, etc.).
- Creates or links the **customer** (the buyer).

### To record a sale

1. Go to **Sales** and start a new sale.
2. **Choose the customer:**
   - If they've bought before, pick them from the **Existing customer** dropdown — this reuses their record (no duplicate).
   - If they're new, leave the dropdown on *"New or match by email"* and just type their **name and email**. The system will create them, or match them if that email already exists.
3. **Choose the painting** from your list of available works.
4. Enter the **amount**, **currency** (PHP/USD/EUR), and **sale date**. Add a channel or notes if you like.
5. Optionally add **shipping** details (carrier, tracking, package type).
6. Save. You'll see "Sale recorded and work marked sold."

That's it — the painting is now Sold, the buyer is on your Customers list, and the sale is in your books.

### Managing an order after the sale

Each order has a status you can move along as you fulfill it: **Paid → Packed → Shipped → Delivered**. If you ever need to undo a sale, setting an order to **Cancelled** will also put the painting *back* to its previous status so it can be sold again — nothing gets stuck.

---

## Page 3 — Customers (the people who buy)

Most of the time, **this list fills itself in** — every sale you record adds or updates the buyer here automatically. You'll usually just *look* at this page, not add to it.

On each customer's card you'll see their contact details, how many pieces they've bought, their total spend, and the list of works they own. You can **Edit** a customer to fix a name, phone, or add notes.

**When would you add a customer by hand?** Rarely — only if you want a collector on file *before* they've bought anything (say, someone you're in talks with). Because email is unique, adding them now and recording their sale later (with the same email) will link up correctly — no duplicate.

> If you ever think you see the *same person twice*, it's because two slightly different emails were used. Open one, check the email, and use **Edit** to correct it so everything lines up under a single address.

---

## How the three pages connect (quick recap)

- You add a painting **once** in the **Catalogue**.
- When it sells (and you want it tracked), you record it **once** on the **Sales** page — which marks the painting Sold, writes the order, and adds the buyer to **Customers**.
- **Customers** is the running list of buyers, built automatically from your sales.

Nothing needs to be typed in two places. The email address keeps every buyer unique.

### A good order for your first setup session

1. **Catalogue first:** add all your paintings (image, price, year, series). Leave them as Draft while you work.
2. **Set the "for sale" pieces to Available.** Your shop now has its live inventory.
3. **For older/offline sold pieces you don't need to track:** set them straight to **Sold** in the Catalogue.
4. **For sold pieces you want in your books:** leave them Available for now, then go to **Sales** and record each one (this flips them to Sold and builds your customer list).
5. **Glance at Customers** to confirm your buyers came through correctly.

---

## What's under the hood — built and waiting for you

These are already in place beneath the surface and will switch on when your workflow is ready for them. Nothing to do now — just so you know they're there:

- **Insights** — your sales dashboard. It fills in automatically from the sales you record on the Sales page. (Pieces you only mark "Sold" in the Catalogue won't appear here, because there's no sale attached — that's expected.)
- **Inquiries** — messages from your shop and commission form land here as leads. When you record a sale, you can link it to the inquiry it came from.
- **Scheduling (calendar & bookings)** — an availability calendar and appointment booking are built underneath but turned **off** for now. When you're ready to take bookings, we'll switch it on and shape the calendar view around how you actually work.
- **Online payments** — letting buyers check out and pay on the site directly. Off for now; sales are recorded by you manually, which is perfect while you're getting started.
- **Shipping automation & calendar sync** — automatic tracking and Google Calendar linking. Reserved for later, once the manual flow feels natural.
- **Email delivery** — automatic notification emails. Being finalized separately.

The idea is simple: you get a clean, uncomplicated set of tools now, and the more advanced pieces turn on one at a time, only when you actually need them.

---

## Quick troubleshooting

- **"It won't let me record a sale for this painting."** — It's probably already marked **Sold** in the Catalogue. Set it back to **Available**, then record the sale.
- **"That email is already assigned to a customer."** — Good news, actually: that buyer already exists. Pick them from the **Existing customer** dropdown on the Sales page instead of re-typing them.
- **"A piece I sold isn't showing in my Insights/totals."** — It was marked Sold in the Catalogue rather than recorded on the Sales page. If you want it counted, set it back to Available and record the sale.
- **"I made a mistake on a sale."** — Cancel the order (it returns the painting to available), then re-record it correctly.

You've got this. Start with the Catalogue, take it one painting at a time, and the rest follows. 💫
