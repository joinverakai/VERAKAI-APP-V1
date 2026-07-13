const { useEffect, useMemo, useState } = React;
const h = React.createElement;

const storageKey = "verakai-prototype-state-v5";
const installDismissalKey = "verakai-ios-install-dismissed-v1";
const appVersion = "alpha-0.1";
const analyticsPropertyAllowlist = {
  app_opened: ["returning_user"],
  onboarding_step_completed: ["step_name", "step_number"],
  starting_point_selected: ["area_category", "selection_action", "selected_count"],
  builder_goal_set: ["goal_category"],
  onboarding_completed: ["goal_category", "starting_point_count"],
  suggestions_viewed: ["goal_category", "suggestion_group"],
  suggestion_used: ["goal_category", "promise_category", "suggestion_position"],
  promise_saved: ["source", "promise_category", "time_estimate"],
  daily_promises_confirmed: ["promise_count"],
  focus_started: ["promise_category", "time_estimate"],
  promise_completed: ["promise_category", "focus_duration_seconds"],
  evidence_saved: ["promise_category", "has_reflection", "evidence_chip_count", "completed_today"],
  dashboard_viewed: ["completed_today", "evidence_count"],
  journey_viewed: ["evidence_count", "promises_kept"],
  day_completed: ["completed_count", "goal_category"],
  app_error: ["screen_name", "error_type"],
  install_prompt_shown: ["platform", "install_method"],
  install_started: ["platform", "install_method"],
  install_dismissed: ["platform", "install_method"],
  app_installed: ["platform", "install_method"],
  standalone_opened: ["platform", "install_method"]
};

function isStandaloneApp() {
  return window.matchMedia?.("(display-mode: standalone)").matches || window.navigator.standalone === true;
}

function getInstallPlatform() {
  const userAgent = window.navigator.userAgent || "";
  if (/iPhone|iPad|iPod/.test(userAgent) || (window.navigator.platform === "MacIntel" && window.navigator.maxTouchPoints > 1)) return "ios";
  if (/Android/.test(userAgent)) return "android";
  return "desktop";
}

function isIosSafari() {
  const userAgent = window.navigator.userAgent || "";
  return getInstallPlatform() === "ios" && /Safari/.test(userAgent) && !/CriOS|FxiOS|EdgiOS|OPiOS/.test(userAgent);
}

function trackEvent(eventName, properties = {}) {
  try {
    if (!window.posthog || typeof window.posthog.capture !== "function") return;
    const allowedProperties = analyticsPropertyAllowlist[eventName] || [];
    const safeProperties = allowedProperties.reduce((safe, key) => {
      if (Object.prototype.hasOwnProperty.call(properties, key)) safe[key] = properties[key];
      return safe;
    }, {});
    window.posthog.capture(eventName, {
      app_version: appVersion,
      viewport_width: window.innerWidth,
      viewport_height: window.innerHeight,
      ...safeProperties
    });
  } catch {
    // Analytics must never interrupt the product experience.
  }
}
const onboardingAreas = ["Fitness", "Business", "Consistency", "Confidence", "Money", "Purpose", "Other"];
const promiseCategories = ["Fitness", "Business", "Discipline", "Focus", "Confidence", "Learning", "Money", "Purpose", "Relationships", "Health"];
const estimateOptions = ["10 min", "20 min", "30 min", "60 min", "2 hr", "Today"];
const goalSuggestionGroups = {
  business: [
    ["Build for 60 minutes", "Business", "60 min"],
    ["Reach out to 5 prospects", "Business", "30 min"],
    ["Finish one important feature", "Business", "60 min"],
    ["Write the next sales message", "Business", "20 min"],
    ["Review today's business priorities", "Business", "10 min"]
  ],
  fitness: [
    ["Lift for 45 minutes", "Fitness", "60 min"],
    ["Walk 10,000 steps", "Fitness", "Today"],
    ["Hit protein goal", "Health", "Today"],
    ["Prepare a healthy meal", "Health", "30 min"],
    ["Sleep before 10:30", "Health", "Today"]
  ],
  running: [
    ["Complete today's training run", "Fitness", "60 min"],
    ["Walk for 10 minutes after the run", "Health", "10 min"],
    ["Stretch your calves and hips", "Health", "10 min"],
    ["Review your next run", "Fitness", "10 min"],
    ["Set out your running gear", "Discipline", "10 min"]
  ],
  discipline: [
    ["Complete one difficult task", "Discipline", "60 min"],
    ["Keep your phone away for one hour", "Focus", "60 min"],
    ["Wake up on time", "Discipline", "Today"],
    ["Work in one distraction-free block", "Focus", "30 min"],
    ["Finish before you rest", "Discipline", "Today"]
  ],
  confidence: [
    ["Start one conversation", "Relationships", "10 min"],
    ["Say what you mean once", "Confidence", "10 min"],
    ["Practice your introduction", "Confidence", "10 min"],
    ["Send the message you have avoided", "Confidence", "10 min"],
    ["Write down one win", "Confidence", "10 min"]
  ],
  money: [
    ["Review every purchase today", "Money", "20 min"],
    ["Transfer money to savings", "Money", "10 min"],
    ["Check your account balances", "Money", "10 min"],
    ["Learn one money skill", "Learning", "20 min"],
    ["Plan tomorrow's spending", "Money", "10 min"]
  ],
  purpose: [
    ["Write for 20 minutes", "Purpose", "20 min"],
    ["Read something that expands you", "Learning", "20 min"],
    ["Take a quiet walk", "Purpose", "20 min"],
    ["Name one value to live by today", "Purpose", "10 min"],
    ["Reflect before bed", "Purpose", "10 min"]
  ],
  custom: [
    ["Finish one important task", "Focus", "60 min"],
    ["Move your body", "Fitness", "30 min"],
    ["Reach out to one person", "Relationships", "10 min"],
    ["Review your money", "Money", "20 min"],
    ["Plan tomorrow", "Purpose", "10 min"]
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
  return [1, 2, 3].map((id) => ({ id, title: "", category: "", estimate: "", source: "custom", completed: false }));
}

function getSuggestionKeyFromText(value) {
  const text = String(value || "").trim().toLowerCase();
  if (!text) return "";
  if (/(run|running|marathon|endurance|race|miles?)/.test(text)) return "running";
  if (/(business|career|company|launch|startup|sales|client|prospect|work|job)/.test(text)) return "business";
  if (/(lose|weight|fitness|pounds?|health|workout|exercise|lift|protein|strength)/.test(text)) return "fitness";
  if (/(discipline|disciplined|consisten|focus|procrastination|routine|habit|productive)/.test(text)) return "discipline";
  if (/(confidence|confident|social|friend|dating|conversation|speak|presentation)/.test(text)) return "confidence";
  if (/(money|financial|finance|wealth|debt|budget|saving|invest|income)/.test(text)) return "money";
  if (/(purpose|meaning|personal growth|growth|values|direction|self.discovery)/.test(text)) return "purpose";
  return "";
}

function getGoalSuggestionKey(builderGoal = "", selectedAreas = [], customOtherArea = "") {
  const goalMatch = getSuggestionKeyFromText(builderGoal);
  if (goalMatch) return goalMatch;

  const selectedAreaMatch = selectedAreas
    .map((area) => getSuggestionKeyFromText(area))
    .find(Boolean);
  if (selectedAreaMatch) return selectedAreaMatch;

  const customAreaMatch = getSuggestionKeyFromText(customOtherArea);
  return customAreaMatch || "custom";
}

function createSuggestedPromises(builderGoal, selectedAreas = [], customOtherArea = "") {
  const suggestions = goalSuggestionGroups[getGoalSuggestionKey(builderGoal, selectedAreas, customOtherArea)];
  return suggestions.map(([title, category, estimate]) => ({
    title,
    category,
    estimate
  }));
}

function applySuggestionToPromises(promises, suggestion, promiseId) {
  const next = promises.length ? [...promises] : createBlankPromises();
  const targetIndex = promiseId ? next.findIndex((promise) => promise.id === promiseId) : next.findIndex((promise) => !promise.title.trim());
  const index = targetIndex === -1 ? 0 : targetIndex;
  next[index] = {
    ...next[index],
    title: suggestion.title,
    category: suggestion.category,
    estimate: suggestion.estimate,
    source: "suggested",
    completed: false
  };
  return next;
}

function createTomorrowSuggestions(builderGoal, selectedAreas, customOtherArea) {
  return createSuggestedPromises(builderGoal, selectedAreas, customOtherArea).slice(0, 3).map((suggestion, index) => ({
    id: index + 1,
    ...suggestion,
    completed: false
  }));
}

function getDaySuggestions(builderGoal, selectedAreas, customOtherArea) {
  return createSuggestedPromises(builderGoal, selectedAreas, customOtherArea);
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

function getEntryDateKey(entry) {
  return entry.completionTimestamp ? getLocalDateKey(new Date(entry.completionTimestamp)) : entry.date;
}

function getJourneyDays(evidenceEntries) {
  return evidenceEntries.reduce((days, entry) => {
    const key = getEntryDateKey(entry);
    const existing = days[key] || {
      dateKey: key,
      date: entry.date,
      builderGoal: entry.builderGoal,
      promises: [],
      reflections: [],
      completionTime: entry.time,
      completionRate: entry.completionRate || "1/3"
    };
    const completedCount = Math.max(existing.promises.length + 1, Number.parseInt(entry.completionRate, 10) || 1);
    days[key] = {
      ...existing,
      builderGoal: entry.builderGoal || existing.builderGoal,
      promises: [...existing.promises, entry.promiseTitle],
      reflections: entry.reflection ? [...existing.reflections, entry.reflection] : existing.reflections,
      completionTime: entry.time || existing.completionTime,
      completionRate: `${Math.min(completedCount, 3)}/3`
    };
    return days;
  }, {});
}

function getCalendarDays(evidenceEntries, date = new Date()) {
  const journeyDays = getJourneyDays(evidenceEntries);
  const year = date.getFullYear();
  const month = date.getMonth();
  const firstDay = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const leadingBlanks = firstDay.getDay();
  const days = Array.from({ length: leadingBlanks }, () => null);
  for (let day = 1; day <= daysInMonth; day += 1) {
    const current = new Date(year, month, day);
    const dateKey = getLocalDateKey(current);
    const entry = journeyDays[dateKey];
    const completed = entry ? Math.min(entry.promises.length, 3) : 0;
    days.push({ day, dateKey, completed, entry });
  }
  return days;
}

function getCompletionMark(completed) {
  if (completed >= 3) return "●";
  if (completed > 0) return "◐";
  return "○";
}

function normalizePromises(promises) {
  return promises.map((promise) => ({
    completed: false,
    category: "",
    estimate: "",
    source: "custom",
    ...promise
  }));
}

function getInitialState() {
  const fallback = {
    screen: "welcome",
    userName: "",
    builderSince: getBuilderSinceLabel(),
    builderGoal: "",
    selectedAreas: [],
    customOtherArea: "",
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
      screen: saved.userName && saved.builderGoal ? "promises" : resumedState.screen,
      promises: movedPromises.length ? movedPromises : createBlankPromises(),
      tomorrowsPromises: [],
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
  const [isReturningUser] = useState(() => {
    try {
      return Boolean(window.localStorage.getItem(storageKey));
    } catch {
      return false;
    }
  });
  const [isStandalone, setIsStandalone] = useState(isStandaloneApp);
  const [deferredInstallPrompt, setDeferredInstallPrompt] = useState(null);
  const [iosInstallDismissed, setIosInstallDismissed] = useState(() => window.localStorage.getItem(installDismissalKey) === "true");
  const [showIosInstallInstructions, setShowIosInstallInstructions] = useState(false);
  const installEvents = useMemo(() => new Set(), []);
  const [screen, setScreen] = useState(initialState.screen);
  const [transition, setTransition] = useState({ key: 0, direction: "forward" });
  const [userName, setUserName] = useState(initialState.userName);
  const [builderSince, setBuilderSince] = useState(initialState.builderSince);
  const [builderGoal, setBuilderGoal] = useState(initialState.builderGoal);
  const [builderGoalDraft, setBuilderGoalDraft] = useState(initialState.builderGoal);
  const [builderGoalError, setBuilderGoalError] = useState("");
  const [nameDraft, setNameDraft] = useState(initialState.userName);
  const [nameError, setNameError] = useState("");
  const [selectedAreas, setSelectedAreas] = useState(initialState.selectedAreas);
  const [customOtherArea, setCustomOtherArea] = useState(initialState.customOtherArea);
  const [startingPointError, setStartingPointError] = useState("");
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
  const [suggestionPromiseId, setSuggestionPromiseId] = useState(null);
  const [journeySelectedDate, setJourneySelectedDate] = useState(getLocalDateKey());
  const completedDayEvents = useMemo(() => new Set(), []);

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
      selectedAreas,
      customOtherArea,
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
    selectedAreas,
    customOtherArea,
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
    trackEvent("app_opened", { returning_user: isReturningUser });
    if (screen === "dashboard") trackDashboardViewed();
    if (screen === "timeline") trackJourneyViewed();
  }, []);

  useEffect(() => {
    const platform = getInstallPlatform();
    const trackInstallOnce = (eventName, properties) => {
      if (installEvents.has(eventName)) return;
      installEvents.add(eventName);
      trackEvent(eventName, properties);
    };
    const onBeforeInstallPrompt = (event) => {
      if (isStandaloneApp()) return;
      event.preventDefault();
      setDeferredInstallPrompt(event);
      trackInstallOnce("install_prompt_shown", { platform, install_method: "native_prompt" });
    };
    const onAppInstalled = () => {
      setDeferredInstallPrompt(null);
      setIsStandalone(true);
      trackInstallOnce("app_installed", { platform, install_method: "native_prompt" });
    };
    if (isStandaloneApp()) trackInstallOnce("standalone_opened", { platform, install_method: "standalone" });
    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    window.addEventListener("appinstalled", onAppInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
      window.removeEventListener("appinstalled", onAppInstalled);
    };
  }, []);

  useEffect(() => {
    const reportError = () => trackEvent("app_error", { screen_name: screen, error_type: "javascript_error" });
    const reportUnhandledRejection = () => trackEvent("app_error", { screen_name: screen, error_type: "unhandled_rejection" });
    window.addEventListener("error", reportError);
    window.addEventListener("unhandledrejection", reportUnhandledRejection);
    return () => {
      window.removeEventListener("error", reportError);
      window.removeEventListener("unhandledrejection", reportUnhandledRejection);
    };
  }, [screen]);

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
      setPromises(createBlankPromises());
    }
    setTransition((current) => ({
      key: current.key + 1,
      direction: screenOrder.indexOf(nextScreen) >= screenOrder.indexOf(screen) ? "forward" : "back"
    }));
    if (nextScreen === "dashboard") {
      setHasSeenDashboard(true);
      if (screen !== "dashboard") trackDashboardViewed();
    }
    if (nextScreen === "timeline" && screen !== "timeline") trackJourneyViewed();
    setScreen(nextScreen);
  }

  function trackDashboardViewed() {
    trackEvent("dashboard_viewed", { completed_today: dailyPromisesKept, evidence_count: evidenceCount });
  }

  function trackJourneyViewed() {
    trackEvent("journey_viewed", { evidence_count: evidenceCount, promises_kept: promisesKept });
  }

  const showIosInstallCard = isIosSafari() && !isStandalone && !iosInstallDismissed;
  const showNativeInstallButton = Boolean(deferredInstallPrompt) && !isStandalone;

  function dismissIosInstallInstructions() {
    window.localStorage.setItem(installDismissalKey, "true");
    setIosInstallDismissed(true);
    setShowIosInstallInstructions(false);
    trackEvent("install_dismissed", { platform: "ios", install_method: "home_screen" });
  }

  async function promptForInstall() {
    if (!deferredInstallPrompt) return;
    const promptEvent = deferredInstallPrompt;
    setDeferredInstallPrompt(null);
    trackEvent("install_started", { platform: getInstallPlatform(), install_method: "native_prompt" });
    try {
      await promptEvent.prompt();
      const choice = await promptEvent.userChoice;
      if (choice?.outcome === "dismissed") trackEvent("install_dismissed", { platform: getInstallPlatform(), install_method: "native_prompt" });
    } catch {
      // Browsers may withdraw an install prompt; the app remains unchanged.
    }
  }

  function goBack() {
    const backTargets = {
      name: "welcome",
      build: "name",
      goal: "build",
      assessment: "goal",
      promises: hasSeenDashboard ? "dashboard" : "assessment",
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
    if (screen === "build") return submitStartingPoint();
    if (screen === "goal") return submitBuilderGoal();
    if (screen === "assessment") return submitSelfTrust();
    if (screen === "dashboard") return goToScreen("promises") || true;
    if (screen === "promises") return validatePromiseSet();
    if (screen === "session" && !sessionStarted) return startFocusSession() || true;
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
    trackEvent("onboarding_step_completed", { step_name: "name", step_number: 1 });
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
    const goalCategory = getGoalSuggestionKey(nextGoal, selectedAreas, customOtherArea);
    trackEvent("builder_goal_set", { goal_category: goalCategory });
    trackEvent("onboarding_step_completed", { step_name: "builder_goal", step_number: 3 });
    goToScreen("assessment");
    return true;
  }

  function submitSelfTrust() {
    trackEvent("onboarding_step_completed", { step_name: "self_trust", step_number: 4 });
    trackEvent("onboarding_completed", {
      goal_category: getGoalSuggestionKey(builderGoal, selectedAreas, customOtherArea),
      starting_point_count: selectedAreas.length
    });
    goToScreen("promises");
    return true;
  }

  function prepareToday() {
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
    setSelectedAreas((current) => {
      const selected = current.includes(area);
      const next = selected ? current.filter((item) => item !== area) : [...current, area];
      trackEvent("starting_point_selected", {
        area_category: area === "Other" ? "other" : getSuggestionKeyFromText(area) || "other",
        selection_action: selected ? "deselected" : "selected",
        selected_count: next.length
      });
      return next;
    });
    setStartingPointError("");
  }

  function submitStartingPoint() {
    if (selectedAreas.includes("Other") && !customOtherArea.trim()) {
      setStartingPointError("Tell us what area you want to improve.");
      return true;
    }
    setStartingPointError("");
    trackEvent("onboarding_step_completed", { step_name: "starting_point", step_number: 2 });
    goToScreen("goal");
    return true;
  }

  function updatePromise(id, field, value) {
    setPromiseMessage("");
    setPromises((current) => current.map((promise) => (promise.id === id ? { ...promise, [field]: value, ...(field === "title" ? { source: "custom" } : {}) } : promise)));
  }

  function usePromiseSuggestion(suggestion) {
    setPromiseMessage("");
    const suggestions = getDaySuggestions(builderGoal, selectedAreas, customOtherArea);
    trackEvent("suggestion_used", {
      goal_category: getGoalSuggestionKey(builderGoal, selectedAreas, customOtherArea),
      promise_category: suggestion.category || "other",
      suggestion_position: Math.max(0, suggestions.findIndex((item) => item.title === suggestion.title)) + 1
    });
    setPromises((current) => applySuggestionToPromises(current, suggestion, suggestionPromiseId));
    setSuggestionPromiseId(null);
  }

  function openSuggestions(promiseId) {
    if (suggestionPromiseId === promiseId) return;
    const suggestionGroup = getGoalSuggestionKey(builderGoal, selectedAreas, customOtherArea);
    trackEvent("suggestions_viewed", {
      goal_category: suggestionGroup,
      suggestion_group: suggestionGroup
    });
    setSuggestionPromiseId(promiseId);
  }

  function validatePromiseSet() {
    if (!isPromiseSetValid) {
      setPromiseMessage("Complete all three promises with a title, category, and estimated time.");
      return true;
    }
    if (!hasSeenDashboard) {
      setPromiseMessage("");
      promises.forEach((promise) => {
        trackEvent("promise_saved", {
          source: promise.source === "suggested" ? "suggested" : "custom",
          promise_category: promise.category || "other",
          time_estimate: promise.estimate
        });
      });
      trackEvent("onboarding_step_completed", { step_name: "daily_promises", step_number: 5 });
      trackEvent("daily_promises_confirmed", { promise_count: promises.length });
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
    if (!selectedPromise || selectedPromise.completed) return false;
    setActivePromiseId(promiseId);
    setSessionReturnScreen(returnScreen);
    setSessionStarted(false);
    setElapsedSeconds(0);
    goToScreen("session");
    return true;
  }

  function startFocusSession() {
    if (!activePromise || sessionStarted) return;
    setSessionStarted(true);
    trackEvent("focus_started", { promise_category: activePromise.category || "other", time_estimate: activePromise.estimate || "unspecified" });
  }

  function completePromise() {
    trackEvent("promise_completed", {
      promise_category: activePromise?.category || "other",
      focus_duration_seconds: elapsedSeconds
    });
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
      completionRate: `${completedAfterSave}/3`,
      completionTimestamp
    };
    const coachEntry = {
      builderGoal,
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
    trackEvent("evidence_saved", {
      promise_category: activePromise?.category || "other",
      has_reflection: Boolean(evidenceReflection.trim()),
      evidence_chip_count: selectedEvidenceChips.length,
      completed_today: completedAfterSave
    });
    if (!wasAlreadyCompleted && completedAfterSave === 3) {
      const completionDay = getLocalDateKey(new Date(completionTimestamp));
      if (!completedDayEvents.has(completionDay)) {
        completedDayEvents.add(completionDay);
        trackEvent("day_completed", {
          completed_count: completedAfterSave,
          goal_category: getGoalSuggestionKey(builderGoal, selectedAreas, customOtherArea)
        });
      }
    }
    goToScreen("dashboard");
  }

  function prepareTomorrow() {
    if (tomorrowsPromises.length === 0) {
      setTomorrowsPromises(createTomorrowSuggestions(builderGoal, selectedAreas, customOtherArea));
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
    setNameDraft("");
    setSelectedAreas([]);
    setCustomOtherArea("");
    setStartingPointError("");
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
        screen === "welcome" && h(WelcomeScreen, { onBegin: () => {
          trackEvent("onboarding_started");
          goToScreen("name");
        } }),
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
            customOtherArea,
            error: startingPointError,
            onToggleArea: toggleArea,
            onCustomAreaChange: (value) => {
              setCustomOtherArea(value);
              setStartingPointError("");
            },
            onContinue: submitStartingPoint
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
            onContinue: submitSelfTrust
          }),
        screen === "dashboard" &&
          h(DashboardScreen, {
            ...navigationProps,
            greeting,
            builderGoal,
            trustScore,
            selfTrustLabel,
            builderScore,
            currentStreak,
            evidenceCount,
            dailyPromisesKept,
            promises,
            evidenceEntries,
            showIosInstallCard,
            onDismissIosInstall: dismissIosInstallInstructions,
            showNativeInstallButton,
            onNativeInstall: promptForInstall,
            onSelectPromise: (promiseId) => startSelectedPromise(promiseId, "dashboard"),
            onBeginToday: () => {
              if (dailyPromisesKept === 3) return goToScreen("complete");
              return goToScreen("promises");
            },
            onSelectJourneyDate: (dateKey) => {
              setJourneySelectedDate(dateKey);
              goToScreen("timeline");
            },
            onReset: resetPrototype
          }),
        screen === "promises" &&
          h(PromisesScreen, {
            ...navigationProps,
            promises,
            suggestions: getDaySuggestions(builderGoal, selectedAreas, customOtherArea),
            message: promiseMessage,
            isLocked: isPromiseSetValid,
            hasSeenDashboard,
            dailyPromisesKept,
            builderGoal,
            suggestionPromiseId,
            onOpenSuggestions: openSuggestions,
            onCloseSuggestions: () => setSuggestionPromiseId(null),
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
            onBegin: startFocusSession,
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
            closingReflection,
            onReflectionChange: setClosingReflection,
            onPrepareTomorrow: prepareTomorrow,
            onSkip: () => goToScreen("dashboard")
          }),
        screen === "tomorrow" &&
          h(TomorrowPromisesScreen, {
            ...navigationProps,
            promises: tomorrowsPromises,
            onUpdatePromise: updateTomorrowPromise,
            onDone: finishTomorrowPlanning
          }),
        screen === "timeline" &&
          h(EvidenceTimelineScreen, {
            ...navigationProps,
            promisesKept,
            builderGoal,
            evidenceEntries,
            selectedDate: journeySelectedDate,
            onSelectDate: setJourneySelectedDate
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
            onReset: resetPrototype,
            isIosSafari: isIosSafari() && !isStandalone,
            showIosInstallInstructions,
            onShowIosInstallInstructions: () => setShowIosInstallInstructions(true),
            onDismissIosInstall: dismissIosInstallInstructions,
            showNativeInstallButton,
            onNativeInstall: promptForInstall
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

function Screen({ eyebrow = "VERAKAI", onBack, withBottomNav = false, children, footer }) {
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
      h("span", { className: "h-2 w-2 rounded-full bg-midnight-300/80 shadow-[0_0_18px_rgba(111,147,200,0.48)]", "aria-hidden": true })
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
        "group flex h-14 min-h-11 w-full cursor-pointer touch-manipulation items-center justify-center rounded-lg border border-midnight-300/70 bg-midnight-500 px-5 text-sm font-semibold tracking-[0.08em] text-white shadow-soft transition duration-[100ms] hover:bg-midnight-400 focus:outline-none focus:ring-4 focus:ring-midnight-300/20 disabled:cursor-not-allowed disabled:border-white/10 disabled:bg-white/10 disabled:text-white/40"
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
        "group flex min-h-11 cursor-pointer touch-manipulation items-center justify-center rounded-lg border border-white/10 bg-white/[0.035] px-4 text-sm font-semibold text-white/76 transition duration-[100ms] hover:border-white/20 hover:bg-white/[0.055] focus:outline-none focus:ring-4 focus:ring-midnight-300/15 disabled:cursor-not-allowed disabled:text-white/30"
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
        "card-press flex min-h-14 w-full cursor-pointer touch-manipulation items-center gap-3 rounded-lg border px-4 text-left transition duration-[100ms] hover:border-white/20 hover:bg-white/[0.055] focus:outline-none focus:ring-4 focus:ring-midnight-300/15",
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
    checked && h("span", { className: "ml-auto shrink-0 text-[0.64rem] font-semibold uppercase tracking-[0.14em] text-midnight-300" }, "Journey Added")
  );
}

function WelcomeScreen({ onBegin }) {
  return h(
    Screen,
    {
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
    { onBack },
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

function BuildScreen({ selectedAreas, customOtherArea, error, onToggleArea, onCustomAreaChange, onContinue, onBack }) {
  return h(
    Screen,
    { onBack },
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
    selectedAreas.includes("Other") &&
      h(
        "div",
        { className: "mt-4 grid gap-2" },
        h("label", { className: "text-sm font-medium text-white/72", htmlFor: "custom-other-area" }, "What area do you want to improve?"),
        h("input", {
          id: "custom-other-area",
          className: "promise-input",
          value: customOtherArea,
          placeholder: "Write your area",
          onChange: (event) => onCustomAreaChange(event.target.value),
          "aria-label": "What area do you want to improve?"
        }),
        error && h("p", { className: "text-sm font-medium text-white/45" }, error)
      ),
    h("div", { className: "mt-auto pt-10" }, h(PrimaryButton, { onClick: onContinue }, "Continue"))
  );
}

function BuilderGoalScreen({ builderGoalDraft, error, onGoalChange, onContinue, onBack }) {
  const examples = ["Launch my business", "Lose 20 pounds", "Become disciplined", "Become financially free", "Build confidence", "Run my first marathon"];

  return h(
    Screen,
    { onBack },
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
        "onboarding-card min-h-[96px] rounded-lg border px-4 py-4 text-left focus:outline-none focus:ring-4 focus:ring-midnight-300/15",
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
    { onBack },
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

function getHomeActionLabel(completedCount) {
  if (completedCount === 0) return "Begin Today";
  if (completedCount === 1) return "Continue Today";
  if (completedCount === 2) return "Finish Today";
  return "Review Today";
}

function BuilderCalendar({ evidenceEntries, selectedDate, onSelectDate, compact = false }) {
  const today = new Date();
  const days = getCalendarDays(evidenceEntries, today);
  const monthLabel = today.toLocaleDateString(undefined, { month: "long", year: "numeric" });
  const selectedKey = selectedDate || getLocalDateKey(today);

  return h(
    "div",
    { className: `builder-calendar ${compact ? "compact" : ""}` },
    h(
      "div",
      { className: "flex items-center justify-between gap-4" },
      h("p", { className: "text-xs font-semibold uppercase tracking-[0.18em] text-white/35" }, monthLabel),
      h(
        "div",
        { className: "flex items-center gap-2 text-[0.66rem] font-semibold uppercase tracking-[0.12em] text-white/32" },
        h("span", null, "○"),
        h("span", null, "◐"),
        h("span", null, "●")
      )
    ),
    h(
      "div",
      { className: "mt-4 grid grid-cols-7 gap-1 text-center text-[0.62rem] font-semibold uppercase tracking-[0.08em] text-white/28" },
      ["S", "M", "T", "W", "T", "F", "S"].map((day, index) => h("span", { key: `${day}-${index}` }, day))
    ),
    h(
      "div",
      { className: "mt-2 grid grid-cols-7 gap-1" },
      days.map((day, index) =>
        day
          ? h(
              "button",
              {
                key: day.dateKey,
                className: `calendar-day ${day.dateKey === selectedKey ? "selected" : ""}`,
                type: "button",
                onClick: () => onSelectDate(day.dateKey),
                "aria-label": `${day.dateKey}: ${day.completed} of 3 promises completed`
              },
              h("span", { className: "calendar-number" }, day.day),
              h("span", { className: `calendar-mark complete-${day.completed}` }, getCompletionMark(day.completed))
            )
          : h("span", { key: `blank-${index}`, className: "calendar-day blank" })
      )
    )
  );
}

function DashboardScreen({ greeting, builderGoal, trustScore, selfTrustLabel, builderScore, currentStreak, evidenceCount, dailyPromisesKept, promises, evidenceEntries, showIosInstallCard, onDismissIosInstall, showNativeInstallButton, onNativeInstall, onSelectPromise, onBeginToday, onSelectJourneyDate, onReset, onBack }) {
  const isComplete = dailyPromisesKept === 3;
  const homeActionLabel = getHomeActionLabel(dailyPromisesKept);
  const missionLabel = isComplete ? "Mission Complete" : "Today's Mission";
  const recentEvidence = evidenceEntries.slice(0, 2);

  return h(
    Screen,
    { onBack, withBottomNav: true },
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
        h("p", { className: "mt-4 text-[1.36rem] font-semibold leading-8 tracking-[-0.02em] text-white" }, builderGoal || "Set your Builder Goal.")
      ),
      h(
        "div",
        { className: "mt-8" },
        h(PrimaryButton, { onClick: onBeginToday }, homeActionLabel)
      ),
      showIosInstallCard && h(IosInstallCard, { onDismiss: onDismissIosInstall }),
      showNativeInstallButton && h("div", { className: "mt-4" }, h(InstallButton, { onClick: onNativeInstall })),
      h(
        "div",
        { className: "mt-8 rounded-lg border border-midnight-300/20 bg-midnight-500/10 p-5" },
        h("p", { className: "text-xs uppercase tracking-[0.18em] text-white/35" }, "Today's Progress"),
        h("p", { className: "mt-3 text-4xl font-semibold tracking-[-0.04em] text-white" }, `${dailyPromisesKept}/3`),
        isComplete && h("p", { className: "mt-2 text-sm font-semibold text-midnight-300" }, "Promises Kept")
      ),
      h(BuilderCalendar, { evidenceEntries, compact: true, onSelectDate: onSelectJourneyDate })
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
          h(StatCard, { label: "Journey Entries", value: evidenceCount })
        )
      ),
      h(
        "section",
        null,
        h("h2", { className: "text-sm font-semibold uppercase tracking-[0.16em] text-white/45" }, "Recent Journey"),
        recentEvidence.length
          ? h("div", { className: "mt-3 grid gap-3" }, recentEvidence.map((entry) => h(EvidenceEntryCard, { key: entry.id, entry })))
          : h(EmptyState, { title: "No Journey entries yet.", copy: "Keep one promise to begin the record." })
      )
    ),
    h("button", { className: "mt-6 cursor-pointer touch-manipulation text-left text-xs font-semibold text-white/30 transition duration-[100ms] hover:text-white/50", type: "button", onClick: onReset }, "Reset Prototype")
  );
}

function PromisesScreen({
  promises,
  suggestions,
  message,
  isLocked,
  hasSeenDashboard,
  dailyPromisesKept,
  builderGoal,
  suggestionPromiseId,
  onOpenSuggestions,
  onCloseSuggestions,
  onUpdatePromise,
  onUseSuggestion,
  onValidatePromises,
  onStartPromise,
  onBack
}) {
  const isChoosingPromise = hasSeenDashboard;

  return h(
    Screen,
    { onBack, withBottomNav: true },
    h(SectionIntro, {
      label: "Today",
      title: isChoosingPromise ? "Choose today's promise." : "Today's Promises",
      copy: isChoosingPromise ? "Select one. Enter Focus Mode." : "Choose three promises for today."
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
    h(
      "div",
      { className: `${isChoosingPromise ? "hidden" : "mt-5 grid gap-3"}` },
      promises.map((promise, index) =>
        h(
          "div",
          {
            key: promise.id,
            className: `promise-card rounded-lg border border-white/10 bg-white/[0.035] p-3 ${promise.completed ? "completed" : ""}`,
            onClick: () => {
              if (!promise.title.trim()) onOpenSuggestions(promise.id);
            }
          },
          h("label", { className: "mb-2 block text-xs uppercase tracking-[0.16em] text-white/30", htmlFor: `promise-${promise.id}` }, `Promise ${index + 1}`),
          h("input", {
            id: `promise-${promise.id}`,
            className: "promise-input",
            value: promise.title,
            placeholder: "Tap for suggestions or write your own",
            onFocus: () => {
              if (!promise.title.trim()) onOpenSuggestions(promise.id);
            },
            onClick: (event) => event.stopPropagation(),
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
          promise.completed && h("p", { className: "mt-3 text-xs font-semibold uppercase tracking-[0.14em] text-midnight-300" }, "Journey Added"),
          !promise.completed &&
            h(
              "button",
              {
                className: "mt-3 text-left text-xs font-semibold text-midnight-300",
                type: "button",
                onClick: (event) => {
                  event.stopPropagation();
                  onOpenSuggestions(promise.id);
                }
              },
              "Suggested for your Builder Goal"
            )
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
      ),
    suggestionPromiseId &&
      h(PromiseSuggestionSheet, {
        builderGoal,
        suggestions,
        onUseSuggestion,
        onClose: onCloseSuggestions
      })
  );
}

function PromiseSuggestionSheet({ builderGoal, suggestions, onUseSuggestion, onClose }) {
  return h(
    "div",
    { className: "bottom-sheet-backdrop", role: "presentation", onClick: onClose },
    h(
      "div",
      { className: "bottom-sheet", role: "dialog", "aria-modal": "true", onClick: (event) => event.stopPropagation() },
      h("div", { className: "mx-auto h-1 w-10 rounded-full bg-white/18" }),
      h("p", { className: "mt-6 text-xs font-semibold uppercase tracking-[0.18em] text-white/35" }, "Suggested for your Builder Goal"),
      h("h2", { className: "mt-3 text-xl font-semibold leading-7 text-white" }, builderGoal || "Today's goal"),
      h(
        "div",
        { className: "mt-5 grid gap-2" },
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
      ),
      h("button", { className: "mt-5 w-full text-sm font-semibold text-white/42", type: "button", onClick: onClose }, "Ignore suggestions")
    )
  );
}

function PromiseChoiceCard({ promise, completed, onClick }) {
  return h(
    "button",
    {
      type: "button",
      onClick: completed ? undefined : onClick,
      disabled: completed,
      "aria-disabled": completed,
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
    { onBack },
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
    { onBack },
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
    { onBack },
    h(
      "div",
      { className: "pt-12" },
      h("p", { className: "mb-4 text-xs font-medium uppercase tracking-[0.22em] text-midnight-300" }, "Journey Entry"),
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
        placeholder: "Write what this proved...",
        value: reflection,
        onChange: (event) => onReflectionChange(event.target.value)
      })
    ),
    h("div", { className: "mt-auto pt-8" }, h(PrimaryButton, { onClick: onSaveEvidence }, "Save to Journey"))
  );
}

function PrepareTomorrowScreen({
  promisesKept,
  trustScore,
  selfTrustLabel,
  builderScore,
  currentStreak,
  builderGoal,
  closingReflection,
  onReflectionChange,
  onPrepareTomorrow,
  onSkip,
  onBack
}) {
  return h(
    Screen,
    { onBack },
    h(
      "div",
      { className: "pt-12" },
      h("p", { className: "mb-4 text-xs font-medium uppercase tracking-[0.22em] text-midnight-300" }, "Builder Report"),
      h("h1", { className: "headline-enter text-[2.22rem] font-semibold leading-[1.03] tracking-[-0.02em]" }, "What did today prove about you?"),
      h(
        "div",
        { className: "mt-8 grid grid-cols-2 gap-3" },
        h(StatCard, { label: "Today's Goal", value: builderGoal || "Unset", hero: true }),
        h(StatCard, { label: "Promises Completed", value: `${promisesKept}/3` }),
        h(StatCard, { label: "Journey Entries", value: promisesKept }),
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
          placeholder: "Write what you want to remember...",
          value: closingReflection,
          onChange: (event) => onReflectionChange(event.target.value)
        })
      )
    ),
    h(
      "div",
      { className: "mt-auto grid gap-3 pt-8" },
      h(PrimaryButton, { onClick: onSkip }, "Return Home")
    )
  );
}

function TomorrowPromisesScreen({ promises, onUpdatePromise, onDone, onBack }) {
  return h(
    Screen,
    { onBack },
    h(SectionIntro, {
      label: "Tomorrow",
      title: "Prepare tomorrow.",
      copy: "These promises are locked until tomorrow. You cannot complete them today."
    }),
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

function EvidenceTimelineScreen({ promisesKept, builderGoal, evidenceEntries, selectedDate, onSelectDate, onBack }) {
  const journeyDays = getJourneyDays(evidenceEntries);
  const selectedDay = journeyDays[selectedDate];
  const entriesForSelectedDate = evidenceEntries.filter((entry) => getEntryDateKey(entry) === selectedDate);

  return h(
    Screen,
    { onBack, withBottomNav: true },
    h(SectionIntro, {
      label: "Journey",
      title: "Journey",
      copy: "A record of promises kept."
    }),
    h(
      "div",
      { className: "mt-8 grid gap-8" },
      h(BuilderCalendar, { evidenceEntries, selectedDate, onSelectDate }),
      h(
        "section",
        null,
        h("div", { className: "flex items-end justify-between gap-4" },
          h("h2", { className: "text-sm font-semibold uppercase tracking-[0.16em] text-white/45" }, selectedDay ? selectedDay.date : "Daily Entries"),
          h("p", { className: "text-xs font-semibold uppercase tracking-[0.14em] text-white/32" }, `${promisesKept} lifetime`)
        ),
        entriesForSelectedDate.length
          ? h("div", { className: "mt-4 grid gap-5" }, entriesForSelectedDate.map((entry) => h(EvidenceEntryCard, { key: entry.id, entry })))
          : h(EmptyState, { title: "No Journey entry.", copy: builderGoal ? "Keep a promise to add this day to your Journey." : "Set a Builder Goal to begin." })
      )
    )
  );
}

function EvidenceEntryCard({ entry }) {
  return h(
    "article",
    { className: "evidence-entry rounded-lg border border-white/10 bg-white/[0.035] p-6" },
    h("p", { className: "text-[1.05rem] font-medium leading-7 text-white/78" }, entry.reflection || "You kept the promise."),
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
      h("span", null, entry.category || "Uncategorized"),
      h("span", null, "/"),
      h("span", null, entry.estimatedTime || "No estimate"),
      h("span", null, "/"),
      h("span", null, entry.completionRate || "1/3")
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
      h(ProfileStoryRow, { label: "Journey Entries", value: evidenceCount })
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

function SettingsScreen({ nameDraft, nameError, onNameChange, onSaveName, onReset, isIosSafari, showIosInstallInstructions, onShowIosInstallInstructions, onDismissIosInstall, showNativeInstallButton, onNativeInstall, onBack }) {
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
        h("button", { className: "mt-3 cursor-pointer touch-manipulation text-sm font-semibold text-white/55 transition duration-[100ms] hover:text-white/78", type: "button", onClick: onReset }, "Reset Prototype")
      ),
      isIosSafari &&
        (showIosInstallInstructions
          ? h(IosInstallCard, { onDismiss: onDismissIosInstall })
          : h("button", { className: "cursor-pointer touch-manipulation text-left text-sm font-semibold text-midnight-300 transition duration-[100ms]", type: "button", onClick: onShowIosInstallInstructions }, "Install VERAKAI")),
      showNativeInstallButton && h(InstallButton, { onClick: onNativeInstall }),
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

function IosInstallCard({ onDismiss }) {
  return h(
    "aside",
    { className: "mt-4 rounded-lg border border-midnight-300/30 bg-midnight-500/10 p-4" },
    h("p", { className: "text-sm font-semibold text-white/88" }, "Install VERAKAI"),
    h("p", { className: "mt-2 text-sm leading-6 text-white/55" }, "Add VERAKAI to your Home Screen for a focused, app-like experience."),
    h("ol", { className: "mt-3 space-y-1 text-sm leading-6 text-white/62" }, h("li", null, "1. Tap the Share button."), h("li", null, "2. Select Add to Home Screen."), h("li", null, "3. Tap Add.")),
    h("button", { className: "mt-4 cursor-pointer touch-manipulation text-sm font-semibold text-midnight-300", type: "button", onClick: onDismiss }, "Got it")
  );
}

function InstallButton({ onClick }) {
  return h("button", { className: "w-full rounded-lg border border-midnight-300/45 bg-midnight-500/18 px-4 py-3 text-sm font-semibold text-white transition duration-[100ms]", type: "button", onClick }, "Install VERAKAI");
}

function BottomNav({ activeScreen, onNavigate }) {
  const items = [
    { id: "dashboard", icon: "🏠", label: "Home" },
    { id: "timeline", icon: "📖", label: "Journey" },
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
