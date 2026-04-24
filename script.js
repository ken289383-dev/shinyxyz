// Trag hier nur noch deine echten Daten, Wallets und Media-Dateien ein.
const profileConfig = {
  name: "Shiny",
  tagline: "FiveM/Cheat Dev DM for Source | OpiumService:",
  invite: {
    label: "https://discord.gg/2BAwrUscuP",
    href: "https://discord.gg/2BAwrUscuP",
  },
  discord: {
    userId: "1260713369749553152",
    username: "shiny17_",
    avatarUrl: "",
    profileUrl: "",
    fallbackStatus: "last seen unknown",
    fallbackState: "offline",
  },
  crypto: {
    btcAddress: "PASTE_YOUR_BTC_ADDRESS",
    ltcAddress: "PASTE_YOUR_LTC_ADDRESS",
  },
  media: {
    backgroundVideo: "https://youtu.be/hzt31eJTGxo?si=SoMRRd5vtgDC1OJf",
    song: "",
  },
  counters: {
    storageKey: "shiny-profile-link-clicks",
    defaultClicks: 78,
  },
};

const tabs = document.querySelectorAll(".top-tab");
const panes = document.querySelectorAll(".tab-pane");
const switches = document.querySelectorAll("[data-switch-to]");
const soundButton = document.querySelector(".sound-button");
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

  if (window.location.hash !== `#${tabName}`) {
    history.replaceState(null, "", `#${tabName}`);
  }
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

function updateSoundButtonState() {
  const hasYouTube = mediaMode === "youtube" && Boolean(youtubePlayer);
  const hasSong = hasYouTube || Boolean(profileConfig.media.song);
  const isYouTubePlaying =
    hasYouTube &&
    typeof youtubePlayer.getPlayerState === "function" &&
    typeof youtubePlayer.isMuted === "function" &&
    youtubePlayer.getPlayerState() === window.YT?.PlayerState?.PLAYING &&
    !youtubePlayer.isMuted();
  const isPlaying = isYouTubePlaying || (mediaMode === "audio" && !profileAudio.paused);

  soundButton.classList.toggle("is-disabled", !hasSong);
  soundButton.classList.toggle("is-playing", isPlaying);
  soundButton.setAttribute(
    "aria-label",
    hasSong
      ? isPlaying
        ? "Profilmusik ausschalten"
        : "Profilmusik einschalten"
      : "Profilmusik ist noch nicht eingerichtet"
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
    online: "online on Discord",
    idle: "idle on Discord",
    dnd: "do not disturb",
    offline: "offline on Discord",
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

  youtubeApiPromise = new Promise((resolve) => {
    const previousReady = window.onYouTubeIframeAPIReady;

    window.onYouTubeIframeAPIReady = () => {
      previousReady?.();
      resolve(window.YT);
    };

    const existingScript = document.querySelector('script[src="https://www.youtube.com/iframe_api"]');
    if (existingScript) {
      return;
    }

    const script = document.createElement("script");
    script.src = "https://www.youtube.com/iframe_api";
    document.head.appendChild(script);
  });

  return youtubeApiPromise;
}

function resetMediaVisibility() {
  profileYoutube.classList.add("is-hidden");
  profileYoutube.classList.remove("is-ready");
  profileYoutube.style.backgroundImage = "";
  profileVideo.classList.add("is-hidden");
  profileVideo.classList.remove("is-ready");
}

async function setupYoutubePlayer(videoId) {
  mediaMode = "youtube";
  youtubeEmbedBlocked = false;
  profileAudio.removeAttribute("src");
  profileVideo.pause();
  profileVideo.removeAttribute("src");
  profileVideo.load();
  resetMediaVisibility();

  const YT = await ensureYoutubeApi();

  if (youtubePlayer?.destroy) {
    youtubePlayer.destroy();
  }

  profileYoutube.innerHTML = "";
  profileYoutube.style.backgroundImage = getYoutubePoster(videoId);
  profileYoutube.classList.remove("is-hidden");
  profileYoutube.classList.add("is-ready");

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
        updateSoundButtonState();
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
        profileYoutube.innerHTML = "";
        profileYoutube.style.backgroundImage = getYoutubePoster(videoId);
        profileYoutube.classList.remove("is-hidden");
        profileYoutube.classList.add("is-ready");
        setProfileFeedback("Dieses YouTube-Video blockiert Embed. Ich zeige deshalb nur das Coverbild.");
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
    setupYoutubePlayer(youtubeVideoId);
  } else if (profileConfig.media.backgroundVideo) {
    mediaMode = "video";
    if (youtubePlayer?.destroy) {
      youtubePlayer.destroy();
      youtubePlayer = null;
    }
    profileYoutube.innerHTML = "";
    profileYoutube.classList.add("is-hidden");
    profileVideo.src = profileConfig.media.backgroundVideo;
    profileVideo.load();
    profileVideo.classList.remove("is-hidden");
  } else {
    if (youtubePlayer?.destroy) {
      youtubePlayer.destroy();
      youtubePlayer = null;
    }
    resetMediaVisibility();
  }

  if (profileConfig.media.song) {
    mediaMode = "audio";
    profileAudio.src = profileConfig.media.song;
    profileAudio.load();
  }

  updateSoundButtonState();
}

function applyProfileConfig() {
  profileElements.name.textContent = profileConfig.name;
  profileElements.tagline.textContent = profileConfig.tagline;
  profileElements.invite.textContent = profileConfig.invite.label;
  profileElements.invite.href = profileConfig.invite.href;
  profileElements.discordLink.href = profileConfig.discord.profileUrl || profileConfig.invite.href;
  profileElements.discordButton.href = profileConfig.discord.profileUrl || profileConfig.invite.href;

  renderClickCount(getCurrentClickCount());
  applyFallbackPresence();
  updateProfileMedia();
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
    setProfileFeedback(`Bitte ${type.toUpperCase()} Adresse in script.js eintragen.`);
    return;
  }

  try {
    await copyTextToClipboard(address);
    incrementClickCount();
    setProfileFeedback(`${type.toUpperCase()} Adresse kopiert.`);
  } catch {
    setProfileFeedback(`${type.toUpperCase()} konnte nicht kopiert werden.`);
  }
}

async function toggleAudioPlayback() {
  if (youtubeEmbedBlocked) {
    setProfileFeedback("Dieses YouTube-Video kann nicht direkt eingebettet abgespielt werden.");
    return;
  }

  if (mediaMode === "youtube" && youtubePlayer) {
    try {
      if (youtubePlayer.isMuted()) {
        youtubePlayer.unMute();
        youtubePlayer.setVolume(70);
        youtubePlayer.playVideo();
      } else {
        youtubePlayer.mute();
      }
    } catch {
      setProfileFeedback("Der YouTube Ton konnte nicht umgeschaltet werden.");
    } finally {
      updateSoundButtonState();
    }
    return;
  }

  if (!profileConfig.media.song) {
    setProfileFeedback("Trag deine Song-Datei in script.js ein.");
    return;
  }

  try {
    if (profileAudio.paused) {
      await profileAudio.play();
    } else {
      profileAudio.pause();
    }
  } catch {
    setProfileFeedback("Die Musik konnte gerade nicht gestartet werden.");
  } finally {
    updateSoundButtonState();
  }
}

function bindEvents() {
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

  soundButton.addEventListener("click", () => {
    toggleAudioPlayback();
  });

  profileAudio.addEventListener("play", updateSoundButtonState);
  profileAudio.addEventListener("pause", updateSoundButtonState);

  profileVideo.addEventListener("canplay", () => {
    profileVideo.classList.add("is-ready");
    profileVideo.classList.remove("is-hidden");
  });

  profileVideo.addEventListener("error", () => {
    profileVideo.classList.remove("is-ready");
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
