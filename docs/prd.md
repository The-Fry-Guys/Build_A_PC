# Product Requirements Document (PRD): `Build A PC`

[Back to the Project 03 guide](README.md)

**Team:** `The Fry Guys` · **Repo:** `https://github.com/The-Fry-Guys/Build_A_PC` · **Last updated:** `11/04/2026`

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
- **Not building (this term):** `live price updating, real shop links, price history graphs`

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
| PRD-10 | As a `user`, I want to `get suggested pc parts that fit within my budget` so that `I can conveniently pick parts from each section that I can afford` | Given `a logged in user with a budget`, when `a user views a type of part`, then `a few suggestions with average prices that fit within their budget appear to pick in a suggested section` |
| PRD-11 | As a `user`, I want to `set a total budget for a PC build` so that `I can keep the whole build under a spending limit`. | **Given** `a logged-in user viewing a build`, **when** `they set a total budget`, **then** `the build displays that budget and its remaining amount`. |
| PRD-12 | As a `user`, I want to `set budget limits for part categories` so that `I can control how much I spend on each type of component`. | **Given** `a build with a total budget`, **when** `the user assigns budgets to part categories`, **then** `the category limits cannot exceed the remaining total budget`. |
| PRD-13 | As a `user`, I want to `be able to share a pc (any progress) with other users via link` so that `I can build PCs for friends and or family and change the build based on input` | Given `a logged in user`, when `a user goes to their selected pc screen`, then `a share build button will be available to select, which will copy a link to their clipboard that will allow other users to view a copy of that build` |
| PRD-14 | As a `user`, I want to `login with GitHub` so that `I have multiple options to access my account`. | **Given** `a login screen`, **when** `a user views the screen`, **then** `they will be able to use GitHub oauth to gain access to the app`. |

## 6. API error responses

Errors use the RFC 9457 Problem Details format (`application/problem+json`). The response
includes the HTTP status, a short title, a readable detail, and the request path. Validation
errors may also include the invalid field and a message.

| Code | Meaning | Message |
|---|---|---|
| 400 | Malformed request or invalid input | “Request body is missing or malformed.”<br>“A request parameter has an invalid value.”<br>“Request validation failed.” |
| 401 | Authentication is required or invalid | “Authentication is required to access this resource.” |
| 403 | User is not allowed to perform the action | “You are not allowed to access this resource.” |
| 404 | Route or resource was not found | “The requested resource was not found.” |
| 500 | Unexpected server error | “An unexpected error occurred.” |

---

### Change log

| Date | PR | What changed and why |
|---|---|---|
| `10/28` | `#1` | Detekt CI added |
| `10/28` | `#2` | Android CI added |
| `10/29` | `#3` | PRD |
| `11/04` | `—` | Added the API error response contract |
| `11/04` | `—` | Split the duplicate budget stories into total and category budgets |
