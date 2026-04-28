# YTM Romaji Lyrics Extension

A Chrome extension for YouTube Music that automatically romanizes Japanese lyrics (Kanji/Kana → Romaji) locally in the browser using morphological analysis.

## 🚀 Features

- **Local Processing**: Performs romanization in-browser using `kuroshiro` and `kuromoji`. No external APIs or data tracking.
- **Smart Detection**: Automatically detects Japanese characters and only processes relevant lyrics.
- **Optimized Performance**: Uses a `MutationObserver` with a debounce mechanism to ensure minimal CPU impact, specifically targeting YouTube Music's dynamic DOM.
- **Theme Matching**: Seamlessly integrates into the YTM interface with a non-destructive UI injection.
- **Customizable**: Change theme colors and font sizes via the extension options page.

## 🛠️ Technical Stack

- **Engine**: [kuroshiro.min.js](https://github.com/hexotech/kuroshiro)
- **Analyzer**: [kuroshiro-analyzer-kuromoji.min.js](https://github.com/hexotech/kuroshiro-analyzer-kuromoji)
- **Dictionary**: kuromoji.js (~17MB local dictionary)
- **Architecture**: Manifest V3 Content Script with Lazy Initialization.

## 📥 Installation

1. Clone or download this repository.
2. Open Chrome and navigate to `chrome://extensions/`.
3. Enable **Developer mode** (top right).
4. Click **Load unpacked** and select the extension folder.
5. Open [YouTube Music](https://music.youtube.com/); the extension will activate when Japanese lyrics are displayed.

## 📖 Usage Guide

1. Play a song on YouTube Music.
2. Click the **Lyrics** tab in the player.
3. If the song contains Japanese (Kanji/Kana), a Romaji box will automatically appear above the original text.
4. **Configuration**: Click the extension icon and select **Options** to customize the appearance (hex color and font size).

## 🤝 Contribution Guide

Contributions are welcome! If you want to improve the Shady DOM piercing logic or add support for other languages (like Pinyin or Revised Romanization), follow these steps:

1. Fork the project.
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`).
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`).
4. Push to the Branch (`git push origin feature/AmazingFeature`).
5. Open a Pull Request.

### Development Roadmap
- [ ] Support for Chinese (Pinyin)
- [ ] Support for Korean (Revised Romanization)
- [ ] Toggle switch for specific languages in the Options page
- [ ] Performance optimization for dictionary loading

## 📄 License

This project is licensed under the **MIT License**. See the `LICENSE` file for details.

## ✍️ Author

**Arfith Aant**
📧 [aanarfian28@gmail.com](mailto:aanarfian28@gmail.com)
