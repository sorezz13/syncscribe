# sync//scribe

**sync//scribe** is a modern web application that combines the joy of journaling with the thrill of music. The app lets users document their thoughts, associate them with songs, and rate those songs to reflect their personal experiences and preferences.

## Features

- **Spotify Integration:** Log in with your Spotify account to search and select songs.
- **Journaling:** Write and save your thoughts alongside selected songs.
- **Song Rating:** Rate songs from 1 to 5 stars to match your sentiments.
- **Interactive Suggestions:** Get dynamic song suggestions as you type.
- **Responsive Design:** Enjoy a seamless experience on both desktop and mobile devices.

## Installation

### Prerequisites

- A Spotify Developer account.
- Node.js installed on your local machine.

### Setup

1. Clone the repository:

   ```bash
   git clone https://github.com/yourusername/spoti-notes.git
   cd spoti-notes
   ```

2. Configure Spotify credentials:

   Replace the `SPOTIFY_CLIENT_ID` and `REDIRECT_URI` in `script.js` with your Spotify app's credentials.

   ```javascript
   const SPOTIFY_CLIENT_ID = "YOUR_CLIENT_ID";
   const REDIRECT_URI = "YOUR_REDIRECT_URI";
   ```

3. Open the `index.html` file in your browser to start using the app.

## Usage

1. Click the **Connect Spotify** button to log in with your Spotify account.
2. Search for a song using the search bar.
3. Select a song from the suggestions.
4. Write your journal entry and rate the selected song.
5. Click **Add Entry** to save your entry.

## File Structure

```
|-- index.html       // Main HTML file
|-- style.css        // Custom styles for the app
|-- script.js        // Main JavaScript logic for the app
|-- manifest.json    // Web app manifest for PWA functionality
|-- assets/          // Icons and images used in the app
```

## Technologies Used

- HTML5, CSS3, and JavaScript
- Spotify Web API
- Firebase for saving journal entries and encryption 
- Responsive design using CSS media queries

## Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository.
2. Create a new branch: `git checkout -b feature-name`.
3. Commit your changes: `git commit -m 'Add some feature'`.
4. Push to the branch: `git push origin feature-name`.
5. Open a pull request.

## License

This project is licensed under the MIT License. See the LICENSE file for more details.

## Acknowledgments

- Thanks to Spotify for their comprehensive API.
- Inspired by the love for journaling and music.

## Contact

For questions or suggestions, please reach out to:
- **Me** Leelan Bronson  
- **Email:** Leelanbronson1@gmail.com  
- **GitHub:** [Sorezz13](https://github.com/Sorezz13)
