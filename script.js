// Only keep your real data, wallet addresses, and media files here.
const profileConfig = {
  name: "Shiny",
  tagline: "Fivem Cheat Soon! | Discord Soon!",
  invite: {
    label: "",
    href: "",
  },
  discord: {
    userId: "1260713369749553152",
    username: "shiny17_",
    avatarUrl: "",
    profileUrl: "https://discord.gg/2BAwrUscuP",
    fallbackStatus: "Last seen unknown",
    fallbackState: "offline",
  },
  crypto: {
    btcAddress: "PASTE_YOUR_BTC_ADDRESS",
    ltcAddress: "PASTE_YOUR_LTC_ADDRESS",
  },
  media: {
    backgroundVideo: "./profile-bg.mp4",
    backgroundPoster: "./profile-bg-poster.jpg",
    song: "./profile-song.mp3",
    defaultVolume: 40,
    volumeStorageKey: "shiny-profile-volume",
  },
  counters: {
    storageKey: "shiny-profile-link-clicks",
    defaultClicks: 78,
  },
};

const tabs = document.querySelectorAll(".top-tab");
const panes = document.querySelectorAll(".tab-pane");
const switches = document.querySelectorAll("[data-switch-to]");
const servicePane = document.querySelector('[data-pane="service"]');
const soundControl = document.querySelector(".sound-control");
const soundButton = document.querySelector(".sound-button");
const volumePanel = document.querySelector("[data-volume-panel]");
const volumeSlider = document.querySelector("[data-volume-slider]");
const volumeValue = document.querySelector("[data-volume-value]");
const introGate = document.querySelector("[data-intro-gate]");
const profileMedia = document.querySelector(".profile-media");
const profileAudio = document.querySelector("[data-profile-audio]");
const profileVideo = document.querySelector("[data-profile-video]");
const profileYoutube = document.querySelector("[data-profile-youtube]");
const profileFeedback = document.querySelector("[data-profile-feedback]");
const clickCount = document.querySelector("[data-link-click-count]");
const copyButtons = document.querySelectorAll("[data-copy-address]");
const trackedLinks = document.querySelectorAll("[data-track-link]");

const profileElements = {
  name: document.querySelector("[data-profile-name]"),
  tagline: document.querySelector("[data-profile-tagline]"),
  invite: document.querySelector("[data-profile-invite]"),
  discordLink: document.querySelector("[data-profile-discord-link]"),
  discordButton: document.querySelector("[data-profile-discord-button]"),
  discordName: document.querySelector("[data-discord-name]"),
  discordStatus: document.querySelector("[data-discord-status]"),
  avatar: document.querySelector("[data-discord-avatar]"),
  avatarFallback: document.querySelector("[data-discord-avatar-fallback]"),
  avatarDot: document.querySelector("[data-discord-avatar-dot]"),
  titleDot: document.querySelector("[data-discord-title-dot]"),
};

const statusClasses = [
  "is-status-online",
  "is-status-idle",
  "is-status-dnd",
  "is-status-offline",
];

let feedbackTimerId;
let presenceIntervalId;
let youtubePlayer;
let youtubeApiPromise;
let mediaMode = "none";
let youtubeEmbedBlocked = false;
let currentVolume = profileConfig.media.defaultVolume;
let audioEnabledByUser = false;
let hasEnteredPage = false;
let mediaReady = false;

function restartServiceReveal() {
  if (!servicePane) {
    return;
  }

  servicePane.classList.remove("is-revealing");
  void servicePane.offsetWidth;
  servicePane.classList.add("is-revealing");
}

function setActiveTab(tabName) {
  tabs.forEach((tab) => {
    tab.classList.toggle("active", tab.dataset.tab === tabName);
  });

  panes.forEach((pane) => {
    pane.classList.toggle("active", pane.dataset.pane === tabName);
  });

  const isServiceView = tabName === "service";
  document.body.classList.toggle("service-view", isServiceView);
  document.body.classList.toggle("profile-view", !isServiceView);

  if (isServiceView) {
    restartServiceReveal();
  } else {
    servicePane?.classList.remove("is-revealing");
  }

  if (window.location.hash !== `#${tabName}`) {
    history.replaceState(null, "", `#${tabName}`);
  }

  syncMediaPlayback();
}

function setProfileFeedback(message) {
  window.clearTimeout(feedbackTimerId);
  profileFeedback.textContent = message;

  if (!message) {
    return;
  }

  feedbackTimerId = window.setTimeout(() => {
    profileFeedback.textContent = "";
  }, 2400);
}

function clampVolume(value) {
  return Math.min(100, Math.max(0, Number(value) || 0));
}

function hasConfiguredAddress(address) {
  return Boolean(address) && !address.startsWith("PASTE_YOUR");
}

function syncPaymentButtons() {
  copyButtons.forEach((button) => {
    const address =
      button.dataset.copyAddress === "btc"
        ? profileConfig.crypto.btcAddress
        : profileConfig.crypto.ltcAddress;

    button.hidden = !hasConfiguredAddress(address);
  });
}

function isYoutubeControllable() {
  return Boolean(youtubePlayer) && !youtubeEmbedBlocked;
}

function hasControllableMedia() {
  return (
    isYoutubeControllable() ||
    Boolean(profileAudio.getAttribute("src")) ||
    Boolean(profileVideo.getAttribute("src"))
  );
}

function isUsingVideoAudioTrack() {
  return Boolean(profileVideo.getAttribute("src")) && !Boolean(profileAudio.getAttribute("src"));
}

function setVolumePanelOpen(isOpen) {
  soundControl.classList.toggle("is-open", isOpen);
  soundButton.setAttribute("aria-expanded", String(isOpen));
}

function enterPage() {
  if (hasEnteredPage) {
    return;
  }

  hasEnteredPage = true;
  document.body.classList.remove("is-locked");
  introGate.classList.add("is-hidden");

  window.requestAnimationFrame(() => {
    window.requestAnimationFrame(() => {
      ensureMediaReady();
      applyVolume(currentVolume, { userInitiated: true });
      syncMediaPlayback();
    });
  });
}

function ensureMediaReady() {
  if (mediaReady) {
    return;
  }

  mediaReady = true;
  updateProfileMedia();
}

function setProfileMediaBackdrop(imageUrl = "") {
  if (!profileMedia) {
    return;
  }

  profileMedia.style.backgroundImage = imageUrl ? `url("${imageUrl}")` : "";
}

function syncVideoTimeToAudio() {
  if (!profileAudio.getAttribute("src")) {
    return;
  }

  if (
    !Number.isFinite(profileAudio.currentTime) ||
    !Number.isFinite(profileVideo.duration) ||
    profileVideo.duration <= 0
  ) {
    return;
  }

  const targetTime = profileAudio.currentTime % profileVideo.duration;

  if (Math.abs(profileVideo.currentTime - targetTime) > 0.45) {
    try {
      profileVideo.currentTime = targetTime;
    } catch {
      return;
    }
  }
}

function playProfileVideo({ allowAudio = false } = {}) {
  if (!profileVideo.getAttribute("src")) {
    return;
  }

  syncVideoTimeToAudio();
  profileVideo.muted = !allowAudio || currentVolume === 0 || Boolean(profileAudio.getAttribute("src"));

  const playPromise = profileVideo.play();
  playPromise?.catch(() => {
    return;
  });
}

function syncMediaPlayback() {
  const isPageVisible = document.visibilityState === "visible";
  const isProfileView = document.body.classList.contains("profile-view");

  if (!isPageVisible || !hasEnteredPage || !mediaReady) {
    profileVideo.pause();
    profileAudio.pause();
    return;
  }

  if (isProfileView) {
    playProfileVideo({
      allowAudio: audioEnabledByUser && isUsingVideoAudioTrack(),
    });
  } else {
    profileVideo.pause();
  }

  if (!profileAudio.getAttribute("src")) {
    return;
  }

  if (!audioEnabledByUser || currentVolume === 0) {
    profileAudio.pause();
    return;
  }

  profileAudio.muted = false;
  const playPromise = profileAudio.play();
  playPromise?.catch(() => {
    return;
  });
}

function activateInlineMediaAudio() {
  audioEnabledByUser = currentVolume > 0;

  if (profileAudio.getAttribute("src")) {
    profileAudio.muted = currentVolume === 0;

    if (currentVolume === 0) {
      profileAudio.pause();
      return;
    }

    const playPromise = profileAudio.play();
    playPromise?.catch(() => {
      setProfileFeedback("Your browser blocks audio until your first click.");
    });
    return;
  }

  if (!isUsingVideoAudioTrack()) {
    return;
  }

  profileVideo.muted = currentVolume === 0;

  if (currentVolume === 0) {
    return;
  }

  const playPromise = profileVideo.play();
  playPromise?.catch(() => {
    setProfileFeedback("Your browser blocks audio until your first click.");
  });
}

function applyVolume(volume, { userInitiated = false } = {}) {
  currentVolume = clampVolume(volume);
  volumeSlider.value = String(currentVolume);
  volumeValue.textContent = `${currentVolume}%`;
  setStorageValue(profileConfig.media.volumeStorageKey, currentVolume);

  const normalizedVolume = currentVolume / 100;
  profileAudio.volume = normalizedVolume;
  profileVideo.volume = normalizedVolume;

  if (userInitiated) {
    audioEnabledByUser = currentVolume > 0;
    profileAudio.muted = currentVolume === 0;

    if (isUsingVideoAudioTrack()) {
      profileVideo.muted = currentVolume === 0;
    }
  }

  if (isYoutubeControllable()) {
    youtubePlayer.setVolume(currentVolume);

    if (userInitiated) {
      if (currentVolume === 0) {
        youtubePlayer.mute();
      } else {
        youtubePlayer.unMute();
        youtubePlayer.playVideo();
      }
    } else if (currentVolume === 0) {
      youtubePlayer.mute();
    }
  }

  if (userInitiated) {
    activateInlineMediaAudio();
  }

  volumeSlider.disabled = !hasControllableMedia();
  updateSoundButtonState();
}

function updateSoundButtonState() {
  const hasMedia = hasControllableMedia();

  soundButton.classList.toggle("is-disabled", !hasMedia);
  soundButton.classList.toggle("is-playing", hasMedia && currentVolume > 0);
  soundButton.setAttribute(
    "aria-label",
    hasMedia
      ? `Adjust volume, currently ${currentVolume}%`
      : "No controllable audio is currently available"
  );
}

function getYoutubePoster(videoId) {
  return `url("https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg"), url("https://i.ytimg.com/vi/${videoId}/hqdefault.jpg")`;
}

function getStorageValue(key, fallbackValue) {
  try {
    const rawValue = window.localStorage.getItem(key);
    return rawValue === null ? fallbackValue : rawValue;
  } catch {
    return fallbackValue;
  }
}

function setStorageValue(key, value) {
  try {
    window.localStorage.setItem(key, String(value));
  } catch {
    return;
  }
}

function getCurrentClickCount() {
  const savedCount = Number.parseInt(
    getStorageValue(profileConfig.counters.storageKey, profileConfig.counters.defaultClicks),
    10
  );

  return Number.isFinite(savedCount)
    ? savedCount
    : profileConfig.counters.defaultClicks;
}

function renderClickCount(count) {
  clickCount.textContent = String(count);
}

function incrementClickCount() {
  const nextCount = getCurrentClickCount() + 1;
  setStorageValue(profileConfig.counters.storageKey, nextCount);
  renderClickCount(nextCount);
}

function applyStatusClasses(status) {
  const normalizedStatus = statusClasses.includes(`is-status-${status}`)
    ? `is-status-${status}`
    : "is-status-offline";

  [profileElements.avatarDot, profileElements.titleDot].forEach((element) => {
    element.classList.remove(...statusClasses);
    element.classList.add(normalizedStatus);
  });
}

function setAvatar(avatarUrl) {
  const hasAvatar = Boolean(avatarUrl);

  profileElements.avatar.classList.toggle("is-visible", hasAvatar);
  profileElements.avatarFallback.style.display = hasAvatar ? "none" : "grid";

  if (hasAvatar) {
    profileElements.avatar.src = avatarUrl;
  } else {
    profileElements.avatar.removeAttribute("src");
  }
}

function formatDiscordStatus(status) {
  const labelByStatus = {
    online: "Online on Discord",
    idle: "Idle on Discord",
    dnd: "Do not disturb",
    offline: "Offline on Discord",
  };

  return labelByStatus[status] ?? profileConfig.discord.fallbackStatus;
}

function applyDiscordPresence({
  username,
  statusLabel,
  statusState,
  avatarUrl,
}) {
  profileElements.discordName.textContent = username;
  profileElements.discordStatus.textContent = statusLabel;
  profileElements.avatarFallback.textContent = username.slice(0, 1).toUpperCase();
  setAvatar(avatarUrl);
  applyStatusClasses(statusState);
}

function applyFallbackPresence() {
  applyDiscordPresence({
    username: profileConfig.discord.username,
    statusLabel: profileConfig.discord.fallbackStatus,
    statusState: profileConfig.discord.fallbackState,
    avatarUrl: profileConfig.discord.avatarUrl,
  });
}

function getDiscordAvatarUrl(user) {
  if (!user?.id || !user?.avatar) {
    return profileConfig.discord.avatarUrl;
  }

  return `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png?size=160`;
}

function extractYouTubeVideoId(input) {
  if (!input) {
    return "";
  }

  try {
    const url = new URL(input);

    if (url.hostname.includes("youtu.be")) {
      return url.pathname.replace("/", "");
    }

    if (url.hostname.includes("youtube.com")) {
      return url.searchParams.get("v") || "";
    }
  } catch {
    return "";
  }

  return "";
}

function ensureYoutubeApi() {
  if (window.YT?.Player) {
    return Promise.resolve(window.YT);
  }

  if (youtubeApiPromise) {
    return youtubeApiPromise;
  }

  youtubeApiPromise = new Promise((resolve, reject) => {
    const previousReady = window.onYouTubeIframeAPIReady;
    const existingScript = document.querySelector('script[src="https://www.youtube.com/iframe_api"]');
    let timeoutId = 0;

    const cleanup = () => {
      window.clearTimeout(timeoutId);
    };

    window.onYouTubeIframeAPIReady = () => {
      previousReady?.();
      cleanup();
      resolve(window.YT);
    };

    if (existingScript) {
      timeoutId = window.setTimeout(() => {
        youtubeApiPromise = null;
        reject(new Error("YouTube API timeout"));
      }, 5000);
      return;
    }

    const script = document.createElement("script");
    script.src = "https://www.youtube.com/iframe_api";
    script.addEventListener("error", () => {
      cleanup();
      youtubeApiPromise = null;
      reject(new Error("YouTube API blocked"));
    });
    document.head.appendChild(script);

    timeoutId = window.setTimeout(() => {
      youtubeApiPromise = null;
      reject(new Error("YouTube API timeout"));
    }, 5000);
  });

  return youtubeApiPromise;
}

function showYoutubePoster(videoId) {
  profileYoutube.innerHTML = "";
  profileYoutube.style.backgroundImage = getYoutubePoster(videoId);
  profileYoutube.classList.remove("is-hidden");
  profileYoutube.classList.add("is-ready");
  profileYoutube.classList.add("is-fallback-motion");
}

function resetMediaVisibility() {
  profileYoutube.classList.add("is-hidden");
  profileYoutube.classList.remove("is-ready");
  profileYoutube.classList.remove("is-fallback-motion");
  profileYoutube.style.backgroundImage = "";
  profileVideo.classList.add("is-hidden");
  profileVideo.classList.remove("is-ready");
  profileVideo.removeAttribute("src");
}

async function setupYoutubePlayer(videoId) {
  mediaMode = "youtube";
  youtubeEmbedBlocked = false;
  profileAudio.removeAttribute("src");
  profileVideo.pause();
  profileVideo.removeAttribute("src");
  profileVideo.load();
  resetMediaVisibility();
  showYoutubePoster(videoId);

  let YT;

  try {
    YT = await ensureYoutubeApi();
  } catch {
    youtubeEmbedBlocked = true;
    mediaMode = "none";
    setProfileFeedback("YouTube did not load correctly here, so a visible fallback is shown instead.");
    volumeSlider.disabled = !hasControllableMedia();
    updateSoundButtonState();
    return;
  }

  if (youtubePlayer?.destroy) {
    youtubePlayer.destroy();
  }

  youtubePlayer = new YT.Player(profileYoutube, {
    videoId,
    playerVars: {
      autoplay: 1,
      controls: 0,
      disablekb: 1,
      fs: 0,
      iv_load_policy: 3,
      loop: 1,
      modestbranding: 1,
      playsinline: 1,
      rel: 0,
      playlist: videoId,
    },
    events: {
      onReady: (event) => {
        event.target.mute();
        event.target.playVideo();
        profileYoutube.classList.remove("is-hidden");
        profileYoutube.classList.add("is-ready");
        profileYoutube.classList.remove("is-fallback-motion");
        applyVolume(currentVolume);
      },
      onStateChange: () => {
        updateSoundButtonState();
      },
      onError: () => {
        youtubeEmbedBlocked = true;
        mediaMode = "none";
        if (youtubePlayer?.destroy) {
          youtubePlayer.destroy();
          youtubePlayer = null;
        }
        showYoutubePoster(videoId);
        setProfileFeedback("This YouTube video blocks embeds, so an animated fallback is shown instead.");
        volumeSlider.disabled = !hasControllableMedia();
        updateSoundButtonState();
      },
    },
  });
}

async function refreshDiscordPresence() {
  if (!profileConfig.discord.userId) {
    applyFallbackPresence();
    return;
  }

  try {
    const response = await fetch(
      `https://api.lanyard.rest/v1/users/${profileConfig.discord.userId}`,
      {
        headers: {
          Accept: "application/json",
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Lanyard returned ${response.status}`);
    }

    const payload = await response.json();
    const presence = payload?.data;
    const user = presence?.discord_user;

    if (!presence || !user) {
      throw new Error("Missing presence data");
    }

    applyDiscordPresence({
      username:
        user.global_name ||
        user.display_name ||
        user.username ||
        profileConfig.discord.username,
      statusLabel: formatDiscordStatus(presence.discord_status),
      statusState: presence.discord_status || "offline",
      avatarUrl: getDiscordAvatarUrl(user),
    });
  } catch {
    applyFallbackPresence();
  }
}

function updateProfileMedia() {
  const youtubeVideoId = extractYouTubeVideoId(profileConfig.media.backgroundVideo);

  if (youtubeVideoId) {
    setProfileMediaBackdrop("");
    setupYoutubePlayer(youtubeVideoId);
  } else if (profileConfig.media.backgroundVideo) {
    mediaMode = "video";
    setProfileMediaBackdrop("");
    if (youtubePlayer?.destroy) {
      youtubePlayer.destroy();
      youtubePlayer = null;
    }
    profileVideo.pause();
    profileYoutube.innerHTML = "";
    profileYoutube.classList.add("is-hidden");
    profileVideo.poster = profileConfig.media.backgroundPoster || "";
    profileVideo.src = profileConfig.media.backgroundVideo;
    profileVideo.load();
    profileVideo.classList.remove("is-hidden");
  } else if (profileConfig.media.backgroundPoster) {
    mediaMode = "poster";
    if (youtubePlayer?.destroy) {
      youtubePlayer.destroy();
      youtubePlayer = null;
    }
    resetMediaVisibility();
    setProfileMediaBackdrop(profileConfig.media.backgroundPoster);
  } else {
    if (youtubePlayer?.destroy) {
      youtubePlayer.destroy();
      youtubePlayer = null;
    }
    resetMediaVisibility();
    setProfileMediaBackdrop("");
  }

  if (profileConfig.media.song) {
    mediaMode = "audio";
    profileAudio.src = profileConfig.media.song;
    profileAudio.load();
  } else {
    profileAudio.removeAttribute("src");
  }

  applyVolume(currentVolume);
  syncMediaPlayback();
}

function applyProfileConfig() {
  profileElements.name.textContent = profileConfig.name;
  profileElements.tagline.textContent = profileConfig.tagline;
  const hasInvite = Boolean(profileConfig.invite.label && profileConfig.invite.href);
  profileElements.invite.hidden = !hasInvite;
  profileElements.invite.textContent = profileConfig.invite.label;
  profileElements.invite.href = profileConfig.invite.href || "#";
  profileElements.discordLink.href = profileConfig.discord.profileUrl || profileConfig.invite.href || "#";
  profileElements.discordButton.href = profileConfig.discord.profileUrl || profileConfig.invite.href || "#";

  renderClickCount(getCurrentClickCount());
  syncPaymentButtons();
  applyFallbackPresence();
  updateSoundButtonState();
}

async function copyTextToClipboard(text) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }

  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "absolute";
  textarea.style.left = "-9999px";
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand("copy");
  textarea.remove();
}

async function handleCopy(type) {
  const address =
    type === "btc" ? profileConfig.crypto.btcAddress : profileConfig.crypto.ltcAddress;

  if (!address || address.startsWith("PASTE_YOUR")) {
    setProfileFeedback(`Please add your ${type.toUpperCase()} address in script.js.`);
    return;
  }

  try {
    await copyTextToClipboard(address);
    incrementClickCount();
    setProfileFeedback(`${type.toUpperCase()} address copied.`);
  } catch {
    setProfileFeedback(`${type.toUpperCase()} address could not be copied.`);
  }
}

function bindEvents() {
  introGate.addEventListener("click", () => {
    enterPage();
  });

  introGate.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      enterPage();
    }
  });

  tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      setActiveTab(tab.dataset.tab);
    });
  });

  switches.forEach((element) => {
    element.addEventListener("click", () => {
      setActiveTab(element.dataset.switchTo);
    });
  });

  trackedLinks.forEach((element) => {
    element.addEventListener("click", () => {
      incrementClickCount();
    });
  });

  copyButtons.forEach((button) => {
    button.addEventListener("click", () => {
      handleCopy(button.dataset.copyAddress);
    });
  });

  soundButton.addEventListener("click", (event) => {
    event.stopPropagation();
    const nextOpenState = !soundControl.classList.contains("is-open");
    setVolumePanelOpen(nextOpenState);

    if (nextOpenState && hasControllableMedia()) {
      applyVolume(currentVolume, { userInitiated: true });
    } else if (nextOpenState) {
      setProfileFeedback("No real audio can be controlled with this video right now.");
    }
  });

  volumePanel.addEventListener("click", (event) => {
    event.stopPropagation();
  });

  volumeSlider.addEventListener("input", () => {
    applyVolume(volumeSlider.value, { userInitiated: true });
  });

  document.addEventListener("click", () => {
    setVolumePanelOpen(false);
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      setVolumePanelOpen(false);
    }
  });

  document.addEventListener("visibilitychange", () => {
    syncMediaPlayback();
  });

  profileAudio.addEventListener("play", updateSoundButtonState);
  profileAudio.addEventListener("pause", updateSoundButtonState);

  profileVideo.addEventListener("canplay", () => {
    profileVideo.classList.add("is-ready");
    profileVideo.classList.remove("is-hidden");
    syncMediaPlayback();
  });

  profileVideo.addEventListener("error", () => {
    profileVideo.classList.remove("is-ready");
    profileVideo.pause();
  });
}

function initDiscordPresence() {
  refreshDiscordPresence();

  if (!profileConfig.discord.userId) {
    return;
  }

  presenceIntervalId = window.setInterval(refreshDiscordPresence, 60000);
}

function init() {
  document.body.classList.add("is-locked");
  currentVolume = clampVolume(profileConfig.media.defaultVolume);
  audioEnabledByUser = false;
  setStorageValue(profileConfig.media.volumeStorageKey, currentVolume);
  applyProfileConfig();
  bindEvents();
  initDiscordPresence();

  const initialTab = window.location.hash.replace("#", "");
  const hasMatchingTab = [...tabs].some((tab) => tab.dataset.tab === initialTab);
  setActiveTab(hasMatchingTab ? initialTab : "profile");
}

window.addEventListener("beforeunload", () => {
  window.clearInterval(presenceIntervalId);
});

init();
