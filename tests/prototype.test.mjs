import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const [html, app, styles] = await Promise.all([
  readFile(new URL("../index.html", import.meta.url), "utf8"),
  readFile(new URL("../app.js", import.meta.url), "utf8"),
  readFile(new URL("../styles.css", import.meta.url), "utf8")
]);

assert.ok(html.includes("VERAKAI Prototype"), "HTML title should describe the VERAKAI prototype");
assert.ok(html.includes("viewport-fit=cover"), "Viewport should support full-screen mobile safe areas");
assert.ok(html.includes("react.production.min.js"), "React should be loaded for the prototype");
assert.ok(html.includes("tailwindcss.com"), "Tailwind should be loaded for utility classes");

for (const phrase of [
  "Become someone who follows through.",
  "What should we call you?",
  "Where do you want to keep more promises?",
  "What are you building toward?",
  "Become financially free",
  "Build confidence",
  "How much do you trust yourself today?",
  "Suggested for your Builder Goal",
  "Launch my business",
  "Build for 60 minutes",
  "Reach out to 5 prospects",
  "Lose 20 pounds",
  "Walk 10,000 steps",
  "Choose three promises for today.",
  "Continue to Dashboard",
  "Choose today's promise.",
  "Select one. Enter Focus Mode.",
  "Current Promise",
  "Set your Builder Goal.",
  "Today's Progress",
  "Mission Complete",
  "Continue Today",
  "Finish Today",
  "Review Today",
  "No Promises",
  "Builder Dashboard",
  "Today's Promises",
  "Start This Promise",
  "Estimated Time",
  "Journey Added",
  "You kept your word.",
  "What did this promise prove?",
  "Builder Report",
  "Today's Goal",
  "Promises Completed",
  "Journey Entries",
  "What did today prove about you?",
  "Return Home",
  "Locked until tomorrow",
  "Journey",
  "No Journey entry.",
  "Keep a promise to add this day to your Journey.",
  "Lifetime Promises",
  "Builder Profile",
  "Builder Since",
  "Current Identity",
  "Current Goal",
  "Developing",
  "VERAKAI Alpha v0.1",
  "Helping ambitious young men keep promises to themselves.",
  "Promise Kept",
  "BottomNav",
  "Return to Dashboard",
  "Reset Prototype",
  "Self-Trust Score",
  "builderCoachData",
  "evidenceEntries",
  "tomorrowsPromises",
  "lastActiveDate",
  "completionRate",
  "verakai-prototype-state-v5"
]) {
  assert.ok(app.includes(phrase), `App should include: ${phrase}`);
}

assert.ok(!app.includes("Step ${step} of"), "App should not render step counter text");

for (const demoPhrase of ["Lift for 60 Minutes", "Build VERAKAI for 2 Hours", "Read 10 Pages", "Momentum built", "Today's Style", "What kind of Builder do you need to be today?"]) {
  assert.ok(!app.includes(demoPhrase), `App should not include demo data: ${demoPhrase}`);
}

for (const area of ["Fitness", "Business", "Consistency", "Confidence", "Money", "Purpose"]) {
  assert.ok(app.includes(area), `Area selector should include: ${area}`);
}

assert.ok(styles.includes(".phone-frame"), "Phone frame styles should exist");
assert.ok(styles.includes(".trust-range"), "Assessment slider styles should exist");
assert.ok(styles.includes(".back-button"), "Back button styles should exist");
assert.ok(styles.includes(".evidence-chip"), "Evidence chip styles should exist");
assert.ok(styles.includes("100dvh"), "Mobile viewport should use dynamic viewport height");
assert.ok(styles.includes("overflow: hidden"), "Outer page should avoid double scrolling");
assert.ok(styles.includes(".suggestion-button"), "Promise suggestion styles should exist");
assert.ok(styles.includes(".promise-card.completed"), "Completed promise styles should exist");
assert.ok(styles.includes(".bottom-nav"), "Bottom nav styles should exist");
assert.ok(styles.includes(".bottom-nav-icon"), "Bottom nav icon styles should exist");
assert.ok(styles.includes(".promise-select option"), "Select option styles should exist");
assert.ok(styles.includes(".promise-select:hover"), "Select hover styles should exist");
assert.ok(styles.includes(".evidence-entry"), "Evidence journal card styles should exist");
assert.ok(styles.includes(".evidence-pill"), "Evidence chip display styles should exist");
assert.ok(styles.includes(".success-mark"), "Promise kept success styles should exist");
assert.ok(styles.includes(".builder-calendar"), "Builder calendar styles should exist");
assert.ok(styles.includes(".bottom-sheet"), "Promise suggestion sheet styles should exist");
assert.ok(styles.includes("touch-action: manipulation"), "Tappable controls should use touch-action manipulation");

console.log("VERAKAI prototype smoke test passed.");
