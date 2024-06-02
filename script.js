const clientId = '2f236217188349b6b8f6ef39acdf694a';  // Replace with your Spotify access token
const redirectUri = 'http://localhost:5500/';    // Replace with your redirect URI
let accessToken = null;
let userId = null;

const questionDiv = document.getElementById('question');
const likeBtn = document.getElementById('likeBtn');
const dislikeBtn = document.getElementById('dislikeBtn');
const authBtn = document.getElementById('authBtn');
const playlistDiv = document.getElementById('playlist');

let likedTracks = [];
let currentTrack = null;
let trackQueue = [];

let selectedLanguages = ['en', 'cs', 'sk']; // Default languages are English, Czech, and Slovak

const enCheckbox = document.getElementById('enCheckbox');
const csCheckbox = document.getElementById('csCheckbox');
const skCheckbox = document.getElementById('skCheckbox');

enCheckbox.addEventListener('change', () => {
  updateSelectedLanguages();
});
csCheckbox.addEventListener('change', () => {
  updateSelectedLanguages();
});
skCheckbox.addEventListener('change', () => {
  updateSelectedLanguages();
});

function updateSelectedLanguages() {
  selectedLanguages = [];
  if (enCheckbox.checked) selectedLanguages.push('en');
  if (csCheckbox.checked) selectedLanguages.push('cs');
  if (skCheckbox.checked) selectedLanguages.push('sk');
  getRandomTracks();
}

// Function to get the access token from URL
function getAccessTokenFromUrl() {
  const hash = window.location.hash.substring(1);
  const params = new URLSearchParams(hash);
  accessToken = params.get('access_token');
}



// Function to get random tracks from Spotify
async function getRandomTracks() {
  try {
    const response = await fetch('https://api.spotify.com/v1/recommendations?seed_genres=pop&limit=15', {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });
    const data = await response.json();
    trackQueue = data.tracks;
    displayNextTrack();
  } catch (error) {
    console.error('Error fetching random tracks:', error);
    questionDiv.innerText = "Failed to load tracks. Please check your access token.";
  }
}

// Function to display the next track in the queue
function displayNextTrack() {
  if (trackQueue.length > 0) {
    currentTrack = trackQueue.shift();
    if (currentTrack.preview_url) {
      questionDiv.innerHTML = `
        Do you like "${currentTrack.name}" by ${currentTrack.artists[0].name}?
        <br>
        <audio controls>
          <source src="${currentTrack.preview_url}" type="audio/mpeg">
          Your browser does not support the audio element.
        </audio>
      `;
    } else {
      questionDiv.innerHTML = `
        "${currentTrack.name}" by ${currentTrack.artists[0].name} does not have a preview available.
        <br>
        Skipping to the next track...
      `;
      setTimeout(displayNextTrack, 2000);
    }
  } else {
    generatePlaylist();
  }
}

// Function to generate playlist from liked tracks
async function generatePlaylist() {
  if (likedTracks.length > 0) {
    const seedTracks = likedTracks.map(track => track.id).join(',');
    try {
      const response = await fetch(`https://api.spotify.com/v1/recommendations?seed_tracks=${seedTracks}&limit=30`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });
      const data = await response.json();
      const playlistTracks = data.tracks.map(track => track.uri);
      const playlistName = 'Generated Playlist';
      const playlistResponse = await fetch(`https://api.spotify.com/v1/users/${userId}/playlists`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: playlistName,
          public: false
        })
      });
      const playlistData = await playlistResponse.json();
      await fetch(`https://api.spotify.com/v1/playlists/${playlistData.id}/tracks`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          uris: playlistTracks
        })
      });
      questionDiv.innerText = "Playlist generated and added to your Spotify account!";
      likeBtn.style.display = 'none';
      dislikeBtn.style.display = 'none';
      playlistDiv.innerHTML = `<a href="https://open.spotify.com/playlist/${playlistData.id}" target="_blank">Open your new playlist on Spotify</a>`;
    } catch (error) {
      console.error('Error generating playlist:', error);
      questionDiv.innerText = "Failed to generate playlist.";
    }
  } else {
    questionDiv.innerText = "No liked tracks to generate playlist.";
    likeBtn.style.display = 'none';
    dislikeBtn.style.display = 'none';
  }
}

// Function to get user ID
async function getUserId() {
  try {
    const response = await fetch('https://api.spotify.com/v1/me', {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });
    const data = await response.json();
    userId = data.id;
    getRandomTracks();
  } catch (error) {
    console.error('Error fetching user ID:', error);
    questionDiv.innerText = "Failed to fetch user ID.";
  }
}

likeBtn.addEventListener('click', () => {
  if (currentTrack.preview_url) {
    likedTracks.push(currentTrack);
  }
  displayNextTrack();
});

dislikeBtn.addEventListener('click', () => {
  displayNextTrack();
});

// Spotify authentication
authBtn.addEventListener('click', () => {
  const scopes = 'playlist-modify-private playlist-modify-public';
  const authUrl = `https://accounts.spotify.com/authorize?response_type=token&client_id=${clientId}&scope=${encodeURIComponent(scopes)}&redirect_uri=${encodeURIComponent(redirectUri)}`;
  window.location.href = authUrl;
});

// Check for access token in URL
getAccessTokenFromUrl();
if (accessToken) {
  getUserId();
} else {
  questionDiv.innerText = "Please log in to Spotify to generate your playlist.";
}

