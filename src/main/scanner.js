// src/main/scanner.js
const fs = require("fs-extra");
const path = require("path");
const os = require("os");
const wshort = require("windows-shortcuts");

// async function getSteamGenres(appid) {
//   try {
//     const url = `https://store.steampowered.com/api/appdetails?appids=${appid}&l=english`;
//     const res = await fetch(url);
//     const data = await res.json();

//     if (data[appid]?.success && data[appid].data?.genres) {
//       return data[appid].data.genres.map(g => g.description);
//     }
//   } catch (err) {
//     console.warn(`Erro ao buscar gêneros para o appid ${appid}:`, err);
//   }
//   return [];
// }

async function scanSteam() {
  const results = [];
  try {
    const programFiles =
      process.env["ProgramFiles(x86)"] || process.env.ProgramFiles;
    const steamPath = path.join(programFiles || "C:\\Program Files (x86)", "Steam");
    const steamVdf = path.join(steamPath, "steamapps", "libraryfolders.vdf");

    if (!(await fs.pathExists(steamVdf))) return results;

    const vdf = await fs.readFile(steamVdf, "utf8");
    const regex = /"path"\s+"([^"]+)"/g;
    const libraries = [];
    let m;
    while ((m = regex.exec(vdf)) !== null) libraries.push(m[1]);

    for (const lib of libraries) {
      const appsDir = path.join(lib, "steamapps");
      if (!(await fs.pathExists(appsDir))) continue;

      const files = await fs.readdir(appsDir);
      for (const f of files) {
        if (!f.startsWith("appmanifest_") || !f.endsWith(".acf")) continue;

        const content = await fs.readFile(path.join(appsDir, f), "utf8");
        const nameMatch = /"name"\s+"([^"]+)"/i.exec(content);
        const installdirMatch = /"installdir"\s+"([^"]+)"/i.exec(content);
        const appidMatch = /"appid"\s+"(\d+)"/i.exec(content);

        const installdir = installdirMatch
          ? path.join(lib, "steamapps", "common", installdirMatch[1])
          : null;

        let exePath = null;
        let thumbPath = null;

        if (installdir && (await fs.pathExists(installdir))) {
          const gameFiles = await fs.readdir(installdir);
          const exe = gameFiles.find((f) => f.toLowerCase().endsWith(".exe"));
          exePath = exe ? path.join(installdir, exe) : null;

          // tenta pegar a thumbnail local
          const thumbCandidate = path.join(installdir, "gameicon.png");
          if (await fs.pathExists(thumbCandidate)) {
            thumbPath = thumbCandidate;
          } else if (!thumbPath && appidMatch) {
            thumbPath = `https://steamcdn-a.akamaihd.net/steam/apps/${appidMatch[1]}/header.jpg`;
          }
        } else if (!thumbPath && appidMatch) {
          thumbPath = `https://steamcdn-a.akamaihd.net/steam/apps/${appidMatch[1]}/header.jpg`;
        }

        // const genres = appidMatch ? await getSteamGenres(appidMatch[1]) : [];

        results.push({
          name: nameMatch ? nameMatch[1] : f,
          source: "Steam",
          install_dir: installdir,
          exe: exePath,
          thumb: thumbPath,
          steamAppId: appidMatch ? appidMatch[1] : null,
          // genres
        });
      }
    }
  } catch (err) {
    console.warn("Steam scan error:", err);
  }
  return results;
}

async function scanEpic() {
  const results = [];
  try {
    const pf = process.env.ProgramFiles || "C:\\Program Files";
    const epicBase = path.join(pf, "Epic Games");
    if (await fs.pathExists(epicBase)) {
      const games = await fs.readdir(epicBase);
      for (const g of games)
        results.push({
          name: g,
          source: "Epic",
          install_dir: path.join(epicBase, g),
        });
    }
  } catch (e) {}
  return results;
}

async function scanGOG() {
  const results = [];
  try {
    const pf = process.env["ProgramFiles(x86)"] || process.env.ProgramFiles;
    const base = path.join(
      pf || "C:\\Program Files (x86)",
      "GOG Galaxy",
      "Games"
    );
    if (await fs.pathExists(base)) {
      const list = await fs.readdir(base);
      for (const g of list)
        results.push({
          name: g,
          source: "GOG",
          install_dir: path.join(base, g),
        });
    }
  } catch (e) {}
  return results;
}

async function scanProgramFiles() {
  const results = [];
  const dirs = [
    process.env.ProgramFiles,
    process.env["ProgramFiles(x86)"],
  ].filter(Boolean);
  for (const dir of dirs) {
    try {
      const items = await fs.readdir(dir);
      for (const name of items) {
        const full = path.join(dir, name);
        const stat = await fs.stat(full);
        if (stat.isDirectory()) {
          const files = await fs.readdir(full);
          const exe = files.find((f) => f.toLowerCase().endsWith(".exe"));
          if (exe)
            results.push({ name, source: "ProgramFiles", install_dir: full });
        }
      }
    } catch (e) {}
  }
  return results;
}

async function scanDesktopShortcuts() {
  const results = [];
  try {
    const desktop = path.join(os.homedir(), "Desktop");
    const startMenu = path.join(
      process.env.APPDATA || "",
      "Microsoft",
      "Windows",
      "Start Menu",
      "Programs"
    );
    const folders = [desktop, startMenu];
    for (const folder of folders) {
      if (!folder || !(await fs.pathExists(folder))) continue;
      const entries = await fs.readdir(folder);
      for (const e of entries) {
        if (e.toLowerCase().endsWith(".lnk")) {
          try {
            const lnkPath = path.join(folder, e);
            const info = await new Promise((res, rej) =>
              wshort.query(lnkPath, (err, options) =>
                err ? rej(err) : res(options)
              )
            );
            results.push({
              name: e.replace(/\.lnk$/i, ""),
              source: "Shortcut",
              target: info.target,
              install_dir: path.dirname(info.target || ""),
            });
          } catch (err) {}
        }
      }
    }
  } catch (e) {}
  return results;
}

async function scanAll() {
  const [steam, epic, gog, pf, shortcuts] = await Promise.all([
    scanSteam(),
    scanEpic(),
    scanGOG(),
    scanProgramFiles(),
    scanDesktopShortcuts(),
  ]);

  // Deduplicar por install_dir + nome
  const map = new Map();
  for (const g of [...steam, ...epic, ...gog, ...pf, ...shortcuts]) {
    const key =
      (g.install_dir || g.name || g.target || "") + "::" + (g.name || "");
    if (!map.has(key)) map.set(key, g);
  }
  return Array.from(map.values());
}

module.exports = { scanAll };
