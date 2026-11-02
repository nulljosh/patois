# Patois Money

How Patois makes money. The company plan is `REVENUE.md` in the Code root; the ledger is `GTM.md`.

## Price and rail

Free on the App Store (ASC 6783501611) and free on the web. Nothing is charged. The web catalog sits behind an account. The native apps do not gate it.

## What is actually sold

Nothing. The lessons are ours, built from open sources: Tatoeba sentences under their open license and Lichess puzzles (CC0). Book content is never shipped, because Apple rejected macOS 1.1.4 over it. The risk is lesson quality, not licensing.

## Who pays and why

Nobody today. The people who learn here want a free course with lessons that work and a streak. If a dollar ever comes, it is one dollar, once. Language learning is usually a subscription category, and the rule here is one price, paid up front.

## Cost to serve

No paid AI or API in the app code. Hosting is Cloudflare. The Stripe checkout code in `supabase/functions` is not wired to any sale. Accounts run on the shared spark Supabase project.

## Where we are

- 2026-10-04: renamed from Lexly to Patois. The store listing still says Lexly, and the old host still serves.
- 2026-09-20: the iOS build was held in the 4.3(a) wave when this file was last written.
- Revenue: no verified number (the App Store Connect key cannot read sales yet).

## Role in the company plan

Catalogue, free. GTM.md lists it that way. It serves Stage 0 by growing the audience for the fleet. Under Stage 2 it earns a place on the grid or is retired.

## Next

When the iOS build clears review, ship it free and leave the price alone.

## Million, billion, trillion

**A million.** Patois is a free language course a million people finish, and the money comes from the apps beside it.

**A billion.** Patois is the language tool on every Jaybulb device, with lessons built into the phone.

**A trillion.** Patois is how the platform teaches its users to read and speak, with every lesson open and checked.

## Change it

`asc pricing schedule create --app 6783501611 --price 0.99 --base-territory USA --start-date YYYY-MM-DD` if it ever becomes paid, which is not planned. Only with Joshua's yes in chat.

Anyone who got Patois while it was free keeps it free.

*ASC 6783501611. Verified 2026-11-02.*
