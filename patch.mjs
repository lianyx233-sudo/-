import fs from 'fs';
import path from 'path';

const filesToPatch = [
  'src/pages/Favorites.tsx',
  'src/pages/Home.tsx',
  'src/pages/Survey.tsx',
  'src/pages/AdminDashboard.tsx',
  'src/pages/MyWorks.tsx',
  'src/pages/LightWorkshop.tsx',
  'src/pages/GatherWorkshop.tsx',
  'src/pages/Login.tsx',
  'src/App.tsx',
  'src/components/AuthContext.tsx'
];

for (const file of filesToPatch) {
  let content = fs.readFileSync(file, 'utf-8');
  
  // replace imports from firebase to tcb
  content = content.replace(/from\s+['"]firebase\/firestore['"]/g, "from '../lib/tcb'");
  content = content.replace(/from\s+['"]firebase\/auth['"]/g, "from '../lib/tcb'");
  content = content.replace(/from\s+['"]firebase\/storage['"]/g, "from '../lib/tcb'");
  
  // fix paths for App.tsx and others
  if (file === 'src/App.tsx') {
    content = content.replace(/from\s+['"]\.\/lib\/firebase['"]/g, "from './lib/tcb'");
    content = content.replace(/from\s+['"]firebase\/auth['"]/g, "from './lib/tcb'");
  } else if (file === 'src/components/AuthContext.tsx') {
    content = content.replace(/from\s+['"]\.\.\/lib\/firebase['"]/g, "from '../lib/tcb'");
  } else {
    content = content.replace(/from\s+['"]\.\.\/lib\/firebase['"]/g, "from '../lib/tcb'");
  }

  // AuthContext has weird fix
  if (file === 'src/components/AuthContext.tsx') {
    content = content.replace(/import { onAuthStateChanged, User } from 'firebase\/auth';/g, "import { onAuthStateChanged, User } from '../lib/tcb';");
  }

  // App.tsx
  if (file === 'src/App.tsx') {
    content = content.replace(/import { signOut } from 'firebase\/auth';/g, "import { signOut } from './lib/tcb';");
  }

  fs.writeFileSync(file, content, 'utf-8');
}
console.log('patched');
