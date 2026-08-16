import fs from 'node:fs';
import http from 'isomorphic-git/http/node';
import git from 'isomorphic-git';

// ⚠️ Renseignez ces 3 valeurs avant de lancer le script
const GITHUB_USERNAME = 'rtdteledjibouti-hue';
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;

if (!GITHUB_TOKEN) {
  console.error('❌ Variable GITHUB_TOKEN manquante.');
  process.exit(1);
}
const REPO_NAME = 'SaaS-Digital-Horn-Group';

const dir = process.cwd();
const url = `https://github.com/${GITHUB_USERNAME}/${REPO_NAME}.git`;

async function main() {
  console.log('Initialisation du dépôt...');
  await git.init({ fs, dir, defaultBranch: 'main' });

  console.log('Ajout des fichiers...');
  await git.add({ fs, dir, filepath: '.' });

  console.log('Commit...');
  await git.commit({
    fs,
    dir,
    message: 'Initial commit depuis Bolt',
    author: { name: GITHUB_USERNAME, email: `${GITHUB_USERNAME}@users.noreply.github.com` },
  });

  console.log('Push vers GitHub...');
  await git.push({
    fs,
    http,
    dir,
    remote: 'origin',
    url,
    ref: 'main',
    force: true,
    onAuth: () => ({ username: GITHUB_USERNAME, password: GITHUB_TOKEN }),
  });

  console.log('✅ Push terminé avec succès !');
}

main().catch((err) => {
  console.error('❌ Erreur lors du push :', err.message);
});
