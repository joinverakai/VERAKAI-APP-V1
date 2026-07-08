const { useEffect, useMemo, useState } = React;
const h = React.createElement;

const storageKey = "verakai-prototype-state-v5";
const onboardingAreas = ["Fitness", "Business", "Consistency", "Confidence", "Money", "Purpose"];
const promiseCategories = ["Fitness", "Business", "Discipline", "Focus", "Confidence", "Learning", "Money", "Purpose", "Relationships", "Health"];
const estimateOptions = ["10 min", "20 min", "30 min", "60 min", "2 hr", "Today"];
const dayStyleOptions = ["Momentum", "Discipline", "Focus", "Confidence", "Recovery"];
const promiseSuggestions = {
  Momentum: [
    ["Finish one important task.", "Business", "60 min"],
    ["Move your body for 30 minutes.", "Fitness", "30 min"],
    ["Read for 20 minutes.", "Learning", "20 min"]
  ],
  Discipline: [
    ["Wake up on time.", "Discipline", "Today"],
    ["Complete one difficult task first.", "Business", "60 min"],
    ["No unnecessary social media until evening.", "Purpose", "Today"]
  ],
  Focus: [
    ["One uninterrupted deep work session.", "Business", "60 min"],
    ["Silence distractions.", "Purpose", "10 min"],
    ["Complete today's highest priority.", "Purpose", "60 min"]
  ],
  Confidence: [
    ["Finish something you've been avoiding.", "Confidence", "30 min"],
    ["Exercise.", "Fitness", "30 min"],
    ["Journal one lesson learned.", "Learning", "20 min"]
  ],
  Recovery: [
    ["Walk outside.", "Health", "30 min"],
    ["Drink enough water.", "Health", "Today"],
    ["Sleep on time.", "Health", "Today"]
  ]
};
const evidenceChips = [
  "I can follow through.",
  "I kept my word.",
  "I can do hard things.",
  "I beat procrastination.",
  "I showed up when it mattered.",
  "Custom response."
];
const screenOrder = [
  "welcome",
  "name",
  "build",
  "goal",
  "assessment",
  "focus",
  "promises",
  "dashboard",
  "session",
  "success",
  "evidence",
  "complete",
  "tomorrow",
  "timeline",
  "profile",
  "settings"
];
const mainScreens = ["dashboard", "promises", "timeline", "profile", "settings"];

function createBlankPromises() {
  return [1, 2, 3].map((id) => ({ id, title: "", category: "", estimate: "", completed: false }));
}

function createSuggestedPromises(dayStyle) {
  const suggestions = promiseSuggestions[dayStyle] || promiseSuggestions.Momentum;
  return suggestions.map(([title, category, estimate]) => ({
    title,
    category,
    estimate
  }));
}

function applySuggestionToPromises(promises, suggestion) {
  const next = promises.length ? [...promises] : createBlankPromises();
  const targetIndex = next.findIndex((promise) => !promise.title.trim());
  const index = targetIndex === -1 ? 0 : targetIndex;
  next[index] = {
    ...next[index],
    title: suggestion.title,
    category: suggestion.category,
    estimate: suggestion.estimate,
    completed: false
  };
  return next;
}

function createTomorrowSuggestions(dayStyle) {
  return createSuggestedPromises(dayStyle).map((suggestion, index) => ({
    id: index + 1,
    ...suggestion,
    completed: false
  }));
}

function getDaySuggestions(dayStyle) {
  return createSuggestedPromises(dayStyle || "Momentum");
}

function getTrustLabel(score) {
  if (score <= 3) return "Broken";
  if (score <= 6) return "Rebuilding";
  if (score <= 8) return "Reliable";
  return "Builder";
}

function getIdentityLabel(score) {
  if (score <= 3) return "Rebuilding";
  if (score <= 6) return "Developing";
  if (score <= 8) return "Reliable";
  return "Builder";
}

function getBuilderSinceLabel(date = new Date()) {
  return date.toLocaleDateString(undefined, { month: "short", year: "numeric" });
}

function getLocalDateKey(date = new Date()) {
  return date.toLocaleDateString("en-CA");
}

function formatEvidenceDate(timestamp) {
  return new Date(timestamp).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function formatEvidenceTime(timestamp) {
  return new Date(timestamp).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

function getGreeting(name, completedCount) {
  const hour = new Date().getHours();
  const greeting = hour >= 5 && hour < 12 ? "Good Morning" : hour >= 12 && hour < 17 ? "Good Afternoon" : "Good Evening";
  const displayName = name?.trim() || "Builder";
  const status =
    completedCount === 3
      ? "You kept every promise today."
      : completedCount === 2
        ? "Two down. Finish strong."
        : completedCount === 1
          ? "One promise kept. Keep going."
          : "Today's promises become tomorrow's confidence.";
  return { greeting: `${greeting}, ${displayName}`, status };
}

function normalizePromises(promises) {
  return promises.map((promise) => ({
    completed: false,
    category: "",
    estimate: "",
    ...promise
  }));
}

function getInitialState() {
  const fallback = {
    screen: "welcome",
    userName: "",
    builderSince: getBuilderSinceLabel(),
    builderGoal: "",
    dayStyle: "",
    selectedAreas: [],
    trustScore: 5,
    promises: [],
    activePromiseId: null,
    evidenceCount: 0,
    promisesKept: 0,
    currentStreak: 0,
    sessionReturnScreen: "promises",
    selectedEvidenceChips: [],
    evidenceReflection: "",
    closingReflection: "",
    timelineItems: [],
    evidenceEntries: [],
    builderCoachData: [],
    tomorrowsPromises: [],
    lastActiveDate: getLocalDateKey(),
    hasSeenDashboard: false
  };

  try {
    const saved = JSON.parse(window.localStorage.getItem(storageKey) || "null");
    if (!saved) return fallback;
    const normalizedPromises = Array.isArray(saved.promises) ? normalizePromises(saved.promises) : fallback.promises;
    const normalizedTomorrow = Array.isArray(saved.tomorrowsPromises) ? normalizePromises(saved.tomorrowsPromises) : fallback.tomorrowsPromises;
    const isNewDay = saved.lastActiveDate && saved.lastActiveDate !== getLocalDateKey();
    const movedPromises = normalizedTomorrow.map((promise, index) => ({ ...promise, id: index + 1, completed: false }));
    const resumedState = {
      ...fallback,
      ...saved,
      screen: screenOrder.includes(saved.screen) ? saved.screen : fallback.screen,
      promises: normalizedPromises,
      timelineItems: Array.isArray(saved.timelineItems) ? saved.timelineItems : fallback.timelineItems,
      evidenceEntries: Array.isArray(saved.evidenceEntries) ? saved.evidenceEntries : fallback.evidenceEntries,
      builderCoachData: Array.isArray(saved.builderCoachData) ? saved.builderCoachData : fallback.builderCoachData,
      tomorrowsPromises: normalizedTomorrow,
      lastActiveDate: saved.lastActiveDate || fallback.lastActiveDate
    };
    if (!isNewDay) return resumedState;
    return {
      ...resumedState,
      screen: saved.userName && saved.builderGoal ? "focus" : resumedState.screen,
      promises: movedPromises,
      tomorrowsPromises: [],
      dayStyle: "",
      activePromiseId: null,
      sessionReturnScreen: "promises",
      selectedEvidenceChips: [],
      evidenceReflection: "",
      closingReflection: "",
      lastActiveDate: getLocalDateKey()
    };
  } catch {
    return fallback;
  }
}

function App() {
  const initialState = useMemo(getInitialState, []);
  const [screen, setScreen] = useState(initialState.screen);
  const [transition, setTransition] = useState({ key: 0, direction: "forward" });
  const [userName, setUserName] = useState(initialState.userName);
  const [builderSince, setBuilderSince] = useState(initialState.builderSince);
  const [builderGoal, setBuilderGoal] = useState(initialState.builderGoal);
  const [builderGoalDraft, setBuilderGoalDraft] = useState(initialState.builderGoal);
  const [builderGoalError, setBuilderGoalError] = useState("");
  const [dayStyle, setDayStyle] = useState(initialState.dayStyle);
  const [nameDraft, setNameDraft] = useState(initialState.userName);
  const [nameError, setNameError] = useState("");
  const [selectedAreas, setSelectedAreas] = useState(initialState.selectedAreas);
  const [trustScore, setTrustScore] = useState(initialState.trustScore);
  const [promises, setPromises] = useState(initialState.promises);
  const [activePromiseId, setActivePromiseId] = useState(initialState.activePromiseId);
  const [sessionStarted, setSessionStarted] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [evidenceCount, setEvidenceCount] = useState(initialState.evidenceCount);
  const [promisesKept, setPromisesKept] = useState(initialState.promisesKept);
  const [currentStreak, setCurrentStreak] = useState(initialState.currentStreak);
  const [sessionReturnScreen, setSessionReturnScreen] = useState(initialState.sessionReturnScreen);
  const [selectedEvidenceChips, setSelectedEvidenceChips] = useState(initialState.selectedEvidenceChips);
  const [evidenceReflection, setEvidenceReflection] = useState(initialState.evidenceReflection);
  const [closingReflection, setClosingReflection] = useState(initialState.closingReflection);
  const [timelineItems, setTimelineItems] = useState(initialState.timelineItems);
  const [evidenceEntries, setEvidenceEntries] = useState(initialState.evidenceEntries);
  const [builderCoachData, setBuilderCoachData] = useState(initialState.builderCoachData);
  const [tomorrowsPromises, setTomorrowsPromises] = useState(initialState.tomorrowsPromises);
  const [lastActiveDate, setLastActiveDate] = useState(initialState.lastActiveDate);
  const [hasSeenDashboard, setHasSeenDashboard] = useState(initialState.hasSeenDashboard);
  const [promiseMessage, setPromiseMessage] = useState("");

  const activePromise = promises.find((promise) => promise.id === activePromiseId) || promises[0];
  const dailyPromisesKept = promises.filter((promise) => promise.completed).length;
  const selfTrustLabel = getTrustLabel(trustScore);
  const identityLabel = getIdentityLabel(trustScore);
  const greeting = getGreeting(userName, dailyPromisesKept);
  const isPromiseSetValid =
    promises.length === 3 && promises.every((promise) => promise.title.trim() && promise.category && promise.estimate);
  const canGoBack = screen !== "welcome";
  const showBottomNav = mainScreens.includes(screen);

  const builderScore = Math.max(0, Math.min(100, Math.round(promisesKept * 8 + evidenceCount * 4 + currentStreak * 3)));

  useEffect(() => {
    const stateToPersist = {
      screen,
      userName,
      builderSince,
      builderGoal,
      dayStyle,
      selectedAreas,
      trustScore,
      promises,
      activePromiseId,
      evidenceCount,
      promisesKept,
      currentStreak,
      sessionReturnScreen,
      selectedEvidenceChips,
      evidenceReflection,
      closingReflection,
      timelineItems,
      evidenceEntries,
      builderCoachData,
      tomorrowsPromises,
      lastActiveDate,
      hasSeenDashboard
    };
    window.localStorage.setItem(storageKey, JSON.stringify(stateToPersist));
  }, [
    screen,
    userName,
    builderSince,
    builderGoal,
    dayStyle,
    selectedAreas,
    trustScore,
    promises,
    activePromiseId,
    evidenceCount,
    promisesKept,
    currentStreak,
    sessionReturnScreen,
    selectedEvidenceChips,
    evidenceReflection,
    closingReflection,
    timelineItems,
    evidenceEntries,
    builderCoachData,
    tomorrowsPromises,
    lastActiveDate,
    hasSeenDashboard
  ]);

  useEffect(() => {
    if (!sessionStarted) return undefined;
    const timer = window.setInterval(() => setElapsedSeconds((seconds) => seconds + 1), 1000);
    return () => window.clearInterval(timer);
  }, [sessionStarted]);

  useEffect(() => {
    if (screen !== "success") return undefined;
    const timeout = window.setTimeout(() => goToScreen("evidence"), 620);
    return () => window.clearTimeout(timeout);
  }, [screen]);

  useEffect(() => {
    function handleKeyDown(event) {
      const activeTag = document.activeElement?.tagName?.toLowerCase();
      const isTyping = ["input", "textarea", "select"].includes(activeTag);
      if (event.key === "Escape" && canGoBack) {
        event.preventDefault();
        goBack();
      }
      if (event.key === "Enter" && !isTyping) {
        const handled = runPrimaryAction();
        if (handled) event.preventDefault();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  });

  function goToScreen(nextScreen) {
    if (nextScreen === "promises" && promises.length === 0) {
      if (!dayStyle) {
        nextScreen = "focus";
      } else {
        setPromises(createBlankPromises());
      }
    }
    setTransition((current) => ({
      key: current.key + 1,
      direction: screenOrder.indexOf(nextScreen) >= screenOrder.indexOf(screen) ? "forward" : "back"
    }));
    if (nextScreen === "dashboard") setHasSeenDashboard(true);
    setScreen(nextScreen);
  }

  function goBack() {
    const backTargets = {
      name: "welcome",
      build: "name",
      goal: "build",
      assessment: "goal",
      focus: "assessment",
      promises: hasSeenDashboard ? "dashboard" : "focus",
      dashboard: "promises",
      session: sessionReturnScreen,
      success: "session",
      evidence: "session",
      complete: "dashboard",
      tomorrow: "complete",
      timeline: "dashboard",
      profile: "dashboard",
      settings: "dashboard"
    };
    const nextScreen = backTargets[screen];
    if (!nextScreen) return false;
    if (screen === "session") setSessionStarted(false);
    goToScreen(nextScreen);
    return true;
  }

  function runPrimaryAction() {
    if (screen === "welcome") return goToScreen("name") || true;
    if (screen === "name") return submitName();
    if (screen === "build") return goToScreen("goal") || true;
    if (screen === "goal") return submitBuilderGoal();
    if (screen === "assessment") return goToScreen("focus") || true;
    if (screen === "dashboard") return goToScreen("promises") || true;
    if (screen === "focus" && dayStyle) return prepareTodayFromStyle(dayStyle);
    if (screen === "promises") return validatePromiseSet();
    if (screen === "session" && !sessionStarted) return setSessionStarted(true) || true;
    return false;
  }

  function submitName() {
    const nextName = nameDraft.trim();
    if (!nextName) {
      setNameError("First name is required.");
      return true;
    }
    setUserName(nextName);
    setNameError("");
    goToScreen("build");
    return true;
  }

  function submitBuilderGoal() {
    const nextGoal = builderGoalDraft.trim();
    if (!nextGoal) {
      setBuilderGoalError("Set the future you're building toward.");
      return true;
    }
    setBuilderGoal(nextGoal);
    setBuilderGoalError("");
    goToScreen("assessment");
    return true;
  }

  function prepareTodayFromStyle(style) {
    setDayStyle(style);
    if (promises.length === 0) {
      setPromises(createBlankPromises());
    }
    setPromiseMessage("");
    setTransition((current) => ({
      key: current.key + 1,
      direction: screenOrder.indexOf("promises") >= screenOrder.indexOf(screen) ? "forward" : "back"
    }));
    setScreen("promises");
    return true;
  }

  function saveNameFromSettings() {
    const nextName = nameDraft.trim();
    if (!nextName) {
      setNameError("First name is required.");
      return true;
    }
    setUserName(nextName);
    setNameError("");
    return true;
  }

  function toggleArea(area) {
    setSelectedAreas((current) => (current.includes(area) ? current.filter((item) => item !== area) : [...current, area]));
  }

  function updatePromise(id, field, value) {
    setPromiseMessage("");
    setPromises((current) => current.map((promise) => (promise.id === id ? { ...promise, [field]: value } : promise)));
  }

  function usePromiseSuggestion(suggestion) {
    setPromiseMessage("");
    setPromises((current) => applySuggestionToPromises(current, suggestion));
  }

  function validatePromiseSet() {
    if (!isPromiseSetValid) {
      setPromiseMessage("Complete all three promises with a title, category, and estimated time.");
      return true;
    }
    if (!hasSeenDashboard) {
      setPromiseMessage("");
      goToScreen("dashboard");
      return true;
    }
    setPromiseMessage("Choose which promise you want to keep first.");
    return true;
  }

  function startSelectedPromise(promiseId, returnScreen = "promises") {
    if (!isPromiseSetValid) {
      setPromiseMessage("Complete all three promises with a title, category, and estimated time.");
      return false;
    }
    setPromiseMessage("");
    return beginPromise(promiseId, returnScreen);
  }

  function beginPromise(promiseId = activePromiseId, returnScreen = "promises") {
    if (!promiseId) return false;
    const selectedPromise = promises.find((promise) => promise.id === promiseId);
    if (selectedPromise?.completed && !window.confirm("You already added evidence for this promise. Start it again?")) {
      return false;
    }
    setActivePromiseId(promiseId);
    setSessionReturnScreen(returnScreen);
    setSessionStarted(false);
    setElapsedSeconds(0);
    goToScreen("session");
    return true;
  }

  function completePromise() {
    setSessionStarted(false);
    setSelectedEvidenceChips([]);
    setEvidenceReflection("");
    goToScreen("success");
  }

  function toggleEvidenceChip(chip) {
    setSelectedEvidenceChips((current) => (current.includes(chip) ? current.filter((item) => item !== chip) : [...current, chip]));
  }

  function saveEvidence() {
    const wasAlreadyCompleted = activePromise?.completed;
    const completedAfterSave = promises.filter((promise) => promise.completed || promise.id === activePromiseId).length;
    const completionTimestamp = new Date().toISOString();
    const evidenceEntry = {
      id: completionTimestamp,
      date: formatEvidenceDate(completionTimestamp),
      time: formatEvidenceTime(completionTimestamp),
      promiseTitle: activePromise?.title || "Promise",
      category: activePromise?.category || "",
      estimatedTime: activePromise?.estimate || "",
      reflection: evidenceReflection.trim(),
      selectedEvidenceChips,
      builderGoal,
      dayStyle,
      completionRate: `${completedAfterSave}/3`,
      completionTimestamp
    };
    const coachEntry = {
      builderGoal,
      dayStyle,
      promise: evidenceEntry.promiseTitle,
      reflection: evidenceEntry.reflection,
      evidenceChips: evidenceEntry.selectedEvidenceChips,
      category: evidenceEntry.category,
      completionTime: evidenceEntry.time,
      date: evidenceEntry.date,
      completionRate: evidenceEntry.completionRate
    };
    setPromises((current) =>
      current.map((promise) => (promise.id === activePromiseId ? { ...promise, completed: true } : promise))
    );
    setEvidenceCount((count) => count + 1);
    if (!wasAlreadyCompleted) setPromisesKept((count) => count + 1);
    setCurrentStreak((streak) => Math.max(streak, 1));
    setEvidenceEntries((current) => [evidenceEntry, ...current]);
    setBuilderCoachData((current) => [coachEntry, ...current]);
    setTimelineItems((current) => [{ id: evidenceEntry.id, label: evidenceEntry.date, text: evidenceEntry.promiseTitle }, ...current]);
    goToScreen("dashboard");
  }

  function prepareTomorrow() {
    if (tomorrowsPromises.length === 0) {
      setTomorrowsPromises(dayStyle ? createTomorrowSuggestions(dayStyle) : createBlankPromises());
    }
    goToScreen("tomorrow");
    return true;
  }

  function updateTomorrowPromise(id, field, value) {
    setTomorrowsPromises((current) => current.map((promise) => (promise.id === id ? { ...promise, [field]: value } : promise)));
  }

  function finishTomorrowPlanning() {
    goToScreen("dashboard");
    return true;
  }

  function resetPrototype() {
    if (!window.confirm("Reset the VERAKAI prototype and return to Welcome?")) return;
    window.localStorage.removeItem(storageKey);
    setUserName("");
    setBuilderSince(getBuilderSinceLabel());
    setBuilderGoal("");
    setBuilderGoalDraft("");
    setBuilderGoalError("");
    setDayStyle("");
    setNameDraft("");
    setSelectedAreas([]);
    setTrustScore(5);
    setPromises([]);
    setActivePromiseId(null);
    setSessionStarted(false);
    setElapsedSeconds(0);
    setEvidenceCount(0);
    setPromisesKept(0);
    setCurrentStreak(0);
    setSessionReturnScreen("promises");
    setSelectedEvidenceChips([]);
    setEvidenceReflection("");
    setClosingReflection("");
    setTimelineItems([]);
    setEvidenceEntries([]);
    setBuilderCoachData([]);
    setTomorrowsPromises([]);
    setLastActiveDate(getLocalDateKey());
    setHasSeenDashboard(false);
    setPromiseMessage("");
    setNameError("");
    goToScreen("welcome");
  }

  const navigationProps = { onBack: canGoBack ? goBack : null };

  return h(
    "main",
    { className: "min-h-screen overflow-hidden bg-charcoal-950 px-4 py-6 text-white sm:grid sm:place-items-center sm:px-6" },
    h(
      "div",
      {
        className:
          "phone-frame relative mx-auto flex min-h-[760px] w-full max-w-[390px] flex-col overflow-hidden rounded-[34px] border border-white/10 bg-[#060a12] shadow-phone sm:h-[844px]"
      },
      h(PhoneAtmosphere),
      h(
        ScreenTransition,
        { animationKey: transition.key, direction: transition.direction },
        screen === "welcome" && h(WelcomeScreen, { onBegin: () => goToScreen("name") }),
        screen === "name" &&
          h(NameScreen, {
            ...navigationProps,
            nameDraft,
            error: nameError,
            onNameChange: (value) => {
              setNameDraft(value);
              setNameError("");
            },
            onContinue: submitName
          }),
        screen === "build" &&
          h(BuildScreen, {
            ...navigationProps,
            selectedAreas,
            onToggleArea: toggleArea,
            onContinue: () => goToScreen("goal")
          }),
        screen === "goal" &&
          h(BuilderGoalScreen, {
            ...navigationProps,
            builderGoalDraft,
            error: builderGoalError,
            onGoalChange: (value) => {
              setBuilderGoalDraft(value);
              setBuilderGoalError("");
            },
            onContinue: submitBuilderGoal
          }),
        screen === "assessment" &&
          h(AssessmentScreen, {
            ...navigationProps,
            trustScore,
            onScoreChange: setTrustScore,
            onContinue: () => goToScreen("focus")
          }),
        screen === "focus" &&
          h(DayStyleScreen, {
            ...navigationProps,
            dayStyle,
            onChooseStyle: prepareTodayFromStyle
          }),
        screen === "dashboard" &&
          h(DashboardScreen, {
            ...navigationProps,
            greeting,
            builderGoal,
            dayStyle,
            trustScore,
            selfTrustLabel,
            builderScore,
            currentStreak,
            evidenceCount,
            dailyPromisesKept,
            promises,
            evidenceEntries,
            onSelectPromise: (promiseId) => startSelectedPromise(promiseId, "dashboard"),
            onBeginToday: () => {
              if (dailyPromisesKept === 3) return goToScreen("complete");
              return dayStyle ? goToScreen("promises") : goToScreen("focus");
            },
            onReset: resetPrototype
          }),
        screen === "promises" &&
          h(PromisesScreen, {
            ...navigationProps,
            promises,
            suggestions: getDaySuggestions(dayStyle),
            message: promiseMessage,
            isLocked: isPromiseSetValid,
            hasSeenDashboard,
            dailyPromisesKept,
            dayStyle,
            onUpdatePromise: updatePromise,
            onUseSuggestion: usePromiseSuggestion,
            onValidatePromises: validatePromiseSet,
            onStartPromise: (promiseId) => startSelectedPromise(promiseId, "promises")
          }),
        screen === "session" &&
          h(PromiseSessionScreen, {
            ...navigationProps,
            promise: activePromise,
            elapsedSeconds,
            sessionStarted,
            onBegin: () => setSessionStarted(true),
            onPause: () => setSessionStarted(false),
            onComplete: completePromise,
            onExitFocus: goBack
          }),
        screen === "success" && h(PromiseKeptScreen, navigationProps),
        screen === "evidence" &&
          h(EvidenceScreen, {
            ...navigationProps,
            selectedChips: selectedEvidenceChips,
            reflection: evidenceReflection,
            onToggleChip: toggleEvidenceChip,
            onReflectionChange: setEvidenceReflection,
            onSaveEvidence: saveEvidence
          }),
        screen === "complete" &&
          h(PrepareTomorrowScreen, {
            ...navigationProps,
            trustScore,
            selfTrustLabel,
            builderScore,
            currentStreak,
            evidenceCount,
            promisesKept: dailyPromisesKept,
            builderGoal,
            dayStyle,
            closingReflection,
            onReflectionChange: setClosingReflection,
            onPrepareTomorrow: prepareTomorrow,
            onSkip: () => goToScreen("dashboard")
          }),
        screen === "tomorrow" &&
          h(TomorrowPromisesScreen, {
            ...navigationProps,
            promises: tomorrowsPromises,
            dayStyle,
            onUpdatePromise: updateTomorrowPromise,
            onDone: finishTomorrowPlanning
          }),
        screen === "timeline" &&
          h(EvidenceTimelineScreen, {
            ...navigationProps,
            evidenceCount,
            promisesKept,
            currentStreak,
            builderGoal,
            evidenceEntries
          }),
        screen === "profile" &&
          h(ProfileScreen, {
            ...navigationProps,
            userName,
            builderSince,
            builderGoal,
            trustScore,
            identityLabel,
            builderScore,
            evidenceCount,
            promisesKept,
            currentStreak
          }),
        screen === "settings" &&
          h(SettingsScreen, {
            ...navigationProps,
            nameDraft,
            nameError,
            onNameChange: setNameDraft,
            onSaveName: saveNameFromSettings,
            onReset: resetPrototype
          })
      ),
      showBottomNav &&
        h(BottomNav, {
          activeScreen: screen,
          onNavigate: goToScreen
        })
    )
  );
}

function ScreenTransition({ animationKey, direction, children }) {
  return h(
    "div",
    {
      key: animationKey,
      className: `screen-transition screen-transition-${direction} relative z-10 flex min-h-[760px] flex-1 flex-col sm:min-h-0`
    },
    children
  );
}

function PhoneAtmosphere() {
  return h(
    React.Fragment,
    null,
    h("div", { className: "pointer-events-none absolute inset-x-0 top-0 h-48 bg-gradient-to-b from-midnight-700/25 to-transparent" }),
    h("div", { className: "pointer-events-none absolute -right-24 top-24 h-56 w-56 rounded-full bg-midnight-400/12 blur-3xl" }),
    h("div", { className: "pointer-events-none absolute bottom-0 left-0 h-52 w-full bg-gradient-to-t from-black/70 to-transparent" })
  );
}

function Screen({ eyebrow = "VERAKAI", step, onBack, withBottomNav = false, children, footer }) {
  return h(
    "section",
    { className: `screen-scroll relative z-10 flex min-h-[760px] flex-1 flex-col overflow-y-auto px-7 pb-8 pt-7 sm:min-h-0 ${withBottomNav ? "with-bottom-nav" : ""}` },
    h(
      "header",
      { className: "flex items-center justify-between gap-4" },
      h(
        "div",
        { className: "flex items-center gap-3" },
        onBack && h("button", { className: "back-button", type: "button", onClick: onBack, "aria-label": "Go back" }, "Back"),
        h("p", { className: "text-[0.72rem] font-semibold tracking-[0.34em] text-white" }, eyebrow)
      ),
      step
        ? h("p", { key: step, className: "progress-indicator text-[0.68rem] font-medium uppercase tracking-[0.18em] text-white/38" }, `Step ${step} of 11`)
        : h("span", { className: "h-2 w-2 rounded-full bg-midnight-300 shadow-[0_0_24px_rgba(111,147,200,0.85)]" })
    ),
    children,
    footer && h("footer", { className: "mt-auto pt-6" }, footer)
  );
}

function PrimaryButton({ children, onClick, disabled = false }) {
  return h(
    "button",
    {
      type: "button",
      disabled,
      onClick,
      className:
        "group flex h-14 min-h-11 w-full items-center justify-center rounded-lg border border-midnight-300/70 bg-midnight-500 px-5 text-sm font-semibold tracking-[0.08em] text-white shadow-soft transition duration-200 hover:bg-midnight-400 focus:outline-none focus:ring-4 focus:ring-midnight-300/20 disabled:cursor-not-allowed disabled:border-white/10 disabled:bg-white/10 disabled:text-white/40"
    },
    children
  );
}

function SecondaryButton({ children, onClick, disabled = false }) {
  return h(
    "button",
    {
      type: "button",
      disabled,
      onClick,
      className:
        "group flex min-h-11 items-center justify-center rounded-lg border border-white/10 bg-white/[0.035] px-4 text-sm font-semibold text-white/76 transition duration-200 hover:border-white/20 hover:bg-white/[0.055] focus:outline-none focus:ring-4 focus:ring-midnight-300/15 disabled:cursor-not-allowed disabled:text-white/30"
    },
    children
  );
}

function SectionIntro({ label, title, copy }) {
  return h(
    "div",
    { className: "pt-12" },
    h("p", { className: "mb-4 text-xs font-medium uppercase tracking-[0.22em] text-midnight-300" }, label),
    h("h1", { className: "headline-enter text-[2.08rem] font-semibold leading-[1.04] tracking-[-0.01em]" }, title),
    copy && h("p", { className: "mt-4 max-w-[315px] text-[0.96rem] leading-6 text-white/55" }, copy)
  );
}

function StatCard({ label, value, detail, hero = false }) {
  return h(
    "div",
    { className: `${hero ? "col-span-2 border-midnight-300/25 bg-midnight-500/10" : "bg-white/[0.035]"} rounded-lg border border-white/10 p-4` },
    h("p", { className: "text-[0.68rem] font-medium uppercase tracking-[0.18em] text-white/35" }, label),
    h("strong", { className: `${hero ? "text-5xl" : "text-3xl"} mt-3 block font-semibold tracking-[-0.03em] text-white` }, value),
    detail && h("p", { className: "score-label mt-2 text-sm font-medium text-midnight-300" }, detail)
  );
}

function PromiseRow({ promise, checked = false, onClick }) {
  return h(
    "button",
    {
      type: "button",
      onClick,
      className: [
        "card-press flex min-h-14 w-full items-center gap-3 rounded-lg border px-4 text-left transition hover:border-white/20 hover:bg-white/[0.055] focus:outline-none focus:ring-4 focus:ring-midnight-300/15",
        checked ? "border-midnight-300/25 bg-midnight-500/10 text-white/62" : "border-white/10 bg-white/[0.035] text-white/84"
      ].join(" ")
    },
    h("span", { className: `grid h-5 w-5 shrink-0 place-items-center rounded border text-[0.72rem] font-bold ${checked ? "border-midnight-300 bg-midnight-500/40 text-white" : "border-white/18"}` }, checked ? "✓" : null),
    h(
      "span",
      { className: "min-w-0" },
      h("span", { className: "block text-sm font-medium leading-5" }, promise.title || "Untitled promise"),
      h("span", { className: "mt-1 block text-xs text-white/35" }, `${promise.category} / ${promise.estimate}`)
    ),
    checked && h("span", { className: "ml-auto shrink-0 text-[0.64rem] font-semibold uppercase tracking-[0.14em] text-midnight-300" }, "Evidence Added")
  );
}

function WelcomeScreen({ onBegin }) {
  return h(
    Screen,
    {
      step: 1,
      footer: h(
        "p",
        { className: "mx-auto max-w-[300px] text-center text-[0.82rem] leading-6 text-white/55" },
        "Motivation is fuel. Systems determine where it takes you."
      )
    },
    h(
      "div",
      { className: "flex flex-1 flex-col justify-center pb-24 pt-16" },
      h("div", { className: "mb-10 h-px w-16 bg-midnight-300/70" }),
      h("h1", { className: "headline-enter max-w-[320px] text-[2.78rem] font-semibold leading-[0.96] tracking-[-0.01em] text-white" }, "Become someone who follows through."),
      h(
        "p",
        { className: "mt-6 max-w-[310px] whitespace-pre-line text-[1rem] leading-7 text-white/58" },
        "Keep promises to yourself.\nBuild evidence.\nBecome someone who follows through."
      )
    ),
    h("div", { className: "mb-8" }, h(PrimaryButton, { onClick: onBegin }, "Start Building"))
  );
}

function NameScreen({ nameDraft, error, onNameChange, onContinue, onBack }) {
  return h(
    Screen,
    { step: 2, onBack },
    h(SectionIntro, {
      label: "Identity",
      title: "What should we call you?",
      copy: "VERAKAI works best when it feels like your operating system."
    }),
    h(
      "div",
      { className: "mt-10" },
      h("input", {
        className: "promise-input name-input",
        value: nameDraft,
        placeholder: "First name",
        onChange: (event) => onNameChange(event.target.value),
        "aria-label": "First name"
      }),
      error && h("p", { className: "mt-3 text-sm font-medium text-white/45" }, error)
    ),
    h("div", { className: "mt-auto pt-10" }, h(PrimaryButton, { onClick: onContinue }, "Continue"))
  );
}

function BuildScreen({ selectedAreas, onToggleArea, onContinue, onBack }) {
  return h(
    Screen,
    { step: 3, onBack },
    h(SectionIntro, {
      label: "Starting point",
      title: "Where do you want to keep more promises?",
      copy: "Choose the areas of life where you want to become someone who follows through."
    }),
    h(
      "div",
      { className: "mt-10 grid grid-cols-2 gap-3" },
      onboardingAreas.map((area) => h(SelectableCard, { key: area, label: area, selected: selectedAreas.includes(area), onClick: () => onToggleArea(area) }))
    ),
    h("div", { className: "mt-auto pt-10" }, h(PrimaryButton, { onClick: onContinue }, "Continue"))
  );
}

function BuilderGoalScreen({ builderGoalDraft, error, onGoalChange, onContinue, onBack }) {
  const examples = ["Launch my business", "Lose 20 pounds", "Become disciplined", "Become financially free", "Build confidence", "Run my first marathon"];

  return h(
    Screen,
    { step: 4, onBack },
    h(SectionIntro, {
      label: "Direction",
      title: "What are you building toward?",
      copy: "Describe the future you're working toward."
    }),
    h(
      "div",
      { className: "mt-8 grid gap-3" },
      h("input", {
        className: "promise-input",
        value: builderGoalDraft,
        placeholder: "Launch my first business",
        onChange: (event) => onGoalChange(event.target.value),
        "aria-label": "Builder Goal"
      }),
      error && h("p", { className: "text-sm font-medium text-white/45" }, error)
    ),
    h(
      "div",
      { className: "mt-7 rounded-lg border border-white/10 bg-white/[0.035] p-4" },
      h("p", { className: "text-xs uppercase tracking-[0.18em] text-white/35" }, "Examples"),
      h("div", { className: "mt-4 flex flex-wrap gap-2" }, examples.map((example) => h("button", { key: example, className: "evidence-chip", type: "button", onClick: () => onGoalChange(example) }, example)))
    ),
    h("div", { className: "mt-auto pt-10" }, h(PrimaryButton, { onClick: onContinue }, "Continue"))
  );
}

function SelectableCard({ label, selected, onClick }) {
  return h(
    "button",
    {
      type: "button",
      onClick,
      className: [
        "card-press min-h-[96px] rounded-lg border px-4 py-4 text-left transition duration-200 focus:outline-none focus:ring-4 focus:ring-midnight-300/15",
        selected
          ? "border-midnight-300/80 bg-midnight-500/20 text-white shadow-[inset_0_0_0_1px_rgba(111,147,200,0.18)]"
          : "border-white/10 bg-white/[0.035] text-white/72 hover:border-white/20 hover:bg-white/[0.055]"
      ].join(" ")
    },
    h("span", { className: "mb-5 block h-1.5 w-1.5 rounded-full " + (selected ? "bg-midnight-300" : "bg-white/25") }),
    h("span", { className: "block text-[0.98rem] font-semibold" }, label)
  );
}

function AssessmentScreen({ trustScore, onScoreChange, onContinue, onBack }) {
  const scoreLabel = getTrustLabel(trustScore);

  return h(
    Screen,
    { step: 5, onBack },
    h(
      "div",
      { className: "pt-12" },
      h("p", { className: "mb-4 text-xs font-medium uppercase tracking-[0.22em] text-midnight-300" }, "Assessment"),
      h("h1", { className: "headline-enter text-[2.08rem] font-semibold leading-[1.04] tracking-[-0.01em]" }, "How much do you trust yourself today?"),
      h(
        "div",
        { className: "mt-5 grid max-w-[315px] gap-3 text-[0.96rem] leading-6 text-white/55" },
        h("p", null, "Think about the last promise you made to yourself."),
        h("p", null, "Did you keep it?"),
        h("p", null, "Now answer honestly. How much do you trust yourself today?")
      )
    ),
    h(
      "div",
      { className: "mt-11 rounded-lg border border-white/10 bg-white/[0.035] p-5" },
      h("p", { className: "text-[1.02rem] font-medium leading-7 text-white/88" }, '"When I make a promise to myself, I follow through."'),
      h(
        "div",
        { className: "mt-8 flex items-end justify-between" },
        h("div", null, h("p", { className: "text-xs uppercase tracking-[0.2em] text-white/35" }, "Self-Trust Score"), h("p", { key: scoreLabel, className: "score-label mt-2 text-sm font-medium text-midnight-300" }, scoreLabel)),
        h("strong", { key: trustScore, className: "score-number text-7xl font-semibold leading-none tracking-[-0.04em]" }, trustScore)
      ),
      h("input", {
        className: "trust-range mt-8 w-full",
        type: "range",
        min: "1",
        max: "10",
        value: trustScore,
        onChange: (event) => onScoreChange(Number(event.target.value)),
        "aria-label": "Self-trust rating"
      }),
      h("div", { className: "mt-3 flex justify-between text-xs font-medium text-white/32" }, h("span", null, "1"), h("span", null, "10"))
    ),
    h("div", { className: "mt-auto pt-10" }, h(PrimaryButton, { onClick: onContinue }, "Continue"), h("p", { className: "mt-5 text-center text-xs leading-5 text-white/42" }, "Your score can change. Evidence builds trust."))
  );
}

function DayStyleScreen({ dayStyle, onChooseStyle, onBack }) {
  return h(
    Screen,
    { step: 6, onBack },
    h(SectionIntro, {
      label: "Today",
      title: "What kind of Builder do you need to be today?",
      copy: "We'll help you build today's plan."
    }),
    h(
      "div",
      { className: "mt-10 grid grid-cols-2 gap-3" },
      dayStyleOptions.map((style) =>
        h(SelectableCard, {
          key: style,
          label: style,
          selected: dayStyle === style,
          onClick: () => onChooseStyle(style)
        })
      )
    )
  );
}

function getHomeActionLabel(completedCount) {
  if (completedCount === 0) return "Begin Today";
  if (completedCount === 1) return "Continue Today";
  if (completedCount === 2) return "Finish Today";
  return "Review Today";
}

function DashboardScreen({ greeting, builderGoal, dayStyle, trustScore, selfTrustLabel, builderScore, currentStreak, evidenceCount, dailyPromisesKept, promises, evidenceEntries, onSelectPromise, onBeginToday, onReset, onBack }) {
  const isComplete = dailyPromisesKept === 3;
  const homeActionLabel = getHomeActionLabel(dailyPromisesKept);
  const missionLabel = isComplete ? "Mission Complete" : "Today's Mission";
  const recentEvidence = evidenceEntries.slice(0, 2);

  return h(
    Screen,
    { step: 8, onBack, withBottomNav: true },
    h(
      "div",
      { className: "home-hero flex flex-col pt-10" },
      h("p", { className: "text-[0.72rem] font-medium uppercase tracking-[0.22em] text-midnight-300" }, "Builder Dashboard"),
      h("h1", { className: "headline-enter mt-4 text-[2.18rem] font-semibold leading-[1.02] tracking-[-0.02em]" }, greeting.greeting),
      greeting.status && h("p", { className: "mt-3 text-sm font-medium text-white/42" }, greeting.status),
      h(
        "div",
        { className: "mt-12 rounded-lg border border-white/10 bg-white/[0.035] p-6" },
        h("p", { className: "text-xs uppercase tracking-[0.18em] text-white/35" }, missionLabel),
        h("p", { className: "mt-4 text-[1.36rem] font-semibold leading-8 tracking-[-0.02em] text-white" }, builderGoal || "Set your Builder Goal."),
        dayStyle && h("p", { className: "mt-5 text-sm font-medium text-midnight-300" }, dayStyle)
      ),
      h(
        "div",
        { className: "mt-8" },
        h(PrimaryButton, { onClick: onBeginToday }, homeActionLabel)
      ),
      h(
        "div",
        { className: "mt-8 rounded-lg border border-midnight-300/20 bg-midnight-500/10 p-5" },
        h("p", { className: "text-xs uppercase tracking-[0.18em] text-white/35" }, "Today's Progress"),
        h("p", { className: "mt-3 text-4xl font-semibold tracking-[-0.04em] text-white" }, `${dailyPromisesKept}/3`),
        isComplete && h("p", { className: "mt-2 text-sm font-semibold text-midnight-300" }, "Promises Kept")
      )
    ),
    h(
      "div",
      { className: "mt-12 grid gap-10" },
      h(
        "section",
        null,
        h("h2", { className: "text-sm font-semibold uppercase tracking-[0.16em] text-white/45" }, "Today's Promises"),
        promises.length
          ? h(
              "div",
              { className: "mt-3 grid gap-3" },
              promises.map((promise) =>
                h(PromiseRow, { key: promise.id, promise, checked: promise.completed, onClick: isComplete ? null : () => onSelectPromise(promise.id) })
              )
            )
          : h(EmptyState, { title: "No Promises", copy: "Create today's three promises." })
      ),
      h(
        "section",
        null,
        h("h2", { className: "text-sm font-semibold uppercase tracking-[0.16em] text-white/45" }, "Builder Metrics"),
        h(
          "div",
          { className: "mt-3 grid grid-cols-2 gap-3" },
          h(StatCard, { label: "Self-Trust", value: trustScore, detail: selfTrustLabel, hero: true }),
          h(StatCard, { label: "Promises Kept", value: `${dailyPromisesKept}/3` }),
          h(StatCard, { label: "Builder Score", value: builderScore }),
          h(StatCard, { label: "Current Streak", value: currentStreak }),
          h(StatCard, { label: "Evidence Collected", value: evidenceCount })
        )
      ),
      h(
        "section",
        null,
        h("h2", { className: "text-sm font-semibold uppercase tracking-[0.16em] text-white/45" }, "Recent Evidence"),
        recentEvidence.length
          ? h("div", { className: "mt-3 grid gap-3" }, recentEvidence.map((entry) => h(EvidenceEntryCard, { key: entry.id, entry })))
          : h(EmptyState, { title: "No evidence yet.", copy: "Keep one promise to begin the record." })
      )
    ),
    h("button", { className: "mt-6 text-left text-xs font-semibold text-white/30 transition hover:text-white/50", type: "button", onClick: onReset }, "Reset Prototype")
  );
}

function PromisesScreen({
  promises,
  suggestions,
  message,
  isLocked,
  hasSeenDashboard,
  dailyPromisesKept,
  dayStyle,
  onUpdatePromise,
  onUseSuggestion,
  onValidatePromises,
  onStartPromise,
  onBack
}) {
  const isChoosingPromise = hasSeenDashboard;

  return h(
    Screen,
    { step: 7, onBack, withBottomNav: true },
    h(SectionIntro, {
      label: "Today",
      title: isChoosingPromise ? "Choose today's promise." : "Today's Promises",
      copy: isChoosingPromise ? "Select one. Enter Focus Mode." : dayStyle ? `Starting points for ${dayStyle}. Edit anything until the promises are yours.` : "Choose a Builder style first."
    }),
    isChoosingPromise &&
      h(
        "div",
        { className: "mt-8 grid gap-3" },
        promises.length
          ? promises.map((promise) =>
              h(PromiseChoiceCard, {
                key: promise.id,
                promise,
                completed: promise.completed,
                onClick: () => onStartPromise(promise.id)
              })
            )
          : h(EmptyState, { title: "No Promises", copy: "Create today's three promises first." }),
        h(
          "div",
          { className: "mt-4 rounded-lg border border-midnight-300/20 bg-midnight-500/10 p-4" },
          h("p", { className: "text-xs uppercase tracking-[0.18em] text-white/35" }, "Today"),
          h("p", { className: "mt-2 text-2xl font-semibold tracking-[-0.03em] text-white" }, `${dailyPromisesKept}/3`)
        )
      ),
    !isChoosingPromise &&
      h(
        React.Fragment,
        null,
        h(
          "div",
          { className: "mt-7 rounded-lg border border-white/10 bg-white/[0.035] p-4" },
          h("p", { className: "text-xs uppercase tracking-[0.18em] text-white/35" }, "Today's Style"),
          h("p", { className: "mt-2 text-lg font-semibold text-white/84" }, dayStyle || "Choose a style")
        ),
        dayStyle &&
          h(
            "div",
            { className: "mt-5 rounded-lg border border-white/10 bg-white/[0.035] p-4" },
            h("p", { className: "text-xs uppercase tracking-[0.18em] text-white/35" }, "Guided suggestions"),
            h(
              "div",
              { className: "mt-4 grid gap-2" },
              suggestions.map((suggestion) =>
                h(
                  "button",
                  {
                    key: suggestion.title,
                    className: "suggestion-button card-press",
                    type: "button",
                    onClick: () => onUseSuggestion(suggestion)
                  },
                  h("span", { className: "block text-sm font-semibold text-white/84" }, suggestion.title),
                  h("span", { className: "mt-1 block text-xs text-white/38" }, `${suggestion.category} / ${suggestion.estimate}`)
                )
              )
            )
          )
      ),
    h(
      "div",
      { className: `${isChoosingPromise ? "hidden" : "mt-5 grid gap-3"}` },
      promises.map((promise, index) =>
        h(
          "div",
          { key: promise.id, className: `promise-card rounded-lg border border-white/10 bg-white/[0.035] p-3 ${promise.completed ? "completed" : ""}` },
          h("label", { className: "mb-2 block text-xs uppercase tracking-[0.16em] text-white/30", htmlFor: `promise-${promise.id}` }, `Promise ${index + 1}`),
          h("input", {
            id: `promise-${promise.id}`,
            className: "promise-input",
            value: promise.title,
            placeholder: "Write a clear promise",
            onChange: (event) => onUpdatePromise(promise.id, "title", event.target.value),
            "aria-label": `Promise ${index + 1}`
          }),
          h(
            "div",
            { className: "mt-3 grid grid-cols-2 gap-2" },
            h(SelectControl, {
              label: "Category",
              value: promise.category,
              options: promiseCategories,
              onChange: (value) => onUpdatePromise(promise.id, "category", value)
            }),
            h(SelectControl, {
              label: "Time",
              value: promise.estimate,
              options: estimateOptions,
              onChange: (value) => onUpdatePromise(promise.id, "estimate", value)
            })
          ),
          promise.completed && h("p", { className: "mt-3 text-xs font-semibold uppercase tracking-[0.14em] text-midnight-300" }, "Evidence Added"),
          !promise.completed && h("p", { className: "mt-3 text-xs leading-5 text-white/35" }, "Fill every field before beginning.")
        )
      )
    ),
    !isChoosingPromise &&
      h(
        "div",
        { className: "mt-4 grid gap-3" },
        isLocked && h("p", { className: "text-center text-xs font-medium uppercase tracking-[0.16em] text-midnight-300" }, "Today's commitments are locked."),
        message && h("p", { className: "text-center text-xs font-medium leading-5 text-white/42" }, message),
        h(PrimaryButton, { onClick: onValidatePromises }, "Continue to Dashboard")
      )
  );
}

function PromiseChoiceCard({ promise, completed, onClick }) {
  return h(
    "button",
    {
      type: "button",
      onClick,
      className: `promise-choice-card card-press ${completed ? "completed" : ""}`
    },
    h("span", { className: "block text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-white/32" }, completed ? "Completed" : "Start This Promise"),
    h("span", { className: "mt-3 block text-[1.12rem] font-semibold leading-6 text-white/88" }, promise.title || "Untitled promise"),
    h("span", { className: "mt-4 block text-sm font-medium text-white/42" }, `${promise.category || "Category"} / ${promise.estimate || "Time"}`)
  );
}

function SelectControl({ label, value, options, onChange }) {
  return h(
    "label",
    { className: "block" },
    h("span", { className: "mb-1 block text-[0.64rem] uppercase tracking-[0.14em] text-white/28" }, label),
    h(
      "select",
      { className: `promise-select ${value ? "" : "is-empty"}`, value, onChange: (event) => onChange(event.target.value) },
      h("option", { value: "" }, label === "Time" ? "Estimated time" : "Category"),
      options.map((option) => h("option", { key: option, value: option }, option))
    )
  );
}

function PromiseSessionScreen({ promise, onComplete, onExitFocus, onBack }) {
  return h(
    Screen,
    { step: 9, onBack },
    h(
      "div",
      { className: "focus-mode flex flex-1 flex-col justify-center py-12" },
      h("p", { className: "mb-4 text-xs font-medium uppercase tracking-[0.22em] text-midnight-300" }, "Current Promise"),
      h("h1", { className: "headline-enter text-[2.32rem] font-semibold leading-[1.02] tracking-[-0.02em]" }, promise.title),
      h("p", { className: "mt-6 text-sm font-semibold uppercase tracking-[0.18em] text-white/35" }, "Estimated Time"),
      h("p", { className: "mt-3 text-[1.16rem] font-semibold text-white/82" }, promise.estimate || "Today")
    ),
    h(
      "div",
      { className: "mt-auto grid gap-3" },
      h(PrimaryButton, { onClick: onComplete }, "Complete Promise"),
      h(SecondaryButton, { onClick: onExitFocus }, "Back")
    )
  );
}

function PromiseKeptScreen({ onBack }) {
  return h(
    Screen,
    { step: 10, onBack },
    h(
      "div",
      { className: "success-state flex flex-1 flex-col items-center justify-center text-center" },
      h("div", { className: "success-mark" }, "✓"),
      h("h1", { className: "mt-5 text-3xl font-semibold tracking-[-0.02em]" }, "Promise Kept")
    )
  );
}

function EvidenceScreen({ selectedChips, reflection, onToggleChip, onReflectionChange, onSaveEvidence, onBack }) {
  return h(
    Screen,
    { step: 10, onBack },
    h(
      "div",
      { className: "pt-12" },
      h("p", { className: "mb-4 text-xs font-medium uppercase tracking-[0.22em] text-midnight-300" }, "Evidence Added"),
      h("h1", { className: "headline-enter text-[2.22rem] font-semibold leading-[1.03] tracking-[-0.02em]" }, "You kept your word."),
      h(
        "p",
        { className: "mt-5 text-[0.96rem] leading-7 text-white/58" },
        "Every promise you keep becomes evidence. Every piece of evidence rebuilds self-trust."
      )
    ),
    h(
      "div",
      { className: "mt-8" },
      h("p", { className: "text-sm font-medium leading-6 text-white/78" }, "What did this promise prove?"),
      h(
        "div",
        { className: "mt-4 flex flex-wrap gap-2" },
        evidenceChips.map((chip) =>
          h(
            "button",
            {
              key: chip,
              className: `evidence-chip ${selectedChips.includes(chip) ? "selected" : ""}`,
              type: "button",
              onClick: () => onToggleChip(chip)
            },
            chip
          )
        )
      ),
      h("textarea", {
        className: "journal-field mt-5",
        rows: 6,
        placeholder: "Write your evidence...",
        value: reflection,
        onChange: (event) => onReflectionChange(event.target.value)
      })
    ),
    h("div", { className: "mt-auto pt-8" }, h(PrimaryButton, { onClick: onSaveEvidence }, "Save Evidence"))
  );
}

function PrepareTomorrowScreen({
  promisesKept,
  trustScore,
  selfTrustLabel,
  builderScore,
  currentStreak,
  evidenceCount,
  builderGoal,
  dayStyle,
  closingReflection,
  onReflectionChange,
  onPrepareTomorrow,
  onSkip,
  onBack
}) {
  return h(
    Screen,
    { step: 11, onBack },
    h(
      "div",
      { className: "pt-12" },
      h("p", { className: "mb-4 text-xs font-medium uppercase tracking-[0.22em] text-midnight-300" }, "Builder Report"),
      h("h1", { className: "headline-enter text-[2.22rem] font-semibold leading-[1.03] tracking-[-0.02em]" }, "What did today prove about you?"),
      h(
        "div",
        { className: "mt-8 grid grid-cols-2 gap-3" },
        h(StatCard, { label: "Today's Goal", value: builderGoal || "Unset", hero: true }),
        h(StatCard, { label: "Today's Style", value: dayStyle || "Unset" }),
        h(StatCard, { label: "Promises Completed", value: `${promisesKept}/3` }),
        h(StatCard, { label: "Evidence Created", value: promisesKept }),
        h(StatCard, { label: "Builder Score", value: builderScore }),
        h(StatCard, { label: "Self-Trust", value: trustScore, detail: selfTrustLabel }),
        h(StatCard, { label: "Current Streak", value: currentStreak })
      ),
      h(
        "div",
        { className: "mt-8 rounded-lg border border-white/10 bg-white/[0.035] p-5" },
        h("label", { className: "text-xs uppercase tracking-[0.18em] text-white/35", htmlFor: "closingReflection" }, "Reflection"),
        h("p", { className: "mt-3 text-[1rem] font-medium leading-7 text-white/82" }, "What did today prove about you?"),
        h("textarea", {
          id: "closingReflection",
          className: "journal-field mt-4",
          rows: 4,
          placeholder: "Write the evidence you want to remember...",
          value: closingReflection,
          onChange: (event) => onReflectionChange(event.target.value)
        }),
        h("p", { className: "mt-5 text-sm font-medium leading-6 text-white/48" }, "Would you like to prepare tomorrow?")
      )
    ),
    h(
      "div",
      { className: "mt-auto grid gap-3 pt-8" },
      h(PrimaryButton, { onClick: onPrepareTomorrow }, "Prepare Tomorrow"),
      h(SecondaryButton, { onClick: onSkip }, "Skip")
    )
  );
}

function TomorrowPromisesScreen({ promises, dayStyle, onUpdatePromise, onDone, onBack }) {
  return h(
    Screen,
    { step: 11, onBack },
    h(SectionIntro, {
      label: "Tomorrow",
      title: "Prepare tomorrow.",
      copy: "These promises are locked until tomorrow. You cannot complete them today."
    }),
    h(
      "div",
      { className: "mt-7 rounded-lg border border-white/10 bg-white/[0.035] p-4" },
      h("p", { className: "text-xs uppercase tracking-[0.18em] text-white/35" }, "Tomorrow's Style"),
      h("p", { className: "mt-2 text-lg font-semibold text-white/84" }, dayStyle || "Not selected")
    ),
    h(
      "div",
      { className: "mt-5 grid gap-3" },
      promises.map((promise, index) =>
        h(
          "div",
          { key: promise.id, className: "promise-card rounded-lg border border-white/10 bg-white/[0.035] p-3" },
          h("label", { className: "mb-2 block text-xs uppercase tracking-[0.16em] text-white/30", htmlFor: `tomorrow-promise-${promise.id}` }, `Promise ${index + 1}`),
          h("input", {
            id: `tomorrow-promise-${promise.id}`,
            className: "promise-input",
            value: promise.title,
            placeholder: "Write tomorrow's promise",
            onChange: (event) => onUpdatePromise(promise.id, "title", event.target.value),
            "aria-label": `Tomorrow promise ${index + 1}`
          }),
          h(
            "div",
            { className: "mt-3 grid grid-cols-2 gap-2" },
            h(SelectControl, {
              label: "Category",
              value: promise.category,
              options: promiseCategories,
              onChange: (value) => onUpdatePromise(promise.id, "category", value)
            }),
            h(SelectControl, {
              label: "Time",
              value: promise.estimate,
              options: estimateOptions,
              onChange: (value) => onUpdatePromise(promise.id, "estimate", value)
            })
          ),
          h("p", { className: "mt-3 text-xs font-semibold uppercase tracking-[0.14em] text-midnight-300" }, "Locked until tomorrow")
        )
      )
    ),
    h("div", { className: "mt-auto pt-8" }, h(PrimaryButton, { onClick: onDone }, "Return to Dashboard"))
  );
}

function EvidenceTimelineScreen({ evidenceEntries, onBack }) {
  return h(
    Screen,
    { onBack, withBottomNav: true },
    h(SectionIntro, {
      label: "Evidence",
      title: "Evidence",
      copy: "A record of promises kept."
    }),
    h(
      "div",
      { className: "mt-10 grid gap-5" },
      evidenceEntries.length
        ? evidenceEntries.map((entry) => h(EvidenceEntryCard, { key: entry.id, entry }))
        : h(EmptyState, { title: "No evidence yet.", copy: "Keep your first promise to begin the record." })
    ),
  );
}

function EvidenceEntryCard({ entry }) {
  return h(
    "article",
    { className: "evidence-entry rounded-lg border border-white/10 bg-white/[0.035] p-6" },
    h("p", { className: "text-[1.05rem] font-medium leading-7 text-white/78" }, entry.reflection || "Evidence saved. You kept the promise."),
    h("h2", { className: "mt-5 text-sm font-semibold leading-6 text-white/88" }, entry.promiseTitle),
    entry.selectedEvidenceChips?.length
      ? h(
          "div",
          { className: "mt-4 flex flex-wrap gap-2" },
          entry.selectedEvidenceChips.map((chip) => h("span", { key: chip, className: "evidence-pill" }, chip))
        )
      : null,
    h(
      "div",
      { className: "mt-6 flex flex-wrap gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-white/35" },
      h("span", null, `${entry.date}${entry.time ? ` / ${entry.time}` : ""}`),
      h("span", null, "/"),
      entry.dayStyle && h("span", null, entry.dayStyle),
      entry.dayStyle && h("span", null, "/"),
      h("span", null, entry.category || "Uncategorized"),
      h("span", null, "/"),
      h("span", null, entry.estimatedTime || "No estimate")
    ),
    entry.builderGoal && h("p", { className: "mt-4 text-xs leading-5 text-white/35" }, `Building toward: ${entry.builderGoal}`)
  );
}

function EmptyState({ title, copy }) {
  return h(
    "div",
    { className: "mt-6 rounded-lg border border-white/10 bg-white/[0.025] p-5 text-center" },
    h("p", { className: "text-sm font-semibold text-white/76" }, title),
    h("p", { className: "mt-2 text-sm leading-6 text-white/42" }, copy)
  );
}

function ProfileScreen({ userName, builderSince, builderGoal, identityLabel, evidenceCount, promisesKept, currentStreak, onBack }) {
  return h(
    Screen,
    { onBack, withBottomNav: true },
    h(SectionIntro, {
      label: "Identity",
      title: "Builder Profile",
      copy: "The story your evidence is writing."
    }),
    h(
      "div",
      { className: "profile-story-card mt-10 rounded-lg border border-white/10 bg-white/[0.035] p-6" },
      h("p", { className: "text-xs uppercase tracking-[0.18em] text-white/35" }, "Current Identity"),
      h("h2", { className: "mt-4 text-[1.6rem] font-semibold leading-8 tracking-[-0.02em] text-white" }, identityLabel),
      h("p", { className: "mt-5 text-sm leading-6 text-white/52" }, `${userName || "Builder"} is building toward ${builderGoal || "a clear Builder Goal"}.`)
    ),
    h(
      "div",
      { className: "mt-8 grid gap-3" },
      h(ProfileStoryRow, { label: "Builder Since", value: builderSince }),
      h(ProfileStoryRow, { label: "Current Goal", value: builderGoal || "No Builder Goal" }),
      h(ProfileStoryRow, { label: "Current Streak", value: `${currentStreak} ${currentStreak === 1 ? "day" : "days"}` }),
      h(ProfileStoryRow, { label: "Lifetime Promises", value: promisesKept }),
      h(ProfileStoryRow, { label: "Evidence Collected", value: evidenceCount })
    )
  );
}

function ProfileStoryRow({ label, value }) {
  return h(
    "div",
    { className: "profile-story-row flex items-center justify-between gap-5 rounded-lg border border-white/10 bg-white/[0.03] p-4" },
    h("p", { className: "text-sm font-medium text-white/48" }, label),
    h("p", { className: "text-right text-sm font-semibold text-white/84" }, value)
  );
}

function SettingsScreen({ nameDraft, nameError, onNameChange, onSaveName, onReset, onBack }) {
  return h(
    Screen,
    { onBack, withBottomNav: true },
    h(SectionIntro, {
      label: "Settings",
      title: "Settings",
      copy: "Keep the system clean and personal."
    }),
    h(
      "div",
      { className: "mt-8 grid gap-5" },
      h(
        "div",
        { className: "rounded-lg border border-white/10 bg-white/[0.035] p-4" },
        h("p", { className: "text-xs uppercase tracking-[0.18em] text-white/35" }, "Profile"),
        h("input", {
          className: "promise-input mt-3",
          value: nameDraft,
          placeholder: "First name",
          onChange: (event) => onNameChange(event.target.value),
          "aria-label": "Edit name"
        }),
        nameError && h("p", { className: "mt-2 text-xs text-white/45" }, nameError),
        h("div", { className: "mt-3" }, h(SecondaryButton, { onClick: onSaveName }, "Edit Name"))
      ),
      h(
        "div",
        { className: "rounded-lg border border-white/10 bg-white/[0.035] p-4" },
        h("p", { className: "text-xs uppercase tracking-[0.18em] text-white/35" }, "Prototype"),
        h("button", { className: "mt-3 text-sm font-semibold text-white/55 transition hover:text-white/78", type: "button", onClick: onReset }, "Reset Prototype")
      ),
      h(
        "div",
        { className: "rounded-lg border border-white/10 bg-white/[0.035] p-4" },
        h("p", { className: "text-xs uppercase tracking-[0.18em] text-white/35" }, "About"),
        h("p", { className: "mt-3 text-sm font-semibold text-white/82" }, "VERAKAI Alpha v0.1"),
        h("p", { className: "mt-2 text-sm leading-6 text-white/52" }, "Helping ambitious young men keep promises to themselves.")
      )
    )
  );
}

function BottomNav({ activeScreen, onNavigate }) {
  const items = [
    { id: "dashboard", icon: "🏠", label: "Home" },
    { id: "timeline", icon: "📖", label: "Evidence" },
    { id: "profile", icon: "👤", label: "Profile" },
    { id: "settings", icon: "⚙️", label: "Settings" }
  ];

  return h(
    "nav",
    { className: "bottom-nav", "aria-label": "Main navigation" },
    items.map((item) => {
      const isActive = item.id === activeScreen || (item.id === "dashboard" && activeScreen === "promises");
      return h(
        "button",
        {
          key: item.id,
          className: `bottom-nav-item ${isActive ? "active" : ""}`,
          type: "button",
          onClick: () => onNavigate(item.id)
        },
        h("span", { className: "bottom-nav-icon", "aria-hidden": true }, item.icon),
        h("span", { className: "bottom-nav-dot" }),
        h("span", null, item.label)
      );
    })
  );
}

function formatElapsed(totalSeconds) {
  const minutes = String(Math.floor(totalSeconds / 60)).padStart(2, "0");
  const seconds = String(totalSeconds % 60).padStart(2, "0");
  return `${minutes}:${seconds}`;
}

ReactDOM.createRoot(document.getElementById("root")).render(h(App));
