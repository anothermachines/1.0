# FM8/R ANOTHER GROOVEBOX

![FM8/R Social Preview](./social-preview.png)

**FM8/R** is an advanced 8-track rhythm synthesizer designed for the browser, inspired by high-end hardware groovebox workflows. It features deep sound engines, per-track filters and LFOs, an advanced step sequencer with parameter locks, master effects, a dedicated mixer, and professional I/O including WAV export.

### [➡️ Live Demo (Placeholder)](#)

---

## ✨ Features

*   **8 Independent Tracks:** Each track can host one of eight unique sound engines.
*   **Advanced Sound Engines:**
    *   **Percussive:** `Kick`, `Hat`
    *   **Synthesizers:** `Arcane` (Phase Mod), `Ruin` (Distortion/Feedback), `Artifice` (Dual Filter FM), `Shift` (Wavetable), `Alloy` (2-Op FM).
    *   **Physical Modeling:** `Reson` (Resonator).
*   **Powerful Sequencer:**
    *   Up to 64 steps per pattern, with variable length per track.
    *   **Parameter Locks (P-Locks):** Automate any synth, filter, or effect parameter on a per-step basis for incredibly dynamic sequences.
    *   **Trig Conditions:** Add probability, first/not-first conditions, and `A:B` style triggers for evolving patterns.
    *   **Euclidean Mode:** Instantly generate complex and musical polyrhythms.
*   **Full-Featured Editor:**
    *   Dedicated **Instrument Editor** for deep sound design.
    *   **Piano Roll** for melodic composition with scale and chord modes.
    *   **Arrangement View** (Song Mode) to sequence patterns into full tracks.
*   **Professional Mixing & Effects:**
    *   Full **Mixer** with Volume, Pan, and 4 FX Sends per track.
    *   **Master Effects Rack:** Includes a Master Filter, Character (Saturate, Overdrive, Bitcrush), tempo-synced Delay, Reverb, Drive, and a sidechain-capable Master Compressor.
*   **Presets & I/O:**
    *   **Project and Instrument Preset System:** Save and load entire projects or individual instrument sounds.
    *   **Expansion Packs:** A "Store" for loading new sound packs and projects.
    *   **Audio Export:** Render your creations as high-quality WAV files, with options for Master output or separate Stems (wet/dry).
    *   **Share Jams:** Generate a unique link with your compressed project data for others to listen to instantly.
*   **MIDI Integration:**
    *   **MIDI Learn:** Easily map any parameter to your hardware controller.
    *   **MIDI Out:** Sequence external hardware or software synthesizers from a dedicated MIDI track.
    *   **MIDI Clock Sync** (In/Out) for tight integration with your hardware setup.

## 🚀 Getting Started

This project is a self-contained web application with no build step required.

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/your-username/fm8r-groovebox.git
    ```
2.  **Open the file:**
    Navigate to the project folder and open the `index.html` file in your favorite web browser.
3.  **Start Jamming:**
    The application will open, ready to go.

## 🛠️ Tech Stack

*   **Frontend:** React 19 (via CDN), TypeScript
*   **State Management:** Zustand
*   **Styling:** Tailwind CSS (via CDN)
*   **Audio:** Native Web Audio API

## 🤝 Contributing

Contributions, issues, and feature requests are welcome! Feel free to check the [issues page](https://github.com/your-username/fm8r-groovebox/issues).

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.