// Initialize Firebase
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.16.0/firebase-app.js";
import { getFirestore, collection, getDocs, addDoc, deleteDoc, query, where, doc, onSnapshot, Timestamp, updateDoc} from "https://www.gstatic.com/firebasejs/9.16.0/firebase-firestore.js";




const entriesContainer = document.getElementById("entries");

let selectedSong = null;
let songRating = 0; // Declare globally to track the rating




const firebaseConfig = {
  apiKey: "AIzaSyCmrSXbK58bsr54OGc9rywXWjL8lfYvufI",
  authDomain: "syncscribe-2de6e.firebaseapp.com",
  projectId: "syncscribe-2de6e",
  storageBucket: "syncscribe-2de6e.firebasestorage.app",
  messagingSenderId: "447987259771",
  appId: "1:447987259771:web:4da231f069f78ea4be45de",
  measurementId: "G-442X8YXXR7"
};
// Initialize Firebase and Firestore
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);



// Function to convert string dates to Firestore Timestamps







// Derive a key from the Spotify user ID

async function deriveKeyFromSpotify(userId) {
  const salt = "a-secure-static-salt"; // Use a secure and constant salt (store safely)
  const iterations = 100000;          // Number of PBKDF2 iterations
  const encoder = new TextEncoder();

  // Import the user ID as key material
  const keyMaterial = await window.crypto.subtle.importKey(
    "raw",
    encoder.encode(userId),
    { name: "PBKDF2" },
    false,
    ["deriveKey"]
  );

  // Derive the encryption key
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

// Export a derived key for storage (e.g., in localStorage or IndexedDB)
async function exportKey(key) {
  const rawKey = await crypto.subtle.exportKey("raw", key);
  return btoa(String.fromCharCode(...new Uint8Array(rawKey))); // Convert to Base64
}

// Import a previously exported key (e.g., retrieve from localStorage)
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

// Encrypt data using the derived key
async function encryptData(key, data) {
  const iv = window.crypto.getRandomValues(new Uint8Array(16)); // Generate random IV
  const encoder = new TextEncoder();
  const encrypted = await window.crypto.subtle.encrypt(
    {
      name: "AES-CBC",
      iv: iv, // Initialization Vector
    },
    key,
    encoder.encode(data) // Encode the data into ArrayBuffer
  );

  console.log("IV:", iv); // Debug
  console.log("Encrypted ArrayBuffer:", encrypted); // Debug

  return {
    iv: Array.from(iv), // Convert IV to an array for storage
    encrypted: btoa(String.fromCharCode(...new Uint8Array(encrypted))), // Base64 encode
  };
}


// Decrypt data using the derived key
async function decryptData(key, ivArray, encryptedData) {
  try {
    const iv = new Uint8Array(ivArray); // Convert IV back to Uint8Array
    console.log("Decrypting with IV:", iv); // Debug: Log IV
    console.log("Encrypted Data (Base64):", encryptedData); // Debug: Log encrypted data

    const encrypted = Uint8Array.from(atob(encryptedData), (c) => c.charCodeAt(0)); // Decode Base64
    const decrypted = await window.crypto.subtle.decrypt(
      {
        name: "AES-CBC",
        iv: iv,
      },
      key,
      encrypted
    );

    const decoder = new TextDecoder();
    return decoder.decode(decrypted); // Decode ArrayBuffer back to a string
  } catch (error) {
    console.error("Decryption Error:", error);
    throw error;
  }
}








// Spotify API Credentials
const SPOTIFY_CLIENT_ID = "277d88e7a20b406f8d0b29111581da38"; // Replace with your Spotify Client ID
const REDIRECT_URI = "https://leelan.studio/"; // Replace with your app's Redirect URI
let spotifyAccessToken = "";


function displayUserName(userName) {
  const header = document.querySelector(".header");

  // Remove any existing greeting
  const existingGreeting = header.querySelector("h2");
  if (existingGreeting) {
    existingGreeting.remove();
  }

  const greeting = document.createElement("h2");
  greeting.textContent = `Hi, ${userName}`;
  greeting.style.color = "#1DB954"; // Optional: Style the text
  header.appendChild(greeting);
}

document.addEventListener("DOMContentLoaded", () => {
  const hash = window.location.hash.substring(1);
  const params = new URLSearchParams(hash);
  const newAccessToken = params.get("access_token");

  if (newAccessToken) {
    // Store the token and fetch the user's name
    localStorage.setItem("spotifyAccessToken", newAccessToken);
    spotifyAccessToken = newAccessToken;
    connectSpotifyBtn.style.display = "none";
    fetchUserName(); // Fetch and display the user's name
    window.history.replaceState({}, document.title, window.location.pathname);
  } else {
    // Retrieve token from storage
    spotifyAccessToken = localStorage.getItem("spotifyAccessToken");

    if (spotifyAccessToken) {
      connectSpotifyBtn.style.display = "none";
      fetchUserName(); // Fetch and display the user's name
    } else {
      connectSpotifyBtn.style.display = "block";
    }
  }
});

// Other existing functions and event listeners remain unchanged...
async function fetchUserName() {
  if (!spotifyAccessToken) {
    console.error("No access token available.");
    return;
  }

  try {
    const response = await fetch("https://api.spotify.com/v1/me", {
      headers: {
        Authorization: `Bearer ${spotifyAccessToken}`,
      },
    });
    const data = await response.json();
    console.log("Spotify API Response:", data);

    const userName = data.display_name || "User";
    const userId = data.id; // Spotify user ID
    console.log("Fetched User Name:", userName);
    console.log("Fetched User ID:", userId);

    if (userId) {
      localStorage.setItem("spotifyUserId", userId); // Save Spotify user ID
      const derivedKey = await deriveKeyFromSpotify(userId);
      const exportedKey = await exportKey(derivedKey);
      localStorage.setItem("encryptionKey", exportedKey); // Store the key securely

      displayUserName(userName);
    } else {
      console.error("User ID is missing in Spotify response.");
    }
  } catch (error) {
    console.error("Error fetching user profile:", error);
  }
}
// Close the fetchUserName function







// Selectors
const connectSpotifyBtn = document.getElementById("connectSpotifyBtn");
const addEntryBtn = document.getElementById("addEntryBtn");
const entryInput = document.getElementById("entry");
const songSearchInput = document.getElementById("songSearch");
const selectedSongDisplay = document.getElementById("selectedSong");
const ratingStars = document.getElementById("ratingStars");

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
suggestionsContainer.style.overflow = "hidden"; // Remove scroll bar
suggestionsContainer.style.display = "none"; // Initially hidden
songSearchInput.parentNode.insertBefore(suggestionsContainer, songSearchInput.nextSibling);

// Adjust width dynamically
function adjustSuggestionsWidth() {
  suggestionsContainer.style.width = `${songSearchInput.offsetWidth}px`;
}

window.addEventListener("resize", adjustSuggestionsWidth);
document.addEventListener("DOMContentLoaded", () => {
  adjustSuggestionsWidth(); // Adjust on load

  const hash = window.location.hash.substring(1);
  const params = new URLSearchParams(hash);
  const newAccessToken = params.get("access_token");

  if (newAccessToken) {
    console.log("New Access Token:", newAccessToken);
    localStorage.setItem("spotifyAccessToken", newAccessToken);
    spotifyAccessToken = newAccessToken;
    connectSpotifyBtn.style.display = "none";
    window.history.replaceState({}, document.title, window.location.pathname);
    checkAccessTokenExpiration();
  } else {
    spotifyAccessToken = localStorage.getItem("spotifyAccessToken");
    connectSpotifyBtn.style.display = spotifyAccessToken ? "none" : "block";
    checkAccessTokenExpiration();
  }

  connectSpotifyBtn.addEventListener("click", () => {
    const scopes = "user-read-private user-read-email";
    const authUrl = `https://accounts.spotify.com/authorize?response_type=token&client_id=${SPOTIFY_CLIENT_ID}&redirect_uri=${encodeURIComponent(
      REDIRECT_URI
    )}&scope=${encodeURIComponent(scopes)}&show_dialog=true`;
    window.location.href = authUrl;
  });

  setupSongSearch();
  setupStarRatings();
  loadDecryptedEntriesFromFirebase();
});

function checkAccessTokenExpiration() {
  if (spotifyAccessToken) {
    fetch("https://api.spotify.com/v1/me", {
      headers: {
        Authorization: `Bearer ${spotifyAccessToken}`,
      },
    })
      .then((response) => {
        if (response.status === 401) {
          console.log("Access token expired");
          localStorage.removeItem("spotifyAccessToken");
          spotifyAccessToken = "";
          connectSpotifyBtn.style.display = "block";
        }
      })
      .catch((error) => {
        console.error("Error verifying access token:", error);
        connectSpotifyBtn.style.display = "block";
      });
  }
}

function setupSongSearch() {
  songSearchInput.addEventListener("input", async () => {
    const query = songSearchInput.value.trim();
    if (query) {
      const suggestions = await fetchSuggestions(query);
      renderSuggestions(suggestions);
    } else {
      suggestionsContainer.innerHTML = "";
      suggestionsContainer.style.display = "none";
    }
  });
}

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
      const selected = suggestions[index];
      selectedSong = selected;
      selectedSongDisplay.innerHTML = `
        <div>
          <img src="${selected.albumArtwork}" alt="Album Artwork" style="width: 100px; border-radius: 10px;">
          <p><a href="${selected.url}" target="_blank" style="color: #1DB954;">${selected.title} by ${selected.artist}</a></p>
          <button id="removeSelectedSong" style="margin-top: 10px; background-color: #ff0000; color: white; padding: 10px; border: none; border-radius: 5px; cursor: pointer; transition: background-color 0.3s;">Remove Selected Song</button>
        </div>
      `;
      suggestionsContainer.innerHTML = "";
      suggestionsContainer.style.display = "none";

      const removeButton = document.getElementById("removeSelectedSong");
      
      removeButton.addEventListener("click", () => {
        selectedSong = null;
        selectedSongDisplay.innerHTML = "";
        songSearchInput.value = "";
      });
    });
  });
}




function setupStarRatings() {
  ratingStars.addEventListener("click", (e) => {
    if (e.target.tagName === "SPAN") {
      songRating = parseInt(e.target.getAttribute("data-value"));
      updateStarColors();
    }
  });
}

function updateStarColors() {
  const stars = ratingStars.querySelectorAll("span");
  stars.forEach((star) => {
    const value = parseInt(star.getAttribute("data-value"));
    star.classList.toggle("active", value <= songRating);
  });
}

// Add New Entry
addEntryBtn.addEventListener("click", async () => {
  const userId = localStorage.getItem("spotifyUserId");
  if (!userId) {
    return alert("Please connect your Spotify account first.");
  }

  const text = entryInput.value.trim();
  if (!text) return alert("Please write something before adding an entry.");
  if (!selectedSong) return alert("Please select a song from the suggestions.");

  const newEntry = {
    text,
    date: Timestamp.now(), // Use Firestore's Timestamp for compatibility
    song: selectedSong,
    rating: songRating,
    userId: userId, // Ensure userId is saved
  };

  try {
    console.log("New Entry Before Encryption:", newEntry);
    await saveEncryptedEntryToCloud(newEntry); // Encrypt and save entry to Firestore

    // Reset input fields
    entryInput.value = "";
    selectedSongDisplay.innerHTML = "";
    songSearchInput.value = "";
    selectedSong = null;
    songRating = 0;

    console.log("Entry added successfully!");
  } catch (error) {
    console.error("Error saving entry:", error);
    alert("Failed to save entry. Please try again.");
  }
});





async function saveEncryptedEntryToCloud(entry) {
  const userId = localStorage.getItem("spotifyUserId");
  if (!userId) {
    console.error("User ID not available.");
    return;
  }

  // Retrieve the encryption key
  const encryptionKey = localStorage.getItem("encryptionKey");
  if (!encryptionKey) {
    console.error("Encryption key not found.");
    return;
  }

  const key = await importKey(encryptionKey);

  try {
    // Encrypt the entry text
    const encryptedText = await encryptData(key, entry.text);

    // Save the entry to Firebase with encrypted text
    const docRef = await addDoc(collection(db, "journalEntries"), {
      ...entry,
      text: encryptedText.encrypted, // Save encrypted text
      iv: encryptedText.iv,         // Save the IV for decryption
      userId,                       // Tie the entry to the user
    });

    console.log("Encrypted entry saved with ID:", docRef.id);
  } catch (error) {
    console.error("Error saving encrypted entry:", error);
  }
}







import { orderBy } from "https://www.gstatic.com/firebasejs/9.16.0/firebase-firestore.js";

let unsubscribe = null;

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
      orderBy("date", "desc") // Fetch newest entries first
    );

    // Unsubscribe from any existing listener to prevent duplicates
    if (unsubscribe) {
      unsubscribe();
    }

    unsubscribe = onSnapshot(entriesQuery, (querySnapshot) => {
      console.log("Fetched Entries from Firestore:", querySnapshot.docs.map((doc) => doc.id)); // Debugging log
      entriesContainer.innerHTML = ""; // Clear previous entries

      if (querySnapshot.empty) {
        entriesContainer.innerHTML = "<p>No entries found.</p>";
        return;
      }

      querySnapshot.forEach(async (doc) => {
        const data = doc.data();
        console.log("Rendering Entry Data:", data); // Debug raw data

        if (!data.iv || !data.text) {
          console.error("Missing IV or text in entry:", data);
          return;
        }

        try {
          const decryptedText = await decryptData(key, data.iv, data.text);
          console.log("Decrypted Text for Entry:", decryptedText);

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






        



async function deleteEntryFromCloud(id) {
  try {
    await deleteDoc(doc(db, "journalEntries", id));
    console.log("Entry deleted: ", id);
  } catch (error) {
    console.error("Error deleting entry: ", error);
  }
}






function renderEntry(entry) {
  console.log("Rendering Entry:", entry); // Debug: Log the entry being rendered

  const entryDiv = document.createElement("div");
  entryDiv.classList.add("entry");
  entryDiv.setAttribute("data-id", entry.id); // Set the document ID

  // Format the date if it's a Firestore Timestamp
  const formattedDate =
    entry.date instanceof Object && entry.date.seconds
      ? new Date(entry.date.seconds * 1000).toLocaleString() // Convert to a readable format
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
    <p>${formattedDate}</p> <!-- Use the formatted date here -->
    <button class="delete">Delete</button>
  `;

  // Add delete button functionality
  entryDiv.querySelector(".delete").addEventListener("click", async () => {
    const entryId = entryDiv.getAttribute("data-id"); // Retrieve the document ID
    await deleteEntryFromCloud(entryId); // Pass the ID to the delete function
    entryDiv.remove(); // Remove from the UI
  });

  entriesContainer.prepend(entryDiv);
}



  



function generateStarsHTML(rating) {
  const maxStars = 5;
  return Array.from({ length: maxStars }, (_, i) =>
    `<span style="color: ${i < rating ? "#1DB954" : "#ccc"}; font-size: 1.2rem;">&#9733;</span>`
  ).join("");
}




document.addEventListener("DOMContentLoaded", async () => {
  const hash = window.location.hash.substring(1);
  const params = new URLSearchParams(hash);
  const newAccessToken = params.get("access_token");

  if (newAccessToken) {
    localStorage.setItem("spotifyAccessToken", newAccessToken);
    spotifyAccessToken = newAccessToken;

    await fetchUserName(); // Fetch user details

    // Ensure all date fields are converted before loading entries
    

    // Load and decrypt entries after conversion
    await loadDecryptedEntriesFromFirebase();

    window.history.replaceState({}, document.title, window.location.pathname);
  } else {
    spotifyAccessToken = localStorage.getItem("spotifyAccessToken");
    if (spotifyAccessToken) {
      await fetchUserName();

      // Ensure all date fields are converted before loading entries
      

      // Load and decrypt entries after conversion
      await loadDecryptedEntriesFromFirebase();
    }
  }
});




// Test retrieving data
async function testFirestoreData() {
  try {
    const querySnapshot = await getDocs(collection(db, "journalEntries"));
    querySnapshot.forEach((doc) => {
      console.log(`Document ID: ${doc.id}`);
      console.log("Data:", doc.data());
    });
  } catch (error) {
    console.error("Error fetching data:", error);
  }
}

document.addEventListener("DOMContentLoaded", () => {
  testFirestoreData();
}); // Ensure this closing brace is present



