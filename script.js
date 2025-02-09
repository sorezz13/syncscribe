// Initialize Firebase
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.16.0/firebase-app.js";
import {
  getFirestore,
  collection,
  getDocs,
  addDoc,
  deleteDoc,
  query,
  where,
  doc,
  onSnapshot,
  Timestamp,
  orderBy,
} from "https://www.gstatic.com/firebasejs/9.16.0/firebase-firestore.js";

// Firebase Configuration
const firebaseConfig = {
  apiKey: "AIzaSyCmrSXbK58bsr54OGc9rywXWjL8lfYvufI",
  authDomain: "syncscribe-2de6e.firebaseapp.com",
  projectId: "syncscribe-2de6e",
  storageBucket: "syncscribe-2de6e.firebasestorage.app",
  messagingSenderId: "447987259771",
  appId: "1:447987259771:web:4da231f069f78ea4be45de",
  measurementId: "G-442X8YXXR7",
};

// Initialize Firebase and Firestore
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Spotify API Credentials
const SPOTIFY_CLIENT_ID = "277d88e7a20b406f8d0b29111581da38"; // Replace with your Spotify Client ID
const REDIRECT_URI = "https://leelan.studio/"; // Replace with your app's Redirect URI
let spotifyAccessToken = "";

// DOM Elements
const connectSpotifyBtn = document.getElementById("connectSpotifyBtn");
const disconnectSpotifyBtn = document.getElementById("disconnectSpotifyBtn");
const addEntryBtn = document.getElementById("addEntryBtn");
const entryInput = document.getElementById("entry");
const songSearchInput = document.getElementById("songSearch");
const selectedSongDisplay = document.getElementById("selectedSong");
const ratingStars = document.getElementById("ratingStars");
const entriesContainer = document.getElementById("entries");

// Suggestions Container
const suggestionsContainer = document.createElement("div");
suggestionsContainer.id = "suggestionsContainer";
suggestionsContainer.style.position = "absolute";
suggestionsContainer.style.marginTop = "5px";
suggestionsContainer.style.backgroundColor = "#2e2e2e";
suggestionsContainer.style.color = "#e6e6e6";
suggestionsContainer.style.zIndex = "1000";
suggestionsContainer.style.border = "1px solid #444";
suggestionsContainer.style.borderRadius = "5px";
suggestionsContainer.style.maxHeight = "300px";
suggestionsContainer.style.overflow = "hidden";
suggestionsContainer.style.display = "none";
songSearchInput.parentNode.insertBefore(suggestionsContainer, songSearchInput.nextSibling);

// State Variables
let selectedSong = null;
let songRating = 0;

// Event Listeners
document.addEventListener("DOMContentLoaded", initializeApp);
connectSpotifyBtn.addEventListener("click", connectSpotify);
disconnectSpotifyBtn.addEventListener("click", disconnectSpotify);
addEntryBtn.addEventListener("click", addEntry);
songSearchInput.addEventListener("input", handleSongSearchInput);
ratingStars.addEventListener("click", handleRatingClick);

// Initialize App
function initializeApp() {
  adjustSuggestionsWidth();
  checkAccessToken();
  setupSongSearch();
  setupStarRatings();
  loadDecryptedEntriesFromFirebase();
}

// Adjust Suggestions Container Width
function adjustSuggestionsWidth() {
  suggestionsContainer.style.width = `${songSearchInput.offsetWidth}px`;
}

// Check Spotify Access Token
function checkAccessToken() {
  const hash = window.location.hash.substring(1);
  const params = new URLSearchParams(hash);
  const newAccessToken = params.get("access_token");

  if (newAccessToken) {
    localStorage.setItem("spotifyAccessToken", newAccessToken);
    spotifyAccessToken = newAccessToken;
    connectSpotifyBtn.style.display = "none";
    disconnectSpotifyBtn.style.display = "block";
    fetchUserName();
    window.history.replaceState({}, document.title, window.location.pathname);
  } else {
    spotifyAccessToken = localStorage.getItem("spotifyAccessToken");
    if (spotifyAccessToken) {
      connectSpotifyBtn.style.display = "none";
      disconnectSpotifyBtn.style.display = "block";
      fetchUserName();
    } else {
      connectSpotifyBtn.style.display = "block";
      disconnectSpotifyBtn.style.display = "none";
    }
  }
}

// Fetch and Display User Name
async function fetchUserName() {
  if (!spotifyAccessToken) return;

  try {
    const response = await fetch("https://api.spotify.com/v1/me", {
      headers: {
        Authorization: `Bearer ${spotifyAccessToken}`,
      },
    });
    const data = await response.json();
    const userName = data.display_name || "User";
    const userId = data.id; // Spotify user ID

    if (userId) {
      localStorage.setItem("spotifyUserId", userId);
      const derivedKey = await deriveKeyFromSpotify(userId);
      const exportedKey = await exportKey(derivedKey);
      localStorage.setItem("encryptionKey", exportedKey);
      displayUserName(userName);
    }
  } catch (error) {
    console.error("Error fetching user profile:", error);
  }
}

// Display User Name
function displayUserName(userName) {
  const header = document.querySelector(".header");
  const existingGreeting = header.querySelector("h2");
  if (existingGreeting) existingGreeting.remove();

  const greeting = document.createElement("h2");
  greeting.textContent = `Hi, ${userName}`;
  greeting.style.color = "#1DB954";
  header.appendChild(greeting);
}

// Connect to Spotify
function connectSpotify() {
  const scopes = "user-read-private user-read-email";
  const authUrl = `https://accounts.spotify.com/authorize?response_type=token&client_id=${SPOTIFY_CLIENT_ID}&redirect_uri=${encodeURIComponent(
    REDIRECT_URI
  )}&scope=${encodeURIComponent(scopes)}&show_dialog=true`;
  window.location.href = authUrl;
}

// Disconnect Spotify
function disconnectSpotify() {
  localStorage.removeItem("spotifyAccessToken");
  localStorage.removeItem("spotifyUserId");
  localStorage.removeItem("encryptionKey");
  spotifyAccessToken = "";
  connectSpotifyBtn.style.display = "block";
  disconnectSpotifyBtn.style.display = "none";
  alert("Disconnected from Spotify.");
}

// Handle Song Search Input
async function handleSongSearchInput() {
  const query = songSearchInput.value.trim();
  if (query) {
    const suggestions = await fetchSuggestions(query);
    renderSuggestions(suggestions);
  } else {
    suggestionsContainer.innerHTML = "";
    suggestionsContainer.style.display = "none";
  }
}

// Fetch Song Suggestions
async function fetchSuggestions(query) {
  try {
    const response = await fetch(
      `https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=track&limit=5`,
      {
        headers: {
          Authorization: `Bearer ${spotifyAccessToken}`,
        },
      }
    );
    const data = await response.json();
    return data.tracks.items.map((track) => ({
      title: track.name,
      artist: track.artists[0].name,
      albumArtwork: track.album.images[0]?.url || "https://via.placeholder.com/50",
      url: track.external_urls.spotify,
    }));
  } catch (error) {
    console.error("Error fetching suggestions:", error);
    return [];
  }
}

// Render Song Suggestions
function renderSuggestions(suggestions) {
  if (suggestions.length === 0) {
    suggestionsContainer.style.display = "none";
    return;
  }

  suggestionsContainer.style.display = "block";
  suggestionsContainer.innerHTML = suggestions
    .map(
      (s) => `
        <div class="suggestion-item" style="cursor: pointer; padding: 5px; border-bottom: 1px solid #444; display: flex; align-items: center;">
          <img src="${s.albumArtwork}" alt="Album Artwork" style="width: 50px; vertical-align: middle; margin-right: 10px; border-radius: 5px;">
          <span>${s.title} by ${s.artist}</span>
        </div>
      `
    )
    .join("");

  const suggestionItems = document.querySelectorAll(".suggestion-item");
  suggestionItems.forEach((item, index) => {
    item.addEventListener("click", () => {
      selectedSong = suggestions[index];
      selectedSongDisplay.innerHTML = `
        <div>
          <img src="${selectedSong.albumArtwork}" alt="Album Artwork" style="width: 100px; border-radius: 10px;">
          <p><a href="${selectedSong.url}" target="_blank" style="color: #1DB954;">${selectedSong.title} by ${selectedSong.artist}</a></p>
          <button id="removeSelectedSong" style="margin-top: 10px; background-color: #ff0000; color: white; padding: 10px; border: none; border-radius: 5px; cursor: pointer; transition: background-color 0.3s;">Remove Selected Song</button>
        </div>
      `;
      suggestionsContainer.innerHTML = "";
      suggestionsContainer.style.display = "none";
    });
  });
}

// Handle Rating Click
function handleRatingClick(e) {
  if (e.target.tagName === "SPAN") {
    songRating = parseInt(e.target.getAttribute("data-value"));
    updateStarColors();
  }
}

// Update Star Colors
function updateStarColors() {
  const stars = ratingStars.querySelectorAll("span");
  stars.forEach((star) => {
    const value = parseInt(star.getAttribute("data-value"));
    star.classList.toggle("active", value <= songRating);
  });
}

// Add New Entry
async function addEntry() {
  const userId = localStorage.getItem("spotifyUserId");
  if (!userId) {
    return alert("Please connect your Spotify account first.");
  }

  const text = entryInput.value.trim();
  if (!text) return alert("Please write something before adding an entry.");
  if (!selectedSong) return alert("Please select a song from the suggestions.");

  const newEntry = {
    text,
    date: Timestamp.now(),
    song: selectedSong,
    rating: songRating,
    userId,
  };

  try {
    await saveEncryptedEntryToCloud(newEntry);
    entryInput.value = "";
    selectedSongDisplay.innerHTML = "";
    songSearchInput.value = "";
    selectedSong = null;
    songRating = 0;
    updateStarColors();
  } catch (error) {
    console.error("Error saving entry:", error);
    alert("Failed to save entry. Please try again.");
  }
}

// Save Encrypted Entry to Firestore
async function saveEncryptedEntryToCloud(entry) {
  const userId = localStorage.getItem("spotifyUserId");
  if (!userId) {
    console.error("User ID not available.");
    return;
  }

  const encryptionKey = localStorage.getItem("encryptionKey");
  if (!encryptionKey) {
    console.error("Encryption key not found.");
    return;
  }

  const key = await importKey(encryptionKey);

  try {
    const encryptedText = await encryptData(key, entry.text);
    await addDoc(collection(db, "journalEntries"), {
      ...entry,
      text: encryptedText.encrypted,
      iv: encryptedText.iv,
      userId,
    });
  } catch (error) {
    console.error("Error saving encrypted entry:", error);
  }
}

// Load and Decrypt Entries from Firestore
async function loadDecryptedEntriesFromFirebase() {
  const userId = localStorage.getItem("spotifyUserId");
  if (!userId) {
    console.error("User ID not available. Please log in.");
    return;
  }

  const encryptionKey = localStorage.getItem("encryptionKey");
  if (!encryptionKey) {
    console.error("Encryption key not found.");
    return;
  }

  const key = await importKey(encryptionKey);

  try {
    const entriesQuery = query(
      collection(db, "journalEntries"),
      where("userId", "==", userId),
      orderBy("date", "desc")
    );

    onSnapshot(entriesQuery, (querySnapshot) => {
      entriesContainer.innerHTML = "";

      if (querySnapshot.empty) {
        entriesContainer.innerHTML = "<p>No entries found.</p>";
        return;
      }

      querySnapshot.forEach(async (doc) => {
        const data = doc.data();
        if (!data.iv || !data.text) {
          console.error("Missing IV or text in entry:", data);
          return;
        }

        try {
          const decryptedText = await decryptData(key, data.iv, data.text);
          renderEntry({
            ...data,
            text: decryptedText,
            id: doc.id,
          });
        } catch (decryptionError) {
          console.error("Error decrypting entry:", decryptionError);
        }
      });
    });
  } catch (error) {
    console.error("Error loading or decrypting entries:", error);
  }
}

// Render Entry
function renderEntry(entry) {
  const entryDiv = document.createElement("div");
  entryDiv.classList.add("entry");
  entryDiv.setAttribute("data-id", entry.id);

  const formattedDate =
    entry.date instanceof Object && entry.date.seconds
      ? new Date(entry.date.seconds * 1000).toLocaleString()
      : entry.date;

  const songHTML = entry.song
    ? `
      <div class="song">
        <img src="${entry.song.albumArtwork}" alt="Album Artwork" style="width: 100px; border-radius: 10px;">
        <p><a href="${entry.song.url}" target="_blank" style="color:#1DB954;">${entry.song.title} by ${entry.song.artist}</a></p>
      </div>
    `
    : "";

  entryDiv.innerHTML = `
    <p>${entry.text}</p>
    ${songHTML}
    <p>${generateStarsHTML(entry.rating || 0)}</p>
    <p>${formattedDate}</p>
    <button class="delete">Delete</button>
  `;

  entryDiv.querySelector(".delete").addEventListener("click", async () => {
    const entryId = entryDiv.getAttribute("data-id");
    await deleteEntryFromCloud(entryId);
    entryDiv.remove();
  });

  entriesContainer.prepend(entryDiv);
}

// Delete Entry from Firestore
async function deleteEntryFromCloud(id) {
  try {
    await deleteDoc(doc(db, "journalEntries", id));
    console.log("Entry deleted: ", id);
  } catch (error) {
    console.error("Error deleting entry: ", error);
  }
}

// Generate Stars HTML
function generateStarsHTML(rating) {
  const maxStars = 5;
  return Array.from({ length: maxStars }, (_, i) =>
    `<span style="color: ${i < rating ? "#1DB954" : "#ccc"}; font-size: 1.2rem;">&#9733;</span>`
  ).join("");
}

// Encryption Functions
async function deriveKeyFromSpotify(userId) {
  const salt = "a-secure-static-salt";
  const iterations = 100000;
  const encoder = new TextEncoder();

  const keyMaterial = await window.crypto.subtle.importKey(
    "raw",
    encoder.encode(userId),
    { name: "PBKDF2" },
    false,
    ["deriveKey"]
  );

  return await window.crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: encoder.encode(salt),
      iterations: iterations,
      hash: "SHA-256",
    },
    keyMaterial,
    { name: "AES-CBC", length: 256 },
    true,
    ["encrypt", "decrypt"]
  );
}

async function exportKey(key) {
  const rawKey = await crypto.subtle.exportKey("raw", key);
  return btoa(String.fromCharCode(...new Uint8Array(rawKey)));
}

async function importKey(base64Key) {
  const rawKey = Uint8Array.from(atob(base64Key), (c) => c.charCodeAt(0));
  return await crypto.subtle.importKey(
    "raw",
    rawKey,
    { name: "AES-CBC" },
    true,
    ["encrypt", "decrypt"]
  );
}

async function encryptData(key, data) {
  const iv = window.crypto.getRandomValues(new Uint8Array(16));
  const encoder = new TextEncoder();
  const encrypted = await window.crypto.subtle.encrypt(
    {
      name: "AES-CBC",
      iv: iv,
    },
    key,
    encoder.encode(data)
  );

  return {
    iv: Array.from(iv),
    encrypted: btoa(String.fromCharCode(...new Uint8Array(encrypted))),
  };
}

async function decryptData(key, ivArray, encryptedData) {
  try {
    const iv = new Uint8Array(ivArray);
    const encrypted = Uint8Array.from(atob(encryptedData), (c) => c.charCodeAt(0));
    const decrypted = await window.crypto.subtle.decrypt(
      {
        name: "AES-CBC",
        iv: iv,
      },
      key,
      encrypted
    );

    const decoder = new TextDecoder();
    return decoder.decode(decrypted);
  } catch (error) {
    console.error("Decryption Error:", error);
    throw error;
  }
}
