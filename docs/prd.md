# Product Requirements Document (PRD): `Build A PC`

[Back to the Project 03 guide](README.md)

**Team:** `The Fry Guys` · **Repo:** `https://github.com/The-Fry-Guys/Build_A_PC` · **Last updated:** `10/28/2026`

---

## 1. Users

- **Primary user:** `A beginner, amateur, or advanced PC enthusiast, who wants to build a PC on the go (or from home)`
- **Secondary user (optional):** `A person who is looking for PC part prices`

## 2. Problem

`Today, users struggle to build personal computers, while this is both a price issue and a platform issue, we will be focusing on the platform issue. The existing mainstream platform PCPartpicker, has a very popular website but doesn't have any form of building on the go (e.g. an app).`

## 3. Success measures

| # | Measure | Target | How we check it |
|---|---|---|---|
| S1 | `a new user can begin building a pc` | `under 2 minutes` | `timed during the onboarding test` |
| S2 | `an existing user can access build information on multiple platforms quickly` | `persistance across platforms (< 1 min)` | `information saved on the app can be accessed through the web client` |
| S3 | `an admin can manage users and part data accross platforms` | `admin can delete users & part data, and add either back` | `demo shows admin management controls` |

## 4. Scope: MVP, vertical slice, and not building

- **Vertical slice:** `PRD-3: View part compatability issues`
- **Not building (this term):** `live price updating, sharing features, price history graphs`

## 5. User stories and acceptance criteria

One row per MVP story. Each GitHub issue links to its story ID (`PRD-3`) and each story has at
least one acceptance criterion in **Given / When / Then** form that someone outside the team could
test.

| ID | Story | Acceptance criteria |
|---|---|---|
| PRD-1 | As a `user`, I want to `login with google` so that `I don't have to remember a standalone password`. | **Given** `a login screen`, **when** `a user views the screen`, **then** `they will be able to use google oauth to gain access to the app`. |
| PRD-2 | As a `user`, I want to `build pc's` so that `I can manage all my parts and compatability in one location` | Given `a logged in user`, when `a user builds a pc`, then `they will be able to view parts and construct a pc` |
| PRD-3 | As a `user`, I want to `view part compatability issues` so that `I know when parts don't work together` | Given `a logged in user`, when `a user builds a pc`, then `they will be able to view whether their current parts are compatible or not, and which part causes incomatability` |
| PRD-4 | As a `user`, I want to `view all my pc builds` so that `I can keep track of what I was building` | Given `a logged in user`, when `a user builds a pc`, then `they will be able to view any pc's they've started or finished` |
| PRD-5 | As a `user`, I want to `view my information on both a pc and my phone` so that `I can build from home or on the go` | Given `a logged in user`, when `a user logs into either website or app`, then `they can view their information` |
| PRD-6 | As an `admin`, I want to `view user & part information` so that `I can update them if an issue arises` | Given `an admin`, when `an admin logs in`, then `they can view, and search through stored user and part data` |
| PRD-7 | As a `user`, I don't want to `have to log in to view general pc part information` so that `I can quickly check prices or part model numbers` | Given `a user`, when `a user views the app or website`, then `they will be given a chance to sign in, but if they don't want to, they can still view general information` |
| PRD-8 | As a `user`, I want to `be able to view my profile information` so that `I can modify profile information, such as my name, username, and password (if I've forgotten it)` | Given `a user`, when `a user views their profile`, then `they will be able to modify the fields of their profile to suit their needs` |
| PRD-9 | As a `user`, I want to `be able to remove my profile from the platform` so that `I can delete my account` | Given `a user`, when `a user deletes their account`, then `all of that user's data will be purged from the database` |


---

### Change log

| Date | PR | What changed and why |
|---|---|---|
| `10/28` | `#1` | Detekt CI added |
| `10/28` | `#2` | Android CI added |
| `10/29` | `#3` | PRD |