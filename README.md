# 🔓 Hash Cracker - Password Recovery Tool

A powerful Next.js application for cracking password hashes using wordlist attacks and brute force methods. Built with modern technologies including Chakra UI and shadcn/ui.

## Features

- **Multiple Hash Algorithms**: Support for MD5, SHA-1, SHA-224, SHA-256, SHA-384, and SHA-512
- **Auto-Detection**: Automatically detects hash type based on length
- **Wordlist Attack**: Uses comprehensive wordlists with 50,000+ passwords including:
  - Top common passwords
  - Dictionary words
  - Keyboard patterns
  - Numeric patterns
  - Dates
  - Common substitutions (l33t speak)
  - Variations with suffixes and capitalization

- **Brute Force Attack**: Configurable character sets and password length
- **Hash Generator**: Generate hashes from passwords for testing
- **Real-time Progress**: Live progress tracking with attempt counts
- **Abort Capability**: Stop cracking operations at any time
- **Modern UI**: Beautiful interface with Chakra UI and shadcn/ui components
- **Dark Theme**: Eye-friendly dark mode design

## Tech Stack

- **Framework**: Next.js 15 with App Router
- **Language**: TypeScript
- **UI Libraries**: 
  - Chakra UI for layout and components
  - shadcn/ui for enhanced UI elements
- **Styling**: Tailwind CSS
- **Hash Processing**: Web Crypto API

## Installation

```bash
# Clone the repository
git clone <repository-url>
cd hash-cracker-app

# Install dependencies
npm install

# Run development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Usage

### Cracking a Hash

1. Navigate to the "Crack Hash" tab
2. Enter the hash you want to crack
3. Select the hash type (or use auto-detect)
4. Choose an attack method:
   - **Wordlist Attack**: Fast, tries 50,000+ common passwords
   - **Brute Force**: Slower but comprehensive, configurable character sets

### Generating a Hash

1. Navigate to the "Generate Hash" tab
2. Enter a password
3. Select the hash algorithm
4. Click "Generate Hash"
5. Click the generated hash to copy it

## Example Test Hashes

Try cracking these SHA-256 hashes:

- **Password: "password"**
  ```
  5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8
  ```

- **Password: "123456"**
  ```
  8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92
  ```

- **Password: "admin"**
  ```
  8c6976e5b5410415bde908bd4dee15dfb167a9c873fc4bb8a81f6f2ab448a918
  ```

## Wordlist Details

The application includes a comprehensive wordlist featuring:

- 50+ top passwords (password, 123456, etc.)
- 500+ common English words
- 10,000 numeric patterns
- Keyboard patterns (qwerty, asdf, etc.)
- Common substitutions (p@ssw0rd, adm1n, etc.)
- Variations with popular suffixes (123, !, 2024, etc.)
- Capitalization variations

Total: **50,000+ password combinations**

## Character Sets for Brute Force

- **Lowercase**: a-z (26 characters)
- **Digits**: 0-9 (10 characters)
- **Alphanumeric**: a-z0-9 (36 characters)
- **All Letters + Digits**: a-zA-Z0-9 (62 characters)
- **All Characters**: Includes special characters (90+ characters)

## Performance

- Wordlist attack: ~10,000-50,000 attempts/second
- Brute force: Varies based on hash type and hardware
- Real-time progress updates every 100-1000 attempts
- Non-blocking UI with async processing

## Security & Legal Notice

⚠️ **IMPORTANT**: This tool is for **educational purposes only**.

- Only use on hashes you have permission to crack
- Do not use for illegal activities
- Respect privacy and security laws
- Use responsibly for password recovery and security testing

## Project Structure

```
hash-cracker-app/
├── app/
│   ├── layout.tsx          # Root layout with providers
│   ├── page.tsx            # Main application page
│   ├── providers.tsx       # Chakra UI provider
│   └── globals.css         # Global styles
├── components/
│   └── ui/                 # shadcn/ui components
├── lib/
│   ├── hashCracker.ts      # Hash cracking logic
│   ├── wordlists.ts        # Password wordlists
│   └── utils.ts            # Utility functions
└── public/                 # Static assets
```

## Development

```bash
# Run development server
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Run linter
npm run lint
```

## Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License

MIT License - See LICENSE file for details

## Acknowledgments

- Built with Next.js and React
- UI components from Chakra UI and shadcn/ui
- Hash algorithms via Web Crypto API

---

**Remember**: With great power comes great responsibility. Use this tool ethically!
