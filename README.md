# Steam Game Tracker

En webapplikasjon for å spore ditt Steam-spillbibliotek, administrere din spill-backlog og se prestasjoner.

## Funksjoner

- **Brukerautentisering**: Sikkert innloggings- og registreringssystem
- **Steam-integrasjon**: Koble til Steam-kontoen din for å se spillbiblioteket ditt
- **Administrasjon av spillbibliotek**: Bla gjennom og søk i Steam-spillene dine
- **Spiller- og backlog-lister**: Organiser spill i kategorier for "Spiller nå" og "Backlog"
- **Sporing av prestasjoner**: Se detaljert fremgang for hver spill
- **Spilletidsstatistikk**: Spor total spilletid og individuell spilltid
- **Responsivt design**: Fungerer på desktop og mobile enheter

## Teknologier brukt

- **Backend**: Node.js, Express.js
- **Database**: SQLite med better-sqlite3
- **Frontend**: HTML5, CSS3, JavaScript (Vanilla)
- **API-er**: Steam Web API
- **Autentisering**: Express-sessions
- **Styling**: Tilpasset CSS med moderne design

## Forutsetninger

Før du kjører denne applikasjonen, sørg for at du har følgende installert:

- Node.js (versjon 14 eller høyere)
- npm (følger med Node.js)
- En Steam Web API-nøkkel (få en fra [Steam Web API](https://steamcommunity.com/dev/apikey))

## Installasjon

1. **Klon repositoriet:**
   ```bash
   git clone https://github.com/yourusername/steam-game-tracker.git
   cd steam-game-tracker
   ```

2. **Installer avhengigheter:**
   ```bash
   npm install
   ```

3. **Sett opp miljøvariabler:**
   
   Opprett en `.env`-fil i rotkatalogen med følgende innhold:
   ```
   STEAM_API_KEY=your_steam_api_key_here
   SESSION_SECRET=your_session_secret_here
   ```

4. **Initialiser databasen:**
   
   Databasen vil bli opprettet automatisk når du kjører applikasjonen første gang.

5. **Start applikasjonen:**
   ```bash
   npm start
   ```

6. **Åpne nettleseren din:**
   
   Naviger til `http://localhost:3000`

## Bruk

1. **Registrer/Logg inn**: Opprett en konto eller logg inn med eksisterende legitimasjon
2. **Koble til Steam-konto**: Skriv inn Steam ID-en din for å koble til Steam-profilen din
3. **Bla gjennom spill**: Se Steam-spillbiblioteket ditt med spilletidsinformasjon
4. **Administrer lister**: Legg til spill i "Spiller" eller "Backlog"-listene dine
5. **Se prestasjoner**: Klikk "Se prestasjoner" på et spill for å se fremgang
6. **Søk**: Bruk søkefeltet for å finne spesifikke spill i biblioteket ditt

## API-endepunkter

### Autentisering
- `POST /auth/register` - Registrer en ny bruker
- `POST /auth/login` - Logg inn bruker
- `POST /auth/add-steam` - Koble Steam ID til konto
- `GET /auth/logout` - Logg ut bruker

### Brukerdata
- `GET /api/session` - Hent nåværende økt-info
- `GET /api/user` - Hent brukerprofildata
- `GET /api/games` - Hent brukerens Steam-spill
- `GET /api/user-games` - Hent brukerens spiller/backlog-lister
- `GET /api/achievements?appid={game_id}` - Hent prestasjoner for et spill

### Spilladministrasjon
- `POST /api/add-playing` - Legg til spill i spiller-liste
- `POST /api/remove-playing` - Fjern spill fra spiller-liste
- `POST /api/add-backlog` - Legg til spill i backlog
- `POST /api/remove-backlog` - Fjern spill fra backlog

**Merk**: Denne applikasjonen krever en gyldig Steam Web API-nøkkel. Sørg for å holde API-nøkkelen og økt-hemmeligheten din sikre og aldri commit dem til versjonskontroll.