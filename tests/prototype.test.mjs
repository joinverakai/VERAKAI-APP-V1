import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";

const [html, app, styles] = await Promise.all([
  readFile(new URL("../index.html", import.meta.url), "utf8"),
  readFile(new URL("../app.js", import.meta.url), "utf8"),
  readFile(new URL("../styles.css", import.meta.url), "utf8")
]);

assert.ok(html.includes("VERAKAI Prototype"), "HTML title should describe the VERAKAI prototype");
assert.ok(html.includes("viewport-fit=cover"), "Viewport should support full-screen mobile safe areas");
assert.ok(html.includes("react.production.min.js"), "React should be loaded for the prototype");
assert.ok(html.includes("tailwindcss.com"), "Tailwind should be loaded for utility classes");
assert.equal((html.match(/posthog\.init\(/g) || []).length, 1, "PostHog should be initialized exactly once");
assert.ok(html.includes("autocapture: false"), "PostHog autocapture should be disabled");
assert.ok(html.includes("maskAllInputs: true"), "Session recordings should mask every input");
assert.ok(html.includes("maskTextSelector: '*'"), "Session recordings should mask all visible text");
assert.ok(html.includes("request.requestBody = undefined"), "Network request bodies should be removed from recordings");
assert.ok(html.includes("request.responseBody = undefined"), "Network response bodies should be removed from recordings");
assert.ok(!html.includes("posthog.identify("), "Anonymous analytics must never identify a person");

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

assert.ok(!app.includes("progress-indicator"), "App should not render header progress text");

for (const demoPhrase of ["Lift for 60 Minutes", "Build VERAKAI for 2 Hours", "Read 10 Pages", "Momentum built", "Today's Style", "What kind of Builder do you need to be today?"]) {
  assert.ok(!app.includes(demoPhrase), `App should not include demo data: ${demoPhrase}`);
}

for (const area of ["Fitness", "Business", "Consistency", "Confidence", "Money", "Purpose", "Other"]) {
  assert.ok(app.includes(area), `Area selector should include: ${area}`);
}

assert.ok(app.includes('selectedAreas.includes("Other")'), "Other should reveal its follow-up input when selected");
assert.ok(app.includes('"What area do you want to improve?"'), "Other input should have a clear label");
assert.ok(app.includes('!customOtherArea.trim()'), "Other should require a custom area before continuing");
assert.ok(app.includes("customOtherArea,"), "Custom Other value should be included in persisted state");
assert.ok(app.includes('setCustomOtherArea("")'), "Reset should clear the custom Other value");

const helperEnd = app.indexOf("function getTrustLabel");
assert.ok(helperEnd > 0, "Suggestion helpers should be available for testing");
const capturedEvents = [];
const helperSource = `${app.slice(0, helperEnd)}\nglobalThis.verakaiHelpers = { getGoalSuggestionKey, createSuggestedPromises, trackEvent };`;
const helperContext = {
  React: { createElement: () => null, useEffect: () => null, useMemo: () => null, useState: () => null },
  window: {
    innerWidth: 390,
    innerHeight: 844,
    posthog: { capture: (eventName, properties) => capturedEvents.push({ eventName, properties }) }
  }
};
vm.runInNewContext(helperSource, helperContext);
const { getGoalSuggestionKey, createSuggestedPromises, trackEvent } = helperContext.verakaiHelpers;

for (const [goal, expectedGroup] of [
  ["Launch my business", "business"],
  ["Lose 20 pounds", "fitness"],
  ["Run my first marathon", "running"],
  ["Become disciplined", "discipline"],
  ["Build confidence", "confidence"],
  ["Become financially free", "money"],
  ["Find my purpose", "purpose"]
]) {
  assert.equal(getGoalSuggestionKey(goal), expectedGroup, `${goal} should use the ${expectedGroup} suggestion group`);
  const suggestions = createSuggestedPromises(goal);
  assert.equal(suggestions.length, 5, `${expectedGroup} should provide five suggestions`);
  assert.ok(suggestions.every((suggestion) => suggestion.title && suggestion.category && suggestion.estimate), `${expectedGroup} suggestions should remain editable promise data`);
}

assert.equal(getGoalSuggestionKey("", ["Business"]), "business", "Starting Point should guide suggestions when the written goal has no match");
assert.equal(getGoalSuggestionKey("", ["Other"], "Social confidence"), "confidence", "Custom Other area should guide suggestions after Starting Point");
assert.equal(getGoalSuggestionKey("Make a dent in the universe"), "custom", "Unknown goals should use the editable fallback group");
assert.notDeepEqual(
  createSuggestedPromises("Launch my business").map((suggestion) => suggestion.title),
  createSuggestedPromises("Lose 20 pounds").map((suggestion) => suggestion.title),
  "Different goal groups should return different suggestions"
);

trackEvent("builder_goal_set", {
  goal_category: "business",
  user_name: "Ty",
  builder_goal: "Launch my private company",
  promise_title: "Private task",
  reflection: "Private reflection"
});
assert.equal(JSON.stringify(capturedEvents[0]), JSON.stringify({
  eventName: "builder_goal_set",
  properties: { app_version: "alpha-0.1", viewport_width: 390, viewport_height: 844, goal_category: "business" }
}), "Analytics helper should allow only approved, non-sensitive properties");

for (const eventName of [
  "app_opened",
  "onboarding_started",
  "onboarding_step_completed",
  "starting_point_selected",
  "builder_goal_set",
  "onboarding_completed",
  "suggestions_viewed",
  "suggestion_used",
  "promise_saved",
  "daily_promises_confirmed",
  "focus_started",
  "promise_completed",
  "evidence_saved",
  "dashboard_viewed",
  "journey_viewed",
  "day_completed",
  "app_error"
]) {
  assert.ok(app.includes(`"${eventName}"`), `Analytics should include ${eventName}`);
}

assert.ok(app.includes('if (screen !== "dashboard") trackDashboardViewed()'), "Dashboard events should only fire on an actual screen transition");
assert.ok(app.includes('if (nextScreen === "timeline" && screen !== "timeline") trackJourneyViewed()'), "Journey events should only fire on an actual screen transition");
assert.ok(app.includes('if (!completedDayEvents.has(completionDay))'), "Day completion should only fire once per completed day");
assert.ok(app.indexOf('const evidenceEntry = {') < app.indexOf('trackEvent("evidence_saved"'), "Evidence should be assembled before its event is tracked");

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
assert.ok(styles.includes(".onboarding-card"), "Starting Point cards should have fast dedicated tap styles");
assert.ok(!styles.includes(".progress-indicator"), "Progress indicator styles should be removed");

console.log("VERAKAI prototype smoke test passed.");
