# <p align="center"><img src="https://github.com/loarsaw/vigilant/blob/master/assets/icons/png/1024x1024.png" width="80" alt="Vigilant Logo"></p>

<p align="center"><strong>Vigilant</strong></p>
<p align="center">
  <img src="https://img.shields.io/badge/version-1.0.0--beta-emerald?style=for-the-badge" alt="Beta Version">
  <img src="https://img.shields.io/badge/platform-linux%20%7C%20windows-blue?style=for-the-badge" alt="Platform Linux & Windows">
</p>

---

## 🚀 The Intelligent Desktop Monitor

**Vigilant** is a high-performance system utility that cuts through the noise. Vigilant focuses on the applications you are actually interacting with that are running in the background during an interview.

### ✨ Key Features

- **Smart Aggregation:** Automatically groups multi-process apps (Chrome, VS Code, Discord) into a single entry with summed memory usage.
- **Zero Noise:** Strictly filters out system services like `evolution-data-server`, `update-notifier`, and `Xwayland`.
- **Security Pulse:** Automatically flags unrecognized processes.
- **Developer Friendly:** Built-in recognition for `npm`, `node`, `yarn`, and `pnpm`.
- **Live Monitoring:** Real-time process tracking with auto-refresh every 5 seconds.

### 🛠 Tech Stack

- **Core:** [Electron](https://www.electronjs.org/)
- **Frontend:** [React](https://reactjs.org/) + [TypeScript](https://www.typescriptlang.org/)
- **Styling:** [Tailwind CSS](https://tailwindcss.com/)
- **Icons:** [Lucide React](https://lucide.dev/)

---

## 📦 Trusted Applications

Vigilant comes pre-configured to recognize and trust your most used tools:

- **Browsers:** Google Chrome, Chromium, Firefox, Microsoft Edge.
- **Editors:** VS Code, GNOME Text Editor.
- **Dev Tools:** Node.js, NPM, Yarn, PNPM, Terminal (Bash, Zsh, PowerShell, CMD).
- **Communication:** Discord, Telegram.
- **System:** GNOME Shell, File Explorer (Nautilus, Windows Explorer), Windows Search.

---

## 📥 Getting Started

> [!NOTE]
> Both **Linux** and **Windows** versions are currently in **beta**. Linux version is optimized for GNOME desktop environment.

### Installation

```bash
# Clone the repository
git clone https://github.com/loarsaw/vigilant.git

# Navigate to the project directory
cd vigilant

# Install dependencies
npm install

# Start the application
npm start
```

### Build for Production

```bash
# Build for your current platform
npm run make
```

---

## 🎯 Usage

1. **Launch Vigilant** from your applications menu or via terminal
2. **Monitor processes** in real-time with automatic categorization
3. **Identify threats** - unknown processes are flagged at the top in red
4. **Track memory** - see resource usage at a glance
5. **Stay secure** - high-memory unknown processes trigger critical alerts

---

## 🔒 Security Features

- **Unknown Process Detection:** Automatically identifies and flags unrecognized applications
- **Priority Alerting:** Unknown processes appear at the top of the list for immediate attention
- **Critical Warnings:** High-memory unknown processes (>500MB) receive special highlighting
- **Clean Interface:** No clutter, only actionable information

---

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

---

## 📄 License

This project is licensed under the GNU General Public License v2.0 - see the [LICENSE](LICENSE) file for details.

---

## 🐛 Known Issues (Beta)

- Windows: Some system processes may not be accurately categorized
- Linux: Requires GNOME desktop for optimal experience
- Cross-platform: Memory reporting may vary between operating systems

---

## 📧 Support

For issues, questions, or suggestions, please open an issue on [GitHub](https://github.com/loarsaw/vigilant/issues).

---

<p align="center">Made with pure !❤️ and a healthy dose of paranoia</p>
