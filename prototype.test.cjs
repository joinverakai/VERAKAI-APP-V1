const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = __dirname;
const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
const app = fs.readFileSync(path.join(root, "app.js"), "utf8");
const styles = fs.readFileSync(path.join(root, "styles.css"), "utf8");

assert.match(html, /\.\/styles\.css/);
assert.match(html, /\.\/app\.js/);
assert.doesNotMatch(app, /Step\s+8\s+of\s+11/i);
assert.match(app, /goalSuggestionGroups/);
assert.match(app, /function BuilderCalendar/);
assert.match(app, /movedPromises\.length \? movedPromises : createBlankPromises\(\)/);
assert.match(app, /if \(!selectedPromise \|\| selectedPromise\.completed\) return false/);
assert.match(styles, /\.onboarding-card/);
assert.match(styles, /touch-action:\s*manipulation/);

const syntaxContext = vm.createContext({
  React: { createElement() {}, useEffect() {}, useMemo() {}, useState() {}, Fragment: Symbol("Fragment") },
  ReactDOM: { createRoot() { return { render() {} }; } },
  document: { getElementById() { return {}; } },
  window: { localStorage: { getItem() { return null; }, setItem() {} } }
});
new vm.Script(app, { filename: "app.js" }).runInContext(syntaxContext);

assert.equal(syntaxContext.getGoalSuggestionKey("Launch my company"), "business");
assert.equal(syntaxContext.getGoalSuggestionKey("Lose 20 pounds"), "fitness");
assert.equal(syntaxContext.getGoalSuggestionKey("Become more disciplined"), "discipline");

const suggested = syntaxContext.createSuggestedPromises("Launch my business");
assert.equal(suggested.length, 5);
assert.equal(suggested[0].category, "Business");

const blankPromises = syntaxContext.createBlankPromises();
const filledPromises = syntaxContext.applySuggestionToPromises(blankPromises, suggested[0], 1);
assert.equal(filledPromises[0].title, "Build for 60 minutes");
assert.equal(filledPromises[0].estimate, "60 min");

syntaxContext.window.localStorage.getItem = () => JSON.stringify({
  userName: "Ty",
  builderGoal: "Launch my business",
  lastActiveDate: "2000-01-01",
  promises: [],
  tomorrowsPromises: []
});
const nextDayState = syntaxContext.getInitialState();
assert.equal(nextDayState.screen, "promises");
assert.equal(nextDayState.promises.length, 3);

const journey = syntaxContext.getJourneyDays([
  {
    id: "entry-1",
    date: "Jul 12, 2026",
    completionTimestamp: "2026-07-12T15:00:00.000Z",
    promiseTitle: "Build for 60 minutes",
    completionRate: "1/3",
    reflection: "I followed through."
  }
]);
assert.equal(Object.values(journey)[0].promises.length, 1);

console.log("VERAKAI baseline smoke test passed.");
