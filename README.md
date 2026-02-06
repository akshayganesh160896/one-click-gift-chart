# Strategic Planning App

A clean, single-page strategic planning app to map organizational pillars, objectives, and projects, then visualize priorities on a live urgency vs complexity matrix. The dashboard updates instantly as you add or edit data.

## What It Does
- Build a strategic framework of **Pillars → Objectives → Projects**
- Score each project by **budget**, **urgency**, **complexity**, and **hours**
- Compute a **strategic score** as a weighted average of urgency, complexity, and hours
- Visualize projects in a **bubble matrix** (Urgency vs Complexity)
- Filter and rank projects live based on selection criteria

## Features
- Inline creation of pillars, objectives, and projects
- Editable framework table with quick edit actions
- Dynamic filters embedded in the visualization
- Bubble size reflects budget; hover shows project details
- Ranked list of projects by strategic score
- Responsive layout for desktop and mobile

## How Scoring Works
Strategic score is a normalized weighted average:

`score = urgency * wU + complexity * wC + hours * wH`

Weights are editable in the dashboard. They are automatically normalized to sum to 1.

## How To Run Locally
Open `index.html` in any modern browser.

## Publish With GitHub Pages
1. Push this repo to GitHub.
2. Go to **Settings → Pages**.
3. Set **Source** to `Deploy from a branch`.
4. Choose `main` and `/ (root)`.
5. Save. Your site will be live at:
   `https://<your-username>.github.io/<repo-name>/`

## File Structure
- `index.html` — App UI, styling, and logic
- `README.md` — Project overview

## Customize
- Update theme colors in the `:root` section of `index.html`
- Add persistence via LocalStorage or a backend
- Extend filters, scoring logic, or chart interactions

---

If you want additional features like CSV import/export, authentication, or analytics, just ask.
